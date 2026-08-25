export type VideoAspectRatio = "vertical" | "square" | "horizontal";
export type VideoDuration = "15s" | "30s" | "60s" | "120s" | "180s";

export interface VoiceOption {
  id: string;
  name: string;
  gender: "Female" | "Male";
  description: string;
  tag?: string;
  pitch?: number;
  rate?: number;
  isFlagship?: boolean;
}

export interface ScriptBeat {
  timestamp?: number;
  durationSeconds?: number;
  text: string;
  caption?: string;
  visualSearchQuery?: string;
  visualKeywords?: string[];
  sfxCue?: "whoosh" | "pop" | "sub_drop" | "sparkle" | "shutter" | "none";
  bgTheme?: "lagos" | "sunset" | "cyber" | "finance" | "neon" | "minimal";
  bgImageUrl?: string;
}

export interface VideoScene {
  id: string;
  text: string;
  caption: string;
  durationSeconds: number;
  bgTheme: string;
  bgImageUrl?: string;
  visualKeywords: string[];
  sfxCue?: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  mood: string;
  bpm: number;
  duration: string;
  audioUrl?: string;
  synthesizeMood?: "energetic" | "calm" | "cinematic" | "tech" | "afrobeats";
}

export interface SFXItem {
  id: string;
  name: string;
  category: "Transitions" | "Accents" | "Impacts" | "UI";
  description: string;
  cue: "whoosh" | "pop" | "sub_drop" | "sparkle" | "shutter" | "coin" | "chime";
}

export interface VideoRenderJob {
  id: string;
  topic: string;
  script: string;
  aspectRatio: VideoAspectRatio;
  duration: VideoDuration;
  voice: string;
  musicTrackId?: string;
  status: "idle" | "queued" | "generating_script" | "synthesizing_audio" | "rendering_frames" | "encoding_mp4" | "ready" | "failed";
  progress: number;
  currentStep: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  createdAt: string;
  userId?: string;
}

export interface StockAsset {
  id: string;
  title: string;
  url: string;
  thumbUrl: string;
  orientation: VideoAspectRatio;
  tags: string[];
  duration?: number;
  source: string;
}

export interface UserSubscription {
  plan: "Free" | "Starter" | "Creator" | "Agency";
  creditsRemaining: number;
  renewsOn?: string;
  isActive: boolean;
}

export interface ApiCredentials {
  geminiApiKey?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  paystackPublicKey?: string;
  customApiBaseUrl?: string;
}
