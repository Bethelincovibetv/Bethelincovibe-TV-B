import { supabase } from "@/integrations/supabase/client";
import { PromoterProfile } from "./promoterService";
import { WhatsAppCommunity, CommunityType } from "./communityService";
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
  communities: (WhatsAppCommunity & { packages: PromotionPackage[] })[];
  allPackages: PromotionPackage[];
  totalAudienceReach: number;
  totalDailyViews: number;
}

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
  if (filters.maxAudience !== undefined && filters.maxAudience > 0) {
    result = result.filter((item) => item.community.member_count <= filters.maxAudience!);
  }
  if (filters.minDailyViews !== undefined && filters.minDailyViews > 0) {
    result = result.filter((item) => item.community.active_daily_views >= filters.minDailyViews!);
  }
  if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
    result = result.filter((item) => item.lowestPrice !== null && item.lowestPrice <= filters.maxPrice!);
  }

  if (filters.searchQuery?.trim()) {
    const q = filters.searchQuery.toLowerCase().trim();
    result = result.filter((item) =>
      item.community.name.toLowerCase().includes(q) ||
      item.promoter.display_name.toLowerCase().includes(q) ||
      Boolean(item.community.demographics_summary?.toLowerCase().includes(q)) ||
      Boolean(item.community.category?.name?.toLowerCase().includes(q)) ||
      item.packages.some((p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.deliverables.some((d) => d.toLowerCase().includes(q))
      )
    );
  }

  switch (filters.sortBy) {
    case "members_desc":
      result.sort((a, b) => b.community.member_count - a.community.member_count);
      break;
    case "views_desc":
      result.sort((a, b) => b.community.active_daily_views - a.community.active_daily_views);
      break;
    case "price_asc":
      result.sort((a, b) => (a.lowestPrice ?? Number.MAX_SAFE_INTEGER) - (b.lowestPrice ?? Number.MAX_SAFE_INTEGER));
      break;
    case "rating_desc":
      result.sort((a, b) => b.promoter.rating - a.promoter.rating);
      break;
    case "popular":
    default:
      result.sort((a, b) => {
        if (b.promoter.rating !== a.promoter.rating) return b.promoter.rating - a.promoter.rating;
        if (b.promoter.total_completed_orders !== a.promoter.total_completed_orders) {
          return b.promoter.total_completed_orders - a.promoter.total_completed_orders;
        }
        return b.community.member_count - a.community.member_count;
      });
  }

  return result;
}

/** Public marketplace is Supabase-only. No localStorage/demo fallback is permitted. */
export async function getMarketplaceListings(
  filters: MarketplaceFilters = {}
): Promise<MarketplaceCommunityCard[]> {
  let communityQuery = supabase
    .from("whatsapp_communities")
    .select(`
      *,
      category:categories(id, name, slug),
      promoter:promoter_profiles(id, display_name, rating, total_completed_orders, is_verified, status, niche)
    `)
    .eq("verification_status", "verified")
    .eq("is_published", true);

  if (filters.categoryId && filters.categoryId !== "all") communityQuery = communityQuery.eq("category_id", filters.categoryId);
  if (filters.communityType && filters.communityType !== "all") communityQuery = communityQuery.eq("community_type", filters.communityType);
  if (filters.minAudience !== undefined && filters.minAudience > 0) communityQuery = communityQuery.gte("member_count", filters.minAudience);
  if (filters.minDailyViews !== undefined && filters.minDailyViews > 0) communityQuery = communityQuery.gte("active_daily_views", filters.minDailyViews);

  const { data: communitiesData, error: commError } = await communityQuery;
  if (commError) throw new Error(`Marketplace communities query failed: ${commError.message}`);

  const communities = (communitiesData || []) as any[];
  if (communities.length === 0) return [];

  const communityIds = communities.map((c) => c.id);
  const { data: packagesData, error: pkgError } = await supabase
    .from("promotion_packages" as any)
    .select("*")
    .in("community_id", communityIds)
    .eq("is_active", true);
  if (pkgError) throw new Error(`Marketplace packages query failed: ${pkgError.message}`);

  const packages = (packagesData || []) as PromotionPackage[];
  const listings: MarketplaceCommunityCard[] = communities.map((comm) => {
    const commPackages = packages.filter((p) => p.community_id === comm.id && p.is_active);
    const promoterInfo = comm.promoter;
    if (!promoterInfo) return null;
    return {
      community: { ...comm, category: comm.category || null },
      promoter: {
        id: promoterInfo.id,
        display_name: promoterInfo.display_name || "Verified Promoter",
        rating: Number(promoterInfo.rating) || 0,
        total_completed_orders: Number(promoterInfo.total_completed_orders) || 0,
        is_verified: Boolean(promoterInfo.is_verified),
        status: promoterInfo.status || "active",
        niches: promoterInfo.niche || null,
      },
      packages: commPackages,
      lowestPrice: commPackages.length ? Math.min(...commPackages.map((p) => Number(p.price) || 0)) : null,
    };
  }).filter(Boolean) as MarketplaceCommunityCard[];

  return applyMarketplaceFilters(listings, filters);
}

export async function getPromoterMarketplaceDetail(
  promoterId: string
): Promise<PromoterMarketplaceDetail | null> {
  if (!promoterId) return null;

  const { data: promoterData, error: promoterError } = await supabase
    .from("promoter_profiles")
    .select("*")
    .eq("id", promoterId)
    .maybeSingle();
  if (promoterError) throw new Error(`Promoter profile query failed: ${promoterError.message}`);
  if (!promoterData) return null;

  const { data: commData, error: commError } = await supabase
    .from("whatsapp_communities")
    .select("*, category:categories(id, name, slug)")
    .eq("promoter_id", promoterId)
    .eq("verification_status", "verified")
    .eq("is_published", true);
  if (commError) throw new Error(`Promoter communities query failed: ${commError.message}`);

  const communities = (commData || []) as unknown as WhatsAppCommunity[];
  const commIds = communities.map((c) => c.id);
  let packages: PromotionPackage[] = [];

  if (commIds.length) {
    const { data: pkgData, error: pkgError } = await supabase
      .from("promotion_packages" as any)
      .select("*")
      .in("community_id", commIds)
      .eq("is_active", true);
    if (pkgError) throw new Error(`Promoter packages query failed: ${pkgError.message}`);
    packages = (pkgData || []) as PromotionPackage[];
  }

  const communitiesWithPackages = communities.map((comm) => ({
    ...comm,
    packages: packages.filter((p) => p.community_id === comm.id && p.is_active),
  }));

  return {
    promoter: promoterData as PromoterProfile,
    communities: communitiesWithPackages,
    allPackages: packages,
    totalAudienceReach: communities.reduce((sum, c) => sum + (c.member_count || 0), 0),
    totalDailyViews: communities.reduce((sum, c) => sum + (c.active_daily_views || 0), 0),
  };
}
