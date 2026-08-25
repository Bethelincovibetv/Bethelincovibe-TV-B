
import React from 'react';
import vixoraAgentAvatar from '@/assets/images/vixora_agent_avatar_1786108775324.jpg';
import voiceAvatarAoede from '@/assets/images/voice_avatar_aoede_1786345470638.jpg';
import voiceAvatarPuck from '@/assets/images/voice_avatar_puck_1786345486751.jpg';
import voiceAvatarCharon from '@/assets/images/voice_avatar_charon_1786345498254.jpg';
import voiceAvatarFenrir from '@/assets/images/voice_avatar_fenrir_1786345507676.jpg';

export const WHATSAPP_SUPPORT_NUMBER = '07043537401';
export const SUPPORT_EMAIL = 'bethelgoodgift3@gmail.com';

// Added missing PAYSTACK_SECRET_KEY export to resolve build errors in paystackService.ts
// In production, sensitive keys should be managed via secure environment variables.
export const PAYSTACK_SECRET_KEY = '';

export const CATEGORY_ICONS = {
  Video: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Survey: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
  Social: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>,
  Review: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
};

export interface PresetTrack {
  id: string;
  name: string;
  url: string;
  mood: string;
  description: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  voiceName: string;
  accent: string;
  gender: 'Female' | 'Male';
  avatar: string;
  description: string;
  sampleText: string;
  badge?: string;
  flag?: string;
  isVixoraVoice?: boolean;
}

export const VOICE_AVATAR_OPTIONS: VoiceOption[] = [
  {
    id: 'aoede_warm',
    name: 'Victoria AI (Studio Lead & AI Director)',
    voiceName: 'Aoede',
    accent: 'Polished Executive Studio Accent',
    gender: 'Female',
    avatar: voiceAvatarAoede,
    description: 'Ultra-polished, authoritative Victoria Studio Executive & Creative Director tone for high-converting marketing, product storytelling, and executive narratives.',
    sampleText: 'Welcome to Vixora Studio. I am Victoria, your AI Executive Director. Let us craft high-retention viral storytelling together.',
    badge: 'FLAGSHIP AI STUDIO LEAD',
    isVixoraVoice: true
  },
  {
    id: 'kore_nigerian',
    name: 'Adaobi (Energetic Nigerian Voice)',
    voiceName: 'Kore',
    accent: 'Highly Energetic Nigerian Female Accent',
    gender: 'Female',
    avatar: vixoraAgentAvatar,
    description: 'Vibrant, highly energetic, natural Nigerian female AI tone. Energetic, witty, warm flagship commercial voice.',
    sampleText: 'Welcome! I am your energetic AI growth partner, ready to cook high-converting marketing videos with you!',
    badge: 'COMMERCIAL VIRAL VOICE',
    isVixoraVoice: true
  },
  {
    id: 'puck_high_energy',
    name: 'Puck (High Energy Viral)',
    voiceName: 'Puck',
    accent: 'High Energy Viral Accent',
    gender: 'Male',
    avatar: voiceAvatarPuck,
    description: 'Upbeat, fast-paced viral male voice ideal for TikTok, Instagram Reels, and YouTube Shorts hooks.',
    sampleText: 'Stop scrolling right now! Here are three proven secrets to scale your sales this month.',
    badge: 'VIRAL HOOKS',
  },
  {
    id: 'charon_dramatic',
    name: 'Charon (Corporate Authority)',
    voiceName: 'Charon',
    accent: 'Deep Cinematic Accent',
    gender: 'Male',
    avatar: voiceAvatarCharon,
    description: 'Authoritative deep cinematic tone for corporate pitch decks, documentary, and institutional showcases.',
    sampleText: 'In a world driven by constant innovation, one strategic market truth remains paramount.',
    badge: 'CORPORATE',
  },
  {
    id: 'fenrir_bold',
    name: 'Fenrir (Cinematic Visionary)',
    voiceName: 'Fenrir',
    accent: 'Bold & Direct Accent',
    gender: 'Male',
    avatar: voiceAvatarFenrir,
    description: 'Strong, articulate male tone for tech reviews, venture pitches, news, and executive breakdowns.',
    sampleText: 'Welcome back! Today we are dissecting the biggest AI breakthrough of the modern era.',
    badge: 'VISIONARY',
  }
];

export const VOICE_CATALOG = VOICE_AVATAR_OPTIONS;

export const SFX_CATALOG = [
  { id: 'whoosh', name: 'Air Whoosh Transition', type: 'synth', category: 'transitions' },
  { id: 'pop', name: 'Bubble Pop', type: 'synth', category: 'ui' },
  { id: 'sparkle', name: 'Magic Sparkle / Chime', type: 'synth', category: 'ui' },
  { id: 'sub_drop', name: 'Deep Sub Impact', type: 'synth', category: 'cinematic' },
  { id: 'shutter', name: 'Camera Shutter Snap', type: 'synth', category: 'foley' },
  { id: 'bell', name: 'Bright Bell Chime', type: 'synth', category: 'ui' },
  { id: 'vinyl_scratch', name: 'DJ Vinyl Scratch', type: 'synth', category: 'funny' },
  { id: 'applause', name: 'Crowd Applause', type: 'synth', category: 'funny' },
];

export const ASPECT_RATIO_CONFIGS = [
  { id: "9:16", label: "Vertical Reel (9:16)", description: "TikTok, IG Reels, YT Shorts", width: 1080, height: 1920, icon: "Smartphone" },
  { id: "16:9", label: "Landscape Video (16:9)", description: "YouTube, Website Banners", width: 1920, height: 1080, icon: "Tv" },
  { id: "1:1", label: "Square Feed (1:1)", description: "Instagram & LinkedIn Posts", width: 1080, height: 1080, icon: "Square" },
];

export const DURATION_CONFIGS = [
  { id: "15s", label: "15 Seconds", beats: 3, description: "Punchy, fast viral hook" },
  { id: "30s", label: "30 Seconds", beats: 5, description: "Standard high-retention short" },
  { id: "60s", label: "60 Seconds", beats: 8, description: "Deep storytelling breakdown" },
];

export interface PromptPreset {
  topic: string;
  duration?: VideoDuration;
  aspectRatio?: VideoAspectRatio;
}

export const PROMPT_PRESETS: PromptPreset[] = [
  { topic: "5 habits that made me financially free in my 20s", duration: "30s", aspectRatio: "vertical" },
  { topic: "The psychology behind why you can't stop scrolling", duration: "30s", aspectRatio: "vertical" },
  { topic: "How artificial intelligence will replace standard programming by 2028", duration: "60s", aspectRatio: "landscape" },
  { topic: "3 unspoken rules of entrepreneurship no guru will tell you", duration: "30s", aspectRatio: "vertical" },
  { topic: "Why your brain loves dopamine and how to reset it in 48 hours", duration: "60s", aspectRatio: "vertical" },
];

export const VIXORA_API_LIVE_BASE = "https://api.vixora.ai/v1";

export const PRESET_MUSIC_TRACKS: PresetTrack[] = [
  // Original 6 Core Tracks
  { id: 'motivational', name: 'Motivational Rise', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', mood: 'motivational', description: 'Energetic building rhythm' },
  { id: 'epic', name: 'Epic Cinema', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', mood: 'dramatic', description: 'Orchestral deep crescendo' },
  { id: 'calm', name: 'Chill Ambient', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', mood: 'calm', description: 'Restful, soothing focus pad' },
  { id: 'upbeat', name: 'Bright Pop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', mood: 'upbeat', description: 'Cheerful uplifting acoustic guitar' },
  { id: 'corporate', name: 'Clean Corporate', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', mood: 'corporate', description: 'Smart, professional presentation' },
  { id: 'future', name: 'Future Cyber', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', mood: 'tech', description: 'Cyberpunk cinematic electronic' },

  // New expansion packs requested by creator user
  { id: 'sunset-lounge', name: 'Sunset Lounge', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', mood: 'calm', description: 'Smooth atmospheric jazz and warm deep bass' },
  { id: 'neon-horizon', name: 'Neon Horizon', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', mood: 'tech', description: 'Driving synthwave highway explorer beat' },
  { id: 'productive-flow', name: 'Productive Flow', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', mood: 'corporate', description: 'Inspirational electronic pulse for deep focus' },
  { id: 'cinematic-velocity', name: 'Cinematic Velocity', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', mood: 'dramatic', description: 'Staccato orchestration with powerful cinematic action' },
  { id: 'acoustic-sunshine', name: 'Acoustic Sunshine', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', mood: 'upbeat', description: 'Happy handclaps with vibrant acoustic lead strumming' },
  { id: 'dreamy-lofi', name: 'Dreamy Lofi', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', mood: 'calm', description: 'Relaxing vintage dusty vinyl textures and bells' },
  { id: 'cybernetic-chase', name: 'Cybernetic Chase', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3', mood: 'tech', description: 'High-voltage techno bassline for hyperactive visuals' },
  { id: 'summer-fest', name: 'Summer Fest', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3', mood: 'upbeat', description: 'Uplifting tropical house dance chords and breeze' },
  { id: 'inspiring-narrative', name: 'Inspiring Narrative', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3', mood: 'motivational', description: 'Emotional modern piano string ensemble crossover' },
  { id: 'industrial-edge', name: 'Industrial Edge', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3', mood: 'tech', description: 'Gritty mechanical driving rhythms and digital grids' },
  { id: 'morning-dew', name: 'Morning Dew', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3?v=morning', mood: 'calm', description: 'Gentle classical guitar and organic wooden percussion' },
  { id: 'peak-performance', name: 'Peak Performance', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3?v=peak', mood: 'motivational', description: 'Intense building drum build-ups with brass accent' },
  { id: 'midnight-drive', name: 'Midnight Drive', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3?v=midnight', mood: 'tech', description: 'Atmospheric retro-wave synthesizer and analog kick' },
  { id: 'corporate-catalyst', name: 'Corporate Catalyst', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3?v=catalyst', mood: 'corporate', description: 'Smart technological pulse for data and modern slides' },
  { id: 'symphonic-hope', name: 'Symphonic Hope', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3?v=hope', mood: 'dramatic', description: 'Violin crescendo build up for beautiful transitions' },
  { id: 'indie-vibe', name: 'Indie Vibe', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3?v=indie', mood: 'upbeat', description: 'Shuffling drums and playful indie pop backing loop' },
  { id: 'hyper-focus', name: 'Hyper Focus', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3?v=hyper', mood: 'corporate', description: 'Minimalist clicks and ticking clock ambient layer' },
  { id: 'ocean-spray', name: 'Ocean Spray', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3?v=ocean', mood: 'calm', description: 'Slow waves and soft chime notes for meditation content' },
  { id: 'vlog-breeze', name: 'Vlog Breeze', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3?v=vlog', mood: 'upbeat', description: 'Perfect friendly, lighthearted background hum for creators' },
  { id: 'action-odyssey', name: 'Action Odyssey', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3?v=action', mood: 'dramatic', description: 'Adrenaline pumping, high-tempo brass and drum tracking' }
];

export const MUSIC_CATALOG = PRESET_MUSIC_TRACKS;
