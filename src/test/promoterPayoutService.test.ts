import { describe, it, expect, beforeEach } from "vitest";
import {
  getPromoterEarningsSummary,
  getPromoterBankAccounts,
  savePromoterBankAccount,
  deletePromoterBankAccount,
  setDefaultBankAccount,
  verifyNigerianNuban,
  maskAccountNumber,
  requestPromoterWithdrawal,
  getPayoutReceipt,
  NIGERIAN_BANKS,
  saveLocalBankAccounts,
} from "@/services/promoterPayoutService";
import {
  saveLocalWallets,
  saveLocalLedger,
  MIN_PAYOUT_AMOUNT_NGN,
  processPayout,
} from "@/services/promotionSettlementService";
import { PromotionOrder } from "@/services/promotionOrderService";

describe("Step 13: Promoter Earnings Portal, Bank Settlement Accounts & Self-Service Payouts", () => {
  const testPromoterUserId = "user-promoter-test-13";
  const otherUserId = "user-other-test-13";
  const adminUserId = "user-admin-test-13";

  beforeEach(() => {
    localStorage.clear();

    // Seed initial wallet for test promoter
    saveLocalWallets([
      {
        id: `wallet_${testPromoterUserId}`,
        user_id: testPromoterUserId,
        balance: 50000,
        reserved_balance: 0,
        pending_balance: 0,
        total_earned: 120000,
        total_withdrawn: 70000,
        currency: "NGN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    saveLocalLedger([]);
    saveLocalBankAccounts([]);
  });

  describe("Part A: Authorization & Security Access Control", () => {
    it("should reject fetching earnings summary if unauthenticated", async () => {
      const result = await getPromoterEarningsSummary(testPromoterUserId);
      expect(result.summary).toBeNull();
      expect(result.error).toContain("Unauthorized");
    });

    it("should reject fetching earnings summary for another user by non-admin", async () => {
      const result = await getPromoterEarningsSummary(
        testPromoterUserId,
        otherUserId,
        "authenticated"
      );
      expect(result.summary).toBeNull();
      expect(result.error).toContain("Forbidden");
    });

    it("should allow user to fetch their own earnings summary", async () => {
      const result = await getPromoterEarningsSummary(
        testPromoterUserId,
        testPromoterUserId,
        "authenticated"
      );
      expect(result.error).toBeNull();
      expect(result.summary).not.toBeNull();
      expect(result.summary?.availableBalance).toBe(50000);
      expect(result.summary?.currency).toBe("NGN");
      expect(result.summary?.minimumWithdrawalAmount).toBe(MIN_PAYOUT_AMOUNT_NGN);
    });

    it("should allow admin to inspect any promoter's earnings summary", async () => {
      const result = await getPromoterEarningsSummary(
        testPromoterUserId,
        adminUserId,
        "admin"
      );
      expect(result.error).toBeNull();
      expect(result.summary).not.toBeNull();
      expect(result.summary?.availableBalance).toBe(50000);
    });
  });

  describe("Part B: Bank Account Validation, Verification & Masking", () => {
    it("should correctly mask 10-digit Nigerian NUBAN numbers", () => {
      expect(maskAccountNumber("0123456789")).toBe("******6789");
      expect(maskAccountNumber("2034981122")).toBe("******1122");
      expect(maskAccountNumber("")).toBe("******0000");
    });

    it("should reject invalid account numbers not exactly 10 digits", async () => {
      const shortResult = await verifyNigerianNuban("12345", "058");
      expect(shortResult.valid).toBe(false);
      expect(shortResult.error).toContain("exactly 10 digits");

      const longResult = await verifyNigerianNuban("012345678999", "058");
      expect(longResult.valid).toBe(false);
      expect(longResult.error).toContain("exactly 10 digits");
    });

    it("should reject unrecognized or unsupported bank codes", async () => {
      const result = await verifyNigerianNuban("0123456789", "999999999");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not recognized");
    });

    it("should verify valid 10-digit NUBAN with recognized bank and return resolved name", async () => {
      const result = await verifyNigerianNuban("0123456789", "058");
      expect(result.valid).toBe(true);
      expect(result.accountNumber).toBe("0123456789");
      expect(result.bankCode).toBe("058");
      expect(result.bankName).toBe("Guaranty Trust Bank (GTBank)");
      expect(result.accountName).toBeTruthy();
    });

    it("should save and retrieve promoter verified bank account", async () => {
      const saveRes = await savePromoterBankAccount(
        {
          bank_name: "Guaranty Trust Bank (GTBank)",
          bank_code: "058",
          account_number: "0123456789",
          account_name: "ADEBAYO GTBANK",
          is_default: true,
        },
        testPromoterUserId
      );

      expect(saveRes.error).toBeNull();
      expect(saveRes.account).not.toBeNull();
      expect(saveRes.account?.is_verified).toBe(true);
      expect(saveRes.account?.is_default).toBe(true);

      const fetchRes = await getPromoterBankAccounts(
        testPromoterUserId,
        testPromoterUserId,
        "authenticated"
      );
      expect(fetchRes.error).toBeNull();
      expect(fetchRes.accounts.length).toBe(1);
      expect(fetchRes.accounts[0].account_number).toBe("0123456789");
    });

    it("should allow switching default bank account and deleting accounts", async () => {
      const acc1 = await savePromoterBankAccount(
        {
          bank_name: "Guaranty Trust Bank (GTBank)",
          bank_code: "058",
          account_number: "0123456789",
          account_name: "ADEBAYO GTBANK",
          is_default: true,
        },
        testPromoterUserId
      );

      const acc2 = await savePromoterBankAccount(
        {
          bank_name: "Access Bank",
          bank_code: "044",
          account_number: "0456789012",
          account_name: "ADEBAYO ACCESS",
          is_default: false,
        },
        testPromoterUserId
      );

      expect(acc1.account).not.toBeNull();
      expect(acc2.account).not.toBeNull();

      // Switch default to acc2
      const setDefRes = await setDefaultBankAccount(acc2.account!.id, testPromoterUserId);
      expect(setDefRes.success).toBe(true);

      const { accounts } = await getPromoterBankAccounts(testPromoterUserId, testPromoterUserId);
      const updatedAcc1 = accounts.find((a) => a.id === acc1.account!.id);
      const updatedAcc2 = accounts.find((a) => a.id === acc2.account!.id);
      expect(updatedAcc1?.is_default).toBe(false);
      expect(updatedAcc2?.is_default).toBe(true);

      // Delete acc1
      const delRes = await deletePromoterBankAccount(acc1.account!.id, testPromoterUserId);
      expect(delRes.success).toBe(true);

      const afterDelete = await getPromoterBankAccounts(testPromoterUserId, testPromoterUserId);
      expect(afterDelete.accounts.length).toBe(1);
      expect(afterDelete.accounts[0].id).toBe(acc2.account!.id);
    });

    it("should prevent unauthorized users from deleting another user's bank account", async () => {
      const acc = await savePromoterBankAccount(
        {
          bank_name: "Zenith Bank",
          bank_code: "057",
          account_number: "0123456789",
          account_name: "ADEBAYO ZENITH",
        },
        testPromoterUserId
      );

      const delAttempt = await deletePromoterBankAccount(acc.account!.id, otherUserId);
      expect(delAttempt.success).toBe(false);
      expect(delAttempt.error).toContain("Forbidden");
    });
  });

  describe("Part C: Self-Service Payout Withdrawal Workflow & Financial Invariants", () => {
    it("should reject withdrawal amount below minimum threshold", async () => {
      const result = await requestPromoterWithdrawal(
        {
          amount: 500, // Below MIN_PAYOUT_AMOUNT_NGN (1000)
          bank_name: "Access Bank",
          bank_code: "044",
          account_number: "0123456789",
          account_name: "ADEBAYO ACCESS",
        },
        testPromoterUserId
      );

      expect(result.payout).toBeNull();
      expect(result.error).toContain("Minimum withdrawal amount");
    });

    it("should reject withdrawal amount exceeding available balance", async () => {
      const result = await requestPromoterWithdrawal(
        {
          amount: 80000, // Wallet balance is 50,000
          bank_name: "Access Bank",
          bank_code: "044",
          account_number: "0123456789",
          account_name: "ADEBAYO ACCESS",
        },
        testPromoterUserId
      );

      expect(result.payout).toBeNull();
      expect(result.error).toContain("Insufficient available balance");
    });

    it("should successfully create payout request and atomically reserve funds", async () => {
      const result = await requestPromoterWithdrawal(
        {
          amount: 20000,
          bank_name: "Guaranty Trust Bank (GTBank)",
          bank_code: "058",
          account_number: "0123456789",
          account_name: "ADEBAYO GTBANK",
        },
        testPromoterUserId
      );

      expect(result.error).toBeNull();
      expect(result.payout).not.toBeNull();
      expect(result.payout?.amount).toBe(20000);
      expect(result.payout?.status).toBe("requested");
      expect(result.payout?.payout_reference).toMatch(/PAYOUT-/);

      // Verify wallet state: balance deducted, reserved_balance increased
      const summary = await getPromoterEarningsSummary(testPromoterUserId, testPromoterUserId);
      expect(summary.summary?.availableBalance).toBe(30000); // 50000 - 20000
      expect(summary.summary?.reservedBalance).toBe(20000);
    });

    it("should prevent concurrent race conditions / double-spend overdrafts", async () => {
      // Wallet balance is 50,000. Try two withdrawals of 35,000 simultaneously.
      const [res1, res2] = await Promise.all([
        requestPromoterWithdrawal(
          {
            amount: 35000,
            bank_name: "Zenith Bank",
            bank_code: "057",
            account_number: "0123456789",
            account_name: "ADEBAYO ZENITH",
          },
          testPromoterUserId
        ),
        requestPromoterWithdrawal(
          {
            amount: 35000,
            bank_name: "Zenith Bank",
            bank_code: "057",
            account_number: "0123456789",
            account_name: "ADEBAYO ZENITH",
          },
          testPromoterUserId
        ),
      ]);

      const successes = [res1, res2].filter((r) => r.payout !== null);
      const failures = [res1, res2].filter((r) => r.error !== null);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      expect(failures[0].error).toContain("Insufficient available balance");

      // Verify final wallet balance did not overdraft
      const summary = await getPromoterEarningsSummary(testPromoterUserId, testPromoterUserId);
      expect(summary.summary?.availableBalance).toBe(15000); // 50000 - 35000
      expect(summary.summary?.reservedBalance).toBe(35000);
    });

    it("should idempotently handle duplicate submission keys", async () => {
      const idempotencyKey = `idem_test_key_${Date.now()}`;

      const res1 = await requestPromoterWithdrawal(
        {
          amount: 10000,
          bank_name: "Access Bank",
          bank_code: "044",
          account_number: "0123456789",
          account_name: "ADEBAYO ACCESS",
          idempotencyKey,
        },
        testPromoterUserId
      );

      const res2 = await requestPromoterWithdrawal(
        {
          amount: 10000,
          bank_name: "Access Bank",
          bank_code: "044",
          account_number: "0123456789",
          account_name: "ADEBAYO ACCESS",
          idempotencyKey,
        },
        testPromoterUserId
      );

      expect(res1.payout).not.toBeNull();
      expect(res2.payout).not.toBeNull();
      expect(res1.payout?.id).toBe(res2.payout?.id);

      // Verify balance was only deducted ONCE (40,000 remaining, 10,000 reserved)
      const summary = await getPromoterEarningsSummary(testPromoterUserId, testPromoterUserId);
      expect(summary.summary?.availableBalance).toBe(40000);
      expect(summary.summary?.reservedBalance).toBe(10000);
    });

    it("should generate formatted payout receipt with masked details", async () => {
      const payoutRes = await requestPromoterWithdrawal(
        {
          amount: 15000,
          bank_name: "First Bank of Nigeria",
          bank_code: "011",
          account_number: "0123456789",
          account_name: "ADEBAYO FIRSTBANK",
        },
        testPromoterUserId
      );

      expect(payoutRes.payout).not.toBeNull();

      const receiptRes = await getPayoutReceipt(
        payoutRes.payout!.id,
        testPromoterUserId,
        "authenticated"
      );

      expect(receiptRes.error).toBeNull();
      expect(receiptRes.receipt).not.toBeNull();
      expect(receiptRes.receipt?.amount).toBe(15000);
      expect(receiptRes.receipt?.maskedAccountNumber).toBe("******6789");
      expect(receiptRes.receipt?.bankName).toBe("First Bank of Nigeria");
      expect(receiptRes.receipt?.accountName).toBe("ADEBAYO FIRSTBANK");
      expect(receiptRes.receipt?.currency).toBe("NGN");
    });

    it("should verify payout completion transitions status to paid and updates total_withdrawn", async () => {
      const payoutRes = await requestPromoterWithdrawal(
        {
          amount: 25000,
          bank_name: "Zenith Bank",
          bank_code: "057",
          account_number: "0123456789",
          account_name: "ADEBAYO ZENITH",
        },
        testPromoterUserId
      );

      const payoutId = payoutRes.payout!.id;

      // Admin completes payout
      const processRes = await processPayout(
        payoutId,
        "complete",
        { providerRef: "TRF_PROV_987654" },
        adminUserId,
        "admin"
      );

      expect(processRes.error).toBeNull();
      expect(processRes.payout?.status).toBe("paid");

      // Verify wallet state: reserved balance cleared, total_withdrawn updated
      const summary = await getPromoterEarningsSummary(testPromoterUserId, testPromoterUserId);
      expect(summary.summary?.availableBalance).toBe(25000); // 50000 - 25000
      expect(summary.summary?.reservedBalance).toBe(0);
      expect(summary.summary?.totalWithdrawn).toBe(95000); // 70000 + 25000
    });

    it("should verify payout failure automatically refunds reserved funds back to available balance", async () => {
      const payoutRes = await requestPromoterWithdrawal(
        {
          amount: 25000,
          bank_name: "Zenith Bank",
          bank_code: "057",
          account_number: "0123456789",
          account_name: "ADEBAYO ZENITH",
        },
        testPromoterUserId
      );

      const payoutId = payoutRes.payout!.id;

      // Admin marks payout failed (e.g. invalid account or bank rejection)
      const failRes = await processPayout(
        payoutId,
        "fail",
        { failureReason: "Beneficiary account could not be credited by gateway" },
        adminUserId,
        "admin"
      );

      expect(failRes.error).toBeNull();
      expect(failRes.payout?.status).toBe("failed");

      // Verify wallet state: reserved balance restored to available balance
      const summary = await getPromoterEarningsSummary(testPromoterUserId, testPromoterUserId);
      expect(summary.summary?.availableBalance).toBe(50000); // Fully refunded
      expect(summary.summary?.reservedBalance).toBe(0);
    });
  });
});
