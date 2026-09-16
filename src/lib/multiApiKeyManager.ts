import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/integrations/supabase/client";

export type ApiKeyStatus =
  | "active"
  | "standby"
  | "quota_exceeded"
  | "rate_limited"
  | "invalid"
  | "disabled";

export interface GeminiApiKeyConfig {
  id: string;
  name: string;
  key: string;
  provider: "google_ai_studio" | "gemini_paid" | "custom";
  status: ApiKeyStatus;
  assignedFeatures: string[];
  isPrimary?: boolean;
  quotaLimitPerDay?: number;
  requestCountToday?: number;
  lastCheckedAt?: string;
  latencyMs?: number;
  lastError?: string;
  createdAt: string;
}

export interface AiFeatureConnectionConfig {
  featureKey: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  assignedKeyId?: string; // specific key ID or 'auto' for pool failover
  category: "core" | "creator" | "marketing" | "admin" | "specialist";
}

export const PLATFORM_AI_FEATURES: AiFeatureConnectionConfig[] = [
  {
    featureKey: "executive_admin",
    name: "Victoria Vance (Executive AI Coordinator)",
    description: "Chief operating intelligence: multi-agent task dispatch, platform diagnostics, auto-tuning & daily briefings.",
    icon: "Cpu",
    enabled: true,
    assignedKeyId: "auto",
    category: "admin",
  },
  {
    featureKey: "ai_course_creator",
    name: "AI Masterclass & Course Hub",
    description: "High-yield curriculum architect: 8-15 active-recall flashcards, video lesson matching, modules & quizzes.",
    icon: "GraduationCap",
    enabled: true,
    assignedKeyId: "auto",
    category: "creator",
  },
  {
    featureKey: "coach_ai",
    name: "Dr. Socrates Bennett (AI Business Coach)",
    description: "Real-time tactical advisory: business modeling, Naira pricing strategies, WhatsApp sales scripts & execution plans.",
    icon: "Crown",
    enabled: true,
    assignedKeyId: "auto",
    category: "specialist",
  },
  {
    featureKey: "ai_matchmaker",
    name: "Maya Sterling (Smart Opportunity Matchmaker & Request Parser)",
    description: "Real-time AI request comprehension, natural language client brief parsing, verified supplier opportunity matchmaking, and bid recommendation scoring.",
    icon: "Sparkles",
    enabled: true,
    assignedKeyId: "auto",
    category: "specialist",
  },
  {
    featureKey: "support_ai",
    name: "Aria Chen (Merchant & Customer Success AI)",
    description: "Dedicated customer support: merchant verification, onboarding assistance, wallet settlements & catalog guides.",
    icon: "MessageSquare",
    enabled: true,
    assignedKeyId: "auto",
    category: "specialist",
  },
  {
    featureKey: "community_ai",
    name: "Adaobi Eze (Community & Forum AI)",
    description: "Community moderation, verified supplier discovery, forum engagement & scam prevention guidance.",
    icon: "MessageSquare",
    enabled: true,
    assignedKeyId: "auto",
    category: "specialist",
  },
  {
    featureKey: "ai_blogger",
    name: "AI Strategic Blogger & Auto-Writer",
    description: "Trending Lagos & global wholesale market intelligence, SEO articles, vlogs & affiliate link matching.",
    icon: "FileText",
    enabled: true,
    assignedKeyId: "auto",
    category: "marketing",
  },
  {
    featureKey: "business_service_designer",
    name: "AI Service & Catalog Designer",
    description: "Automated high-converting service offerings, benefit structuring, Naira pricing models & CTA hooks.",
    icon: "Palette",
    enabled: true,
    assignedKeyId: "auto",
    category: "creator",
  },
  {
    featureKey: "business_profile_enhancer",
    name: "AI Profile & Brand Enhancer",
    description: "Public business profile copy, credibility stories, trust pillars & WhatsApp bio hooks.",
    icon: "Sparkles",
    enabled: true,
    assignedKeyId: "auto",
    category: "creator",
  },
  {
    featureKey: "ai_logo_generator",
    name: "AI Commercial Logo Generator",
    description: "Vector brand identity generation: wordmarks, lettermarks, 3D luxury emblems & high-res exports.",
    icon: "Sparkles",
    enabled: true,
    assignedKeyId: "auto",
    category: "creator",
  },
  {
    featureKey: "video_creator",
    name: "Vixora AI Video Studio",
    description: "Full-stack automated video production: viral scripts, B-roll scene synthesis & Nigerian voiceovers.",
    icon: "Video",
    enabled: true,
    assignedKeyId: "auto",
    category: "creator",
  },
  {
    featureKey: "queen_engine",
    name: "Queen VIP Business AI Engine",
    description: "Automated business catalog generation, service flyers, market classification & WhatsApp funnels.",
    icon: "Crown",
    enabled: true,
    assignedKeyId: "auto",
    category: "core",
  },
  {
    featureKey: "whatsapp_engine",
    name: "WhatsApp Automation & Status Engine",
    description: "Daily status sales copy, click-to-chat inquiry messages & customer CRM engagement.",
    icon: "MessageSquare",
    enabled: true,
    assignedKeyId: "auto",
    category: "marketing",
  },
  {
    featureKey: "sales_funnel",
    name: "High-Converting Sales Funnel AI",
    description: "Product landing page copy, problem-solution hooks, FAQ generator & Paystack checkout integration.",
    icon: "Rocket",
    enabled: true,
    assignedKeyId: "auto",
    category: "marketing",
  },
  {
    featureKey: "marketing_ai",
    name: "Sarah Jenkins (Marketing Director AI)",
    description: "Direct-response ad campaigns, WhatsApp broadcast copy, flash sale angles & audience retargeting.",
    icon: "Rocket",
    enabled: true,
    assignedKeyId: "auto",
    category: "marketing",
  },
  {
    featureKey: "security_ai",
    name: "Sentinel Briggs (Trust & Cyber AI)",
    description: "Scam detection, merchant verification audit, payout fraud prevention & transaction security.",
    icon: "ShieldCheck",
    enabled: true,
    assignedKeyId: "auto",
    category: "admin",
  },
  {
    featureKey: "greeter_ai",
    name: "3D Virtual Shop Greeter & Concierge",
    description: "Real-time 3D voice and conversational concierge introducing business catalog, services & answering visitor questions.",
    icon: "User",
    enabled: true,
    assignedKeyId: "auto",
    category: "specialist",
  },
];

// Memory cache of keys to avoid excessive database reads
let memoryKeysPool: GeminiApiKeyConfig[] | null = null;
let memoryFeaturesConfig: AiFeatureConnectionConfig[] | null = null;
let lastPoolFetchTime = 0;

/**
 * Fetch all configured API keys from site_settings with fallback to env/primary settings
 */
export async function getApiKeyPool(forceRefresh = false): Promise<GeminiApiKeyConfig[]> {
  const now = Date.now();
  if (!forceRefresh && memoryKeysPool && now - lastPoolFetchTime < 30000) {
    return memoryKeysPool;
  }

  try {
    const { data: poolSetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "gemini_api_keys_pool")
      .maybeSingle();

    let pool: GeminiApiKeyConfig[] = [];
    if (poolSetting?.value) {
      try {
        pool = JSON.parse(poolSetting.value);
      } catch (parseErr) {
        console.warn("Could not parse gemini_api_keys_pool setting:", parseErr);
      }
    }

    // Check single key legacy setting
    const { data: singleSetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "gemini_api_key")
      .maybeSingle();

    const envKey =
      import.meta.env.VITE_GEMINI_API_KEY ||
      (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : "");

    // If pool is empty, bootstrap with legacy single setting or env key
    if (pool.length === 0) {
      const defaultKey = singleSetting?.value || envKey || "";
      if (defaultKey && defaultKey.trim().length > 10) {
        pool.push({
          id: "key_primary_default",
          name: "Primary Google AI Studio Key",
          key: defaultKey.trim(),
          provider: "google_ai_studio",
          status: "active",
          assignedFeatures: ["all"],
          isPrimary: true,
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      // Ensure primary legacy key is synchronized if changed
      if (singleSetting?.value && singleSetting.value.trim().length > 10) {
        const existingSingle = pool.find((k) => k.key === singleSetting.value.trim());
        if (!existingSingle) {
          pool.unshift({
            id: `key_${Date.now()}`,
            name: "Primary Site Setting Key",
            key: singleSetting.value.trim(),
            provider: "google_ai_studio",
            status: "active",
            assignedFeatures: ["all"],
            isPrimary: true,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    memoryKeysPool = pool;
    lastPoolFetchTime = now;
    return pool;
  } catch (err) {
    console.warn("Error getting API key pool:", err);
    return memoryKeysPool || [];
  }
}

/**
 * Save updated API key pool to site_settings
 */
export async function saveApiKeyPool(pool: GeminiApiKeyConfig[]): Promise<boolean> {
  try {
    memoryKeysPool = pool;
    lastPoolFetchTime = Date.now();

    const jsonVal = JSON.stringify(pool);

    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", "gemini_api_keys_pool")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("site_settings")
        .update({ value: jsonVal })
        .eq("key", "gemini_api_keys_pool");
    } else {
      await supabase
        .from("site_settings")
        .insert({ key: "gemini_api_keys_pool", value: jsonVal });
    }

    // Keep primary legacy key synchronized with the active primary key
    const primaryKey = pool.find((k) => k.isPrimary && k.status === "active") || pool.find((k) => k.status === "active");
    if (primaryKey) {
      const { data: existingSingle } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", "gemini_api_key")
        .maybeSingle();

      if (existingSingle) {
        await supabase
          .from("site_settings")
          .update({ value: primaryKey.key })
          .eq("key", "gemini_api_key");
      } else {
        await supabase
          .from("site_settings")
          .insert({ key: "gemini_api_key", value: primaryKey.key });
      }
    }

    return true;
  } catch (err) {
    console.error("Failed to save API key pool:", err);
    return false;
  }
}

/**
 * Fetch all AI Features connection configuration
 */
export async function getAiFeaturesConfig(forceRefresh = false): Promise<AiFeatureConnectionConfig[]> {
  if (!forceRefresh && memoryFeaturesConfig) {
    return memoryFeaturesConfig;
  }

  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "ai_features_config")
      .maybeSingle();

    if (data?.value) {
      const savedConfig: AiFeatureConnectionConfig[] = JSON.parse(data.value);
      // Merge with master list in case new features were added
      const merged = PLATFORM_AI_FEATURES.map((def) => {
        const found = savedConfig.find((s) => s.featureKey === def.featureKey);
        return found ? { ...def, ...found } : def;
      });
      memoryFeaturesConfig = merged;
      return merged;
    }
  } catch (err) {
    console.warn("Could not load ai_features_config, using platform defaults:", err);
  }

  memoryFeaturesConfig = [...PLATFORM_AI_FEATURES];
  return memoryFeaturesConfig;
}

/**
 * Save AI Features connection configuration
 */
export async function saveAiFeaturesConfig(config: AiFeatureConnectionConfig[]): Promise<boolean> {
  try {
    memoryFeaturesConfig = config;
    const jsonVal = JSON.stringify(config);

    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", "ai_features_config")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("site_settings")
        .update({ value: jsonVal })
        .eq("key", "ai_features_config");
    } else {
      await supabase
        .from("site_settings")
        .insert({ key: "ai_features_config", value: jsonVal });
    }
    return true;
  } catch (err) {
    console.error("Failed to save AI features config:", err);
    return false;
  }
}

/**
 * Test real-time connection and latency of an individual API key
 */
export async function testApiKeyConnection(
  apiKey: string
): Promise<{ success: boolean; latencyMs: number; status: ApiKeyStatus; error?: string }> {
  const cleanKey = apiKey.trim();
  if (!cleanKey || cleanKey.length < 10) {
    return {
      success: false,
      latencyMs: 0,
      status: "invalid",
      error: "Key is missing or too short (minimum 10 characters required)",
    };
  }

  const startTime = Date.now();
  try {
    const ai = new GoogleGenAI({ apiKey: cleanKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: "ping",
      config: {
        maxOutputTokens: 2,
        temperature: 0.1,
      },
    });

    const latency = Date.now() - startTime;
    if (response && response.text !== undefined) {
      return {
        success: true,
        latencyMs: latency,
        status: "active",
      };
    } else {
      return {
        success: false,
        latencyMs: latency,
        status: "invalid",
        error: "No response text received from model",
      };
    }
  } catch (err: any) {
    const latency = Date.now() - startTime;
    const errString = String(err?.message || err);

    let status: ApiKeyStatus = "invalid";
    if (
      errString.includes("429") ||
      errString.includes("RESOURCE_EXHAUSTED") ||
      errString.includes("quota") ||
      errString.includes("credit")
    ) {
      status = "quota_exceeded";
    } else if (errString.includes("rate") || errString.includes("too many requests")) {
      status = "rate_limited";
    } else if (errString.includes("API key not valid") || errString.includes("403") || errString.includes("401")) {
      status = "invalid";
    }

    return {
      success: false,
      latencyMs: latency,
      status,
      error: errString.slice(0, 200),
    };
  }
}

/**
 * Smart automatic failover: Gets a healthy, active GoogleGenAI client
 * for the requested feature, transparently cycling to standby keys if any key is exhausted.
 */
export async function getHealthyGeminiClient(
  featureKey?: string
): Promise<{ client: GoogleGenAI; keyConfig: GeminiApiKeyConfig } | null> {
  const pool = await getApiKeyPool();
  if (pool.length === 0) return null;

  // Check if this feature is disabled by admin switch
  if (featureKey) {
    const featuresConfig = await getAiFeaturesConfig();
    const feat = featuresConfig.find((f) => f.featureKey === featureKey);
    if (feat && !feat.enabled) {
      console.warn(`[MultiApiKeyManager] AI Feature '${featureKey}' is disabled by admin connection switch.`);
      return null;
    }

    // If feature is pinned to a specific key, try that first
    if (feat && feat.assignedKeyId && feat.assignedKeyId !== "auto") {
      const assigned = pool.find((k) => k.id === feat.assignedKeyId);
      if (assigned && (assigned.status === "active" || assigned.status === "standby")) {
        return {
          client: new GoogleGenAI({ apiKey: assigned.key.trim() }),
          keyConfig: assigned,
        };
      }
    }
  }

  // Filter healthy candidates: active first, then standby
  const activeCandidates = pool.filter((k) => k.status === "active");
  const standbyCandidates = pool.filter((k) => k.status === "standby");
  const candidatePool = [...activeCandidates, ...standbyCandidates];

  if (candidatePool.length === 0) {
    // Fallback: try any key that is not explicitly marked invalid or disabled
    const salvageable = pool.filter((k) => k.status !== "invalid" && k.status !== "disabled");
    if (salvageable.length > 0) {
      return {
        client: new GoogleGenAI({ apiKey: salvageable[0].key.trim() }),
        keyConfig: salvageable[0],
      };
    }
    return null;
  }

  // Pick primary if healthy, otherwise top candidate
  const chosenKey = candidatePool.find((k) => k.isPrimary) || candidatePool[0];

  return {
    client: new GoogleGenAI({ apiKey: chosenKey.key.trim() }),
    keyConfig: chosenKey,
  };
}

/**
 * Report a runtime error on a key (e.g. 429 quota exhausted), automatically
 * updating its status in the pool so subsequent requests fail over instantly.
 */
export async function reportKeyFailure(keyId: string, error: any): Promise<void> {
  const pool = await getApiKeyPool();
  const index = pool.findIndex((k) => k.id === keyId);
  if (index === -1) return;

  const errStr = String(error?.message || error);
  let newStatus: ApiKeyStatus = "standby";

  if (
    errStr.includes("429") ||
    errStr.includes("RESOURCE_EXHAUSTED") ||
    errStr.includes("quota") ||
    errStr.includes("credit")
  ) {
    newStatus = "quota_exceeded";
  } else if (errStr.includes("API key not valid") || errStr.includes("403") || errStr.includes("401")) {
    newStatus = "invalid";
  } else if (errStr.includes("rate")) {
    newStatus = "rate_limited";
  }

  pool[index].status = newStatus;
  pool[index].lastError = errStr.slice(0, 180);
  pool[index].lastCheckedAt = new Date().toISOString();

  await saveApiKeyPool(pool);
}

/**
 * Test real-time connection for a specific feature endpoint
 */
export async function testFeatureConnection(
  featureKey: string
): Promise<{ success: boolean; latencyMs: number; keyName?: string; error?: string }> {
  const startTime = Date.now();
  try {
    const handle = await getHealthyGeminiClient(featureKey);
    if (!handle) {
      return {
        success: false,
        latencyMs: 0,
        error: "Feature is disabled by admin switch or no active API keys are available in the pool.",
      };
    }

    const resp = await handle.client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: "ping",
      config: {
        maxOutputTokens: 2,
        temperature: 0.1,
      },
    });

    const latency = Date.now() - startTime;
    if (resp && resp.text !== undefined) {
      return {
        success: true,
        latencyMs: latency,
        keyName: handle.keyConfig.name,
      };
    } else {
      return {
        success: false,
        latencyMs: latency,
        keyName: handle.keyConfig.name,
        error: "No response text received from model",
      };
    }
  } catch (err: any) {
    return {
      success: false,
      latencyMs: Date.now() - startTime,
      error: String(err?.message || err).slice(0, 200),
    };
  }
}

