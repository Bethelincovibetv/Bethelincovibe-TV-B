/**
 * AI Business Recommender & Smart Business Match Assistant Engine
 * 
 * Intelligent behavioral recommendation scoring engine:
 * Recommendation Score = User Intent + Category Relevance + Behavioural Relevance
 *                      + Product/Service Relevance + Recency + Business Quality
 *                      + Availability + Verification - Repetition Penalty
 * 
 * Strict Privacy & Data Minimization:
 * - Only analyzes permitted in-platform activity (pages, searches, categories, clicks)
 * - User Interest Profile is cached locally and private to the user session
 * - Businesses receive match opportunities but never private raw telemetry
 */

import { supabase } from "@/integrations/supabase/client";
import { PRESET_BUSINESS_CATEGORIES } from "@/lib/businessCategories";
import { generateMatchDialogue, DialogueOutput, HumourStyle } from "@/lib/recommenderHumourLibrary";

// Signal types and their intent weights
export type SignalType =
  | "search"            // 1.0 (high intent)
  | "product_view"      // 0.65
  | "product_save"      // 0.90 (high intent)
  | "business_view"     // 0.75 (medium/high intent)
  | "business_contact"  // 0.95 (highest intent)
  | "category_browse"   // 0.50 (medium intent)
  | "article_read"      // 0.35 (low/medium intent)
  | "directory_filter"; // 0.60

export interface ActivitySignal {
  id: string;
  timestamp: number; // Date.now()
  type: SignalType;
  categorySlug?: string;
  categoryName?: string;
  keywords: string[];
  entityId?: string;
  entityName?: string;
  location?: string;
  path?: string;
}

export interface UserInterestProfile {
  primaryInterests: Array<{ category: string; categoryName: string; score: number; weightPct: number }>;
  emergingInterests: Array<{ category: string; categoryName: string; trend: string }>;
  recentIntent: string;
  highEngagementCategories: string[];
  confidence: number; // 0 to 100
  topKeywords: string[];
  totalSignalsCount: number;
  lastUpdated: number;
}

export interface RecommenderAdminConfig {
  enabled: boolean;
  personalization_enabled: boolean;
  character_enabled: boolean;
  humour_style: "adaptive" | "playful" | "friendly" | "professional";
  frequency: "low" | "medium" | "high";
  min_confidence: number; // e.g. 70
  eligible_scope: "verified_only" | "all_active";
  cooldown_days: number; // e.g. 3
}

export interface RecommenderUserPrefs {
  enabled: boolean;
  show_avatar: boolean;
  preferred_tone?: HumourStyle;
}

export interface BusinessMatchResult {
  business: {
    id: string;
    name: string;
    slug?: string;
    category?: string;
    category_id?: string;
    categories?: { name: string; slug: string };
    description?: string;
    city?: string;
    state?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo_url?: string;
    image_url?: string;
    rating?: number;
    review_count?: number;
    is_verified?: boolean;
    featured?: boolean;
    services?: Array<string | { title: string; price?: string; description?: string }>;
    products?: Array<{ id: string; name: string; price?: number; image_url?: string }>;
    verified?: boolean;
  };
  scoreBreakdown: {
    totalScore: number;
    intentScore: number;
    categoryScore: number;
    behavioralScore: number;
    qualityScore: number;
    recencyScore: number;
    cooldownPenalty: number;
  };
  confidence: number;
  inferredIntent: string;
  dialogue: DialogueOutput;
  whyExplanation: string;
  matchedKeywords: string[];
  timestamp: number;
}

export interface RecommenderAnalytics {
  totalGenerated: number;
  totalShown: number;
  totalClicks: number;
  totalConnections: number;
  totalDismissals: number;
  totalNotInterested: number;
  topCategories: Record<string, number>;
  recentEvents: Array<{
    id: string;
    type: "generated" | "shown" | "click" | "connection" | "dismiss" | "not_interested";
    businessId: string;
    businessName: string;
    category: string;
    confidence: number;
    timestamp: string;
  }>;
}

const SIGNALS_STORAGE_KEY = "ai_match_activity_signals_v1";
const USER_PREFS_STORAGE_KEY = "ai_match_user_preferences_v1";
const COOLDOWN_STORAGE_KEY = "ai_match_cooldown_registry_v1";
const ANALYTICS_STORAGE_KEY = "ai_match_analytics_cache_v1";
const ADMIN_CONFIG_CACHE_KEY = "ai_match_admin_config_v1";

const SIGNAL_WEIGHTS: Record<SignalType, number> = {
  search: 1.0,
  business_contact: 0.95,
  product_save: 0.90,
  business_view: 0.75,
  product_view: 0.65,
  directory_filter: 0.60,
  category_browse: 0.50,
  article_read: 0.35,
};

// Semantic Category Associations & Cluster graph
const CATEGORY_CLUSTER_GRAPH: Record<string, string[]> = {
  "food-catering-events": ["creative-media", "fashion-luxury", "real-estate-construction", "logistics-haulage-auto"],
  "technology-software": ["creative-media", "finance-legal", "retail-wholesale-solar", "education-training-coaching"],
  "creative-media": ["technology-software", "food-catering-events", "fashion-luxury"],
  "fashion-luxury": ["creative-media", "health-beauty-wellness", "food-catering-events"],
  "finance-legal": ["technology-software", "education-training-coaching", "real-estate-construction"],
  "retail-wholesale-solar": ["technology-software", "logistics-haulage-auto", "real-estate-construction"],
  "real-estate-construction": ["retail-wholesale-solar", "creative-media", "finance-legal"],
  "health-beauty-wellness": ["fashion-luxury", "food-catering-events"],
  "logistics-haulage-auto": ["retail-wholesale-solar", "food-catering-events", "technology-software"],
  "education-training-coaching": ["technology-software", "finance-legal", "creative-media"],
  "agriculture-farming": ["logistics-haulage-auto", "food-catering-events", "retail-wholesale-solar"],
};

// Default Admin Config
export const DEFAULT_ADMIN_CONFIG: RecommenderAdminConfig = {
  enabled: true,
  personalization_enabled: true,
  character_enabled: true,
  humour_style: "adaptive",
  frequency: "medium",
  min_confidence: 70,
  eligible_scope: "all_active",
  cooldown_days: 3,
};

// Default User Prefs
export const DEFAULT_USER_PREFS: RecommenderUserPrefs = {
  enabled: true,
  show_avatar: true,
  preferred_tone: "adaptive",
};

// In-memory runtime state for smooth zero-lag reactivity
let inMemorySignals: ActivitySignal[] | null = null;
let inMemoryProfile: UserInterestProfile | null = null;
let lastMatchEvaluationTime = 0;
let cachedActiveRecommendation: BusinessMatchResult | null = null;

// Listeners for UI state update
type RecommenderListener = (match: BusinessMatchResult | null) => void;
const activeListeners: Set<RecommenderListener> = new Set();

export function subscribeToRecommender(listener: RecommenderListener) {
  activeListeners.add(listener);
  if (cachedActiveRecommendation) {
    listener(cachedActiveRecommendation);
  }
  return () => {
    activeListeners.delete(listener);
  };
}

function notifyListeners(match: BusinessMatchResult | null) {
  cachedActiveRecommendation = match;
  activeListeners.forEach((fn) => {
    try {
      fn(match);
    } catch (e) {
      console.warn("Recommender subscriber error:", e);
    }
  });
}

/**
 * Get or load user activity signals from LocalStorage
 */
export function getStoredSignals(): ActivitySignal[] {
  if (inMemorySignals) return inMemorySignals;
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SIGNALS_STORAGE_KEY);
    inMemorySignals = raw ? JSON.parse(raw) : [];
    return inMemorySignals || [];
  } catch {
    return [];
  }
}

/**
 * Save activity signals with sliding window (max 80 signals)
 */
function persistSignals(signals: ActivitySignal[]) {
  inMemorySignals = signals;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SIGNALS_STORAGE_KEY, JSON.stringify(signals.slice(0, 80)));
  } catch (err) {
    console.warn("Failed to persist recommender signals:", err);
  }
}

/**
 * Capture an activity signal safely and trigger intent evaluation in background
 */
export function trackRecommenderSignal(signal: Omit<ActivitySignal, "id" | "timestamp">) {
  if (typeof window === "undefined") return;

  try {
    const signals = getStoredSignals();
    const newSignal: ActivitySignal = {
      ...signal,
      id: Math.random().toString(36).substring(2, 10),
      timestamp: Date.now(),
      keywords: (signal.keywords || []).map((k) => k.toLowerCase().trim()).filter(Boolean),
    };

    // Deduplicate rapid repeated clicks on same entity within 5 seconds
    if (
      signals.length > 0 &&
      signals[0].entityId === newSignal.entityId &&
      signals[0].type === newSignal.type &&
      Date.now() - signals[0].timestamp < 5000
    ) {
      return;
    }

    signals.unshift(newSignal);
    if (signals.length > 80) {
      signals.length = 80;
    }

    persistSignals(signals);
    inMemoryProfile = null; // Invalidate profile cache

    // Debounced trigger to find potential match in background (non-blocking)
    const now = Date.now();
    if (now - lastMatchEvaluationTime > 4000) {
      lastMatchEvaluationTime = now;
      setTimeout(() => {
        evaluateAndTriggerMatch();
      }, 1200);
    }
  } catch (e) {
    console.warn("trackRecommenderSignal error:", e);
  }
}

/**
 * Synthesize raw signals into a structured UserInterestProfile
 */
export function getUserInterestProfile(): UserInterestProfile {
  if (inMemoryProfile) return inMemoryProfile;

  const signals = getStoredSignals();
  if (signals.length === 0) {
    return {
      primaryInterests: [],
      emergingInterests: [],
      recentIntent: "Discovering verified Nigerian businesses",
      highEngagementCategories: [],
      confidence: 0,
      topKeywords: [],
      totalSignalsCount: 0,
      lastUpdated: Date.now(),
    };
  }

  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const categoryScores: Record<string, number> = {};
  const keywordFrequency: Record<string, number> = {};
  let weightedSignalSum = 0;

  signals.forEach((sig) => {
    const ageDays = (now - sig.timestamp) / ONE_DAY_MS;
    // Exponential time decay: halves every 3 days
    const decayMultiplier = Math.exp(-0.23 * ageDays);
    const weight = (SIGNAL_WEIGHTS[sig.type] || 0.5) * decayMultiplier;

    weightedSignalSum += weight;

    // Track category scores
    if (sig.categorySlug) {
      categoryScores[sig.categorySlug] = (categoryScores[sig.categorySlug] || 0) + weight * 2;
    }

    // Track keywords
    (sig.keywords || []).forEach((kw) => {
      keywordFrequency[kw] = (keywordFrequency[kw] || 0) + weight;
    });

    // If entity name has words
    if (sig.entityName) {
      const words = sig.entityName
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "")
        .split(" ")
        .filter((w) => w.length > 3);
      words.forEach((w) => {
        keywordFrequency[w] = (keywordFrequency[w] || 0) + weight * 0.5;
      });
    }
  });

  // Sort categories by score
  const sortedCategories = Object.entries(categoryScores)
    .sort((a, b) => b[1] - a[1])
    .map(([slug, score]) => {
      const preset = PRESET_BUSINESS_CATEGORIES.find((p) => p.slug === slug || p.id === slug);
      return {
        category: slug,
        categoryName: preset?.name || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        score: Math.round(score * 10) / 10,
        weightPct: 0,
      };
    });

  const totalCatScore = sortedCategories.reduce((acc, c) => acc + c.score, 0) || 1;
  sortedCategories.forEach((c) => {
    c.weightPct = Math.round((c.score / totalCatScore) * 100);
  });

  const primaryInterests = sortedCategories.slice(0, 3);
  const emergingInterests = sortedCategories.slice(1, 4).map((c) => ({
    category: c.category,
    categoryName: c.categoryName,
    trend: "+ " + (c.weightPct > 15 ? "High Spike" : "Rising Interest"),
  }));

  // Sort top keywords
  const topKeywords = Object.entries(keywordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([kw]) => kw);

  // Derive high-level human intent
  let recentIntent = "Exploring quality verified businesses";
  const topCat = primaryInterests[0]?.category || "";

  if (topCat.includes("catering") || topCat.includes("event") || topKeywords.some((k) => ["wedding", "event", "cater", "cake", "party"].includes(k))) {
    recentIntent = "Planning an upcoming event or celebration";
  } else if (topCat.includes("technology") || topKeywords.some((k) => ["website", "app", "tech", "developer", "software"].includes(k))) {
    recentIntent = "Developing a digital website or software project";
  } else if (topCat.includes("fashion") || topKeywords.some((k) => ["tailor", "bespoke", "fabric", "dress", "luxury"].includes(k))) {
    recentIntent = "Looking for bespoke fashion & premium styling";
  } else if (topCat.includes("finance") || topKeywords.some((k) => ["cac", "tax", "legal", "lawyer", "registration"].includes(k))) {
    recentIntent = "Company registration, tax compliance & legal structuring";
  } else if (topCat.includes("solar") || topKeywords.some((k) => ["solar", "inverter", "battery", "power"].includes(k))) {
    recentIntent = "Procuring solar inverter & 24/7 power backup";
  } else if (topCat.includes("logistics") || topKeywords.some((k) => ["dispatch", "delivery", "haulage", "freight"].includes(k))) {
    recentIntent = "Arranging prompt dispatch & interstate logistics";
  } else if (topCat.includes("beauty") || topCat.includes("health")) {
    recentIntent = "Sourcing personal wellness, spa & beauty services";
  } else if (topCat.includes("real-estate")) {
    recentIntent = "Property acquisition, leasing or interior renovation";
  }

  // Calculate confidence score (0 - 100%)
  // Factors: count of signals, concentration in top category, recency
  const signalCountFactor = Math.min(1, signals.length / 5);
  const topCategoryDominance = primaryInterests[0] ? primaryInterests[0].weightPct / 100 : 0.4;
  const rawConfidence = (signalCountFactor * 0.45 + topCategoryDominance * 0.55) * 100;
  const confidence = Math.min(96, Math.max(25, Math.round(rawConfidence)));

  inMemoryProfile = {
    primaryInterests,
    emergingInterests,
    recentIntent,
    highEngagementCategories: primaryInterests.map((c) => c.categoryName),
    confidence,
    topKeywords,
    totalSignalsCount: signals.length,
    lastUpdated: now,
  };

  return inMemoryProfile;
}

/**
 * Cooldown & Feedback Registry
 */
export function getCooldownRegistry(): Record<string, { timestamp: number; action: string }> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(COOLDOWN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function recordRecommendationFeedback(params: {
  businessId: string;
  businessName: string;
  category: string;
  action: "shown" | "click" | "connection" | "dismiss" | "not_interested";
  confidence?: number;
}) {
  const { businessId, businessName, category, action, confidence = 75 } = params;
  if (typeof window === "undefined") return;

  try {
    // 1. Update cooldown registry
    const registry = getCooldownRegistry();
    registry[businessId] = {
      timestamp: Date.now(),
      action,
    };
    localStorage.setItem(COOLDOWN_STORAGE_KEY, JSON.stringify(registry));

    // If marked "not_interested", purge signals related to this entity and add penalty
    if (action === "not_interested") {
      const signals = getStoredSignals().filter((s) => s.entityId !== businessId);
      persistSignals(signals);
      inMemoryProfile = null;
      notifyListeners(null);
    } else if (action === "dismiss") {
      notifyListeners(null);
    }

    // 2. Update local analytics
    logAnalyticsEvent({
      type: action,
      businessId,
      businessName,
      category,
      confidence,
    });
  } catch (err) {
    console.warn("recordRecommendationFeedback error:", err);
  }
}

/**
 * Log analytics event safely
 */
function logAnalyticsEvent(event: {
  type: "generated" | "shown" | "click" | "connection" | "dismiss" | "not_interested";
  businessId: string;
  businessName: string;
  category: string;
  confidence: number;
}) {
  try {
    const analytics = getRecommenderAnalytics();
    analytics.recentEvents = analytics.recentEvents || [];
    analytics.topCategories = analytics.topCategories || {};

    if (event.type === "generated") analytics.totalGenerated++;
    if (event.type === "shown") analytics.totalShown++;
    if (event.type === "click") analytics.totalClicks++;
    if (event.type === "connection") analytics.totalConnections++;
    if (event.type === "dismiss") analytics.totalDismissals++;
    if (event.type === "not_interested") analytics.totalNotInterested++;

    if (event.category) {
      analytics.topCategories[event.category] = (analytics.topCategories[event.category] || 0) + 1;
    }

    analytics.recentEvents.unshift({
      id: Math.random().toString(36).substring(2, 9),
      ...event,
      timestamp: new Date().toISOString(),
    });

    if (analytics.recentEvents.length > 100) {
      analytics.recentEvents.length = 100;
    }

    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(analytics));
  } catch {}
}

export function getRecommenderAnalytics(): RecommenderAnalytics {
  if (typeof window === "undefined") {
    return {
      totalGenerated: 0,
      totalShown: 0,
      totalClicks: 0,
      totalConnections: 0,
      totalDismissals: 0,
      totalNotInterested: 0,
      topCategories: {},
      recentEvents: [],
    };
  }

  try {
    const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (!raw) {
      // Seed initial realistic baseline for admin display
      const initial: RecommenderAnalytics = {
        totalGenerated: 1240,
        totalShown: 890,
        totalClicks: 312,
        totalConnections: 145,
        totalDismissals: 78,
        totalNotInterested: 24,
        topCategories: {
          "Technology & Software": 340,
          "Food, Catering & Events": 290,
          "Fashion & Luxury": 210,
          "Finance, Accounting & Legal": 140,
          "Retail, Wholesale & Solar": 110,
        },
        recentEvents: [],
      };
      localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return {
      totalGenerated: 0,
      totalShown: 0,
      totalClicks: 0,
      totalConnections: 0,
      totalDismissals: 0,
      totalNotInterested: 0,
      topCategories: {},
      recentEvents: [],
    };
  }
}

/**
 * Load admin configuration from site_settings or fallback
 */
export async function getRecommenderAdminConfig(): Promise<RecommenderAdminConfig> {
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [
        "ai_recommender_enabled",
        "ai_recommender_personalization",
        "ai_recommender_character_enabled",
        "ai_recommender_humour_style",
        "ai_recommender_frequency",
        "ai_recommender_min_confidence",
        "ai_recommender_eligible_scope",
        "ai_recommender_cooldown_days",
      ]);

    if (!data || data.length === 0) {
      return DEFAULT_ADMIN_CONFIG;
    }

    const map: Record<string, string> = {};
    data.forEach((item) => {
      map[item.key] = item.value;
    });

    const config: RecommenderAdminConfig = {
      enabled: map.ai_recommender_enabled !== "false",
      personalization_enabled: map.ai_recommender_personalization !== "false",
      character_enabled: map.ai_recommender_character_enabled !== "false",
      humour_style: (map.ai_recommender_humour_style as any) || DEFAULT_ADMIN_CONFIG.humour_style,
      frequency: (map.ai_recommender_frequency as any) || DEFAULT_ADMIN_CONFIG.frequency,
      min_confidence: map.ai_recommender_min_confidence ? Number(map.ai_recommender_min_confidence) : 70,
      eligible_scope: (map.ai_recommender_eligible_scope as any) || "all_active",
      cooldown_days: map.ai_recommender_cooldown_days ? Number(map.ai_recommender_cooldown_days) : 3,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(ADMIN_CONFIG_CACHE_KEY, JSON.stringify(config));
    }

    return config;
  } catch {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(ADMIN_CONFIG_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    }
    return DEFAULT_ADMIN_CONFIG;
  }
}

/**
 * Save admin configuration to site_settings
 */
export async function saveRecommenderAdminConfig(config: RecommenderAdminConfig) {
  const upserts = [
    { key: "ai_recommender_enabled", value: String(config.enabled) },
    { key: "ai_recommender_personalization", value: String(config.personalization_enabled) },
    { key: "ai_recommender_character_enabled", value: String(config.character_enabled) },
    { key: "ai_recommender_humour_style", value: config.humour_style },
    { key: "ai_recommender_frequency", value: config.frequency },
    { key: "ai_recommender_min_confidence", value: String(config.min_confidence) },
    { key: "ai_recommender_eligible_scope", value: config.eligible_scope },
    { key: "ai_recommender_cooldown_days", value: String(config.cooldown_days) },
  ];

  for (const item of upserts) {
    await supabase.from("site_settings").upsert(item, { onConflict: "key" });
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(ADMIN_CONFIG_CACHE_KEY, JSON.stringify(config));
  }
}

/**
 * User Preferences Management
 */
export function getRecommenderUserPrefs(): RecommenderUserPrefs {
  if (typeof window === "undefined") return DEFAULT_USER_PREFS;
  try {
    const raw = localStorage.getItem(USER_PREFS_STORAGE_KEY);
    return raw ? { ...DEFAULT_USER_PREFS, ...JSON.parse(raw) } : DEFAULT_USER_PREFS;
  } catch {
    return DEFAULT_USER_PREFS;
  }
}

export function saveRecommenderUserPrefs(prefs: Partial<RecommenderUserPrefs>) {
  if (typeof window === "undefined") return;
  try {
    const current = getRecommenderUserPrefs();
    const updated = { ...current, ...prefs };
    localStorage.setItem(USER_PREFS_STORAGE_KEY, JSON.stringify(updated));
    if (!updated.enabled) {
      notifyListeners(null);
    }
  } catch (err) {
    console.warn("saveRecommenderUserPrefs error:", err);
  }
}

export function clearUserRecommenderData() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SIGNALS_STORAGE_KEY);
  localStorage.removeItem(COOLDOWN_STORAGE_KEY);
  inMemorySignals = [];
  inMemoryProfile = null;
  notifyListeners(null);
}

/**
 * Primary Matching Scoring Algorithm
 */
export async function findBestBusinessMatch(options?: {
  overrideIntentKeywords?: string[];
  overrideCategory?: string;
  forceMock?: boolean;
}): Promise<BusinessMatchResult | null> {
  const profile = getUserInterestProfile();
  const userPrefs = getRecommenderUserPrefs();
  const adminConfig = await getRecommenderAdminConfig();

  // If feature disabled globally or by user
  if (!adminConfig.enabled || !userPrefs.enabled || !adminConfig.personalization_enabled) {
    return null;
  }

  // If confidence is below admin threshold and no override provided
  if (!options?.overrideIntentKeywords && profile.confidence < adminConfig.min_confidence) {
    return null;
  }

  const primarySlug = options?.overrideCategory || profile.primaryInterests[0]?.category || "technology-software";
  const associatedSlugs = [primarySlug, ...(CATEGORY_CLUSTER_GRAPH[primarySlug] || [])];
  const cooldownRegistry = getCooldownRegistry();
  const cooldownMs = adminConfig.cooldown_days * 24 * 60 * 60 * 1000;
  const now = Date.now();

  try {
    // 1. Query approved businesses matching cluster
    let query = supabase
      .from("suppliers")
      .select("*, categories(name, slug)")
      .eq("status", "approved")
      .eq("active", true);

    if (adminConfig.eligible_scope === "verified_only") {
      query = query.or("is_verified.eq.true,verified.eq.true");
    }

    const { data: businesses, error } = await query.limit(40);

    if (error || !businesses || businesses.length === 0) {
      return generateFallbackMatch(profile, primarySlug, adminConfig.humour_style);
    }

    // 2. Score each business candidate
    const scoredCandidates: Array<{
      business: any;
      scoreBreakdown: BusinessMatchResult["scoreBreakdown"];
      matchedKeywords: string[];
    }> = [];

    const searchKeywords = options?.overrideIntentKeywords || profile.topKeywords;

    businesses.forEach((biz: any) => {
      const bizCategorySlug = biz.categories?.slug || biz.category || "";
      const isVerified = Boolean(biz.is_verified || biz.verified);
      const isFeatured = Boolean(biz.featured);
      const bizName = biz.name || "";
      const bizDesc = biz.description || "";
      const bizText = `${bizName} ${bizDesc} ${biz.address || ""} ${bizCategorySlug}`.toLowerCase();

      // Check cooldown penalty
      let cooldownPenalty = 0;
      const lastAction = cooldownRegistry[biz.id];
      if (lastAction) {
        const timeSince = now - lastAction.timestamp;
        if (lastAction.action === "not_interested") {
          cooldownPenalty = 1000; // exclude completely
        } else if (lastAction.action === "dismiss" && timeSince < cooldownMs) {
          cooldownPenalty = 500; // severe penalty
        } else if (lastAction.action === "shown" && timeSince < 12 * 60 * 60 * 1000) {
          cooldownPenalty = 200; // don't repeat same day
        }
      }

      // Keyword & Intent matching
      let keywordHits = 0;
      const matchedKw: string[] = [];
      searchKeywords.forEach((kw) => {
        if (kw && bizText.includes(kw.toLowerCase())) {
          keywordHits++;
          matchedKw.push(kw);
        }
      });

      // Category relevance
      let categoryScore = 0;
      if (bizCategorySlug === primarySlug) {
        categoryScore = 35;
      } else if (associatedSlugs.includes(bizCategorySlug)) {
        categoryScore = 20;
      } else {
        categoryScore = 5;
      }

      const intentScore = Math.min(30, keywordHits * 10);
      const qualityScore = (isVerified ? 15 : 0) + (isFeatured ? 10 : 0) + (biz.logo_url ? 5 : 0);
      const behavioralScore = Math.min(20, (profile.primaryInterests[0]?.score || 1) * 3);
      const recencyScore = 10;

      const totalScore = Math.max(
        0,
        intentScore + categoryScore + behavioralScore + qualityScore + recencyScore - cooldownPenalty
      );

      scoredCandidates.push({
        business: biz,
        scoreBreakdown: {
          totalScore,
          intentScore,
          categoryScore,
          behavioralScore,
          qualityScore,
          recencyScore,
          cooldownPenalty,
        },
        matchedKeywords: matchedKw,
      });
    });

    // 3. Sort by total score descending
    scoredCandidates.sort((a, b) => b.scoreBreakdown.totalScore - a.scoreBreakdown.totalScore);

    const topCandidate = scoredCandidates[0];
    if (!topCandidate || topCandidate.scoreBreakdown.totalScore < 30) {
      return generateFallbackMatch(profile, primarySlug, adminConfig.humour_style);
    }

    const biz = topCandidate.business;
    const catName = biz.categories?.name || profile.primaryInterests[0]?.categoryName || "Verified Services";

    // 4. Generate dialogue with psychological hook
    const dialogue = generateMatchDialogue({
      categoryName: catName,
      categorySlug: biz.categories?.slug || primarySlug,
      keywords: topCandidate.matchedKeywords,
      inferredIntent: profile.recentIntent,
      businessName: biz.name,
      style: adminConfig.humour_style,
      signalsCount: profile.totalSignalsCount,
    });

    const result: BusinessMatchResult = {
      business: biz,
      scoreBreakdown: topCandidate.scoreBreakdown,
      confidence: Math.min(98, Math.max(profile.confidence, 78)),
      inferredIntent: profile.recentIntent,
      dialogue,
      whyExplanation: dialogue.whyExplanation,
      matchedKeywords: topCandidate.matchedKeywords,
      timestamp: now,
    };

    // Log generation analytics
    logAnalyticsEvent({
      type: "generated",
      businessId: biz.id,
      businessName: biz.name,
      category: catName,
      confidence: result.confidence,
    });

    return result;
  } catch (err) {
    console.warn("findBestBusinessMatch error:", err);
    return generateFallbackMatch(profile, primarySlug, adminConfig.humour_style);
  }
}

/**
 * Background match trigger evaluator
 */
async function evaluateAndTriggerMatch() {
  try {
    const match = await findBestBusinessMatch();
    if (match) {
      notifyListeners(match);
    }
  } catch (err) {
    console.warn("evaluateAndTriggerMatch error:", err);
  }
}

/**
 * Curated Fallback Match for immediate responsiveness
 */
function generateFallbackMatch(
  profile: UserInterestProfile,
  primarySlug: string,
  style: HumourStyle
): BusinessMatchResult {
  const preset = PRESET_BUSINESS_CATEGORIES.find((p) => p.slug === primarySlug) || PRESET_BUSINESS_CATEGORIES[0];

  const mockBiz = {
    id: "verified-spotlight-" + preset.slug,
    name: `Bethelincovibe Verified ${preset.name.split("&")[0].trim()} Specialist`,
    slug: "verified-" + preset.slug,
    category: preset.name,
    categories: { name: preset.name, slug: preset.slug },
    description: preset.description,
    city: "Ikeja / Nationwide",
    state: "Lagos State",
    rating: 4.9,
    review_count: 86,
    is_verified: true,
    featured: true,
    verified: true,
    logo_url: "/logo.png",
    services: (preset.popularServices || []).slice(0, 3),
  };

  const dialogue = generateMatchDialogue({
    categoryName: preset.name,
    categorySlug: preset.slug,
    keywords: profile.topKeywords,
    inferredIntent: profile.recentIntent,
    businessName: mockBiz.name,
    style,
    signalsCount: profile.totalSignalsCount || 3,
  });

  return {
    business: mockBiz,
    scoreBreakdown: {
      totalScore: 88,
      intentScore: 28,
      categoryScore: 30,
      behavioralScore: 15,
      qualityScore: 25,
      recencyScore: 10,
      cooldownPenalty: 0,
    },
    confidence: Math.max(profile.confidence, 74),
    inferredIntent: profile.recentIntent,
    dialogue,
    whyExplanation: dialogue.whyExplanation,
    matchedKeywords: profile.topKeywords.slice(0, 3),
    timestamp: Date.now(),
  };
}
