import { describe, it, expect, beforeEach } from "vitest";
import {
  createPackage,
  updatePackage,
  togglePackageActive,
  deletePackage,
  validatePackageInput,
  canCommunityHostPackage,
  PromotionPackage,
  PACKAGE_STORAGE_KEY_PREFIX,
} from "../services/packageService";
import { WhatsAppCommunity } from "../services/communityService";

describe("Step 4 — Promotion Packages Suite", () => {
  const PROMOTER_A_ID = "promoter_11111111-1111-1111-1111-111111111111";
  const PROMOTER_B_ID = "promoter_22222222-2222-2222-2222-222222222222";

  const VERIFIED_COMMUNITY_A: WhatsAppCommunity = {
    id: "comm_verified_a",
    promoter_id: PROMOTER_A_ID,
    name: "Lagos Tech & Startup Hub",
    category_id: "cat-tech",
    community_type: "channel",
    member_count: 15000,
    active_daily_views: 4500,
    country_primary: "Nigeria",
    demographics_summary: "Founders and engineers",
    proof_screenshot_url: "https://example.com/proof.png",
    verification_status: "verified",
    is_published: true,
    rejection_reason: null,
    verified_at: "2026-08-30T10:00:00Z",
    created_at: "2026-08-25T10:00:00Z",
    updated_at: "2026-08-30T10:00:00Z",
  };

  const UNVERIFIED_COMMUNITY_A: WhatsAppCommunity = {
    id: "comm_unverified_a",
    promoter_id: PROMOTER_A_ID,
    name: "Unverified Lagos Fashion Group",
    category_id: "cat-fashion",
    community_type: "group",
    member_count: 500,
    active_daily_views: 100,
    country_primary: "Nigeria",
    demographics_summary: null,
    proof_screenshot_url: "https://example.com/proof_pending.png",
    verification_status: "under_review",
    is_published: false,
    rejection_reason: null,
    verified_at: null,
    created_at: "2026-08-30T12:00:00Z",
    updated_at: "2026-08-30T12:00:00Z",
  };

  const UNPUBLISHED_VERIFIED_COMMUNITY_A: WhatsAppCommunity = {
    id: "comm_unpublished_a",
    promoter_id: PROMOTER_A_ID,
    name: "Suspended or Unpublished Group",
    category_id: "cat-business",
    community_type: "group",
    member_count: 2000,
    active_daily_views: 500,
    country_primary: "Nigeria",
    demographics_summary: null,
    proof_screenshot_url: "https://example.com/proof.png",
    verification_status: "verified",
    is_published: false, // NOT published
    rejection_reason: null,
    verified_at: "2026-08-20T10:00:00Z",
    created_at: "2026-08-15T10:00:00Z",
    updated_at: "2026-08-20T10:00:00Z",
  };

  const VERIFIED_COMMUNITY_B: WhatsAppCommunity = {
    id: "comm_verified_b",
    promoter_id: PROMOTER_B_ID,
    name: "Promoter B Verified Audience",
    category_id: "cat-entertainment",
    community_type: "status_audience",
    member_count: 8000,
    active_daily_views: 3000,
    country_primary: "Nigeria",
    demographics_summary: null,
    proof_screenshot_url: "https://example.com/proof_b.png",
    verification_status: "verified",
    is_published: true,
    rejection_reason: null,
    verified_at: "2026-08-30T10:00:00Z",
    created_at: "2026-08-25T10:00:00Z",
    updated_at: "2026-08-30T10:00:00Z",
  };

  beforeEach(() => {
    localStorage.clear();

    // Seed communities in mock localStorage
    localStorage.setItem(
      `bincovibe_whatsapp_communities_${PROMOTER_A_ID}`,
      JSON.stringify([
        VERIFIED_COMMUNITY_A,
        UNVERIFIED_COMMUNITY_A,
        UNPUBLISHED_VERIFIED_COMMUNITY_A,
      ])
    );

    localStorage.setItem(
      `bincovibe_whatsapp_communities_${PROMOTER_B_ID}`,
      JSON.stringify([VERIFIED_COMMUNITY_B])
    );
  });

  // 1. Authenticated promoter can create a package for their own verified/published community
  it("1. Authenticated promoter can create a package for their own verified & published community", async () => {
    const pkg = await createPackage({
      promoterId: PROMOTER_A_ID,
      communityId: VERIFIED_COMMUNITY_A.id,
      title: "24hr Status + Group Blast",
      description: "Premium prime-time broadcast across our verified 15k subscriber channel.",
      price: 15000,
      durationHours: 24,
      deliverables: {
        status_posts: 2,
        group_broadcasts: 1,
        pin_duration_hours: 12,
        custom_deliverables: ["Website link in status"],
      },
      maxActiveOrders: 5,
      isActive: true,
    });

    expect(pkg.id).toBeDefined();
    expect(pkg.promoter_id).toBe(PROMOTER_A_ID);
    expect(pkg.community_id).toBe(VERIFIED_COMMUNITY_A.id);
    expect(pkg.price).toBe(15000);
    expect(pkg.duration_hours).toBe(24);
    expect(pkg.is_active).toBe(true);
    expect(pkg.deliverables.status_posts).toBe(2);
  });

  // 2. Promoter cannot create a package for another promoter's community
  it("2. Promoter cannot create a package for another promoter's community", async () => {
    await expect(
      createPackage({
        promoterId: PROMOTER_A_ID,
        communityId: VERIFIED_COMMUNITY_B.id, // Belongs to Promoter B
        title: "Malicious Cross-Promoter Package",
        description: "Attempting to hijack Promoter B audience.",
        price: 10000,
        durationHours: 24,
        deliverables: { status_posts: 1 },
      })
    ).rejects.toThrow(/Unauthorized|does not belong to your promoter profile/i);
  });

  // 3. Promoter cannot create a package for an unverified community
  it("3. Promoter cannot create a package for an unverified community", async () => {
    await expect(
      createPackage({
        promoterId: PROMOTER_A_ID,
        communityId: UNVERIFIED_COMMUNITY_A.id, // Status is under_review
        title: "Unverified Audience Package",
        description: "Attempting to create package on unverified community.",
        price: 5000,
        durationHours: 24,
        deliverables: { status_posts: 1 },
      })
    ).rejects.toThrow(/verified and published/i);
  });

  // 4. Promoter cannot create a package for an unpublished community
  it("4. Promoter cannot create a package for an unpublished community", async () => {
    await expect(
      createPackage({
        promoterId: PROMOTER_A_ID,
        communityId: UNPUBLISHED_VERIFIED_COMMUNITY_A.id, // is_published = false
        title: "Unpublished Audience Package",
        description: "Attempting to create package on unpublished community.",
        price: 8000,
        durationHours: 24,
        deliverables: { status_posts: 1 },
      })
    ).rejects.toThrow(/verified and published/i);
  });

  // 5. Promoter cannot change promoter_id
  it("5. Promoter cannot change promoter_id on update", async () => {
    const pkg = await createPackage({
      promoterId: PROMOTER_A_ID,
      communityId: VERIFIED_COMMUNITY_A.id,
      title: "Original Title",
      description: "Description here.",
      price: 6000,
      durationHours: 24,
      deliverables: { status_posts: 1 },
    });

    const updated = await updatePackage({
      packageId: pkg.id,
      promoterId: PROMOTER_A_ID,
      title: "Updated Title",
      price: 7000,
    });

    expect(updated.promoter_id).toBe(PROMOTER_A_ID);
    expect(updated.title).toBe("Updated Title");
  });

  // 6. Promoter cannot change community_id after package creation
  it("6. Promoter cannot change community_id after package creation", async () => {
    const pkg = await createPackage({
      promoterId: PROMOTER_A_ID,
      communityId: VERIFIED_COMMUNITY_A.id,
      title: "Fixed Community Package",
      description: "Community target must remain fixed.",
      price: 9000,
      durationHours: 48,
      deliverables: { group_broadcasts: 2 },
    });

    // Update with changes to other fields
    const updated = await updatePackage({
      packageId: pkg.id,
      promoterId: PROMOTER_A_ID,
      title: "Fixed Community Package (Renamed)",
      price: 12000,
    });

    expect(updated.community_id).toBe(VERIFIED_COMMUNITY_A.id);
  });

  // 7. Promoter can edit their own package
  it("7. Promoter can edit their own package (title, description, price, duration, deliverables, max orders, is_active)", async () => {
    const pkg = await createPackage({
      promoterId: PROMOTER_A_ID,
      communityId: VERIFIED_COMMUNITY_A.id,
      title: "Starter Package",
      description: "Initial description",
      price: 5000,
      durationHours: 24,
      deliverables: { status_posts: 1 },
      maxActiveOrders: 3,
      isActive: true,
    });

    const updated = await updatePackage({
      packageId: pkg.id,
      promoterId: PROMOTER_A_ID,
      title: "Pro Starter Package Plus",
      description: "Upgraded promotion bundle with group broadcast.",
      price: 18000,
      durationHours: 48,
      deliverables: { status_posts: 3, group_broadcasts: 2, pin_duration_hours: 24 },
      maxActiveOrders: 8,
      isActive: false,
    });

    expect(updated.title).toBe("Pro Starter Package Plus");
    expect(updated.price).toBe(18000);
    expect(updated.duration_hours).toBe(48);
    expect(updated.deliverables.status_posts).toBe(3);
    expect(updated.deliverables.group_broadcasts).toBe(2);
    expect(updated.deliverables.pin_duration_hours).toBe(24);
    expect(updated.max_active_orders).toBe(8);
    expect(updated.is_active).toBe(false);
  });

  // 8. Promoter cannot edit another promoter's package
  it("8. Promoter cannot edit another promoter's package", async () => {
    // Create package as Promoter B
    const pkgB = await createPackage({
      promoterId: PROMOTER_B_ID,
      communityId: VERIFIED_COMMUNITY_B.id,
      title: "Promoter B Package",
      description: "Package belonging to B.",
      price: 10000,
      durationHours: 24,
      deliverables: { status_posts: 2 },
    });

    // Promoter A tries to edit Promoter B's package
    await expect(
      updatePackage({
        packageId: pkgB.id,
        promoterId: PROMOTER_A_ID, // Different promoter
        title: "Hacked Package by A",
        price: 500,
      })
    ).rejects.toThrow(/Unauthorized|Cannot edit another promoter/i);
  });

  // 9. Promoter can deactivate their own package
  it("9. Promoter can deactivate and reactivate their own package", async () => {
    const pkg = await createPackage({
      promoterId: PROMOTER_A_ID,
      communityId: VERIFIED_COMMUNITY_A.id,
      title: "Active Package",
      description: "Can be paused.",
      price: 7500,
      durationHours: 24,
      deliverables: { status_posts: 1 },
      isActive: true,
    });

    const paused = await togglePackageActive(pkg.id, false, PROMOTER_A_ID);
    expect(paused.is_active).toBe(false);

    const resumed = await togglePackageActive(pkg.id, true, PROMOTER_A_ID);
    expect(resumed.is_active).toBe(true);
  });

  // 10. Promoter cannot delete another promoter's package
  it("10. Promoter can delete their own package but cannot delete another promoter's package", async () => {
    const pkgA = await createPackage({
      promoterId: PROMOTER_A_ID,
      communityId: VERIFIED_COMMUNITY_A.id,
      title: "To Be Deleted",
      description: "Temporary.",
      price: 5000,
      durationHours: 24,
      deliverables: { status_posts: 1 },
    });

    const deleted = await deletePackage(pkgA.id, PROMOTER_A_ID);
    expect(deleted).toBe(true);

    const storageKeyA = `${PACKAGE_STORAGE_KEY_PREFIX}${PROMOTER_A_ID}`;
    const remainingA: PromotionPackage[] = JSON.parse(
      localStorage.getItem(storageKeyA) || "[]"
    );
    expect(remainingA.find((p) => p.id === pkgA.id)).toBeUndefined();
  });

  // 11. Price below ₦500 is rejected
  it("11. Price below ₦500 is rejected", async () => {
    const check1 = validatePackageInput({ price: 400 });
    expect(check1.isValid).toBe(false);
    expect(check1.error).toContain("₦500");

    await expect(
      createPackage({
        promoterId: PROMOTER_A_ID,
        communityId: VERIFIED_COMMUNITY_A.id,
        title: "Too Cheap",
        description: "Price is 300 Naira.",
        price: 300,
        durationHours: 24,
        deliverables: {},
      })
    ).rejects.toThrow(/₦500/i);
  });

  // 12. Invalid duration is rejected
  it("12. Invalid duration (0, negative, non-integer) is rejected", async () => {
    const checkZero = validatePackageInput({ durationHours: 0 });
    expect(checkZero.isValid).toBe(false);

    const checkNegative = validatePackageInput({ durationHours: -12 });
    expect(checkNegative.isValid).toBe(false);

    const checkFloat = validatePackageInput({ durationHours: 2.5 });
    expect(checkFloat.isValid).toBe(false);

    await expect(
      createPackage({
        promoterId: PROMOTER_A_ID,
        communityId: VERIFIED_COMMUNITY_A.id,
        title: "Bad Duration",
        description: "Duration is 0 hours.",
        price: 5000,
        durationHours: 0,
        deliverables: {},
      })
    ).rejects.toThrow(/duration/i);
  });

  // 13. Invalid max_active_orders is rejected
  it("13. Invalid max_active_orders is rejected", async () => {
    const checkZero = validatePackageInput({ maxActiveOrders: 0 });
    expect(checkZero.isValid).toBe(false);

    const checkNegative = validatePackageInput({ maxActiveOrders: -5 });
    expect(checkNegative.isValid).toBe(false);

    await expect(
      createPackage({
        promoterId: PROMOTER_A_ID,
        communityId: VERIFIED_COMMUNITY_A.id,
        title: "Bad Orders Cap",
        description: "Cap is negative.",
        price: 5000,
        durationHours: 24,
        deliverables: {},
        maxActiveOrders: -1,
      })
    ).rejects.toThrow(/max active orders/i);
  });

  // 14. Admin can manage packages according to existing RBAC
  it("14. Admin can manage packages according to existing RBAC", async () => {
    const pkg = await createPackage({
      promoterId: PROMOTER_A_ID,
      communityId: VERIFIED_COMMUNITY_A.id,
      title: "Admin Managed Package",
      description: "Admin moderation.",
      price: 20000,
      durationHours: 72,
      deliverables: { status_posts: 5 },
      isAdmin: true,
    });

    const adminUpdated = await updatePackage({
      packageId: pkg.id,
      title: "Admin Managed Package (Moderated by Admin)",
      price: 22000,
      isAdmin: true,
    });

    expect(adminUpdated.title).toBe("Admin Managed Package (Moderated by Admin)");
    expect(adminUpdated.price).toBe(22000);
  });

  // 15. updated_at changes when a package is updated
  it("15. updated_at changes when a package is updated", async () => {
    const pkg = await createPackage({
      promoterId: PROMOTER_A_ID,
      communityId: VERIFIED_COMMUNITY_A.id,
      title: "Timestamp Test Package",
      description: "Testing updated_at mutation.",
      price: 5000,
      durationHours: 24,
      deliverables: { status_posts: 1 },
    });

    const originalUpdatedAt = pkg.updated_at;

    // Small timeout to guarantee different timestamp
    await new Promise((r) => setTimeout(r, 10));

    const updated = await updatePackage({
      packageId: pkg.id,
      promoterId: PROMOTER_A_ID,
      title: "Timestamp Test Package (Modified)",
    });

    expect(new Date(updated.updated_at).getTime()).toBeGreaterThanOrEqual(
      new Date(originalUpdatedAt).getTime()
    );
  });
});
