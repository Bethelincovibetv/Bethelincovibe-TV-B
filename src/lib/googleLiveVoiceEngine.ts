import { GoogleGenAI, Modality } from "@google/genai";
import { supabase } from "@/integrations/supabase/client";

export interface GoogleVoiceOptions {
  voiceName?: "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr";
  lang?: string;
  silenceTimeoutMs?: number; // Time in ms after user pauses before auto-triggering response (default: 2200ms)
  continuous?: boolean; // Hands-free continuous loop
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
 * with active echo cancellation and noise suppression
 */
export async function requestMicrophoneAccess(): Promise<{ granted: boolean; error?: string; stream?: MediaStream }> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      granted: false,
      error: "Microphone access is not supported in this browser. Please use Chrome, Edge, or Safari.",
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: true },
      },
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
 * Synthesize speech using Google Gemini TTS with Google's Kore Voice
 */
export async function synthesizeGoogleVoice(
  text: string,
  voiceName: "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr" = "Kore"
): Promise<ArrayBuffer | null> {
  const clean = text
    .replace(/[*_#`~[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);

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

    const apiKey =
      setting?.value ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : "");

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
 * Listens in real-time, accurately tracks speech without interruption,
 * transcribes continuously, and speaks responses using Google Kore Voice.
 */
export class GoogleLiveVoiceAgent {
  private state: VoiceAgentState = "idle";
  private permissionStatus: "prompt" | "granted" | "denied" = "prompt";
  private options: Required<GoogleVoiceOptions>;
  private callbacks: VoiceAgentCallbacks;

  private recognition: any = null;
  private isListeningActive = false;
  private isSpeakingActive = false;
  private silenceTimer: any = null;
  private currentTranscript = "";
  private accumulatedFinalTranscript = "";

  private micStream: MediaStream | null = null;
  private micAudioCtx: AudioContext | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;

  private audioCtx: AudioContext | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;

  private visualizerInterval: any = null;
  private isRecognitionRunning = false;

  constructor(options: GoogleVoiceOptions = {}, callbacks: VoiceAgentCallbacks = {}) {
    this.options = {
      voiceName: options.voiceName || "Kore",
      lang: options.lang || "en-US",
      silenceTimeoutMs: options.silenceTimeoutMs || 2200, // 2.2s natural breathing room
      continuous: options.continuous ?? true,
      pitch: options.pitch || 1.05,
      rate: options.rate || 1.0,
    };
    this.callbacks = callbacks;
  }

  public updateCallbacks(callbacks: VoiceAgentCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
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

  private setupMicAnalyser(stream: MediaStream) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.micAudioCtx || this.micAudioCtx.state === "closed") {
        this.micAudioCtx = new AudioContextClass();
      }
      if (this.micAudioCtx.state === "suspended") {
        this.micAudioCtx.resume().catch(() => {});
      }

      this.micAnalyser = this.micAudioCtx.createAnalyser();
      this.micAnalyser.fftSize = 64;
      this.micAnalyser.smoothingTimeConstant = 0.75;

      this.micSourceNode = this.micAudioCtx.createMediaStreamSource(stream);
      // Connect to analyser ONLY, NOT to destination (to avoid audio feedback/noise)
      this.micSourceNode.connect(this.micAnalyser);
    } catch (e) {
      console.warn("Could not attach mic audio analyser:", e);
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
    } else if (state === "speaking") {
      this.visualizerInterval = setInterval(() => {
        const heights = Array.from({ length: 12 }, () => Math.floor(Math.random() * 45) + 20);
        this.callbacks.onAudioLevels?.(heights);
      }, 90);
    } else if (state === "processing") {
      this.visualizerInterval = setInterval(() => {
        const heights = [20, 28, 36, 44, 36, 28, 36, 44, 36, 28, 20, 15];
        this.callbacks.onAudioLevels?.(heights);
      }, 120);
    } else {
      this.callbacks.onAudioLevels?.([10, 14, 18, 14, 10, 14, 18, 14, 10, 14, 18, 10]);
    }
  }

  /**
   * Explicitly request Microphone Access and Start Interactive Voice Session.
   * If welcomeMessage is passed, speak it first cleanly before opening the mic,
   * so the AI never interrupts itself or hears its own greeting.
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

    // If a welcome message is provided, speak it first, then start listening
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
   * Internal Speech Recognition Loop with Intelligent Silence (VAD) Detection
   */
  public startListeningCycle() {
    if (!this.isListeningActive || this.isSpeakingActive || this.state === "processing") return;

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (this.recognition && this.isRecognitionRunning) {
        try {
          this.recognition.abort();
        } catch {}
        this.isRecognitionRunning = false;
      }

      const rec = new SpeechRecognition();
      this.recognition = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = this.options.lang;

      this.currentTranscript = "";
      this.accumulatedFinalTranscript = "";

      rec.onstart = () => {
        this.isRecognitionRunning = true;
        this.setState("listening");
      };

      rec.onresult = (event: any) => {
        // If AI is currently speaking, do not process
        if (this.isSpeakingActive) {
          return;
        }

        let interim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const piece = event.results[i][0].transcript;
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

        // --- Intelligent Voice Activity Detection (VAD) & Silence Detection ---
        // Every time new speech arrives, clear previous silence timer and restart
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }

        if (activeDisplay.length > 1) {
          this.silenceTimer = setTimeout(() => {
            this.handleUserSilenceDetected();
          }, this.options.silenceTimeoutMs);
        }
      };

      rec.onerror = (event: any) => {
        if (event.error === "no-speech") {
          // Normal silence while user is listening or thinking; keep listening
          return;
        }
        if (event.error === "not-allowed") {
          this.callbacks.onError?.("Microphone permission denied. Please allow microphone access.");
          this.setState("mic-denied");
          this.stop();
          return;
        }
        if (event.error !== "aborted" && this.isListeningActive && !this.isSpeakingActive) {
          setTimeout(() => {
            if (this.isListeningActive && !this.isSpeakingActive && this.state !== "processing") {
              this.startListeningCycle();
            }
          }, 300);
        }
      };

      rec.onend = () => {
        this.isRecognitionRunning = false;
        if (this.isListeningActive && !this.isSpeakingActive && this.state !== "processing") {
          setTimeout(() => {
            if (this.isListeningActive && !this.isSpeakingActive && this.state !== "processing") {
              this.startListeningCycle();
            }
          }, 200);
        }
      };

      rec.start();
    } catch (err: any) {
      console.warn("Could not start speech recognition loop:", err);
      // If error was recognition already started, ignore safely
      if (!err.message?.includes("already started")) {
        this.callbacks.onError?.(err.message || "Failed to start listening");
      }
    }
  }

  /**
   * Manually trigger immediate submission of what the user has spoken without waiting for silence
   */
  public submitSpokenNow() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.handleUserSilenceDetected();
  }

  /**
   * Triggered when silence detector determines user has finished talking or user clicked send
   */
  private async handleUserSilenceDetected() {
    const fullQuery = this.currentTranscript.trim();
    if (!fullQuery || fullQuery.length < 2) {
      // Nothing substantive said, resume listening
      if (this.isListeningActive && !this.isSpeakingActive) {
        this.setState("listening");
      }
      return;
    }

    // Stop recognition during processing & response synthesis
    try {
      if (this.recognition && this.isRecognitionRunning) {
        this.recognition.stop();
        this.isRecognitionRunning = false;
      }
    } catch {}

    this.setState("processing");
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

      if (aiResponseText && aiResponseText.trim()) {
        this.callbacks.onAIResponse?.(aiResponseText);
        await this.speak(aiResponseText);
      } else {
        // If no explicit audio reply, resume listening
        this.setState("idle");
        if (this.isListeningActive && this.options.continuous) {
          this.startListeningCycle();
        }
      }
    } catch (err: any) {
      this.callbacks.onError?.(err.message || "Error processing voice request");
      this.setState("idle");
      if (this.isListeningActive && this.options.continuous) {
        this.startListeningCycle();
      }
    }
  }

  /**
   * Speak response using Google Kore Voice (Gemini TTS with Web Speech natural fallback)
   */
  public async speak(text: string): Promise<void> {
    // Temporarily halt recognition while speaking so AI does not hear itself
    this.isSpeakingActive = true;
    try {
      if (this.recognition && this.isRecognitionRunning) {
        this.recognition.stop();
        this.isRecognitionRunning = false;
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
            // Automatically resume listening hands-free
            if (this.isListeningActive && this.options.continuous) {
              setTimeout(() => {
                if (this.isListeningActive && !this.isSpeakingActive) {
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
              if (this.isListeningActive && !this.isSpeakingActive) {
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
        const clean = text.replace(/[*_#`~[\]()]/g, " ").replace(/\s+/g, " ").slice(0, 3000);
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
              if (this.isListeningActive && !this.isSpeakingActive) {
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
              if (this.isListeningActive && !this.isSpeakingActive) {
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
    this.setState("idle");

    if (this.isListeningActive) {
      setTimeout(() => {
        if (this.isListeningActive && !this.isSpeakingActive) {
          this.startListeningCycle();
        }
      }, 150);
    }
  }

  /**
   * Stop all voice agent operations cleanly
   */
  public stop() {
    this.isListeningActive = false;
    this.isSpeakingActive = false;
    this.isRecognitionRunning = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    clearInterval(this.visualizerInterval);

    try {
      this.recognition?.stop();
      this.recognition?.abort();
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
