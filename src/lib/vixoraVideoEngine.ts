import { supabase } from "@/integrations/supabase/client";
import { GoogleGenAI, Modality } from "@google/genai";

export const VIXORA_LIVE_API_BASE =
  "https://ais-dev-z3gmsn2xsvk2qfmakpvm37-164225214835.europe-west3.run.app";

export type VideoDuration = "15s" | "30s" | "60s";
export type VideoAspectRatio = "vertical" | "square" | "horizontal"; // vertical = 9:16, square = 1:1, horizontal = 16:9
export type VideoVoice = "Aoede" | "Charon" | "Fenrir" | "Kore" | "Puck" | "Zephyr" | "Alloy" | "Shimmer";

export interface CreateVideoPayload {
  topic?: string;
  script?: string;
  duration: VideoDuration;
  aspect_ratio: VideoAspectRatio;
  voice: VideoVoice;
  style?: string;
  project_id?: string;
  user_id?: string;
  title?: string;
  quality?: "720p" | "1080p";
}

export interface VideoJobStatus {
  job_id: string;
  status: "queued" | "processing" | "ready" | "failed";
  progress: number; // 0 to 100
  current_step?: string;
  video_url?: string;
  thumbnail_url?: string;
  asset_id?: string;
  duration_seconds?: number;
  aspect_ratio?: VideoAspectRatio;
  error?: string;
  created_at?: string;
  title?: string;
  logs?: string[];
}

export interface VixoraProject {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  video_count?: number;
  last_video_url?: string;
  last_thumbnail_url?: string;
}

export interface SceneScript {
  text: string;
  visualKeywords: string[];
  caption: string;
  durationSeconds: number;
  bgTheme: "neon" | "sunset" | "ocean" | "luxury" | "lagos";
}

const STORAGE_KEY_API_URL = "vixora_custom_backend_url";
const STORAGE_KEY_SAVED_VIDEOS = "vixora_created_videos_history";
const STORAGE_KEY_FORCE_NATIVE = "vixora_force_native_engine";

/**
 * Resolve the active Vixora video creation backend URL.
 */
export async function getVixoraBackendUrl(): Promise<string> {
  const localUrl = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_API_URL) : null;
  if (localUrl && localUrl.trim().length > 4) {
    return cleanUrl(localUrl);
  }

  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "vixora_api_url")
      .maybeSingle();

    if (data?.value && data.value.trim().length > 4) {
      return cleanUrl(data.value);
    }
  } catch (err) {
    console.warn("Could not load vixora_api_url from site_settings:", err);
  }

  const envUrl = (import.meta as any).env?.VITE_VIXORA_API_URL;
  if (envUrl && envUrl.trim().length > 4) {
    return cleanUrl(envUrl);
  }

  return VIXORA_LIVE_API_BASE;
}

export function setCustomVixoraBackendUrl(url: string) {
  if (typeof window !== "undefined") {
    if (!url || !url.trim()) {
      localStorage.removeItem(STORAGE_KEY_API_URL);
    } else {
      localStorage.setItem(STORAGE_KEY_API_URL, cleanUrl(url));
    }
  }
}

export function isForceNativeEngine(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY_FORCE_NATIVE) === "true";
}

export function setForceNativeEngine(enabled: boolean) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_FORCE_NATIVE, enabled ? "true" : "false");
  }
}

function cleanUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/**
 * Get headers including Content-Type and optional Auth
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["X-Supabase-User-Id"] = data.session.user.id;
    }
  } catch (e) {
    console.warn("Could not retrieve Supabase auth token for Vixora request:", e);
  }

  return headers;
}

/**
 * Get Gemini API Key from site_settings or environment
 */
async function getGeminiApiKey(): Promise<string> {
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "gemini_api_key")
      .maybeSingle();

    if (data?.value && data.value.trim().length > 10) {
      return data.value.trim();
    }
  } catch {}

  const envKey =
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (typeof process !== "undefined" ? (process as any).env?.GEMINI_API_KEY : "");
  return envKey || "";
}

/**
 * Complete Vixora Video Generation Client Function
 * Follows exact specifications from the API Documentation.
 */
export async function createAndRenderVideo({
  topic,
  script,
  duration = "15s",
  aspectRatio = "vertical",
  voice = "Aoede",
  projectId,
  onProgress,
  customBaseUrl,
}: {
  topic?: string;
  script?: string;
  duration?: VideoDuration;
  aspectRatio?: VideoAspectRatio;
  voice?: VideoVoice;
  projectId?: string;
  onProgress?: (progressData: {
    progress: number;
    step: string;
    status: string;
    logs?: string[];
  }) => void;
  customBaseUrl?: string;
}): Promise<{
  jobId: string;
  assetId?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  title?: string;
}> {
  const API_BASE = customBaseUrl ? cleanUrl(customBaseUrl) : await getVixoraBackendUrl();

  // 1. Submit Video Generation Job
  const headers = await getAuthHeaders();
  const payload = {
    topic: topic || undefined,
    script: script || undefined,
    duration,
    aspect_ratio: aspectRatio,
    voice,
    project_id: projectId || undefined,
  };

  const createRes = await fetch(`${API_BASE}/api/public/v1/videos/create`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const createData = await createRes.json().catch(() => ({}));
  if (!createData.ok || !createData.job_id) {
    throw new Error(createData.error || createData.message || "Failed to submit video generation job to Vixora API");
  }

  const jobId = createData.job_id;

  // 2. Poll for Progress until Video is Ready (every 2s)
  return new Promise((resolve, reject) => {
    let pollCount = 0;
    const maxPolls = 150; // up to 5 minutes

    const interval = setInterval(async () => {
      pollCount++;
      try {
        const statusRes = await fetch(`${API_BASE}/api/public/v1/videos/status?job_id=${jobId}`, {
          headers: { Accept: "application/json" },
        });
        const statusData = await statusRes.json().catch(() => ({}));

        if (onProgress) {
          onProgress({
            progress: statusData.progress || Math.min(95, pollCount * 2),
            step: statusData.current_step || statusData.step || "Rendering video frames and compositing audio...",
            status: statusData.status || "processing",
            logs: statusData.logs || [],
          });
        }

        if (statusData.status === "ready") {
          clearInterval(interval);
          const rawUrl = statusData.video_url || statusData.url || "";
          const fullVideoUrl = rawUrl.startsWith("http")
            ? rawUrl
            : `${API_BASE}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;

          const result = {
            jobId: statusData.job_id || jobId,
            assetId: statusData.asset_id,
            videoUrl: fullVideoUrl,
            thumbnailUrl: statusData.thumbnail_url || statusData.thumbnail,
            title: topic || "Vixora AI Video",
          };

          saveCreatedVideoToHistory({
            job_id: result.jobId,
            status: "ready",
            progress: 100,
            video_url: result.videoUrl,
            thumbnail_url: result.thumbnailUrl,
            aspect_ratio: aspectRatio,
            title: result.title,
            created_at: new Date().toISOString(),
          });

          resolve(result);
        } else if (statusData.status === "failed") {
          clearInterval(interval);
          reject(new Error(statusData.error || "Video rendering failed on server"));
        } else if (pollCount >= maxPolls) {
          clearInterval(interval);
          reject(new Error("Video rendering timed out. Please try again."));
        }
      } catch (err) {
        clearInterval(interval);
        reject(err);
      }
    }, 2000);
  });
}

/**
 * Universal Video Creator:
 * First connects to the Live Vixora API Base. If client iframe restrictions or network issues block it,
 * it seamlessly switches to the high-performance local Native Canvas Studio.
 */
export async function createVixoraVideo(
  payload: CreateVideoPayload,
  customBackendUrl?: string,
  onProgress?: (status: VideoJobStatus) => void
): Promise<VideoJobStatus> {
  const baseUrl = customBackendUrl ? cleanUrl(customBackendUrl) : await getVixoraBackendUrl();
  const forceNative = isForceNativeEngine();

  if (!forceNative && baseUrl.length > 5) {
    try {
      const result = await createAndRenderVideo({
        topic: payload.topic,
        script: payload.script,
        duration: payload.duration,
        aspectRatio: payload.aspect_ratio,
        voice: payload.voice,
        projectId: payload.project_id,
        customBaseUrl: baseUrl,
        onProgress: (p) => {
          onProgress?.({
            job_id: "live_vixora_job",
            status: (p.status as any) || "processing",
            progress: p.progress,
            current_step: p.step,
            aspect_ratio: payload.aspect_ratio,
            title: payload.title || payload.topic,
            logs: p.logs,
          });
        },
      });

      const finalStatus: VideoJobStatus = {
        job_id: result.jobId,
        status: "ready",
        progress: 100,
        current_step: "Ready for playback & download",
        video_url: result.videoUrl,
        thumbnail_url: result.thumbnailUrl,
        asset_id: result.assetId,
        aspect_ratio: payload.aspect_ratio,
        title: payload.title || payload.topic,
        created_at: new Date().toISOString(),
      };

      return finalStatus;
    } catch (err) {
      console.warn("Live API connection unreachable or redirected, switching to high-retention Native Canvas Studio:", err);
    }
  }

  // High-performance client-side Native Studio
  return await generateNativeVixoraVideo(payload, onProgress);
}

/**
 * STEP 2: Check status of video creation job
 */
export async function checkVixoraVideoStatus(
  jobId: string,
  customBackendUrl?: string
): Promise<VideoJobStatus> {
  const baseUrl = customBackendUrl ? cleanUrl(customBackendUrl) : await getVixoraBackendUrl();
  const endpoint = `${baseUrl}/api/public/v1/videos/status?job_id=${encodeURIComponent(jobId)}`;
  const headers = await getAuthHeaders();

  const res = await fetch(endpoint, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Status check failed (${res.status}): ${errorText || res.statusText}`);
  }

  const data = await res.json();
  const rawUrl = data.video_url || data.url || data.videoUrl || "";
  const fullVideoUrl = rawUrl
    ? rawUrl.startsWith("http")
      ? rawUrl
      : `${baseUrl}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`
    : undefined;

  const status: VideoJobStatus = {
    job_id: data.job_id || jobId,
    status: (data.status || "processing").toLowerCase(),
    progress: typeof data.progress === "number" ? Math.min(100, Math.max(0, data.progress)) : 0,
    current_step: data.current_step || data.step || data.message || "Generating video assets...",
    video_url: fullVideoUrl,
    thumbnail_url: data.thumbnail_url || data.thumbnail || data.poster,
    asset_id: data.asset_id,
    duration_seconds: data.duration_seconds || data.duration,
    aspect_ratio: data.aspect_ratio || data.aspectRatio,
    error: data.error || data.errorMessage,
    created_at: data.created_at || new Date().toISOString(),
    title: data.title,
    logs: data.logs || [],
  };

  return status;
}

/**
 * =========================================================================
 * NATIVE VIDEO GENERATOR & CANVAS RENDERER
 * Creates full, high-retention video files directly with AI voice & motion graphics
 * =========================================================================
 */
export async function generateNativeVixoraVideo(
  payload: CreateVideoPayload,
  onProgress?: (status: VideoJobStatus) => void
): Promise<VideoJobStatus> {
  const jobId = `vx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const title = payload.title || payload.topic?.slice(0, 40) || "AI Marketing Video";
  const durationSec = payload.duration === "15s" ? 15 : payload.duration === "60s" ? 60 : 30;

  const update = (progress: number, step: string) => {
    const s: VideoJobStatus = {
      job_id: jobId,
      status: "processing",
      progress,
      current_step: step,
      aspect_ratio: payload.aspect_ratio,
      title,
    };
    onProgress?.(s);
  };

  update(10, "Crafting dynamic AI script scenes & viral hook...");

  // 1. Generate Structured Scenes with Gemini or Smart Marketing Script Engine
  const scenes = await generateScenesFromPrompt(payload, durationSec);

  update(35, `Synthesizing ${payload.voice} AI voiceover and audio stems...`);

  // 2. Synthesize or build audio track
  const audioBuffer = await synthesizeVoiceAudio(scenes, payload.voice);

  update(60, "Composing visual motion graphics & kinetic captions...");

  // 3. Render Canvas & Record Video using MediaRecorder
  const { videoUrl, thumbnailUrl } = await renderCanvasVideo(scenes, payload.aspect_ratio, durationSec, audioBuffer, (subProgress) => {
    update(60 + Math.floor(subProgress * 0.35), "Encoding HD video frames & mastering sound...");
  });

  update(100, "Video rendering completed successfully!");

  const finalResult: VideoJobStatus = {
    job_id: jobId,
    status: "ready",
    progress: 100,
    current_step: "Ready for playback & download",
    video_url: videoUrl,
    thumbnail_url: thumbnailUrl,
    duration_seconds: durationSec,
    aspect_ratio: payload.aspect_ratio,
    title,
    created_at: new Date().toISOString(),
  };

  saveCreatedVideoToHistory(finalResult);
  return finalResult;
}

/**
 * Scene generator: Uses Gemini if API key is present or intelligent marketing logic
 */
async function generateScenesFromPrompt(
  payload: CreateVideoPayload,
  totalDuration: number
): Promise<SceneScript[]> {
  const apiKey = await getGeminiApiKey();
  const rawInput = payload.script?.trim() || payload.topic?.trim() || "Promote our business and boost sales";

  if (apiKey && apiKey.length > 10) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are Vixora, an elite viral video creator. Create a high-converting ${totalDuration}-second promotional video script divided into exactly 3 to 4 sequential scenes for this topic: "${rawInput}".
Return ONLY a valid JSON array of objects with the following keys for each scene:
[
  {
    "text": "spoken narration for this scene",
    "caption": "PUNCHY 3-5 WORD HIGHLIGHT FOR SCREEN",
    "visualKeywords": ["keyword1", "keyword2"],
    "durationSeconds": number,
    "bgTheme": "neon" | "sunset" | "ocean" | "luxury" | "lagos"
  }
]
The sum of durationSeconds must equal ${totalDuration}.`;

      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = res.text?.trim() || "";
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.warn("Gemini script generation fallback to built-in template:", e);
    }
  }

  // Deterministic high-converting template
  const perScene = Math.floor(totalDuration / 3);
  return [
    {
      text: `Are you looking for the best way to elevate your lifestyle and business? Look no further!`,
      caption: `🔥 THE GAME CHANGER`,
      visualKeywords: ["Innovation", "Excellence", "Speed"],
      durationSeconds: perScene,
      bgTheme: "neon",
    },
    {
      text: `${rawInput.slice(0, 120)}. We provide premium solutions tailored for maximum impact and seamless growth.`,
      caption: `⚡ PREMIUM RESULTS FAST`,
      visualKeywords: ["Quality", "Reliability", "Results"],
      durationSeconds: perScene,
      bgTheme: "lagos",
    },
    {
      text: `Experience the difference today with Bethelincovibe. Connect with us now and transform your journey!`,
      caption: `🚀 GET STARTED TODAY!`,
      visualKeywords: ["Success", "Growth", "Call To Action"],
      durationSeconds: totalDuration - perScene * 2,
      bgTheme: "luxury",
    },
  ];
}

/**
 * Voice synthesizer: Synthesizes high quality audio stream
 */
async function synthesizeVoiceAudio(
  scenes: SceneScript[],
  voice: VideoVoice
): Promise<AudioBuffer | null> {
  if (typeof window === "undefined") return null;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    const ctx = new AudioContextClass();

    const fullScript = scenes.map((s) => s.text).join(" ");
    const apiKey = await getGeminiApiKey();

    // 1. Try Gemini TTS if key available
    if (apiKey && apiKey.length > 10) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const voiceName = ["Aoede", "Charon", "Fenrir", "Kore", "Puck", "Zephyr"].includes(voice)
          ? voice
          : "Aoede";

        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: fullScript }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName as any },
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
          const wavBuffer = buildWavFromPcm(pcmBytes, 24000);
          return await ctx.decodeAudioData(wavBuffer);
        }
      } catch (ttsErr) {
        console.warn("Gemini TTS audio synthesis fallback to musical soundscape:", ttsErr);
      }
    }

    // 2. Synthesize ambient upbeat background soundscape buffer
    const totalDuration = scenes.reduce((acc, s) => acc + s.durationSeconds, 0);
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * totalDuration);
    const buffer = ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    // Warm rhythmic chords & ambient sweep
    const chordFreqs = [220, 277.18, 329.63, 440, 554.37];
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample = 0;
      const beat = Math.sin(t * Math.PI * 4);
      const chordIndex = Math.floor((t / 3) % chordFreqs.length);
      const freq = chordFreqs[chordIndex];

      sample += Math.sin(2 * Math.PI * freq * t) * 0.08 * (0.8 + 0.2 * beat);
      sample += Math.sin(2 * Math.PI * (freq * 1.5) * t) * 0.04;
      sample += (Math.random() * 2 - 1) * 0.005; // subtle tape warmth

      left[i] = sample;
      right[i] = sample * (1 + 0.1 * Math.sin(t * 2));
    }

    return buffer;
  } catch (e) {
    console.warn("Audio synthesis error:", e);
    return null;
  }
}

function buildWavFromPcm(pcm: Uint8Array, sampleRate = 24000, channels = 1, bitsPerSample = 16): ArrayBuffer {
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
  view.setUint16(20, 1, true); // PCM
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
 * Render Canvas frames to MediaStream and encode to Video Blob
 */
async function renderCanvasVideo(
  scenes: SceneScript[],
  aspectRatio: VideoAspectRatio,
  totalDuration: number,
  audioBuffer: AudioBuffer | null,
  onProgress: (p: number) => void
): Promise<{ videoUrl: string; thumbnailUrl: string }> {
  const width = aspectRatio === "vertical" ? 720 : aspectRatio === "square" ? 720 : 1280;
  const height = aspectRatio === "vertical" ? 1280 : aspectRatio === "square" ? 720 : 720;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Prepare Audio Stream
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  let audioCtx: AudioContext | null = null;
  let audioDest: MediaStreamAudioDestinationNode | null = null;

  if (AudioContextClass) {
    audioCtx = new AudioContextClass();
    audioDest = audioCtx.createMediaStreamDestination();

    if (audioBuffer) {
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioDest);
      source.start();
    }
  }

  // Combined Canvas + Audio stream
  const canvasStream = canvas.captureStream(30); // 30 FPS
  const tracks = [...canvasStream.getVideoTracks()];
  if (audioDest) {
    tracks.push(...audioDest.stream.getAudioTracks());
  }
  const combinedStream = new MediaStream(tracks);

  // MediaRecorder setup with supported mimeType
  const mimeTypes = [
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  let chosenMime = "";
  for (const m of mimeTypes) {
    if (MediaRecorder.isTypeSupported(m)) {
      chosenMime = m;
      break;
    }
  }

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(combinedStream, {
    mimeType: chosenMime || undefined,
    videoBitsPerSecond: 2500000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  recorder.start(100);

  // Render Loop
  const startTime = performance.now();
  let firstThumbnailDataUrl = "";

  return new Promise((resolve) => {
    function drawFrame(now: number) {
      const elapsed = (now - startTime) / 1000;
      const progressFraction = Math.min(1, elapsed / totalDuration);
      onProgress(progressFraction);

      // Determine active scene
      let accumulatedTime = 0;
      let activeScene = scenes[0];
      for (const sc of scenes) {
        if (elapsed >= accumulatedTime && elapsed < accumulatedTime + sc.durationSeconds) {
          activeScene = sc;
          break;
        }
        accumulatedTime += sc.durationSeconds;
      }

      // Background Rendering with Animated Gradient
      const t = elapsed;
      let grad = ctx.createLinearGradient(
        0,
        0,
        width * Math.sin(t * 0.5),
        height * Math.cos(t * 0.5)
      );

      if (activeScene.bgTheme === "lagos") {
        grad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width);
        grad.addColorStop(0, "#10b981");
        grad.addColorStop(0.5, "#047857");
        grad.addColorStop(1, "#022c22");
      } else if (activeScene.bgTheme === "sunset") {
        grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, "#f43f5e");
        grad.addColorStop(0.5, "#8b5cf6");
        grad.addColorStop(1, "#1e1b4b");
      } else if (activeScene.bgTheme === "luxury") {
        grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, "#1e1b4b");
        grad.addColorStop(0.5, "#0f172a");
        grad.addColorStop(1, "#020617");
      } else {
        // Neon / Default
        grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, "#9333ea");
        grad.addColorStop(0.5, "#ec4899");
        grad.addColorStop(1, "#18181b");
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Glowing Ambient Shapes
      ctx.save();
      ctx.globalAlpha = 0.3 + 0.15 * Math.sin(t * 3);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, (width * 0.35) * (0.9 + 0.1 * Math.sin(t * 2)), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Branding Badge at top
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      roundRect(ctx, width * 0.1, 40, width * 0.8, 50, 16);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BETHELINCOVIBE TV • VIXORA AI", width / 2, 72);
      ctx.restore();

      // Kinetic Center Caption Box
      ctx.save();
      const boxW = width * 0.85;
      const boxH = aspectRatio === "vertical" ? 220 : 160;
      const boxX = (width - boxW) / 2;
      const boxY = height / 2 - boxH / 2;

      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      roundRect(ctx, boxX, boxY, boxW, boxH, 24);
      ctx.fill();

      // Caption Highlight Tag
      ctx.fillStyle = "#fbbf24";
      ctx.font = "900 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(activeScene.caption, width / 2, boxY + 55);

      // Voice Narration Subtitles
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px sans-serif";
      wrapText(ctx, `"${activeScene.text}"`, width / 2, boxY + 110, boxW - 40, 30);
      ctx.restore();

      // Visual Keywords Badges at bottom
      ctx.save();
      const tags = activeScene.visualKeywords || ["Verified", "Premium"];
      let tagX = width * 0.15;
      for (const tag of tags) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        roundRect(ctx, tagX, height - 120, 160, 44, 22);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`✓ ${tag}`, tagX + 80, height - 92);
        tagX += 180;
      }
      ctx.restore();

      // Progress bar line at bottom
      ctx.fillStyle = "#ec4899";
      ctx.fillRect(0, height - 8, width * progressFraction, 8);

      // Capture thumbnail
      if (!firstThumbnailDataUrl && elapsed > 0.5) {
        firstThumbnailDataUrl = canvas.toDataURL("image/jpeg", 0.8);
      }

      if (elapsed < totalDuration) {
        requestAnimationFrame(drawFrame);
      } else {
        // Complete Recording
        recorder.onstop = () => {
          const finalBlob = new Blob(chunks, { type: chosenMime || "video/mp4" });
          const videoUrl = URL.createObjectURL(finalBlob);
          resolve({
            videoUrl,
            thumbnailUrl: firstThumbnailDataUrl || canvas.toDataURL("image/jpeg", 0.8),
          });
        };
        recorder.stop();
      }
    }

    requestAnimationFrame(drawFrame);
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}

/**
 * STEP 4: Fetch user's projects / videos from Vixora backend
 */
export async function fetchVixoraProjectsList(
  customBackendUrl?: string
): Promise<VixoraProject[]> {
  const baseUrl = customBackendUrl ? cleanUrl(customBackendUrl) : await getVixoraBackendUrl();
  const endpoint = `${baseUrl}/api/public/v1/projects/list`;
  const headers = await getAuthHeaders();

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers,
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : data.projects || [];
  } catch (err) {
    return [];
  }
}

/**
 * Save locally generated video to history for immediate playback & library view
 */
export function saveCreatedVideoToHistory(video: VideoJobStatus) {
  if (typeof window === "undefined" || !video.video_url) return;
  try {
    const existingRaw = localStorage.getItem(STORAGE_KEY_SAVED_VIDEOS);
    const existing: VideoJobStatus[] = existingRaw ? JSON.parse(existingRaw) : [];
    const filtered = existing.filter((v) => v.job_id !== video.job_id);
    filtered.unshift(video);
    localStorage.setItem(STORAGE_KEY_SAVED_VIDEOS, JSON.stringify(filtered.slice(0, 30)));
  } catch (e) {
    console.warn("Could not save video to local history:", e);
  }
}

export function getSavedVideosHistory(): VideoJobStatus[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_VIDEOS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function removeSavedVideo(jobId: string) {
  if (typeof window === "undefined") return;
  try {
    const existing = getSavedVideosHistory();
    const updated = existing.filter((v) => v.job_id !== jobId);
    localStorage.setItem(STORAGE_KEY_SAVED_VIDEOS, JSON.stringify(updated));
  } catch {}
}
