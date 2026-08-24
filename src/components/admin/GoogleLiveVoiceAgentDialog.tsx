import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic, MicOff, X, Loader2, Volume2, Sparkles, RefreshCw, VolumeX,
  Radio, Zap, Play, Square, MessageSquare, Bot, ArrowRight, ShieldCheck
} from "lucide-react";
import { GoogleLiveVoiceAgent, VoiceAgentState } from "@/lib/googleLiveVoiceEngine";
import { toast } from "sonner";

interface GoogleLiveVoiceAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExecuteCommand: (spokenPrompt: string) => Promise<string | void> | string | void;
  title?: string;
  agentRole?: string;
}

const VOICE_SAMPLE_PROMPTS = [
  "Direct AI Blogger to generate a 3-part Lagos business series",
  "Create an AI Masterclass on WhatsApp Sales Funnels for SMEs",
  "Run a complete platform diagnostic and check all systems",
  "Approve all pending businesses and publish them",
  "Create a custom landing page for Lagos VIP Directory",
];

export default function GoogleLiveVoiceAgentDialog({
  open,
  onOpenChange,
  onExecuteCommand,
  title = "Google Live Voice Agent",
  agentRole = "AI Executive Director · Google Kore Voice",
}: GoogleLiveVoiceAgentDialogProps) {
  const [state, setState] = useState<VoiceAgentState>("idle");
  const [userTranscript, setUserTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [waveHeights, setWaveHeights] = useState<number[]>([12, 24, 36, 48, 30, 18, 42, 28, 15, 35, 25, 12]);
  const [continuousMode, setContinuousMode] = useState(true);
  const [muted, setMuted] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);

  const agentRef = useRef<GoogleLiveVoiceAgent | null>(null);

  useEffect(() => {
    if (open) {
      initAndStartAgent();
    } else {
      stopAgent();
    }
    return () => {
      stopAgent();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const initAndStartAgent = () => {
    stopAgent();

    const agent = new GoogleLiveVoiceAgent(
      {
        voiceName: "Kore", // Google Live Voice Core Engine
        silenceTimeoutMs: 1400, // Intelligently detects user pause of 1.4s
        continuous: continuousMode,
        lang: "en-US",
      },
      {
        onStateChange: (newState) => {
          setState(newState);
        },
        onInterimTranscript: (transcript) => {
          setUserTranscript(transcript);
        },
        onFinalTranscript: (transcript) => {
          setUserTranscript(transcript);
        },
        onUserFinishedSpeaking: async (fullTranscript) => {
          if (!fullTranscript || fullTranscript.trim().length < 2) return;
          
          setConversationHistory((prev) => [...prev, { role: "user", text: fullTranscript }]);
          
          try {
            const reply = await onExecuteCommand(fullTranscript);
            const cleanReply = typeof reply === "string" && reply.trim()
              ? reply
              : "Command received and processed successfully by the AI Administrator.";
            
            setAiResponse(cleanReply);
            setConversationHistory((prev) => [...prev, { role: "assistant", text: cleanReply }]);
            return cleanReply;
          } catch (err: any) {
            const errReply = `I encountered an issue executing that command: ${err?.message || "unknown error"}.`;
            setAiResponse(errReply);
            return errReply;
          }
        },
        onAIResponse: (response) => {
          setAiResponse(response);
        },
        onAudioLevels: (levels) => {
          setWaveHeights(levels);
        },
        onError: (err) => {
          toast.error(err);
        },
      }
    );

    agentRef.current = agent;
    agent.start();

    // Welcome greeting
    const welcome = "Hello! Google Live Voice Agent is active with Kore Voice. Speak naturally — I am listening and will reply once you pause.";
    setAiResponse(welcome);
    agent.speak(welcome);
  };

  const stopAgent = () => {
    if (agentRef.current) {
      agentRef.current.stop();
      agentRef.current = null;
    }
    setState("idle");
    setUserTranscript("");
  };

  const toggleContinuous = () => {
    const next = !continuousMode;
    setContinuousMode(next);
    toast.info(next ? "Hands-free continuous mode enabled" : "Single-command mode enabled");
  };

  const handleInterrupt = () => {
    if (agentRef.current) {
      agentRef.current.interrupt();
      toast.info("Interrupted. Speak now...");
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setUserTranscript(prompt);
    if (agentRef.current) {
      agentRef.current.interrupt();
    }
    onExecuteCommand(prompt);
  };

  const statusLabel =
    state === "listening" ? "Listening in real-time…" :
    state === "processing" ? "User paused — Thinking & Executing…" :
    state === "speaking" ? "Google Kore Voice speaking…" : "Ready";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        {/* Top Header Bar */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center h-10 w-10 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 shadow-md">
              <Radio className="h-5 w-5 text-white animate-pulse" />
              <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-sm sm:text-base font-black text-white leading-none">
                  {title}
                </DialogTitle>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-extrabold px-2 py-0.5">
                  GOOGLE KORE VOICE
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {agentRole}
              </p>
            </div>
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 3D Audio Visualizer Radar Stage */}
        <div className="relative aspect-[4/3] sm:aspect-[16/10] flex flex-col items-center justify-center p-6 gap-4 overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/25 via-indigo-900/10 to-transparent pointer-events-none" />

          {/* Central Pulsing Radar Stage */}
          <div className="relative flex items-center justify-center my-2">
            {/* Outer Waves */}
            <div
              className={`absolute h-44 w-44 rounded-full border border-primary/30 transition-all duration-700 ${
                state === "speaking"
                  ? "scale-125 border-amber-400/40 animate-ping opacity-60"
                  : state === "listening"
                  ? "scale-110 border-emerald-500/40 animate-pulse"
                  : "scale-100 opacity-20"
              }`}
            />
            <div
              className={`absolute h-36 w-36 rounded-full border-2 border-dashed border-primary/40 ${
                state !== "idle" ? "animate-spin" : ""
              }`}
              style={{ animationDuration: "14s" }}
            />

            {/* Core Orb */}
            <div
              className={`relative h-24 w-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
                state === "speaking"
                  ? "bg-gradient-to-tr from-amber-500 via-rose-500 to-primary shadow-amber-500/40 scale-105"
                  : state === "listening"
                  ? "bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 shadow-emerald-500/40 scale-105"
                  : state === "processing"
                  ? "bg-gradient-to-tr from-indigo-600 to-purple-700 shadow-indigo-500/30 scale-95"
                  : "bg-slate-800"
              }`}
            >
              {state === "processing" ? (
                <Loader2 className="h-10 w-10 text-white animate-spin" />
              ) : state === "speaking" ? (
                <Volume2 className="h-10 w-10 text-white animate-bounce" />
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
                  state === "speaking"
                    ? "bg-gradient-to-t from-amber-400 to-rose-300 shadow-xs shadow-amber-400/50"
                    : state === "listening"
                    ? "bg-gradient-to-t from-emerald-400 to-teal-200 shadow-xs shadow-emerald-400/50"
                    : "bg-white/20"
                }`}
              />
            ))}
          </div>

          {/* Real-time Subtitle & Transcription Bubble */}
          <div className="text-center max-w-sm space-y-2 z-10 min-h-[64px] px-2">
            <Badge
              variant="outline"
              className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 ${
                state === "speaking"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                  : state === "listening"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : state === "processing"
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                  : "bg-white/10 text-slate-300 border-white/20"
              }`}
            >
              {statusLabel}
            </Badge>

            {userTranscript && (
              <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md">
                <p className="text-xs font-semibold text-emerald-300 leading-snug">
                  You: "{userTranscript}"
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  (Intelligent VAD active: pause speaking to submit automatically)
                </p>
              </div>
            )}

            {aiResponse && !userTranscript && (
              <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                <p className="text-xs text-slate-200 font-medium line-clamp-3 leading-relaxed">
                  Kore: "{aiResponse}"
                </p>
              </div>
            )}

            {!userTranscript && !aiResponse && (
              <p className="text-xs text-slate-400">
                Speak instructions to the AI Boss. The agent will listen in real-time, detect when you pause, and reply with Google Kore voice.
              </p>
            )}
          </div>
        </div>

        {/* Quick Voice Suggestions Carousel */}
        <div className="px-4 py-2 border-t border-white/10 bg-slate-950/60 overflow-x-auto no-scrollbar flex items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 shrink-0 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-400" /> Try Speaking:
          </span>
          {VOICE_SAMPLE_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickPrompt(p)}
              className="text-[11px] font-medium text-slate-300 bg-white/5 hover:bg-primary/20 hover:text-white px-2.5 py-1 rounded-lg border border-white/10 transition-all shrink-0 whitespace-nowrap"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Action Controls Bar */}
        <div className="p-4 border-t border-white/10 bg-slate-900/90 backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={continuousMode ? "default" : "outline"}
              size="sm"
              onClick={toggleContinuous}
              className={`rounded-xl text-xs font-bold gap-1.5 h-10 ${
                continuousMode
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "border-white/20 text-slate-300"
              }`}
              title="Toggle Hands-Free Continuous Conversation Loop"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>{continuousMode ? "Hands-Free Loop ON" : "Single Turn"}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleInterrupt}
              className="h-10 rounded-xl border-white/20 text-white hover:bg-white/10 text-xs font-bold gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Interrupt / Talk Now</span>
            </Button>
          </div>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/30 text-xs font-extrabold gap-1.5"
          >
            <X className="h-4 w-4" />
            <span>End Call</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
