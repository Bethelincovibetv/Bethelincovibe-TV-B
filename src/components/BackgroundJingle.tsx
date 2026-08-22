import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Music } from "lucide-react";
import { Slider } from "@/components/ui/slider";

const STORAGE_KEY = "jingle.prefs.v1";

export default function BackgroundJingle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [jingle, setJingle] = useState<{ id: string; audio_url: string; title: string; volume: number } | null>(null);
  const [muted, setMuted] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").muted ?? true; } catch { return true; }
  });
  const [volume, setVolume] = useState<number>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").volume ?? 0.3; } catch { return 0.3; }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_jingles")
        .select("id, audio_url, title, volume")
        .eq("active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setJingle(data as any);
    })();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ muted, volume }));
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
      if (!muted) audioRef.current.play().catch(() => {});
    }
  }, [muted, volume]);

  if (!jingle) return null;

  return (
    <>
      <audio ref={audioRef} src={jingle.audio_url} loop autoPlay muted={muted} />
      <div className="fixed bottom-20 md:bottom-4 right-3 z-40">
        {open && (
          <div className="mb-2 bg-background border rounded-lg shadow-lg p-3 w-56">
            <p className="text-xs font-medium mb-2 truncate">🎵 {jingle.title}</p>
            <Slider min={0} max={1} step={0.05} value={[volume]} onValueChange={(v) => { setVolume(v[0]); if (muted) setMuted(false); }} />
          </div>
        )}
        <div className="flex gap-1">
          <Button size="icon" variant="secondary" className="rounded-full shadow-lg h-10 w-10" onClick={() => setOpen((o) => !o)}>
            <Music className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="secondary" className="rounded-full shadow-lg h-10 w-10" onClick={() => setMuted((m) => !m)}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </>
  );
}
