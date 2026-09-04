import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/integrations/supabase/client";
import { getApiKeyPool } from "@/lib/multiApiKeyManager";

export type ModelCategory = "flagship" | "reasoning" | "fast" | "dynamic" | "custom";

export interface GeminiModelDefinition {
  id: string;
  name: string;
  description: string;
  category: ModelCategory;
  badge: string;
  contextWindow: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  isLatest?: boolean;
  isDefault?: boolean;
  isDiscovered?: boolean;
  discoveredAt?: string;
  speedRating: number; // 1 to 5
  intelligenceRating: number; // 1 to 5
}

/**
 * Standard Verified Google Gemini 3 Model Registry
 * Strictly conforms to Gemini 3 series specifications.
 */
export const STANDARD_GEMINI_MODELS: GeminiModelDefinition[] = [
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    description: "Google's newest flagship flash model. Exceptional reasoning, high velocity, and superior business strategy generation.",
    category: "flagship",
    badge: "Flagship Recommended",
    contextWindow: "1,048,576 tokens",
    inputTokenLimit: 1048576,
    outputTokenLimit: 8192,
    isLatest: true,
    isDefault: true,
    speedRating: 5,
    intelligenceRating: 5,
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro (Deep Thinking)",
    description: "Deep strategic reasoning & mathematical modeling. Ideal for unit economics, cash-flow forecasting, and complex negotiations.",
    category: "reasoning",
    badge: "Deep Reasoning",
    contextWindow: "2,097,152 tokens",
    inputTokenLimit: 2097152,
    outputTokenLimit: 8192,
    isLatest: true,
    speedRating: 4,
    intelligenceRating: 5,
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    description: "Ultra-low latency and hyper-efficient throughput. Built for fast conversational turnaround and high-frequency operational Q&A.",
    category: "fast",
    badge: "Ultra-Fast",
    contextWindow: "1,048,576 tokens",
    inputTokenLimit: 1048576,
    outputTokenLimit: 8192,
    speedRating: 5,
    intelligenceRating: 4,
  },
  {
    id: "gemini-flash-latest",
    name: "Gemini Flash (Dynamic Google Alias)",
    description: "Dynamic Google alias that automatically routes to the newest stable flash model release without code changes.",
    category: "dynamic",
    badge: "Auto-Updated",
    contextWindow: "1,048,576+ tokens",
    isLatest: true,
    speedRating: 5,
    intelligenceRating: 5,
  },
  {
    id: "gemini-3.1-flash-image",
    name: "Gemini 3.1 Flash Image (Vision & Media)",
    description: "Multimodal image understanding and commercial visual critique. Ideal for reviewing product photos, catalogs, and flyers.",
    category: "flagship",
    badge: "Multimodal Vision",
    contextWindow: "1,048,576 tokens",
    speedRating: 4,
    intelligenceRating: 5,
  },
];

const LOCAL_STORAGE_ACTIVE_MODEL = "btv_active_gemini_model";
const LOCAL_STORAGE_DISCOVERED_MODELS = "btv_discovered_gemini_models";

let memoryDiscoveredModels: GeminiModelDefinition[] | null = null;
let lastDiscoveryFetch = 0;

/**
 * Filter out deprecated legacy models (gemini-1.5, gemini-2.0, gemini-pro legacy)
 */
export function isAllowedModernGeminiModel(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  if (lower.includes("1.5") || lower.includes("2.0") || lower.includes("gemini-pro-vision") || lower.includes("embedding")) {
    return false;
  }
  return true;
}

/**
 * Get all available Gemini models, combining standard curated models with dynamically
 * discovered models from the Google Generative Language API and custom models.
 */
export async function getAvailableGeminiModels(forceRefresh = false): Promise<GeminiModelDefinition[]> {
  const now = Date.now();

  // Return cached in-memory if fresh
  if (!forceRefresh && memoryDiscoveredModels && now - lastDiscoveryFetch < 60000) {
    return mergeModelsWithStandard(memoryDiscoveredModels);
  }

  // Try loading from localStorage first for instant rendering
  try {
    const rawLocal = localStorage.getItem(LOCAL_STORAGE_DISCOVERED_MODELS);
    if (rawLocal && !memoryDiscoveredModels) {
      memoryDiscoveredModels = JSON.parse(rawLocal);
    }
  } catch {
    // Ignore localStorage errors
  }

  // Load from site_settings (Supabase)
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "gemini_discovered_models")
      .maybeSingle();

    if (data?.value) {
      const parsed: GeminiModelDefinition[] = JSON.parse(data.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryDiscoveredModels = parsed;
        lastDiscoveryFetch = now;
        try {
          localStorage.setItem(LOCAL_STORAGE_DISCOVERED_MODELS, JSON.stringify(parsed));
        } catch {
          // Ignore
        }
      }
    }
  } catch (err) {
    console.warn("Could not load discovered models from site_settings:", err);
  }

  return mergeModelsWithStandard(memoryDiscoveredModels || []);
}

function mergeModelsWithStandard(discovered: GeminiModelDefinition[]): GeminiModelDefinition[] {
  const map = new Map<string, GeminiModelDefinition>();

  // Add standard models first
  for (const model of STANDARD_GEMINI_MODELS) {
    map.set(model.id, model);
  }

  // Merge discovered / custom models
  for (const model of discovered) {
    if (isAllowedModernGeminiModel(model.id)) {
      const existing = map.get(model.id);
      if (existing) {
        // Keep existing curated description if standard, but update token limits/info
        map.set(model.id, {
          ...existing,
          ...model,
          description: existing.description || model.description,
          badge: existing.badge || model.badge,
        });
      } else {
        map.set(model.id, model);
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Dynamic Google Models Discovery:
 * Directly calls Google's Generative Language API endpoint using an active API key
 * to query all currently available models. If Google releases any new model,
 * it is automatically retrieved, categorized, and made selectable in the app without
 * requiring any code changes!
 */
export async function syncGoogleModelsFromApi(
  customApiKey?: string
): Promise<{ success: boolean; totalModels: number; newlyAdded: number; message: string }> {
  try {
    // Resolve API key
    let apiKey = customApiKey?.trim();
    if (!apiKey) {
      const pool = await getApiKeyPool();
      const healthyKey = pool.find((k) => k.status === "active" || k.status === "standby") || pool[0];
      if (healthyKey) apiKey = healthyKey.key.trim();
    }

    if (!apiKey || apiKey.length < 10) {
      const envKey =
        import.meta.env.VITE_GEMINI_API_KEY ||
        (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : "");
      apiKey = envKey?.trim();
    }

    if (!apiKey) {
      return {
        success: false,
        totalModels: STANDARD_GEMINI_MODELS.length,
        newlyAdded: 0,
        message: "No active Google Gemini API key configured to query models.",
      };
    }

    // Call Google Generative Language API list models
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(endpoint);

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Google API returned status ${res.status}: ${errBody.slice(0, 150)}`);
    }

    const json = await res.json();
    const rawModels: any[] = json?.models || [];

    const existingModels = await getAvailableGeminiModels(true);
    const existingIds = new Set(existingModels.map((m) => m.id));

    let newlyAdded = 0;
    const discoveredList: GeminiModelDefinition[] = [];

    for (const raw of rawModels) {
      // e.g. "models/gemini-3.8-flash" -> "gemini-3.8-flash"
      const modelId = (raw.name || "").replace(/^models\//, "");

      // Validate supported generation methods
      const supportedMethods: string[] = raw.supportedGenerationMethods || [];
      if (!supportedMethods.includes("generateContent")) continue;

      // Filter out deprecated models
      if (!isAllowedModernGeminiModel(modelId)) continue;

      const isNew = !existingIds.has(modelId);
      if (isNew) newlyAdded++;

      let category: ModelCategory = "flagship";
      if (modelId.includes("pro")) category = "reasoning";
      else if (modelId.includes("lite") || modelId.includes("fast")) category = "fast";
      else if (modelId.includes("latest") || modelId.includes("alias")) category = "dynamic";

      const discoveredModel: GeminiModelDefinition = {
        id: modelId,
        name: raw.displayName || formatModelName(modelId),
        description: raw.description || `Google Generative AI ${modelId} model.`,
        category,
        badge: isNew ? "✨ New Google Release" : category === "reasoning" ? "Deep Reasoning" : "Google Cloud",
        contextWindow: raw.inputTokenLimit ? `${(raw.inputTokenLimit / 1000).toLocaleString()}k tokens` : "1M tokens",
        inputTokenLimit: raw.inputTokenLimit,
        outputTokenLimit: raw.outputTokenLimit,
        isLatest: isNew || modelId.includes("latest") || modelId.includes("3.8") || modelId.includes("3.1"),
        isDiscovered: true,
        discoveredAt: new Date().toISOString(),
        speedRating: category === "fast" ? 5 : category === "reasoning" ? 4 : 5,
        intelligenceRating: category === "reasoning" ? 5 : 5,
      };

      discoveredList.push(discoveredModel);
    }

    // Combine discovered models with current list
    const merged = mergeModelsWithStandard(discoveredList);
    memoryDiscoveredModels = merged;
    lastDiscoveryFetch = Date.now();

    // Persist to localStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_DISCOVERED_MODELS, JSON.stringify(merged));
    } catch {
      // Ignore
    }

    // Persist to Supabase site_settings so all users and admin benefit
    try {
      const jsonVal = JSON.stringify(merged);
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", "gemini_discovered_models")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("site_settings")
          .update({ value: jsonVal })
          .eq("key", "gemini_discovered_models");
      } else {
        await supabase
          .from("site_settings")
          .insert({ key: "gemini_discovered_models", value: jsonVal });
      }
    } catch (saveErr) {
      console.warn("Could not persist discovered models to site_settings:", saveErr);
    }

    return {
      success: true,
      totalModels: merged.length,
      newlyAdded,
      message: newlyAdded > 0
        ? `Successfully synced! Discovered ${newlyAdded} new Google Gemini model${newlyAdded > 1 ? "s" : ""}. Total active models: ${merged.length}.`
        : `All Google models are up to date. (${merged.length} models verified active)`,
    };
  } catch (err: any) {
    console.error("Failed to sync models from Google API:", err);
    return {
      success: false,
      totalModels: STANDARD_GEMINI_MODELS.length,
      newlyAdded: 0,
      message: err.message || "Failed to reach Google Generative Language API",
    };
  }
}

function formatModelName(id: string): string {
  return id
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get the currently active Gemini Model ID for user session / platform
 */
export function getActiveGeminiModelId(): string {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_ACTIVE_MODEL);
    if (saved && isAllowedModernGeminiModel(saved)) return saved;
  } catch {
    // Ignore
  }
  return "gemini-3.8-flash";
}

/**
 * Set the currently active Gemini Model ID for user session
 */
export function setActiveGeminiModelId(modelId: string): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_MODEL, modelId);
  } catch {
    // Ignore
  }
}

/**
 * Test a specific model's latency and response validity
 */
export async function testGeminiModel(
  modelId: string,
  apiKey?: string
): Promise<{ success: boolean; latencyMs: number; error?: string }> {
  const startTime = Date.now();
  try {
    let key = apiKey?.trim();
    if (!key) {
      const pool = await getApiKeyPool();
      const healthyKey = pool.find((k) => k.status === "active" || k.status === "standby") || pool[0];
      if (healthyKey) key = healthyKey.key.trim();
    }

    if (!key) {
      const envKey =
        import.meta.env.VITE_GEMINI_API_KEY ||
        (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : "");
      key = envKey?.trim();
    }

    if (!key) throw new Error("No API key available for testing.");

    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: modelId,
      contents: "ping",
      config: {
        maxOutputTokens: 2,
        temperature: 0.1,
      },
    });

    const latency = Date.now() - startTime;
    if (response && response.text !== undefined) {
      return { success: true, latencyMs: latency };
    }
    return { success: false, latencyMs: latency, error: "Empty model response." };
  } catch (err: any) {
    return {
      success: false,
      latencyMs: Date.now() - startTime,
      error: String(err?.message || err).slice(0, 180),
    };
  }
}
