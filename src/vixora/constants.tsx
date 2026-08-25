import React from "react";
import {
  Smartphone,
  Square,
  Tv,
  Sparkles,
  Zap,
  Flame,
  Briefcase,
  TrendingUp,
  Volume2,
  Music,
  Video,
  Layers,
  Wand2,
} from "lucide-react";
import { VideoAspectRatio, VideoDuration, VoiceOption, SFXItem, MusicTrack } from "./types";

export const VIXORA_API_LIVE_BASE = "https://ais-dev-z3gmsn2xsvk2qfmakpvm37-164225214835.europe-west3.run.app";

export const ASPECT_RATIO_CONFIGS: {
  id: VideoAspectRatio;
  label: string;
  ratio: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  width: number;
  height: number;
}[] = [
  {
    id: "vertical",
    label: "Vertical 9:16",
    ratio: "9:16",
    icon: Smartphone,
    description: "TikTok, Reels, Shorts & WhatsApp Status",
    width: 1080,
    height: 1920,
  },
  {
    id: "square",
    label: "Square 1:1",
    ratio: "1:1",
    icon: Square,
    description: "Instagram & Facebook Feed Posts",
    width: 1080,
    height: 1080,
  },
  {
    id: "horizontal",
    label: "Horizontal 16:9",
    ratio: "16:9",
    icon: Tv,
    description: "YouTube, Website Landing & TV Screens",
    width: 1920,
    height: 1080,
  },
];

export const DURATION_CONFIGS: {
  id: VideoDuration;
  seconds: number;
  label: string;
  recommendedWords: string;
}[] = [
  { id: "15s", seconds: 15, label: "15 Seconds (Rapid Hook)", recommendedWords: "35 - 45 words" },
  { id: "30s", seconds: 30, label: "30 Seconds (Commercial)", recommendedWords: "70 - 90 words" },
  { id: "60s", seconds: 60, label: "60 Seconds (Full Story)", recommendedWords: "140 - 180 words" },
];

export const VOICE_CATALOG: VoiceOption[] = [
  {
    id: "Kore",
    name: "Adaobi (Kore Voice)",
    gender: "Female",
    description: "Flagship Energetic Nigerian Voice · High commercial drive & clarity",
    tag: "Flagship",
    pitch: 1.05,
    rate: 1.02,
    isFlagship: true,
  },
  {
    id: "Aoede",
    name: "Victoria (Studio Lead)",
    gender: "Female",
    description: "Authoritative, polished Victoria Studio Executive & AI Director",
    tag: "Studio Lead",
    pitch: 1.0,
    rate: 1.0,
    isFlagship: true,
  },
  {
    id: "Puck",
    name: "Puck (Viral Upbeat)",
    gender: "Male",
    description: "Punchy, fast-paced creator voice for social reels",
    tag: "Viral",
    pitch: 1.1,
    rate: 1.08,
  },
  {
    id: "Charon",
    name: "Charon (Cinematic Deep)",
    gender: "Male",
    description: "Deep, resonant & premium documentary narrator",
    tag: "Deep Bass",
    pitch: 0.85,
    rate: 0.95,
  },
  {
    id: "Fenrir",
    name: "Fenrir (Bold Reviewer)",
    gender: "Male",
    description: "Bold, intense & authoritative product breakdown voice",
    tag: "Punchy",
    pitch: 0.9,
    rate: 1.04,
  },
];

export const SFX_CATALOG: SFXItem[] = [
  { id: "whoosh_01", name: "Kinetic Whoosh", category: "Transitions", description: "Fast swish for camera transitions and text entries", cue: "whoosh" },
  { id: "pop_01", name: "Bubble Pop", category: "Accents", description: "Crisp pop for sticker and caption reveals", cue: "pop" },
  { id: "sub_drop_01", name: "Sub Bass Impact", category: "Impacts", description: "Heavy cinematic drop for big reveals and climax", cue: "sub_drop" },
  { id: "sparkle_01", name: "Magic Sparkle", category: "Accents", description: "Gleaming chime for feature callouts and offers", cue: "sparkle" },
  { id: "shutter_01", name: "Camera Shutter", category: "Accents", description: "Snappy mechanical click for screenshot cues", cue: "shutter" },
  { id: "coin_01", name: "Cash / Coin Ting", category: "Impacts", description: "Pleasing high-frequency chime for sales & profit", cue: "coin" },
];

export const MUSIC_CATALOG: MusicTrack[] = [
  { id: "afrobeats_groove", title: "Lagos Highlife Energy", mood: "Afrobeats / High Energy", bpm: 118, duration: "0:60", synthesizeMood: "afrobeats" },
  { id: "commercial_rise", title: "Venture Capital Pulse", mood: "Corporate & Tech", bpm: 124, duration: "0:60", synthesizeMood: "tech" },
  { id: "viral_trap_beat", title: "Midnight Viral Bounce", mood: "Modern Trap / Lo-Fi", bpm: 130, duration: "0:60", synthesizeMood: "energetic" },
  { id: "cinematic_epic", title: "Glory Horizon", mood: "Epic Cinematic", bpm: 95, duration: "0:60", synthesizeMood: "cinematic" },
  { id: "chill_lounge", title: "Sunset Mindset", mood: "Relaxed Lo-Fi & Focus", bpm: 85, duration: "0:60", synthesizeMood: "calm" },
];

export const PROMPT_PRESETS = [
  {
    topic: "3 Daily Habits for Peak Energy & 10x Business Output",
    niche: "Business & Productivity",
    duration: "30s" as VideoDuration,
    aspectRatio: "vertical" as VideoAspectRatio,
  },
  {
    topic: "How to Launch a High-Converting Sales Page in 10 Minutes",
    niche: "Marketing & Sales",
    duration: "30s" as VideoDuration,
    aspectRatio: "vertical" as VideoAspectRatio,
  },
  {
    topic: "Why 90% of First-Time Founders Fail and How to Avoid It",
    niche: "Startup Advice",
    duration: "60s" as VideoDuration,
    aspectRatio: "vertical" as VideoAspectRatio,
  },
  {
    topic: "The Ultimate Guide to Automating Your Business Operations",
    niche: "AI & Tech",
    duration: "30s" as VideoDuration,
    aspectRatio: "horizontal" as VideoAspectRatio,
  },
];
