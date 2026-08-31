import { supabase } from "@/integrations/supabase/client";
import { PromoterProfile } from "./promoterService";
import { WhatsAppCommunity, CommunityType, getCommunityCategories } from "./communityService";
import { PromotionPackage } from "./packageService";

export interface MarketplaceCommunityCard {
  community: WhatsAppCommunity;
  promoter: {
    id: string;
    display_name: string;
    rating: number;
    total_completed_orders: number;
    is_verified: boolean;
    status: string;
    niches: string[] | null;
  };
  packages: PromotionPackage[];
  lowestPrice: number | null;
}

export interface MarketplaceFilters {
  searchQuery?: string;
  categoryId?: string;
  communityType?: CommunityType | "all";
  minAudience?: number;
  maxAudience?: number;
  minDailyViews?: number;
  maxPrice?: number;
  sortBy?: "popular" | "members_desc" | "views_desc" | "price_asc" | "rating_desc";
}

export interface PromoterMarketplaceDetail {
  promoter: PromoterProfile;
  communities: (WhatsAppCommunity & {
    packages: PromotionPackage[];
  })[];
  allPackages: PromotionPackage[];
  totalAudienceReach: number;
  totalDailyViews: number;
}

const COMMUNITY_STORAGE_KEY_PREFIX = "bincovibe_whatsapp_communities_";
const PROMOTER_STORAGE_KEY_PREFIX = "bincovibe_promoter_profile_";
const PACKAGE_STORAGE_KEY_PREFIX = "bincovibe_promotion_packages_";

function isSchemaMissingError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || "");
  const msg = String(error.message || "").toLowerCase();
  const hint = String(error.hint || "").toLowerCase();
  const details = String(error.details || "").toLowerCase();
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    code === "PGRST116" ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table") ||
    (msg.includes("relation") && msg.includes("does not exist")) ||
    hint.includes("perhaps you meant") ||
    details.includes("table")
  );
}

/**
 * Fetch all publicly discoverable verified communities with their active packages and promoter profiles
 */
export async function getMarketplaceListings(
  filters: MarketplaceFilters = {}
): Promise<MarketplaceCommunityCard[]> {
  try {
    // 1. Query verified and published communities
    let communityQuery = supabase
      .from("whatsapp_communities")
      .select(`
        *,
        category:categories(id, name, slug),
        promoter:promoter_profiles(id, display_name, rating, total_completed_orders, is_verified, status, niche)
      `)
      .eq("verification_status", "verified")
      .eq("is_published", true);

    if (filters.categoryId && filters.categoryId !== "all") {
      communityQuery = communityQuery.eq("category_id", filters.categoryId);
    }

    if (filters.communityType && filters.communityType !== "all") {
      communityQuery = communityQuery.eq("community_type", filters.communityType);
    }

    if (filters.minAudience !== undefined && filters.minAudience > 0) {
      communityQuery = communityQuery.gte("member_count", filters.minAudience);
    }

    if (filters.minDailyViews !== undefined && filters.minDailyViews > 0) {
      communityQuery = communityQuery.gte("active_daily_views", filters.minDailyViews);
    }

    const { data: communitiesData, error: commError } = await communityQuery;

    if (commError) {
      if (isSchemaMissingError(commError)) {
        return getLocalMarketplaceListings(filters);
      }
      console.warn("Notice: Querying marketplace from fallback store:", commError.message);
      return getLocalMarketplaceListings(filters);
    }

    const communities = (communitiesData || []) as any[];
    if (communities.length === 0) {
      // Check local storage fallback if database is empty in dev
      const local = getLocalMarketplaceListings(filters);
      if (local.length > 0) return local;
      return [];
    }

    const communityIds = communities.map((c) => c.id);

    // 2. Query active promotion packages for these communities
    const { data: packagesData, error: pkgError } = await supabase
      .from("promotion_packages" as any)
      .select("*")
      .in("community_id", communityIds)
      .eq("is_active", true);

    const packages = (!pkgError && packagesData ? packagesData : []) as PromotionPackage[];

    // 3. Assemble Marketplace Cards
    let listings: MarketplaceCommunityCard[] = communities.map((comm) => {
      const commPackages = packages.filter((p) => p.community_id === comm.id && p.is_active);
      const lowestPrice =
        commPackages.length > 0
          ? Math.min(...commPackages.map((p) => Number(p.price) || 0))
          : null;

      const promoterInfo = comm.promoter || {
        id: comm.promoter_id,
        display_name: "Verified Promoter",
        rating: 5.0,
        total_completed_orders: 0,
        is_verified: true,
        status: "active",
        niches: null,
      };

      return {
        community: {
          ...comm,
          category: comm.category || null,
        },
        promoter: {
          id: promoterInfo.id,
          display_name: promoterInfo.display_name || "Verified Promoter",
          rating: Number(promoterInfo.rating) || 5.0,
          total_completed_orders: Number(promoterInfo.total_completed_orders) || 0,
          is_verified: Boolean(promoterInfo.is_verified),
          status: promoterInfo.status || "active",
          niches: promoterInfo.niche || null,
        },
        packages: commPackages,
        lowestPrice,
      };
    });

    // Apply Client-Side filters (Text search, maxPrice, maxAudience)
    listings = applyMarketplaceFilters(listings, filters);

    return listings;
  } catch (err: any) {
    console.warn("Notice: Marketplace listing fallback:", err?.message);
    return getLocalMarketplaceListings(filters);
  }
}

/**
 * Retrieve comprehensive public details for a promoter and their verified communities + active packages
 */
export async function getPromoterMarketplaceDetail(
  promoterId: string
): Promise<PromoterMarketplaceDetail | null> {
  if (!promoterId) return null;

  try {
    // 1. Fetch promoter profile
    const { data: promoterData, error: promError } = await supabase
      .from("promoter_profiles")
      .select("*")
      .eq("id", promoterId)
      .maybeSingle();

    let promoter: PromoterProfile | null = promoterData as PromoterProfile;

    if (promError || !promoter) {
      promoter = getLocalPromoterById(promoterId);
    }

    if (!promoter) {
      return null;
    }

    // 2. Fetch verified & published communities for this promoter
    const { data: commData, error: commError } = await supabase
      .from("whatsapp_communities")
      .select(`
        *,
        category:categories(id, name, slug)
      `)
      .eq("promoter_id", promoterId)
      .eq("verification_status", "verified")
      .eq("is_published", true);

    let communities: WhatsAppCommunity[] = [];
    if (!commError && commData && commData.length > 0) {
      communities = commData as unknown as WhatsAppCommunity[];
    } else {
      communities = getLocalPromoterVerifiedCommunities(promoterId);
    }

    // 3. Fetch active packages for these communities
    const commIds = communities.map((c) => c.id);
    let packages: PromotionPackage[] = [];

    if (commIds.length > 0) {
      const { data: pkgData, error: pkgError } = await supabase
        .from("promotion_packages" as any)
        .select("*")
        .in("community_id", commIds)
        .eq("is_active", true);

      if (!pkgError && pkgData) {
        packages = pkgData as PromotionPackage[];
      } else {
        packages = getLocalPackagesForCommunities(commIds);
      }
    }

    const communitiesWithPackages = communities.map((comm) => {
      const commPkgs = packages.filter((p) => p.community_id === comm.id && p.is_active);
      return {
        ...comm,
        packages: commPkgs,
      };
    });

    const totalAudienceReach = communities.reduce((sum, c) => sum + (c.member_count || 0), 0);
    const totalDailyViews = communities.reduce((sum, c) => sum + (c.active_daily_views || 0), 0);

    return {
      promoter,
      communities: communitiesWithPackages,
      allPackages: packages,
      totalAudienceReach,
      totalDailyViews,
    };
  } catch (err: any) {
    console.warn("Notice: Promoter detail fallback:", err?.message);
    const localPromoter = getLocalPromoterById(promoterId);
    if (!localPromoter) return null;

    const communities = getLocalPromoterVerifiedCommunities(promoterId);
    const commIds = communities.map((c) => c.id);
    const packages = getLocalPackagesForCommunities(commIds);

    const communitiesWithPackages = communities.map((comm) => ({
      ...comm,
      packages: packages.filter((p) => p.community_id === comm.id && p.is_active),
    }));

    return {
      promoter: localPromoter,
      communities: communitiesWithPackages,
      allPackages: packages,
      totalAudienceReach: communities.reduce((sum, c) => sum + (c.member_count || 0), 0),
      totalDailyViews: communities.reduce((sum, c) => sum + (c.active_daily_views || 0), 0),
    };
  }
}

/**
 * Filter & Sort Helper
 */
function applyMarketplaceFilters(
  listings: MarketplaceCommunityCard[],
  filters: MarketplaceFilters
): MarketplaceCommunityCard[] {
  let result = [...listings];

  if (filters.categoryId && filters.categoryId !== "all") {
    result = result.filter((item) => item.community.category_id === filters.categoryId);
  }

  if (filters.communityType && filters.communityType !== "all") {
    result = result.filter((item) => item.community.community_type === filters.communityType);
  }

  if (filters.minAudience !== undefined && filters.minAudience > 0) {
    result = result.filter((item) => item.community.member_count >= filters.minAudience!);
  }

  if (filters.minDailyViews !== undefined && filters.minDailyViews > 0) {
    result = result.filter((item) => item.community.active_daily_views >= filters.minDailyViews!);
  }

  if (filters.searchQuery && filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase().trim();
    result = result.filter(
      (item) =>
        item.community.name.toLowerCase().includes(q) ||
        item.promoter.display_name.toLowerCase().includes(q) ||
        (item.community.demographics_summary && item.community.demographics_summary.toLowerCase().includes(q)) ||
        (item.community.category?.name && item.community.category.name.toLowerCase().includes(q)) ||
        item.packages.some(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.deliverables.some((d) => d.toLowerCase().includes(q))
        )
    );
  }

  if (filters.maxAudience && filters.maxAudience > 0) {
    result = result.filter((item) => item.community.member_count <= filters.maxAudience!);
  }

  if (filters.maxPrice && filters.maxPrice > 0) {
    result = result.filter(
      (item) => item.lowestPrice !== null && item.lowestPrice <= filters.maxPrice!
    );
  }

  // Sorting
  switch (filters.sortBy) {
    case "members_desc":
      result.sort((a, b) => b.community.member_count - a.community.member_count);
      break;
    case "views_desc":
      result.sort((a, b) => b.community.active_daily_views - a.community.active_daily_views);
      break;
    case "price_asc":
      result.sort((a, b) => {
        const pA = a.lowestPrice ?? 999999999;
        const pB = b.lowestPrice ?? 999999999;
        return pA - pB;
      });
      break;
    case "rating_desc":
      result.sort((a, b) => b.promoter.rating - a.promoter.rating);
      break;
    case "popular":
    default:
      // Sort by rating desc then completed orders then member count
      result.sort((a, b) => {
        if (b.promoter.rating !== a.promoter.rating) {
          return b.promoter.rating - a.promoter.rating;
        }
        return b.community.member_count - a.community.member_count;
      });
      break;
  }

  return result;
}

/**
 * Local Storage Fallback Helpers
 */
function getLocalMarketplaceListings(filters: MarketplaceFilters): MarketplaceCommunityCard[] {
  const verifiedComms: WhatsAppCommunity[] = [];
  const promotersMap = new Map<string, any>();
  const packagesList: PromotionPackage[] = [];

  try {
    // Read all promoters
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PROMOTER_STORAGE_KEY_PREFIX)) {
        const p = JSON.parse(localStorage.getItem(key) || "null");
        if (p && p.id) {
          promotersMap.set(p.id, p);
        }
      }
    }

    // Read all communities (filter only verified & published)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(COMMUNITY_STORAGE_KEY_PREFIX)) {
        const comms: WhatsAppCommunity[] = JSON.parse(localStorage.getItem(key) || "[]");
        for (const c of comms) {
          if (c.verification_status === "verified" && c.is_published) {
            verifiedComms.push(c);
          }
        }
      }
    }

    // Read all packages (filter only active)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PACKAGE_STORAGE_KEY_PREFIX)) {
        const pkgs: PromotionPackage[] = JSON.parse(localStorage.getItem(key) || "[]");
        for (const p of pkgs) {
          if (p.is_active) {
            packagesList.push(p);
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }

  let listings: MarketplaceCommunityCard[] = verifiedComms.map((comm) => {
    const promoter = promotersMap.get(comm.promoter_id) || {
      id: comm.promoter_id,
      display_name: "Verified Promoter",
      rating: 5.0,
      total_completed_orders: 0,
      is_verified: true,
      status: "active",
      niche: null,
    };

    const commPkgs = packagesList.filter((p) => p.community_id === comm.id && p.is_active);
    const lowestPrice =
      commPkgs.length > 0
        ? Math.min(...commPkgs.map((p) => Number(p.price) || 0))
        : null;

    return {
      community: comm,
      promoter: {
        id: promoter.id,
        display_name: promoter.display_name || "Verified Promoter",
        rating: Number(promoter.rating) || 5.0,
        total_completed_orders: Number(promoter.total_completed_orders) || 0,
        is_verified: Boolean(promoter.is_verified),
        status: promoter.status || "active",
        niches: promoter.niche || null,
      },
      packages: commPkgs,
      lowestPrice,
    };
  });

  return applyMarketplaceFilters(listings, filters);
}

function getLocalPromoterById(promoterId: string): PromoterProfile | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PROMOTER_STORAGE_KEY_PREFIX)) {
        const p = JSON.parse(localStorage.getItem(key) || "null");
        if (p && (p.id === promoterId || p.user_id === promoterId)) {
          return p;
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function getLocalPromoterVerifiedCommunities(promoterId: string): WhatsAppCommunity[] {
  const result: WhatsAppCommunity[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(COMMUNITY_STORAGE_KEY_PREFIX)) {
        const comms: WhatsAppCommunity[] = JSON.parse(localStorage.getItem(key) || "[]");
        for (const c of comms) {
          if (c.promoter_id === promoterId && c.verification_status === "verified" && c.is_published) {
            result.push(c);
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return result;
}

function getLocalPackagesForCommunities(communityIds: string[]): PromotionPackage[] {
  const result: PromotionPackage[] = [];
  const set = new Set(communityIds);
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PACKAGE_STORAGE_KEY_PREFIX)) {
        const pkgs: PromotionPackage[] = JSON.parse(localStorage.getItem(key) || "[]");
        for (const p of pkgs) {
          if (set.has(p.community_id) && p.is_active) {
            result.push(p);
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return result;
}
