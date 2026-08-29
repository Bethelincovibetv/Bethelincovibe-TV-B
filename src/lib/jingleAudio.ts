import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const JINGLE_STORAGE_KEY = "jingle.prefs.v2";

export interface JinglePreferences {
  muted: boolean;
  volume: number; // 0.0 to 1.0 (relative to allowed ceiling)
  autoplay: boolean;
}

export const DEFAULT_JINGLE_PREFS: JinglePreferences = {
  muted: true, // Default muted to prevent abrupt noise and guarantee zero flash
  volume: 0.3,
  autoplay: false,
};

export function getSavedJinglePrefs(): JinglePreferences {
  try {
    const raw = localStorage.getItem(JINGLE_STORAGE_KEY);
    if (!raw) return DEFAULT_JINGLE_PREFS;
    const parsed = JSON.parse(raw);
    return {
      muted: typeof parsed.muted === "boolean" ? parsed.muted : DEFAULT_JINGLE_PREFS.muted,
      volume: typeof parsed.volume === "number" && !isNaN(parsed.volume) ? Math.max(0, Math.min(1, parsed.volume)) : DEFAULT_JINGLE_PREFS.volume,
      autoplay: typeof parsed.autoplay === "boolean" ? parsed.autoplay : DEFAULT_JINGLE_PREFS.autoplay,
    };
  } catch {
    return DEFAULT_JINGLE_PREFS;
  }
}

export function saveJinglePrefs(prefs: Partial<JinglePreferences>): JinglePreferences {
  const current = getSavedJinglePrefs();
  const next: JinglePreferences = {
    ...current,
    ...prefs,
  };
  try {
    localStorage.setItem(JINGLE_STORAGE_KEY, JSON.stringify(next));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("jingle-pref-change", { detail: next }));
    }
  } catch (err) {
    console.warn("Failed to persist jingle preferences:", err);
  }
  return next;
}

export function useJinglePreferences() {
  const [prefs, setPrefs] = useState<JinglePreferences>(getSavedJinglePrefs);

  useEffect(() => {
    const handleSync = (e?: any) => {
      if (e?.detail) {
        setPrefs(e.detail);
      } else {
        setPrefs(getSavedJinglePrefs());
      }
    };

    window.addEventListener("jingle-pref-change", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("jingle-pref-change", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const updatePrefs = useCallback((updates: Partial<JinglePreferences>) => {
    const next = saveJinglePrefs(updates);
    setPrefs(next);
    return next;
  }, []);

  return { prefs, updatePrefs };
}
