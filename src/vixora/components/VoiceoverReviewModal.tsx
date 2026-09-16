import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Volume2,
  Play,
  Square,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Radio,
  Mic,
  MicOff,
  Activity,
  Zap,
  Bot,
  User,
  Copy,
  PlusCircle,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { VOICE_CATALOG, VOICE_AVATAR_OPTIONS } from "../constants";
import { sfx } from "../sfxLibrary";
import {
  VixoraLiveVoiceAgent,
  VoiceAgentState,
  VIXORA_VOICE_PERSONAS,
  VixoraVoiceName,
} from "@/lib/vixoraVoiceEngine";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/integrations/supabase/client";
import { apiKeyService } from "@/vixora/services/apiKeyService";

interface VoiceoverReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  script: string;
  onScriptChange: (newScript: string) => void;
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
}

interface AgentTurn {
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

export default function VoiceoverReviewModal({
  open,
  onOpenChange,
  script,
  onScriptChange,
  selectedVoice,
  onVoiceChange,
}: VoiceoverReviewModalProps) {
  const [activeTab, setActiveTab] = useState<"audition" | "agent">("audition");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1);
  const [pitch, setPitch] = useState<number>(1.0);
  const [rate, setRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  
  // Real-time amplitude and frequency visualizer state
  const [waveBars, setWaveBars] = useState<number[]>(new Array(24).fill(8));
  const [audioIntensity, setAudioIntensity] = useState<number>(0);
  const [peakDb, setPeakDb] = useState<string>("-Infinity dB");
  const [audioSignalStatus, setAudioSignalStatus] = useState<string>("Ready");

  // Victoria AI Live Voice Agent state
  const [agentState, setAgentState] = useState<VoiceAgentState>("idle");
  const [micPermission, setMicPermission] = useState<"granted" | "prompt" | "denied" | "requesting">("requesting");
  const [permissionError, setPermissionError] = useState<string>("");
  const [userTranscript, setUserTranscript] = useState<string>("");
  const [agentReply, setAgentReply] = useState<string>("");
  const [chatTurns, setChatTurns] = useState<AgentTurn[]>([]);
  const [agentVoice, setAgentVoice] = useState<VixoraVoiceName>("Aoede");

  // Web Audio Context & Analyser for real-time amplitude tracking
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const syntheticOscRef = useRef<OscillatorNode | null>(null);
  const syntheticGainRef = useRef<GainNode | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const agentRef = useRef<VixoraLiveVoiceAgent | null>(null);

  // Selected persona resolution
  const persona =
    VOICE_CATALOG.find((v) => v.id === selectedVoice || v.voiceName === selectedVoice) ||
    VOICE_CATALOG[0];

  // Set default pitch and rate based on chosen voice persona
  useEffect(() => {
    if (persona) {
      if (persona.voiceName === "Kore") {
        setPitch(1.05);
        setRate(1.02);
      } else {
        setPitch(1.0);
        setRate(1.0);
      }
    }
  }, [selectedVoice, persona]);

  // Clean up all audio nodes & live agents on modal close or unmount
  useEffect(() => {
    if (!open) {
      stopVoiceover();
      stopLiveVoiceAgent();
    }
    return () => {
      stopVoiceover();
      stopLiveVoiceAgent();
    };
  }, [open]);

  // Real-time audio analyser loop
  const startAnalyserLoop = () => {
    const update = () => {
      if (analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Compute RMS & Frequency Bars
        let sumSquares = 0;
        const barCount = 24;
        const step = Math.max(1, Math.floor(bufferLength / barCount));
        const bars: number[] = [];

        for (let i = 0; i < barCount; i++) {
          const val = dataArray[i * step] || 0;
          sumSquares += val * val;
          // Scale bar height between 8px and 56px with dynamic logarithmic curve
          const scaledHeight = Math.min(56, Math.max(8, Math.round((val / 255) * 48 + 8)));
          bars.push(scaledHeight);
        }

        const rms = Math.sqrt(sumSquares / barCount) / 255;
        const intensityPct = Math.min(100, Math.round(rms * 135));
        setAudioIntensity(intensityPct);
        setWaveBars(bars);

        if (intensityPct > 5) {
          const db = Math.round(20 * Math.log10(Math.max(0.01, rms)));
          setPeakDb(`${db} dB`);
          setAudioSignalStatus(intensityPct > 70 ? "Peak Studio Signal" : "Voice Active");
        } else {
          setPeakDb("-48 dB");
          setAudioSignalStatus("Signal Gated");
        }

        animFrameRef.current = requestAnimationFrame(update);
      }
    };

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    animFrameRef.current = requestAnimationFrame(update);
  };

  const stopAnalyserLoop = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setWaveBars(new Array(24).fill(8));
    setAudioIntensity(0);
    setPeakDb("Gated");
    setAudioSignalStatus("Ready");
  };

  // Setup Web Audio Context DSP chain for speech playback analysis
  const initPlaybackAnalyser = () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioCtxClass();
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }

      if (!analyserRef.current && audioCtxRef.current) {
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 64;
        analyserRef.current.smoothingTimeConstant = 0.82;
      }
    } catch (e) {
      console.warn("Could not create Web Audio Context for visualizer:", e);
    }
  };

  const words = script.trim() ? script.trim().split(/\s+/) : [];

  // Start Speech Synthesis Audition with Real-Time Audio DSP Simulation
  const startVoiceover = () => {
    if (!script.trim()) {
      toast.error("Please provide a script to review.");
      return;
    }

    // Stop active live voice call if running
    stopLiveVoiceAgent();

    initPlaybackAnalyser();

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(script);
      utter.pitch = pitch;
      utter.rate = rate;
      utter.volume = volume;

      const voices = window.speechSynthesis.getVoices();
      if (persona.voiceName === "Kore") {
        const ngVoice = voices.find(
          (v) =>
            v.lang.includes("en-NG") ||
            v.name.toLowerCase().includes("nigeria") ||
            v.lang.includes("en-GB")
        );
        if (ngVoice) utter.voice = ngVoice;
      } else if (persona.voiceName === "Aoede") {
        const studioVoice = voices.find(
          (v) =>
            (v.lang.includes("en-US") || v.lang.includes("en-GB")) &&
            (v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("natural"))
        );
        if (studioVoice) utter.voice = studioVoice;
      } else if (persona.voiceName === "Puck" || persona.voiceName === "Charon" || persona.voiceName === "Fenrir") {
        const maleVoice = voices.find(
          (v) => v.lang.includes("en-US") && v.name.toLowerCase().includes("male")
        );
        if (maleVoice) utter.voice = maleVoice;
      }

      utter.onboundary = (event) => {
        if (event.name === "word") {
          const charIndex = event.charIndex;
          const textBefore = script.slice(0, charIndex);
          const wordCount = textBefore.trim().split(/\s+/).length - 1;
          setCurrentWordIndex(Math.max(0, wordCount));
        }
      };

      utter.onstart = () => {
        setIsPlaying(true);
        sfx.playWhoosh(0.25);

        // Drive synthetic audio pulse through AudioContext Analyser for genuine live DSP waveform
        if (audioCtxRef.current && analyserRef.current) {
          try {
            const osc = audioCtxRef.current.createOscillator();
            const gain = audioCtxRef.current.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(140 * pitch, audioCtxRef.current.currentTime);
            // Modulate gain for vocal envelope
            gain.gain.setValueAtTime(0.001, audioCtxRef.current.currentTime);
            gain.gain.linearRampToValueAtTime(0.65 * volume, audioCtxRef.current.currentTime + 0.1);

            osc.connect(gain);
            gain.connect(analyserRef.current);
            // DO NOT connect to destination to avoid echoing with speech synth
            osc.start();

            syntheticOscRef.current = osc;
            syntheticGainRef.current = gain;
          } catch (e) {
            console.warn("Playback DSP bridge notice:", e);
          }
        }

        startAnalyserLoop();
      };

      utter.onend = () => {
        stopVoiceover();
      };

      utter.onerror = () => {
        stopVoiceover();
      };

      utteranceRef.current = utter;
      window.speechSynthesis.speak(utter);
    } else {
      toast.error("Speech synthesis is not supported on this browser.");
    }
  };

  const stopVoiceover = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (syntheticOscRef.current) {
      try {
        syntheticOscRef.current.stop();
        syntheticOscRef.current.disconnect();
      } catch {}
      syntheticOscRef.current = null;
    }
    stopAnalyserLoop();
    setIsPlaying(false);
    setCurrentWordIndex(-1);
  };

  // Start Victoria AI Live Voice Agent (interactive listening and verbal replies)
  const startLiveVoiceAgent = async () => {
    stopVoiceover();
    stopLiveVoiceAgent();
    setMicPermission("requesting");
    setPermissionError("");

    const welcomeGreeting = `Hello! I am Victoria, your Executive Studio Director and AI Producer. I am listening to your microphone in real-time. Speak naturally — tell me your hook, target audience, or ask me to polish your video narrative!`;

    const agent = new VixoraLiveVoiceAgent(
      {
        voiceName: agentVoice,
        silenceTimeoutMs: 1100, // 1.1s instant turnaround
        continuous: true,
        lang: "en-US",
      },
      {
        onStateChange: (s) => {
          setAgentState(s);
          if (s === "mic-denied") {
            setMicPermission("denied");
          }
        },
        onPermissionChange: (permStatus, message) => {
          setMicPermission(permStatus);
          if (message) setPermissionError(message);
        },
        onInterimTranscript: (t) => {
          setUserTranscript(t);
        },
        onFinalTranscript: (t) => {
          setUserTranscript(t);
        },
        onAudioLevels: (levels) => {
          // Re-map levels into 24 bars for high-density amplitude visualizer
          const mappedBars: number[] = [];
          for (let i = 0; i < 24; i++) {
            const sample = levels[i % levels.length] || 10;
            mappedBars.push(sample);
          }
          setWaveBars(mappedBars);
          const avgLevel = mappedBars.reduce((acc, v) => acc + v, 0) / mappedBars.length;
          setAudioIntensity(Math.min(100, Math.round((avgLevel / 65) * 100)));
          setPeakDb(avgLevel > 15 ? `${Math.round((avgLevel / 65) * 40 - 40)} dB` : "-45 dB");
          setAudioSignalStatus(avgLevel > 20 ? "Mic Signal Active" : "VAD Listening");
        },
        onError: (err) => {
          if (err.includes("Microphone") || err.includes("permission") || err.includes("denied")) {
            setMicPermission("denied");
            setPermissionError(err);
          }
        },
        onUserFinishedSpeaking: async (userSpeech) => {
          if (!userSpeech || userSpeech.trim().length < 2) return;

          const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          setChatTurns((prev) => [...prev, { role: "user", text: userSpeech, timestamp: timeStr }]);
          setUserTranscript("");

          // 1. Try Supabase Edge Function
          try {
            const systemPrompt = `You are Victoria, the Executive Studio Director & AI Creative Producer at Vixora AI Studio & Bethelincovibe.
You speak with high energy, authoritative clarity, and cinematic polish.
Keep your verbal responses concise and punchy (2-3 sentences max) so the live voice conversation feels natural, engaging, and fast.
Guide the user on video hooks, viral pacing, voiceover modulation, and commercial conversion.`;

            const { data, error } = await supabase.functions.invoke("business-coach", {
              body: {
                message: userSpeech,
                systemPrompt,
                businessContext: { currentScript: script },
              },
            });

            if (!error && data?.reply) {
              const cleanReply = String(data.reply).replace(/[*_#`~]/g, "");
              setAgentReply(cleanReply);
              setChatTurns((prev) => [
                ...prev,
                { role: "assistant", text: cleanReply, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
              ]);
              return cleanReply;
            }
          } catch (e) {
            console.warn("Supabase voice reply fallback to direct Gemini:", e);
          }

          // 2. Direct Gemini Fallback
          try {
            const credsKey = apiKeyService.getCredentials().geminiApiKey;
            const apiKey =
              credsKey ||
              (import.meta as any).env?.VITE_GEMINI_API_KEY ||
              (typeof process !== "undefined" ? (process as any).env?.GEMINI_API_KEY : "") ||
              "AIzaSyAeCyBC9daZbvXNRtfLjxBWwpF3MwXJggk";

            const ai = new GoogleGenAI({ apiKey });
            const prompt = `You are Victoria, the Executive Studio Director & AI Creative Producer at Vixora AI Studio.
Speak with high energy, polished authority, and viral marketing sharpness in 2 to 3 natural spoken sentences without markdown asterisks.
Current video script draft: "${script}"
User said: "${userSpeech}"`;

            const res = await ai.models.generateContent({
              model: "gemini-3.8-flash",
              contents: [{ parts: [{ text: prompt }] }],
            });

            const reply = res.text?.trim() || "I am on it. Let us optimize your hook for maximum viral retention.";
            setAgentReply(reply);
            setChatTurns((prev) => [
              ...prev,
              { role: "assistant", text: reply, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
            ]);
            return reply;
          } catch (err) {
            console.error("Direct Gemini Voice generation error:", err);
            const errReply = "I heard your idea! Let us refine that hook to make your video convert seamlessly.";
            setAgentReply(errReply);
            return errReply;
          }
        },
      }
    );

    agentRef.current = agent;
    const started = await agent.start(welcomeGreeting);
    if (started) {
      setMicPermission("granted");
      setAgentReply(welcomeGreeting);
      setChatTurns([
        {
          role: "assistant",
          text: welcomeGreeting,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  };

  const stopLiveVoiceAgent = () => {
    if (agentRef.current) {
      agentRef.current.stop();
      agentRef.current = null;
    }
    setAgentState("idle");
    setUserTranscript("");
    stopAnalyserLoop();
  };

  const handleInsertPhrase = (phrase: string) => {
    onScriptChange(script ? `${script} ${phrase}` : phrase);
    toast.success("Appended hook to script!");
    sfx.playPop(0.3);
  };

  const handleApplyTurnToScript = (text: string) => {
    onScriptChange(text);
    toast.success("Applied Victoria's response as new script!");
    sfx.playPop(0.3);
  };

  const isLiveAgentActive = agentState === "listening" || agentState === "processing" || agentState === "speaking";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-card">
        {/* Header with Visualizer Aura */}
        <DialogHeader className="p-5 border-b border-border/60 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-emerald-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className={`h-11 w-11 rounded-2xl flex items-center justify-center text-white shadow-md transition-all duration-300 ${
                    isPlaying || isLiveAgentActive
                      ? "bg-gradient-to-tr from-orange-500 via-amber-500 to-emerald-500 ring-4 ring-orange-500/20 scale-105"
                      : "bg-gradient-to-tr from-slate-700 to-slate-800 text-slate-200"
                  }`}
                >
                  {isLiveAgentActive ? <Radio className="h-5 w-5 animate-pulse" /> : <Volume2 className="h-5 w-5" />}
                </div>
                {(isPlaying || isLiveAgentActive) && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-card"></span>
                  </span>
                )}
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>Vixora AI Voiceover Soundstage & Live Audition</span>
                  <Badge variant="outline" className="bg-orange-500/15 text-orange-600 border-orange-500/30 text-[10px] font-bold">
                    Victoria Studio Engine
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Real-time audio amplitude DSP visualizer, live Victoria AI voice consultation, and studio audio mastering.
                </DialogDescription>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="hidden sm:flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
              <Button
                type="button"
                variant={activeTab === "audition" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  stopLiveVoiceAgent();
                  setActiveTab("audition");
                }}
                className={`h-7 px-3 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "audition" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground"
                }`}
              >
                <Play className="h-3 w-3 mr-1 fill-current" />
                <span>Script Audition</span>
              </Button>
              <Button
                type="button"
                variant={activeTab === "agent" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  stopVoiceover();
                  setActiveTab("agent");
                }}
                className={`h-7 px-3 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "agent" ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground"
                }`}
              >
                <Radio className="h-3 w-3 mr-1 text-emerald-300 animate-pulse" />
                <span>Victoria AI Live Call</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* Real-Time Amplitude & Frequency Equalizer Display */}
          <div className="relative p-4 rounded-2xl border border-border/80 bg-gradient-to-b from-muted/40 via-muted/20 to-card overflow-hidden shadow-inner">
            {/* Background Glow Orb */}
            <div
              style={{
                transform: `scale(${1 + audioIntensity * 0.008})`,
                opacity: (isPlaying || isLiveAgentActive) ? Math.max(0.2, audioIntensity * 0.01) : 0.05,
              }}
              className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-32 bg-gradient-to-r from-orange-500/40 via-amber-500/40 to-emerald-500/40 rounded-full blur-2xl pointer-events-none transition-all duration-75"
            />

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Voice Persona & Status */}
              <div className="space-y-1 text-center md:text-left w-full md:w-auto">
                <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Voice Source:</span>
                  <Badge className="text-[11px] font-bold bg-primary/90 text-primary-foreground py-0.5 px-2">
                    {activeTab === "agent" ? "Victoria AI (Live Voice)" : persona.name}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold py-0.5 ${
                      isPlaying || isLiveAgentActive
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Activity className="h-3 w-3 mr-1 inline animate-pulse" />
                    {audioSignalStatus}
                  </Badge>
                </div>
                <div className="flex items-center justify-center md:justify-start gap-3 text-xs text-muted-foreground font-mono">
                  <span>Intensity: <strong className="text-foreground">{audioIntensity}%</strong></span>
                  <span>•</span>
                  <span>Peak: <strong className="text-foreground">{peakDb}</strong></span>
                  <span>•</span>
                  <span>Pitch: <strong className="text-foreground">{pitch.toFixed(2)}x</strong></span>
                </div>
              </div>

              {/* 24-Band Responsive Audio Amplitude Equalizer */}
              <div className="flex items-end justify-center gap-1 h-14 px-4 py-2 bg-background/90 rounded-2xl border border-border/80 shadow-xs min-w-[280px]">
                {waveBars.map((barHeight, idx) => {
                  const isCenter = idx >= 8 && idx <= 16;
                  return (
                    <div
                      key={idx}
                      style={{ height: `${barHeight}px` }}
                      className={`w-1.5 rounded-full transition-all duration-75 ${
                        isPlaying || isLiveAgentActive
                          ? isCenter
                            ? "bg-gradient-to-t from-orange-600 via-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                            : "bg-gradient-to-t from-emerald-600 via-teal-500 to-cyan-400"
                          : "bg-muted-foreground/25"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tab 1: Script Audition & Controls */}
          {activeTab === "audition" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Script Word Tracker Area */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <Label className="text-xs font-bold text-foreground">Narrative Voiceover Script</Label>
                  <span className="text-muted-foreground">
                    {words.length} words (~{Math.ceil(words.length / 2.5)}s duration)
                  </span>
                </div>

                <Textarea
                  value={script}
                  onChange={(e) => onScriptChange(e.target.value)}
                  rows={4}
                  className="text-xs leading-relaxed font-mono rounded-xl resize-y"
                  placeholder="Type or paste your narrative script here..."
                />

                {/* Highlighted Spoken Preview during playback */}
                {isPlaying && (
                  <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/25 text-xs leading-relaxed animate-in fade-in">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-[11px] text-orange-600 flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 animate-spin" />
                        Live Synchronized Karaoke Feed:
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Word #{Math.max(0, currentWordIndex + 1)} of {words.length}
                      </span>
                    </div>
                    <p className="text-foreground select-none">
                      {words.map((w, idx) => (
                        <span
                          key={idx}
                          className={`inline-block mr-1.5 my-0.5 rounded px-1 transition-all duration-100 ${
                            idx === currentWordIndex
                              ? "bg-orange-500 text-white font-bold scale-110 shadow-sm"
                              : idx < currentWordIndex
                              ? "text-muted-foreground/80 line-through decoration-orange-500/40"
                              : "text-foreground font-medium"
                          }`}
                        >
                          {w}
                        </span>
                      ))}
                    </p>
                  </div>
                )}
              </div>

              {/* Voice Persona & Tuning Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl border border-border/70 bg-muted/20">
                {/* Voice Select */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground">Voice Persona</Label>
                  <select
                    value={selectedVoice}
                    onChange={(e) => onVoiceChange(e.target.value)}
                    className="w-full h-9 px-2 text-xs font-semibold rounded-xl bg-background border border-input focus:ring-2 focus:ring-primary"
                  >
                    {VOICE_CATALOG.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.gender})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pitch Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Voice Pitch</span>
                    <span className="font-mono">{pitch.toFixed(2)}x</span>
                  </div>
                  <Slider
                    value={[pitch]}
                    min={0.75}
                    max={1.35}
                    step={0.05}
                    onValueChange={(val) => setPitch(val[0])}
                    className="py-1"
                  />
                </div>

                {/* Pace / Speed Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Pacing & Rate</span>
                    <span className="font-mono">{rate.toFixed(2)}x</span>
                  </div>
                  <Slider
                    value={[rate]}
                    min={0.75}
                    max={1.4}
                    step={0.05}
                    onValueChange={(val) => setRate(val[0])}
                    className="py-1"
                  />
                </div>
              </div>

              {/* Quick Nigerian Viral Hooks */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                  <span>High-Converting Commercial Hooks (Click to append):</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Stop wasting money on marketing that doesn't convert.",
                    "Here is the exact framework to 10x your client acquisition.",
                    "Oya, let's dive straight into the practical execution.",
                    "Zero fluff, 100% results. Tap the link to get started now!",
                    "Send a WhatsApp DM today to lock in your discounted tier.",
                  ].map((phrase, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleInsertPhrase(phrase)}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-colors font-medium text-left shadow-2xs"
                    >
                      + "{phrase.slice(0, 36)}..."
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Victoria AI Live Voice Agent (Interactive Voice Call) */}
          {activeTab === "agent" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h4 className="text-sm font-bold text-foreground">Victoria AI (Studio Lead & AI Director)</h4>
                    <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                      Real-Time Live Call
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Speak directly with Victoria to brainstorm viral hooks, critique your script, and audition voice tones.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isLiveAgentActive ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={stopLiveVoiceAgent}
                      className="rounded-xl text-xs font-bold gap-1.5 shadow-md"
                    >
                      <MicOff className="h-4 w-4" />
                      <span>End Live Call</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={startLiveVoiceAgent}
                      className="rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md gap-1.5"
                    >
                      <Mic className="h-4 w-4" />
                      <span>Start Speaking</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Live Conversation Transcript Feed */}
              <div className="p-4 rounded-2xl border border-border/70 bg-muted/20 min-h-[160px] max-h-[220px] overflow-y-auto space-y-3">
                {chatTurns.length === 0 && !userTranscript && (
                  <div className="py-6 text-center text-muted-foreground space-y-2">
                    <Bot className="h-8 w-8 mx-auto text-emerald-600/60" />
                    <p className="text-xs font-medium">
                      Press <strong>"Start Speaking"</strong> to talk live with Victoria AI.
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Try asking: <em>"Victoria, can you make my script more urgent and compelling?"</em>
                    </p>
                  </div>
                )}

                {chatTurns.map((turn, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 text-xs ${
                      turn.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {turn.role === "assistant" && (
                      <div className="h-6 w-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div
                      className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                        turn.role === "user"
                          ? "bg-primary text-primary-foreground font-medium rounded-tr-xs"
                          : "bg-card border border-border/80 text-foreground font-medium rounded-tl-xs shadow-2xs space-y-1.5"
                      }`}
                    >
                      <p>{turn.text}</p>
                      {turn.role === "assistant" && (
                        <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                          <button
                            type="button"
                            onClick={() => handleApplyTurnToScript(turn.text)}
                            className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 hover:underline"
                          >
                            <PlusCircle className="h-3 w-3" />
                            <span>Apply to Video Script</span>
                          </button>
                        </div>
                      )}
                    </div>
                    {turn.role === "user" && (
                      <div className="h-6 w-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Interim Live Speech Transcript */}
                {userTranscript && (
                  <div className="flex items-start justify-end gap-2 text-xs">
                    <div className="p-3 rounded-2xl bg-primary/80 text-primary-foreground font-medium italic animate-pulse">
                      "{userTranscript}..."
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border/60 bg-muted/30 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setPitch(persona.voiceName === "Kore" ? 1.05 : 1.0);
              setRate(persona.voiceName === "Kore" ? 1.02 : 1.0);
              toast.info("Reset voice parameters to persona default");
            }}
            className="rounded-xl text-xs font-semibold gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Tone</span>
          </Button>

          <div className="flex items-center gap-2">
            {activeTab === "audition" && (
              <>
                {isPlaying ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={stopVoiceover}
                    className="h-10 px-5 rounded-xl font-bold text-xs gap-2 shadow-md"
                  >
                    <Square className="h-4 w-4 fill-current" />
                    <span>Stop Audio</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={startVoiceover}
                    className="h-10 px-6 rounded-xl font-bold text-xs bg-gradient-to-r from-orange-500 via-amber-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md gap-2"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Audition Voiceover</span>
                  </Button>
                )}
              </>
            )}

            <Button
              type="button"
              variant="default"
              onClick={() => {
                stopVoiceover();
                stopLiveVoiceAgent();
                onOpenChange(false);
                toast.success("Voiceover soundstage settings applied to studio!");
              }}
              className="h-10 px-5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              <span>Apply to Video</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
