import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  dispatchPromotionNotification,
  notifyOrderCreated,
  notifyPaymentVerified,
  notifyProofSubmitted,
  notifyRevisionRequested,
  notifySettlementCompleted,
  notifyDisputeOpened,
  notifyDisputeResolved,
  notifyReviewSubmitted,
  notifyPayoutStatusChanged,
  getNotificationsForUser,
  markNotificationAsRead,
  markAllUserNotificationsAsRead,
  deleteUserNotification,
  PromotionNotification,
  saveLocalStoredNotifications,
  getLocalStoredNotifications,
} from "../services/promotionNotificationService";
import {
  getPlatformTreasurySummary,
  getAllPayoutRequests,
  adminProcessPayout,
  PayoutRequest,
  PromoterWallet,
  PromotionSettlement,
} from "../services/promotionSettlementService";
import { PromotionOrder } from "../services/promotionOrderService";

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

describe("Step 11: Promotion Notification Dispatcher & Admin Promotion Treasury", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Part A: Non-Blocking Notification Dispatcher", () => {
    it("should safely dispatch notification without throwing when Supabase returns null query", async () => {
      const res = await dispatchPromotionNotification({
        userId: "user-123",
        title: "Test Title",
        body: "Test Body content",
        type: "order",
        eventType: "order_created",
      });

      expect(res.success).toBe(true);
      expect(res.notification).toBeDefined();
      expect(res.notification?.user_id).toBe("user-123");
      expect(res.notification?.title).toBe("Test Title");
      expect(res.notification?.is_read).toBe(false);

      const stored = getLocalStoredNotifications();
      expect(stored.length).toBe(1);
      expect(stored[0].title).toBe("Test Title");
    });

    it("should fail gracefully with error result when userId or eventType is missing", async () => {
      const res = await dispatchPromotionNotification({
        userId: "",
        title: "",
        body: "Empty body",
      });

      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    it("should dispatch notifyOrderCreated and record correct routing URL", async () => {
      const res = await notifyOrderCreated({
        id: "ord-99",
        order_reference: "BTV-ORD-99",
        promoter_user_id: "promoter-user-1",
        business_user_id: "biz-user-1",
        package_title: "VIP 24h WhatsApp Broadcast",
        amount: 25000,
      });

      expect(res.success).toBe(true);
      expect(res.notification?.user_id).toBe("promoter-user-1");
      expect(res.notification?.url).toContain("ord-99");
      expect(res.notification?.body).toContain("BTV-ORD-99");
    });

    it("should dispatch notifyPaymentVerified when escrow payment is confirmed", async () => {
      const res = await notifyPaymentVerified({
        id: "ord-100",
        order_reference: "BTV-ORD-100",
        promoter_user_id: "promoter-user-1",
        amount: 50000,
        package_title: "Top Channel Broadcast",
      });

      expect(res.success).toBe(true);
      expect(res.notification?.event_type).toBe("payment_verified");
      expect(res.notification?.body).toContain("50,000");
    });

    it("should dispatch notifyProofSubmitted to business user", async () => {
      const res = await notifyProofSubmitted({
        id: "ord-101",
        order_reference: "BTV-ORD-101",
        business_user_id: "biz-user-2",
        package_title: "Weekend Promo",
      });

      expect(res.success).toBe(true);
      expect(res.notification?.user_id).toBe("biz-user-2");
      expect(res.notification?.event_type).toBe("proof_submitted");
    });

    it("should dispatch notifyDisputeOpened to promoter", async () => {
      const res = await notifyDisputeOpened({
        id: "ord-102",
        order_reference: "BTV-ORD-102",
        promoter_user_id: "prom-user-1",
        business_user_id: "biz-user-1",
        reason: "Screenshots were blurry and invalid.",
        opened_by: "business",
      });

      expect(res.success).toBe(true);
      expect(res.notification?.user_id).toBe("prom-user-1");
      expect(res.notification?.title).toContain("Dispute");
    });

    it("should dispatch notifyDisputeResolved to both parties", async () => {
      const res = await notifyDisputeResolved({
        id: "ord-103",
        order_reference: "BTV-ORD-103",
        promoter_user_id: "prom-user-1",
        business_user_id: "biz-user-1",
        resolution: "released_to_promoter",
        adminNotes: "Proof of broadcast verified valid by Admin.",
      });

      expect(res.success).toBe(true);
      const all = getLocalStoredNotifications();
      expect(all.length).toBe(2); // One for promoter, one for business
    });

    it("should dispatch notifyReviewSubmitted to promoter", async () => {
      const res = await notifyReviewSubmitted({
        id: "ord-104",
        order_reference: "BTV-ORD-104",
        promoter_user_id: "prom-user-1",
        rating: 5,
        reviewerName: "Lagos Enterprise Hub",
      });

      expect(res.success).toBe(true);
      expect(res.notification?.body).toContain("5");
    });

    it("should dispatch notifyPayoutStatusChanged for paid and failed status", async () => {
      const paidRes = await notifyPayoutStatusChanged({
        id: "pay-1",
        payout_reference: "PAY-2026-001",
        user_id: "prom-user-1",
        amount: 30000,
        status: "paid",
      });
      expect(paidRes.success).toBe(true);
      expect(paidRes.notification?.title).toContain("Disbursed");

      const failedRes = await notifyPayoutStatusChanged({
        id: "pay-2",
        payout_reference: "PAY-2026-002",
        user_id: "prom-user-1",
        amount: 15000,
        status: "failed",
        failure_reason: "Account number not found at destination bank.",
      });
      expect(failedRes.success).toBe(true);
      expect(failedRes.notification?.body).toContain("could not be completed");
    });
  });

  describe("Part B: Notification Read State Management & Isolation", () => {
    it("should fetch unread and all notifications filtered by user", async () => {
      const nowIso = new Date().toISOString();
      const mockNotifications: PromotionNotification[] = [
        {
          id: "n-1",
          user_id: "user-alpha",
          title: "Order 1",
          body: "Body 1",
          url: "/orders/1",
          type: "order",
          is_read: false,
          created_at: nowIso,
        },
        {
          id: "n-2",
          user_id: "user-alpha",
          title: "Order 2",
          body: "Body 2",
          url: "/orders/2",
          type: "order",
          is_read: true,
          created_at: nowIso,
        },
        {
          id: "n-3",
          user_id: "user-beta",
          title: "Beta Order",
          body: "Beta Body",
          url: "/orders/3",
          type: "order",
          is_read: false,
          created_at: nowIso,
        },
      ];
      saveLocalStoredNotifications(mockNotifications);

      const alphaAll = await getNotificationsForUser("user-alpha", "user-alpha");
      expect(alphaAll.notifications.length).toBe(2);
      expect(alphaAll.unreadCount).toBe(1);

      const unreadList = alphaAll.notifications.filter((n) => !n.is_read);
      expect(unreadList.length).toBe(1);
      expect(unreadList[0].id).toBe("n-1");
    });

    it("should mark single notification as read", async () => {
      const nowIso = new Date().toISOString();
      saveLocalStoredNotifications([
        {
          id: "n-mark",
          user_id: "user-alpha",
          title: "Unread Order",
          body: "Body",
          url: "/orders/1",
          type: "order",
          is_read: false,
          created_at: nowIso,
        },
      ]);

      const markRes = await markNotificationAsRead("n-mark", "user-alpha", "user-alpha");
      expect(markRes.success).toBe(true);

      const stored = getLocalStoredNotifications();
      expect(stored[0].is_read).toBe(true);
    });

    it("should mark all user notifications as read", async () => {
      const nowIso = new Date().toISOString();
      saveLocalStoredNotifications([
        {
          id: "n-a1",
          user_id: "user-alpha",
          title: "Unread 1",
          body: "Body 1",
          url: "/orders/1",
          type: "order",
          is_read: false,
          created_at: nowIso,
        },
        {
          id: "n-a2",
          user_id: "user-alpha",
          title: "Unread 2",
          body: "Body 2",
          url: "/orders/2",
          type: "order",
          is_read: false,
          created_at: nowIso,
        },
      ]);

      const markAllRes = await markAllUserNotificationsAsRead("user-alpha", "user-alpha");
      expect(markAllRes.success).toBe(true);
      expect(markAllRes.updatedCount).toBe(2);

      const stored = getLocalStoredNotifications();
      expect(stored.every((n) => n.is_read)).toBe(true);
    });
  });

  describe("Part C: Platform Treasury & Payout Lifecycle Integration", () => {
    it("should calculate correct platform treasury summary and GMV", async () => {
      const nowIso = new Date().toISOString();
      const mockOrders: PromotionOrder[] = [
        {
          id: "ord-1",
          order_reference: "BTV-1",
          business_user_id: "biz-1",
          promoter_id: "prom-1",
          package_id: "pkg-1",
          amount: 20000,
          platform_fee: 2000,
          promoter_net_earning: 18000,
          status: "completed",
          created_at: nowIso,
          updated_at: nowIso,
        },
        {
          id: "ord-2",
          order_reference: "BTV-2",
          business_user_id: "biz-2",
          promoter_id: "prom-1",
          package_id: "pkg-1",
          amount: 10000,
          platform_fee: 1000,
          promoter_net_earning: 9000,
          status: "paid_escrow",
          created_at: nowIso,
          updated_at: nowIso,
        },
      ];
      localStorage.setItem("bincovibe_promotion_orders_all", JSON.stringify(mockOrders));

      const mockSettlement: PromotionSettlement = {
        id: "stl-1",
        settlement_reference: "STL-1",
        order_id: "ord-1",
        order_reference: "BTV-1",
        business_user_id: "biz-1",
        promoter_user_id: "prom-1",
        promoter_id: "prom-1",
        gross_amount: 20000,
        platform_fee: 2000,
        platform_fee_percent: 10,
        promoter_net_amount: 18000,
        currency: "NGN",
        status: "settled",
        settled_at: nowIso,
        created_at: nowIso,
      };
      localStorage.setItem("bincovibe_promotion_settlements_all", JSON.stringify([mockSettlement]));

      const mockPayouts: PayoutRequest[] = [
        {
          id: "pay-1",
          payout_reference: "PAY-1",
          user_id: "prom-1",
          amount: 15000,
          currency: "NGN",
          status: "paid",
          bank_name: "Access Bank",
          account_number: "0123456789",
          account_name: "Test Promoter",
          paid_at: nowIso,
          requested_at: nowIso,
          created_at: nowIso,
          updated_at: nowIso,
        },
      ];
      localStorage.setItem("bincovibe_payout_requests_all", JSON.stringify(mockPayouts));

      const { summary, error } = await getPlatformTreasurySummary("admin-user", "admin");
      expect(error).toBeNull();
      expect(summary).toBeDefined();
      expect(summary?.totalGmv).toBe(30000);
      expect(summary?.totalPlatformCommission).toBe(2000); // 10% on completed settlement
      expect(summary?.activeEscrowBalance).toBe(10000); // from paid_escrow
      expect(summary?.totalPayoutsDisbursed).toBe(15000);
    });

    it("should process admin payout completion and trigger notification", async () => {
      const nowIso = new Date().toISOString();
      const mockPayout: PayoutRequest = {
        id: "payout-action-1",
        payout_reference: "PAY-ACT-001",
        user_id: "prom-user-1",
        amount: 20000,
        currency: "NGN",
        status: "requested",
        bank_name: "Guaranty Trust Bank",
        bank_code: "058",
        account_number: "0011223344",
        account_name: "John Doe",
        requested_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      };
      localStorage.setItem("bincovibe_payout_requests_all", JSON.stringify([mockPayout]));

      const mockWallet: PromoterWallet = {
        id: "w-prom-1",
        user_id: "prom-user-1",
        balance: 5000,
        reserved_balance: 20000,
        pending_balance: 0,
        total_earned: 25000,
        total_withdrawn: 0,
        currency: "NGN",
        created_at: nowIso,
        updated_at: nowIso,
      };
      localStorage.setItem("bincovibe_promoter_wallets_all", JSON.stringify([mockWallet]));

      const result = await adminProcessPayout(
        "payout-action-1",
        "complete",
        { providerRef: "PSTK_TRF_998877", adminId: "admin-1" },
        "admin-1",
        "admin"
      );

      expect(result.error).toBeNull();
      expect(result.payout?.status).toBe("paid");
      expect(result.payout?.provider_reference).toBe("PSTK_TRF_998877");

      // Verify wallet updated
      const { wallets } = await import("../services/promotionSettlementService").then((m) => ({
        wallets: m.getLocalWallets(),
      }));
      const updatedWallet = wallets.find((w) => w.user_id === "prom-user-1");
      expect(updatedWallet?.reserved_balance).toBe(0);
      expect(updatedWallet?.total_withdrawn).toBe(20000);

      // Verify notification was dispatched
      const notifications = getLocalStoredNotifications();
      const payoutNotif = notifications.find((n) => n.payout_id === "payout-action-1");
      expect(payoutNotif).toBeDefined();
      expect(payoutNotif?.title).toContain("Disbursed");
    });
  });
});
