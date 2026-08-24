import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic, MicOff, X, Loader2, Volume2, RefreshCw,
  Lock, CheckCircle2, Send
} from "lucide-react";
import { GoogleLiveVoiceAgent, VoiceAgentState } from "@/lib/googleLiveVoiceEngine";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GeminiLiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemPrompt?: string;
}

const coachAvatarImg = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80";

export default function GeminiLiveDialog({
  open,
  onOpenChange,
  systemPrompt,
}: GeminiLiveDialogProps) {
  const [status, setStatus] = useState<VoiceAgentState>("idle");
  const [micPermission, setMicPermission] = useState<"granted" | "prompt" | "denied" | "requesting">("requesting");
  const [permissionError, setPermissionError] = useState<string>("");
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [waveHeights, setWaveHeights] = useState<number[]>([15, 30, 45, 60, 40, 25, 50, 35, 20, 40, 30, 15]);
  const [continuousMode, setContinuousMode] = useState(true);

  const agentRef = useRef<GoogleLiveVoiceAgent | null>(null);
  const convIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) {
      startCall();
    } else {
      endCall();
    }
    return () => endCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function startCall() {
    endCall();
    setMicPermission("requesting");
    setPermissionError("");

    const welcomeGreeting = "Hello! I am Coach Adaobi, your live business strategist. What are we planning today? Tell me your business goals or challenges!";

    const agent = new GoogleLiveVoiceAgent(
      {
        voiceName: "Kore", // Google Kore Voice
        silenceTimeoutMs: 2200, // 2.2s natural conversation pause detection
        continuous: continuousMode,
        lang: "en-US",
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
        onAudioLevels: (levels) => setWaveHeights(levels),
        onError: (err) => {
          if (err.includes("Microphone") || err.includes("permission") || err.includes("denied")) {
            setMicPermission("denied");
            setPermissionError(err);
          } else {
            console.warn("Coach voice status:", err);
          }
        },
        onUserFinishedSpeaking: async (userQuery) => {
          if (!userQuery || userQuery.trim().length < 2) return;
          if (muted) return;

          try {
            const coachPrompt = `${systemPrompt || ""}
You are Coach Adaobi, an elite, energetic, and highly articulate Nigerian business strategist and growth advisor.
Speak with high energy, Nigerian commercial sharpness, and practical insights. Keep responses conversational and punchy (2-4 sentences max per spoken turn) so the live voice conversation feels natural, engaging, and fast. Refer to Naira (₦) and market opportunities where appropriate.`;

            const { data, error } = await supabase.functions.invoke("business-coach", {
              body: {
                conversationId: convIdRef.current,
                message: userQuery,
                businessContext: {},
                systemPrompt: coachPrompt,
              },
            });

            if (error || data?.error) throw new Error(data?.error || error?.message);
            if (data.conversationId) convIdRef.current = data.conversationId;

            const responseText = String(data.reply || "").replace(/[*_#`~]/g, "");
            setReply(responseText);
            return responseText;
          } catch (err: any) {
            console.warn("Coach voice invoke fallback:", err);
            const errReply = "I understand what you're saying. Tell me more about your sales, margins, or marketing channels!";
            setReply(errReply);
            return errReply;
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
      toast.info("Coach Adaobi is listening to you now...");
    }
  };

  const handleSendSpokenNow = () => {
    if (agentRef.current && transcript.trim().length > 1) {
      agentRef.current.submitSpokenNow();
    }
  };

  const handleGrantMicClick = async () => {
    toast.info("Requesting microphone access from browser...");
    await startCall();
  };

  const statusLabel =
    micPermission === "denied"
      ? "Microphone Access Required"
      : micPermission === "requesting"
      ? "Requesting Microphone Permission…"
      : status === "listening"
      ? "Listening to your voice freely…"
      : status === "processing"
      ? "User paused — Coach Adaobi formulating strategy…"
      : status === "speaking"
      ? "Coach Adaobi speaking (Google Kore Voice)…"
      : "Ready to speak";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img
                src={coachAvatarImg}
                alt="Coach Adaobi"
                className="h-10 w-10 rounded-2xl object-cover ring-2 ring-primary shadow-md"
              />
              {micPermission === "granted" && (
                <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-sm font-black text-white leading-none">
                  Coach Adaobi Live Call
                </DialogTitle>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px] font-extrabold px-1.5 py-0">
                  GOOGLE KORE VOICE
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[11px] text-slate-400 font-medium">
                  Real-Time Voice Agent · Intelligent VAD
                </p>
                {micPermission === "granted" ? (
                  <Badge
                    variant="outline"
                    className="h-4 text-[9px] font-extrabold bg-emerald-500/10 text-emerald-300 border-emerald-500/30 gap-1 px-1.5"
                  >
                    <CheckCircle2 className="h-2.5 w-2.5" /> Mic Ready
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
                To talk freely with Coach Adaobi using Google Kore Voice, please allow microphone access in your browser.
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
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent pointer-events-none" />

            {/* Center Visualizer Radar */}
            <div className="relative flex items-center justify-center">
              {/* Pulsing outer rings */}
              <div
                className={`absolute h-40 w-40 rounded-full border border-primary/30 transition-all duration-700 ${
                  status === "speaking"
                    ? "scale-125 border-accent/40 animate-ping opacity-60"
                    : status === "listening"
                    ? "scale-110 border-emerald-500/40 animate-pulse"
                    : "scale-100 opacity-20"
                }`}
              />
              <div
                className={`absolute h-32 w-32 rounded-full border-2 border-dashed border-primary/40 ${
                  status !== "idle" ? "animate-spin" : ""
                }`}
                style={{ animationDuration: "12s" }}
              />

              {/* Core Avatar Circle */}
              <div
                className={`relative h-24 w-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
                  status === "speaking"
                    ? "bg-gradient-to-tr from-accent to-primary shadow-accent/50 scale-105"
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
                      ? "bg-gradient-to-t from-accent to-amber-300"
                      : status === "listening"
                      ? "bg-gradient-to-t from-emerald-500 to-teal-300"
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
                <div className="bg-slate-950/70 p-2 rounded-xl border border-white/10 space-y-1">
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
                  Coach Adaobi: "{reply}"
                </p>
              )}

              {!transcript && !reply && (
                <p className="text-xs text-slate-400">
                  Speak naturally. Coach Adaobi will listen in real-time and reply when you pause.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Controls Bar */}
        <div className="p-4 border-t border-white/10 bg-slate-900/80 backdrop-blur-md flex items-center justify-center gap-3">
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
