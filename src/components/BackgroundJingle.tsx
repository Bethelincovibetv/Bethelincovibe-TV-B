import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Music, Sliders } from "lucide-react";
import { Slider } from "@/components/ui/slider";

const STORAGE_KEY = "jingle.prefs.v2";

export default function BackgroundJingle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [jingle, setJingle] = useState<{ id: string; audio_url: string; title: string; volume: number } | null>(null);
  const [masterLimit, setMasterLimit] = useState<number>(0.5);

  const [muted, setMuted] = useState<boolean>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return saved.muted ?? true;
    } catch {
      return true;
    }
  });

  const [userVolume, setUserVolume] = useState<number>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return typeof saved.volume === "number" ? saved.volume : 0.3;
    } catch {
      return 0.3;
    }
  });

  const [open, setOpen] = useState(false);

  // Fetch active jingle and admin master volume ceiling
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // 1. Fetch active jingle
        const { data: jingleData } = await supabase
          .from("site_jingles")
          .select("id, audio_url, title, volume")
          .eq("active", true)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (jingleData && isMounted) {
          setJingle(jingleData as any);
        }

        // 2. Fetch master jingle volume ceiling
        const { data: settingData } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "master_jingle_volume")
          .maybeSingle();

        if (settingData?.value && isMounted) {
          const val = parseFloat(settingData.value);
          if (!isNaN(val)) setMasterLimit(val);
        }
      } catch (err) {
        console.warn("Could not load background jingle:", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute effective playback volume bounded by admin volume limits
  const jingleMaxVol = jingle?.volume ?? 0.3;
  const adminHardCeiling = Math.min(jingleMaxVol, masterLimit);
  // User volume represents 0% to 100% of the allowed ceiling
  const effectiveVolume = Math.max(0, Math.min(userVolume * adminHardCeiling, adminHardCeiling));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ muted, volume: userVolume }));
    if (audioRef.current) {
      audioRef.current.volume = effectiveVolume;
      audioRef.current.muted = muted;
      if (!muted && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [muted, userVolume, effectiveVolume]);

  if (!jingle) return null;

  return (
    <>
      <audio ref={audioRef} src={jingle.audio_url} loop autoPlay muted={muted} />
      <div className="fixed bottom-20 md:bottom-4 right-3 z-40">
        {open && (
          <div className="mb-2 bg-card/95 backdrop-blur border border-border/80 rounded-2xl shadow-xl p-3.5 w-64 animate-scale-in">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-bold truncate text-foreground flex items-center gap-1.5">
                <Music className="h-3.5 w-3.5 text-primary" />
                {jingle.title}
              </p>
              <span className="text-[10px] font-black font-mono text-muted-foreground">
                {Math.round(userVolume * 100)}%
              </span>
            </div>

            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[userVolume]}
              onValueChange={(v) => {
                setUserVolume(v[0]);
                if (muted) setMuted(false);
              }}
              className="my-2"
            />

            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
              <span>Max Cap: {Math.round(adminHardCeiling * 100)}%</span>
              <button
                onClick={() => setMuted((m) => !m)}
                className="font-bold text-primary hover:underline"
              >
                {muted ? "Unmute" : "Mute"}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur p-1 rounded-full border shadow-lg">
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full h-9 w-9 text-foreground hover:bg-muted"
            onClick={() => setOpen((o) => !o)}
            title="Music Settings"
          >
            <Music className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="default"
            className="rounded-full h-9 w-9 bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-sm"
            onClick={() => setMuted((m) => !m)}
            title={muted ? "Play Music" : "Mute Music"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </>
  );
}
