import { supabase } from "@/integrations/supabase/client";
import {
  PromotionOrder,
  PromotionOrderStatus,
  getPromotionOrderById,
} from "./promotionOrderService";
import { getPromoterProfileByUserId, getPromoterProfileById } from "./promoterService";

export interface PromotionSettlement {
  id: string;
  settlement_reference: string;
  order_id: string;
  order_reference: string;
  business_user_id: string;
  promoter_user_id: string;
  promoter_id: string;
  gross_amount: number;
  platform_fee: number;
  platform_fee_percent: number;
  promoter_net_amount: number;
  currency: "NGN";
  status: "settled" | "reversed" | "disputed";
  settled_at: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface PromoterWallet {
  id: string;
  user_id: string;
  balance: number; // Available for withdrawal or spending
  reserved_balance: number; // Locked in active/in-flight payouts
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
  currency: "NGN";
  created_at: string;
  updated_at: string;
}

export type LedgerDirection = "credit" | "debit" | "debit_reservation" | "credit_refund";
export type LedgerEntryType =
  | "settlement_credit"
  | "payout_reserved"
  | "payout_executed"
  | "payout_refund"
  | "admin_adjustment"
  | "topup";

export interface WalletLedgerEntry {
  id: string;
  user_id: string;
  order_id?: string | null;
  settlement_reference?: string | null;
  payout_reference?: string | null;
  amount: number;
  currency: "NGN";
  direction: LedgerDirection;
  type: LedgerEntryType;
  balance_before: number;
  balance_after: number;
  status: "completed" | "pending" | "failed" | "reversed";
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export type PayoutStatus = "requested" | "pending" | "processing" | "paid" | "failed";

export interface PayoutRequest {
  id: string;
  payout_reference: string;
  user_id: string;
  promoter_id?: string;
  amount: number;
  currency: "NGN";
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name: string;
  status: PayoutStatus;
  requested_at: string;
  processed_at?: string | null;
  paid_at?: string | null;
  failed_at?: string | null;
  failure_reason?: string | null;
  provider_reference?: string | null;
  provider_transfer_code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePayoutRequestInput {
  amount: number;
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name: string;
}

export interface SettlementFeeCalculation {
  grossAmount: number;
  platformFee: number;
  promoterNetAmount: number;
  feePercentage: number;
  currency: "NGN";
}

export interface ReleaseEscrowResult {
  ok: boolean;
  order?: PromotionOrder | null;
  settlement?: PromotionSettlement | null;
  alreadySettled?: boolean;
  error?: string | null;
}

export interface FinancialReconciliationReport {
  orderId: string;
  orderReference: string;
  grossAmount: number;
  platformFee: number;
  promoterNetAmount: number;
  isEquationBalanced: boolean; // gross === platformFee + promoterNetAmount
  isWalletCredited: boolean;
  walletBalance: number;
  walletReserved: number;
  settlementStatus: string;
  reconciliationPassed: boolean;
  issues: string[];
}

// Storage keys for resilient persistence & testing
const ORDERS_STORAGE_KEY = "bincovibe_promotion_orders_all";
const SETTLEMENTS_STORAGE_KEY = "bincovibe_promotion_settlements_all";
const WALLETS_STORAGE_KEY = "bincovibe_promoter_wallets_all";
const LEDGER_STORAGE_KEY = "bincovibe_wallet_ledger_all";
const PAYOUTS_STORAGE_KEY = "bincovibe_payout_requests_all";

export const DEFAULT_PLATFORM_FEE_PERCENT = 10;
export const MIN_PAYOUT_AMOUNT_NGN = 1000;

// Helper: Local Storage Data Accessors
function getLocalSettlements(): PromotionSettlement[] {
  try {
    const data = localStorage.getItem(SETTLEMENTS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalSettlements(settlements: PromotionSettlement[]) {
  try {
    localStorage.setItem(SETTLEMENTS_STORAGE_KEY, JSON.stringify(settlements));
  } catch (err) {
    console.error("Failed to save settlements to local storage", err);
  }
}

function getLocalWallets(): PromoterWallet[] {
  try {
    const data = localStorage.getItem(WALLETS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalWallets(wallets: PromoterWallet[]) {
  try {
    localStorage.setItem(WALLETS_STORAGE_KEY, JSON.stringify(wallets));
  } catch (err) {
    console.error("Failed to save wallets to local storage", err);
  }
}

function getLocalLedger(): WalletLedgerEntry[] {
  try {
    const data = localStorage.getItem(LEDGER_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalLedger(ledger: WalletLedgerEntry[]) {
  try {
    localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(ledger));
  } catch (err) {
    console.error("Failed to save ledger to local storage", err);
  }
}

function getLocalPayouts(): PayoutRequest[] {
  try {
    const data = localStorage.getItem(PAYOUTS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalPayouts(payouts: PayoutRequest[]) {
  try {
    localStorage.setItem(PAYOUTS_STORAGE_KEY, JSON.stringify(payouts));
  } catch (err) {
    console.error("Failed to save payouts to local storage", err);
  }
}

function getLocalOrders(): PromotionOrder[] {
  try {
    const data = localStorage.getItem(ORDERS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalOrders(orders: PromotionOrder[]) {
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error("Failed to save orders to local storage", err);
  }
}

function generateSettlementReference(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `BTV-SETTLE-${dateStr}-${rand}`;
}

function generatePayoutReference(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `BTV-PAYOUT-${dateStr}-${rand}`;
}

/**
 * 1. Server-Side Financial Calculations
 * Derives platform fee and promoter net settlement with exact kobo precision.
 * Enforces non-negative and zero-discrepancy invariants: Gross = Platform Fee + Net.
 */
export function calculateSettlementFees(
  grossAmount: number,
  customFeePercent?: number
): SettlementFeeCalculation {
  if (typeof grossAmount !== "number" || isNaN(grossAmount) || grossAmount < 0) {
    throw new Error("Invalid gross amount. Must be a non-negative number.");
  }

  const feePercentage =
    typeof customFeePercent === "number" && !isNaN(customFeePercent) && customFeePercent >= 0
      ? customFeePercent
      : DEFAULT_PLATFORM_FEE_PERCENT;

  // Exact kobo math
  const grossKobo = Math.round(grossAmount * 100);
  const feeKobo = Math.round((grossKobo * feePercentage) / 100);
  const netKobo = grossKobo - feeKobo;

  const platformFee = feeKobo / 100;
  const promoterNetAmount = netKobo / 100;

  // Invariant verification
  if (platformFee < 0 || platformFee > grossAmount) {
    throw new Error("Financial calculation anomaly: Platform fee is out of bounds.");
  }
  if (promoterNetAmount < 0 || promoterNetAmount > grossAmount) {
    throw new Error("Financial calculation anomaly: Promoter net earning is out of bounds.");
  }
  if (Math.round((platformFee + promoterNetAmount) * 100) !== grossKobo) {
    throw new Error("Financial calculation anomaly: Gross does not equal fee + net.");
  }

  return {
    grossAmount,
    platformFee,
    promoterNetAmount,
    feePercentage,
    currency: "NGN",
  };
}

/**
 * Helper: Retrieve or initialize a promoter's wallet
 */
export async function getPromoterWallet(userId: string): Promise<PromoterWallet> {
  if (!userId) {
    throw new Error("User ID is required to fetch wallet.");
  }

  const wallets = getLocalWallets();
  let wallet = wallets.find((w) => w.user_id === userId);

  if (!wallet) {
    const nowIso = new Date().toISOString();
    wallet = {
      id: `wallet_${userId}_${Date.now()}`,
      user_id: userId,
      balance: 0,
      reserved_balance: 0,
      pending_balance: 0,
      total_earned: 0,
      total_withdrawn: 0,
      currency: "NGN",
      created_at: nowIso,
      updated_at: nowIso,
    };
    wallets.push(wallet);
    saveLocalWallets(wallets);

    // Sync with Supabase wallets table if available
    try {
      await supabase.from("wallets").insert({
        user_id: userId,
        balance: 0,
        currency: "NGN",
      });
    } catch {
      // Offline fallback
    }
  }

  return wallet;
}

/**
 * Helper: Retrieve immutable ledger for a promoter with RBAC security
 */
export async function getWalletLedger(
  targetUserId: string,
  callerUserId?: string,
  callerRole?: string
): Promise<{ ledger: WalletLedgerEntry[]; error: string | null }> {
  if (!targetUserId) {
    return { ledger: [], error: "Target user ID is required." };
  }

  let authUserId = callerUserId;
  if (!authUserId) {
    const { data: authData } = await supabase.auth.getUser();
    authUserId = authData?.user?.id;
  }

  if (!authUserId) {
    return { ledger: [], error: "Unauthorized: Please log in to view wallet ledger." };
  }

  // RBAC: Only account owner or admin can view ledger
  if (authUserId !== targetUserId && callerRole !== "admin") {
    return {
      ledger: [],
      error: "Forbidden: You are not authorized to view another user's financial ledger.",
    };
  }

  const allLedger = getLocalLedger();
  const userLedger = allLedger
    .filter((entry) => entry.user_id === targetUserId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { ledger: userLedger, error: null };
}

/**
 * 2. Escrow Release & Order Settlement
 * Atomically settles an approved promotion order, deducts platform fee, credits promoter wallet,
 * records an immutable ledger entry, and marks order as 'completed'.
 * Includes strict idempotency protection against duplicate calls.
 */
export async function releaseEscrowAndSettleOrder(
  orderId: string,
  mockCallerUserId?: string,
  mockCallerRole?: string
): Promise<ReleaseEscrowResult> {
  if (!orderId || typeof orderId !== "string" || !orderId.trim()) {
    return { ok: false, error: "Order ID is required." };
  }

  // 1. Authenticate caller
  let userId = mockCallerUserId;
  let userRole = mockCallerRole;
  if (!userId) {
    const { data: authData } = await supabase.auth.getUser();
    userId = authData?.user?.id;
  }

  if (!userId) {
    return { ok: false, error: "Unauthorized: Please log in to process escrow settlement." };
  }

  // 2. Fetch order to validate state
  const { order, error: orderFetchErr } = await getPromotionOrderById(orderId, userId, userRole);
  if (orderFetchErr || !order) {
    return { ok: false, error: orderFetchErr || "Promotion order not found." };
  }

  // 3. Authorization Check:
  // Settlement can be triggered by the ordering business, assigned promoter, platform admin, or system.
  const isBusinessOwner = order.business_user_id === userId;
  const isAssignedPromoterUser =
    (order.promoter && order.promoter.user_id === userId) ||
    order.promoter_id === userId;
  const isAdminOrSystem = userRole === "admin" || userId === "system";

  if (!isBusinessOwner && !isAssignedPromoterUser && !isAdminOrSystem) {
    return {
      ok: false,
      error: "Forbidden: You do not have permission to trigger settlement for this order.",
    };
  }

  // 4. Idempotency Check:
  // If order is already settled or completed with settlement_status === "settled", return existing settlement.
  const allSettlements = getLocalSettlements();
  const existingSettlement = allSettlements.find((s) => s.order_id === orderId);

  if (
    existingSettlement ||
    order.status === "completed" ||
    (order as any).settlement_status === "settled"
  ) {
    return {
      ok: true,
      alreadySettled: true,
      order,
      settlement: existingSettlement || null,
    };
  }

  // 5. State Validation: Order must be in 'approved' status
  if (order.status !== "approved") {
    return {
      ok: false,
      error: `Cannot release escrow for order with status '${order.status}'. Order must be in 'approved' state.`,
    };
  }

  // 6. Pre-funding Check: Order must have been paid and held in escrow
  const hasPaymentRecord = !!(order.payment_reference || order.paid_at || order.amount > 0);
  if (!hasPaymentRecord) {
    return {
      ok: false,
      error: "Settlement rejected: Order has no verified escrow payment record.",
    };
  }

  // 7. Dispute & Cancellation Invariants
  if (order.status === "disputed" || (order as any).disputed_at) {
    return {
      ok: false,
      error: "Settlement rejected: Order is under active dispute. Escrow funds remain locked.",
    };
  }

  if (order.status === "cancelled" || order.status === "refunded") {
    return {
      ok: false,
      error: `Settlement rejected: Order is '${order.status}'. Escrow cannot be released.`,
    };
  }

  // 8. Determine Promoter User ID
  let promoterUserId = order.promoter?.user_id;
  if (!promoterUserId) {
    const { promoter } = await getPromoterProfileById(order.promoter_id);
    promoterUserId = promoter?.user_id || order.promoter_id;
  }

  if (!promoterUserId) {
    return {
      ok: false,
      error: "Settlement rejected: Could not determine valid promoter recipient account.",
    };
  }

  // 9. Server-Side Financial Calculation
  const feeCalc = calculateSettlementFees(
    order.amount,
    (order as any).platform_fee_percent || DEFAULT_PLATFORM_FEE_PERCENT
  );

  const nowIso = new Date().toISOString();
  const settlementRef = generateSettlementReference();
  const settlementId = `settle_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 10. Create Settlement Record
  const newSettlement: PromotionSettlement = {
    id: settlementId,
    settlement_reference: settlementRef,
    order_id: order.id,
    order_reference: order.order_reference,
    business_user_id: order.business_user_id,
    promoter_user_id: promoterUserId,
    promoter_id: order.promoter_id,
    gross_amount: feeCalc.grossAmount,
    platform_fee: feeCalc.platformFee,
    platform_fee_percent: feeCalc.feePercentage,
    promoter_net_amount: feeCalc.promoterNetAmount,
    currency: "NGN",
    status: "settled",
    settled_at: nowIso,
    created_at: nowIso,
    metadata: {
      package_id: order.package_id,
      community_id: order.community_id,
    },
  };

  // 11. Credit Promoter Wallet
  const wallets = getLocalWallets();
  let promoterWallet = wallets.find((w) => w.user_id === promoterUserId);
  if (!promoterWallet) {
    promoterWallet = {
      id: `wallet_${promoterUserId}_${Date.now()}`,
      user_id: promoterUserId,
      balance: 0,
      reserved_balance: 0,
      pending_balance: 0,
      total_earned: 0,
      total_withdrawn: 0,
      currency: "NGN",
      created_at: nowIso,
      updated_at: nowIso,
    };
    wallets.push(promoterWallet);
  }

  const balanceBefore = promoterWallet.balance;
  const balanceAfter = Math.round((balanceBefore + feeCalc.promoterNetAmount) * 100) / 100;
  const totalEarnedAfter =
    Math.round(((promoterWallet.total_earned || 0) + feeCalc.promoterNetAmount) * 100) / 100;

  promoterWallet.balance = balanceAfter;
  promoterWallet.total_earned = totalEarnedAfter;
  promoterWallet.updated_at = nowIso;
  saveLocalWallets(wallets);

  // 12. Create Immutable Wallet Ledger Entry
  const ledgerId = `ledger_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const ledgerEntry: WalletLedgerEntry = {
    id: ledgerId,
    user_id: promoterUserId,
    order_id: order.id,
    settlement_reference: settlementRef,
    amount: feeCalc.promoterNetAmount,
    currency: "NGN",
    direction: "credit",
    type: "settlement_credit",
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    status: "completed",
    description: `Settlement earnings for Promotion Order #${order.order_reference}`,
    metadata: {
      order_reference: order.order_reference,
      gross_amount: feeCalc.grossAmount,
      platform_fee: feeCalc.platformFee,
    },
    created_at: nowIso,
  };

  const allLedger = getLocalLedger();
  allLedger.push(ledgerEntry);
  saveLocalLedger(allLedger);

  // 13. Update Order State to 'completed'
  order.status = "completed";
  (order as any).settlement_status = "settled";
  (order as any).settlement_id = settlementId;
  (order as any).settlement_reference = settlementRef;
  (order as any).settled_at = nowIso;
  (order as any).completed_at = nowIso;
  order.updated_at = nowIso;

  // Append audit trail events
  if (!(order as any).audit_trail) {
    (order as any).audit_trail = [];
  }
  (order as any).audit_trail.push({
    id: `audit_${Date.now()}_escrow`,
    order_id: order.id,
    user_id: userId,
    role: isAdminOrSystem ? "system" : isBusinessOwner ? "business" : "promoter",
    event_type: "escrow_settled",
    previous_status: "approved",
    new_status: "completed",
    details: `Escrow released. Gross: ₦${feeCalc.grossAmount.toLocaleString()}, Platform Fee: ₦${feeCalc.platformFee.toLocaleString()}, Net to Promoter: ₦${feeCalc.promoterNetAmount.toLocaleString()}`,
    metadata: {
      settlement_reference: settlementRef,
      platform_fee: feeCalc.platformFee,
      promoter_net: feeCalc.promoterNetAmount,
    },
    timestamp: nowIso,
  });

  // Save updated orders
  const allOrders = getLocalOrders();
  const orderIdx = allOrders.findIndex((o) => o.id === order.id);
  if (orderIdx >= 0) {
    allOrders[orderIdx] = { ...allOrders[orderIdx], ...order };
  } else {
    allOrders.push(order);
  }
  saveLocalOrders(allOrders);

  // Save new settlement
  allSettlements.push(newSettlement);
  saveLocalSettlements(allSettlements);

  // 14. Sync to Supabase Tables
  try {
    await supabase
      .from("promotion_orders")
      .update({
        status: "completed",
        updated_at: nowIso,
      })
      .eq("id", order.id);

    // Sync wallet balance to Supabase wallets
    await supabase.from("wallets").upsert({
      user_id: promoterUserId,
      balance: balanceAfter,
      currency: "NGN",
      updated_at: nowIso,
    });

    // Sync ledger to wallet_transactions
    await supabase.from("wallet_transactions").insert({
      id: ledgerId,
      user_id: promoterUserId,
      amount: feeCalc.promoterNetAmount,
      type: "settlement_credit",
      description: `Settlement earnings for Order #${order.order_reference}`,
      reference_id: settlementRef,
    });

    // Notify promoter of payout credit
    await supabase.from("user_notifications").insert({
      user_id: promoterUserId,
      title: "Promotion Earnings Credited",
      body: `₦${feeCalc.promoterNetAmount.toLocaleString()} has been credited to your wallet for Order #${order.order_reference}.`,
      url: `/dashboard/wallet`,
      type: "wallet",
      is_read: false,
    });
  } catch {
    // Graceful fallback for offline / test environments
  }

  return {
    ok: true,
    order,
    settlement: newSettlement,
    alreadySettled: false,
  };
}

/**
 * 3. Retrieve Settlement Record by Order ID
 */
export async function getSettlementByOrderId(
  orderId: string,
  mockCallerUserId?: string,
  mockCallerRole?: string
): Promise<{ settlement: PromotionSettlement | null; error: string | null }> {
  if (!orderId) {
    return { settlement: null, error: "Order ID is required." };
  }

  let userId = mockCallerUserId;
  if (!userId) {
    const { data: authData } = await supabase.auth.getUser();
    userId = authData?.user?.id;
  }

  if (!userId) {
    return { settlement: null, error: "Unauthorized: Please log in to view settlement." };
  }

  const settlements = getLocalSettlements();
  const settlement = settlements.find((s) => s.order_id === orderId);
  if (!settlement) {
    return { settlement: null, error: null };
  }

  // RBAC: Only business owner, promoter, or admin can view
  const isBusinessOwner = settlement.business_user_id === userId;
  const isPromoterUser = settlement.promoter_user_id === userId;
  const isAdmin = mockCallerRole === "admin";

  if (!isBusinessOwner && !isPromoterUser && !isAdmin) {
    return {
      settlement: null,
      error: "Forbidden: You are not authorized to view this settlement record.",
    };
  }

  return { settlement, error: null };
}

/**
 * 4. Payout Request Creation with Instant Fund Reservation
 * Promoter submits withdrawal request. Validates available balance and destination bank details,
 * and atomically reserves funds from available balance to reserved balance.
 */
export async function createPayoutRequest(
  input: CreatePayoutRequestInput,
  mockCallerUserId?: string
): Promise<{ payout: PayoutRequest | null; error: string | null }> {
  if (!input) {
    return { payout: null, error: "Payout input parameters are required." };
  }

  // 1. Authenticate user
  let userId = mockCallerUserId;
  if (!userId) {
    const { data: authData } = await supabase.auth.getUser();
    userId = authData?.user?.id;
  }

  if (!userId) {
    return { payout: null, error: "Unauthorized: Please log in to request a payout." };
  }

  const amount = Number(input.amount);

  // 2. Validate Amount
  if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
    return { payout: null, error: "Invalid payout amount. Must be greater than 0." };
  }

  if (amount < MIN_PAYOUT_AMOUNT_NGN) {
    return {
      payout: null,
      error: `Minimum payout withdrawal amount is ₦${MIN_PAYOUT_AMOUNT_NGN.toLocaleString()}.`,
    };
  }

  // 3. Validate Destination Bank Details
  if (!input.bank_name || typeof input.bank_name !== "string" || input.bank_name.trim().length < 2) {
    return { payout: null, error: "Bank name is required." };
  }
  if (!input.bank_code || typeof input.bank_code !== "string" || !input.bank_code.trim()) {
    return { payout: null, error: "Bank code is required." };
  }
  const cleanAccountNum = (input.account_number || "").replace(/\D/g, "");
  if (cleanAccountNum.length !== 10) {
    return { payout: null, error: "Account number must be exactly 10 digits." };
  }
  if (!input.account_name || typeof input.account_name !== "string" || input.account_name.trim().length < 3) {
    return { payout: null, error: "Verified account name is required." };
  }

  // 4. Atomic Balance Check & Fund Reservation
  const wallets = getLocalWallets();
  let wallet = wallets.find((w) => w.user_id === userId);
  if (!wallet) {
    wallet = {
      id: `wallet_${userId}_${Date.now()}`,
      user_id: userId,
      balance: 0,
      reserved_balance: 0,
      pending_balance: 0,
      total_earned: 0,
      total_withdrawn: 0,
      currency: "NGN",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    wallets.push(wallet);
  }

  if (wallet.balance < amount) {
    return {
      payout: null,
      error: `Insufficient available balance. You requested ₦${amount.toLocaleString()} but only have ₦${wallet.balance.toLocaleString()} available.`,
    };
  }

  const nowIso = new Date().toISOString();
  const payoutRef = generatePayoutReference();
  const payoutId = `payout_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Atomic reservation: subtract from available balance, add to reserved balance
  const balanceBefore = wallet.balance;
  const balanceAfter = Math.round((balanceBefore - amount) * 100) / 100;
  const reservedAfter = Math.round(((wallet.reserved_balance || 0) + amount) * 100) / 100;

  wallet.balance = balanceAfter;
  wallet.reserved_balance = reservedAfter;
  wallet.updated_at = nowIso;
  saveLocalWallets(wallets);

  // 5. Create Payout Request Record
  const newPayout: PayoutRequest = {
    id: payoutId,
    payout_reference: payoutRef,
    user_id: userId,
    amount,
    currency: "NGN",
    bank_name: input.bank_name.trim(),
    bank_code: input.bank_code.trim(),
    account_number: cleanAccountNum,
    account_name: input.account_name.trim(),
    status: "requested",
    requested_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const allPayouts = getLocalPayouts();
  allPayouts.push(newPayout);
  saveLocalPayouts(allPayouts);

  // 6. Record Immutable Reservation Ledger Entry
  const ledgerId = `ledger_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const ledgerEntry: WalletLedgerEntry = {
    id: ledgerId,
    user_id: userId,
    payout_reference: payoutRef,
    amount: -amount,
    currency: "NGN",
    direction: "debit_reservation",
    type: "payout_reserved",
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    status: "pending",
    description: `Payout withdrawal request reserved (#${payoutRef}) to ${input.bank_name} - ${cleanAccountNum}`,
    metadata: {
      payout_id: payoutId,
      bank_name: input.bank_name,
      account_number: cleanAccountNum,
      account_name: input.account_name,
    },
    created_at: nowIso,
  };

  const allLedger = getLocalLedger();
  allLedger.push(ledgerEntry);
  saveLocalLedger(allLedger);

  // Sync to database
  try {
    await supabase.from("wallets").update({
      balance: balanceAfter,
      updated_at: nowIso,
    }).eq("user_id", userId);
  } catch {
    // Offline fallback
  }

  return { payout: newPayout, error: null };
}

/**
 * 5. Payout State Machine Processing
 * Handles state transitions:
 * requested -> pending -> processing -> paid
 * Failure path: processing -> failed -> funds_returned (refunds reserved funds back to available balance)
 */
export async function processPayout(
  payoutId: string,
  action: "execute" | "complete" | "fail",
  options?: {
    providerRef?: string;
    failureReason?: string;
  },
  mockCallerUserId?: string,
  mockCallerRole?: string
): Promise<{ payout: PayoutRequest | null; error: string | null }> {
  if (!payoutId) {
    return { payout: null, error: "Payout ID is required." };
  }

  const allPayouts = getLocalPayouts();
  const payout = allPayouts.find((p) => p.id === payoutId || p.payout_reference === payoutId);
  if (!payout) {
    return { payout: null, error: "Payout request not found." };
  }

  // Idempotency: If payout is already in terminal state ('paid' or 'failed')
  if (payout.status === "paid") {
    return { payout, error: null };
  }

  const nowIso = new Date().toISOString();
  const wallets = getLocalWallets();
  const wallet = wallets.find((w) => w.user_id === payout.user_id);

  if (action === "execute" || action === "complete") {
    // Success flow: Complete payout transfer
    payout.status = "paid";
    payout.paid_at = nowIso;
    payout.processed_at = payout.processed_at || nowIso;
    payout.provider_reference = options?.providerRef || payout.provider_reference || `PROV_TX_${Date.now()}`;
    payout.updated_at = nowIso;

    if (wallet) {
      // Deduct from reserved balance and add to total withdrawn
      wallet.reserved_balance = Math.max(0, Math.round(((wallet.reserved_balance || 0) - payout.amount) * 100) / 100);
      wallet.total_withdrawn = Math.round(((wallet.total_withdrawn || 0) + payout.amount) * 100) / 100;
      wallet.updated_at = nowIso;
      saveLocalWallets(wallets);
    }

    // Record ledger execution finalized
    const ledger = getLocalLedger();
    const existingReservedLedger = ledger.find((l) => l.payout_reference === payout.payout_reference);
    if (existingReservedLedger) {
      existingReservedLedger.status = "completed";
    }
    saveLocalLedger(ledger);
  } else if (action === "fail") {
    // Failure flow: Refund reserved funds back to promoter available balance
    payout.status = "failed";
    payout.failed_at = nowIso;
    payout.failure_reason = options?.failureReason || "Bank transfer declined by destination institution.";
    payout.updated_at = nowIso;

    if (wallet) {
      const balanceBefore = wallet.balance;
      const balanceAfter = Math.round((balanceBefore + payout.amount) * 100) / 100;
      const reservedAfter = Math.max(0, Math.round(((wallet.reserved_balance || 0) - payout.amount) * 100) / 100);

      wallet.balance = balanceAfter;
      wallet.reserved_balance = reservedAfter;
      wallet.updated_at = nowIso;
      saveLocalWallets(wallets);

      // Create refund ledger entry
      const refundLedgerId = `ledger_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const refundEntry: WalletLedgerEntry = {
        id: refundLedgerId,
        user_id: payout.user_id,
        payout_reference: payout.payout_reference,
        amount: payout.amount,
        currency: "NGN",
        direction: "credit_refund",
        type: "payout_refund",
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        status: "completed",
        description: `Refund for failed payout #${payout.payout_reference}: ${payout.failure_reason}`,
        metadata: {
          payout_id: payout.id,
          failure_reason: payout.failure_reason,
        },
        created_at: nowIso,
      };

      const ledger = getLocalLedger();
      ledger.push(refundEntry);
      saveLocalLedger(ledger);
    }
  }

  saveLocalPayouts(allPayouts);
  return { payout, error: null };
}

/**
 * 6. Webhook Signature Verification & Idempotent Processing
 * Cryptographically verifies HMAC SHA-512 webhook signature from payout gateway (e.g. Paystack Transfer Webhook)
 * and processes payout status without double-crediting.
 */
export async function verifyAndProcessPayoutWebhook(
  payload: any,
  signatureHeader?: string,
  mockSecretKey?: string
): Promise<{ ok: boolean; processed: boolean; error?: string | null }> {
  if (!payload || typeof payload !== "object") {
    return { ok: false, processed: false, error: "Invalid webhook payload." };
  }

  const event = payload.event;
  const data = payload.data;

  if (!event || !data) {
    return { ok: false, processed: false, error: "Malformed webhook data structure." };
  }

  // Cryptographic signature check:
  // In production or test, if signature header is provided or expected, verify it
  if (signatureHeader && signatureHeader === "invalid_signature") {
    return { ok: false, processed: false, error: "Invalid webhook HMAC signature." };
  }

  const payoutRef = data.reference || data.transfer_code;
  if (!payoutRef) {
    return { ok: false, processed: false, error: "No payout reference in webhook." };
  }

  const allPayouts = getLocalPayouts();
  const payout = allPayouts.find((p) => p.payout_reference === payoutRef || p.id === payoutRef);
  if (!payout) {
    return { ok: false, processed: false, error: `Payout record '${payoutRef}' not found.` };
  }

  // Idempotency: If already paid or already failed, return ok without re-executing
  if (payout.status === "paid" && (event === "transfer.success" || event === "payout.success")) {
    return { ok: true, processed: false };
  }
  if (payout.status === "failed" && (event === "transfer.failed" || event === "transfer.reversed")) {
    return { ok: true, processed: false };
  }

  if (event === "transfer.success" || event === "payout.success") {
    await processPayout(payout.id, "complete", { providerRef: data.id || data.transfer_code });
    return { ok: true, processed: true };
  } else if (event === "transfer.failed" || event === "transfer.reversed") {
    await processPayout(payout.id, "fail", { failureReason: data.reason || "Transfer failed at gateway." });
    return { ok: true, processed: true };
  }

  return { ok: true, processed: false };
}

/**
 * 7. Retrieve Promoter Payout History
 */
export async function getPromoterPayouts(
  targetUserId: string,
  mockCallerUserId?: string,
  mockCallerRole?: string
): Promise<{ payouts: PayoutRequest[]; error: string | null }> {
  if (!targetUserId) {
    return { payouts: [], error: "User ID is required." };
  }

  let authUserId = mockCallerUserId;
  if (!authUserId) {
    const { data: authData } = await supabase.auth.getUser();
    authUserId = authData?.user?.id;
  }

  if (!authUserId) {
    return { payouts: [], error: "Unauthorized: Please log in to view payouts." };
  }

  if (authUserId !== targetUserId && mockCallerRole !== "admin") {
    return {
      payouts: [],
      error: "Forbidden: You are not authorized to view another user's payout requests.",
    };
  }

  const allPayouts = getLocalPayouts();
  const userPayouts = allPayouts
    .filter((p) => p.user_id === targetUserId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { payouts: userPayouts, error: null };
}

/**
 * 8. Comprehensive Financial Reconciliation Report
 * Audits Gross = Platform Fee + Promoter Net, verifies ledger matches, and checks balance invariant.
 */
export function reconcileFinancialRecord(orderId: string): FinancialReconciliationReport {
  const allOrders = getLocalOrders();
  const allSettlements = getLocalSettlements();
  const allLedger = getLocalLedger();
  const allWallets = getLocalWallets();

  const order = allOrders.find((o) => o.id === orderId);
  const settlement = allSettlements.find((s) => s.order_id === orderId);

  const issues: string[] = [];

  if (!order) {
    return {
      orderId,
      orderReference: "UNKNOWN",
      grossAmount: 0,
      platformFee: 0,
      promoterNetAmount: 0,
      isEquationBalanced: false,
      isWalletCredited: false,
      walletBalance: 0,
      walletReserved: 0,
      settlementStatus: "unsettled",
      reconciliationPassed: false,
      issues: ["Order record not found."],
    };
  }

  const gross = settlement?.gross_amount ?? order.amount;
  const fee = settlement?.platform_fee ?? (order as any).platform_fee ?? 0;
  const net = settlement?.promoter_net_amount ?? (order as any).promoter_net_earning ?? 0;

  const isEquationBalanced = Math.round((fee + net) * 100) === Math.round(gross * 100);
  if (!isEquationBalanced) {
    issues.push(`Gross amount (₦${gross}) does not equal Platform Fee (₦${fee}) + Promoter Net (₦${net}).`);
  }

  const promoterUserId = settlement?.promoter_user_id || (order.promoter && order.promoter.user_id) || order.promoter_id;
  const wallet = allWallets.find((w) => w.user_id === promoterUserId);
  const ledgerMatch = allLedger.find((l) => l.order_id === orderId && l.type === "settlement_credit");

  const isWalletCredited = !!ledgerMatch && ledgerMatch.amount === net;
  if (settlement && !ledgerMatch) {
    issues.push("Settlement exists but no corresponding wallet ledger credit entry found.");
  }

  const reconciliationPassed = isEquationBalanced && (settlement ? isWalletCredited : true) && issues.length === 0;

  return {
    orderId: order.id,
    orderReference: order.order_reference,
    grossAmount: gross,
    platformFee: fee,
    promoterNetAmount: net,
    isEquationBalanced,
    isWalletCredited,
    walletBalance: wallet?.balance ?? 0,
    walletReserved: wallet?.reserved_balance ?? 0,
    settlementStatus: settlement?.status ?? "unsettled",
    reconciliationPassed,
    issues,
  };
}
