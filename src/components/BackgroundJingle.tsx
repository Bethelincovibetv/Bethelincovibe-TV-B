import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSavedJinglePrefs, JINGLE_STORAGE_KEY } from "@/lib/jingleAudio";

export default function BackgroundJingle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [jingle, setJingle] = useState<{ id: string; audio_url: string; title: string; volume: number } | null>(null);
  const [masterLimit, setMasterLimit] = useState<number>(0.5);
  const [adminAllowed, setAdminAllowed] = useState<boolean>(true);

  const [muted, setMuted] = useState<boolean>(() => getSavedJinglePrefs().muted);
  const [userVolume, setUserVolume] = useState<number>(() => getSavedJinglePrefs().volume);

  // Sync preference changes in real-time from User Settings
  useEffect(() => {
    const handleSync = (e?: any) => {
      const p = e?.detail || getSavedJinglePrefs();
      if (typeof p.muted === "boolean") setMuted(p.muted);
      if (typeof p.volume === "number") setUserVolume(p.volume);
    };

    window.addEventListener("jingle-pref-change", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("jingle-pref-change", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // Fetch active jingle, global admin master volume ceiling, and admin music permission
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

        // 2. Fetch master jingle volume ceiling and admin allow_background_music
        const { data: settingsData } = await supabase
          .from("site_settings")
          .select("key, value")
          .in("key", ["master_jingle_volume", "allow_background_music"]);

        if (settingsData && isMounted) {
          settingsData.forEach((s) => {
            if (s.key === "master_jingle_volume" && s.value) {
              const val = parseFloat(s.value);
              if (!isNaN(val)) setMasterLimit(val);
            }
            if (s.key === "allow_background_music") {
              setAdminAllowed(s.value !== "false");
            }
          });
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
  const effectiveVolume = Math.max(0, Math.min(userVolume * adminHardCeiling, adminHardCeiling));

  useEffect(() => {
    if (!audioRef.current) return;

    if (!adminAllowed || !jingle) {
      audioRef.current.pause();
      return;
    }

    audioRef.current.volume = effectiveVolume;
    audioRef.current.muted = muted;

    if (!muted && effectiveVolume > 0) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch(() => {
          // Autoplay blocked by browser policy until user interacts; handled safely
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [muted, userVolume, effectiveVolume, adminAllowed, jingle]);

  // If music is disallowed by admin or no active jingle track exists, render nothing
  if (!adminAllowed || !jingle) {
    return null;
  }

  // Silent, non-flashing background audio node without any floating buttons
  return (
    <audio
      ref={audioRef}
      src={jingle.audio_url}
      loop
      preload="metadata"
      muted={muted}
      style={{ display: "none" }}
    />
  );
}
