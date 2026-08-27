import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  MicOff,
  X,
  Loader2,
  Volume2,
  RefreshCw,
  Lock,
  CheckCircle2,
  Send,
  Sparkles,
  SlidersHorizontal,
  Radio,
} from "lucide-react";
import { GoogleGenAI, Modality } from "@google/genai";
import {
  VixoraVoiceName,
  VIXORA_VOICE_PERSONAS,
  VoiceAgentState,
} from "@/lib/vixoraVoiceEngine";
import {
  getGeminiApiKey,
  requestMicrophoneAccess,
  floatTo16BitPCM,
  downsampleBuffer,
  arrayBufferToBase64,
  base64ToPcmFloat32,
} from "@/lib/googleLiveVoiceEngine";
import { toast } from "sonner";
import coachAvatarImg from "@/assets/images/ai_business_coach_1787551806148.jpg";

interface VixoraCoachLiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemPrompt?: string;
  coachName?: string;
  businessContext?: any;
}

export default function VixoraCoachLiveDialog({
  open,
  onOpenChange,
  systemPrompt,
  coachName = "Coach Bethel Goodgift (Chief AI Strategist)",
  businessContext = {},
}: VixoraCoachLiveDialogProps) {
  const [status, setStatus] = useState<VoiceAgentState>("idle");
  const [micPermission, setMicPermission] = useState<"granted" | "prompt" | "denied" | "requesting">("requesting");
  const [permissionError, setPermissionError] = useState<string>("");
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<VixoraVoiceName>("Aoede");
  const [waveHeights, setWaveHeights] = useState<number[]>([15, 30, 45, 60, 40, 25, 50, 35, 20, 40, 30, 15]);
  const [showVoicePicker, setShowVoicePicker] = useState(false);

  // Live WebSocket session ref
  const liveSessionRef = useRef<any>(null);
  const isSessionActiveRef = useRef(false);
  const mutedRef = useRef(false);

  // Input AudioContext (16kHz PCM capture)
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);

  // Output AudioContext (24kHz PCM playback)
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlaybackTimeRef = useRef(0);
  const isAudioPlayingRef = useRef(false);

  // Visualizer loop
  const visualizerTimerRef = useRef<any>(null);
  const turnAssistantTextRef = useRef("");
  const turnUserTextRef = useRef("");

  useEffect(() => {
    mutedRef.current = muted;
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }, [muted]);

  /**
   * Helper to stop and clear all actively playing 24kHz audio buffers
   */
  const stopAudioPlayback = useCallback(() => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    }
    activeSourcesRef.current = [];
    if (outputAudioCtxRef.current) {
      nextPlaybackTimeRef.current = outputAudioCtxRef.current.currentTime;
    }
    isAudioPlayingRef.current = false;
  }, []);

  /**
   * Enqueue 24kHz PCM chunks from Gemini Live modelTurn for gapless playback
   */
  const playPcmChunk = useCallback((base64Pcm: string) => {
    try {
      if (!outputAudioCtxRef.current || outputAudioCtxRef.current.state === "closed") {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        outputAudioCtxRef.current = new AudioCtxClass({ sampleRate: 24000 });
        outputGainRef.current = outputAudioCtxRef.current.createGain();
        outputGainRef.current.gain.setValueAtTime(1.0, outputAudioCtxRef.current.currentTime);

        outputAnalyserRef.current = outputAudioCtxRef.current.createAnalyser();
        outputAnalyserRef.current.fftSize = 64;
        outputAnalyserRef.current.smoothingTimeConstant = 0.8;

        outputGainRef.current.connect(outputAnalyserRef.current);
        outputAnalyserRef.current.connect(outputAudioCtxRef.current.destination);
      }

      const audioCtx = outputAudioCtxRef.current;
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }

      const float32Samples = base64ToPcmFloat32(base64Pcm);
      if (float32Samples.length === 0) return;

      const audioBuffer = audioCtx.createBuffer(1, float32Samples.length, 24000);
      audioBuffer.getChannelData(0).set(float32Samples);

      const sourceNode = audioCtx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(outputGainRef.current!);

      const now = audioCtx.currentTime;
      if (nextPlaybackTimeRef.current < now) {
        nextPlaybackTimeRef.current = now + 0.025; // 25ms jitter buffer
      }

      sourceNode.start(nextPlaybackTimeRef.current);
      nextPlaybackTimeRef.current += audioBuffer.duration;
      activeSourcesRef.current.push(sourceNode);

      if (!isAudioPlayingRef.current) {
        isAudioPlayingRef.current = true;
        setStatus("speaking");
      }

      sourceNode.onended = () => {
        const index = activeSourcesRef.current.indexOf(sourceNode);
        if (index > -1) {
          activeSourcesRef.current.splice(index, 1);
        }
        if (activeSourcesRef.current.length === 0) {
          isAudioPlayingRef.current = false;
          setStatus("listening");
        }
      };
    } catch (err) {
      console.warn("[VIXORA LIVE] Audio playback error:", err);
    }
  }, []);

  /**
   * Continuous visualizer spectrum meter loop
   */
  const startVisualizer = useCallback(() => {
    clearInterval(visualizerTimerRef.current);
    const dataArray = new Uint8Array(32);

    visualizerTimerRef.current = setInterval(() => {
      if (isAudioPlayingRef.current && outputAnalyserRef.current) {
        // Model Speaking Visualizer
        outputAnalyserRef.current.getByteFrequencyData(dataArray);
        const step = Math.floor(dataArray.length / 12) || 1;
        const heights = Array.from({ length: 12 }, (_, i) => {
          const val = dataArray[i * step] || 0;
          return Math.min(65, Math.max(10, Math.round((val / 255) * 55 + 10)));
        });
        setWaveHeights(heights);
      } else if (micAnalyserRef.current && inputAudioCtxRef.current && inputAudioCtxRef.current.state === "running") {
        // User Speaking / Mic Visualizer
        micAnalyserRef.current.getByteFrequencyData(dataArray);
        const step = Math.floor(dataArray.length / 12) || 1;
        const heights = Array.from({ length: 12 }, (_, i) => {
          const val = dataArray[i * step] || 0;
          return Math.min(65, Math.max(10, Math.round((val / 255) * 55 + 10)));
        });
        setWaveHeights(heights);
      } else {
        setWaveHeights([10, 14, 18, 14, 10, 14, 18, 14, 10, 14, 18, 10]);
      }
    }, 70);
  }, []);

  /**
   * Teardown all resources
   */
  const endCall = useCallback(() => {
    clearInterval(visualizerTimerRef.current);
    isSessionActiveRef.current = false;

    // 1. Close Live WebSocket session
    if (liveSessionRef.current) {
      try {
        liveSessionRef.current.close?.();
      } catch {}
      liveSessionRef.current = null;
    }

    // 2. Stop audio playback
    stopAudioPlayback();

    // 3. Disconnect input mic nodes
    if (micProcessorRef.current) {
      try {
        micProcessorRef.current.disconnect();
      } catch {}
      micProcessorRef.current = null;
    }
    if (micSourceRef.current) {
      try {
        micSourceRef.current.disconnect();
      } catch {}
      micSourceRef.current = null;
    }
    if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== "closed") {
      try {
        inputAudioCtxRef.current.close();
      } catch {}
      inputAudioCtxRef.current = null;
    }

    // 4. Disconnect output audio context
    if (outputAudioCtxRef.current && outputAudioCtxRef.current.state !== "closed") {
      try {
        outputAudioCtxRef.current.close();
      } catch {}
      outputAudioCtxRef.current = null;
    }

    // 5. Release microphone media tracks
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    turnAssistantTextRef.current = "";
    turnUserTextRef.current = "";
    setStatus("idle");
    setTranscript("");
    setReply("");
  }, [stopAudioPlayback]);

  /**
   * Start live voice conversation via @google/genai Live API SDK & 16kHz PCM capture
   */
  const startCall = useCallback(async () => {
    endCall();
    setMicPermission("requesting");
    setPermissionError("");
    setStatus("processing");

    // 1. Request microphone access
    const micRes = await requestMicrophoneAccess();
    if (!micRes.granted || !micRes.stream) {
      setMicPermission("denied");
      setPermissionError(micRes.error || "Microphone access is required for real-time live calling.");
      setStatus("mic-denied");
      return;
    }

    setMicPermission("granted");
    micStreamRef.current = micRes.stream;

    // 2. Prepare Coach Prompt & API Key
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      toast.error("Gemini API key is not configured");
      setStatus("error");
      return;
    }

    const coachPrompt =
      systemPrompt ||
      `You are ${coachName}, an elite, high-energy Nigerian and Global business strategist and commercial growth mentor powered by BTV AI Studio.
${businessContext?.business_name ? `The user's business is "${businessContext.business_name}".` : ""}
${businessContext?.industry ? `Industry: ${businessContext.industry}.` : ""}
${businessContext?.goal ? `Goal: ${businessContext.goal}.` : ""}
Speak with high energy, commercial sharpness, and actionable practical insights. Keep responses concise and punchy (2-3 sentences max per spoken turn) so the live voice call feels natural, engaging, and fast. Refer to Naira (₦) or market expansion where appropriate. Never output markdown asterisks or bullet points because this will be spoken aloud to the user.`;

    try {
      // 3. Connect to @google/genai Live API WebSocket session
      const ai = new GoogleGenAI({ apiKey });

      console.log(`[VIXORA LIVE] Establishing Gemini Live session (Model: gemini-3.1-flash-live-preview, Voice: ${selectedVoice})...`);

      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: selectedVoice as any,
              },
            },
          },
          systemInstruction: {
            parts: [{ text: coachPrompt }],
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (msg: any) => {
            const serverContent = msg.serverContent;
            if (!serverContent) return;

            // Handle user interruption
            if (serverContent.interrupted) {
              console.log("[VIXORA LIVE] Interruption detected from user speech");
              stopAudioPlayback();
              setStatus("listening");
            }

            // Real-time user speech transcription
            if (serverContent.interimInputTranscription?.text) {
              const interim = serverContent.interimInputTranscription.text.trim();
              if (interim) {
                turnUserTextRef.current = interim;
                setTranscript(interim);
              }
            }
            if (serverContent.inputTranscription?.text) {
              const finalInput = serverContent.inputTranscription.text.trim();
              if (finalInput) {
                turnUserTextRef.current = finalInput;
                setTranscript(finalInput);
              }
            }

            // Real-time model transcript chunk
            if (serverContent.outputTranscription?.text) {
              const chunk = serverContent.outputTranscription.text;
              turnAssistantTextRef.current += chunk;
              setReply(turnAssistantTextRef.current);
            }

            // Model Audio Playback Stream (24kHz PCM)
            const modelParts = serverContent.modelTurn?.parts;
            if (modelParts && Array.isArray(modelParts)) {
              for (const part of modelParts) {
                if (part.inlineData?.data) {
                  playPcmChunk(part.inlineData.data);
                }
                if (part.text) {
                  turnAssistantTextRef.current += part.text;
                  setReply(turnAssistantTextRef.current);
                }
              }
            }

            // Turn completed
            if (serverContent.turnComplete) {
              turnAssistantTextRef.current = "";
            }
          },
          onerror: (err: any) => {
            console.error("[VIXORA LIVE] Session error:", err);
            toast.error(err?.message || "Gemini Live session error");
          },
          onclose: (e: any) => {
            console.log("[VIXORA LIVE] Session closed:", e);
            isSessionActiveRef.current = false;
          },
        },
      });

      liveSessionRef.current = session;
      isSessionActiveRef.current = true;

      // 4. Setup AudioContext & 16kHz PCM Capture pipeline
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtxClass({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputCtx;
      if (inputCtx.state === "suspended") {
        await inputCtx.resume();
      }

      const micSource = inputCtx.createMediaStreamSource(micStreamRef.current);
      micSourceRef.current = micSource;

      // Vocal bandpass filter (85Hz - 7500Hz)
      const highPass = inputCtx.createBiquadFilter();
      highPass.type = "highpass";
      highPass.frequency.setValueAtTime(85, inputCtx.currentTime);

      const lowPass = inputCtx.createBiquadFilter();
      lowPass.type = "lowpass";
      lowPass.frequency.setValueAtTime(7500, inputCtx.currentTime);

      const micAnalyser = inputCtx.createAnalyser();
      micAnalyser.fftSize = 64;
      micAnalyser.smoothingTimeConstant = 0.7;
      micAnalyserRef.current = micAnalyser;

      micSource.connect(highPass);
      highPass.connect(lowPass);
      lowPass.connect(micAnalyser);

      // ScriptProcessorNode to capture PCM Float32 and stream 16-bit linear PCM
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      micProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (mutedRef.current) return;
        if (!isSessionActiveRef.current || !liveSessionRef.current) return;

        const inputChannelData = e.inputBuffer.getChannelData(0);
        const inputRate = inputCtx.sampleRate || 16000;

        // Downsample to 16kHz
        const pcm16k = downsampleBuffer(inputChannelData, inputRate, 16000);

        // Convert to 16-bit linear PCM little-endian
        const pcmBytes = floatTo16BitPCM(pcm16k);
        const base64Audio = arrayBufferToBase64(pcmBytes.buffer as ArrayBuffer);

        try {
          liveSessionRef.current.sendRealtimeInput({
            audio: {
              data: base64Audio,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } catch (sendErr) {
          console.warn("[VIXORA LIVE] Realtime audio send notice:", sendErr);
        }
      };

      lowPass.connect(processor);

      // Silent gain node to keep processor active without speaker loopback
      const silentGain = inputCtx.createGain();
      silentGain.gain.setValueAtTime(0, inputCtx.currentTime);
      processor.connect(silentGain);
      silentGain.connect(inputCtx.destination);

      // Start spectrum visualizer
      startVisualizer();
      setStatus("listening");

      // Initial Greeting trigger
      const welcomeGreeting = `Hello! I am ${coachName}, your BTV AI live business coach. What are we strategizing today? Tell me about your sales, pricing, or business growth challenges!`;
      setReply(welcomeGreeting);

      try {
        session.sendClientContent({
          turns: [
            {
              role: "user",
              parts: [{ text: `Please greet the user warmly as Coach Bethel Goodgift and say: "${welcomeGreeting}"` }],
            },
          ],
          turnComplete: true,
        });
      } catch (greetErr) {
        console.warn("[VIXORA LIVE] Initial greeting send notice:", greetErr);
      }
    } catch (err: any) {
      console.error("[VIXORA LIVE] Failed to connect Live API:", err);
      toast.error(err?.message || "Could not connect to Gemini Live audio session.");
      setStatus("error");
    }
  }, [businessContext, coachName, endCall, playPcmChunk, selectedVoice, startVisualizer, stopAudioPlayback, systemPrompt]);

  useEffect(() => {
    if (open) {
      startCall();
    } else {
      endCall();
    }
    return () => endCall();
  }, [open, selectedVoice, startCall, endCall]);

  const handleInterrupt = () => {
    stopAudioPlayback();
    if (liveSessionRef.current && isSessionActiveRef.current) {
      try {
        liveSessionRef.current.sendClientContent({
          turns: [{ role: "user", parts: [{ text: "I have a quick follow-up question." }] }],
          turnComplete: true,
        });
      } catch {}
    }
    setStatus("listening");
    toast.info(`${coachName} is listening to you now...`);
  };

  const handleSendSpokenNow = () => {
    if (transcript.trim() && liveSessionRef.current && isSessionActiveRef.current) {
      try {
        liveSessionRef.current.sendClientContent({
          turns: [{ role: "user", parts: [{ text: transcript.trim() }] }],
          turnComplete: true,
        });
        setTranscript("");
      } catch (err) {
        console.warn("[VIXORA LIVE] Send now notice:", err);
      }
    }
  };

  const currentPersona = VIXORA_VOICE_PERSONAS.find((p) => p.id === selectedVoice) || VIXORA_VOICE_PERSONAS[0];

  const statusLabel =
    micPermission === "denied"
      ? "Microphone Access Required"
      : micPermission === "requesting"
      ? "Connecting Gemini Live Audio…"
      : status === "listening"
      ? "Gemini Live Listening…"
      : status === "processing"
      ? "Gemini AI formulating strategy…"
      : status === "speaking"
      ? `${coachName} speaking (${currentPersona.name})…`
      : "Live Call Ready";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img
                src={coachAvatarImg}
                alt={coachName}
                className="h-10 w-10 rounded-2xl object-cover ring-2 ring-primary shadow-md"
              />
              {micPermission === "granted" && (
                <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-sm font-black text-white leading-none">
                  {coachName} Live Call
                </DialogTitle>
                <Badge className="bg-gradient-to-r from-primary to-accent text-white border-0 text-[9px] font-black px-1.5 py-0 shadow-xs">
                  GEMINI LIVE API
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[11px] text-slate-400 font-medium">
                  {currentPersona.name} · Bidirectional Live PCM
                </p>
                {micPermission === "granted" ? (
                  <Badge
                    variant="outline"
                    className="h-4 text-[9px] font-extrabold bg-emerald-500/10 text-emerald-300 border-emerald-500/30 gap-1 px-1.5"
                  >
                    <CheckCircle2 className="h-2.5 w-2.5" /> Live
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="h-4 text-[9px] font-extrabold bg-amber-500/10 text-amber-300 border-amber-500/30 gap-1 px-1.5"
                  >
                    <Mic className="h-2.5 w-2.5" /> Needs Mic
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowVoicePicker(!showVoicePicker)}
              className={`h-8 w-8 rounded-full ${showVoicePicker ? "bg-white/20 text-white" : "text-slate-400 hover:text-white hover:bg-white/10"}`}
              title="Change Gemini Live Voice Persona"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Voice Persona Selector Drawer */}
        {showVoicePicker && (
          <div className="p-3 bg-slate-900 border-b border-white/10 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Select Gemini Live Voice
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Instant live switch</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {VIXORA_VOICE_PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedVoice(p.id);
                    setShowVoicePicker(false);
                    toast.success(`Switched coach voice to ${p.name}`);
                  }}
                  className={`text-left p-2 rounded-xl border text-xs transition-all flex flex-col gap-0.5 ${
                    selectedVoice === p.id
                      ? "bg-primary/20 border-primary text-white font-bold shadow-xs"
                      : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300 font-medium"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold truncate">{p.name}</span>
                    <Badge variant="outline" className="text-[8px] px-1 py-0 border-white/20">
                      {p.tag}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{p.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Microphone Permission Prompt State */}
        {micPermission === "denied" ? (
          <div className="p-6 text-center space-y-4 bg-slate-950/80 my-2">
            <div className="mx-auto h-16 w-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20 animate-pulse">
              <MicOff className="h-8 w-8" />
            </div>

            <div className="space-y-1.5 max-w-sm mx-auto">
              <h3 className="text-base font-bold text-white">Microphone Access Required</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                To have a real-time live voice call with {coachName} powered by Google Gemini Live, please allow microphone access.
              </p>
              {permissionError && (
                <p className="text-[11px] text-amber-300/90 font-medium bg-amber-950/40 p-2 rounded-xl border border-amber-500/30">
                  {permissionError}
                </p>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2 max-w-xs mx-auto">
              <Button
                type="button"
                onClick={startCall}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs h-11 rounded-xl shadow-lg shadow-emerald-600/30 gap-2"
              >
                <Mic className="h-4 w-4 animate-bounce" />
                <span>Allow Microphone & Call</span>
              </Button>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-1">
              <Lock className="h-3 w-3 text-slate-500" />
              <span>Click the lock icon in your address bar if blocked</span>
            </div>
          </div>
        ) : (
          /* Live Audio Visualizer Radar Stage */
          <div className="relative aspect-[4/3] flex flex-col items-center justify-center p-6 gap-5 overflow-hidden">
            {/* Ambient Glows */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/25 via-transparent to-transparent pointer-events-none" />

            {/* Center Visualizer Radar */}
            <div className="relative flex items-center justify-center">
              {/* Pulsing outer rings */}
              <div
                className={`absolute h-44 w-44 rounded-full border border-primary/30 transition-all duration-700 ${
                  status === "speaking"
                    ? "scale-125 border-accent/50 animate-ping opacity-70"
                    : status === "listening"
                    ? "scale-110 border-emerald-500/40 animate-pulse"
                    : "scale-100 opacity-20"
                }`}
              />
              <div
                className={`absolute h-36 w-36 rounded-full border-2 border-dashed border-primary/40 ${
                  status !== "idle" ? "animate-spin" : ""
                }`}
                style={{ animationDuration: "10s" }}
              />

              {/* Core Avatar Circle */}
              <div
                className={`relative h-24 w-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
                  status === "speaking"
                    ? "bg-gradient-to-tr from-accent via-primary to-amber-500 shadow-accent/50 scale-105"
                    : status === "listening"
                    ? "bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/50 scale-105"
                    : status === "processing"
                    ? "bg-slate-800 shadow-primary/20"
                    : "bg-slate-800"
                }`}
              >
                {status === "processing" ? (
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                ) : status === "speaking" ? (
                  <Volume2 className="h-10 w-10 text-white animate-bounce" />
                ) : muted ? (
                  <MicOff className="h-10 w-10 text-rose-400" />
                ) : (
                  <Mic className="h-10 w-10 text-white animate-pulse" />
                )}
              </div>
            </div>

            {/* Equalizer Frequency Waves */}
            <div className="flex items-center justify-center gap-1.5 h-10 px-4">
              {waveHeights.map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${h}px` }}
                  className={`w-1.5 rounded-full transition-all duration-100 ${
                    status === "speaking"
                      ? "bg-gradient-to-t from-accent to-amber-300 shadow-sm"
                      : status === "listening"
                      ? "bg-gradient-to-t from-emerald-500 to-teal-300 shadow-sm"
                      : "bg-white/20"
                  }`}
                />
              ))}
            </div>

            {/* Status & Subtitle Stream */}
            <div className="text-center max-w-xs space-y-1.5 z-10 min-h-[44px]">
              <Badge
                variant="outline"
                className={`text-[10px] font-black uppercase tracking-wider ${
                  status === "speaking"
                    ? "bg-accent/20 text-accent border-accent/40"
                    : status === "listening"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : status === "processing"
                    ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/40"
                    : "bg-white/10 text-slate-300 border-white/20"
                }`}
              >
                {statusLabel}
              </Badge>

              {transcript && (
                <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-white/10 space-y-1 shadow-lg">
                  <p className="text-xs text-emerald-300 line-clamp-2 italic font-semibold">
                    "{transcript}"
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSendSpokenNow}
                    className="h-5 px-2 text-[10px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-md gap-1 mx-auto"
                  >
                    <Send className="h-2.5 w-2.5" /> Send Now
                  </Button>
                </div>
              )}

              {reply && !transcript && (
                <p className="text-xs text-slate-200 font-medium line-clamp-2 leading-relaxed">
                  {coachName}: "{reply}"
                </p>
              )}

              {!transcript && !reply && (
                <p className="text-xs text-slate-400">
                  Speak naturally into your mic. Gemini Live will listen in real-time and reply with natural speech.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Controls Bar */}
        <div className="p-4 border-t border-white/10 bg-slate-900/90 backdrop-blur-md flex items-center justify-center gap-3">
          <Button
            type="button"
            variant={muted ? "destructive" : "secondary"}
            size="icon"
            onClick={() => setMuted((m) => !m)}
            className="h-12 w-12 rounded-2xl shadow-md transition-transform hover:scale-105"
            title={muted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleInterrupt}
            className="h-12 px-4 rounded-2xl border-white/20 text-white hover:bg-white/10 text-xs font-bold gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Interrupt / Talk Now
          </Button>

          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-12 w-12 rounded-2xl bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/30 transition-transform hover:scale-105"
            title="End Live Call"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
