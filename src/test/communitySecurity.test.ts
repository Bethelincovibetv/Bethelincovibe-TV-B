import { describe, it, expect, beforeEach } from "vitest";
import {
  canEditCommunity,
  updateCommunity,
  WhatsAppCommunity,
} from "../services/communityService";

describe("Step 3 Security Tests — Verified Community Protection Suite", () => {
  const PROMOTER_A_ID = "promoter_11111111-1111-1111-1111-111111111111";
  const PROMOTER_B_ID = "promoter_22222222-2222-2222-2222-222222222222";

  beforeEach(() => {
    localStorage.clear();
  });

  describe("1. Permission Check Helper (canEditCommunity)", () => {
    it("should allow a promoter to edit a 'submitted' community", () => {
      const submittedComm: Partial<WhatsAppCommunity> = {
        verification_status: "submitted",
        is_published: false,
      };
      const result = canEditCommunity(submittedComm as WhatsAppCommunity, false);
      expect(result.allowed).toBe(true);
    });

    it("should allow a promoter to edit an 'under_review' community", () => {
      const underReviewComm: Partial<WhatsAppCommunity> = {
        verification_status: "under_review",
        is_published: false,
      };
      const result = canEditCommunity(underReviewComm as WhatsAppCommunity, false);
      expect(result.allowed).toBe(true);
    });

    it("should allow a promoter to edit a 'rejected' community", () => {
      const rejectedComm: Partial<WhatsAppCommunity> = {
        verification_status: "rejected",
        is_published: false,
      };
      const result = canEditCommunity(rejectedComm as WhatsAppCommunity, false);
      expect(result.allowed).toBe(true);
    });

    it("should STRICTLY FORBID a promoter from editing a 'verified' & 'is_published=true' community", () => {
      const verifiedComm: Partial<WhatsAppCommunity> = {
        verification_status: "verified",
        is_published: true,
      };
      const result = canEditCommunity(verifiedComm as WhatsAppCommunity, false);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("cannot be edited directly");
    });

    it("should forbid a promoter from editing a 'suspended' community", () => {
      const suspendedComm: Partial<WhatsAppCommunity> = {
        verification_status: "suspended",
        is_published: false,
      };
      const result = canEditCommunity(suspendedComm as WhatsAppCommunity, false);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("suspended");
    });

    it("should ALWAYS ALLOW platform administrators (isAdmin=true) to manage verified communities", () => {
      const verifiedComm: Partial<WhatsAppCommunity> = {
        verification_status: "verified",
        is_published: true,
      };
      const result = canEditCommunity(verifiedComm as WhatsAppCommunity, true);
      expect(result.allowed).toBe(true);
    });
  });

  describe("2. updateCommunity Service Enforcement", () => {
    it("should successfully update a promoter's own 'submitted' community", async () => {
      const commId = "comm_submitted_1";
      const initialCommunity: WhatsAppCommunity = {
        id: commId,
        promoter_id: PROMOTER_A_ID,
        name: "Old Tech Hub",
        category_id: "cat-tech",
        community_type: "group",
        member_count: 500,
        active_daily_views: 100,
        country_primary: "Nigeria",
        demographics_summary: "Tech students",
        proof_screenshot_url: "https://example.com/proof1.png",
        verification_status: "submitted",
        is_published: false,
        rejection_reason: null,
        verified_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      localStorage.setItem(
        `bincovibe_whatsapp_communities_${PROMOTER_A_ID}`,
        JSON.stringify([initialCommunity])
      );

      const updated = await updateCommunity({
        communityId: commId,
        name: "New Tech Founders Hub",
        communityType: "group",
        memberCount: 850,
        activeDailyViews: 250,
        countryPrimary: "Nigeria",
        isAdmin: false,
      });

      expect(updated.name).toBe("New Tech Founders Hub");
      expect(updated.member_count).toBe(850);
      expect(updated.verification_status).toBe("submitted");
      expect(updated.is_published).toBe(false);
    });

    it("should successfully update an 'under_review' community while keeping it unverified & unpublished", async () => {
      const commId = "comm_review_1";
      const initialCommunity: WhatsAppCommunity = {
        id: commId,
        promoter_id: PROMOTER_A_ID,
        name: "Pending Review Group",
        category_id: "cat-tech",
        community_type: "channel",
        member_count: 3000,
        active_daily_views: 800,
        country_primary: "Nigeria",
        demographics_summary: "Investors",
        proof_screenshot_url: "https://example.com/proof2.png",
        verification_status: "under_review",
        is_published: false,
        rejection_reason: null,
        verified_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      localStorage.setItem(
        `bincovibe_whatsapp_communities_${PROMOTER_A_ID}`,
        JSON.stringify([initialCommunity])
      );

      const updated = await updateCommunity({
        communityId: commId,
        name: "Corrected Review Channel",
        communityType: "channel",
        memberCount: 3500,
        activeDailyViews: 1000,
        isAdmin: false,
      });

      expect(updated.name).toBe("Corrected Review Channel");
      expect(updated.verification_status).toBe("under_review");
      expect(updated.is_published).toBe(false);
    });

    it("should allow editing a 'rejected' community and PRESERVE rejected status and is_published=false", async () => {
      const commId = "comm_rejected_1";
      const initialCommunity: WhatsAppCommunity = {
        id: commId,
        promoter_id: PROMOTER_A_ID,
        name: "Rejected Group",
        category_id: "cat-fashion",
        community_type: "status_audience",
        member_count: 1000,
        active_daily_views: 200,
        country_primary: "Nigeria",
        demographics_summary: "Shoppers",
        proof_screenshot_url: "https://example.com/bad_proof.png",
        verification_status: "rejected",
        is_published: false,
        rejection_reason: "Screenshot did not show member statistics view clearly.",
        verified_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      localStorage.setItem(
        `bincovibe_whatsapp_communities_${PROMOTER_A_ID}`,
        JSON.stringify([initialCommunity])
      );

      const updated = await updateCommunity({
        communityId: commId,
        name: "Updated Fashion Audience",
        communityType: "status_audience",
        memberCount: 1500,
        activeDailyViews: 400,
        proofScreenshotUrl: "https://example.com/clear_new_proof.png",
        isAdmin: false,
      });

      expect(updated.name).toBe("Updated Fashion Audience");
      expect(updated.proof_screenshot_url).toBe("https://example.com/clear_new_proof.png");
      // MUST REMAIN REJECTED AND UNPUBLISHED
      expect(updated.verification_status).toBe("rejected");
      expect(updated.is_published).toBe(false);
      expect(updated.verified_at).toBeNull();
    });

    it("should BLOCK a promoter from editing a 'verified' and published community", async () => {
      const commId = "comm_verified_1";
      const verifiedCommunity: WhatsAppCommunity = {
        id: commId,
        promoter_id: PROMOTER_A_ID,
        name: "Elite Verified Channel",
        category_id: "cat-business",
        community_type: "channel",
        member_count: 50000,
        active_daily_views: 20000,
        country_primary: "Nigeria",
        demographics_summary: "B2B Executives",
        proof_screenshot_url: "https://example.com/verified_proof.png",
        verification_status: "verified",
        is_published: true,
        rejection_reason: null,
        verified_at: "2026-08-30T10:00:00Z",
        created_at: "2026-08-25T10:00:00Z",
        updated_at: "2026-08-30T10:00:00Z",
      };

      localStorage.setItem(
        `bincovibe_whatsapp_communities_${PROMOTER_A_ID}`,
        JSON.stringify([verifiedCommunity])
      );

      // Attempting to edit verified community as non-admin promoter must fail
      await expect(
        updateCommunity({
          communityId: commId,
          name: "Hacked or Altered Name",
          communityType: "channel",
          memberCount: 999999,
          activeDailyViews: 50000,
          isAdmin: false,
        })
      ).rejects.toThrow(/cannot be edited directly|Forbidden/i);
    });

    it("should permit platform administrator (isAdmin=true) to modify a verified community", async () => {
      const commId = "comm_verified_admin_test";
      const verifiedCommunity: WhatsAppCommunity = {
        id: commId,
        promoter_id: PROMOTER_A_ID,
        name: "Official Verified Channel",
        category_id: "cat-tech",
        community_type: "channel",
        member_count: 25000,
        active_daily_views: 12000,
        country_primary: "Nigeria",
        demographics_summary: "Developers",
        proof_screenshot_url: "https://example.com/proof.png",
        verification_status: "verified",
        is_published: true,
        rejection_reason: null,
        verified_at: "2026-08-30T10:00:00Z",
        created_at: "2026-08-20T10:00:00Z",
        updated_at: "2026-08-30T10:00:00Z",
      };

      localStorage.setItem(
        `bincovibe_whatsapp_communities_${PROMOTER_A_ID}`,
        JSON.stringify([verifiedCommunity])
      );

      const adminUpdated = await updateCommunity({
        communityId: commId,
        name: "Official Verified Channel (Admin Cleaned)",
        communityType: "channel",
        memberCount: 25000,
        activeDailyViews: 12000,
        isAdmin: true,
      });

      expect(adminUpdated.name).toBe("Official Verified Channel (Admin Cleaned)");
    });
  });

  describe("3. Multi-tenant & Security Boundary Simulation", () => {
    it("should isolate communities between different promoters", () => {
      const commA: WhatsAppCommunity = {
        id: "comm_A_1",
        promoter_id: PROMOTER_A_ID,
        name: "Promoter A Audience",
        category_id: null,
        community_type: "group",
        member_count: 500,
        active_daily_views: 150,
        country_primary: "Nigeria",
        demographics_summary: null,
        proof_screenshot_url: "https://example.com/a.png",
        verification_status: "submitted",
        is_published: false,
        rejection_reason: null,
        verified_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      localStorage.setItem(
        `bincovibe_whatsapp_communities_${PROMOTER_A_ID}`,
        JSON.stringify([commA])
      );

      // Promoter B's storage is empty
      const rawB = localStorage.getItem(`bincovibe_whatsapp_communities_${PROMOTER_B_ID}`);
      expect(rawB).toBeNull();
    });
  });
});
