import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { apiKeyService } from "./apiKeyService";
import { VideoRenderJob } from "../types";

let clientInstance: SupabaseClient | null = null;

export const supabaseService = {
  getClient(): SupabaseClient {
    if (!clientInstance) {
      const creds = apiKeyService.getCredentials();
      const url = creds.supabaseUrl || "https://yyejcbbcqirsigphzxxo.supabase.co";
      const key = creds.supabaseAnonKey || "sb_publishable_bgmE8p2LPYQn2eVWBUEdMw_6R4GplVZ";
      clientInstance = createClient(url, key);
    }
    return clientInstance;
  },

  async saveVideoProject(job: VideoRenderJob) {
    try {
      const client = this.getClient();
      const { data, error } = await client.from("vixora_video_jobs").upsert({
        id: job.id,
        topic: job.topic,
        script: job.script,
        aspect_ratio: job.aspectRatio,
        duration: job.duration,
        voice: job.voice,
        status: job.status,
        progress: job.progress,
        video_url: job.videoUrl,
        thumbnail_url: job.thumbnailUrl,
        user_id: job.userId,
        created_at: job.createdAt,
      });

      if (error) {
        console.warn("Supabase project save notice:", error.message);
      }
      return data;
    } catch (e) {
      console.warn("Supabase saveVideoProject exception:", e);
      return null;
    }
  },

  async fetchRecentJobs(userId?: string): Promise<VideoRenderJob[]> {
    try {
      const client = this.getClient();
      let query = client.from("vixora_video_jobs").select("*").order("created_at", { ascending: false }).limit(20);
      if (userId) {
        query = query.eq("user_id", userId);
      }
      const { data, error } = await query;
      if (error || !data) return [];
      return data.map((d: any) => ({
        id: d.id,
        topic: d.topic,
        script: d.script,
        aspectRatio: d.aspect_ratio || "vertical",
        duration: d.duration || "30s",
        voice: d.voice || "Kore",
        status: d.status || "ready",
        progress: d.progress || 100,
        currentStep: "Completed",
        videoUrl: d.video_url,
        thumbnailUrl: d.thumbnail_url,
        createdAt: d.created_at,
        userId: d.user_id,
      }));
    } catch {
      return [];
    }
  },
};
