/**
 * Non-disruptive, pleasant Web Audio API notification chimes and custom audio playback.
 * Supports rich synthesized melodic jingles + custom uploaded audio sound files.
 */
import { supabase } from "@/integrations/supabase/client";

let audioCtx: AudioContext | null = null;
let lastPlayedAt = 0;

export type NotificationSoundPreset =
  | "bethel_vibe"
  | "crystal_ding"
  | "cash_register"
  | "soft_bell"
  | "futuristic_pop";

export const NOTIFICATION_SOUND_PRESETS: Array<{ id: NotificationSoundPreset; name: string; description: string }> = [
  { id: "bethel_vibe", name: "Bethel Vibe Jingle", description: "Upbeat 4-note melodic chime with harmonic sparkle" },
  { id: "crystal_ding", name: "Crystal Ding", description: "Bright crystal-clear high chime with soft resonance" },
  { id: "cash_register", name: "Cash Register Jingle", description: "Ascending revenue celebration chords" },
  { id: "soft_bell", name: "Soft Zen Bell", description: "Gentle, non-intrusive dual harmonic tone" },
  { id: "futuristic_pop", name: "Futuristic Pop", description: "Modern dynamic tech notification sound" },
];

export function isNotificationSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("bethel_notif_sound_enabled") !== "false";
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("bethel_notif_sound_enabled", enabled ? "true" : "false");
}

export function getCachedSoundPreference(): { preset: NotificationSoundPreset; customUrl: string } {
  if (typeof window === "undefined") return { preset: "bethel_vibe", customUrl: "" };
  const preset = (localStorage.getItem("bethel_notif_sound_preset") as NotificationSoundPreset) || "bethel_vibe";
  const customUrl = localStorage.getItem("bethel_notif_sound_url") || "";
  return { preset, customUrl };
}

export function setCachedSoundPreference(preset: NotificationSoundPreset, customUrl = ""): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("bethel_notif_sound_preset", preset);
  localStorage.setItem("bethel_notif_sound_url", customUrl);
}

/** Synthesizes specific melodic jingles using Web Audio API */
function synthesizeJingle(preset: NotificationSoundPreset = "bethel_vibe") {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;

  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  const ctx = audioCtx;
  const now = ctx.currentTime;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.15, now);
  masterGain.connect(ctx.destination);

  if (preset === "bethel_vibe") {
    // Upbeat 4-note melodic jingle: C5 -> E5 -> G5 -> C6 with warm harmonics
    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.18, type: "sine" as OscillatorType },
      { freq: 659.25, time: 0.10, dur: 0.20, type: "triangle" as OscillatorType },
      { freq: 783.99, time: 0.20, dur: 0.22, type: "sine" as OscillatorType },
      { freq: 1046.50, time: 0.32, dur: 0.45, type: "sine" as OscillatorType },
    ];
    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = n.type;
      osc.frequency.setValueAtTime(n.freq, now + n.time);
      g.gain.setValueAtTime(0.001, now + n.time);
      g.gain.exponentialRampToValueAtTime(0.7, now + n.time + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + n.time + n.dur);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now + n.time);
      osc.stop(now + n.time + n.dur + 0.05);
    });
  } else if (preset === "cash_register") {
    // "Ka-ching" style fast double-tone + bright chime
    const notes = [
      { freq: 987.77, time: 0.00, dur: 0.12, type: "triangle" as OscillatorType },
      { freq: 1318.51, time: 0.08, dur: 0.35, type: "sine" as OscillatorType },
      { freq: 2093.00, time: 0.12, dur: 0.40, type: "sine" as OscillatorType },
    ];
    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = n.type;
      osc.frequency.setValueAtTime(n.freq, now + n.time);
      g.gain.setValueAtTime(0.001, now + n.time);
      g.gain.exponentialRampToValueAtTime(0.8, now + n.time + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + n.time + n.dur);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now + n.time);
      osc.stop(now + n.time + n.dur + 0.05);
    });
  } else if (preset === "crystal_ding") {
    // Crystal shimmer high frequency chime
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g1 = ctx.createGain();
    const g2 = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1760, now); // A6
    g1.gain.setValueAtTime(0.001, now);
    g1.gain.exponentialRampToValueAtTime(0.6, now + 0.02);
    g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(2637, now); // E7
    g2.gain.setValueAtTime(0.001, now);
    g2.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    osc1.connect(g1);
    osc2.connect(g2);
    g1.connect(masterGain);
    g2.connect(masterGain);

    osc1.start(now);
    osc1.stop(now + 0.65);
    osc2.start(now);
    osc2.stop(now + 0.55);
  } else if (preset === "futuristic_pop") {
    // Modern bubbly ascending sweep
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6
    g.gain.setValueAtTime(0.001, now);
    g.gain.exponentialRampToValueAtTime(0.8, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.4);
  } else {
    // Soft Zen Bell (E5 -> B5 harmonic)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.7, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(masterGain);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(987.77, now + 0.08);
    gain2.gain.setValueAtTime(0.001, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.5, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(masterGain);

    osc1.start(now);
    osc1.stop(now + 0.38);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.5);
  }
}

/**
 * Preview a specific preset or custom sound URL immediately (e.g. for Admin testing)
 */
export function previewNotificationSound(presetOrUrl?: string) {
  if (typeof window === "undefined") return;

  if (presetOrUrl && presetOrUrl.startsWith("http")) {
    try {
      const audio = new Audio(presetOrUrl);
      audio.volume = 0.6;
      audio.play().catch(() => {
        // Fallback to synthesizer if audio element fails
        synthesizeJingle("bethel_vibe");
      });
      return;
    } catch {
      synthesizeJingle("bethel_vibe");
      return;
    }
  }

  const preset = (presetOrUrl as NotificationSoundPreset) || "bethel_vibe";
  synthesizeJingle(preset);
}

/**
 * Plays the currently active notification sound (either custom uploaded sound or synthesized jingle)
 */
export async function playNotificationSound(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!isNotificationSoundEnabled()) return;

  const now = Date.now();
  if (now - lastPlayedAt < 1200) return;
  lastPlayedAt = now;

  try {
    const { preset, customUrl } = getCachedSoundPreference();

    // Check if custom URL is configured
    if (customUrl && customUrl.startsWith("http")) {
      try {
        const audio = new Audio(customUrl);
        audio.volume = 0.55;
        const playPromise = audio.play();
        if (playPromise) {
          playPromise.catch(() => {
            synthesizeJingle(preset);
          });
        }
        return;
      } catch {
        synthesizeJingle(preset);
        return;
      }
    }

    synthesizeJingle(preset);
  } catch (err) {
    console.debug("Notification sound play skipped:", err);
  }
}

/**
 * Upload an audio file to the Supabase storage bucket for notification jingles
 */
export async function uploadNotificationAudio(file: File): Promise<{ url: string | null; error: string | null }> {
  try {
    const fileExt = file.name.split(".").pop() || "mp3";
    const fileName = `notification_jingle_${Date.now()}.${fileExt}`;
    const filePath = `sounds/${fileName}`;

    // Upload to site-assets or notification-sounds bucket
    const { error: uploadError } = await supabase.storage
      .from("site-assets")
      .upload(filePath, file, { cacheControl: "3600", upsert: true });

    if (uploadError) {
      // Try fallback bucket 'audio' or 'avatars' if site-assets is not ready
      const { error: fallbackError } = await supabase.storage
        .from("audio")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (fallbackError) {
        throw new Error(uploadError.message || fallbackError.message);
      }
      const { data: publicData } = supabase.storage.from("audio").getPublicUrl(filePath);
      return { url: publicData.publicUrl, error: null };
    }

    const { data: publicData } = supabase.storage.from("site-assets").getPublicUrl(filePath);
    return { url: publicData.publicUrl, error: null };
  } catch (err: any) {
    console.error("Audio upload error:", err);
    return { url: null, error: err.message || "Failed to upload audio" };
  }
}

