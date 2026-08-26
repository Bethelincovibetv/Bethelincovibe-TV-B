import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/integrations/supabase/client";
import { apiKeyService } from "@/vixora/services/apiKeyService";
import {
  VixoraVoicePipeline,
  VoiceState,
  cleanTextForSpeech,
  requestMicrophoneAccess,
  getGeminiApiKey,
} from "./vixoraVoicePipeline";

export interface GoogleVoiceOptions {
  voiceName?: "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr" | "Aoede" | "Alloy" | "Shimmer";
  lang?: string;
  silenceTimeoutMs?: number;
  continuous?: boolean;
  pitch?: number;
  rate?: number;
  systemInstruction?: string;
  systemPrompt?: string;
  businessContext?: any;
}

export type VoiceAgentState =
  | "idle"
  | "connecting"
  | "listening"
  | "transcribing"
  | "processing"
  | "speaking"
  | "mic-denied"
  | "error";

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
 * Downsampler
 */
export function downsampleBuffer(buffer: Float32Array, inputSampleRate: number, targetSampleRate = 16000): Float32Array {
  if (inputSampleRate === targetSampleRate) return buffer;
  if (inputSampleRate < targetSampleRate) return buffer;
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
 * Speech-to-Text Transcriber using Gemini Text Model
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
      model: "gemini-3.7-flash",
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
              text: "Listen to this audio and transcribe what the person is saying verbatim into plain English text. Return ONLY the transcribed text without quotes or explanation. If there is no speech, return empty string.",
            },
          ],
        },
      ],
    });

    return (response.text || "")
      .replace(/^["'`\s]+|["'`\s]+$/g, "")
      .replace(/\n+/g, " ")
      .trim();
  } catch (err) {
    console.warn("[VOICE] Direct Gemini audio transcription:", err);
    return "";
  }
}

/**
 * Synthesize voice
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
    console.warn("Supabase TTS notice:", err);
  }

  return null;
}

/**
 * Reliable Google Live-Style Voice Agent
 * Built on traditional, reliable STT → LLM → TTS architecture
 */
export class GoogleLiveVoiceAgent {
  private pipeline: VixoraVoicePipeline;
  private options: Required<GoogleVoiceOptions>;
  private callbacks: VoiceAgentCallbacks;
  private permissionStatus: "prompt" | "granted" | "denied" = "prompt";

  constructor(options: GoogleVoiceOptions = {}, callbacks: VoiceAgentCallbacks = {}) {
    const systemInstruction =
      options.systemInstruction ||
      options.systemPrompt ||
      "You are Coach Bethel Goodgift, the Executive AI Business Strategist at BTV. Speak naturally, warmly, energetically, and concisely in 2 to 3 practical, spoken sentences per turn. Never output markdown asterisks or bullet points.";

    this.options = {
      voiceName: options.voiceName || "Aoede",
      lang: options.lang || "en-US",
      silenceTimeoutMs: options.silenceTimeoutMs || 1200,
      continuous: options.continuous ?? true,
      pitch: options.pitch || 1.0,
      rate: options.rate || 1.0,
      systemInstruction: systemInstruction,
      systemPrompt: systemInstruction,
      businessContext: options.businessContext || {},
    };
    this.callbacks = callbacks;

    this.pipeline = new VixoraVoicePipeline(
      {
        voiceName: this.options.voiceName,
        lang: this.options.lang,
        silenceTimeoutMs: this.options.silenceTimeoutMs,
        continuous: this.options.continuous,
        pitch: this.options.pitch,
        rate: this.options.rate,
        systemPrompt: this.options.systemInstruction,
        businessContext: this.options.businessContext,
      },
      {
        onStateChange: (state: VoiceState) => {
          this.callbacks.onStateChange?.(state);
        },
        onInterimTranscript: (t) => {
          this.callbacks.onInterimTranscript?.(t);
        },
        onFinalTranscript: (t) => {
          this.callbacks.onFinalTranscript?.(t);
        },
        onUserMessage: (userText) => {
          this.callbacks.onUserFinishedSpeaking?.(userText);
        },
        onAIResponse: (reply) => {
          this.callbacks.onAIResponse?.(reply);
        },
        onAudioLevels: (levels) => {
          this.callbacks.onAudioLevels?.(levels);
        },
        onError: (err) => {
          this.callbacks.onError?.(err);
        },
        onPermissionChange: (status, msg) => {
          this.permissionStatus = status === "requesting" ? "prompt" : status;
          this.callbacks.onPermissionChange?.(this.permissionStatus, msg);
        },
        onInterrupted: () => {
          this.callbacks.onInterrupted?.();
        },
      }
    );
  }

  public updateCallbacks(callbacks: VoiceAgentCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    this.pipeline.updateCallbacks({
      onStateChange: callbacks.onStateChange,
      onInterimTranscript: callbacks.onInterimTranscript,
      onFinalTranscript: callbacks.onFinalTranscript,
      onUserMessage: callbacks.onUserFinishedSpeaking,
      onAIResponse: callbacks.onAIResponse,
      onAudioLevels: callbacks.onAudioLevels,
      onError: callbacks.onError,
      onPermissionChange: (status, msg) =>
        callbacks.onPermissionChange?.(status === "requesting" ? "prompt" : status, msg),
      onInterrupted: callbacks.onInterrupted,
    });
  }

  public setVoiceConfig(cfg: Partial<GoogleVoiceOptions>) {
    this.options = { ...this.options, ...(cfg as any) };
    this.pipeline.setOptions({
      voiceName: cfg.voiceName,
      lang: cfg.lang,
      pitch: cfg.pitch,
      rate: cfg.rate,
      silenceTimeoutMs: cfg.silenceTimeoutMs,
      continuous: cfg.continuous,
    });
  }

  public setSystemInstruction(prompt: string) {
    this.options.systemInstruction = prompt;
    this.pipeline.setOptions({ systemPrompt: prompt });
  }

  public getState(): VoiceAgentState {
    return this.pipeline.getState();
  }

  public getPermissionStatus(): "prompt" | "granted" | "denied" {
    return this.permissionStatus;
  }

  public setMute(muted: boolean) {
    this.pipeline.setMute(muted);
  }

  public isUserMuted(): boolean {
    return this.pipeline.isUserMuted();
  }

  public submitSpokenNow() {
    this.pipeline.finalizeAndSendTranscript();
  }

  public interrupt() {
    this.pipeline.interrupt();
  }

  public async start(welcomeMessage?: string): Promise<boolean> {
    const success = await this.pipeline.start();
    if (success && welcomeMessage) {
      // Optional welcome greeting
    }
    return success;
  }

  public stop() {
    this.pipeline.stop();
  }
}

export {
  cleanTextForSpeech,
  requestMicrophoneAccess,
  getGeminiApiKey,
};
