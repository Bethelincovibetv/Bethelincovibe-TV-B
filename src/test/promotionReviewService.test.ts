import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  submitOrderReview,
  getOrderReview,
  getPromoterReviews,
  getPromoterScorecard,
  getDisputedOrders,
  resolveOrderDispute,
  saveLocalReviews,
  saveLocalOrders,
  ReviewSubmissionInput,
  DisputeResolutionInput,
} from "../services/promotionReviewService";
import { PromotionOrder } from "../services/promotionOrderService";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    },
  };
});

describe("Step 10: Post-Order Reviews, Promoter Rating Engine & Admin Dispute Arbitration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Part A: Verified Post-Order Review Submission & Validation", () => {
    it("should reject review if order is not completed or approved", async () => {
      const mockOrder: PromotionOrder = {
        id: "ord-1",
        order_reference: "BTV-2026-001",
        business_user_id: "biz-123",
        promoter_id: "prom-456",
        package_id: "pkg-1",
        channel_id: "ch-1",
        amount: 15000,
        platform_fee: 1500,
        promoter_payout: 13500,
        status: "in_progress",
        currency: "NGN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      saveLocalOrders([mockOrder]);

      const input: ReviewSubmissionInput = {
        orderId: "ord-1",
        rating: 5,
        reviewText: "Great promotion campaign!",
      };

      const result = await submitOrderReview(input, "biz-123", "business");
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("completed");
    });

    it("should reject review if submitter is not the business owner of the order", async () => {
      const mockOrder: PromotionOrder = {
        id: "ord-1",
        order_reference: "BTV-2026-001",
        business_user_id: "biz-123",
        promoter_id: "prom-456",
        package_id: "pkg-1",
        channel_id: "ch-1",
        amount: 15000,
        platform_fee: 1500,
        promoter_payout: 13500,
        status: "completed",
        currency: "NGN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      saveLocalOrders([mockOrder]);

      const input: ReviewSubmissionInput = {
        orderId: "ord-1",
        rating: 5,
        reviewText: "Great promotion campaign!",
      };

      const result = await submitOrderReview(input, "intruder-999", "business");
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/permission|authorized|business/i);
    });

    it("should reject invalid rating values (< 1 or > 5)", async () => {
      const mockOrder: PromotionOrder = {
        id: "ord-1",
        order_reference: "BTV-2026-001",
        business_user_id: "biz-123",
        promoter_id: "prom-456",
        package_id: "pkg-1",
        channel_id: "ch-1",
        amount: 15000,
        platform_fee: 1500,
        promoter_payout: 13500,
        status: "completed",
        currency: "NGN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      saveLocalOrders([mockOrder]);

      const inputLow: ReviewSubmissionInput = {
        orderId: "ord-1",
        rating: 0,
      };
      const resultLow = await submitOrderReview(inputLow, "biz-123", "business");
      expect(resultLow.ok).toBe(false);
      expect(resultLow.error).toContain("1 and 5");

      const inputHigh: ReviewSubmissionInput = {
        orderId: "ord-1",
        rating: 6,
      };
      const resultHigh = await submitOrderReview(inputHigh, "biz-123", "business");
      expect(resultHigh.ok).toBe(false);
      expect(resultHigh.error).toContain("1 and 5");
    });

    it("should reject duplicate reviews on the same order", async () => {
      const mockOrder: PromotionOrder = {
        id: "ord-1",
        order_reference: "BTV-2026-001",
        business_user_id: "biz-123",
        promoter_id: "prom-456",
        package_id: "pkg-1",
        channel_id: "ch-1",
        amount: 15000,
        platform_fee: 1500,
        promoter_payout: 13500,
        status: "completed",
        currency: "NGN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      saveLocalOrders([mockOrder]);

      const input: ReviewSubmissionInput = {
        orderId: "ord-1",
        rating: 4,
        reviewText: "First verified review",
      };

      const firstRes = await submitOrderReview(input, "biz-123", "business");
      expect(firstRes.ok).toBe(true);

      const duplicateRes = await submitOrderReview(input, "biz-123", "business");
      expect(duplicateRes.ok).toBe(false);
      expect(duplicateRes.error).toContain("already reviewed");
    });

    it("should successfully submit verified review and update promoter rating metrics", async () => {
      const mockOrder: PromotionOrder = {
        id: "ord-1",
        order_reference: "BTV-2026-001",
        business_user_id: "biz-123",
        promoter_id: "prom-456",
        package_id: "pkg-1",
        channel_id: "ch-1",
        amount: 15000,
        platform_fee: 1500,
        promoter_payout: 13500,
        status: "completed",
        currency: "NGN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      saveLocalOrders([mockOrder]);

      const input: ReviewSubmissionInput = {
        order_id: "ord-1",
        rating: 5,
        review_text: "High quality delivery and fast turnaround!",
        communication_rating: 5,
        delivery_speed_rating: 5,
      };

      const result = await submitOrderReview(input, "biz-123", "business");
      expect(result.ok).toBe(true);
      expect(result.review).toBeDefined();
      expect(result.review?.rating).toBe(5);
      expect(result.review?.communication_rating).toBe(5);

      const storedReview = await getOrderReview("ord-1");
      expect(storedReview).toBeDefined();
      expect(storedReview?.rating).toBe(5);

      const promoterReviews = await getPromoterReviews("prom-456");
      expect(promoterReviews.length).toBe(1);
      expect(promoterReviews[0].review_text).toBe("High quality delivery and fast turnaround!");
    });
  });

  describe("Part B: Performance Scorecard Engine", () => {
    it("should calculate average rating, breakdown, completion rate and on-time rate correctly", async () => {
      const mockReviews = [
        { id: "r1", order_id: "o1", order_reference: "REF1", business_user_id: "b1", promoter_id: "prom-456", rating: 5, created_at: "2026-08-01", updated_at: "2026-08-01" },
        { id: "r2", order_id: "o2", order_reference: "REF2", business_user_id: "b2", promoter_id: "prom-456", rating: 5, created_at: "2026-08-02", updated_at: "2026-08-02" },
        { id: "r3", order_id: "o3", order_reference: "REF3", business_user_id: "b3", promoter_id: "prom-456", rating: 4, created_at: "2026-08-03", updated_at: "2026-08-03" },
        { id: "r4", order_id: "o4", order_reference: "REF4", business_user_id: "b4", promoter_id: "prom-456", rating: 2, created_at: "2026-08-04", updated_at: "2026-08-04" },
      ];
      saveLocalReviews(mockReviews);

      const mockOrders: any[] = [
        { id: "o1", order_reference: "REF1", promoter_id: "prom-456", business_user_id: "b1", status: "completed", sla_deadline: "2026-08-10T12:00:00Z", completed_at: "2026-08-09T12:00:00Z" },
        { id: "o2", order_reference: "REF2", promoter_id: "prom-456", business_user_id: "b2", status: "completed", sla_deadline: "2026-08-10T12:00:00Z", completed_at: "2026-08-11T12:00:00Z" }, // late
        { id: "o3", order_reference: "REF3", promoter_id: "prom-456", business_user_id: "b3", status: "completed", sla_deadline: null, completed_at: "2026-08-09T12:00:00Z" },
        { id: "o4", order_reference: "REF4", promoter_id: "prom-456", business_user_id: "b4", status: "disputed", sla_deadline: null },
      ];
      saveLocalOrders(mockOrders);

      const scorecard = await getPromoterScorecard("prom-456");
      expect(scorecard).toBeDefined();
      expect(scorecard.review_count).toBe(4);
      // (5 + 5 + 4 + 2) / 4 = 16 / 4 = 4.0
      expect(scorecard.average_rating).toBe(4);
      expect(scorecard.rating_breakdown[5]).toBe(2);
      expect(scorecard.rating_breakdown[4]).toBe(1);
      expect(scorecard.rating_breakdown[2]).toBe(1);
      expect(scorecard.completed_orders_count).toBe(3);
      expect(scorecard.disputed_orders_count).toBe(1);
      // Completion rate: 3 / 4 = 75%
      expect(scorecard.completion_rate).toBe(75);
    });

    it("should return default 5.0 rating and 100% completion rate for promoters with zero orders", async () => {
      const scorecard = await getPromoterScorecard("prom-fresh");
      expect(scorecard.average_rating).toBe(5);
      expect(scorecard.review_count).toBe(0);
      expect(scorecard.completion_rate).toBe(100);
      expect(scorecard.on_time_delivery_rate).toBe(100);
    });
  });

  describe("Part C: Admin Dispute Arbitration & Fund Settlement", () => {
    it("should reject dispute arbitration by non-admin users", async () => {
      const mockOrder: any = {
        id: "ord-disp-1",
        order_reference: "BTV-DISP-1",
        status: "disputed",
        amount: 25000,
        business_user_id: "b1",
        promoter_id: "p1",
      };
      saveLocalOrders([mockOrder]);

      const input: DisputeResolutionInput = {
        orderId: "ord-disp-1",
        resolution: "release_to_promoter",
        reason: "Promoter provided valid broadcast link and views.",
      };

      const result = await resolveOrderDispute(input, "user-regular", "business");
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("administrators");
    });

    it("should reject dispute arbitration if order is not in disputed status", async () => {
      const mockOrder: any = {
        id: "ord-1",
        order_reference: "BTV-NORM-1",
        status: "in_progress",
        amount: 25000,
        business_user_id: "b1",
        promoter_id: "p1",
      };
      saveLocalOrders([mockOrder]);

      const input: DisputeResolutionInput = {
        orderId: "ord-1",
        resolution: "refund_business",
        reason: "Invalid arbitration request.",
      };

      const result = await resolveOrderDispute(input, "admin-1", "admin");
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("disputed status");
    });

    it("should successfully arbitrate dispute with release_to_promoter", async () => {
      const mockOrder: any = {
        id: "ord-disp-1",
        order_reference: "BTV-DISP-1",
        status: "disputed",
        amount: 50000,
        platform_fee: 5000,
        promoter_payout: 45000,
        promoter_id: "prom-1",
        business_user_id: "biz-1",
      };
      saveLocalOrders([mockOrder]);

      const input: DisputeResolutionInput = {
        order_id: "ord-disp-1",
        resolution: "release_to_promoter",
        reason: "Promoter provided verified screenshot with full view count requirements.",
      };

      const result = await resolveOrderDispute(input, "admin-1", "admin");
      expect(result.ok).toBe(true);
      expect(result.resolution).toBe("release_to_promoter");
      expect(result.order).toBeDefined();
      expect(result.order?.status).toBe("completed");
    });

    it("should successfully arbitrate dispute with refund_business", async () => {
      const mockOrder: any = {
        id: "ord-disp-2",
        order_reference: "BTV-DISP-2",
        status: "disputed",
        amount: 30000,
        platform_fee: 3000,
        promoter_payout: 27000,
        promoter_id: "prom-2",
        business_user_id: "biz-2",
      };
      saveLocalOrders([mockOrder]);

      const input: DisputeResolutionInput = {
        order_id: "ord-disp-2",
        resolution: "refund_business",
        reason: "Promoter failed to broadcast post within the agreed campaign window.",
      };

      const result = await resolveOrderDispute(input, "admin-1", "admin");
      expect(result.ok).toBe(true);
      expect(result.resolution).toBe("refund_business");
      expect(result.refundAmount).toBe(30000);
      expect(result.refundReference).toBeDefined();
      expect(result.order?.status).toBe("cancelled");
    });

    it("should query disputed orders for admin arbitration", async () => {
      const mockOrders: any[] = [
        {
          id: "d1",
          order_reference: "DISP-1",
          status: "disputed",
          dispute_reason: "Promoter did not reach view threshold",
          amount: 20000,
          updated_at: new Date().toISOString(),
        },
        {
          id: "d2",
          order_reference: "NORM-2",
          status: "in_progress",
          amount: 10000,
          updated_at: new Date().toISOString(),
        },
      ];
      saveLocalOrders(mockOrders);

      const disputes = await getDisputedOrders("admin-1", "admin");
      expect(disputes.length).toBe(1);
      expect(disputes[0].dispute_reason).toContain("threshold");
    });
  });
});
