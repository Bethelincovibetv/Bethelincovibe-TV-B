import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Volume2, VolumeX, Copy, Check, Sparkles, TrendingUp, AlertTriangle,
  Lightbulb, ShieldCheck, CheckCircle2, Bot, Calendar
} from "lucide-react";
import { DailyBriefing, TaskPriority, generateExecutiveDailyBriefing } from "@/lib/executiveAdminAIEngine";
import { synthesizeGoogleVoice } from "@/lib/googleLiveVoiceEngine";
import { toast } from "sonner";

interface DailyBriefingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  briefing?: DailyBriefing;
  onDispatchTask?: (taskProposal: any) => void;
}

export default function DailyBriefingModal({
  open,
  onOpenChange,
  briefing,
  onDispatchTask,
}: DailyBriefingModalProps) {
  const currentBriefing = briefing || generateExecutiveDailyBriefing();
  const [playingAudio, setPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const stopAudio = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch {}
      audioSourceRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setPlayingAudio(false);
  };

  const handlePlayVoice = async () => {
    if (playingAudio) {
      stopAudio();
      return;
    }

    try {
      setPlayingAudio(true);
      const textToSpeak = currentBriefing.speechSummary || currentBriefing.statusHeadline;
      const wav = await synthesizeGoogleVoice(textToSpeak, "Kore");

      if (wav) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
          audioCtxRef.current = new AudioContextClass({ sampleRate: 24000 });
        }
        if (audioCtxRef.current.state === "suspended") {
          await audioCtxRef.current.resume();
        }

        const decoded = await audioCtxRef.current.decodeAudioData(wav.slice(0));
        const source = audioCtxRef.current.createBufferSource();
        source.buffer = decoded;
        source.connect(audioCtxRef.current.destination);
        source.onended = () => {
          setPlayingAudio(false);
          audioSourceRef.current = null;
        };
        audioSourceRef.current = source;
        source.start(0);
      } else if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(textToSpeak);
        u.pitch = 1.1;
        u.rate = 1.0;
        u.onend = () => setPlayingAudio(false);
        u.onerror = () => setPlayingAudio(false);
        window.speechSynthesis.speak(u);
      } else {
        setPlayingAudio(false);
      }
    } catch (e: any) {
      console.warn("Audio playback fallback:", e);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(currentBriefing.speechSummary);
        u.onend = () => setPlayingAudio(false);
        u.onerror = () => setPlayingAudio(false);
        window.speechSynthesis.speak(u);
      } else {
        setPlayingAudio(false);
      }
    }
  };

  const handleCopy = () => {
    const text = `=== BETHELINCOVIBE TV EXECUTIVE DAILY BRIEFING ===
Date: ${currentBriefing.date}
Health Score: ${currentBriefing.platformHealthScore}% (${currentBriefing.statusHeadline})

TOP METRICS:
${(currentBriefing.topPerformanceMetrics || []).map((m) => `• ${m.label}: ${m.value} (${m.change})`).join("\n")}

TOP PROBLEMS:
${(currentBriefing.topProblems || []).map((p) => `• [${p.priority}] ${p.title} - ${p.action} (Assigned: ${p.agent})`).join("\n")}

TOP OPPORTUNITIES:
${(currentBriefing.topOpportunities || []).map((o) => `• ${o.title}: ${o.potential} (${o.agent})`).join("\n")}

AGENT STATUS:
• Online: ${currentBriefing.agentStatusSummary?.online || 0} | Active Tasks: ${currentBriefing.agentStatusSummary?.activeTasks || 0} | Completed: ${currentBriefing.agentStatusSummary?.completedToday || 0}

REVENUE & COMMERCE:
${currentBriefing.revenueCommerceStatus}

SECURITY:
${currentBriefing.securityStatus}
=================================================`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Executive Daily Briefing copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case "P0":
        return <Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30 text-[9px] font-black">P0</Badge>;
      case "P1":
        return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[9px] font-black">P1</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[9px] font-bold">P2</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) stopAudio(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
        <DialogHeader className="border-b pb-3 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
                  Executive AI Daily Briefing
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                  <Calendar className="h-3 w-3" /> {currentBriefing.date}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant={playingAudio ? "default" : "outline"}
                size="sm"
                onClick={handlePlayVoice}
                className="h-8 px-2.5 rounded-xl text-xs font-bold gap-1"
              >
                {playingAudio ? <VolumeX className="h-3.5 w-3.5 text-white animate-pulse" /> : <Volume2 className="h-3.5 w-3.5 text-primary" />}
                <span>{playingAudio ? "Stop Audio" : "Play (Kore)"}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-8 px-2.5 rounded-xl text-xs font-bold gap-1"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>Copy</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1 text-xs">
          {/* Health Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/30 via-indigo-900/30 to-blue-900/30 border border-purple-500/20 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400">
                Platform Status Assessment
              </p>
              <p className="text-sm font-black text-foreground">{currentBriefing.statusHeadline}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-emerald-500">{currentBriefing.platformHealthScore}%</p>
              <p className="text-[10px] text-muted-foreground font-bold">Health Score</p>
            </div>
          </div>

          {/* Top Performance Metrics */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" /> Key Performance Telemetry
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(currentBriefing.topPerformanceMetrics || []).map((m, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-card border text-center space-y-0.5">
                  <p className="text-[10px] font-bold text-muted-foreground">{m.label}</p>
                  <p className="text-base font-black text-foreground">{m.value}</p>
                  <p className={`text-[9px] font-bold ${m.tone}`}>{m.change}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top Problems & Top Opportunities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Problems */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" /> High Priority Items
              </h4>
              <div className="space-y-1.5">
                {(currentBriefing.topProblems || []).length === 0 ? (
                  <p className="text-[11px] text-muted-foreground p-2 rounded-xl bg-muted/30">
                    Zero critical issues detected.
                  </p>
                ) : (
                  (currentBriefing.topProblems || []).map((p, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        {getPriorityBadge(p.priority)}
                        <p className="font-black text-foreground truncate">{p.title}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{p.action}</p>
                      <p className="text-[9px] font-bold text-primary">Assigned: {p.agent}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Opportunities */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                <Lightbulb className="h-3.5 w-3.5" /> Top Growth Opportunities
              </h4>
              <div className="space-y-1.5">
                {(currentBriefing.topOpportunities || []).map((o, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-0.5">
                    <p className="font-black text-foreground">{o.title}</p>
                    <p className="text-[11px] text-muted-foreground">{o.potential}</p>
                    <p className="text-[9px] font-bold text-primary">Agent: {o.agent}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Revenue & Security Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-2.5 rounded-xl bg-muted/40 border space-y-0.5">
              <p className="text-[10px] font-extrabold uppercase text-muted-foreground">Monetization & Commerce</p>
              <p className="text-[11px] font-medium text-foreground/90 leading-relaxed">
                {currentBriefing.revenueCommerceStatus}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/40 border space-y-0.5">
              <p className="text-[10px] font-extrabold uppercase text-muted-foreground">Security & Integrity</p>
              <p className="text-[11px] font-medium text-foreground/90 leading-relaxed">
                {currentBriefing.securityStatus}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
