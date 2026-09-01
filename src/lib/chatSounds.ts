/**
 * WhatsApp Sound Effects Engine
 * Uses Web Audio API synthesis for zero-latency, cross-platform WhatsApp sound effects.
 */

class ChatSoundEngine {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("btv_chat_sound_enabled");
      if (saved !== null) {
        this.soundEnabled = saved === "true";
      }
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("btv_chat_sound_enabled", String(enabled));
    }
  }

  /**
   * Classic WhatsApp Message Sent "Pop" Tone
   */
  public playSentSound(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      // Quick cheerful pitch glide (800Hz -> 1300Hz)
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1350, now + 0.08);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Ignore audio synthesis errors gracefully
    }
  }

  /**
   * Alias for playSentSound
   */
  public playSend(): void {
    this.playSentSound();
  }

  /**
   * Alias for playSentSound
   */
  public playSent(): void {
    this.playSentSound();
  }

  /**
   * WhatsApp Message Received Tone (Double Pluck / Ding)
   */
  public playReceivedSound(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // First note (A5 - 880Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Second note (C#6 - 1108Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1108, now + 0.09);
      gain2.gain.setValueAtTime(0.25, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.28);
    } catch {
      // Ignore audio synthesis errors gracefully
    }
  }

  /**
   * Alias for playReceivedSound
   */
  public playReceive(): void {
    this.playReceivedSound();
  }

  /**
   * Alias for playReceivedSound
   */
  public playReceived(): void {
    this.playReceivedSound();
  }

  /**
   * Voice Note Start Recording Tone
   */
  public playRecordStartSound(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.linearRampToValueAtTime(780, now + 0.07);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  /**
   * Alias for playRecordStartSound
   */
  public playRecordStart(): void {
    this.playRecordStartSound();
  }

  /**
   * Voice Note Stop / Discard Tone
   */
  public playRecordStopSound(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(780, now);
      osc.frequency.linearRampToValueAtTime(440, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  /**
   * Alias for playRecordStopSound
   */
  public playRecordStop(): void {
    this.playRecordStopSound();
  }
}

export const chatSounds = new ChatSoundEngine();
