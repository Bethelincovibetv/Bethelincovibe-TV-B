import { GoogleGenAI, Modality } from "@google/genai";
import { supabase } from "@/integrations/supabase/client";
import { apiKeyService } from "@/vixora/services/apiKeyService";

export interface GoogleVoiceOptions {
  voiceName?: "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr";
  lang?: string;
  silenceTimeoutMs?: number; // Base time in ms after user pauses before auto-triggering response
  continuous?: boolean; // Hands-free continuous conversation loop
  pitch?: number;
  rate?: number;
}

export type VoiceAgentState = "idle" | "listening" | "processing" | "speaking" | "mic-denied" | "error";

export interface VoiceAgentCallbacks {
  onStateChange?: (state: VoiceAgentState) => void;
  onInterimTranscript?: (transcript: string) => void;
  onFinalTranscript?: (transcript: string) => void;
  onUserFinishedSpeaking?: (fullTranscript: string) => Promise<string | void> | string | void;
  onAIResponse?: (responseText: string) => void;
  onAudioLevels?: (levels: number[]) => void;
  onError?: (error: string) => void;
  onPermissionChange?: (status: "prompt" | "granted" | "denied", message?: string) => void;
}

/**
 * Explicitly request user microphone access via navigator.mediaDevices.getUserMedia
 * with echo cancellation, noise suppression, automatic gain control, and highpass/lowpass filtering
 */
export async function requestMicrophoneAccess(): Promise<{ granted: boolean; error?: string; stream?: MediaStream }> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      granted: false,
      error: "Microphone access is not supported in this browser. Please use Chrome, Edge, or Safari.",
    };
  }

  try {
    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: { ideal: true },
      noiseSuppression: { ideal: true },
      autoGainControl: { ideal: true },
      channelCount: { ideal: 1 },
      sampleRate: { ideal: 48000 },
      // Advanced browser vendor noise reduction constraints
      ...({
        googEchoCancellation: { ideal: true },
        googAutoGainControl: { ideal: true },
        googNoiseSuppression: { ideal: true },
        googHighpassFilter: { ideal: true },
        googNoiseReduction: { ideal: true },
      } as any),
    };

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
    });
    return { granted: true, stream };
  } catch (err: any) {
    const isDenied =
      err.name === "NotAllowedError" ||
      err.name === "PermissionDeniedError" ||
      err.message?.includes("Permission denied") ||
      err.message?.includes("denied");

    return {
      granted: false,
      error: isDenied
        ? "Microphone access was denied or dismissed. Please enable microphone permission in your browser address bar to speak freely."
        : err.message || "Could not access microphone.",
    };
  }
}

// Convert PCM Uint8Array to WAV buffer
export function buildWavFromPcm(pcm: Uint8Array, sampleRate = 24000, channels = 1, bitsPerSample = 16): ArrayBuffer {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm.byteLength;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  new Uint8Array(buffer, 44).set(pcm);
  return buffer;
}

/**
 * Format and sanitize response text into clean, natural spoken speech
 * Eliminates markdown artifacts, URLs, code, and symbols while pronouncing currencies properly.
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return "";
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/₦\s*([0-9,.]+)/g, "$1 Naira")
    .replace(/\$\s*([0-9,.]+)/g, "$1 dollars")
    .replace(/%/g, " percent ")
    .replace(/&/g, " and ")
    .replace(/[@#]/g, " ")
    .replace(/^[#*>-]+\s+/gm, "")
    .replace(/[*_~[\]()<>{}|\\]/g, " ")
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
}

/**
 * Synthesize speech using Google Gemini TTS with Google Kore Voice
 */
export async function synthesizeGoogleVoice(
  text: string,
  voiceName: "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr" = "Kore"
): Promise<ArrayBuffer | null> {
  const clean = cleanTextForSpeech(text);

  if (!clean) return null;

  try {
    // 1. Try Supabase Edge Function 'tts' (handles API key server-side)
    const { data, error } = await supabase.functions.invoke("tts", {
      body: { text: clean, voice: voiceName },
    });

    if (!error && data) {
      if (data instanceof Blob) {
        return await data.arrayBuffer();
      } else if (data instanceof ArrayBuffer) {
        return data;
      }
    }
  } catch (err) {
    console.warn("Supabase TTS invoke fallback:", err);
  }

  // 2. Try direct Google GenAI SDK if key is configured
  try {
    const { data: setting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "gemini_api_key")
      .maybeSingle();

    const credsKey = apiKeyService.getCredentials().geminiApiKey;
    const apiKey =
      (setting?.value && setting.value.trim().length > 10 ? setting.value.trim() : null) ||
      (credsKey && credsKey.length > 10 ? credsKey.trim() : null) ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : "") ||
      "AIzaSyAeCyBC9daZbvXNRtfLjxBWwpF3MwXJggk";

    if (apiKey && apiKey.trim().length > 10) {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: clean }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binary = atob(base64Audio);
        const pcmBytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          pcmBytes[i] = binary.charCodeAt(i);
        }
        return buildWavFromPcm(pcmBytes, 24000);
      }
    }
  } catch (sdkErr) {
    console.warn("Direct Google Gemini TTS error:", sdkErr);
  }

  return null;
}

/**
 * Intelligent Google Live Voice Agent
 * Listens in real-time with adaptive silence detection (VAD),
 * prevents microphone disruption during AI thinking/processing pauses,
 * and speaks responses using Google Kore Voice.
 */
export class GoogleLiveVoiceAgent {
  private state: VoiceAgentState = "idle";
  private permissionStatus: "prompt" | "granted" | "denied" = "prompt";
  private options: Required<GoogleVoiceOptions>;
  private callbacks: VoiceAgentCallbacks;

  // Recognition & Lifecycle control
  private recognition: any = null;
  private isListeningActive = false;
  private isProcessingActive = false;
  private isSpeakingActive = false;
  private isRecognitionRunning = false;

  // Silence & VAD Timers
  private silenceTimer: any = null;
  private restartTimeout: any = null;
  private lastSpeechTimestamp = 0;
  private currentTranscript = "";
  private accumulatedFinalTranscript = "";

  // Hardware Audio Stream, DSP Filters & Analyser
  private micStream: MediaStream | null = null;
  private micAudioCtx: AudioContext | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private highPassFilter: BiquadFilterNode | null = null;
  private lowPassFilter: BiquadFilterNode | null = null;
  private ambientNoiseFloor = 0.02; // Initial calibrated noise floor

  // Playback Audio Context
  private audioCtx: AudioContext | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;

  // Visualizer Animation
  private visualizerInterval: any = null;

  constructor(options: GoogleVoiceOptions = {}, callbacks: VoiceAgentCallbacks = {}) {
    this.options = {
      voiceName: options.voiceName || "Kore",
      lang: options.lang || "en-US",
      silenceTimeoutMs: options.silenceTimeoutMs || 1200, // Snappy real-time conversation turnaround
      continuous: options.continuous ?? true,
      pitch: options.pitch || 1.05,
      rate: options.rate || 1.0,
    };
    this.callbacks = callbacks;
  }

  public updateCallbacks(callbacks: VoiceAgentCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public setVoiceConfig(cfg: Partial<GoogleVoiceOptions>) {
    this.options = { ...this.options, ...cfg };
  }

  public getState(): VoiceAgentState {
    return this.state;
  }

  public getPermissionStatus(): "prompt" | "granted" | "denied" {
    return this.permissionStatus;
  }

  private setState(newState: VoiceAgentState) {
    this.state = newState;
    this.callbacks.onStateChange?.(newState);
    this.updateVisualizer(newState);
  }

  /**
   * Enable or disable hardware microphone tracks to prevent picking up noise or triggering
   * OS mic activity while the AI is processing, reasoning, or speaking.
   */
  private setHardwareMicEnabled(enabled: boolean) {
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Calculate real-time RMS audio volume from the microphone analyser
   * with adaptive noise floor tracking (rejects ambient store/room noise)
   */
  private getCurrentMicRms(): number {
    if (!this.micAnalyser) return 0;
    try {
      const buffer = new Uint8Array(this.micAnalyser.frequencyBinCount);
      this.micAnalyser.getByteTimeDomainData(buffer);
      let sumSquares = 0;
      for (let i = 0; i < buffer.length; i++) {
        const norm = (buffer[i] - 128) / 128;
        sumSquares += norm * norm;
      }
      const rms = Math.sqrt(sumSquares / buffer.length);
      
      // Update running ambient noise floor during low volume states
      if (rms < 0.05) {
        this.ambientNoiseFloor = this.ambientNoiseFloor * 0.95 + rms * 0.05;
      }
      return rms;
    } catch {
      return 0;
    }
  }

  private setupMicAnalyser(stream: MediaStream) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.micAudioCtx || this.micAudioCtx.state === "closed") {
        this.micAudioCtx = new AudioContextClass();
      }
      if (this.micAudioCtx.state === "suspended") {
        this.micAudioCtx.resume().catch(() => {});
      }

      // 1. Highpass filter to eliminate desk bumps, AC/fan hum, and low-frequency store rumble (85 Hz cutoff)
      this.highPassFilter = this.micAudioCtx.createBiquadFilter();
      this.highPassFilter.type = "highpass";
      this.highPassFilter.frequency.setValueAtTime(85, this.micAudioCtx.currentTime);
      this.highPassFilter.Q.setValueAtTime(0.7, this.micAudioCtx.currentTime);

      // 2. Lowpass filter to eliminate microphone hiss, electrical buzz, and high-pitch noise (7200 Hz cutoff)
      this.lowPassFilter = this.micAudioCtx.createBiquadFilter();
      this.lowPassFilter.type = "lowpass";
      this.lowPassFilter.frequency.setValueAtTime(7200, this.micAudioCtx.currentTime);
      this.lowPassFilter.Q.setValueAtTime(0.7, this.micAudioCtx.currentTime);

      // 3. Analyser for speech energy visualizer and real-time noise-gating
      this.micAnalyser = this.micAudioCtx.createAnalyser();
      this.micAnalyser.fftSize = 64;
      this.micAnalyser.smoothingTimeConstant = 0.75;

      this.micSourceNode = this.micAudioCtx.createMediaStreamSource(stream);
      
      // Connect pipeline: StreamSource -> HighPass -> LowPass -> Analyser
      // DO NOT connect to destination to avoid acoustic loopback / audio feedback
      this.micSourceNode.connect(this.highPassFilter);
      this.highPassFilter.connect(this.lowPassFilter);
      this.lowPassFilter.connect(this.micAnalyser);
    } catch (e) {
      console.warn("Could not attach mic audio analyser DSP chain:", e);
    }
  }

  private updateVisualizer(state: VoiceAgentState) {
    clearInterval(this.visualizerInterval);

    if (state === "listening") {
      const dataArray = new Uint8Array(32);
      this.visualizerInterval = setInterval(() => {
        if (this.micAnalyser && this.micAudioCtx && this.micAudioCtx.state === "running") {
          this.micAnalyser.getByteFrequencyData(dataArray);
          const step = Math.floor(dataArray.length / 12) || 1;
          const heights = Array.from({ length: 12 }, (_, i) => {
            const val = dataArray[i * step] || 0;
            return Math.min(65, Math.max(10, Math.round((val / 255) * 55 + 10)));
          });
          this.callbacks.onAudioLevels?.(heights);
        } else {
          // Subtle resting pulse
          const heights = [12, 18, 24, 30, 26, 20, 28, 22, 16, 24, 18, 12];
          this.callbacks.onAudioLevels?.(heights);
        }
      }, 70);
    } else if (state === "processing") {
      // Gentle harmonic breathing wave while AI is thinking/reasoning (no mic noise pickup)
      let phase = 0;
      this.visualizerInterval = setInterval(() => {
        phase = (phase + 0.15) % (Math.PI * 2);
        const heights = Array.from({ length: 12 }, (_, i) => {
          const wave = Math.sin(phase + i * 0.45);
          return Math.round(20 + wave * 16);
        });
        this.callbacks.onAudioLevels?.(heights);
      }, 80);
    } else if (state === "speaking") {
      this.visualizerInterval = setInterval(() => {
        const heights = Array.from({ length: 12 }, () => Math.floor(Math.random() * 45) + 20);
        this.callbacks.onAudioLevels?.(heights);
      }, 90);
    } else {
      this.callbacks.onAudioLevels?.([10, 14, 18, 14, 10, 14, 18, 14, 10, 14, 18, 10]);
    }
  }

  /**
   * Explicitly request Microphone Access and Start Interactive Voice Session.
   */
  public async start(welcomeMessage?: string): Promise<boolean> {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      const err = "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.";
      this.callbacks.onError?.(err);
      this.setState("error");
      return false;
    }

    // Explicitly prompt and request microphone permission from the user
    const micRes = await requestMicrophoneAccess();
    if (!micRes.granted) {
      this.permissionStatus = "denied";
      this.setState("mic-denied");
      this.callbacks.onPermissionChange?.("denied", micRes.error);
      this.callbacks.onError?.(micRes.error || "Microphone access is required to speak.");
      return false;
    }

    this.permissionStatus = "granted";
    this.callbacks.onPermissionChange?.("granted");

    if (micRes.stream) {
      this.micStream = micRes.stream;
      this.setupMicAnalyser(micRes.stream);
    }

    this.isListeningActive = true;
    this.isProcessingActive = false;
    this.isSpeakingActive = false;

    // If a welcome message is provided, speak it first, then open the mic cleanly
    if (welcomeMessage && welcomeMessage.trim()) {
      this.callbacks.onAIResponse?.(welcomeMessage);
      await this.speak(welcomeMessage);
      // When speak finishes, startListeningCycle will be triggered automatically
    } else {
      this.startListeningCycle();
    }

    return true;
  }

  /**
   * Internal Speech Recognition Loop with Adaptive Silence & Voice Activity Detection (VAD)
   */
  public startListeningCycle() {
    if (!this.isListeningActive || this.isSpeakingActive || this.isProcessingActive) {
      return;
    }

    // Clear any pending restart timers
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    // Ensure hardware microphone is active and enabled for listening
    this.setHardwareMicEnabled(true);

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      // Safely cleanup previous recognition instance if still active
      if (this.recognition) {
        try {
          this.recognition.onstart = null;
          this.recognition.onresult = null;
          this.recognition.onerror = null;
          this.recognition.onend = null;
          this.recognition.abort();
        } catch {}
        this.recognition = null;
      }

      const rec = new SpeechRecognition();
      this.recognition = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = this.options.lang;

      rec.onstart = () => {
        if (!this.isListeningActive || this.isProcessingActive || this.isSpeakingActive) {
          try {
            rec.abort();
          } catch {}
          return;
        }
        this.isRecognitionRunning = true;
        this.setState("listening");
      };

      rec.onresult = (event: any) => {
        // Completely discard results if AI is thinking/processing or speaking
        if (this.isProcessingActive || this.isSpeakingActive || !this.isListeningActive) {
          return;
        }

        let interim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const piece = event.results[i][0]?.transcript || "";
          if (event.results[i].isFinal) {
            finalChunk += " " + piece;
          } else {
            interim += " " + piece;
          }
        }

        if (finalChunk.trim()) {
          this.accumulatedFinalTranscript = (
            this.accumulatedFinalTranscript + " " + finalChunk
          ).trim();
          this.callbacks.onFinalTranscript?.(this.accumulatedFinalTranscript);
        }

        const activeDisplay = (this.accumulatedFinalTranscript + " " + interim).trim();
        this.currentTranscript = activeDisplay;
        this.callbacks.onInterimTranscript?.(activeDisplay);
        this.lastSpeechTimestamp = Date.now();

        // --- Adaptive Silence Detection & VAD Heuristics ---
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }

        if (activeDisplay.length >= 2) {
          const trimmed = activeDisplay.trim();
          const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
          const endsWithPunctuation = /[.?!]$/.test(trimmed);
          const isQuestion = /\b(what|how|why|when|where|who|can|could|will|would|is|are|tell me|explain|suggest|help)\b/i.test(trimmed);

          let dynamicTimeout = this.options.silenceTimeoutMs; // default 1200ms

          if (endsWithPunctuation || (isQuestion && wordCount >= 4)) {
            // Completed question or sentence: trigger instant reply
            dynamicTimeout = 850;
          } else if (wordCount <= 3) {
            // Short fragment: allow user natural breathing pause to finish thought
            dynamicTimeout = 1600;
          } else {
            // Standard conversational utterance: snappy turnaround
            dynamicTimeout = 1100;
          }

          this.silenceTimer = setTimeout(() => {
            this.evaluateAndTriggerSilence();
          }, dynamicTimeout);
        }
      };

      rec.onerror = (event: any) => {
        if (this.isProcessingActive || this.isSpeakingActive || !this.isListeningActive) {
          return;
        }

        if (event.error === "no-speech") {
          // Normal background silence while user is thinking; do not disrupt
          return;
        }
        if (event.error === "not-allowed") {
          this.callbacks.onError?.("Microphone permission denied. Please allow microphone access.");
          this.setState("mic-denied");
          this.stop();
          return;
        }
        if (event.error !== "aborted" && this.isListeningActive && !this.isProcessingActive && !this.isSpeakingActive) {
          this.scheduleRestart(350);
        }
      };

      rec.onend = () => {
        this.isRecognitionRunning = false;
        if (this.isListeningActive && !this.isProcessingActive && !this.isSpeakingActive) {
          this.scheduleRestart(200);
        }
      };

      rec.start();
    } catch (err: any) {
      console.warn("Speech recognition cycle warning:", err);
      if (!err.message?.includes("already started") && !this.isProcessingActive) {
        this.scheduleRestart(500);
      }
    }
  }

  /**
   * Schedule a debounced restart of recognition loop when listening is active
   */
  private scheduleRestart(delayMs = 200) {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.isListeningActive && !this.isProcessingActive && !this.isSpeakingActive) {
      this.restartTimeout = setTimeout(() => {
        if (this.isListeningActive && !this.isProcessingActive && !this.isSpeakingActive) {
          this.startListeningCycle();
        }
      }, delayMs);
    }
  }

  /**
   * Verify audio energy (RMS) against dynamic ambient noise floor before committing silence
   */
  private evaluateAndTriggerSilence() {
    if (this.isProcessingActive || this.isSpeakingActive || !this.isListeningActive) {
      return;
    }

    const currentRms = this.getCurrentMicRms();
    // Dynamic speech threshold above ambient noise floor
    const isSpeechActive = currentRms > (this.ambientNoiseFloor * 1.6 + 0.035);
    const timeSinceSpeech = Date.now() - this.lastSpeechTimestamp;

    // If user is still actively vocalizing above noise floor and within last 1.2s, wait a moment
    if (isSpeechActive && timeSinceSpeech < 1200) {
      this.silenceTimer = setTimeout(() => {
        this.evaluateAndTriggerSilence();
      }, 400);
      return;
    }

    this.handleUserSilenceDetected();
  }

  /**
   * Manually trigger immediate submission of spoken text without waiting for silence
   */
  public submitSpokenNow() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.handleUserSilenceDetected();
  }

  /**
   * Triggered when silence detector determines user has finished talking or clicked Send Now.
   * Completely pauses/mutes the microphone so AI processing/thinking is noiseless and uninterrupted.
   */
  private async handleUserSilenceDetected() {
    const fullQuery = this.currentTranscript.trim();
    if (!fullQuery || fullQuery.length < 2) {
      // Nothing substantive said, keep listening peacefully
      if (this.isListeningActive && !this.isSpeakingActive && !this.isProcessingActive) {
        this.setState("listening");
      }
      return;
    }

    // 1. Immediately transition to processing state
    this.isProcessingActive = true;
    this.setState("processing");

    // 2. Shut down SpeechRecognition and mute hardware mic to prevent disruptive audio interrupts or thinking glitches
    this.setHardwareMicEnabled(false);
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    try {
      if (this.recognition) {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
        this.isRecognitionRunning = false;
        this.recognition = null;
      }
    } catch {}

    const queryToExecute = fullQuery;
    this.currentTranscript = "";
    this.accumulatedFinalTranscript = "";

    try {
      let aiResponseText = "";
      if (this.callbacks.onUserFinishedSpeaking) {
        const res = await this.callbacks.onUserFinishedSpeaking(queryToExecute);
        if (typeof res === "string") {
          aiResponseText = res;
        }
      }

      this.isProcessingActive = false;

      if (aiResponseText && aiResponseText.trim()) {
        this.callbacks.onAIResponse?.(aiResponseText);
        await this.speak(aiResponseText);
      } else {
        // If no spoken audio response returned, return smoothly to listening
        this.setState("idle");
        if (this.isListeningActive && this.options.continuous) {
          setTimeout(() => {
            if (this.isListeningActive && !this.isSpeakingActive && !this.isProcessingActive) {
              this.startListeningCycle();
            }
          }, 250);
        }
      }
    } catch (err: any) {
      this.isProcessingActive = false;
      this.callbacks.onError?.(err.message || "Error processing voice request");
      this.setState("idle");
      if (this.isListeningActive && this.options.continuous) {
        setTimeout(() => {
          if (this.isListeningActive && !this.isSpeakingActive && !this.isProcessingActive) {
            this.startListeningCycle();
          }
        }, 300);
      }
    }
  }

  /**
   * Speak response using Google Kore Voice (Gemini TTS with Web Speech natural fallback)
   */
  public async speak(text: string): Promise<void> {
    this.isSpeakingActive = true;
    this.isProcessingActive = false;

    // Ensure mic is muted during speech playback to eliminate audio feedback and acoustic loops
    this.setHardwareMicEnabled(false);

    try {
      if (this.recognition) {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
        this.isRecognitionRunning = false;
        this.recognition = null;
      }
    } catch {}

    this.setState("speaking");

    try {
      // 1. Try high-fidelity Google Gemini TTS WAV Audio
      const wavBuffer = await synthesizeGoogleVoice(text, this.options.voiceName);
      if (wavBuffer) {
        await this.playAudioBuffer(wavBuffer);
        return;
      }
    } catch (err) {
      console.warn("Google Gemini TTS playback failed, falling back to Browser Voice:", err);
    }

    // 2. High-Grade Browser Speech Synthesis Fallback tuned to Kore Voice Persona
    await this.speakWithBrowserFallback(text);
  }

  /**
   * Play decoded WAV buffer via Web Audio API
   */
  private playAudioBuffer(buffer: ArrayBuffer): Promise<void> {
    return new Promise((resolve) => {
      (async () => {
        try {
          if (!this.audioCtx || this.audioCtx.state === "closed") {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.audioCtx = new AudioContextClass({ sampleRate: 24000 });
          }

          if (this.audioCtx.state === "suspended") {
            await this.audioCtx.resume();
          }

          const decoded = await this.audioCtx.decodeAudioData(buffer.slice(0));
          const source = this.audioCtx.createBufferSource();
          source.buffer = decoded;
          this.currentAudioSource = source;

          source.connect(this.audioCtx.destination);

          source.onended = () => {
            this.isSpeakingActive = false;
            this.currentAudioSource = null;
            this.setState("idle");
            resolve();

            // Automatically resume listening hands-free after subtle acoustic settle time
            if (this.isListeningActive && this.options.continuous) {
              setTimeout(() => {
                if (this.isListeningActive && !this.isSpeakingActive && !this.isProcessingActive) {
                  this.startListeningCycle();
                }
              }, 250);
            }
          };

          source.start(0);
        } catch (e) {
          console.warn("Audio buffer decode error:", e);
          this.isSpeakingActive = false;
          this.setState("idle");
          resolve();
          if (this.isListeningActive && this.options.continuous) {
            setTimeout(() => {
              if (this.isListeningActive && !this.isSpeakingActive && !this.isProcessingActive) {
                this.startListeningCycle();
              }
            }, 250);
          }
        }
      })();
    });
  }

  /**
   * Browser Speech Synthesis fallback tuned to authentic, articulate voice
   */
  private speakWithBrowserFallback(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        this.isSpeakingActive = false;
        this.setState("idle");
        resolve();
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const clean = cleanTextForSpeech(text).slice(0, 3000);
        const utterance = new SpeechSynthesisUtterance(clean);

        const voices = window.speechSynthesis.getVoices();
        const googleVoice = voices.find(
          (v) =>
            (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha") || v.name.includes("Karen") || v.name.includes("Zira")) &&
            (v.lang.startsWith("en") || v.name.includes("Female"))
        );
        const englishVoice = voices.find((v) => v.lang.startsWith("en"));

        utterance.voice = googleVoice || englishVoice || null;
        utterance.pitch = this.options.pitch;
        utterance.rate = this.options.rate;

        utterance.onend = () => {
          this.isSpeakingActive = false;
          this.setState("idle");
          resolve();
          if (this.isListeningActive && this.options.continuous) {
            setTimeout(() => {
              if (this.isListeningActive && !this.isSpeakingActive && !this.isProcessingActive) {
                this.startListeningCycle();
              }
            }, 250);
          }
        };

        utterance.onerror = () => {
          this.isSpeakingActive = false;
          this.setState("idle");
          resolve();
          if (this.isListeningActive && this.options.continuous) {
            setTimeout(() => {
              if (this.isListeningActive && !this.isSpeakingActive && !this.isProcessingActive) {
                this.startListeningCycle();
              }
            }, 250);
          }
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        this.isSpeakingActive = false;
        this.setState("idle");
        resolve();
      }
    });
  }

  /**
   * Interrupt current AI speech immediately and re-open listening
   */
  public interrupt() {
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
      } catch {}
      this.currentAudioSource = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.isSpeakingActive = false;
    this.isProcessingActive = false;
    this.setState("idle");

    if (this.isListeningActive) {
      setTimeout(() => {
        if (this.isListeningActive && !this.isSpeakingActive && !this.isProcessingActive) {
          this.startListeningCycle();
        }
      }, 150);
    }
  }

  /**
   * Stop all voice agent operations cleanly and release microphone resources
   */
  public stop() {
    this.isListeningActive = false;
    this.isSpeakingActive = false;
    this.isProcessingActive = false;
    this.isRecognitionRunning = false;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    clearInterval(this.visualizerInterval);

    try {
      if (this.recognition) {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
        this.recognition = null;
      }
    } catch {}

    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
      } catch {}
      this.currentAudioSource = null;
    }

    if (this.micStream) {
      try {
        this.micStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.micStream = null;
    }

    if (this.micSourceNode) {
      try {
        this.micSourceNode.disconnect();
      } catch {}
      this.micSourceNode = null;
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    this.setState("idle");
    this.callbacks.onAudioLevels?.([10, 14, 18, 14, 10, 14, 18, 14, 10, 14, 18, 10]);
  }
}
