import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_GGD_API_KEY = "ggd_e410d4513721427085a676531ee13505";
export const GGD_API_BASE_URL = "https://sdgxpquruczhkpyhjaxn.supabase.co/functions/v1/ad-network-api";

const GGD_CONFIG_CACHE_KEY = "btv_ggd_ad_network_config";
const GGD_HISTORY_CACHE_KEY = "btv_ggd_published_history";
const GGD_ADS_CACHE_KEY = "btv_ggd_live_ads_cache";

export interface GgdAdItem {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  target_url: string;
  created_at?: string;
}

export interface GgdAdNetworkConfig {
  apiKey: string;
  enabled: boolean;
  autoPublish: boolean;
  autoApprove: boolean; // Controls whether user adverts are auto-approved on platform (default true)
  displayGgdAdsInBanners: boolean;
}

export interface GgdPublishedRecord {
  id: string; // internal or generated
  local_ad_id?: string;
  title: string;
  description?: string;
  target_url: string;
  image_url?: string;
  duration_days: number;
  published_at: string;
  ggd_ad_id?: string;
  status: "success" | "pending_approval" | "failed";
  response_summary?: string;
  author_email?: string;
}

const DEFAULT_CONFIG: GgdAdNetworkConfig = {
  apiKey: DEFAULT_GGD_API_KEY,
  enabled: true,
  autoPublish: true,
  autoApprove: true,
  displayGgdAdsInBanners: true,
};

/**
 * Get active GGD Ad Network configuration.
 * Reads from site_settings table with resilient localStorage and default fallbacks.
 */
export async function getGgdConfig(): Promise<GgdAdNetworkConfig> {
  let cached: Partial<GgdAdNetworkConfig> = {};
  try {
    const raw = localStorage.getItem(GGD_CONFIG_CACHE_KEY);
    if (raw) cached = JSON.parse(raw);
  } catch {}

  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [
        "ggd_ad_network_api_key",
        "ggd_ad_network_enabled",
        "ggd_ad_network_auto_publish",
        "ad_auto_approve",
        "ggd_display_network_ads",
      ]);

    if (!error && data && data.length > 0) {
      const map: Record<string, string> = {};
      data.forEach((row: any) => {
        map[row.key] = row.value || "";
      });

      const resolved: GgdAdNetworkConfig = {
        apiKey: map.ggd_ad_network_api_key || cached.apiKey || DEFAULT_GGD_API_KEY,
        enabled: map.ggd_ad_network_enabled !== "false",
        autoPublish: map.ggd_ad_network_auto_publish !== "false",
        autoApprove: map.ad_auto_approve !== "false",
        displayGgdAdsInBanners: map.ggd_display_network_ads !== "false",
      };

      try {
        localStorage.setItem(GGD_CONFIG_CACHE_KEY, JSON.stringify(resolved));
      } catch {}

      return resolved;
    }
  } catch (err) {
    console.warn("GGD config remote fetch fallback:", err);
  }

  return {
    apiKey: cached.apiKey || DEFAULT_CONFIG.apiKey,
    enabled: cached.enabled !== undefined ? cached.enabled : DEFAULT_CONFIG.enabled,
    autoPublish: cached.autoPublish !== undefined ? cached.autoPublish : DEFAULT_CONFIG.autoPublish,
    autoApprove: cached.autoApprove !== undefined ? cached.autoApprove : DEFAULT_CONFIG.autoApprove,
    displayGgdAdsInBanners:
      cached.displayGgdAdsInBanners !== undefined ? cached.displayGgdAdsInBanners : DEFAULT_CONFIG.displayGgdAdsInBanners,
  };
}

/**
 * Save GGD Ad Network configuration.
 * Updates both site_settings and localStorage.
 */
export async function saveGgdConfig(updates: Partial<GgdAdNetworkConfig>): Promise<GgdAdNetworkConfig> {
  const current = await getGgdConfig();
  const next: GgdAdNetworkConfig = { ...current, ...updates };

  try {
    localStorage.setItem(GGD_CONFIG_CACHE_KEY, JSON.stringify(next));
  } catch {}

  const pairs = [
    { key: "ggd_ad_network_api_key", value: next.apiKey },
    { key: "ggd_ad_network_enabled", value: next.enabled ? "true" : "false" },
    { key: "ggd_ad_network_auto_publish", value: next.autoPublish ? "true" : "false" },
    { key: "ad_auto_approve", value: next.autoApprove ? "true" : "false" },
    { key: "ggd_display_network_ads", value: next.displayGgdAdsInBanners ? "true" : "false" },
  ];

  for (const pair of pairs) {
    try {
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", pair.key)
        .maybeSingle();

      if (existing) {
        await supabase.from("site_settings").update({ value: pair.value }).eq("key", pair.key);
      } else {
        await supabase.from("site_settings").insert(pair);
      }
    } catch (err) {
      console.warn(`Failed to persist setting ${pair.key}:`, err);
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("btv_ggd_config_updated", { detail: next }));
  }

  return next;
}

/**
 * Test API connection and key validity against GGD Ad Network
 */
export async function testGgdConnection(
  customApiKey?: string
): Promise<{ success: boolean; message: string; count?: number; latencyMs?: number; sampleAds?: GgdAdItem[] }> {
  const key = (customApiKey || (await getGgdConfig()).apiKey || DEFAULT_GGD_API_KEY).trim();
  if (!key) {
    return { success: false, message: "Missing API Key. Please provide a valid GGD key." };
  }

  const startTime = Date.now();
  try {
    const url = `${GGD_API_BASE_URL}?api_key=${encodeURIComponent(key)}&limit=5`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const latencyMs = Date.now() - startTime;
    const json = await res.json();

    if (!res.ok || json.success === false) {
      const errorDetail = json?.error || json?.message || `HTTP ${res.status}`;
      return {
        success: false,
        message: `Connection failed (${res.status}): ${errorDetail}`,
        latencyMs,
      };
    }

    return {
      success: true,
      message: `Connected successfully to GGD Ad Network in ${latencyMs}ms. Found ${json.count || json.ads?.length || 0} active network ads.`,
      count: json.count || (json.ads ? json.ads.length : 0),
      latencyMs,
      sampleAds: json.ads || [],
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      message: `Network error reaching GGD Ad Network: ${err.message || String(err)}`,
      latencyMs,
    };
  }
}

/**
 * Fetch live partner ads from GGD Ad Network for display in banner slots
 */
export async function fetchGgdAds(limit = 10, forceFresh = false): Promise<{ success: boolean; ads: GgdAdItem[]; count: number }> {
  const config = await getGgdConfig();
  if (!config.enabled || !config.displayGgdAdsInBanners) {
    return { success: true, ads: [], count: 0 };
  }

  const key = config.apiKey || DEFAULT_GGD_API_KEY;

  // Check cache (3 minute TTL)
  if (!forceFresh && typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(GGD_ADS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - (parsed.timestamp || 0) < 3 * 60 * 1000 && Array.isArray(parsed.ads)) {
          return { success: true, ads: parsed.ads, count: parsed.ads.length };
        }
      }
    } catch {}
  }

  try {
    const url = `${GGD_API_BASE_URL}?api_key=${encodeURIComponent(key)}&limit=${limit}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return { success: false, ads: [], count: 0 };
    }

    const json = await res.json();
    const ads: GgdAdItem[] = (json.ads || []).map((item: any) => ({
      id: item.id || `ggd-${Math.random().toString(36).slice(2, 9)}`,
      title: item.title || "Featured Sponsor",
      description: item.description || "",
      image_url: item.image_url || "",
      target_url: item.target_url || "https://ggdadnetwork.com.ng",
      created_at: item.created_at,
    }));

    try {
      localStorage.setItem(
        GGD_ADS_CACHE_KEY,
        JSON.stringify({ timestamp: Date.now(), ads })
      );
    } catch {}

    return {
      success: true,
      ads,
      count: json.count || ads.length,
    };
  } catch (err) {
    console.warn("fetchGgdAds error:", err);
    return { success: false, ads: [], count: 0 };
  }
}

/**
 * Track an impression or click event on GGD Ad Network
 */
export async function trackGgdEvent(adId: string, eventType: "impression" | "click"): Promise<void> {
  if (!adId || adId.startsWith("curated-")) return;

  const config = await getGgdConfig();
  const key = config.apiKey || DEFAULT_GGD_API_KEY;

  try {
    await fetch(GGD_API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
      },
      body: JSON.stringify({
        ad_id: adId,
        event_type: eventType,
      }),
    });
  } catch (err) {
    // Non-blocking telemetry warning
    console.debug(`GGD track event (${eventType}) notice:`, err);
  }
}

/**
 * Publish / Syndicate an advert to GGD Ad Network (POST endpoint 2)
 */
export async function publishAdToGgd(ad: {
  title: string;
  description?: string;
  target_url: string;
  image_url?: string;
  duration_days?: number;
  local_ad_id?: string;
  author_email?: string;
}): Promise<{
  success: boolean;
  ggd_ad_id?: string;
  data?: any;
  error?: string;
}> {
  const config = await getGgdConfig();
  const key = config.apiKey || DEFAULT_GGD_API_KEY;

  const payload = {
    title: ad.title.trim(),
    description: (ad.description || "").trim() || "Exclusive verified deal from Bethelincovibe Partner",
    target_url: (ad.target_url || "").trim(),
    image_url: (ad.image_url || "").trim(),
    duration_days: Math.max(1, Number(ad.duration_days || 30)),
  };

  if (!payload.title || !payload.target_url) {
    return { success: false, error: "Title and target URL are required for GGD Network submission." };
  }

  try {
    const res = await fetch(GGD_API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || json.success === false) {
      const errorMsg = json.error || json.message || `HTTP ${res.status}`;
      recordGgdPublication({
        id: `ggd-log-${Date.now()}`,
        local_ad_id: ad.local_ad_id,
        title: payload.title,
        description: payload.description,
        target_url: payload.target_url,
        image_url: payload.image_url,
        duration_days: payload.duration_days,
        published_at: new Date().toISOString(),
        status: "failed",
        response_summary: errorMsg,
        author_email: ad.author_email,
      });

      return {
        success: false,
        error: errorMsg,
        data: json,
      };
    }

    const ggdAdId = json.ad?.id || json.id || json.ad_id || (json.ads && json.ads[0]?.id) || null;

    // Record successful publication in local audit history
    recordGgdPublication({
      id: `ggd-log-${Date.now()}`,
      local_ad_id: ad.local_ad_id,
      title: payload.title,
      description: payload.description,
      target_url: payload.target_url,
      image_url: payload.image_url,
      duration_days: payload.duration_days,
      published_at: new Date().toISOString(),
      ggd_ad_id: ggdAdId,
      status: "success",
      response_summary: json.message || "Submitted successfully to GGD Ad Network",
      author_email: ad.author_email,
    });

    // If local_ad_id provided, update user_ads table with ggd metadata
    if (ad.local_ad_id) {
      try {
        await supabase
          .from("user_ads")
          .update({
            ggd_ad_id: ggdAdId,
            ggd_response: json,
          } as any)
          .eq("id", ad.local_ad_id);
      } catch (e) {
        console.warn("Could not update user_ads with ggd metadata:", e);
      }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("btv_ggd_ad_published", {
          detail: { ...payload, ggd_ad_id: ggdAdId, data: json },
        })
      );
    }

    return {
      success: true,
      ggd_ad_id: ggdAdId,
      data: json,
    };
  } catch (err: any) {
    const errorMsg = err.message || String(err);
    recordGgdPublication({
      id: `ggd-log-${Date.now()}`,
      local_ad_id: ad.local_ad_id,
      title: payload.title,
      description: payload.description,
      target_url: payload.target_url,
      image_url: payload.image_url,
      duration_days: payload.duration_days,
      published_at: new Date().toISOString(),
      status: "failed",
      response_summary: errorMsg,
      author_email: ad.author_email,
    });

    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Syndicate an existing user_ad row to GGD Network by ID
 */
export async function syndicateExistingAdToGgd(adId: string): Promise<{ success: boolean; message: string }> {
  try {
    const { data: ad, error } = await supabase
      .from("user_ads")
      .select("*")
      .eq("id", adId)
      .maybeSingle();

    if (error || !ad) {
      return { success: false, message: "Could not find advert in database" };
    }

    const res = await publishAdToGgd({
      title: ad.title,
      description: ad.description || undefined,
      target_url: ad.target_url,
      image_url: ad.image_url,
      duration_days: Number(ad.duration_days) || 30,
      local_ad_id: ad.id,
    });

    if (res.success) {
      return {
        success: true,
        message: `Successfully syndicated "${ad.title}" to GGD Ad Network! (GGD ID: ${res.ggd_ad_id || "Active"})`,
      };
    } else {
      return {
        success: false,
        message: `GGD Syndication failed: ${res.error || "Unknown error"}`,
      };
    }
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to syndicate advert" };
  }
}

/**
 * Get published audit records from local storage
 */
export function getGgdPublishedHistory(): GgdPublishedRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GGD_HISTORY_CACHE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Record a publication to audit log
 */
export function recordGgdPublication(record: GgdPublishedRecord): void {
  if (typeof window === "undefined") return;
  try {
    const history = getGgdPublishedHistory();
    // Prepend to top
    const next = [record, ...history.filter((h) => h.id !== record.id)].slice(0, 100);
    localStorage.setItem(GGD_HISTORY_CACHE_KEY, JSON.stringify(next));
  } catch {}
}

/**
 * Clear publication history
 */
export function clearGgdPublishedHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GGD_HISTORY_CACHE_KEY);
  } catch {}
}
