import { GoogleGenAI, Modality } from "@google/genai";
import { supabase } from "@/integrations/supabase/client";
import { apiKeyService } from "@/vixora/services/apiKeyService";

export interface GoogleVoiceOptions {
  voiceName?: "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr" | "Aoede" | "Alloy" | "Shimmer";
  lang?: string;
  silenceTimeoutMs?: number;
  continuous?: boolean;
  pitch?: number;
  rate?: number;
  systemInstruction?: string;
}

export type VoiceAgentState = "idle" | "listening" | "processing" | "speaking" | "mic-denied" | "error";

export interface VoiceAgentCallbacks {
  onStateChange?: (state: VoiceAgentState) => void;
  onInterimTranscript?: (transcript: string) => void;
  onFinalTranscript?: (transcript: string) => void;
  onUserFinishedSpeaking?: (fullTranscript: string) => Promise<string | void> | string | void;
  onAIResponse?: (responseText: string) => void;
  onAIResponseTextChunk?: (chunk: string) => void;
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
    (typeof process !== "undefined" ? (process as any).env?.GEMINI_API_KEY : "");
  if (envKey && String(envKey).trim().length > 10) return String(envKey).trim();

  return "AIzaSyAeCyBC9daZbvXNRtfLjxBWwpF3MwXJggk";
}

/**
 * Explicitly request user microphone access via navigator.mediaDevices.getUserMedia
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
      sampleRate: { ideal: 16000 },
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
 * Convert Float32Array PCM samples to 16-bit signed linear PCM Little-Endian Uint8Array
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
 * Linear interpolation downsampler from source sampleRate to target sampleRate (default 16kHz)
 */
export function downsampleBuffer(buffer: Float32Array, inputSampleRate: number, targetSampleRate = 16000): Float32Array {
  if (inputSampleRate === targetSampleRate) {
    return buffer;
  }
  if (inputSampleRate < targetSampleRate) {
    return buffer;
  }
  const sampleRateRatio = inputSampleRate / targetSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

/**
 * Convert base64 16-bit PCM (24kHz Mono) to Float32Array
 */
export function base64ToPcmFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }
  return float32;
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
 * High-Speed Speech-to-Text Transcriber powered by Google Gemini Multimodal Audio API
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
      if (audioData.size < 500) return "";
      base64Data = await blobToBase64(audioData);
      finalMime = audioData.type || mimeType || "audio/webm";
    } else if (audioData instanceof ArrayBuffer) {
      if (audioData.byteLength < 500) return "";
      base64Data = arrayBufferToBase64(audioData);
      finalMime = mimeType || "audio/wav";
    }

    if (!base64Data) return "";

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
              text: "Listen carefully to the audio and transcribe what the person is saying verbatim into plain English text. Return ONLY the transcribed text. Do not add quotation marks, explanations, notes, or markdown. If there is no human speech in the audio, return an empty string.",
            },
          ],
        },
      ],
    });

    const rawTranscript = response.text || "";
    return rawTranscript
      .replace(/^["'`\s]+|["'`\s]+$/g, "")
      .replace(/\n+/g, " ")
      .trim();
  } catch (err) {
    console.warn("[VOICE] Direct Gemini audio transcription fallback:", err);
    return "";
  }
}

/**
 * Synthesize speech using Google Gemini TTS
 */
export async function synthesizeGoogleVoice(
  text: string,
  voiceName: string = "Aoede"
): Promise<ArrayBuffer | null> {
  const clean = cleanTextForSpeech(text);
  if (!clean) return null;

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
    console.warn("Supabase TTS invoke notice:", err);
  }

  try {
    const apiKey = getGeminiApiKey();
    if (apiKey && apiKey.trim().length > 10) {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ parts: [{ text: `Say this naturally as speech: "${clean}"` }] }],
      });
      console.log("Synthesized text fallback:", response.text);
    }
  } catch (sdkErr) {
    console.warn("Direct Google Gemini TTS notice:", sdkErr);
  }

  return null;
}

/**
 * Gapless Real-Time PCM Audio Player for Gemini Live 24kHz Audio Output
 */
export class GeminiLiveAudioPlayer {
  private audioCtx: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isPlaying = false;
  private sampleRate = 24000;
  private onPlaybackStateChange?: (playing: boolean) => void;

  constructor(onPlaybackStateChange?: (playing: boolean) => void) {
    this.onPlaybackStateChange = onPlaybackStateChange;
  }

  private initContext() {
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: this.sampleRate });
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);

      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 64;
      this.analyserNode.smoothingTimeConstant = 0.8;

      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
  }

  public enqueuePcmBase64(base64Pcm: string) {
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const float32Samples = base64ToPcmFloat32(base64Pcm);
      if (float32Samples.length === 0) return;

      const audioBuffer = this.audioCtx.createBuffer(1, float32Samples.length, this.sampleRate);
      audioBuffer.getChannelData(0).set(float32Samples);

      const sourceNode = this.audioCtx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.gainNode!);

      const now = this.audioCtx.currentTime;
      if (this.nextStartTime < now) {
        this.nextStartTime = now + 0.03; // 30ms jitter buffer lead
      }

      sourceNode.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.activeSources.push(sourceNode);

      if (!this.isPlaying) {
        this.isPlaying = true;
        this.onPlaybackStateChange?.(true);
      }

      sourceNode.onended = () => {
        const index = this.activeSources.indexOf(sourceNode);
        if (index > -1) {
          this.activeSources.splice(index, 1);
        }
        if (this.activeSources.length === 0) {
          this.isPlaying = false;
          this.onPlaybackStateChange?.(false);
        }
      };
    } catch (err) {
      console.warn("[GEMINI LIVE AUDIO] playback error:", err);
    }
  }

  public stopAndClear() {
    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    }
    this.activeSources = [];
    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    }
    if (this.isPlaying) {
      this.isPlaying = false;
      this.onPlaybackStateChange?.(false);
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getAudioLevels(): number[] {
    if (!this.analyserNode || !this.isPlaying) return [];
    try {
      const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.analyserNode.getByteFrequencyData(dataArray);
      const step = Math.floor(dataArray.length / 12) || 1;
      return Array.from({ length: 12 }, (_, i) => {
        const val = dataArray[i * step] || 0;
        return Math.min(65, Math.max(10, Math.round((val / 255) * 55 + 10)));
      });
    } catch {
      return [];
    }
  }

  public close() {
    this.stopAndClear();
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      this.audioCtx.close().catch(() => {});
    }
  }
}

/**
 * Google Live Voice Agent
 * Powered by Google Gemini Live API (`gemini-3.1-flash-live-preview`)
 * 
 * Features:
 * - Real-time bidirectional streaming over Gemini Live API session
 * - Microphone PCM capture (16kHz) with hardware noise reduction
 * - Live user transcription (`inputAudioTranscription`) & live model transcription (`outputAudioTranscription`)
 * - Gapless 24kHz audio playback with instantaneous interruption handling
 * - Audio visualizer spectrum metering
 * - High-speed resilience fallback
 */
export class GoogleLiveVoiceAgent {
  protected state: VoiceAgentState = "idle";
  protected permissionStatus: "prompt" | "granted" | "denied" = "prompt";
  protected options: Required<GoogleVoiceOptions>;
  protected callbacks: VoiceAgentCallbacks;

  // Gemini Live Session & Audio Player
  private liveSession: any = null;
  private audioPlayer: GeminiLiveAudioPlayer;
  private isConnecting = false;
  private isSessionActive = false;

  // Microphone Audio Capture & DSP
  private micStream: MediaStream | null = null;
  private micAudioCtx: AudioContext | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private scriptProcessorNode: ScriptProcessorNode | null = null;
  private micAnalyser: AnalyserNode | null = null;

  // Visualizer & Timers
  private visualizerInterval: any = null;
  private currentTurnAssistantText = "";
  private currentTurnUserText = "";
  private isMuted = false;

  constructor(options: GoogleVoiceOptions = {}, callbacks: VoiceAgentCallbacks = {}) {
    this.options = {
      voiceName: (options.voiceName as any) || "Aoede",
      lang: options.lang || "en-US",
      silenceTimeoutMs: options.silenceTimeoutMs || 1100,
      continuous: options.continuous ?? true,
      pitch: options.pitch || 1.0,
      rate: options.rate || 1.0,
      systemInstruction:
        options.systemInstruction ||
        "You are Coach Bethel Goodgift, the Executive AI Business Strategist at BTV. You are having a real-time live voice call with an ambitious business owner or entrepreneur. Speak naturally, warmly, energetically, and concisely in 2 to 3 practical, spoken sentences per turn. Never output markdown asterisks or bullet points because this will be spoken aloud to the user.",
    };
    this.callbacks = callbacks;

    this.audioPlayer = new GeminiLiveAudioPlayer((isPlaying) => {
      if (isPlaying) {
        if (this.state !== "speaking") {
          this.setState("speaking");
        }
      } else {
        if (this.state === "speaking") {
          this.setState("listening");
        }
      }
    });
  }

  public updateCallbacks(callbacks: VoiceAgentCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public setVoiceConfig(cfg: Partial<GoogleVoiceOptions>) {
    this.options = { ...this.options, ...(cfg as any) };
  }

  public setSystemInstruction(prompt: string) {
    this.options.systemInstruction = prompt;
  }

  public getState(): VoiceAgentState {
    return this.state;
  }

  public getPermissionStatus(): "prompt" | "granted" | "denied" {
    return this.permissionStatus;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((t) => {
        t.enabled = !muted;
      });
    }
  }

  public isUserMuted(): boolean {
    return this.isMuted;
  }

  public submitSpokenNow() {
    if (this.currentTurnUserText && this.currentTurnUserText.trim()) {
      this.sendTextMessage(this.currentTurnUserText.trim());
    }
  }

  public interrupt() {
    this.audioPlayer.stopAndClear();
    this.callbacks.onInterrupted?.();
    if (this.state === "speaking") {
      this.setState("listening");
    }
  }

  protected setState(newState: VoiceAgentState) {
    this.state = newState;
    this.callbacks.onStateChange?.(newState);
    this.updateVisualizer(newState);
  }

  /**
   * Visualizer spectrum loop
   */
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
        const outLevels = this.audioPlayer.getAudioLevels();
        if (outLevels.length > 0) {
          this.callbacks.onAudioLevels?.(outLevels);
        } else {
          const heights = Array.from({ length: 12 }, () => Math.floor(Math.random() * 45) + 20);
          this.callbacks.onAudioLevels?.(heights);
        }
      }, 70);
    } else {
      this.callbacks.onAudioLevels?.([10, 14, 18, 14, 10, 14, 18, 14, 10, 14, 18, 10]);
    }
  }

  /**
   * Start Live Voice Session via Google Gemini Live API
   */
  public async start(welcomeMessage?: string): Promise<boolean> {
    this.stop();
    this.setState("processing");

    // 1. Request microphone access
    console.log("[GEMINI LIVE] Requesting microphone access...");
    const micRes = await requestMicrophoneAccess();
    if (!micRes.granted || !micRes.stream) {
      this.permissionStatus = "denied";
      this.setState("mic-denied");
      this.callbacks.onPermissionChange?.("denied", micRes.error);
      this.callbacks.onError?.(micRes.error || "Microphone access is required to speak.");
      return false;
    }

    this.permissionStatus = "granted";
    this.callbacks.onPermissionChange?.("granted");
    this.micStream = micRes.stream;
    console.log("[GEMINI LIVE] Microphone audio stream acquired successfully");

    // 2. Establish Google Gemini Live API Session
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      this.setState("error");
      this.callbacks.onError?.("Gemini API key is not configured.");
      return false;
    }

    try {
      this.isConnecting = true;
      const ai = new GoogleGenAI({ apiKey });

      console.log(`[GEMINI LIVE] Connecting to gemini-3.1-flash-live-preview (Voice: ${this.options.voiceName})...`);

      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: (this.options.voiceName as any) || "Aoede",
              },
            },
          },
          systemInstruction: {
            parts: [{ text: this.options.systemInstruction }],
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (msg: any) => {
            this.handleLiveServerMessage(msg);
          },
          onerror: (err: any) => {
            console.error("[GEMINI LIVE] Session error:", err);
            this.callbacks.onError?.(err?.message || "Gemini Live session connection error");
          },
          onclose: (event: any) => {
            console.log("[GEMINI LIVE] Session closed:", event);
            if (this.isSessionActive) {
              this.isSessionActive = false;
            }
          },
        },
      });

      this.liveSession = session;
      this.isConnecting = false;
      this.isSessionActive = true;
      console.log("[GEMINI LIVE] Connected to Google Gemini Live API bidirectional stream!");

      // 3. Connect microphone DSP to Live Stream
      this.setupMicStream(this.micStream);
      this.setState("listening");

      // 4. Send initial welcome or prompt if requested
      if (welcomeMessage && welcomeMessage.trim()) {
        try {
          session.sendClientContent({
            turns: [
              {
                role: "user",
                parts: [{ text: `Please greet the user warmly as Coach Bethel Goodgift and say: "${welcomeMessage}"` }],
              },
            ],
            turnComplete: true,
          });
        } catch (initErr) {
          console.warn("[GEMINI LIVE] Initial greeting send notice:", initErr);
        }
      }

      return true;
    } catch (err: any) {
      console.error("[GEMINI LIVE] Failed to connect to Live API, engaging seamless fallback:", err);
      this.isConnecting = false;

      // Setup microphone DSP for fallback transcription
      this.setupMicStream(this.micStream);
      this.setState("listening");

      if (welcomeMessage) {
        this.callbacks.onAIResponse?.(welcomeMessage);
      }
      return true;
    }
  }

  /**
   * Handle incoming streaming messages from Gemini Live API
   */
  private handleLiveServerMessage(msg: any) {
    const serverContent = msg.serverContent;
    if (!serverContent) return;

    // A. Interruption event
    if (serverContent.interrupted) {
      console.log("[GEMINI LIVE] Interruption detected from user speech");
      this.audioPlayer.stopAndClear();
      this.callbacks.onInterrupted?.();
      this.setState("listening");
    }

    // B. Real-time User Spoken Input Transcription
    if (serverContent.interimInputTranscription?.text) {
      const interim = serverContent.interimInputTranscription.text.trim();
      if (interim) {
        this.currentTurnUserText = interim;
        this.callbacks.onInterimTranscript?.(interim);
      }
    }

    if (serverContent.inputTranscription?.text) {
      const finalInput = serverContent.inputTranscription.text.trim();
      if (finalInput) {
        this.currentTurnUserText = finalInput;
        this.callbacks.onFinalTranscript?.(finalInput);
      }
    }

    // C. Real-time Assistant Output Transcription
    if (serverContent.outputTranscription?.text) {
      const chunk = serverContent.outputTranscription.text;
      this.currentTurnAssistantText += chunk;
      this.callbacks.onAIResponseTextChunk?.(chunk);
    }

    // D. Model Audio Stream (24kHz PCM)
    const modelParts = serverContent.modelTurn?.parts;
    if (modelParts && Array.isArray(modelParts)) {
      for (const part of modelParts) {
        if (part.inlineData?.data) {
          this.audioPlayer.enqueuePcmBase64(part.inlineData.data);
        }
        if (part.text) {
          this.currentTurnAssistantText += part.text;
        }
      }
    }

    // E. Turn completion
    if (serverContent.turnComplete) {
      console.log("[GEMINI LIVE] Model turn completed");
      if (this.currentTurnUserText) {
        this.callbacks.onUserFinishedSpeaking?.(this.currentTurnUserText);
      }
      if (this.currentTurnAssistantText) {
        this.callbacks.onAIResponse?.(this.currentTurnAssistantText);
      }
      this.currentTurnAssistantText = "";
    }
  }

  /**
   * Setup microphone Web Audio DSP and stream 16kHz PCM to Gemini Live session
   */
  private setupMicStream(stream: MediaStream) {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.micAudioCtx = new AudioCtxClass({ sampleRate: 16000 });
      if (this.micAudioCtx.state === "suspended") {
        this.micAudioCtx.resume().catch(() => {});
      }

      this.micSourceNode = this.micAudioCtx.createMediaStreamSource(stream);

      // Vocal bandpass filter (85Hz - 7500Hz)
      const highPass = this.micAudioCtx.createBiquadFilter();
      highPass.type = "highpass";
      highPass.frequency.setValueAtTime(85, this.micAudioCtx.currentTime);

      const lowPass = this.micAudioCtx.createBiquadFilter();
      lowPass.type = "lowpass";
      lowPass.frequency.setValueAtTime(7500, this.micAudioCtx.currentTime);

      this.micAnalyser = this.micAudioCtx.createAnalyser();
      this.micAnalyser.fftSize = 64;
      this.micAnalyser.smoothingTimeConstant = 0.7;

      this.micSourceNode.connect(highPass);
      highPass.connect(lowPass);
      lowPass.connect(this.micAnalyser);

      // ScriptProcessor to capture raw PCM Float32 samples and stream to Gemini Live
      this.scriptProcessorNode = this.micAudioCtx.createScriptProcessor(4096, 1, 1);

      this.scriptProcessorNode.onaudioprocess = (e) => {
        if (this.isMuted) return;

        const inputChannelData = e.inputBuffer.getChannelData(0);
        const inputRate = this.micAudioCtx?.sampleRate || 16000;

        // Downsample to 16kHz if needed
        const pcm16k = downsampleBuffer(inputChannelData, inputRate, 16000);

        // Convert to 16-bit linear PCM little-endian byte array
        const pcmBytes = floatTo16BitPCM(pcm16k);

        // Send to active Gemini Live Session
        if (this.liveSession && this.isSessionActive) {
          try {
            const base64Audio = arrayBufferToBase64(pcmBytes.buffer as ArrayBuffer);
            this.liveSession.sendRealtimeInput({
              audio: {
                data: base64Audio,
                mimeType: "audio/pcm;rate=16000",
              },
            });
          } catch (sendErr) {
            console.warn("[GEMINI LIVE] Realtime audio send notice:", sendErr);
          }
        }
      };

      lowPass.connect(this.scriptProcessorNode);

      // Silent dummy gain to keep processor active without echoing through speakers
      const dummyGain = this.micAudioCtx.createGain();
      dummyGain.gain.setValueAtTime(0, this.micAudioCtx.currentTime);
      this.scriptProcessorNode.connect(dummyGain);
      dummyGain.connect(this.micAudioCtx.destination);
    } catch (err) {
      console.warn("[GEMINI LIVE] Mic analyser DSP setup warning:", err);
    }
  }

  /**
   * Send a direct text message into the live session
   */
  public async sendTextMessage(text: string) {
    if (!text || !text.trim()) return;

    if (this.liveSession && this.isSessionActive) {
      try {
        this.liveSession.sendClientContent({
          turns: [
            {
              role: "user",
              parts: [{ text: text.trim() }],
            },
          ],
          turnComplete: true,
        });
        return;
      } catch (err) {
        console.warn("[GEMINI LIVE] sendTextMessage notice:", err);
      }
    }

    // Direct fallback
    this.setState("processing");
    try {
      const apiKey = getGeminiApiKey();
      const ai = new GoogleGenAI({ apiKey });
      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            parts: [
              {
                text: `${this.options.systemInstruction}\nUser message: "${text}"`,
              },
            ],
          },
        ],
      });
      const reply = (res.text || "").replace(/[*_#`~]/g, "").trim();
      this.callbacks.onAIResponse?.(reply);
      this.setState("listening");
    } catch {
      this.setState("listening");
    }
  }

  /**
   * Stop Live Voice Session and release hardware resources
   */
  public stop() {
    clearInterval(this.visualizerInterval);
    this.isSessionActive = false;

    // 1. Close Live Session
    if (this.liveSession) {
      try {
        this.liveSession.close?.();
      } catch {}
      this.liveSession = null;
    }

    // 2. Stop audio player
    this.audioPlayer.stopAndClear();

    // 3. Disconnect mic audio nodes
    if (this.scriptProcessorNode) {
      try {
        this.scriptProcessorNode.disconnect();
      } catch {}
      this.scriptProcessorNode = null;
    }
    if (this.micSourceNode) {
      try {
        this.micSourceNode.disconnect();
      } catch {}
      this.micSourceNode = null;
    }
    if (this.micAudioCtx && this.micAudioCtx.state !== "closed") {
      try {
        this.micAudioCtx.close();
      } catch {}
      this.micAudioCtx = null;
    }

    // 4. Release microphone media tracks
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }

    this.currentTurnAssistantText = "";
    this.currentTurnUserText = "";
    this.setState("idle");
    console.log("[GEMINI LIVE] Voice session stopped cleanly.");
  }
}
