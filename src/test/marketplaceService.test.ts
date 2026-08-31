import { describe, it, expect, beforeEach } from "vitest";
import {
  getMarketplaceListings,
  getPromoterMarketplaceDetail,
  MarketplaceFilters,
} from "@/services/marketplaceService";
import { PromoterProfile } from "@/services/promoterService";
import { WhatsAppCommunity } from "@/services/communityService";
import { PromotionPackage } from "@/services/packageService";

describe("Step 5 — Business Promotion Marketplace / Promoter Discovery Suite", () => {
  const mockPromoterId1 = "promoter_market_1";
  const mockPromoterId2 = "promoter_market_2";
  const mockUserId1 = "user_market_1";
  const mockUserId2 = "user_market_2";

  const promoter1: PromoterProfile = {
    id: mockPromoterId1,
    user_id: mockUserId1,
    display_name: "Lagos Trendsetter Media",
    phone_whatsapp: "+2348012345678",
    bio: "Top fashion and lifestyle promoter in Nigeria with high conversion status views.",
    niche: ["fashion", "beauty"],
    rating: 4.9,
    total_completed_orders: 42,
    is_verified: true,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const promoter2: PromoterProfile = {
    id: mockPromoterId2,
    user_id: mockUserId2,
    display_name: "Abuja Tech & Biz Broadcast",
    phone_whatsapp: "+2348098765432",
    bio: "Dedicated WhatsApp channel for tech enthusiasts and startup founders.",
    niche: ["tech", "business"],
    rating: 4.7,
    total_completed_orders: 18,
    is_verified: true,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const verifiedPublishedComm1: WhatsAppCommunity = {
    id: "comm_verified_pub_1",
    promoter_id: mockPromoterId1,
    name: "Lagos Fashion Deals WhatsApp Group",
    category_id: "cat_fashion",
    community_type: "group",
    member_count: 1024,
    active_daily_views: 3500,
    country_primary: "Nigeria",
    demographics_summary: "90% Nigerian female shoppers aged 20-35",
    proof_screenshot_url: "https://example.com/proof1.png",
    verification_status: "verified",
    is_published: true,
    rejection_reason: null,
    verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { id: "cat_fashion", name: "Fashion & Style", slug: "fashion" },
  };

  const verifiedPublishedComm2: WhatsAppCommunity = {
    id: "comm_verified_pub_2",
    promoter_id: mockPromoterId2,
    name: "Nigeria Tech Broadcast Channel",
    category_id: "cat_tech",
    community_type: "channel",
    member_count: 5200,
    active_daily_views: 12000,
    country_primary: "Nigeria",
    demographics_summary: "Software devs and tech founders in NG",
    proof_screenshot_url: "https://example.com/proof2.png",
    verification_status: "verified",
    is_published: true,
    rejection_reason: null,
    verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { id: "cat_tech", name: "Tech & Gadgets", slug: "tech" },
  };

  // Community under review (should NOT be visible in marketplace)
  const underReviewComm: WhatsAppCommunity = {
    id: "comm_under_review",
    promoter_id: mockPromoterId1,
    name: "Secret Unverified Group",
    category_id: "cat_fashion",
    community_type: "group",
    member_count: 800,
    active_daily_views: 1000,
    country_primary: "Nigeria",
    demographics_summary: null,
    proof_screenshot_url: "https://example.com/proof3.png",
    verification_status: "under_review",
    is_published: true,
    rejection_reason: null,
    verified_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Community verified but unpublished (should NOT be visible)
  const unpublishedComm: WhatsAppCommunity = {
    id: "comm_unpublished",
    promoter_id: mockPromoterId2,
    name: "Paused Channel",
    category_id: "cat_tech",
    community_type: "channel",
    member_count: 3000,
    active_daily_views: 4000,
    country_primary: "Nigeria",
    demographics_summary: null,
    proof_screenshot_url: "https://example.com/proof4.png",
    verification_status: "verified",
    is_published: false,
    rejection_reason: null,
    verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Active package on verified community
  const activePackage1: PromotionPackage = {
    id: "pkg_1",
    promoter_id: mockPromoterId1,
    community_id: "comm_verified_pub_1",
    title: "Standard 24h WhatsApp Group Promo",
    description: "Pinned post and flyer blast for 24 hours.",
    price: 15000,
    duration_hours: 24,
    deliverables: ["1x Pinned Message", "2x Tag All Broadcast"],
    max_active_orders: 5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Active package 2 on verified channel
  const activePackage2: PromotionPackage = {
    id: "pkg_2",
    promoter_id: mockPromoterId2,
    community_id: "comm_verified_pub_2",
    title: "48h Tech Broadcast Feature",
    description: "Broadcast message with link tracking.",
    price: 45000,
    duration_hours: 48,
    deliverables: ["1x Broadcast Post", "Link Button"],
    max_active_orders: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Inactive package (should NOT be visible)
  const inactivePackage: PromotionPackage = {
    id: "pkg_inactive",
    promoter_id: mockPromoterId1,
    community_id: "comm_verified_pub_1",
    title: "Old Paused Promo",
    description: "Disabled promo",
    price: 5000,
    duration_hours: 12,
    deliverables: ["1x Post"],
    max_active_orders: 1,
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    localStorage.clear();

    // Seed local storage with promoters
    localStorage.setItem(`bincovibe_promoter_profile_${mockUserId1}`, JSON.stringify(promoter1));
    localStorage.setItem(`bincovibe_promoter_profile_${mockUserId2}`, JSON.stringify(promoter2));

    // Seed local storage with communities
    localStorage.setItem(
      `bincovibe_whatsapp_communities_${mockPromoterId1}`,
      JSON.stringify([verifiedPublishedComm1, underReviewComm])
    );
    localStorage.setItem(
      `bincovibe_whatsapp_communities_${mockPromoterId2}`,
      JSON.stringify([verifiedPublishedComm2, unpublishedComm])
    );

    // Seed local storage with packages
    localStorage.setItem(
      `bincovibe_promotion_packages_${mockPromoterId1}`,
      JSON.stringify([activePackage1, inactivePackage])
    );
    localStorage.setItem(
      `bincovibe_promotion_packages_${mockPromoterId2}`,
      JSON.stringify([activePackage2])
    );
  });

  it("1. Public marketplace returns ONLY verified & published communities", async () => {
    const listings = await getMarketplaceListings();

    expect(listings.length).toBe(2);
    const commIds = listings.map((l) => l.community.id);

    expect(commIds).toContain("comm_verified_pub_1");
    expect(commIds).toContain("comm_verified_pub_2");
    expect(commIds).not.toContain("comm_under_review");
    expect(commIds).not.toContain("comm_unpublished");
  });

  it("2. Marketplace listings contain active packages and lowest price calculation", async () => {
    const listings = await getMarketplaceListings();
    const item1 = listings.find((l) => l.community.id === "comm_verified_pub_1");

    expect(item1).toBeDefined();
    expect(item1?.packages.length).toBe(1); // inactive package excluded
    expect(item1?.packages[0].id).toBe("pkg_1");
    expect(item1?.lowestPrice).toBe(15000);
  });

  it("3. Marketplace filters by community type correctly", async () => {
    const channelListings = await getMarketplaceListings({ communityType: "channel" });
    expect(channelListings.length).toBe(1);
    expect(channelListings[0].community.community_type).toBe("channel");
    expect(channelListings[0].community.id).toBe("comm_verified_pub_2");

    const groupListings = await getMarketplaceListings({ communityType: "group" });
    expect(groupListings.length).toBe(1);
    expect(groupListings[0].community.community_type).toBe("group");
  });

  it("4. Marketplace filters by minimum audience size", async () => {
    const bigAudience = await getMarketplaceListings({ minAudience: 2000 });
    expect(bigAudience.length).toBe(1);
    expect(bigAudience[0].community.member_count).toBeGreaterThanOrEqual(2000);
    expect(bigAudience[0].community.id).toBe("comm_verified_pub_2");
  });

  it("5. Marketplace filters by search keyword", async () => {
    const techSearch = await getMarketplaceListings({ searchQuery: "Tech Broadcast" });
    expect(techSearch.length).toBe(1);
    expect(techSearch[0].community.name).toContain("Tech Broadcast");

    const fashionSearch = await getMarketplaceListings({ searchQuery: "fashion" });
    expect(fashionSearch.length).toBe(1);
    expect(fashionSearch[0].community.name).toContain("Fashion");
  });

  it("6. Detailed promoter view returns promoter profile, verified communities & active packages", async () => {
    const detail = await getPromoterMarketplaceDetail(mockPromoterId1);

    expect(detail).not.toBeNull();
    expect(detail?.promoter.display_name).toBe("Lagos Trendsetter Media");
    expect(detail?.promoter.rating).toBe(4.9);
    expect(detail?.communities.length).toBe(1); // under review filtered out
    expect(detail?.allPackages.length).toBe(1); // inactive filtered out
    expect(detail?.totalAudienceReach).toBe(1024);
    expect(detail?.totalDailyViews).toBe(3500);
  });

  it("7. Detailed promoter view returns null for non-existent promoter", async () => {
    const detail = await getPromoterMarketplaceDetail("non_existent_id");
    expect(detail).toBeNull();
  });
});
