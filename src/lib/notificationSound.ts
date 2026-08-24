/**
 * Non-disruptive, pleasant Web Audio API notification chime.
 * Generates a smooth, gentle dual-tone harmonic chime (E5 -> B5) with exponential decay.
 * Zero external audio assets needed, immune to 404s, user-controllable.
 */

let audioCtx: AudioContext | null = null;
let lastPlayedAt = 0;

export function isNotificationSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("bethel_notif_sound_enabled") !== "false";
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("bethel_notif_sound_enabled", enabled ? "true" : "false");
}

export function playNotificationSound(): void {
  if (typeof window === "undefined") return;
  if (!isNotificationSoundEnabled()) return;

  const now = Date.now();
  // Throttle to avoid repeated noisy blasts (max 1 sound per 1.5 seconds)
  if (now - lastPlayedAt < 1500) return;
  lastPlayedAt = now;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }

    const ctx = audioCtx;
    const startTime = ctx.currentTime;

    // Master volume gain - very gentle (0.15 max)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.12, startTime);
    masterGain.connect(ctx.destination);

    // Tone 1: Gentle primary note (E5 = ~659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, startTime);
    gain1.gain.setValueAtTime(0.001, startTime);
    gain1.gain.exponentialRampToValueAtTime(0.8, startTime + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);
    osc1.connect(gain1);
    gain1.connect(masterGain);

    // Tone 2: Harmonic complement (B5 = ~987.77 Hz), starts slightly after
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(987.77, startTime + 0.08);
    gain2.gain.setValueAtTime(0.001, startTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.6, startTime + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.38);
    osc2.connect(gain2);
    gain2.connect(masterGain);

    osc1.start(startTime);
    osc1.stop(startTime + 0.3);

    osc2.start(startTime + 0.08);
    osc2.stop(startTime + 0.4);
  } catch (err) {
    // AudioContext autoplay restriction or silent failure
    console.debug("Notification sound skipped:", err);
  }
}
