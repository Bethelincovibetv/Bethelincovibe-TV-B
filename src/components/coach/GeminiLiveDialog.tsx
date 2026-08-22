/**
 * Live Coach — hands-free voice conversation using ONLY the browser's built-in
 * SpeechRecognition + SpeechSynthesis APIs (free, no paid Google/Gemini voice).
 * Text replies come from the existing business-coach edge function.
 */
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, X, Loader2, Radio, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function GeminiLiveDialog({
  open,
  onOpenChange,
  systemPrompt,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  systemPrompt?: string;
}) {
  const [status, setStatus] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");

  const recRef = useRef<any>(null);
  const activeRef = useRef(false);
  const mutedRef = useRef(false);
  const convIdRef = useRef<string | null>(null);

  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const SR: any = typeof window !== "undefined"
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    : null;

  useEffect(() => {
    if (open) start();
    else stop();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function start() {
    if (!SR) { toast.error("Voice input not supported in this browser"); onOpenChange(false); return; }
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Voice playback not supported"); onOpenChange(false); return;
    }
    activeRef.current = true;
    listen();
  }

  function stop() {
    activeRef.current = false;
    try { recRef.current?.stop(); } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
    setStatus("idle");
  }

  function speak(text: string): Promise<void> {
    setStatus("speaking");
    return new Promise((resolve) => {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
      } catch { resolve(); }
    });
  }

  function listen() {
    if (!activeRef.current) return;
    setStatus("listening");
    const rec = new SR();
    recRef.current = rec;
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    let got = false;
    rec.onresult = async (e: any) => {
      got = true;
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join(" ").trim();
      if (!t || mutedRef.current) { if (activeRef.current) listen(); return; }
      setTranscript(t);
      setStatus("thinking");
      try {
        const { data, error } = await supabase.functions.invoke("business-coach", {
          body: { conversationId: convIdRef.current, message: t, businessContext: {}, systemPrompt },
        });
        if (error || data?.error) throw new Error(data?.error || error?.message);
        if (data.conversationId) convIdRef.current = data.conversationId;
        const r = String(data.reply || "");
        setReply(r);
        await speak(r);
      } catch (err: any) {
        toast.error(err.message || "Coach error");
      }
      if (activeRef.current) listen();
    };
    rec.onerror = () => { if (activeRef.current && !got) setTimeout(() => activeRef.current && listen(), 300); };
    rec.onend = () => { if (activeRef.current && !got) setTimeout(() => activeRef.current && listen(), 200); };
    try { rec.start(); } catch {}
  }

  const label =
    status === "listening" ? "Listening…" :
    status === "thinking" ? "Thinking…" :
    status === "speaking" ? "Speaking…" : "Idle";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
        <DialogHeader className="px-4 py-3 border-b bg-gradient-to-r from-primary to-accent text-primary-foreground">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Radio className={`h-4 w-4 ${status !== "idle" ? "animate-pulse" : ""}`} />
            Live Coach · {label}
          </DialogTitle>
        </DialogHeader>

        <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 via-background to-accent/10 flex flex-col items-center justify-center p-6 gap-4">
          <div className={`h-24 w-24 rounded-full flex items-center justify-center transition-all ${
            status === "listening" ? "bg-primary/20 animate-pulse" :
            status === "speaking" ? "bg-accent/30 animate-pulse" :
            status === "thinking" ? "bg-muted" : "bg-muted"
          }`}>
            {status === "thinking" ? <Loader2 className="h-10 w-10 animate-spin text-primary" /> :
             status === "speaking" ? <Volume2 className="h-10 w-10 text-accent" /> :
             muted ? <MicOff className="h-10 w-10 text-muted-foreground" /> :
             <Mic className="h-10 w-10 text-primary" />}
          </div>
          {transcript && <p className="text-xs text-muted-foreground text-center line-clamp-2">You: {transcript}</p>}
          {reply && <p className="text-xs text-center line-clamp-3">{reply}</p>}
          {!transcript && !reply && <p className="text-xs text-muted-foreground text-center">Speak naturally — the coach is listening.</p>}
        </div>

        <div className="flex items-center justify-center gap-3 p-4 bg-card">
          <Button
            type="button" variant={muted ? "secondary" : "default"} size="icon"
            className="h-12 w-12 rounded-full" onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Button
            type="button" variant="destructive" size="icon"
            className="h-12 w-12 rounded-full" onClick={() => onOpenChange(false)}
            aria-label="End call"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
