import { useState, useEffect, useRef } from "react";
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
  Zap,
  SlidersHorizontal,
  Settings2,
  Radio,
} from "lucide-react";
import {
  VixoraLiveVoiceAgent,
  VixoraVoiceName,
  VIXORA_VOICE_PERSONAS,
  VoiceAgentState,
} from "@/lib/vixoraVoiceEngine";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/integrations/supabase/client";
import { apiKeyService } from "@/vixora/services/apiKeyService";
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
  const [continuousMode, setContinuousMode] = useState(true);
  const [showVoicePicker, setShowVoicePicker] = useState(false);

  const agentRef = useRef<VixoraLiveVoiceAgent | null>(null);
  const convIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) {
      startCall();
    } else {
      endCall();
    }
    return () => endCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedVoice]);

  async function startCall() {
    endCall();
    setMicPermission("requesting");
    setPermissionError("");

    const welcomeGreeting = `Hello! I am ${coachName}, your BTV AI live business coach. What are we strategizing today? Tell me about your sales, pricing, or business growth challenges!`;

    const coachPrompt =
      systemPrompt ||
      `You are ${coachName}, an elite, high-energy Nigerian and Global business strategist and commercial growth mentor powered by BTV AI Studio.
${businessContext?.business_name ? `The user's business is "${businessContext.business_name}".` : ""}
${businessContext?.industry ? `Industry: ${businessContext.industry}.` : ""}
${businessContext?.goal ? `Goal: ${businessContext.goal}.` : ""}
Speak with high energy, commercial sharpness, and actionable practical insights. Keep responses concise and punchy (2-3 sentences max per spoken turn) so the live voice call feels natural, engaging, and fast. Refer to Naira (₦) or market expansion where appropriate. Never output markdown asterisks or bullet points.`;

    const agent = new VixoraLiveVoiceAgent(
      {
        voiceName: selectedVoice,
        silenceTimeoutMs: 1100, // 1.1s instant turnaround
        continuous: continuousMode,
        lang: "en-US",
        systemPrompt: coachPrompt,
      },
      {
        onStateChange: (s) => {
          setStatus(s);
          if (s === "mic-denied") {
            setMicPermission("denied");
          }
        },
        onPermissionChange: (permStatus, message) => {
          setMicPermission(permStatus);
          if (message) setPermissionError(message);
        },
        onInterimTranscript: (t) => setTranscript(t),
        onFinalTranscript: (t) => setTranscript(t),
        onAIResponseTextChunk: (chunk) => {
          setReply((prev) => prev + chunk);
        },
        onAIResponse: (responseText) => {
          setReply(responseText);
        },
        onAudioLevels: (levels) => setWaveHeights(levels),
        onError: (err) => {
          if (err.includes("Microphone") || err.includes("permission") || err.includes("denied")) {
            setMicPermission("denied");
            setPermissionError(err);
          } else {
            console.warn("Gemini Live Voice notice:", err);
          }
        },
      }
    );

    agentRef.current = agent;
    const started = await agent.start(welcomeGreeting);

    if (started) {
      setMicPermission("granted");
      setReply(welcomeGreeting);
    } else {
      setMicPermission("denied");
    }
  }

  function endCall() {
    if (agentRef.current) {
      agentRef.current.stop();
      agentRef.current = null;
    }
    setStatus("idle");
    setTranscript("");
    setReply("");
  }

  const handleInterrupt = () => {
    if (agentRef.current) {
      agentRef.current.interrupt();
      toast.info(`${coachName} is listening to you now...`);
    }
  };

  const handleSendSpokenNow = () => {
    if (agentRef.current && transcript.trim().length > 1) {
      agentRef.current.submitSpokenNow();
    }
  };

  const handleGrantMicClick = async () => {
    toast.info("Requesting microphone access...");
    await startCall();
  };

  const currentPersona = VIXORA_VOICE_PERSONAS.find((p) => p.id === selectedVoice) || VIXORA_VOICE_PERSONAS[0];

  const statusLabel =
    micPermission === "denied"
      ? "Microphone Access Required"
      : micPermission === "requesting"
      ? "Connecting Vixora Live Audio…"
      : status === "listening"
      ? "Vixora Listening freely…"
      : status === "processing"
      ? "Vixora AI formulating strategy…"
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
                  VIXORA AI LIVE
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[11px] text-slate-400 font-medium">
                  {currentPersona.name} · Ultra-Fast VAD
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
              title="Change Vixora Voice Persona"
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
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Select Vixora AI Voice
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
                To have a real-time live voice call with {coachName} powered by Vixora AI, please allow microphone access.
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
                onClick={handleGrantMicClick}
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
                  Speak naturally into your mic. Vixora AI will listen in real-time and reply when you pause.
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
