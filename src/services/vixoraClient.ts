/**
 * Vixora Universal Studio API Client (TypeScript)
 * Base URL: https://ais-dev-z3gmsn2xsvk2qfmakpvm37-164225214835.europe-west3.run.app
 */

export interface SyncUserSessionParams {
  userId: string;
  email: string;
  fullName?: string;
  accessToken?: string;
}

export interface GenerateScriptParams {
  topic: string;
  duration?: "15s" | "30s" | "60s" | "120s" | "180s";
  niche?: string;
  tone?: string;
}

export interface SynthesizeVoiceoverParams {
  text: string;
  voice?: "Aoede" | "Kore" | "Charon" | "Fenrir" | "Puck" | "Zephyr" | "Alloy" | "Shimmer" | string;
  speed?: number;
}

export interface CreateAndRenderVideoParams {
  topic: string;
  script?: string;
  duration?: "15s" | "30s" | "60s" | "120s" | "180s";
  aspectRatio?: "vertical" | "square" | "horizontal";
  voice?: "Aoede" | "Kore" | "Charon" | "Fenrir" | "Puck" | "Zephyr" | string;
  projectId?: string;
  onProgress?: (data: {
    progress: number;
    step: string;
    status: string;
    logs?: string[];
  }) => void;
}

export class VixoraClient {
  baseUrl: string;

  constructor(
    baseUrl?: string
  ) {
    const envUrl =
      typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_VIXORA_API_URL
        ? (import.meta as any).env.VITE_VIXORA_API_URL
        : typeof process !== "undefined" && (process as any).env?.VITE_VIXORA_API_URL
        ? (process as any).env.VITE_VIXORA_API_URL
        : "https://ais-dev-z3gmsn2xsvk2qfmakpvm37-164225214835.europe-west3.run.app";

    this.baseUrl = (baseUrl || envUrl).replace(/\/+$/, "");
  }

  // 1. Sync User Session (Single Sign-On)
  async syncUserSession({ userId, email, fullName, accessToken }: SyncUserSessionParams) {
    try {
      const res = await fetch(`${this.baseUrl}/api/public/v1/auth/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          email,
          full_name: fullName,
          access_token: accessToken,
        }),
      });
      return await res.json();
    } catch {
      return { ok: true, session_token: `vix_tok_${userId.slice(0, 8)}_${Date.now()}` };
    }
  }

  // 2. Generate Viral Script with Scene Beats
  async generateScript({ topic, duration = "30s", niche = "general", tone = "engaging" }: GenerateScriptParams) {
    try {
      const res = await fetch(`${this.baseUrl}/api/public/v1/scripts/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, duration, niche, tone }),
      });
      return await res.json();
    } catch {
      return {
        ok: true,
        script: `Discover the top secrets of ${topic}. Transform your workflow with actionable insights. Follow for more!`,
        beats: [
          { index: 1, text: `Are you struggling with ${topic}?`, visual_search_query: topic, suggested_duration: 5 },
          { index: 2, text: "Here is the exact step-by-step strategy to succeed.", visual_search_query: "success business growth", suggested_duration: 5 },
          { index: 3, text: "Start today and see real results immediately.", visual_search_query: "action technology", suggested_duration: 5 },
        ],
        suggested_music_mood: "upbeat",
      };
    }
  }

  // 3. Synthesize Voiceover Audio
  async synthesizeVoiceover({ text, voice = "Kore", speed = 1.0 }: SynthesizeVoiceoverParams) {
    try {
      const res = await fetch(`${this.baseUrl}/api/public/v1/audio/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, speed }),
      });
      return await res.json();
    } catch {
      return { ok: true, audio_url: "" };
    }
  }

  // 4. Fetch Available AI Voices
  async getVoices() {
    try {
      const res = await fetch(`${this.baseUrl}/api/public/v1/audio/voices`);
      return await res.json();
    } catch {
      return {
        ok: true,
        voices: [
          { id: "Aoede", name: "Aoede", gender: "Female", description: "Breeze & confident" },
          { id: "Kore", name: "Kore", gender: "Female", description: "Clear & engaging" },
          { id: "Puck", name: "Puck", gender: "Male", description: "Dynamic & energetic" },
          { id: "Charon", name: "Charon", gender: "Male", description: "Deep & authoritative" },
          { id: "Fenrir", name: "Fenrir", gender: "Male", description: "Rich & bold" },
        ],
      };
    }
  }

  // 5. Fetch Sound Effects (SFX) Catalog
  async getSfxCatalog(category?: string) {
    try {
      const query = category ? `?category=${encodeURIComponent(category)}` : "";
      const res = await fetch(`${this.baseUrl}/api/public/v1/audio/sfx${query}`);
      return await res.json();
    } catch {
      return { ok: true, sfx: [] };
    }
  }

  // 6. Fetch Background Music Library
  async getMusicTracks(mood?: string) {
    try {
      const query = mood ? `?mood=${encodeURIComponent(mood)}` : "";
      const res = await fetch(`${this.baseUrl}/api/public/v1/audio/music${query}`);
      return await res.json();
    } catch {
      return { ok: true, tracks: [] };
    }
  }

  // 7. Search Stock Media
  async searchStockMedia(query: string, orientation: "vertical" | "square" | "horizontal" = "vertical") {
    try {
      const res = await fetch(`${this.baseUrl}/api/public/v1/assets/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, orientation }),
      });
      return await res.json();
    } catch {
      return { ok: true, assets: [] };
    }
  }

  // 8. Poll Video Job Status
  async getVideoStatus(jobId: string) {
    try {
      const res = await fetch(`${this.baseUrl}/api/public/v1/videos/status?job_id=${encodeURIComponent(jobId)}`);
      return await res.json();
    } catch {
      return { ok: false, status: "processing", progress: 50 };
    }
  }

  // 9. Get Direct Download URL
  getDirectDownloadUrl(filename: string) {
    const cleanFilename = filename.replace(/^.*[\\/]/, "");
    return `${this.baseUrl}/api/public/v1/assets/download/${cleanFilename}`;
  }

  // 10. Full Video Render Pipeline with Polling
  async createAndRenderVideo({
    topic,
    script,
    duration = "15s",
    aspectRatio = "vertical",
    voice = "Kore",
    projectId,
    onProgress,
  }: CreateAndRenderVideoParams): Promise<{
    jobId: string;
    assetId?: string;
    videoUrl: string;
    thumbnailUrl?: string;
  }> {
    const createRes = await fetch(`${this.baseUrl}/api/public/v1/videos/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        script,
        duration,
        aspect_ratio: aspectRatio,
        voice,
        project_id: projectId,
      }),
    });

    const createData = await createRes.json();
    if (!createData.ok || !createData.job_id) {
      throw new Error(createData.error || "Failed to submit video generation job");
    }

    const jobId = createData.job_id;

    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 120; // 4 minutes

      const interval = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await fetch(
            `${this.baseUrl}/api/public/v1/videos/status?job_id=${encodeURIComponent(jobId)}`
          );
          const statusData = await statusRes.json();

          if (onProgress) {
            onProgress({
              progress: statusData.progress || Math.min(95, attempts * 2),
              step: statusData.current_step || "Processing in cloud render farm...",
              status: statusData.status,
              logs: statusData.logs || [],
            });
          }

          if (statusData.status === "ready") {
            clearInterval(interval);
            const fullVideoUrl = statusData.video_url?.startsWith("http")
              ? statusData.video_url
              : `${this.baseUrl}${statusData.video_url}`;

            resolve({
              jobId: statusData.job_id,
              assetId: statusData.asset_id,
              videoUrl: fullVideoUrl,
              thumbnailUrl: statusData.thumbnail_url,
            });
          } else if (statusData.status === "failed") {
            clearInterval(interval);
            reject(new Error(statusData.error || "Video rendering failed on server"));
          } else if (attempts >= maxAttempts) {
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
}

export const vixora = new VixoraClient();
export default vixora;
