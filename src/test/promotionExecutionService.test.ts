import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  acceptPromotionOrder,
  declinePromotionOrder,
  submitDeliveryProof,
  reviewDeliveryProof,
  checkAndProcessAutoApproval,
  checkSLAStatus,
  validateDeliveryProofInput,
  isValidHttpUrl,
  REVIEW_WINDOW_HOURS,
  DeliveryProofSubmission,
  OrderAuditEvent,
} from "@/services/promotionExecutionService";
import {
  createPromotionOrder,
  PromotionOrder,
  getPromotionOrderById,
} from "@/services/promotionOrderService";
import { verifyPromotionOrderPayment } from "@/services/promotionPaymentService";

// Mock profiles for testing
vi.mock("@/services/promoterService", () => ({
  getPromoterProfileByUserId: vi.fn(async (userId: string) => {
    if (userId === "promoter_user_1") {
      return {
        id: "promoter_prof_1",
        user_id: "promoter_user_1",
        display_name: "Promoter One",
      };
    }
    if (userId === "promoter_user_2") {
      return {
        id: "promoter_prof_2",
        user_id: "promoter_user_2",
        display_name: "Promoter Two (Intruder)",
      };
    }
    return null;
  }),
  getPromoterProfileById: vi.fn(async (id: string) => ({
    id,
    user_id: `user_for_${id}`,
    display_name: `Promoter ${id}`,
  })),
}));

vi.mock("@/services/packageService", () => ({
  getPackageById: vi.fn(async (pkgId: string) => ({
    id: pkgId,
    promoter_id: "promoter_prof_1",
    community_id: "comm_1",
    title: "Standard Broadcast Package",
    price: 15000,
    duration_hours: 24,
    deliverables: ["1x Status Post", "24h Active Duration"],
    is_active: true,
  })),
  formatNaira: vi.fn((amount: number) => `₦${amount.toLocaleString()}`),
}));

vi.mock("@/services/communityService", () => ({
  getCommunityById: vi.fn(async (commId: string) => ({
    id: commId,
    name: "Tech Founders Community",
    member_count: 5000,
    active_daily_views: 3200,
    verification_status: "verified",
    is_published: true,
  })),
}));

describe("Step 8 — Order Execution & Delivery Proof Workflow", () => {
  const BUSINESS_USER_ID = "biz_user_123";
  const OTHER_BIZ_USER_ID = "biz_intruder_999";
  const PROMOTER_USER_ID = "promoter_user_1";
  const OTHER_PROMOTER_USER_ID = "promoter_user_2";
  const PACKAGE_ID = "pkg_standard_24h";

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  async function createAndFundTestOrder(): Promise<PromotionOrder> {
    const { order } = await createPromotionOrder(
      {
        packageId: PACKAGE_ID,
        promotionBrief: "Promote our flagship developer summit across tech community",
      },
      BUSINESS_USER_ID
    );

    if (!order) throw new Error("Order creation failed in test helper");

    // Pay and fund escrow
    const verifyRes = await verifyPromotionOrderPayment(
      order.id,
      "test_pay_ref_step8",
      BUSINESS_USER_ID,
      {
        status: "success",
        amount: 15000,
        currency: "NGN",
      }
    );

    if (!verifyRes.ok || !verifyRes.order) {
      throw new Error("Payment funding failed in test helper");
    }

    return verifyRes.order;
  }

  describe("1. Order Acceptance & Decline Workflow", () => {
    it("allows the assigned promoter to accept a paid_escrow order and starts SLA timer", async () => {
      const order = await createAndFundTestOrder();
      expect(order.status).toBe("paid_escrow");

      const acceptRes = await acceptPromotionOrder(order.id, PROMOTER_USER_ID);
      expect(acceptRes.error).toBeNull();
      expect(acceptRes.order).not.toBeNull();
      expect(acceptRes.order?.status).toBe("in_progress");
      expect((acceptRes.order as any).promoter_accepted_at).toBeDefined();
      expect((acceptRes.order as any).sla_deadline).toBeDefined();

      // Check SLA status
      const sla = checkSLAStatus(acceptRes.order!);
      expect(sla.isExpired).toBe(false);
      expect(sla.hoursRemaining).toBeGreaterThanOrEqual(23);

      // Check audit trail
      const auditTrail: OrderAuditEvent[] = (acceptRes.order as any).audit_trail;
      expect(auditTrail).toBeDefined();
      expect(auditTrail.some((e) => e.event_type === "promoter_accepted")).toBe(true);
      expect(auditTrail.some((e) => e.event_type === "sla_started")).toBe(true);
    });

    it("rejects acceptance by unauthorized promoter (not assigned to the order)", async () => {
      const order = await createAndFundTestOrder();

      const acceptRes = await acceptPromotionOrder(order.id, OTHER_PROMOTER_USER_ID);
      expect(acceptRes.order).toBeNull();
      expect(acceptRes.error).toMatch(/Unauthorized|Forbidden/);
    });

    it("rejects acceptance if order is still in unpaid pending_payment status", async () => {
      const { order: unpaidOrder } = await createPromotionOrder(
        {
          packageId: PACKAGE_ID,
          promotionBrief: "Unpaid promotion brief for testing",
        },
        BUSINESS_USER_ID
      );

      const acceptRes = await acceptPromotionOrder(unpaidOrder!.id, PROMOTER_USER_ID);
      expect(acceptRes.order).toBeNull();
      expect(acceptRes.error).toContain("paid in escrow first");
    });

    it("allows assigned promoter to decline an order with a valid reason", async () => {
      const order = await createAndFundTestOrder();

      const declineRes = await declinePromotionOrder(
        order.id,
        "Cannot broadcast due to scheduling conflict this weekend.",
        PROMOTER_USER_ID
      );

      expect(declineRes.error).toBeNull();
      expect(declineRes.order?.status).toBe("cancelled");
      expect((declineRes.order as any).decline_reason).toContain("scheduling conflict");

      const auditTrail: OrderAuditEvent[] = (declineRes.order as any).audit_trail;
      expect(auditTrail.some((e) => e.event_type === "promoter_declined")).toBe(true);
    });

    it("rejects order decline if decline reason is too short", async () => {
      const order = await createAndFundTestOrder();

      const declineRes = await declinePromotionOrder(order.id, "no", PROMOTER_USER_ID);
      expect(declineRes.order).toBeNull();
      expect(declineRes.error).toContain("at least 5 characters");
    });
  });

  describe("2. Deliverable Proof Submission & Anti-Fraud Validation", () => {
    it("allows assigned promoter to submit valid delivery proof and sets 48-hour review deadline", async () => {
      const order = await createAndFundTestOrder();
      await acceptPromotionOrder(order.id, PROMOTER_USER_ID);

      const proofInput = {
        screenshotUrls: [
          "https://storage.bethelincovibe.com/proofs/status_shot_1.png",
          "https://storage.bethelincovibe.com/proofs/views_shot_2.jpg",
        ],
        postUrl: "https://chat.whatsapp.com/sample_broadcast_link",
        viewsCount: 2450,
        notes: "Broadcast successfully pinned to community for 24 hours.",
      };

      const proofRes = await submitDeliveryProof(order.id, proofInput, PROMOTER_USER_ID);
      expect(proofRes.error).toBeNull();
      expect(proofRes.order?.status).toBe("evidence_submitted");
      expect(proofRes.proof).not.toBeNull();
      expect(proofRes.proof?.version).toBe(1);
      expect(proofRes.proof?.screenshot_urls.length).toBe(2);
      expect(proofRes.proof?.views_count).toBe(2450);

      expect((proofRes.order as any).review_deadline).toBeDefined();

      const auditTrail: OrderAuditEvent[] = (proofRes.order as any).audit_trail;
      expect(auditTrail.some((e) => e.event_type === "proof_submitted")).toBe(true);
    });

    it("rejects proof submission with empty or missing screenshot evidence", async () => {
      const order = await createAndFundTestOrder();
      await acceptPromotionOrder(order.id, PROMOTER_USER_ID);

      const proofRes = await submitDeliveryProof(
        order.id,
        {
          screenshotUrls: [],
          notes: "I posted it but forgot screenshots",
        },
        PROMOTER_USER_ID
      );

      expect(proofRes.order).toBeNull();
      expect(proofRes.error).toContain("At least one screenshot");
    });

    it("rejects unsupported file formats in proof submissions", () => {
      const validation = validateDeliveryProofInput({
        screenshotUrls: ["https://example.com/malicious_payload.exe"],
      });
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("not supported");
    });

    it("rejects oversized files exceeding 10MB in file metadata", () => {
      const validation = validateDeliveryProofInput({
        screenshotUrls: ["https://example.com/huge_proof.png"],
        fileMetadata: [
          {
            name: "huge_video.mp4",
            size: 15 * 1024 * 1024, // 15MB
            mime_type: "video/mp4",
            url: "https://example.com/huge.mp4",
          },
        ],
      });
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("exceeds the maximum allowed size of 10MB");
    });

    it("rejects malformed URLs in published post URL", () => {
      const validation = validateDeliveryProofInput({
        screenshotUrls: ["https://example.com/proof.png"],
        postUrl: "invalid-url-without-protocol",
      });
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("valid HTTP or HTTPS");
    });

    it("rejects proof submission by unauthorized user/promoter", async () => {
      const order = await createAndFundTestOrder();
      await acceptPromotionOrder(order.id, PROMOTER_USER_ID);

      const proofRes = await submitDeliveryProof(
        order.id,
        {
          screenshotUrls: ["https://example.com/proof.png"],
        },
        OTHER_PROMOTER_USER_ID
      );

      expect(proofRes.order).toBeNull();
      expect(proofRes.error).toMatch(/Unauthorized|Forbidden/);
    });
  });

  describe("3. Business Review, Revision & Dispute Workflow", () => {
    async function prepareSubmittedProofOrder(): Promise<PromotionOrder> {
      const order = await createAndFundTestOrder();
      await acceptPromotionOrder(order.id, PROMOTER_USER_ID);
      const { order: submittedOrder } = await submitDeliveryProof(
        order.id,
        {
          screenshotUrls: ["https://example.com/proof_v1.png"],
          viewsCount: 1800,
          notes: "Broadcast live",
        },
        PROMOTER_USER_ID
      );
      return submittedOrder!;
    }

    it("allows ordering business to approve deliverables, transitioning to 'approved'", async () => {
      const order = await prepareSubmittedProofOrder();
      expect(order.status).toBe("evidence_submitted");

      const reviewRes = await reviewDeliveryProof(order.id, "approve", {}, BUSINESS_USER_ID);
      expect(reviewRes.error).toBeNull();
      expect(reviewRes.order?.status).toBe("approved");
      expect(reviewRes.order?.approved_at).toBeDefined();

      const auditTrail: OrderAuditEvent[] = (reviewRes.order as any).audit_trail;
      expect(auditTrail.some((e) => e.event_type === "business_approved")).toBe(true);
    });

    it("allows ordering business to request revision with reason, transitioning to 'revision_requested'", async () => {
      const order = await prepareSubmittedProofOrder();

      const reviewRes = await reviewDeliveryProof(
        order.id,
        "request_revision",
        { reason: "Please show the full timestamp on the WhatsApp viewer count." },
        BUSINESS_USER_ID
      );

      expect(reviewRes.error).toBeNull();
      expect(reviewRes.order?.status).toBe("revision_requested");
      expect((reviewRes.order as any).revision_reason).toContain("full timestamp");

      const auditTrail: OrderAuditEvent[] = (reviewRes.order as any).audit_trail;
      expect(auditTrail.some((e) => e.event_type === "revision_requested")).toBe(true);
    });

    it("supports multi-version proof submissions (Proof V2) after revision request", async () => {
      const order = await prepareSubmittedProofOrder();
      await reviewDeliveryProof(
        order.id,
        "request_revision",
        { reason: "Need higher resolution view counter screenshot." },
        BUSINESS_USER_ID
      );

      // Promoter resubmits Proof V2
      const resubmitRes = await submitDeliveryProof(
        order.id,
        {
          screenshotUrls: ["https://example.com/proof_v2_highres.png"],
          viewsCount: 2100,
          notes: "Updated screenshot with full timestamp included.",
        },
        PROMOTER_USER_ID
      );

      expect(resubmitRes.error).toBeNull();
      expect(resubmitRes.order?.status).toBe("evidence_submitted");
      expect(resubmitRes.proof?.version).toBe(2);

      const proofs: DeliveryProofSubmission[] = (resubmitRes.order as any).delivery_proofs;
      expect(proofs.length).toBe(2);
      expect(proofs[0].version).toBe(1);
      expect(proofs[1].version).toBe(2);

      const auditTrail: OrderAuditEvent[] = (resubmitRes.order as any).audit_trail;
      expect(auditTrail.some((e) => e.event_type === "proof_resubmitted")).toBe(true);
    });

    it("allows ordering business to raise a dispute with a detailed reason", async () => {
      const order = await prepareSubmittedProofOrder();

      const disputeRes = await reviewDeliveryProof(
        order.id,
        "dispute",
        { reason: "Promoter posted wrong promotional asset and deleted it after 1 hour." },
        BUSINESS_USER_ID
      );

      expect(disputeRes.error).toBeNull();
      expect(disputeRes.order?.status).toBe("disputed");
      expect((disputeRes.order as any).dispute_reason).toContain("wrong promotional asset");

      const auditTrail: OrderAuditEvent[] = (disputeRes.order as any).audit_trail;
      expect(auditTrail.some((e) => e.event_type === "business_disputed")).toBe(true);
    });

    it("rejects dispute with insufficient explanation (less than 10 characters)", async () => {
      const order = await prepareSubmittedProofOrder();

      const disputeRes = await reviewDeliveryProof(
        order.id,
        "dispute",
        { reason: "Bad post" },
        BUSINESS_USER_ID
      );

      expect(disputeRes.order).toBeNull();
      expect(disputeRes.error).toContain("at least 10 characters");
    });

    it("rejects review attempts by unauthorized user / other business", async () => {
      const order = await prepareSubmittedProofOrder();

      const reviewRes = await reviewDeliveryProof(
        order.id,
        "approve",
        {},
        OTHER_BIZ_USER_ID
      );

      expect(reviewRes.order).toBeNull();
      expect(reviewRes.error).toMatch(/Unauthorized|Forbidden/);
    });
  });

  describe("4. 48-Hour Review Window & Auto-Approval Timer", () => {
    it("does not auto-approve before 48 hours have elapsed", async () => {
      const order = await createAndFundTestOrder();
      await acceptPromotionOrder(order.id, PROMOTER_USER_ID);
      const { order: submittedOrder } = await submitDeliveryProof(
        order.id,
        {
          screenshotUrls: ["https://example.com/proof_v1.png"],
        },
        PROMOTER_USER_ID
      );

      // Check auto-approval right after submission (0 hours elapsed)
      const autoRes = await checkAndProcessAutoApproval(submittedOrder!.id);
      expect(autoRes.autoApproved).toBe(false);
      expect(autoRes.hoursRemaining).toBeGreaterThanOrEqual(47);
      expect(autoRes.order?.status).toBe("evidence_submitted");
    });

    it("auto-approves when 48-hour review deadline has expired without business action", async () => {
      const order = await createAndFundTestOrder();
      await acceptPromotionOrder(order.id, PROMOTER_USER_ID);
      const { order: submittedOrder } = await submitDeliveryProof(
        order.id,
        {
          screenshotUrls: ["https://example.com/proof_v1.png"],
        },
        PROMOTER_USER_ID
      );

      // Simulate server time 49 hours later
      const simulatedFutureTime = Date.now() + 49 * 3600 * 1000;
      const autoRes = await checkAndProcessAutoApproval(
        submittedOrder!.id,
        simulatedFutureTime
      );

      expect(autoRes.autoApproved).toBe(true);
      expect(autoRes.order?.status).toBe("approved");
      expect((autoRes.order as any).auto_approved).toBe(true);

      const auditTrail: OrderAuditEvent[] = (autoRes.order as any).audit_trail;
      expect(auditTrail.some((e) => e.event_type === "auto_approved")).toBe(true);
    });
  });

  describe("5. Invariants & Security Boundaries", () => {
    it("cannot submit proof for an already approved or disputed order", async () => {
      const order = await createAndFundTestOrder();
      await acceptPromotionOrder(order.id, PROMOTER_USER_ID);
      await submitDeliveryProof(
        order.id,
        { screenshotUrls: ["https://example.com/proof_v1.png"] },
        PROMOTER_USER_ID
      );
      await reviewDeliveryProof(order.id, "approve", {}, BUSINESS_USER_ID);

      // Attempt second proof after approval
      const proofRes = await submitDeliveryProof(
        order.id,
        { screenshotUrls: ["https://example.com/proof_v2.png"] },
        PROMOTER_USER_ID
      );

      expect(proofRes.order).toBeNull();
      expect(proofRes.error).toContain("Cannot submit proof when order is in 'approved' status");
    });

    it("verifies HTTP URL checker handles edge cases properly", () => {
      expect(isValidHttpUrl("https://chat.whatsapp.com/test")).toBe(true);
      expect(isValidHttpUrl("http://example.com")).toBe(true);
      expect(isValidHttpUrl("ftp://example.com")).toBe(false);
      expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
      expect(isValidHttpUrl("")).toBe(false);
      expect(isValidHttpUrl(undefined)).toBe(false);
    });
  });
});
