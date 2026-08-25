import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Mic, MicOff, X, Loader2, Volume2, Sparkles, RefreshCw,
  Radio, Zap, Lock, CheckCircle2, Send, MessageSquare, Bot, User, CornerDownLeft
} from "lucide-react";
import { VixoraLiveVoiceAgent, VoiceAgentState, VixoraVoiceName } from "@/lib/vixoraVoiceEngine";
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

interface ChatTurn {
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

export default function GoogleLiveVoiceAgentDialog({
  open,
  onOpenChange,
  onExecuteCommand,
  title = "Victoria AI Live Voice Executive",
  agentRole = "Victoria AI · Executive Director & Studio Lead",
}: GoogleLiveVoiceAgentDialogProps) {
  const [state, setState] = useState<VoiceAgentState>("idle");
  const [micPermission, setMicPermission] = useState<"granted" | "prompt" | "denied" | "requesting">("requesting");
  const [permissionError, setPermissionError] = useState<string>("");
  const [userTranscript, setUserTranscript] = useState("");
  const [manualText, setManualText] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<VixoraVoiceName>("Aoede");
  const [waveHeights, setWaveHeights] = useState<number[]>([12, 24, 36, 48, 30, 18, 42, 28, 15, 35, 25, 12]);
  const [continuousMode, setContinuousMode] = useState(true);
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);

  const agentRef = useRef<VixoraLiveVoiceAgent | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

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
  }, [open, selectedVoice]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatTurns, userTranscript, aiResponse]);

  const initAndStartAgent = async () => {
    stopAgent();
    setMicPermission("requesting");
    setPermissionError("");

    const welcomeGreeting = "Hello! Victoria AI Live Voice Agent is active. Speak naturally — I am listening in real-time and will reply once you finish speaking.";

    const agent = new VixoraLiveVoiceAgent(
      {
        voiceName: selectedVoice,
        silenceTimeoutMs: 1100, // Instant real-time response turnaround
        continuous: continuousMode,
        lang: "en-US",
      },
      {
        onStateChange: (newState) => {
          setState(newState);
          if (newState === "mic-denied") {
            setMicPermission("denied");
          }
        },
        onPermissionChange: (permStatus, message) => {
          setMicPermission(permStatus);
          if (message) setPermissionError(message);
        },
        onInterimTranscript: (transcript) => {
          setUserTranscript(transcript);
        },
        onFinalTranscript: (transcript) => {
          setUserTranscript(transcript);
        },
        onUserFinishedSpeaking: async (fullTranscript) => {
          if (!fullTranscript || fullTranscript.trim().length < 2) return;

          const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          setChatTurns((prev) => [...prev, { role: "user", text: fullTranscript, timestamp: timeStr }]);
          setUserTranscript("");

          try {
            const reply = await onExecuteCommand(fullTranscript);
            const cleanReply =
              typeof reply === "string" && reply.trim()
                ? reply
                : "Command received and processed successfully by the AI Administrator.";

            setAiResponse(cleanReply);
            setChatTurns((prev) => [
              ...prev,
              {
                role: "assistant",
                text: cleanReply,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ]);
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
          if (err.includes("Microphone") || err.includes("permission") || err.includes("denied")) {
            setMicPermission("denied");
            setPermissionError(err);
          } else {
            // Transient speech errors do not disrupt the session
            console.warn("Speech recognition warning:", err);
          }
        },
      }
    );

    agentRef.current = agent;
    const started = await agent.start(welcomeGreeting);

    if (started) {
      setMicPermission("granted");
      setAiResponse(welcomeGreeting);
    } else {
      setMicPermission("denied");
    }
  };

  const stopAgent = () => {
    if (agentRef.current) {
      agentRef.current.stop();
      agentRef.current = null;
    }
    setState("idle");
    setUserTranscript("");
  };

  const handleGrantMicClick = async () => {
    toast.info("Requesting microphone permission from browser...");
    await initAndStartAgent();
  };

  const toggleContinuous = () => {
    const next = !continuousMode;
    setContinuousMode(next);
    toast.info(next ? "Hands-free continuous conversation ON" : "Single-turn mode enabled");
  };

  const handleInterrupt = () => {
    if (agentRef.current) {
      agentRef.current.interrupt();
      toast.info("AI Interrupted. I am listening to you now...");
    }
  };

  const handleSendSpokenNow = () => {
    if (agentRef.current && userTranscript.trim().length > 1) {
      agentRef.current.submitSpokenNow();
    }
  };

  const handleSendManualText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualText.trim()) return;

    const query = manualText.trim();
    setManualText("");
    setUserTranscript(query);

    if (agentRef.current) {
      agentRef.current.interrupt();
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatTurns((prev) => [...prev, { role: "user", text: query, timestamp: timeStr }]);

    try {
      setState("processing");
      const reply = await onExecuteCommand(query);
      const cleanReply =
        typeof reply === "string" && reply.trim()
          ? reply
          : "Command received and processed successfully by the AI Administrator.";

      setAiResponse(cleanReply);
      setChatTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          text: cleanReply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      if (agentRef.current) {
        await agentRef.current.speak(cleanReply);
      }
    } catch (err: any) {
      const errReply = `Error: ${err?.message || "Failed to execute"}`;
      setAiResponse(errReply);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setManualText(prompt);
    setUserTranscript(prompt);
    if (agentRef.current) {
      agentRef.current.interrupt();
    }
    onExecuteCommand(prompt);
  };

  const statusLabel =
    micPermission === "denied"
      ? "Microphone Access Required"
      : micPermission === "requesting"
      ? "Connecting Microphone…"
      : state === "listening"
      ? "AI is listening to you freely…"
      : state === "processing"
      ? "User finished — AI reasoning & executing…"
      : state === "speaking"
      ? "Google Kore Voice speaking…"
      : "Ready — Speak anytime";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center h-10 w-10 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 shadow-md">
              <Radio className="h-5 w-5 text-white animate-pulse" />
              {micPermission === "granted" && (
                <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 animate-ping" />
              )}
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
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[11px] text-slate-400 font-medium">
                  {agentRole}
                </p>
                {micPermission === "granted" ? (
                  <Badge
                    variant="outline"
                    className="h-4 text-[9px] font-extrabold bg-emerald-500/10 text-emerald-300 border-emerald-500/30 gap-1 px-1.5"
                  >
                    <CheckCircle2 className="h-2.5 w-2.5" /> Mic Listening
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

          <Button
            size="icon"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Microphone Permission Prompt State */}
        {micPermission === "denied" ? (
          <div className="p-6 text-center space-y-4 bg-slate-950/80 my-2">
            <div className="mx-auto h-16 w-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20 animate-pulse">
              <MicOff className="h-8 w-8" />
            </div>

            <div className="space-y-1.5 max-w-sm mx-auto">
              <h3 className="text-base font-bold text-white">Microphone Access Required</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                To speak naturally and chat with Bethelincovibe AI, please allow microphone access in your browser.
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
                <span>Allow Microphone & Start</span>
              </Button>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-1">
              <Lock className="h-3 w-3 text-slate-500" />
              <span>Click the lock icon in your address bar if blocked</span>
            </div>
          </div>
        ) : (
          /* Main Live Voice & Chat Interaction Stage */
          <div className="flex flex-col">
            {/* 3D Audio Visualizer Radar Stage */}
            <div className="relative flex flex-col items-center justify-center py-4 px-6 gap-3 bg-gradient-to-b from-slate-900/60 to-transparent border-b border-white/5">
              {/* Ambient Glow */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent pointer-events-none" />

              {/* Central Pulsing Orb */}
              <div className="relative flex items-center justify-center">
                {/* Outer Waves */}
                <div
                  className={`absolute h-32 w-32 rounded-full border border-primary/30 transition-all duration-700 ${
                    state === "speaking"
                      ? "scale-125 border-amber-400/40 animate-ping opacity-60"
                      : state === "listening"
                      ? "scale-110 border-emerald-500/40 animate-pulse"
                      : "scale-100 opacity-20"
                  }`}
                />
                <div
                  className={`absolute h-28 w-28 rounded-full border-2 border-dashed border-primary/40 ${
                    state !== "idle" ? "animate-spin" : ""
                  }`}
                  style={{ animationDuration: "14s" }}
                />

                {/* Core Orb */}
                <div
                  className={`relative h-20 w-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
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
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  ) : state === "speaking" ? (
                    <Volume2 className="h-8 w-8 text-white animate-bounce" />
                  ) : (
                    <Mic className="h-8 w-8 text-white animate-pulse" />
                  )}
                </div>
              </div>

              {/* Equalizer Frequency Waves (Real-Time Mic Audio Meter) */}
              <div className="flex items-center justify-center gap-1.5 h-6 px-4">
                {waveHeights.map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${Math.max(6, Math.min(32, h * 0.6))}px` }}
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

              {/* Status Badge */}
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
            </div>

            {/* Live Conversation Chat Stream */}
            <div
              ref={chatScrollRef}
              className="h-52 overflow-y-auto p-4 space-y-3 bg-slate-950/50 text-xs"
            >
              {chatTurns.length === 0 && !userTranscript && (
                <div className="text-center py-6 text-slate-400 space-y-1">
                  <MessageSquare className="h-6 w-6 mx-auto text-slate-500 mb-2" />
                  <p className="font-medium text-slate-300">Speak freely to your AI Executive Director.</p>
                  <p className="text-[11px] text-slate-500">
                    Just talk naturally. The AI listens attentively and replies with Google Kore voice.
                  </p>
                </div>
              )}

              {chatTurns.map((turn, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 ${
                    turn.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {turn.role === "assistant" && (
                    <div className="h-6 w-6 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0 mt-0.5">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2 leading-relaxed ${
                      turn.role === "user"
                        ? "bg-gradient-to-r from-primary to-indigo-600 text-white rounded-br-xs"
                        : "bg-white/10 text-slate-200 border border-white/10 rounded-bl-xs"
                    }`}
                  >
                    <p className="font-medium">{turn.text}</p>
                    <span className="text-[9px] text-white/50 block text-right mt-1">
                      {turn.timestamp}
                    </span>
                  </div>
                  {turn.role === "user" && (
                    <div className="h-6 w-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {/* Active live speech recognition bubble */}
              {userTranscript && (
                <div className="flex gap-2.5 justify-end animate-pulse">
                  <div className="max-w-[82%] rounded-2xl px-3.5 py-2 bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 rounded-br-xs">
                    <p className="font-semibold italic">"{userTranscript}"</p>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[10px] text-emerald-400 font-medium">Listening... (Pause to send)</span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSendSpokenNow}
                        className="h-5 px-2 text-[10px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-md gap-1"
                      >
                        <Send className="h-2.5 w-2.5" /> Send Now
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Hybrid Text & Voice Input Field */}
            <form
              onSubmit={handleSendManualText}
              className="p-2.5 bg-slate-900/90 border-t border-white/10 flex items-center gap-2"
            >
              <Input
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Type instructions or keep speaking freely..."
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-10 rounded-xl text-xs"
              />
              <Button
                type="submit"
                disabled={!manualText.trim()}
                className="h-10 px-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold gap-1 shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Send</span>
              </Button>
            </form>
          </div>
        )}

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
              <span>{continuousMode ? "Continuous Voice ON" : "Single Turn"}</span>
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
