/**
 * Vixora Web Audio Sound Effects & Procedural Synthesizer
 * Generates rich, real-time sound effects and audio buffers in pure browser Web Audio API
 */

export class VixoraSfxSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // 1. Kinetic Whoosh
  playWhoosh(volume = 0.5) {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.35;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.15);
      filter.frequency.exponentialRampToValueAtTime(150, now + 0.35);
      filter.Q.setValueAtTime(3.0, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.36);
    } catch (e) {
      console.warn("SFX whoosh error:", e);
    }
  }

  // 2. Bubble Pop
  playPop(volume = 0.6) {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      console.warn("SFX pop error:", e);
    }
  }

  // 3. Sub Bass Impact
  playSubDrop(volume = 0.7) {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.6);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.75);
    } catch (e) {
      console.warn("SFX sub drop error:", e);
    }
  }

  // 4. Magic Sparkle
  playSparkle(volume = 0.5) {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const notes = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.001, now + idx * 0.05);
        gain.gain.linearRampToValueAtTime(volume * 0.4, now + idx * 0.05 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.26);
      });
    } catch (e) {
      console.warn("SFX sparkle error:", e);
    }
  }

  // 5. Camera Shutter
  playShutter(volume = 0.6) {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Click 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "square";
      osc1.frequency.setValueAtTime(800, now);
      osc1.frequency.exponentialRampToValueAtTime(100, now + 0.03);
      gain1.gain.setValueAtTime(volume, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.04);

      // Click 2 (mechanical rebound)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(600, now + 0.07);
      osc2.frequency.exponentialRampToValueAtTime(120, now + 0.12);
      gain2.gain.setValueAtTime(volume * 0.8, now + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.07);
      osc2.stop(now + 0.14);
    } catch (e) {
      console.warn("SFX shutter error:", e);
    }
  }

  // 6. Cash / Coin
  playCoin(volume = 0.5) {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    } catch (e) {
      console.warn("SFX coin error:", e);
    }
  }

  // Play by cue string
  playByCue(cue: string, volume = 0.5) {
    switch (cue) {
      case "whoosh":
        this.playWhoosh(volume);
        break;
      case "pop":
        this.playPop(volume);
        break;
      case "sub_drop":
        this.playSubDrop(volume);
        break;
      case "sparkle":
        this.playSparkle(volume);
        break;
      case "shutter":
        this.playShutter(volume);
        break;
      case "coin":
        this.playCoin(volume);
        break;
      default:
        break;
    }
  }

  // Synthesize Background Music Track into AudioBuffer
  async synthesizeBackgroundMusic(
    mood: "afrobeats" | "tech" | "energetic" | "cinematic" | "calm",
    durationSeconds = 30
  ): Promise<AudioBuffer> {
    const ctx = this.getContext();
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(2, sampleRate * durationSeconds, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const bpm = mood === "afrobeats" ? 118 : mood === "tech" ? 124 : mood === "calm" ? 85 : 128;
    const beatInterval = 60 / bpm;

    for (let i = 0; i < left.length; i++) {
      const time = i / sampleRate;
      const beatProgress = (time % beatInterval) / beatInterval;

      // Bass drum pulse
      const kick = Math.sin(time * 2 * Math.PI * (55 - beatProgress * 20)) * Math.exp(-beatProgress * 8);

      // Ambient chords
      let chord = 0;
      if (mood === "afrobeats") {
        chord = Math.sin(time * 2 * Math.PI * 220) * 0.15 + Math.sin(time * 2 * Math.PI * 277.18) * 0.12;
      } else if (mood === "tech") {
        chord = Math.sin(time * 2 * Math.PI * 174.61) * 0.15 + Math.sin(time * 2 * Math.PI * 261.63) * 0.12;
      } else if (mood === "calm") {
        chord = Math.sin(time * 2 * Math.PI * 196) * 0.15 + Math.sin(time * 2 * Math.PI * 246.94) * 0.1;
      } else {
        chord = Math.sin(time * 2 * Math.PI * 164.81) * 0.15 + Math.sin(time * 2 * Math.PI * 220) * 0.12;
      }

      // Shaker/hats
      const hat = (Math.random() * 2 - 1) * 0.03 * ((time * 4) % 1 < 0.1 ? 1 : 0.2);

      const mixed = (kick * 0.3 + chord * 0.2 + hat * 0.15) * 0.4;
      left[i] = mixed;
      right[i] = mixed * (0.95 + 0.05 * Math.sin(time * 3));
    }

    return buffer;
  }
}

export const sfx = new VixoraSfxSynthesizer();
