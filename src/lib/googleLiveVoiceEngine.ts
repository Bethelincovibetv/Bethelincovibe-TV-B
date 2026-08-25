import { GoogleGenAI, Modality } from "@google/genai";
import { supabase } from "@/integrations/supabase/client";
import { apiKeyService } from "@/vixora/services/apiKeyService";

export interface GoogleVoiceOptions {
  voiceName?: "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr" | "Aoede" | "Alloy" | "Shimmer";
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
 * Retrieve active Gemini API Key with safe fallback chain
 */
export function getGeminiApiKey(): string {
  try {
    const credsKey = apiKeyService.getCredentials().geminiApiKey;
    if (credsKey && credsKey.trim().length > 10) return credsKey.trim();
  } catch {}
  
  const envKey =
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (typeof process !== "undefined" ? (process as any).env?.GEMINI_API_KEY : "");
  if (envKey && String(envKey).trim().length > 10) return String(envKey).trim();
  
  return "AIzaSyAeCyBC9daZbvXNRtfLjxBWwpF3MwXJggk";
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
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Float32Array PCM samples to 16-bit signed PCM Uint8Array
 */
export function floatTo16BitPCM(samples: Float32Array): Uint8Array {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buffer);
}

/**
 * Convert PCM Uint8Array to standard RIFF WAVE buffer
 */
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
  view.setUint16(20, 1, true); // Linear PCM
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
 * Helper to detect browser supported audio mime types for MediaRecorder
 */
export function getSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/wav",
  ];
  for (const t of types) {
    try {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    } catch {}
  }
  return "";
}

/**
 * High-Speed Speech-to-Text Transcriber powered by Google Gemini Multimodal Audio API.
 * Converts captured audio streams into accurate text transcripts.
 */
export async function transcribeAudioWithAI(
  audioData: Blob | ArrayBuffer,
  mimeType = "audio/webm"
): Promise<string> {
  try {
    const apiKey = getGeminiApiKey();
    const ai = new GoogleGenAI({ apiKey });

    let base64Data = "";
    let finalMime = mimeType;

    if (audioData instanceof Blob) {
      if (audioData.size < 1000) return ""; // Too small, just a click/pop
      base64Data = await blobToBase64(audioData);
      finalMime = audioData.type || mimeType || "audio/webm";
    } else if (audioData instanceof ArrayBuffer) {
      if (audioData.byteLength < 1000) return "";
      base64Data = arrayBufferToBase64(audioData);
      finalMime = mimeType || "audio/wav";
    }

    if (!base64Data) return "";

    // Strip extra codecs parameters for Gemini parts inlineData mimeType
    const cleanMime = finalMime.split(";")[0].trim() || "audio/webm";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: base64Data,
              },
            },
            {
              text: "Listen to the user's spoken audio carefully and transcribe what they said verbatim into English text. Return ONLY the transcribed text without quotes, punctuation additions, markdown, or commentary. If the audio contains only background silence, static, or unintelligible noise, return nothing.",
            },
          ],
        },
      ],
    });

    const rawTranscript = response.text || "";
    const cleanTranscript = rawTranscript
      .replace(/^["'`\s]+|["'`\s]+$/g, "")
      .replace(/\n+/g, " ")
      .trim();

    return cleanTranscript;
  } catch (err) {
    console.warn("Direct Gemini audio transcription fallback:", err);
    return "";
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
 * Synthesize speech using Google Gemini TTS with specified Voice Persona
 */
export async function synthesizeGoogleVoice(
  text: string,
  voiceName: string = "Aoede"
): Promise<ArrayBuffer | null> {
  const clean = cleanTextForSpeech(text);
  if (!clean) return null;

  // 1. Try Supabase Edge Function 'tts'
  try {
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

  // 2. Try direct Google GenAI SDK
  try {
    const apiKey = getGeminiApiKey();
    if (apiKey && apiKey.trim().length > 10) {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: clean }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: (voiceName as any) || "Aoede" },
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
    console.warn("Direct Google Gemini TTS notice:", sdkErr);
  }

  return null;
}

/**
 * Intelligent Google & Vixora Live Voice Agent
 * Features:
 * - Hybrid Speech-to-Text: Parallel WebSpeech API + Continuous Audio MediaRecorder + Gemini Multimodal STT
 * - Real-time Voice Activity Detection (VAD) with adaptive noise calibration
 * - Hands-free continuous conversation loop with instant turnaround
 * - High-fidelity Gemini TTS voice synthesis with browser voice fallback
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

  // Audio Stream, DSP Filters & Analyser
  private micStream: MediaStream | null = null;
  private micAudioCtx: AudioContext | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private scriptProcessorNode: ScriptProcessorNode | null = null;
  private highPassFilter: BiquadFilterNode | null = null;
  private lowPassFilter: BiquadFilterNode | null = null;
  private ambientNoiseFloor = 0.015;

  // Audio Recording Buffer & MediaRecorder
  private mediaRecorder: MediaRecorder | null = null;
  private recordedAudioChunks: Blob[] = [];
  private pcmAudioChunks: Float32Array[] = [];
  private pcmSampleCount = 0;

  // Silence & VAD Timers
  private vadInterval: any = null;
  private silenceTimer: any = null;
  private restartTimeout: any = null;
  private lastSpeechTimestamp = 0;
  private speechStartTimestamp = 0;
  private hasDetectedVoiceInCurrentTurn = false;
  private currentTranscript = "";
  private accumulatedFinalTranscript = "";

  // Playback Audio Context
  private audioCtx: AudioContext | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;

  // Visualizer Animation
  private visualizerInterval: any = null;

  constructor(options: GoogleVoiceOptions = {}, callbacks: VoiceAgentCallbacks = {}) {
    this.options = {
      voiceName: (options.voiceName as any) || "Aoede",
      lang: options.lang || "en-US",
      silenceTimeoutMs: options.silenceTimeoutMs || 1100,
      continuous: options.continuous ?? true,
      pitch: options.pitch || 1.0,
      rate: options.rate || 1.0,
    };
    this.callbacks = callbacks;
  }

  public updateCallbacks(callbacks: VoiceAgentCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public setVoiceConfig(cfg: Partial<GoogleVoiceOptions>) {
    this.options = { ...this.options, ...(cfg as any) };
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

  private setHardwareMicEnabled(enabled: boolean) {
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Real-time RMS audio level with dynamic noise floor tracking
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
      
      // Adapt ambient noise floor during quiet moments
      if (rms < 0.04) {
        this.ambientNoiseFloor = this.ambientNoiseFloor * 0.95 + rms * 0.05;
      }
      return rms;
    } catch {
      return 0;
    }
  }

  /**
   * Configure Web Audio DSP pipeline and AudioWorklet/ScriptProcessor PCM tap
   */
  private setupMicAnalyser(stream: MediaStream) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.micAudioCtx || this.micAudioCtx.state === "closed") {
        this.micAudioCtx = new AudioContextClass();
      }
      if (this.micAudioCtx.state === "suspended") {
        this.micAudioCtx.resume().catch(() => {});
      }

      // Highpass (85Hz) & Lowpass (7500Hz) filtering for crisp vocal frequency passband
      this.highPassFilter = this.micAudioCtx.createBiquadFilter();
      this.highPassFilter.type = "highpass";
      this.highPassFilter.frequency.setValueAtTime(85, this.micAudioCtx.currentTime);
      this.highPassFilter.Q.setValueAtTime(0.7, this.micAudioCtx.currentTime);

      this.lowPassFilter = this.micAudioCtx.createBiquadFilter();
      this.lowPassFilter.type = "lowpass";
      this.lowPassFilter.frequency.setValueAtTime(7500, this.micAudioCtx.currentTime);
      this.lowPassFilter.Q.setValueAtTime(0.7, this.micAudioCtx.currentTime);

      this.micAnalyser = this.micAudioCtx.createAnalyser();
      this.micAnalyser.fftSize = 64;
      this.micAnalyser.smoothingTimeConstant = 0.7;

      this.micSourceNode = this.micAudioCtx.createMediaStreamSource(stream);

      // Connect DSP chain
      this.micSourceNode.connect(this.highPassFilter);
      this.highPassFilter.connect(this.lowPassFilter);
      this.lowPassFilter.connect(this.micAnalyser);

      // Connect ScriptProcessor to capture raw PCM Float32 samples as lossless audio buffer
      try {
        this.scriptProcessorNode = this.micAudioCtx.createScriptProcessor(4096, 1, 1);
        this.scriptProcessorNode.onaudioprocess = (e) => {
          if (!this.isListeningActive || this.isProcessingActive || this.isSpeakingActive) {
            return;
          }
          const inputData = e.inputBuffer.getChannelData(0);
          // Only store samples if user is speaking or just started to prevent memory leak
          if (this.hasDetectedVoiceInCurrentTurn || this.pcmAudioChunks.length > 0) {
            const chunk = new Float32Array(inputData);
            this.pcmAudioChunks.push(chunk);
            this.pcmSampleCount += chunk.length;
            // Cap at 30 seconds of audio buffer
            if (this.pcmSampleCount > 48000 * 30) {
              this.pcmAudioChunks.shift();
            }
          }
        };
        this.lowPassFilter.connect(this.scriptProcessorNode);
        // Connect to a silent dummy gain node (not destination) so onaudioprocess fires
        const dummyGain = this.micAudioCtx.createGain();
        dummyGain.gain.setValueAtTime(0, this.micAudioCtx.currentTime);
        this.scriptProcessorNode.connect(dummyGain);
      } catch (procErr) {
        console.warn("ScriptProcessor tap fallback:", procErr);
      }
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
          const heights = [12, 18, 24, 30, 26, 20, 28, 22, 16, 24, 18, 12];
          this.callbacks.onAudioLevels?.(heights);
        }
      }, 70);
    } else if (state === "processing") {
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
   * Start Live Voice Session with microphone permission verification
   */
  public async start(welcomeMessage?: string): Promise<boolean> {
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

    if (welcomeMessage && welcomeMessage.trim()) {
      this.callbacks.onAIResponse?.(welcomeMessage);
      await this.speak(welcomeMessage);
    } else {
      this.startListeningCycle();
    }

    return true;
  }

  /**
   * Start Continuous Recording & Speech Recognition Cycle
   */
  public startListeningCycle() {
    if (!this.isListeningActive || this.isSpeakingActive || this.isProcessingActive) {
      return;
    }

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    // Re-enable microphone track
    this.setHardwareMicEnabled(true);
    this.setState("listening");

    // Reset turn buffers
    this.currentTranscript = "";
    this.accumulatedFinalTranscript = "";
    this.hasDetectedVoiceInCurrentTurn = false;
    this.lastSpeechTimestamp = 0;
    this.speechStartTimestamp = 0;
    this.recordedAudioChunks = [];
    this.pcmAudioChunks = [];
    this.pcmSampleCount = 0;

    // 1. Initialize MediaRecorder on micStream for high-accuracy Gemini STT
    if (this.micStream && typeof MediaRecorder !== "undefined") {
      try {
        if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
          try {
            this.mediaRecorder.stop();
          } catch {}
        }
        const mimeType = getSupportedAudioMimeType();
        this.mediaRecorder = new MediaRecorder(
          this.micStream,
          mimeType ? { mimeType } : undefined
        );
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.recordedAudioChunks.push(e.data);
          }
        };
        this.mediaRecorder.start(150); // 150ms time slices
      } catch (recErr) {
        console.warn("MediaRecorder start notice:", recErr);
      }
    }

    // 2. Initialize WebSpeech Recognition in parallel for immediate live interim subtitles
    this.startBrowserSpeechRecognition();

    // 3. Start Continuous Voice Activity Detection (VAD) & Silence Tracker
    this.startVadMonitor();
  }

  /**
   * Launch Web Speech API if supported in browser
   */
  private startBrowserSpeechRecognition() {
    try {
      const SpeechRecognition =
        typeof window !== "undefined"
          ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
          : null;

      if (!SpeechRecognition) return;

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
      rec.lang = this.options.lang || "en-US";

      rec.onstart = () => {
        this.isRecognitionRunning = true;
      };

      rec.onresult = (event: any) => {
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
        if (activeDisplay.length > 0) {
          this.currentTranscript = activeDisplay;
          this.callbacks.onInterimTranscript?.(activeDisplay);
          this.hasDetectedVoiceInCurrentTurn = true;
          this.lastSpeechTimestamp = Date.now();
        }
      };

      rec.onerror = (event: any) => {
        // Silently tolerate non-fatal WebSpeech disconnects/no-speech
        if (event.error === "not-allowed") {
          this.callbacks.onError?.("Microphone permission denied.");
          this.setState("mic-denied");
        }
      };

      rec.onend = () => {
        this.isRecognitionRunning = false;
      };

      rec.start();
    } catch (e) {
      console.warn("WebSpeech recognition notice:", e);
    }
  }

  /**
   * Continuous VAD Monitor: Samples RMS volume and checks speech onset & silence pause
   */
  private startVadMonitor() {
    clearInterval(this.vadInterval);

    this.vadInterval = setInterval(() => {
      if (!this.isListeningActive || this.isProcessingActive || this.isSpeakingActive) {
        return;
      }

      const rms = this.getCurrentMicRms();
      const speechThreshold = Math.max(0.02, this.ambientNoiseFloor * 1.5 + 0.015);
      const isVoiceActive = rms > speechThreshold;

      if (isVoiceActive) {
        if (!this.hasDetectedVoiceInCurrentTurn) {
          this.hasDetectedVoiceInCurrentTurn = true;
          this.speechStartTimestamp = Date.now();
        }
        this.lastSpeechTimestamp = Date.now();

        // Clear any pending silence commit timer while user is actively talking
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
      } else if (this.hasDetectedVoiceInCurrentTurn) {
        const timeSinceSpeech = Date.now() - this.lastSpeechTimestamp;
        const totalSpeechDuration = this.lastSpeechTimestamp - this.speechStartTimestamp;

        // User spoke for at least 350ms and has now paused for silenceTimeoutMs
        if (totalSpeechDuration >= 350 && timeSinceSpeech >= this.options.silenceTimeoutMs) {
          if (!this.silenceTimer) {
            this.silenceTimer = setTimeout(() => {
              this.silenceTimer = null;
              this.commitAndProcessUserSpeech();
            }, 100);
          }
        }
      }
    }, 60);
  }

  /**
   * Manually trigger immediate submission of spoken text (e.g. from "Send Now" button)
   */
  public submitSpokenNow() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.commitAndProcessUserSpeech();
  }

  /**
   * Finalize the spoken turn, transcribe audio via Gemini STT (if WebSpeech didn't provide text),
   * and pass the transcribed prompt to the AI coach.
   */
  private async commitAndProcessUserSpeech() {
    if (this.isProcessingActive || this.isSpeakingActive || !this.isListeningActive) {
      return;
    }

    clearInterval(this.vadInterval);
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    this.isProcessingActive = true;
    this.setState("processing");
    this.setHardwareMicEnabled(false);

    // Stop WebSpeech
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

    // Stop MediaRecorder and assemble recorded Blob
    let audioBlob: Blob | null = null;
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }

    if (this.recordedAudioChunks.length > 0) {
      const mime = getSupportedAudioMimeType() || "audio/webm";
      audioBlob = new Blob(this.recordedAudioChunks, { type: mime });
    }

    // Build PCM WAV fallback if Blob is empty or tiny
    let wavBuffer: ArrayBuffer | null = null;
    if ((!audioBlob || audioBlob.size < 1200) && this.pcmAudioChunks.length > 0) {
      try {
        let totalLen = 0;
        for (const chunk of this.pcmAudioChunks) totalLen += chunk.length;
        const mergedFloat = new Float32Array(totalLen);
        let offset = 0;
        for (const chunk of this.pcmAudioChunks) {
          mergedFloat.set(chunk, offset);
          offset += chunk.length;
        }
        const pcm16 = floatTo16BitPCM(mergedFloat);
        const sampleRate = this.micAudioCtx?.sampleRate || 48000;
        wavBuffer = buildWavFromPcm(pcm16, sampleRate, 1, 16);
      } catch (pcmErr) {
        console.warn("PCM WAV fallback error:", pcmErr);
      }
    }

    let finalSpokenText = this.currentTranscript.trim();

    // If WebSpeech was empty or short (< 2 characters), transcribe the recorded audio with Gemini STT!
    if (!finalSpokenText || finalSpokenText.length < 2) {
      try {
        if (audioBlob && audioBlob.size > 800) {
          const aiTranscript = await transcribeAudioWithAI(audioBlob, audioBlob.type);
          if (aiTranscript && aiTranscript.length >= 2) {
            finalSpokenText = aiTranscript;
          }
        } else if (wavBuffer && wavBuffer.byteLength > 1000) {
          const aiTranscript = await transcribeAudioWithAI(wavBuffer, "audio/wav");
          if (aiTranscript && aiTranscript.length >= 2) {
            finalSpokenText = aiTranscript;
          }
        }
      } catch (sttErr) {
        console.warn("Gemini speech-to-text pipeline fallback:", sttErr);
      }
    }

    // If still empty (e.g. user made no vocalization, only silence/clicks), return smoothly to listening
    if (!finalSpokenText || finalSpokenText.length < 2) {
      this.isProcessingActive = false;
      this.currentTranscript = "";
      this.accumulatedFinalTranscript = "";
      if (this.isListeningActive && this.options.continuous) {
        setTimeout(() => {
          if (this.isListeningActive && !this.isSpeakingActive && !this.isProcessingActive) {
            this.startListeningCycle();
          }
        }, 200);
      } else {
        this.setState("idle");
      }
      return;
    }

    // Display the final transcribed user query in the UI
    this.currentTranscript = finalSpokenText;
    this.callbacks.onInterimTranscript?.(finalSpokenText);
    this.callbacks.onFinalTranscript?.(finalSpokenText);

    // Pass the transcript to the AI Business Coach handler
    try {
      let aiResponseText = "";
      if (this.callbacks.onUserFinishedSpeaking) {
        const res = await this.callbacks.onUserFinishedSpeaking(finalSpokenText);
        if (typeof res === "string") {
          aiResponseText = res;
        }
      }

      this.isProcessingActive = false;

      if (aiResponseText && aiResponseText.trim()) {
        this.callbacks.onAIResponse?.(aiResponseText);
        await this.speak(aiResponseText);
      } else {
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
   * Speak response using Gemini TTS or Web Speech Synthesis fallback
   */
  public async speak(text: string): Promise<void> {
    this.isSpeakingActive = true;
    this.isProcessingActive = false;
    this.setHardwareMicEnabled(false);

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

    this.setState("speaking");

    try {
      const wavBuffer = await synthesizeGoogleVoice(text, this.options.voiceName);
      if (wavBuffer) {
        await this.playAudioBuffer(wavBuffer);
        return;
      }
    } catch (err) {
      console.warn("TTS playback fallback to browser voice:", err);
    }

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
          console.warn("Audio buffer playback error:", e);
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
   * Browser Speech Synthesis fallback
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

    clearInterval(this.vadInterval);
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    clearInterval(this.visualizerInterval);

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    this.mediaRecorder = null;
    this.recordedAudioChunks = [];
    this.pcmAudioChunks = [];

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

    if (this.scriptProcessorNode) {
      try {
        this.scriptProcessorNode.disconnect();
      } catch {}
      this.scriptProcessorNode = null;
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

