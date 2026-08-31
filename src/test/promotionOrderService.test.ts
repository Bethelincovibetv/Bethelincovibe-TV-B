import { describe, it, expect, beforeEach } from "vitest";
import {
  createPromotionOrder,
  getMyBusinessOrders,
  getMyPromoterOrders,
  getPromotionOrderById,
  validatePromotionOrderInput,
  PromotionOrder,
} from "../services/promotionOrderService";
import { PromotionPackage } from "../services/packageService";
import { WhatsAppCommunity } from "../services/communityService";
import { PromoterProfile } from "../services/promoterService";

describe("Step 6 — Promotion Orders & Booking Security Suite", () => {
  const businessUserId = "user-biz-123";
  const otherBusinessUserId = "user-biz-456";
  const promoterUserId = "user-promoter-789";
  const promoterId = "promoter-profile-789";
  const otherPromoterId = "promoter-profile-999";
  const communityId = "comm-verified-1";
  const unverifiedCommunityId = "comm-unverified-2";
  const packageId = "pkg-active-100";
  const inactivePackageId = "pkg-inactive-200";

  beforeEach(() => {
    localStorage.clear();

    // Seed mock promoter profile
    const mockPromoter: PromoterProfile = {
      id: promoterId,
      user_id: promoterUserId,
      display_name: "Lagos Status Queen",
      bio: "Top tier WhatsApp status influencer in Lagos",
      location_state: "Lagos",
      verification_badge: true,
      total_reach: 25000,
      rating: 4.9,
      review_count: 32,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem("bincovibe_promoter_profile_" + promoterUserId, JSON.stringify(mockPromoter));
    localStorage.setItem("bincovibe_promoter_profiles_all", JSON.stringify([mockPromoter]));

    // Seed mock communities
    const mockVerifiedCommunity: WhatsAppCommunity = {
      id: communityId,
      promoter_id: promoterId,
      name: "Lagos Tech & Business Hub",
      category_id: "cat-business",
      community_type: "group",
      member_count: 5000,
      active_daily_views: 3200,
      country_primary: "Nigeria",
      demographics_summary: "Tech professionals in Lagos",
      proof_screenshot_url: "https://example.com/proof1.png",
      verification_status: "verified",
      is_published: true,
      rejection_reason: null,
      verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockUnverifiedCommunity: WhatsAppCommunity = {
      id: unverifiedCommunityId,
      promoter_id: promoterId,
      name: "Unverified Hub",
      category_id: "cat-business",
      community_type: "group",
      member_count: 1000,
      active_daily_views: 200,
      country_primary: "Nigeria",
      demographics_summary: "General audience",
      proof_screenshot_url: "https://example.com/proof2.png",
      verification_status: "submitted",
      is_published: false,
      rejection_reason: null,
      verified_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem(
      `bincovibe_whatsapp_communities_${promoterId}`,
      JSON.stringify([mockVerifiedCommunity, mockUnverifiedCommunity])
    );

    // Seed mock packages
    const mockActivePkg: PromotionPackage = {
      id: packageId,
      promoter_id: promoterId,
      community_id: communityId,
      title: "24-Hour Broadcast Blast",
      description: "24 hours status broadcast with link banner",
      price: 15000,
      duration_hours: 24,
      deliverables: ["1 Status Video", "1 Direct Link CTA", "Screenshots Report"],
      max_active_orders: 5,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockInactivePkg: PromotionPackage = {
      id: inactivePackageId,
      promoter_id: promoterId,
      community_id: communityId,
      title: "Inactive Broadcast Package",
      description: "Temporarily disabled package",
      price: 5000,
      duration_hours: 12,
      deliverables: ["1 Status Post"],
      max_active_orders: 1,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem(
      `bincovibe_promotion_packages_${promoterId}`,
      JSON.stringify([mockActivePkg, mockInactivePkg])
    );
  });

  it("1. Input validation requires valid packageId and non-empty promotion brief", () => {
    const invalidEmptyBrief = validatePromotionOrderInput({
      packageId: packageId,
      promotionBrief: "",
    });
    expect(invalidEmptyBrief.valid).toBe(false);
    expect(invalidEmptyBrief.error).toContain("Promotion brief is required");

    const invalidShortBrief = validatePromotionOrderInput({
      packageId: packageId,
      promotionBrief: "short",
    });
    expect(invalidShortBrief.valid).toBe(false);
    expect(invalidShortBrief.error).toContain("at least 10 characters");

    const valid = validatePromotionOrderInput({
      packageId: packageId,
      promotionBrief: "Please broadcast our new Lagos boutique opening offer with 20% discount.",
    });
    expect(valid.valid).toBe(true);
  });

  it("2. Authenticated business user can create an order with trusted package amount", async () => {
    const result = await createPromotionOrder(
      {
        packageId: packageId,
        promotionBrief: "Please broadcast our new boutique sale to tech professionals.",
        creativeAssetsUrls: ["https://example.com/banner.png"],
        specialInstructions: "Post at 3 PM West Africa Time",
      },
      businessUserId
    );

    expect(result.error).toBeNull();
    expect(result.order).toBeDefined();
    expect(result.order?.business_user_id).toBe(businessUserId);
    expect(result.order?.package_id).toBe(packageId);
    expect(result.order?.promoter_id).toBe(promoterId);
    expect(result.order?.community_id).toBe(communityId);
    // Amount must strictly equal the package's price (15000)
    expect(result.order?.amount).toBe(15000);
    expect(result.order?.platform_fee).toBe(1500); // 10%
    expect(result.order?.promoter_net_earning).toBe(13500); // 90%
    expect(result.order?.status).toBe("pending_payment");
    expect(result.order?.order_reference).toMatch(/^BTV-PROM-\d{8}-[A-Z0-9]{6}$/);
    expect(result.order?.paid_at).toBeNull();
    expect(result.order?.completed_at).toBeNull();
  });

  it("3. Malicious client cannot override order amount or inject custom price", async () => {
    const result = await createPromotionOrder(
      {
        packageId: packageId,
        promotionBrief: "Attempting to inject a 10 Naira price tag.",
        customAmount: 10,
      },
      businessUserId
    );

    expect(result.error).toBeNull();
    expect(result.order?.amount).toBe(15000); // Must be strictly 15,000 from package
    expect(result.order?.amount).not.toBe(10);
  });

  it("4. Malicious client cannot create order in paid or completed status", async () => {
    const result = await createPromotionOrder(
      {
        packageId: packageId,
        promotionBrief: "Attempting to inject paid_escrow or completed status directly.",
        customStatus: "completed",
      },
      businessUserId
    );

    expect(result.error).toBeNull();
    expect(result.order?.status).toBe("pending_payment"); // Must strictly remain pending_payment
  });

  it("5. Rejects order if package is inactive", async () => {
    const result = await createPromotionOrder(
      {
        packageId: inactivePackageId,
        promotionBrief: "Trying to book an inactive promotion package.",
      },
      businessUserId
    );

    expect(result.order).toBeNull();
    expect(result.error).toContain("inactive");
  });

  it("6. Rejects order if promoter/package/community do not match", async () => {
    const resultMismatchPromoter = await createPromotionOrder(
      {
        packageId: packageId,
        promoterId: otherPromoterId, // Mismatched promoter
        promotionBrief: "Trying to forge promoter ownership.",
      },
      businessUserId
    );

    expect(resultMismatchPromoter.order).toBeNull();
    expect(resultMismatchPromoter.error).toContain("Promoter does not match package owner");
  });

  it("7. Business user can only retrieve their own orders", async () => {
    await createPromotionOrder(
      {
        packageId: packageId,
        promotionBrief: "Business 1 order for campaign launch.",
      },
      businessUserId
    );

    await createPromotionOrder(
      {
        packageId: packageId,
        promotionBrief: "Business 2 order for another campaign.",
      },
      otherBusinessUserId
    );

    const biz1Orders = await getMyBusinessOrders(businessUserId);
    expect(biz1Orders.length).toBe(1);
    expect(biz1Orders[0].business_user_id).toBe(businessUserId);
    expect(biz1Orders[0].promotion_brief).toContain("Business 1");

    const biz2Orders = await getMyBusinessOrders(otherBusinessUserId);
    expect(biz2Orders.length).toBe(1);
    expect(biz2Orders[0].business_user_id).toBe(otherBusinessUserId);
  });

  it("8. Promoter can only retrieve orders assigned to their promoter profile", async () => {
    await createPromotionOrder(
      {
        packageId: packageId,
        promotionBrief: "Order intended for promoter 789.",
      },
      businessUserId
    );

    const promoterOrders = await getMyPromoterOrders(promoterId, promoterUserId);
    expect(promoterOrders.length).toBe(1);
    expect(promoterOrders[0].promoter_id).toBe(promoterId);

    const otherPromoterOrders = await getMyPromoterOrders(otherPromoterId, "other-user-999");
    expect(otherPromoterOrders.length).toBe(0);
  });

  it("9. Access control on order detail endpoint prevents cross-user access", async () => {
    const { order } = await createPromotionOrder(
      {
        packageId: packageId,
        promotionBrief: "Confidential product marketing brief for launch.",
      },
      businessUserId
    );

    expect(order).toBeDefined();
    const orderId = order!.id;

    // 1. Owner business can access
    const ownerRes = await getPromotionOrderById(orderId, businessUserId);
    expect(ownerRes.order).toBeDefined();
    expect(ownerRes.error).toBeNull();

    // 2. Assigned promoter can access
    const promoterRes = await getPromotionOrderById(orderId, promoterUserId);
    expect(promoterRes.order).toBeDefined();
    expect(promoterRes.error).toBeNull();

    // 3. Admin can access
    const adminRes = await getPromotionOrderById(orderId, "admin-user", "admin");
    expect(adminRes.order).toBeDefined();
    expect(adminRes.error).toBeNull();

    // 4. Unrelated business user is blocked
    const unauthorizedBizRes = await getPromotionOrderById(orderId, otherBusinessUserId);
    expect(unauthorizedBizRes.order).toBeNull();
    expect(unauthorizedBizRes.error).toContain("Unauthorized");
  });

  it("10. Order creation creates NO wallet deductions, NO escrow transactions, and NO payment records", async () => {
    const initialWalletState = localStorage.getItem("bincovibe_user_wallets");
    const initialTransactionsState = localStorage.getItem("bincovibe_wallet_transactions");

    await createPromotionOrder(
      {
        packageId: packageId,
        promotionBrief: "Booking an order must not trigger payment or wallet actions.",
      },
      businessUserId
    );

    const finalWalletState = localStorage.getItem("bincovibe_user_wallets");
    const finalTransactionsState = localStorage.getItem("bincovibe_wallet_transactions");

    // Wallet states must remain untouched in Step 6
    expect(finalWalletState).toBe(initialWalletState);
    expect(finalTransactionsState).toBe(initialTransactionsState);
  });
});
