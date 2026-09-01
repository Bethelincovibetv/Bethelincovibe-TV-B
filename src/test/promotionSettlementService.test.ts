import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateSettlementFees,
  releaseEscrowAndSettleOrder,
  getSettlementByOrderId,
  getPromoterWallet,
  getWalletLedger,
  createPayoutRequest,
  processPayout,
  verifyAndProcessPayoutWebhook,
  getPromoterPayouts,
  reconcileFinancialRecord,
  MIN_PAYOUT_AMOUNT_NGN,
  DEFAULT_PLATFORM_FEE_PERCENT,
  PromotionSettlement,
  PromoterWallet,
} from "../services/promotionSettlementService";
import {
  PromotionOrder,
} from "../services/promotionOrderService";
import {
  createPromoterProfile,
  PromoterProfile,
} from "../services/promoterService";

describe("Step 9 — Escrow Settlement & Payout Processing Security Suite", () => {
  const BUSINESS_USER_ID = "user_business_alpha_999";
  const PROMOTER_USER_ID = "user_promoter_bravo_888";
  const UNRELATED_USER_ID = "user_attacker_charlie_777";
  const ADMIN_USER_ID = "user_platform_admin_000";

  let promoterProfile: PromoterProfile;
  let testApprovedOrder: PromotionOrder;

  beforeEach(async () => {
    localStorage.clear();

    // 1. Create Promoter Profile
    promoterProfile = await createPromoterProfile({
      userId: PROMOTER_USER_ID,
      displayName: "Bravo Promotions",
      phoneWhatsApp: "+2348011223344",
      bio: "Top tier WhatsApp community promoter",
      niches: ["tech", "business"],
    });

    // 2. Seed an Approved Order ready for escrow settlement
    testApprovedOrder = {
      id: "order_approved_1001",
      order_reference: "BTV-PROM-20260901-APP1",
      business_user_id: BUSINESS_USER_ID,
      promoter_id: promoterProfile.id,
      community_id: "comm_alpha_1",
      package_id: "pkg_alpha_1",
      amount: 50000, // ₦50,000 gross
      platform_fee: 5000,
      promoter_net_earning: 45000,
      payment_reference: "PAYSTACK_REF_SUCCESS_1001",
      paid_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      status: "approved",
      approved_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      promotion_brief: "Promote new cloud hosting discount",
      promoter: promoterProfile,
      audit_trail: [],
      created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    };

    localStorage.setItem("bincovibe_promotion_orders_all", JSON.stringify([testApprovedOrder]));
  });

  // ==========================================
  // SECTION 1: SERVER-SIDE FINANCIAL CALCULATIONS
  // ==========================================
  describe("1. Server-Side Financial Calculations", () => {
    it("derives exact 10% platform fee and 90% promoter net for standard order", () => {
      const calc = calculateSettlementFees(50000);
      expect(calc.grossAmount).toBe(50000);
      expect(calc.platformFee).toBe(5000);
      expect(calc.promoterNetAmount).toBe(45000);
      expect(calc.feePercentage).toBe(DEFAULT_PLATFORM_FEE_PERCENT);
      expect(calc.currency).toBe("NGN");
      expect(calc.grossAmount).toBe(calc.platformFee + calc.promoterNetAmount);
    });

    it("handles odd values with exact kobo rounding without floating-point errors", () => {
      const calc = calculateSettlementFees(12345.67);
      expect(calc.grossAmount).toBe(12345.67);
      expect(calc.platformFee).toBe(1234.57);
      expect(calc.promoterNetAmount).toBe(11111.1);
      expect(Math.round((calc.platformFee + calc.promoterNetAmount) * 100)).toBe(1234567);
    });

    it("supports custom platform fee percentages correctly", () => {
      const calc5Percent = calculateSettlementFees(10000, 5);
      expect(calc5Percent.platformFee).toBe(500);
      expect(calc5Percent.promoterNetAmount).toBe(9500);

      const calcZeroPercent = calculateSettlementFees(20000, 0);
      expect(calcZeroPercent.platformFee).toBe(0);
      expect(calcZeroPercent.promoterNetAmount).toBe(20000);
    });

    it("rejects negative or invalid non-number amounts", () => {
      expect(() => calculateSettlementFees(-500)).toThrow();
      expect(() => calculateSettlementFees(NaN)).toThrow();
    });
  });

  // ==========================================
  // SECTION 2: ESCROW RELEASE VALIDATIONS
  // ==========================================
  describe("2. Escrow Release Invariant Checks", () => {
    it("fails when order does not exist", async () => {
      const res = await releaseEscrowAndSettleOrder("non_existent_order_id", BUSINESS_USER_ID);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/not found/i);
    });

    it("fails when order is in unapproved state (e.g. in_progress, evidence_submitted)", async () => {
      const inProgressOrder: PromotionOrder = {
        ...testApprovedOrder,
        id: "order_in_prog",
        status: "in_progress",
      };
      localStorage.setItem("bincovibe_promotion_orders_all", JSON.stringify([inProgressOrder]));

      const res = await releaseEscrowAndSettleOrder("order_in_prog", BUSINESS_USER_ID);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/must be in 'approved' state/i);
    });

    it("fails when order is disputed, keeping escrow securely locked", async () => {
      const disputedOrder: PromotionOrder = {
        ...testApprovedOrder,
        id: "order_disputed",
        status: "disputed",
      };
      localStorage.setItem("bincovibe_promotion_orders_all", JSON.stringify([disputedOrder]));

      const res = await releaseEscrowAndSettleOrder("order_disputed", BUSINESS_USER_ID);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/approved/i);
    });

    it("fails when order has been cancelled or refunded", async () => {
      const cancelledOrder: PromotionOrder = {
        ...testApprovedOrder,
        id: "order_cancelled",
        status: "cancelled",
      };
      localStorage.setItem("bincovibe_promotion_orders_all", JSON.stringify([cancelledOrder]));

      const res = await releaseEscrowAndSettleOrder("order_cancelled", BUSINESS_USER_ID);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/approved/i);
    });

    it("rejects unauthorized third-party user from triggering settlement", async () => {
      const res = await releaseEscrowAndSettleOrder(testApprovedOrder.id, UNRELATED_USER_ID);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/permission|forbidden/i);
    });
  });

  // ==========================================
  // SECTION 3: ATOMIC SETTLEMENT & WALLET CREDIT
  // ==========================================
  describe("3. Atomic Settlement & Promoter Wallet Credit", () => {
    it("successfully settles approved order and transitions status to 'completed'", async () => {
      const res = await releaseEscrowAndSettleOrder(testApprovedOrder.id, BUSINESS_USER_ID);
      expect(res.ok).toBe(true);
      expect(res.order?.status).toBe("completed");
      expect((res.order as any)?.settlement_status).toBe("settled");
      expect(res.settlement).toBeDefined();
      expect(res.settlement?.settlement_reference).toMatch(/^BTV-SETTLE-/);
      expect(res.settlement?.gross_amount).toBe(50000);
      expect(res.settlement?.platform_fee).toBe(5000);
      expect(res.settlement?.promoter_net_amount).toBe(45000);
    });

    it("credits promoter wallet with exact net settlement amount (₦45,000)", async () => {
      // Check initial wallet balance
      const initialWallet = await getPromoterWallet(PROMOTER_USER_ID);
      expect(initialWallet.balance).toBe(0);
      expect(initialWallet.total_earned).toBe(0);

      // Settle
      await releaseEscrowAndSettleOrder(testApprovedOrder.id, BUSINESS_USER_ID);

      // Check updated wallet
      const updatedWallet = await getPromoterWallet(PROMOTER_USER_ID);
      expect(updatedWallet.balance).toBe(45000);
      expect(updatedWallet.total_earned).toBe(45000);
      expect(updatedWallet.reserved_balance).toBe(0);
    });

    it("creates an immutable credit ledger entry with balance before and after", async () => {
      await releaseEscrowAndSettleOrder(testApprovedOrder.id, BUSINESS_USER_ID);

      const { ledger } = await getWalletLedger(PROMOTER_USER_ID, PROMOTER_USER_ID);
      expect(ledger.length).toBe(1);
      expect(ledger[0].direction).toBe("credit");
      expect(ledger[0].type).toBe("settlement_credit");
      expect(ledger[0].amount).toBe(45000);
      expect(ledger[0].balance_before).toBe(0);
      expect(ledger[0].balance_after).toBe(45000);
      expect(ledger[0].status).toBe("completed");
      expect(ledger[0].settlement_reference).toMatch(/^BTV-SETTLE-/);
    });

    it("appends audit trail event 'escrow_settled' on the order", async () => {
      const res = await releaseEscrowAndSettleOrder(testApprovedOrder.id, BUSINESS_USER_ID);
      const audit = (res.order as any)?.audit_trail;
      expect(audit).toBeDefined();
      const settleEvent = audit.find((a: any) => a.event_type === "escrow_settled");
      expect(settleEvent).toBeDefined();
      expect(settleEvent.new_status).toBe("completed");
    });
  });

  // ==========================================
  // SECTION 4: IDEMPOTENCY & DUPLICATE SETTLEMENT PROTECTION
  // ==========================================
  describe("4. Idempotency & Duplicate Settlement Protection", () => {
    it("safely handles repeated/duplicate settlement calls without double-crediting promoter", async () => {
      // 1st Settlement call
      const res1 = await releaseEscrowAndSettleOrder(testApprovedOrder.id, BUSINESS_USER_ID);
      expect(res1.ok).toBe(true);
      expect(res1.alreadySettled).toBe(false);

      const walletAfter1 = await getPromoterWallet(PROMOTER_USER_ID);
      expect(walletAfter1.balance).toBe(45000);

      // 2nd Duplicate Settlement call (e.g. double click or webhook retry)
      const res2 = await releaseEscrowAndSettleOrder(testApprovedOrder.id, BUSINESS_USER_ID);
      expect(res2.ok).toBe(true);
      expect(res2.alreadySettled).toBe(true);

      // Balance must NOT double to ₦90,000!
      const walletAfter2 = await getPromoterWallet(PROMOTER_USER_ID);
      expect(walletAfter2.balance).toBe(45000);
      expect(walletAfter2.total_earned).toBe(45000);

      // Ledger must still have only 1 entry
      const { ledger } = await getWalletLedger(PROMOTER_USER_ID, PROMOTER_USER_ID);
      expect(ledger.length).toBe(1);
    });
  });

  // ==========================================
  // SECTION 5: PAYOUT REQUESTS & FUND RESERVATION
  // ==========================================
  describe("5. Payout Request Lifecycle & Wallet Fund Reservation", () => {
    beforeEach(async () => {
      // Settle order first so promoter has ₦45,000 balance
      await releaseEscrowAndSettleOrder(testApprovedOrder.id, BUSINESS_USER_ID);
    });

    it("rejects payout requests below minimum threshold (₦1,000)", async () => {
      const res = await createPayoutRequest(
        {
          amount: 500,
          bank_name: "Guaranty Trust Bank",
          bank_code: "058",
          account_number: "0123456789",
          account_name: "Bravo Promotions",
        },
        PROMOTER_USER_ID
      );
      expect(res.payout).toBeNull();
      expect(res.error).toMatch(/minimum payout/i);
    });

    it("rejects payout requests with invalid account number (not 10 digits)", async () => {
      const res = await createPayoutRequest(
        {
          amount: 5000,
          bank_name: "Guaranty Trust Bank",
          bank_code: "058",
          account_number: "12345", // too short
          account_name: "Bravo Promotions",
        },
        PROMOTER_USER_ID
      );
      expect(res.payout).toBeNull();
      expect(res.error).toMatch(/10 digits/i);
    });

    it("rejects payout requests exceeding available balance", async () => {
      const res = await createPayoutRequest(
        {
          amount: 60000, // available is 45,000
          bank_name: "Guaranty Trust Bank",
          bank_code: "058",
          account_number: "0123456789",
          account_name: "Bravo Promotions",
        },
        PROMOTER_USER_ID
      );
      expect(res.payout).toBeNull();
      expect(res.error).toMatch(/insufficient/i);
    });

    it("successfully creates payout request and atomically reserves funds", async () => {
      const res = await createPayoutRequest(
        {
          amount: 20000,
          bank_name: "Guaranty Trust Bank",
          bank_code: "058",
          account_number: "0123456789",
          account_name: "Bravo Promotions",
        },
        PROMOTER_USER_ID
      );

      expect(res.payout).toBeDefined();
      expect(res.payout?.status).toBe("requested");
      expect(res.payout?.amount).toBe(20000);
      expect(res.payout?.payout_reference).toMatch(/^BTV-PAYOUT-/);

      // Verify wallet funds moved from available to reserved
      const wallet = await getPromoterWallet(PROMOTER_USER_ID);
      expect(wallet.balance).toBe(25000); // 45,000 - 20,000
      expect(wallet.reserved_balance).toBe(20000); // 20,000 reserved
      expect(wallet.total_earned).toBe(45000);
    });

    it("prevents race-condition double-withdrawal overdrafts", async () => {
      // 1st request for ₦30,000 (leaves ₦15,000 available)
      const res1 = await createPayoutRequest(
        {
          amount: 30000,
          bank_name: "Guaranty Trust Bank",
          bank_code: "058",
          account_number: "0123456789",
          account_name: "Bravo Promotions",
        },
        PROMOTER_USER_ID
      );
      expect(res1.payout).toBeDefined();

      // 2nd request for ₦30,000 (should be rejected since only ₦15,000 is available)
      const res2 = await createPayoutRequest(
        {
          amount: 30000,
          bank_name: "Guaranty Trust Bank",
          bank_code: "058",
          account_number: "0123456789",
          account_name: "Bravo Promotions",
        },
        PROMOTER_USER_ID
      );
      expect(res2.payout).toBeNull();
      expect(res2.error).toMatch(/insufficient/i);
    });
  });

  // ==========================================
  // SECTION 6: PAYOUT PROCESSING & FAILURE RECOVERY
  // ==========================================
  describe("6. Payout State Machine: Completion & Failure Recovery", () => {
    let payoutId: string;

    beforeEach(async () => {
      await releaseEscrowAndSettleOrder(testApprovedOrder.id, BUSINESS_USER_ID);
      const res = await createPayoutRequest(
        {
          amount: 20000,
          bank_name: "Guaranty Trust Bank",
          bank_code: "058",
          account_number: "0123456789",
          account_name: "Bravo Promotions",
        },
        PROMOTER_USER_ID
      );
      payoutId = res.payout!.id;
    });

    it("completing payout transitions status to 'paid' and updates total_withdrawn", async () => {
      const processRes = await processPayout(payoutId, "complete", { providerRef: "TRF_99887766" });
      expect(processRes.payout?.status).toBe("paid");
      expect(processRes.payout?.paid_at).toBeDefined();
      expect(processRes.payout?.provider_reference).toBe("TRF_99887766");

      const wallet = await getPromoterWallet(PROMOTER_USER_ID);
      expect(wallet.balance).toBe(25000);
      expect(wallet.reserved_balance).toBe(0); // cleared from reserved
      expect(wallet.total_withdrawn).toBe(20000); // added to withdrawn
    });

    it("failing payout automatically refunds reserved funds back to available balance", async () => {
      const processRes = await processPayout(payoutId, "fail", { failureReason: "Invalid account number" });
      expect(processRes.payout?.status).toBe("failed");
      expect(processRes.payout?.failure_reason).toBe("Invalid account number");

      // Balance must return from reserved back to available!
      const wallet = await getPromoterWallet(PROMOTER_USER_ID);
      expect(wallet.balance).toBe(45000); // 25,000 + 20,000 refunded
      expect(wallet.reserved_balance).toBe(0);
      expect(wallet.total_withdrawn).toBe(0);

      // Verify refund ledger entry created
      const { ledger } = await getWalletLedger(PROMOTER_USER_ID, PROMOTER_USER_ID);
      const refundEntry = ledger.find((l) => l.type === "payout_refund");
      expect(refundEntry).toBeDefined();
      expect(refundEntry?.amount).toBe(20000);
      expect(refundEntry?.direction).toBe("credit_refund");
    });
  });

  // ==========================================
  // SECTION 7: WEBHOOK SECURITY & IDEMPOTENT CALLBACKS
  // ==========================================
  describe("7. Webhook Security & Idempotent Payout Callbacks", () => {
    let payoutReference: string;

    beforeEach(async () => {
      await releaseEscrowAndSettleOrder(testApprovedOrder.id, BUSINESS_USER_ID);
      const res = await createPayoutRequest(
        {
          amount: 15000,
          bank_name: "Access Bank",
          bank_code: "044",
          account_number: "0987654321",
          account_name: "Bravo Promotions",
        },
        PROMOTER_USER_ID
      );
      payoutReference = res.payout!.payout_reference;
    });

    it("rejects webhooks with invalid cryptographic signature", async () => {
      const webhookRes = await verifyAndProcessPayoutWebhook(
        {
          event: "transfer.success",
          data: { reference: payoutReference, amount: 1500000 },
        },
        "invalid_signature"
      );
      expect(webhookRes.ok).toBe(false);
      expect(webhookRes.error).toMatch(/signature/i);
    });

    it("successfully processes 'transfer.success' webhook and marks payout as paid", async () => {
      const webhookRes = await verifyAndProcessPayoutWebhook(
        {
          event: "transfer.success",
          data: { reference: payoutReference, id: "TRF_HOOK_123", amount: 1500000 },
        },
        "valid_signature"
      );
      expect(webhookRes.ok).toBe(true);
      expect(webhookRes.processed).toBe(true);

      const wallet = await getPromoterWallet(PROMOTER_USER_ID);
      expect(wallet.reserved_balance).toBe(0);
      expect(wallet.total_withdrawn).toBe(15000);
    });

    it("idempotently ignores duplicate webhook events without double-modifying balances", async () => {
      // 1st webhook delivery
      await verifyAndProcessPayoutWebhook(
        {
          event: "transfer.success",
          data: { reference: payoutReference, id: "TRF_HOOK_123" },
        },
        "valid_signature"
      );

      // 2nd duplicate webhook delivery
      const secondRes = await verifyAndProcessPayoutWebhook(
        {
          event: "transfer.success",
          data: { reference: payoutReference, id: "TRF_HOOK_123" },
        },
        "valid_signature"
      );
      expect(secondRes.ok).toBe(true);
      expect(secondRes.processed).toBe(false); // Ignored duplicate

      const wallet = await getPromoterWallet(PROMOTER_USER_ID);
      expect(wallet.total_withdrawn).toBe(15000); // Did not double to 30,000
    });
  });

  // ==========================================
  // SECTION 8: RBAC & DATA PRIVACY
  // ==========================================
  describe("8. RBAC & Data Privacy Protections", () => {
    it("prevents Promoter A from accessing Promoter B's ledger or payouts", async () => {
      await releaseEscrowAndSettleOrder(testApprovedOrder.id, BUSINESS_USER_ID);

      // Attacker tries to read PROMOTER_USER_ID's ledger
      const ledgerRes = await getWalletLedger(PROMOTER_USER_ID, UNRELATED_USER_ID);
      expect(ledgerRes.error).toMatch(/forbidden/i);
      expect(ledgerRes.ledger).toEqual([]);

      // Attacker tries to read PROMOTER_USER_ID's payouts
      const payoutsRes = await getPromoterPayouts(PROMOTER_USER_ID, UNRELATED_USER_ID);
      expect(payoutsRes.error).toMatch(/forbidden/i);
      expect(payoutsRes.payouts).toEqual([]);
    });

    it("allows admin to view user financial records and settlements", async () => {
      await releaseEscrowAndSettleOrder(testApprovedOrder.id, BUSINESS_USER_ID);

      const ledgerRes = await getWalletLedger(PROMOTER_USER_ID, ADMIN_USER_ID, "admin");
      expect(ledgerRes.error).toBeNull();
      expect(ledgerRes.ledger.length).toBe(1);

      const settlementRes = await getSettlementByOrderId(testApprovedOrder.id, ADMIN_USER_ID, "admin");
      expect(settlementRes.error).toBeNull();
      expect(settlementRes.settlement).toBeDefined();
    });
  });

  // ==========================================
  // SECTION 9: RECONCILIATION AUDIT
  // ==========================================
  describe("9. Financial Reconciliation Audit Verification", () => {
    it("reports 100% financial reconciliation pass for settled order", async () => {
      await releaseEscrowAndSettleOrder(testApprovedOrder.id, BUSINESS_USER_ID);

      const report = reconcileFinancialRecord(testApprovedOrder.id);
      expect(report.reconciliationPassed).toBe(true);
      expect(report.isEquationBalanced).toBe(true);
      expect(report.isWalletCredited).toBe(true);
      expect(report.grossAmount).toBe(50000);
      expect(report.platformFee).toBe(5000);
      expect(report.promoterNetAmount).toBe(45000);
      expect(report.issues).toEqual([]);
    });
  });
});
