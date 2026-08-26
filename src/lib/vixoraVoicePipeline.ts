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
 * Request user microphone access
 */
export async function requestMicrophoneAccess(): Promise<{
  granted: boolean;
  error?: string;
  stream?: MediaStream;
}> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      granted: false,
      error: "Voice input isn't supported on this browser. Please try another browser.",
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
        ? "Microphone permission is required for voice conversations. Please allow microphone access."
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
    .slice(0, 4000);
}

/**
 * Reliable Speech-To-Text → Gemini LLM → Text-To-Speech Voice Engine
 * 
 * Pipeline:
 * MICROPHONE → REAL SPEECH-TO-TEXT → USER TRANSCRIPT → GEMINI TEXT MODEL → AI RESPONSE TEXT → TTS → AI VOICE
 */
export class VixoraVoicePipeline {
  private state: VoiceState = "idle";
  private options: Required<VoicePipelineOptions>;
  private callbacks: VoicePipelineCallbacks;

  // Speech Recognition (Primary STT)
  private recognition: any = null;
  private isRecognitionActive = false;
  private silenceTimer: any = null;
  private interimTranscript = "";
  private accumulatedFinalTranscript = "";
  private hasSpokenInTurn = false;

  // Fallback Audio Recorder (Secondary STT if Web Speech API unsupported)
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;

  // TTS Speech Synthesis
  private isSpeaking = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  // Visualizer
  private visualizerInterval: any = null;
  private isMuted = false;
  private isStopped = false;

  constructor(options: VoicePipelineOptions = {}, callbacks: VoicePipelineCallbacks = {}) {
    const coachName = options.coachName || "Coach Bethel Goodgift";
    const ctx = options.businessContext || {};
    const defaultPrompt =
      options.systemPrompt ||
      `You are ${coachName}, the Chief AI Business Strategist at BTV & Bethelincovibe.
You provide tactical, high-converting business advice, pricing models, marketing strategies, Nigerian & Global market insights, and step-by-step action plans.
${ctx.business_name ? `Business Name: ${ctx.business_name}` : ""}
${ctx.industry ? `Industry: ${ctx.industry}` : ""}
${ctx.stage ? `Stage: ${ctx.stage}` : ""}
${ctx.goal ? `Primary Goal: ${ctx.goal}` : ""}
${ctx.monthly_revenue ? `Monthly Revenue: ${ctx.monthly_revenue}` : ""}
Tone: Authoritative, motivating, practical, and conversational.
Keep responses concise and direct for spoken conversation (2 to 4 punchy, spoken sentences). Do not use markdown asterisks or bullet lists.`;

    this.options = {
      voiceName: options.voiceName || "Aoede",
      lang: options.lang || "en-US",
      silenceTimeoutMs: options.silenceTimeoutMs || 1200,
      continuous: options.continuous ?? true,
      pitch: options.pitch || 1.0,
      rate: options.rate || 1.0,
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
    console.log(`[VOICE] state transition: ${this.state} -> ${state}`);
    this.state = state;
    this.callbacks.onStateChange?.(state);
    this.updateVisualizer(state);
  }

  /**
   * Start the Voice Pipeline
   */
  public async start(): Promise<boolean> {
    this.isStopped = false;
    this.stopTTS();
    this.setState("connecting");

    console.log("[VOICE] microphone requested");

    // 1. Check & request microphone permission
    const micRes = await requestMicrophoneAccess();
    if (!micRes.granted) {
      console.warn("[VOICE] microphone permission denied:", micRes.error);
      this.setState("mic-denied");
      this.callbacks.onPermissionChange?.("denied", micRes.error);
      this.callbacks.onError?.(
        micRes.error || "Microphone permission is required for voice conversations."
      );
      return false;
    }

    this.mediaStream = micRes.stream || null;
    this.callbacks.onPermissionChange?.("granted");
    console.log("[VOICE] microphone permission granted");

    // Setup Web Audio Analyser for accurate visualizer levels
    this.setupAudioAnalyser(this.mediaStream);

    // 2. Initialize Speech-to-Text
    const SpeechRecognition =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (SpeechRecognition) {
      this.initNativeSpeechRecognition(SpeechRecognition);
      this.startListeningNative();
    } else {
      console.log("[VOICE] Native SpeechRecognition not available, using Gemini Audio STT fallback");
      this.startListeningFallback();
    }

    return true;
  }

  /**
   * Initialize native browser SpeechRecognition API
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
        console.log("[VOICE] speech recognition started");
        this.isRecognitionActive = true;
        if (this.state !== "processing" && this.state !== "speaking") {
          this.setState("listening");
        }
      };

      recognition.onspeechstart = () => {
        console.log("[VOICE] speech detected");
        this.hasSpokenInTurn = true;
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
      };

      recognition.onresult = (event: any) => {
        if (this.state === "processing" || this.state === "speaking") return;

        let interim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const transcript = res[0]?.transcript || "";
          if (res.isFinal) {
            finalChunk += " " + transcript;
          } else {
            interim += transcript;
          }
        }

        if (finalChunk.trim()) {
          this.accumulatedFinalTranscript = (
            this.accumulatedFinalTranscript +
            " " +
            finalChunk.trim()
          ).trim();
          console.log("[VOICE] final transcript chunk:", this.accumulatedFinalTranscript);
        }

        const currentDisplay = (
          this.accumulatedFinalTranscript +
          (interim ? (this.accumulatedFinalTranscript ? " " : "") + interim : "")
        ).trim();

        if (currentDisplay) {
          this.interimTranscript = currentDisplay;
          console.log("[VOICE] interim transcript:", currentDisplay);
          this.callbacks.onInterimTranscript?.(currentDisplay);
          this.hasSpokenInTurn = true;
        }

        // Reset silence detection timer whenever user says a word
        this.resetSilenceTimer();
      };

      recognition.onerror = (event: any) => {
        console.warn("[VOICE] speech recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          this.setState("mic-denied");
          this.callbacks.onError?.(
            "Microphone permission is required for voice conversations. Please check your browser settings."
          );
        } else if (event.error === "no-speech") {
          // Normal timeout if user was silent, we keep listening unless stopped
          if (this.hasSpokenInTurn && this.accumulatedFinalTranscript.trim()) {
            this.finalizeAndSendTranscript();
          }
        } else if (event.error === "network") {
          console.warn("[VOICE] Speech recognition network glitch, attempting quick restart");
        } else {
          this.callbacks.onError?.("I couldn't understand that. Please try again.");
        }
      };

      recognition.onend = () => {
        console.log("[VOICE] speech recognition ended");
        this.isRecognitionActive = false;

        // If stopped intentionally or processing/speaking, do not auto-restart
        if (this.isStopped) return;

        if (this.hasSpokenInTurn && (this.accumulatedFinalTranscript.trim() || this.interimTranscript.trim())) {
          this.finalizeAndSendTranscript();
          return;
        }

        // If still in listening state and continuous, restart recognition
        if (this.state === "listening" && !this.isStopped) {
          try {
            recognition.start();
          } catch {}
        }
      };

      this.recognition = recognition;
    } catch (err) {
      console.error("[VOICE] Failed to initialize SpeechRecognition:", err);
    }
  }

  private startListeningNative() {
    this.accumulatedFinalTranscript = "";
    this.interimTranscript = "";
    this.hasSpokenInTurn = false;

    if (!this.recognition) return;
    try {
      this.recognition.start();
    } catch (err: any) {
      // If already started, ignore error
      if (!err.message?.includes("already started")) {
        console.warn("[VOICE] Error starting recognition:", err);
      }
    }
  }

  /**
   * Reset silence timer to auto-send when the user stops speaking
   */
  private resetSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);

    this.silenceTimer = setTimeout(() => {
      const textToFinalize = (
        this.accumulatedFinalTranscript || this.interimTranscript
      ).trim();

      if (textToFinalize && textToFinalize.length >= 2 && this.state === "listening") {
        console.log("[VOICE] Silence detected. Finalizing user speech:", textToFinalize);
        this.finalizeAndSendTranscript();
      }
    }, this.options.silenceTimeoutMs);
  }

  /**
   * Finalize the transcript and send it to the AI Business Coach
   */
  public async finalizeAndSendTranscript() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);

    const finalText = (
      this.accumulatedFinalTranscript || this.interimTranscript
    ).trim();

    // Reset transcription buffers
    this.accumulatedFinalTranscript = "";
    this.interimTranscript = "";
    this.hasSpokenInTurn = false;
    this.callbacks.onInterimTranscript?.("");

    if (!finalText || finalText.length < 2) {
      console.log("[VOICE] No speech captured or empty transcript.");
      if (this.state === "listening" && !this.isStopped) {
        // Keep listening
        return;
      }
      return;
    }

    console.log("[VOICE] final transcript:", finalText);
    this.callbacks.onFinalTranscript?.(finalText);
    this.callbacks.onUserMessage?.(finalText);

    // Stop recognition while AI is thinking/speaking
    if (this.recognition && this.isRecognitionActive) {
      try {
        this.recognition.stop();
      } catch {}
    }

    // Send to Gemini LLM
    await this.processWithGemini(finalText);
  }

  /**
   * Send finalized transcript to Gemini Text Model / AI Business Coach
   */
  private async processWithGemini(userText: string) {
    this.setState("processing");
    console.log("[VOICE] sending transcript to AI:", userText);

    let replyText = "";

    try {
      // 1. Try Supabase Edge Function
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
      } catch (e) {
        console.warn("[VOICE] Supabase function fallback to direct Gemini:", e);
      }

      // 2. Direct Gemini Text Model (gemini-3.7-flash)
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
                  text: `${this.options.systemPrompt}\n\nUser Spoken Question: "${userText}"\n\nProvide a high-impact, actionable spoken response in 2-3 sentences.`,
                },
              ],
            },
          ],
        });

        replyText =
          response.text?.trim() ||
          "Here is what I recommend for your business growth: focus on high-converting client outreach and optimizing your pricing margin today.";
      }

      console.log("[VOICE] AI response received:", replyText);
      this.callbacks.onAIResponse?.(replyText);

      // 3. Send AI response to Text-To-Speech
      await this.speakWithTTS(replyText);
    } catch (err: any) {
      console.error("[VOICE] AI generation error:", err);
      this.setState("error");
      this.callbacks.onError?.("I couldn't generate a response right now. Please try again.");

      // Resume listening after 2 seconds if continuous
      if (this.options.continuous && !this.isStopped) {
        setTimeout(() => {
          if (!this.isStopped) {
            this.setState("listening");
            this.startListeningNative();
          }
        }, 2000);
      }
    }
  }

  /**
   * Text-To-Speech using Web Speech Synthesis API
   */
  private async speakWithTTS(text: string): Promise<void> {
    const cleanSpeech = cleanTextForSpeech(text);
    if (!cleanSpeech) {
      this.onSpeechEnd();
      return;
    }

    if (typeof window === "undefined" || !window.speechSynthesis) {
      console.warn("[VOICE] SpeechSynthesis not supported");
      this.callbacks.onError?.("The response is ready, but I couldn't play the voice.");
      this.onSpeechEnd();
      return;
    }

    console.log("[VOICE] sending response to TTS:", cleanSpeech);
    this.stopTTS();
    this.setState("speaking");

    return new Promise((resolve) => {
      try {
        const utterance = new SpeechSynthesisUtterance(cleanSpeech);
        this.currentUtterance = utterance;

        utterance.rate = this.options.rate || 1.02;
        utterance.pitch = this.options.pitch || 1.0;
        utterance.lang = this.options.lang || "en-US";

        // Select the most natural voice available
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
                  v.name.includes("Premium"))
            ) ||
            voices.find((v) => v.lang.startsWith("en")) ||
            voices[0];

          if (preferred) {
            utterance.voice = preferred;
          }
        }

        utterance.onstart = () => {
          console.log("[VOICE] TTS playback started");
          this.isSpeaking = true;
        };

        utterance.onend = () => {
          console.log("[VOICE] TTS playback finished");
          this.isSpeaking = false;
          this.currentUtterance = null;
          this.onSpeechEnd();
          resolve();
        };

        utterance.onerror = (e) => {
          console.warn("[VOICE] TTS playback error/cancel:", e);
          this.isSpeaking = false;
          this.currentUtterance = null;
          this.onSpeechEnd();
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error("[VOICE] TTS execution error:", err);
        this.isSpeaking = false;
        this.onSpeechEnd();
        resolve();
      }
    });
  }

  private onSpeechEnd() {
    if (this.isStopped) {
      this.setState("idle");
      return;
    }

    if (this.options.continuous) {
      console.log("[VOICE] Ready for next spoken turn");
      this.setState("listening");
      this.startListeningNative();
    } else {
      this.setState("idle");
    }
  }

  /**
   * Stop Text-To-Speech immediately
   */
  public stopTTS() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  /**
   * Interrupt current AI speech and resume listening immediately
   */
  public interrupt() {
    console.log("[VOICE] User interrupted speech");
    this.stopTTS();
    this.callbacks.onInterrupted?.();
    if (!this.isStopped) {
      this.setState("listening");
      this.startListeningNative();
    }
  }

  /**
   * Fallback STT for browsers without Web Speech API
   * Uses MediaRecorder to capture audio and Gemini Multimodal audio transcription
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
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = ((reader.result as string) || "").split(",")[1];
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
                      text: "Transcribe what the user said in this audio word for word into English. Return ONLY the transcribed text without quotes or explanations.",
                    },
                  ],
                },
              ],
            });

            const transcript = resp.text?.trim() || "";
            if (transcript) {
              this.callbacks.onFinalTranscript?.(transcript);
              this.callbacks.onUserMessage?.(transcript);
              await this.processWithGemini(transcript);
            } else {
              this.setState("listening");
            }
          };
          reader.readAsDataURL(blob);
        } catch (err) {
          console.error("[VOICE] Gemini audio STT fallback failed:", err);
          this.setState("error");
        }
      };

      recorder.start(500);
      this.mediaRecorder = recorder;
      this.setState("listening");
    } catch (err) {
      console.error("[VOICE] Fallback recorder setup failed:", err);
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
      console.warn("[VOICE] Could not setup AudioContext analyser:", err);
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
    console.log("[VOICE] pipeline stopped");
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

    this.accumulatedFinalTranscript = "";
    this.interimTranscript = "";
    this.setState("idle");
  }
}
