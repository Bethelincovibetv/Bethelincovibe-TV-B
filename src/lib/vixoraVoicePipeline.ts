import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/integrations/supabase/client";
import { apiKeyService } from "@/vixora/services/apiKeyService";

export type VoiceState =
  | "idle"
  | "connecting"
  | "listening"
  | "transcribing"
  | "processing"
  | "speaking"
  | "mic-denied"
  | "error";

export interface VoicePipelineOptions {
  voiceName?: "Aoede" | "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr" | "Alloy" | "Shimmer";
  lang?: string;
  silenceTimeoutMs?: number;
  continuous?: boolean;
  pitch?: number;
  rate?: number;
  systemPrompt?: string;
  coachName?: string;
  businessContext?: {
    business_name?: string;
    industry?: string;
    stage?: string;
    goal?: string;
    monthly_revenue?: string;
    [key: string]: any;
  };
}

export interface VoicePipelineCallbacks {
  onStateChange?: (state: VoiceState) => void;
  onInterimTranscript?: (transcript: string) => void;
  onFinalTranscript?: (transcript: string) => void;
  onUserMessage?: (userText: string) => void;
  onAIResponse?: (responseText: string) => void;
  onAudioLevels?: (levels: number[]) => void;
  onError?: (error: string) => void;
  onPermissionChange?: (status: "prompt" | "granted" | "denied", message?: string) => void;
  onInterrupted?: () => void;
}

/**
 * Retrieve active Gemini API Key with safe fallback chain
 */
export function getGeminiApiKey(): string {
  try {
    const credsKey = apiKeyService.getCredentials().geminiApiKey;
    if (credsKey && credsKey.trim().length > 10) return credsKey.trim();
  } catch {}

  const envKey =
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (import.meta as any).env?.GEMINI_API_KEY ||
    (typeof window !== "undefined" &&
      ((window as any).__GEMINI_API_KEY__ ||
        (window as any).VITE_GEMINI_API_KEY ||
        (window as any).GEMINI_API_KEY)) ||
    (typeof process !== "undefined"
      ? (process as any).env?.GEMINI_API_KEY || (process as any).env?.VITE_GEMINI_API_KEY
      : "");
  if (envKey && String(envKey).trim().length > 10) return String(envKey).trim();

  return "AIzaSyAeCyBC9daZbvXNRtfLjxBWwpF3MwXJggk";
}

/**
 * Request user microphone access safely with clean constraints
 */
export async function requestMicrophoneAccess(): Promise<{
  granted: boolean;
  error?: string;
  stream?: MediaStream;
}> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      granted: false,
      error: "Microphone access is not supported on this browser. Please try Chrome, Safari, or Edge.",
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
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
        ? "Microphone permission is required for voice conversations. Please allow microphone access in your browser."
        : err.message || "Microphone access failed. Please check device settings.",
    };
  }
}

/**
 * Format and sanitize response text into clean, natural spoken speech
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
    .slice(0, 3500);
}

/**
 * Convert Blob to Base64 data string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = (reader.result as string) || "";
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * VixoraVoicePipeline
 * 
 * Traditional, ultra-reliable STT → LLM → TTS Voice Architecture:
 * 1. MICROPHONE (Clean MediaStream & Analyser)
 * 2. REAL SPEECH-TO-TEXT (Web Speech API with live interim updates + Gemini Multimodal Fallback)
 * 3. USER TRANSCRIPT (Sent as verified text)
 * 4. EXISTING GEMINI TEXT MODEL (Coach Bethel Goodgift Prompt + Gemini 3.7 Flash)
 * 5. AI RESPONSE TEXT (Clean conversational text)
 * 6. TEXT-TO-SPEECH (Web SpeechSynthesis / Voice synthesis)
 * 7. AI VOICE RESPONSE with instant interruption support.
 */
export class VixoraVoicePipeline {
  private state: VoiceState = "idle";
  private options: Required<VoicePipelineOptions>;
  private callbacks: VoicePipelineCallbacks;

  // Primary STT (Web Speech API)
  private recognition: any = null;
  private isRecognitionActive = false;
  private silenceTimer: any = null;
  private currentSpokenText = "";
  private hasSpokenInCurrentTurn = false;

  // Secondary Fallback STT (MediaRecorder + Gemini STT)
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private isFallbackMode = false;

  // Speech & Playback
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  // Visualizer and Lifecycle
  private visualizerInterval: any = null;
  private isMuted = false;
  private isStopped = false;

  constructor(options: VoicePipelineOptions = {}, callbacks: VoicePipelineCallbacks = {}) {
    const coachName = options.coachName || "Coach Bethel Goodgift";
    const ctx = options.businessContext || {};
    const defaultPrompt =
      options.systemPrompt ||
      `You are ${coachName}, an elite, high-energy Nigerian and Global business strategist and commercial growth mentor powered by BTV AI Studio.
${ctx.business_name ? `The user's business is "${ctx.business_name}".` : ""}
${ctx.industry ? `Industry: ${ctx.industry}.` : ""}
${ctx.stage ? `Stage: ${ctx.stage}.` : ""}
${ctx.goal ? `Goal: ${ctx.goal}.` : ""}
${ctx.monthly_revenue ? `Monthly Revenue: ${ctx.monthly_revenue}.` : ""}
Speak with high energy, commercial sharpness, and actionable practical insights. Keep responses concise and punchy (2-3 sentences max per spoken turn) so the live voice call feels natural, engaging, and fast. Refer to Naira (₦) or market expansion where appropriate. Never output markdown asterisks or bullet points.`;

    this.options = {
      voiceName: options.voiceName || "Aoede",
      lang: options.lang || "en-US",
      silenceTimeoutMs: options.silenceTimeoutMs || 1200,
      continuous: options.continuous ?? true,
      pitch: options.pitch || 1.0,
      rate: options.rate || 1.02,
      systemPrompt: defaultPrompt,
      coachName: coachName,
      businessContext: ctx,
    };
    this.callbacks = callbacks;
  }

  public updateCallbacks(callbacks: VoicePipelineCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public setOptions(opts: Partial<VoicePipelineOptions>) {
    this.options = { ...this.options, ...(opts as any) };
  }

  public getState(): VoiceState {
    return this.state;
  }

  private setState(state: VoiceState) {
    this.state = state;
    this.callbacks.onStateChange?.(state);
    this.updateVisualizer(state);
  }

  /**
   * Start the Voice Pipeline
   */
  public async start(welcomeGreeting?: string): Promise<boolean> {
    this.isStopped = false;
    this.stopTTS();
    this.setState("connecting");

    // 1. Request microphone access
    const micRes = await requestMicrophoneAccess();
    if (!micRes.granted) {
      this.setState("mic-denied");
      this.callbacks.onPermissionChange?.("denied", micRes.error);
      this.callbacks.onError?.(
        micRes.error || "Microphone permission is required for voice conversation."
      );
      return false;
    }

    this.mediaStream = micRes.stream || null;
    this.callbacks.onPermissionChange?.("granted");

    // Setup Web Audio Analyser for live frequency visualization
    this.setupAudioAnalyser(this.mediaStream);

    // 2. Determine STT Provider (Web Speech API primary, Gemini fallback)
    const SpeechRecognitionClass =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (SpeechRecognitionClass) {
      this.isFallbackMode = false;
      this.initNativeSpeechRecognition(SpeechRecognitionClass);
      this.startListeningNative();
    } else {
      this.isFallbackMode = true;
      this.startListeningFallback();
    }

    if (welcomeGreeting) {
      this.speakWithTTS(welcomeGreeting);
    }

    return true;
  }

  /**
   * Initialize native Web SpeechRecognition
   */
  private initNativeSpeechRecognition(SpeechRecognitionClass: any) {
    try {
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch {}
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = this.options.lang || "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        this.isRecognitionActive = true;
        if (this.state !== "processing" && this.state !== "speaking") {
          this.setState("listening");
        }
      };

      recognition.onspeechstart = () => {
        this.hasSpokenInCurrentTurn = true;
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
      };

      recognition.onresult = (event: any) => {
        if (this.state === "processing" || this.state === "speaking") return;

        let finalPart = "";
        let interimPart = "";

        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          const transcript = res[0]?.transcript || "";
          if (res.isFinal) {
            finalPart += transcript + " ";
          } else {
            interimPart += transcript;
          }
        }

        const fullCurrentTranscript = (finalPart + (interimPart ? " " + interimPart : "")).replace(/\s+/g, " ").trim();

        if (fullCurrentTranscript) {
          this.currentSpokenText = fullCurrentTranscript;
          this.hasSpokenInCurrentTurn = true;
          this.callbacks.onInterimTranscript?.(fullCurrentTranscript);

          // Reset silence timer whenever a new syllable/word is recognized
          this.resetSilenceTimer();
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          this.setState("mic-denied");
          this.callbacks.onError?.(
            "Microphone access was denied. Please allow microphone permissions."
          );
        } else if (event.error === "no-speech") {
          // Keep listening
          if (this.hasSpokenInCurrentTurn && this.currentSpokenText.trim().length >= 2) {
            this.finalizeAndSendTranscript();
          }
        } else if (event.error === "network") {
          // If native recognition fails due to network, switch gracefully to fallback
          if (!this.isFallbackMode) {
            this.isFallbackMode = true;
            this.startListeningFallback();
          }
        }
      };

      recognition.onend = () => {
        this.isRecognitionActive = false;

        if (this.isStopped) return;

        // If user finished a spoken turn when recognition ended
        if (this.hasSpokenInCurrentTurn && this.currentSpokenText.trim().length >= 2) {
          this.finalizeAndSendTranscript();
          return;
        }

        // Keep listening in continuous mode
        if (this.state === "listening" && !this.isStopped) {
          try {
            recognition.start();
          } catch {}
        }
      };

      this.recognition = recognition;
    } catch (err) {
      console.warn("[VOICE] Native SpeechRecognition error, falling back to MediaRecorder:", err);
      this.isFallbackMode = true;
      this.startListeningFallback();
    }
  }

  private startListeningNative() {
    this.currentSpokenText = "";
    this.hasSpokenInCurrentTurn = false;

    if (!this.recognition) return;
    try {
      this.recognition.start();
    } catch (err: any) {
      if (!err.message?.includes("already started")) {
        console.warn("[VOICE] Recognition start error:", err);
      }
    }
  }

  /**
   * Reset silence timer for automatic conversational turn-taking
   */
  private resetSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);

    this.silenceTimer = setTimeout(() => {
      const textToFinalize = this.currentSpokenText.trim();
      if (textToFinalize && textToFinalize.length >= 2 && this.state === "listening") {
        this.finalizeAndSendTranscript();
      }
    }, this.options.silenceTimeoutMs);
  }

  /**
   * Finalize the transcript and dispatch to Gemini LLM
   */
  public async finalizeAndSendTranscript() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);

    const finalText = this.currentSpokenText.trim();
    this.currentSpokenText = "";
    this.hasSpokenInCurrentTurn = false;
    this.callbacks.onInterimTranscript?.("");

    if (!finalText || finalText.length < 2) {
      return;
    }

    this.callbacks.onFinalTranscript?.(finalText);
    this.callbacks.onUserMessage?.(finalText);

    // Temporarily pause recognition while processing
    if (this.recognition && this.isRecognitionActive) {
      try {
        this.recognition.stop();
      } catch {}
    }

    await this.processWithGeminiTextModel(finalText);
  }

  /**
   * Process finalized user text using standard Gemini Text Model (LLM)
   */
  private async processWithGeminiTextModel(userText: string) {
    this.setState("processing");

    let replyText = "";

    try {
      // 1. Try Supabase business-coach edge function if configured
      try {
        const { data, error } = await supabase.functions.invoke("business-coach", {
          body: {
            message: userText,
            businessContext: this.options.businessContext,
          },
        });
        if (!error && data?.reply) {
          replyText = data.reply;
        }
      } catch {}

      // 2. Direct Gemini 3.7 Flash Text Generation
      if (!replyText) {
        const apiKey = getGeminiApiKey();
        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${this.options.systemPrompt}\n\nUser Question: "${userText}"\n\nProvide an authoritative, actionable, practical spoken answer in 2 to 3 concise sentences. Never use markdown asterisks or bullet points.`,
                },
              ],
            },
          ],
        });

        replyText =
          response.text?.trim() ||
          "Focus on validating customer demand, optimizing your pricing margins, and maintaining active client outreach this week.";
      }

      // Clean text for speech
      replyText = replyText.replace(/[*_#`~]/g, " ").replace(/\s+/g, " ").trim();

      this.callbacks.onAIResponse?.(replyText);

      // 3. Send AI text response to Text-To-Speech (TTS)
      await this.speakWithTTS(replyText);
    } catch (err: any) {
      console.error("[VOICE] Gemini reasoning error:", err);
      this.setState("error");
      this.callbacks.onError?.("I couldn't process that response. Please try speaking again.");

      if (this.options.continuous && !this.isStopped) {
        setTimeout(() => {
          if (!this.isStopped) {
            this.setState("listening");
            if (this.isFallbackMode) {
              this.startListeningFallback();
            } else {
              this.startListeningNative();
            }
          }
        }, 1500);
      }
    }
  }

  /**
   * Text-To-Speech Playback using Web Speech Synthesis
   */
  private async speakWithTTS(text: string): Promise<void> {
    const cleanSpeech = cleanTextForSpeech(text);
    if (!cleanSpeech) {
      this.onSpeechFinished();
      return;
    }

    if (typeof window === "undefined" || !window.speechSynthesis) {
      this.onSpeechFinished();
      return;
    }

    this.stopTTS();
    this.setState("speaking");

    return new Promise((resolve) => {
      try {
        const utterance = new SpeechSynthesisUtterance(cleanSpeech);
        this.currentUtterance = utterance;

        utterance.rate = this.options.rate || 1.02;
        utterance.pitch = this.options.pitch || 1.0;
        utterance.lang = this.options.lang || "en-US";

        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const preferred =
            voices.find(
              (v) =>
                v.lang.startsWith("en") &&
                (v.name.includes("Natural") ||
                  v.name.includes("Google") ||
                  v.name.includes("Samantha") ||
                  v.name.includes("Victoria") ||
                  v.name.includes("Premium") ||
                  v.name.includes("English"))
            ) ||
            voices.find((v) => v.lang.startsWith("en")) ||
            voices[0];

          if (preferred) {
            utterance.voice = preferred;
          }
        }

        utterance.onend = () => {
          this.currentUtterance = null;
          this.onSpeechFinished();
          resolve();
        };

        utterance.onerror = () => {
          this.currentUtterance = null;
          this.onSpeechFinished();
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        this.onSpeechFinished();
        resolve();
      }
    });
  }

  private onSpeechFinished() {
    if (this.isStopped) {
      this.setState("idle");
      return;
    }

    if (this.options.continuous) {
      this.setState("listening");
      if (this.isFallbackMode) {
        this.startListeningFallback();
      } else {
        this.startListeningNative();
      }
    } else {
      this.setState("idle");
    }
  }

  /**
   * Stop TTS immediately
   */
  public stopTTS() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.currentUtterance = null;
  }

  /**
   * User Voice Interruption: immediately cancel AI speech and listen
   */
  public interrupt() {
    this.stopTTS();
    this.callbacks.onInterrupted?.();
    if (!this.isStopped) {
      this.setState("listening");
      if (this.isFallbackMode) {
        this.startListeningFallback();
      } else {
        this.startListeningNative();
      }
    }
  }

  /**
   * Secondary Fallback STT for browsers without Web Speech API
   * Uses MediaRecorder + Gemini 3.7 Flash Multimodal Audio transcription
   */
  private startListeningFallback() {
    if (!this.mediaStream) return;
    try {
      this.audioChunks = [];
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(this.mediaStream, { mimeType: mime });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) this.audioChunks.push(e.data);
      };

      recorder.onstop = async () => {
        if (this.audioChunks.length === 0 || this.isStopped) return;
        const blob = new Blob(this.audioChunks, { type: mime });
        this.setState("transcribing");

        try {
          const base64 = await blobToBase64(blob);
          if (!base64) return;

          const apiKey = getGeminiApiKey();
          const ai = new GoogleGenAI({ apiKey });
          const resp = await ai.models.generateContent({
            model: "gemini-3.7-flash",
            contents: [
              {
                parts: [
                  { inlineData: { mimeType: mime.split(";")[0], data: base64 } },
                  {
                    text: "Transcribe what the user said in this audio word for word into English. Return ONLY the transcribed text without quotes or explanations. If no words are spoken, return an empty string.",
                  },
                ],
              },
            ],
          });

          const transcript = resp.text?.trim() || "";
          if (transcript) {
            this.callbacks.onFinalTranscript?.(transcript);
            this.callbacks.onUserMessage?.(transcript);
            await this.processWithGeminiTextModel(transcript);
          } else {
            this.setState("listening");
            this.startListeningFallback();
          }
        } catch (err) {
          console.error("[VOICE] Fallback STT error:", err);
          this.setState("listening");
        }
      };

      recorder.start(1000);
      this.mediaRecorder = recorder;
      this.setState("listening");
    } catch (err) {
      console.error("[VOICE] MediaRecorder fallback init failed:", err);
    }
  }

  /**
   * Setup Web Audio analyser to produce live audio waveforms
   */
  private setupAudioAnalyser(stream: MediaStream | null) {
    if (!stream || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx || this.audioCtx.state === "closed") {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {});
      }

      const source = this.audioCtx.createMediaStreamSource(stream);
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      this.analyser = analyser;
    } catch (err) {
      console.warn("[VOICE] AudioContext analyser setup warning:", err);
    }
  }

  /**
   * Visualizer levels loop
   */
  private updateVisualizer(state: VoiceState) {
    clearInterval(this.visualizerInterval);

    if (state === "listening") {
      const dataArray = new Uint8Array(32);
      this.visualizerInterval = setInterval(() => {
        if (this.analyser && !this.isMuted) {
          this.analyser.getByteFrequencyData(dataArray);
          const step = Math.floor(dataArray.length / 12) || 1;
          const levels = Array.from({ length: 12 }, (_, i) => {
            const val = dataArray[i * step] || 0;
            return Math.min(65, Math.max(12, Math.round((val / 255) * 55 + 12)));
          });
          this.callbacks.onAudioLevels?.(levels);
        } else {
          this.callbacks.onAudioLevels?.([14, 20, 28, 36, 26, 18, 30, 24, 16, 26, 18, 12]);
        }
      }, 70);
    } else if (state === "processing" || state === "transcribing") {
      let phase = 0;
      this.visualizerInterval = setInterval(() => {
        phase = (phase + 0.15) % (Math.PI * 2);
        const heights = Array.from({ length: 12 }, (_, i) => {
          const wave = Math.sin(phase + i * 0.45);
          return Math.round(22 + wave * 16);
        });
        this.callbacks.onAudioLevels?.(heights);
      }, 75);
    } else if (state === "speaking") {
      this.visualizerInterval = setInterval(() => {
        const heights = Array.from({ length: 12 }, () => Math.floor(Math.random() * 45) + 20);
        this.callbacks.onAudioLevels?.(heights);
      }, 70);
    } else {
      this.callbacks.onAudioLevels?.([10, 14, 18, 14, 10, 14, 18, 14, 10, 14, 18, 10]);
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((t) => {
        t.enabled = !muted;
      });
    }
  }

  public isUserMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Cleanly stop all components of the pipeline
   */
  public stop() {
    this.isStopped = true;
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    clearInterval(this.visualizerInterval);

    // Stop recognition
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }
    this.isRecognitionActive = false;

    // Stop media recorder
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {}
      this.mediaRecorder = null;
    }

    // Stop microphone stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    // Stop audio context
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }

    // Stop TTS
    this.stopTTS();

    this.currentSpokenText = "";
    this.setState("idle");
  }
}
