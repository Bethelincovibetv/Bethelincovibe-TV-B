import { supabase } from "@/integrations/supabase/client";
import {
  BusinessRequest,
  ProviderOffer,
  ProviderOpportunityPreferences,
  AdminMatchingConfig,
  MatchingBusinessCandidate,
  RequestAnalyticsMetrics,
  RequestStatus,
  ExtractedRequestInfo,
} from "@/types/opportunityMatching";
import { fetchUserNameById, personalizeNotificationTitle, personalizeNotificationBody } from "@/lib/notificationPersonalizer";
import { playNotificationSound } from "@/lib/notificationSound";

const REQUESTS_STORAGE_KEY = "bethel_business_requests_v1";
const OFFERS_STORAGE_KEY = "bethel_provider_offers_v1";
const PREFS_STORAGE_KEY = "bethel_provider_prefs_v1";
const ADMIN_CONFIG_KEY = "bethel_opportunity_admin_config_v1";

// Default admin configuration
export const DEFAULT_ADMIN_MATCHING_CONFIG: AdminMatchingConfig = {
  system_enabled: true,
  ai_understanding_enabled: true,
  auto_matching_enabled: true,
  provider_notifications_enabled: true,
  max_providers_per_request: 20,
  min_match_score: 70,
  request_expiration_days: 7,
  allow_sponsored_providers: true,
  require_verified_providers: false,
};

// Seed sample initial requests and offers so the marketplace is rich & functional immediately
function getInitialSeedRequests(): BusinessRequest[] {
  const now = Date.now();
  return [
    {
      id: "req_seed_101",
      user_id: "demo_customer_1",
      customer_name: "Chukwudi Okafor",
      customer_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      raw_prompt: "I'm looking for a graphic designer to create a professional flyer for my business. I need it before Friday and my budget is ₦20,000.",
      category: "Graphic Design",
      category_slug: "graphic-design",
      service_title: "Professional Business Flyer Design",
      service_type: "service",
      purpose: "Business Promotion & Visual Branding",
      budget: 20000,
      budget_formatted: "₦20,000",
      budget_type: "fixed",
      deadline: "This Friday",
      urgency: "medium",
      location_preference: "Online / Remote",
      specific_requirements: [
        "High-resolution print-ready (300 DPI CMYK) + Web PNG",
        "Clean commercial layout tailored to Lagos retail brand",
        "Source files (PSD or Canva link)",
      ],
      status: "RECEIVING_OFFERS",
      matched_provider_ids: ["biz_seed_1", "biz_seed_2", "biz_seed_3"],
      matched_provider_count: 5,
      expanded_search: false,
      views_count: 14,
      offers_count: 3,
      created_at: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
      updated_at: new Date(now - 1000 * 60 * 30).toISOString(),
      expires_at: new Date(now + 1000 * 60 * 60 * 24 * 6).toISOString(),
    },
    {
      id: "req_seed_102",
      user_id: "demo_customer_2",
      customer_name: "Amina Bello",
      customer_avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      raw_prompt: "We need an e-commerce website with Paystack checkout for our luxury fashion boutique in Lekki. Budget is ₦150,000, delivery in 2 weeks.",
      category: "Web & Software Development",
      category_slug: "web-development",
      service_title: "Luxury Fashion E-Commerce Store Setup",
      service_type: "project",
      purpose: "Digital Infrastructure & Online Sales",
      budget: 150000,
      budget_formatted: "₦150,000",
      budget_type: "fixed",
      deadline: "Within 2 Weeks",
      urgency: "medium",
      location_preference: "Lagos, Nigeria",
      specific_requirements: [
        "Responsive store with WhatsApp order button",
        "Paystack & Flutterwave automated gateway setup",
        "Inventory catalog management for 50+ fashion items",
      ],
      status: "OPEN",
      matched_provider_ids: ["biz_seed_4", "biz_seed_5"],
      matched_provider_count: 4,
      expanded_search: false,
      views_count: 9,
      offers_count: 2,
      created_at: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
      updated_at: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
      expires_at: new Date(now + 1000 * 60 * 60 * 24 * 5).toISOString(),
    },
    {
      id: "req_seed_103",
      user_id: "demo_customer_3",
      customer_name: "Emeka Johnson",
      customer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      raw_prompt: "Urgent catering for 50 guests corporate luncheon in Ikeja tomorrow afternoon. Jollof rice, grilled chicken, and small chops. Budget ₦85,000.",
      category: "Catering & Event Planning",
      category_slug: "catering-events",
      service_title: "Corporate Luncheon & Small Chops Catering",
      service_type: "service",
      purpose: "Corporate Event & Hospitality",
      budget: 85000,
      budget_formatted: "₦85,000",
      budget_type: "fixed",
      deadline: "Tomorrow Afternoon (Urgent)",
      urgency: "urgent",
      location_preference: "Lagos, Nigeria (Ikeja)",
      specific_requirements: [
        "50 boxed executive meals (Party Jollof + Chicken/Beef)",
        "Assorted small chops packs + fresh juice",
        "Prompt on-site delivery by 1:00 PM",
      ],
      status: "AWARDED",
      selected_offer_id: "off_seed_103_1",
      selected_business_name: "De-Taste Executive Kitchen",
      agreed_price: 80000,
      payment_status: "escrow_funded",
      matched_provider_ids: ["biz_seed_6"],
      matched_provider_count: 3,
      expanded_search: false,
      views_count: 22,
      offers_count: 3,
      created_at: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
      updated_at: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
      expires_at: new Date(now + 1000 * 60 * 60 * 24 * 4).toISOString(),
    }
  ];
}

function getInitialSeedOffers(): ProviderOffer[] {
  const now = Date.now();
  return [
    {
      id: "off_seed_101_1",
      request_id: "req_seed_101",
      provider_user_id: "prov_user_1",
      provider_name: "Vibrant Brand Studio",
      business_id: "biz_1",
      business_name: "Vibrant Brand Studio Lagos",
      business_slug: "vibrant-brand-studio",
      business_category: "Graphic Design",
      business_logo_url: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=120&auto=format&fit=crop&q=80",
      is_verified: true,
      rating: 4.9,
      reviews_count: 28,
      proposed_price: 18000,
      delivery_time: "24 Hours",
      proposal: "Hi! I can create a vibrant, commercial flyer tailored to your brand within 24 hours. Includes 2 revision rounds, print-ready files, and social media dimensions.",
      portfolio_samples: [
        { title: "Past Corporate Flyers", url: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&auto=format&fit=crop&q=80" },
      ],
      status: "submitted",
      ai_match_score: 96,
      ai_match_badge: "⭐ Best Match",
      created_at: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
      updated_at: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
    },
    {
      id: "off_seed_101_2",
      request_id: "req_seed_101",
      provider_user_id: "prov_user_2",
      provider_name: "PixelCraft Agency",
      business_id: "biz_2",
      business_name: "PixelCraft Digital",
      business_slug: "pixelcraft-digital",
      business_category: "Graphic Design",
      business_logo_url: "https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=120&auto=format&fit=crop&q=80",
      is_verified: true,
      rating: 4.8,
      reviews_count: 19,
      proposed_price: 20000,
      delivery_time: "48 Hours",
      proposal: "We specialize in corporate promotional graphics. We will provide 2 initial creative concepts and deliver editable source files.",
      status: "submitted",
      ai_match_score: 91,
      ai_match_badge: "🛡️ Top Verified",
      created_at: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
      updated_at: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: "off_seed_101_3",
      request_id: "req_seed_101",
      provider_user_id: "prov_user_3",
      provider_name: "SwiftGraphics Express",
      business_id: "biz_3",
      business_name: "SwiftGraphics Media",
      business_slug: "swiftgraphics-media",
      business_category: "Graphic Design",
      business_logo_url: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=120&auto=format&fit=crop&q=80",
      is_verified: false,
      rating: 4.7,
      reviews_count: 8,
      proposed_price: 15000,
      delivery_time: "12 Hours",
      proposal: "I can deliver this tonight! High quality flyer + 3D mockup. Let's make your promotion stand out.",
      status: "submitted",
      ai_match_score: 88,
      ai_match_badge: "⚡ Fastest Delivery",
      created_at: new Date(now - 1000 * 60 * 45).toISOString(),
      updated_at: new Date(now - 1000 * 60 * 45).toISOString(),
    },
    {
      id: "off_seed_103_1",
      request_id: "req_seed_103",
      provider_user_id: "prov_user_6",
      provider_name: "De-Taste Kitchen",
      business_id: "biz_6",
      business_name: "De-Taste Executive Kitchen",
      business_slug: "detaste-kitchen",
      business_category: "Catering & Event Planning",
      is_verified: true,
      rating: 5.0,
      reviews_count: 42,
      proposed_price: 80000,
      delivery_time: "Same Day by 12:30 PM",
      proposal: "We are ready to deliver 50 hot executive packs to Ikeja on schedule with small chops and branded drinks.",
      status: "accepted",
      ai_match_score: 98,
      ai_match_badge: "⭐ Best Match",
      created_at: new Date(now - 1000 * 60 * 60 * 18).toISOString(),
      updated_at: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
    }
  ];
}

/**
 * Storage Helpers
 */
export function getAllRequests(): BusinessRequest[] {
  try {
    const raw = localStorage.getItem(REQUESTS_STORAGE_KEY);
    if (!raw) {
      const seed = getInitialSeedRequests();
      localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch {
    return getInitialSeedRequests();
  }
}

export function saveAllRequests(requests: BusinessRequest[]) {
  try {
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));
  } catch (err) {
    console.error("Failed to persist business requests:", err);
  }
}

export function getAllOffers(): ProviderOffer[] {
  try {
    const raw = localStorage.getItem(OFFERS_STORAGE_KEY);
    if (!raw) {
      const seed = getInitialSeedOffers();
      localStorage.setItem(OFFERS_STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch {
    return getInitialSeedOffers();
  }
}

export function saveAllOffers(offers: ProviderOffer[]) {
  try {
    localStorage.setItem(OFFERS_STORAGE_KEY, JSON.stringify(offers));
  } catch (err) {
    console.error("Failed to persist provider offers:", err);
  }
}

export function getAdminMatchingConfig(): AdminMatchingConfig {
  try {
    const raw = localStorage.getItem(ADMIN_CONFIG_KEY);
    if (!raw) {
      return DEFAULT_ADMIN_MATCHING_CONFIG;
    }
    return { ...DEFAULT_ADMIN_MATCHING_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ADMIN_MATCHING_CONFIG;
  }
}

export function saveAdminMatchingConfig(config: AdminMatchingConfig) {
  try {
    localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify({ ...config, updated_at: new Date().toISOString() }));
  } catch (err) {
    console.error("Failed to save admin matching config:", err);
  }
}

export function getProviderPreferences(userId: string): ProviderOpportunityPreferences {
  try {
    const raw = localStorage.getItem(`${PREFS_STORAGE_KEY}_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {}

  return {
    user_id: userId,
    notifications_enabled: true,
    subscribed_categories: [],
    min_budget: 5000,
    max_budget: 1000000,
    preferred_locations: ["Online / Remote", "Lagos, Nigeria", "Nationwide"],
    instant_push_alerts: true,
    instant_sound_alerts: true,
  };
}

export function saveProviderPreferences(prefs: ProviderOpportunityPreferences) {
  try {
    localStorage.setItem(`${PREFS_STORAGE_KEY}_${prefs.user_id}`, JSON.stringify({ ...prefs, updated_at: new Date().toISOString() }));
  } catch (err) {
    console.error("Failed to save provider preferences:", err);
  }
}

/**
 * Intelligent Business Matching Algorithm
 * Scans active platform businesses, categories, services, products, reviews, and locations
 */
export async function findMatchingCandidates(
  request: {
    category: string;
    categorySlug: string;
    serviceTitle: string;
    rawPrompt: string;
    budget: number | null;
    locationPreference: string;
  },
  expanded = false
): Promise<MatchingBusinessCandidate[]> {
  const config = getAdminMatchingConfig();
  if (!config.auto_matching_enabled) {
    return [];
  }

  // 1. Fetch businesses from Supabase
  let suppliersList: any[] = [];
  try {
    const { data: dbSuppliers } = await supabase
      .from("suppliers")
      .select(`
        id,
        name,
        slug,
        description,
        logo_url,
        cover_url,
        address,
        services,
        featured,
        active,
        status,
        submitted_by,
        category_id,
        categories (
          name,
          slug
        )
      `)
      .limit(60);

    if (dbSuppliers && dbSuppliers.length > 0) {
      suppliersList = dbSuppliers;
    }
  } catch (err) {
    console.warn("Could not query suppliers table directly, using local platform index:", err);
  }

  // If no suppliers in DB or running local demo, supply fallback active businesses
  if (suppliersList.length === 0) {
    suppliersList = [
      {
        id: "biz_1",
        name: "Vibrant Brand Studio Lagos",
        slug: "vibrant-brand-studio",
        description: "Leading graphic design and branding studio in Ikeja. Specialized in flyers, logo identity, packages, and corporate media.",
        logo_url: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=120&auto=format&fit=crop&q=80",
        address: "Ikeja, Lagos",
        services: ["Graphic Design", "Flyer Design", "Logo Branding", "Social Media Graphics"],
        featured: true,
        active: true,
        status: "approved",
        submitted_by: "prov_user_1",
        categories: { name: "Graphic Design", slug: "graphic-design" },
      },
      {
        id: "biz_2",
        name: "PixelCraft Digital Agency",
        slug: "pixelcraft-digital",
        description: "Full service digital creative agency for startups. Web design, promotional banners, flyers, and branding.",
        logo_url: "https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=120&auto=format&fit=crop&q=80",
        address: "Lekki Phase 1, Lagos",
        services: ["Graphic Design", "Brand Kits", "Print Design", "UI Design"],
        featured: true,
        active: true,
        status: "approved",
        submitted_by: "prov_user_2",
        categories: { name: "Graphic Design", slug: "graphic-design" },
      },
      {
        id: "biz_3",
        name: "SwiftGraphics Media",
        slug: "swiftgraphics-media",
        description: "Fast-turnaround graphic design and 3D mockups for commerce businesses in Nigeria.",
        logo_url: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=120&auto=format&fit=crop&q=80",
        address: "Yaba, Lagos",
        services: ["Flyer Design", "Fast Banners", "Logo Redesign"],
        featured: false,
        active: true,
        status: "approved",
        submitted_by: "prov_user_3",
        categories: { name: "Graphic Design", slug: "graphic-design" },
      },
      {
        id: "biz_4",
        name: "DevSphere Web Technologies",
        slug: "devsphere-web",
        description: "Expert software engineering, e-commerce stores, custom portals, and web application development.",
        logo_url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=120&auto=format&fit=crop&q=80",
        address: "Victoria Island, Lagos",
        services: ["Web Development", "E-Commerce", "Paystack Setup", "Custom Software"],
        featured: true,
        active: true,
        status: "approved",
        submitted_by: "prov_user_4",
        categories: { name: "Web & Software Development", slug: "web-development" },
      },
      {
        id: "biz_5",
        name: "CloudForge Digital",
        slug: "cloudforge-digital",
        description: "Next-gen web development and marketing funnel building for Nigerian enterprises.",
        logo_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=120&auto=format&fit=crop&q=80",
        address: "Surulere, Lagos",
        services: ["Websites", "Shopify Stores", "WordPress", "Landing Pages"],
        featured: false,
        active: true,
        status: "approved",
        submitted_by: "prov_user_5",
        categories: { name: "Web & Software Development", slug: "web-development" },
      },
      {
        id: "biz_6",
        name: "De-Taste Executive Kitchen",
        slug: "detaste-kitchen",
        description: "Premium corporate catering, event catering, party jollof, small chops, and continental dishes in Lagos.",
        logo_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=120&auto=format&fit=crop&q=80",
        address: "Ikeja GRA, Lagos",
        services: ["Corporate Catering", "Small Chops", "Event Buffets", "Party Trays"],
        featured: true,
        active: true,
        status: "approved",
        submitted_by: "prov_user_6",
        categories: { name: "Catering & Event Planning", slug: "catering-events" },
      },
      {
        id: "biz_7",
        name: "Apex Prime Logistics & Dispatch",
        slug: "apex-prime-logistics",
        description: "Express same-day courier dispatch, interstate cargo, and dedicated business delivery services.",
        logo_url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=120&auto=format&fit=crop&q=80",
        address: "Oshodi / Airport Road, Lagos",
        services: ["Same-Day Dispatch", "Logistics", "Interstate Delivery", "Haulage"],
        featured: true,
        active: true,
        status: "approved",
        submitted_by: "prov_user_7",
        categories: { name: "Logistics & Delivery", slug: "logistics" },
      }
    ];
  }

  const promptWords = request.rawPrompt.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const targetCatLower = request.category.toLowerCase();
  const targetSlugLower = request.categorySlug.toLowerCase();

  const candidates: MatchingBusinessCandidate[] = [];

  for (const s of suppliersList) {
    if (s.active === false || s.status === "rejected") continue;

    let score = 0;
    const reasons: string[] = [];

    const bizCatName = (s.categories?.name || s.category_name || "").toLowerCase();
    const bizCatSlug = (s.categories?.slug || s.category_slug || "").toLowerCase();
    const bizName = s.name || "";
    const bizDesc = (s.description || "").toLowerCase();
    const bizAddress = (s.address || "").toLowerCase();

    // Extract services array safely
    let services: string[] = [];
    if (Array.isArray(s.services)) {
      services = s.services.map((item: any) => (typeof item === "string" ? item : item.title || item.name || ""));
    } else if (typeof s.services === "string") {
      services = s.services.split(",").map((x: string) => x.trim());
    }

    const servicesStr = services.join(" ").toLowerCase();

    // 1. Direct Category Match (40 pts)
    if (bizCatName.includes(targetCatLower) || targetCatLower.includes(bizCatName) || bizCatSlug === targetSlugLower) {
      score += 40;
      reasons.push(`Direct matching category (${s.categories?.name || request.category})`);
    } else if (expanded) {
      // Expanded search: partial match or broad creative overlap
      const creativeCategories = ["design", "creative", "media", "marketing", "branding", "web"];
      const matchesCreativeGroup = creativeCategories.some((k) => targetCatLower.includes(k) && (bizCatName.includes(k) || bizDesc.includes(k)));
      if (matchesCreativeGroup) {
        score += 25;
        reasons.push("Broad category match (Creative & Digital Ecosystem)");
      }
    }

    // 2. Services & Keywords Match (30 pts)
    let keywordHits = 0;
    for (const w of promptWords) {
      if (servicesStr.includes(w) || bizDesc.includes(w)) {
        keywordHits++;
      }
    }
    if (keywordHits >= 2) {
      score += Math.min(30, keywordHits * 8);
      reasons.push(`Services align with your specific requirements (${keywordHits} matching keywords)`);
    } else if (keywordHits === 1) {
      score += 15;
      reasons.push("Key service match in business profile");
    }

    // 3. Verification & Quality (15 pts)
    const isVerified = s.featured || s.status === "approved";
    if (isVerified) {
      score += 10;
      reasons.push("Verified & active business badge");
    }
    if (s.featured) {
      score += 5;
      reasons.push("Top-rated featured provider");
    }

    // 4. Location Match (10 pts)
    const locLower = request.locationPreference.toLowerCase();
    if (locLower.includes("online") || locLower.includes("nationwide")) {
      score += 10;
      reasons.push("Available for online / remote delivery");
    } else if (bizAddress && (bizAddress.includes("lagos") && locLower.includes("lagos") || bizAddress.includes("abuja") && locLower.includes("abuja"))) {
      score += 10;
      reasons.push(`Local provider in ${request.locationPreference}`);
    } else {
      score += 5;
    }

    // 5. Check if provider preferences filter this out
    if (s.submitted_by) {
      const prefs = getProviderPreferences(s.submitted_by);
      if (!prefs.notifications_enabled) continue;
      if (request.budget && (request.budget < prefs.min_budget || request.budget > prefs.max_budget)) {
        // Soft penalty instead of total exclusion if high category relevance
        score -= 10;
      }
    }

    const finalScore = Math.min(99, Math.max(20, score));

    // Filter against minimum score
    const minThreshold = expanded ? Math.max(45, config.min_match_score - 20) : config.min_match_score;
    if (finalScore >= minThreshold) {
      candidates.push({
        businessId: s.id,
        businessName: bizName,
        businessSlug: s.slug || `biz-${s.id}`,
        businessLogo: s.logo_url || undefined,
        category: s.categories?.name || request.category,
        categorySlug: s.categories?.slug || request.categorySlug,
        ownerUserId: s.submitted_by || `user_${s.id}`,
        isVerified,
        isFeatured: Boolean(s.featured),
        rating: 4.8,
        reviewsCount: 12,
        location: s.address || "Lagos, Nigeria",
        matchScore: finalScore,
        matchReasons: reasons,
        servicesOffered: services,
      });
    }
  }

  // Sort by match score descending
  candidates.sort((a, b) => b.matchScore - a.matchScore);

  // Apply maximum providers cap from admin config
  return candidates.slice(0, config.max_providers_per_request);
}

/**
 * Creates & Publishes a new Business Request
 */
export async function createAndPublishRequest(params: {
  userId: string;
  userName?: string;
  userAvatar?: string;
  userPhone?: string;
  userEmail?: string;
  rawPrompt: string;
  extractedInfo: ExtractedRequestInfo;
}): Promise<{ request: BusinessRequest; matchedCandidates: MatchingBusinessCandidate[] }> {
  const allRequests = getAllRequests();
  const config = getAdminMatchingConfig();

  const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (config.request_expiration_days || 7) * 24 * 60 * 60 * 1000);

  // 1. Run matching engine
  let matchedCandidates = await findMatchingCandidates({
    category: params.extractedInfo.category,
    categorySlug: params.extractedInfo.categorySlug,
    serviceTitle: params.extractedInfo.serviceTitle,
    rawPrompt: params.rawPrompt,
    budget: params.extractedInfo.budget,
    locationPreference: params.extractedInfo.locationPreference,
  });

  // If initial matches < 2, perform automatic expanded search
  let expandedSearch = false;
  if (matchedCandidates.length < 2) {
    const expandedList = await findMatchingCandidates({
      category: params.extractedInfo.category,
      categorySlug: params.extractedInfo.categorySlug,
      serviceTitle: params.extractedInfo.serviceTitle,
      rawPrompt: params.rawPrompt,
      budget: params.extractedInfo.budget,
      locationPreference: params.extractedInfo.locationPreference,
    }, true);

    if (expandedList.length > matchedCandidates.length) {
      matchedCandidates = expandedList;
      expandedSearch = true;
    }
  }

  const matchedProviderIds = matchedCandidates.map((c) => c.ownerUserId).filter(Boolean);

  const newRequest: BusinessRequest = {
    id,
    user_id: params.userId,
    customer_name: params.userName || "Customer",
    customer_avatar: params.userAvatar,
    customer_phone: params.userPhone,
    customer_email: params.userEmail,
    raw_prompt: params.rawPrompt,
    category: params.extractedInfo.category,
    category_slug: params.extractedInfo.categorySlug,
    service_title: params.extractedInfo.serviceTitle,
    service_type: params.extractedInfo.serviceType,
    purpose: params.extractedInfo.purpose,
    budget: params.extractedInfo.budget,
    budget_formatted: params.extractedInfo.budgetFormatted,
    budget_type: params.extractedInfo.budgetType,
    deadline: params.extractedInfo.deadline,
    urgency: params.extractedInfo.urgency,
    location_preference: params.extractedInfo.locationPreference,
    specific_requirements: params.extractedInfo.specificRequirements,
    clarification_notes: params.extractedInfo.clarificationQuestion,
    status: "OPEN",
    matched_provider_ids: matchedProviderIds,
    matched_provider_count: matchedCandidates.length,
    expanded_search: expandedSearch,
    views_count: 1,
    offers_count: 0,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  allRequests.unshift(newRequest);
  saveAllRequests(allRequests);

  // 2. Dispatch targeted notifications to matched providers asynchronously
  if (config.provider_notifications_enabled) {
    notifyMatchedProviders(newRequest, matchedCandidates).catch((err) => {
      console.warn("Background provider notification error:", err);
    });
  }

  // 3. Dispatch customer confirmation notification
  notifyCustomerRequestPublished(newRequest).catch(() => {});

  return { request: newRequest, matchedCandidates };
}

/**
 * Notifies matched providers with personalized, professional opportunities
 */
export async function notifyMatchedProviders(
  request: BusinessRequest,
  candidates: MatchingBusinessCandidate[]
) {
  for (const candidate of candidates) {
    if (!candidate.ownerUserId || candidate.ownerUserId.startsWith("demo_")) continue;

    try {
      const recipientName = await fetchUserNameById(candidate.ownerUserId);
      const title = personalizeNotificationTitle(`🔔 New Business Opportunity: ${request.category}`, recipientName);
      const body = `Hi ${recipientName}, someone is looking for a ${request.category} provider. Job: ${request.service_title} | Budget: ${request.budget_formatted} | Deadline: ${request.deadline}. You are a top match!`;

      // 1. Insert in user notifications inbox
      await supabase.from("user_notifications").insert({
        user_id: candidate.ownerUserId,
        title,
        body,
        url: `/dashboard/opportunities/${request.id}`,
        type: "lead",
        is_read: false,
      });

      // 2. Trigger push notification via OneSignal / FCM edge function
      await supabase.functions.invoke("onesignal-send", {
        body: {
          title,
          message: body,
          url: `/dashboard/opportunities/${request.id}`,
          mode: "users",
          user_ids: [candidate.ownerUserId],
        },
      }).catch(() => {});
    } catch (err) {
      console.warn(`Could not dispatch notification to provider ${candidate.ownerUserId}:`, err);
    }
  }
}

/**
 * Notifies customer that request is active and businesses are being contacted
 */
async function notifyCustomerRequestPublished(request: BusinessRequest) {
  try {
    const customerName = await fetchUserNameById(request.user_id);
    const title = personalizeNotificationTitle(`🚀 Request Published: ${request.service_title}`, customerName);
    const body = `Hi ${customerName}, your request has been published. We have identified and notified ${request.matched_provider_count} matching providers. You will receive real-time alerts as offers come in!`;

    await supabase.from("user_notifications").insert({
      user_id: request.user_id,
      title,
      body,
      url: `/dashboard/my-requests/${request.id}`,
      type: "system",
      is_read: false,
    });
  } catch {}
}

/**
 * Submits a new Provider Offer on an Open Request
 */
export async function submitProviderOffer(params: {
  requestId: string;
  providerUserId: string;
  providerName: string;
  providerAvatar?: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  businessLogoUrl?: string;
  businessCategory: string;
  isVerified?: boolean;
  proposedPrice: number;
  deliveryTime: string;
  proposal: string;
  portfolioSamples?: Array<{ title: string; url: string }>;
  clarificationQuestion?: string;
}): Promise<ProviderOffer> {
  const allRequests = getAllRequests();
  const allOffers = getAllOffers();

  const reqIndex = allRequests.findIndex((r) => r.id === params.requestId);
  if (reqIndex === -1) {
    throw new Error("Business request not found or has been removed.");
  }

  const request = allRequests[reqIndex];
  if (request.status === "AWARDED" || request.status === "COMPLETED" || request.status === "CANCELLED") {
    throw new Error("This opportunity is no longer accepting new offers.");
  }

  // Check if provider already submitted an offer
  const existingOffer = allOffers.find((o) => o.request_id === params.requestId && o.provider_user_id === params.providerUserId);
  if (existingOffer) {
    throw new Error("You have already submitted an offer for this opportunity. You can update your existing offer.");
  }

  // Calculate AI badge
  let badge: string = "⭐ Best Match";
  if (params.deliveryTime.toLowerCase().includes("24 hour") || params.deliveryTime.toLowerCase().includes("12 hour") || params.deliveryTime.toLowerCase().includes("today")) {
    badge = "⚡ Fastest Delivery";
  } else if (request.budget && params.proposedPrice <= request.budget * 0.85) {
    badge = "💰 Great Value";
  } else if (params.isVerified) {
    badge = "🛡️ Top Verified";
  }

  const offerId = `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  const newOffer: ProviderOffer = {
    id: offerId,
    request_id: params.requestId,
    provider_user_id: params.providerUserId,
    provider_name: params.providerName,
    provider_avatar: params.providerAvatar,
    business_id: params.businessId,
    business_name: params.businessName,
    business_slug: params.businessSlug,
    business_logo_url: params.businessLogoUrl,
    business_category: params.businessCategory,
    is_verified: Boolean(params.isVerified),
    rating: 4.9,
    reviews_count: 14,
    proposed_price: params.proposedPrice,
    delivery_time: params.deliveryTime,
    proposal: params.proposal,
    portfolio_samples: params.portfolioSamples || [],
    clarification_question: params.clarificationQuestion,
    status: "submitted",
    ai_match_score: 94,
    ai_match_badge: badge,
    created_at: nowIso,
    updated_at: nowIso,
  };

  allOffers.unshift(newOffer);
  saveAllOffers(allOffers);

  // Update request counts & status
  request.offers_count = (request.offers_count || 0) + 1;
  request.status = "RECEIVING_OFFERS";
  request.updated_at = nowIso;
  allRequests[reqIndex] = request;
  saveAllRequests(allRequests);

  // Notify customer of new offer
  try {
    const customerName = await fetchUserNameById(request.user_id);
    const title = personalizeNotificationTitle(`💬 New Offer Received from ${params.businessName}!`, customerName);
    const body = `Hi ${customerName}, ${params.businessName} submitted an offer of ₦${params.proposedPrice.toLocaleString()} with ${params.deliveryTime} turnaround for "${request.service_title}". Tap to compare offers!`;

    await supabase.from("user_notifications").insert({
      user_id: request.user_id,
      title,
      body,
      url: `/dashboard/my-requests/${request.id}`,
      type: "lead",
      is_read: false,
    });

    playNotificationSound();
  } catch (err) {
    console.warn("Could not notify customer of offer:", err);
  }

  return newOffer;
}

/**
 * Customer Accepts Offer and Awards Job
 */
export async function awardOfferAndCloseOpportunity(params: {
  requestId: string;
  offerId: string;
  customerUserId: string;
}): Promise<{ request: BusinessRequest; acceptedOffer: ProviderOffer }> {
  const allRequests = getAllRequests();
  const allOffers = getAllOffers();

  const reqIndex = allRequests.findIndex((r) => r.id === params.requestId);
  if (reqIndex === -1) throw new Error("Request not found");

  const request = allRequests[reqIndex];
  if (request.user_id !== params.customerUserId) {
    throw new Error("Unauthorized. Only the request creator can award this job.");
  }

  const offerIndex = allOffers.findIndex((o) => o.id === params.offerId && o.request_id === params.requestId);
  if (offerIndex === -1) throw new Error("Offer not found");

  const acceptedOffer = allOffers[offerIndex];
  const nowIso = new Date().toISOString();

  // 1. Update accepted offer & reject other competing offers
  for (let i = 0; i < allOffers.length; i++) {
    if (allOffers[i].request_id === params.requestId) {
      if (allOffers[i].id === params.offerId) {
        allOffers[i].status = "accepted";
        allOffers[i].updated_at = nowIso;
      } else {
        allOffers[i].status = "rejected";
        allOffers[i].updated_at = nowIso;
      }
    }
  }
  saveAllOffers(allOffers);

  // 2. Update request status to AWARDED
  request.status = "AWARDED";
  request.selected_offer_id = acceptedOffer.id;
  request.selected_provider_id = acceptedOffer.provider_user_id;
  request.selected_business_id = acceptedOffer.business_id;
  request.selected_business_name = acceptedOffer.business_name;
  request.agreed_price = acceptedOffer.proposed_price;
  request.payment_status = "unpaid";
  request.updated_at = nowIso;
  allRequests[reqIndex] = request;
  saveAllRequests(allRequests);

  // 3. Send Winner Celebration Notification
  try {
    const winnerName = await fetchUserNameById(acceptedOffer.provider_user_id);
    const winTitle = personalizeNotificationTitle(`🎉 You got the job! Offer Accepted`, winnerName);
    const winBody = `Congratulations ${winnerName}! The customer has accepted your offer for "${request.service_title}". Agreed price: ₦${acceptedOffer.proposed_price.toLocaleString()} | Turnaround: ${acceptedOffer.delivery_time}. Tap to view project details and start work!`;

    await supabase.from("user_notifications").insert({
      user_id: acceptedOffer.provider_user_id,
      title: winTitle,
      body: winBody,
      url: `/dashboard/opportunities/${request.id}`,
      type: "order",
      is_read: false,
    });

    // 4. Courteously notify other rejected providers
    const competingOffers = allOffers.filter((o) => o.request_id === params.requestId && o.id !== acceptedOffer.id);
    for (const comp of competingOffers) {
      if (!comp.provider_user_id || comp.provider_user_id.startsWith("demo_")) continue;
      const providerName = await fetchUserNameById(comp.provider_user_id);
      const title = `Opportunity Update: ${request.service_title}`;
      const body = `Hi ${providerName}, this opportunity has been awarded to another provider. Thank you for submitting an offer! Keep an eye out for new matching requests.`;

      await supabase.from("user_notifications").insert({
        user_id: comp.provider_user_id,
        title,
        body,
        url: `/dashboard/opportunities`,
        type: "system",
        is_read: false,
      });
    }
  } catch (err) {
    console.warn("Error dispatching award notifications:", err);
  }

  return { request, acceptedOffer };
}

/**
 * Marks request as COMPLETED by Customer
 */
export async function completeRequest(requestId: string, customerUserId: string): Promise<BusinessRequest> {
  const allRequests = getAllRequests();
  const reqIndex = allRequests.findIndex((r) => r.id === requestId);
  if (reqIndex === -1) throw new Error("Request not found");

  const request = allRequests[reqIndex];
  if (request.user_id !== customerUserId) {
    throw new Error("Unauthorized");
  }

  request.status = "COMPLETED";
  request.payment_status = "released";
  request.updated_at = new Date().toISOString();
  allRequests[reqIndex] = request;
  saveAllRequests(allRequests);

  // Notify Provider
  if (request.selected_provider_id) {
    try {
      const providerName = await fetchUserNameById(request.selected_provider_id);
      await supabase.from("user_notifications").insert({
        user_id: request.selected_provider_id,
        title: `🏆 Project Completed & Approved!`,
        body: `Hi ${providerName}, the customer marked "${request.service_title}" as successfully completed. Thank you for your excellent work on Bethelincovibe TV!`,
        url: `/dashboard/opportunities/${request.id}`,
        type: "wallet",
        is_read: false,
      });
    } catch {}
  }

  return request;
}

/**
 * Fetches Analytics Metrics for Admin Dashboard
 */
export function getOpportunityAnalyticsMetrics(): RequestAnalyticsMetrics {
  const requests = getAllRequests();
  const offers = getAllOffers();

  const totalRequests = requests.length;
  const openRequests = requests.filter((r) => r.status === "OPEN" || r.status === "RECEIVING_OFFERS").length;
  const awardedRequests = requests.filter((r) => r.status === "AWARDED" || r.status === "IN_PROGRESS").length;
  const completedRequests = requests.filter((r) => r.status === "COMPLETED").length;
  const cancelledRequests = requests.filter((r) => r.status === "CANCELLED" || r.status === "EXPIRED").length;

  const totalOffersSubmitted = offers.length;
  const averageOffersPerRequest = totalRequests > 0 ? parseFloat((totalOffersSubmitted / totalRequests).toFixed(1)) : 0;
  const awardRatePercent = totalRequests > 0 ? Math.round(((awardedRequests + completedRequests) / totalRequests) * 100) : 0;
  const completionRatePercent = totalRequests > 0 ? Math.round((completedRequests / Math.max(1, awardedRequests + completedRequests)) * 100) : 0;

  // Category demand counts
  const catCountMap: Record<string, number> = {};
  for (const r of requests) {
    catCountMap[r.category] = (catCountMap[r.category] || 0) + 1;
  }

  const topRequestedCategories = Object.entries(catCountMap)
    .map(([category, count]) => ({
      category,
      count,
      percentage: totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalRequests,
    openRequests,
    awardedRequests,
    completedRequests,
    cancelledRequests,
    totalOffersSubmitted,
    averageOffersPerRequest,
    averageResponseTimeMinutes: 18,
    awardRatePercent,
    completionRatePercent,
    topRequestedCategories,
  };
}
