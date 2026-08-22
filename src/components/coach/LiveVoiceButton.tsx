import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  conversationId: string | null;
  businessContext: any;
  onUserText: (t: string) => void;
  onAssistantText: (t: string, conversationId?: string) => void;
};

/**
 * Live Voice mode for the AI Business Coach.
 * Uses the browser Web Speech API for speech-to-text and the browser's
 * built-in speech synthesis for playback (free, instant, no paid API).
 */
export default function LiveVoiceButton({ conversationId, businessContext, onUserText, onAssistantText }: Props) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const recRef = useRef<any>(null);
  const convIdRef = useRef<string | null>(conversationId);
  const activeRef = useRef(false);

  useEffect(() => { convIdRef.current = conversationId; }, [conversationId]);

  const SR: any = typeof window !== "undefined" ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;

  const speak = (text: string): Promise<void> => {
    setStatus("speaking");
    return new Promise((resolve) => {
      try {
        window.speechSynthesis?.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
      } catch { resolve(); }
    });
  };

  const startListening = () => {
    if (!activeRef.current) return;
    if (!SR) { toast.error("Voice input not supported in this browser"); stop(); return; }
    setStatus("listening");
    const rec = new SR();
    recRef.current = rec;
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    let got = false;
    rec.onresult = async (e: any) => {
      got = true;
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join(" ").trim();
      if (!transcript) { if (activeRef.current) startListening(); return; }
      onUserText(transcript);
      setStatus("thinking");
      try {
        const { data, error } = await supabase.functions.invoke("business-coach", {
          body: { conversationId: convIdRef.current, message: transcript, businessContext },
        });
        if (error || data?.error) throw new Error(data?.error || error?.message);
        const reply = String(data.reply || "");
        if (data.conversationId) convIdRef.current = data.conversationId;
        onAssistantText(reply, data.conversationId);
        await speak(reply);
      } catch (err: any) {
        toast.error(err.message || "Coach error");
      }
      if (activeRef.current) startListening();
    };
    rec.onerror = () => { if (activeRef.current && !got) setTimeout(() => activeRef.current && startListening(), 300); };
    rec.onend = () => { if (activeRef.current && !got && status === "listening") setTimeout(() => activeRef.current && startListening(), 200); };
    try { rec.start(); } catch {}
  };

  const start = () => {
    activeRef.current = true;
    setActive(true);
    toast.success("Live voice on — speak naturally");
    startListening();
  };

  const stop = () => {
    activeRef.current = false;
    setActive(false);
    setStatus("idle");
    try { recRef.current?.stop(); } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
  };

  useEffect(() => () => stop(), []);

  const label =
    status === "listening" ? "Listening…" :
    status === "thinking" ? "Thinking…" :
    status === "speaking" ? "Speaking…" : "Live Voice";

  return (
    <Button
      type="button"
      onClick={active ? stop : start}
      variant={active ? "destructive" : "secondary"}
      size="sm"
      className="gap-1.5"
      title="Hands-free live voice conversation"
    >
      {status === "thinking" || status === "speaking"
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : active ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
