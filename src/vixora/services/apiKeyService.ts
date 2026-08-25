import { ApiCredentials } from "../types";

const STORAGE_KEY = "vixora_api_credentials";

export const apiKeyService = {
  getCredentials(): ApiCredentials {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      return {
        geminiApiKey:
          parsed.geminiApiKey ||
          (import.meta as any).env?.VITE_GEMINI_API_KEY ||
          (typeof process !== "undefined" ? (process as any).env?.GEMINI_API_KEY : "") ||
          "AIzaSyAeCyBC9daZbvXNRtfLjxBWwpF3MwXJggk",
        supabaseUrl:
          parsed.supabaseUrl ||
          (import.meta as any).env?.VITE_SUPABASE_URL ||
          "https://yyejcbbcqirsigphzxxo.supabase.co",
        supabaseAnonKey:
          parsed.supabaseAnonKey ||
          (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
          "sb_publishable_bgmE8p2LPYQn2eVWBUEdMw_6R4GplVZ",
        paystackPublicKey:
          parsed.paystackPublicKey ||
          (import.meta as any).env?.VITE_PAYSTACK_PUBLIC_KEY ||
          "pk_test_vixora_default_key",
        customApiBaseUrl:
          parsed.customApiBaseUrl ||
          "https://ais-dev-z3gmsn2xsvk2qfmakpvm37-164225214835.europe-west3.run.app",
      };
    } catch {
      return {
        geminiApiKey: "AIzaSyAeCyBC9daZbvXNRtfLjxBWwpF3MwXJggk",
        supabaseUrl: "https://yyejcbbcqirsigphzxxo.supabase.co",
        supabaseAnonKey: "sb_publishable_bgmE8p2LPYQn2eVWBUEdMw_6R4GplVZ",
        customApiBaseUrl: "https://ais-dev-z3gmsn2xsvk2qfmakpvm37-164225214835.europe-west3.run.app",
      };
    }
  },

  saveCredentials(creds: Partial<ApiCredentials>) {
    const current = this.getCredentials();
    const updated = { ...current, ...creds };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },

  resetCredentials() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
