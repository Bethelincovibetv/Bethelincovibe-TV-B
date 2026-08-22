import { useState } from "react";
import { Volume2, Square } from "lucide-react";
import { toast } from "sonner";

/** Tap-to-listen using the browser's built-in speech synthesis (free, instant, no API cost). */
export default function ListenButton({ text, label = "Listen" }: { text: string; label?: string }) {
  const [playing, setPlaying] = useState(false);

  const stop = () => {
    try { window.speechSynthesis?.cancel(); } catch {}
    setPlaying(false);
  };

  const play = () => {
    if (playing) { stop(); return; }
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Voice playback not supported in this browser");
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1;
      u.pitch = 1;
      u.onend = () => setPlaying(false);
      u.onerror = () => setPlaying(false);
      window.speechSynthesis.speak(u);
      setPlaying(true);
    } catch {
      toast.error("Voice playback failed");
    }
  };

  return (
    <button
      type="button"
      onClick={play}
      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-2"
    >
      {playing ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
      {playing ? "Stop" : label}
    </button>
  );
}
