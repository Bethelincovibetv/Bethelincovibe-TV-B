import { GoogleGenAI, Modality } from "@google/genai";
import { supabase } from "@/integrations/supabase/client";
import {
  GoogleLiveVoiceAgent,
  VoiceAgentState,
  VoiceAgentCallbacks,
  GoogleVoiceOptions,
  cleanTextForSpeech,
  buildWavFromPcm,
  requestMicrophoneAccess,
} from "./googleLiveVoiceEngine";

export type VixoraVoiceName = "Kore" | "Aoede" | "Puck" | "Charon" | "Fenrir" | "Zephyr" | "Alloy" | "Shimmer";

export interface VixoraVoicePersona {
  id: VixoraVoiceName;
  name: string;
  gender: "Female" | "Male" | "Neutral";
  description: string;
  pitch: number;
  rate: number;
  tag: string;
}

export const VIXORA_VOICE_PERSONAS: VixoraVoicePersona[] = [
  {
    id: "Aoede",
    name: "Victoria (Studio Lead & AI Director)",
    gender: "Female",
    description: "Authoritative, ultra-polished Victoria Studio Lead & AI Creative Producer",
    pitch: 1.0,
    rate: 1.0,
    tag: "Flagship Lead",
  },
  {
    id: "Kore",
    name: "Adaobi (Energetic Nigerian Voice)",
    gender: "Female",
    description: "Energetic, articulate & sharp Lagos business strategist",
    pitch: 1.05,
    rate: 1.02,
    tag: "Commercial",
  },
  {
    id: "Puck",
    name: "Puck (Viral & High Energy)",
    gender: "Male",
    description: "Persuasive, high-energy marketing & sales coach",
    pitch: 1.0,
    rate: 1.04,
    tag: "High Energy",
  },
  {
    id: "Charon",
    name: "Charon (Corporate Authority)",
    gender: "Male",
    description: "Deep, authoritative & corporate strategy mentor",
    pitch: 0.95,
    rate: 0.98,
    tag: "Corporate",
  },
  {
    id: "Fenrir",
    name: "Fenrir (Cinematic Visionary)",
    gender: "Male",
    description: "Rich storytelling, vision & venture building",
    pitch: 0.98,
    rate: 1.0,
    tag: "Visionary",
  },
  {
    id: "Zephyr",
    name: "Zephyr (Calm & Friendly)",
    gender: "Male",
    description: "Calm, friendly & supportive operations guide",
    pitch: 1.0,
    rate: 0.98,
    tag: "Friendly",
  },
];

export interface VixoraVoiceOptions extends GoogleVoiceOptions {
  voiceName?: VixoraVoiceName;
  systemPrompt?: string;
  coachName?: string;
}

/**
 * VixoraLiveVoiceAgent
 * High-performance real-time live voice call engine powered by Vixora AI.
 * Built for ultra-low latency, intelligent VAD pause detection, and multi-voice synthesis.
 */
export class VixoraLiveVoiceAgent extends GoogleLiveVoiceAgent {
  private customVoice: VixoraVoiceName;

  constructor(options: VixoraVoiceOptions = {}, callbacks: VoiceAgentCallbacks = {}) {
    super(
      {
        voiceName: (options.voiceName as any) || "Aoede",
        lang: options.lang || "en-US",
        silenceTimeoutMs: options.silenceTimeoutMs || 1100, // Ultra snappy 1.1s real-time turnaround
        continuous: options.continuous ?? true,
        pitch: options.pitch || 1.0,
        rate: options.rate || 1.0,
      },
      callbacks
    );
    this.customVoice = options.voiceName || "Aoede";
  }

  public setVoice(voice: VixoraVoiceName) {
    this.customVoice = voice;
    const persona = VIXORA_VOICE_PERSONAS.find((p) => p.id === voice);
    if (persona) {
      this.setVoiceConfig({
        voiceName: (persona.id as any) || "Aoede",
        pitch: persona.pitch,
        rate: persona.rate,
      });
    }
  }

  public getVoice(): VixoraVoiceName {
    return this.customVoice;
  }
}

export {
  type VoiceAgentState,
  type VoiceAgentCallbacks,
  cleanTextForSpeech,
  buildWavFromPcm,
  requestMicrophoneAccess,
};
