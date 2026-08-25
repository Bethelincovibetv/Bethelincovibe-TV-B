import { vixora } from "@/services/vixoraClient";
import { supabaseService } from "./supabaseService";
import { VideoRenderJob } from "../types";

export const dataSyncService = {
  async syncUserWithVixoraCloud(user: { id: string; email: string; name?: string }) {
    try {
      const res = await vixora.syncUserSession({
        userId: user.id,
        email: user.email,
        fullName: user.name,
      });
      return res;
    } catch (err) {
      console.warn("Vixora cloud SSO sync notice:", err);
      return { ok: false };
    }
  },

  async persistRenderJob(job: VideoRenderJob) {
    // 1. Local storage history
    try {
      const stored = localStorage.getItem("vixora_local_jobs");
      const list: VideoRenderJob[] = stored ? JSON.parse(stored) : [];
      const updated = [job, ...list.filter((j) => j.id !== job.id)].slice(0, 30);
      localStorage.setItem("vixora_local_jobs", JSON.stringify(updated));
    } catch (e) {
      console.warn("Local job save error:", e);
    }

    // 2. Supabase Cloud Sync
    try {
      await supabaseService.saveVideoProject(job);
    } catch (e) {
      console.warn("Supabase project sync notice:", e);
    }
  },

  getLocalJobs(): VideoRenderJob[] {
    try {
      const stored = localStorage.getItem("vixora_local_jobs");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },
};
