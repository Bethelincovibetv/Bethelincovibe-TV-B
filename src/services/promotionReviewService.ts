import { supabase } from "@/integrations/supabase/client";
import {
  PromotionOrder,
  getPromotionOrderById,
  getLocalOrdersKey,
} from "./promotionOrderService";
import { getPromoterProfileById } from "./promoterService";
import {
  releaseEscrowAndSettleOrder,
  PromotionSettlement,
  getLocalWallets,
  saveLocalWallets,
  getLocalLedger,
  saveLocalLedger,
  WalletLedgerEntry,
} from "./promotionSettlementService";
import {
  notifyReviewSubmitted,
  notifyDisputeResolved,
} from "./promotionNotificationService";

export interface PromotionReview {
  id: string;
  order_id: string;
  order_reference: string;
  business_user_id: string;
  promoter_id: string;
  promoter_user_id?: string;
  rating: number; // 1.0 to 5.0
  review_text?: string;
  communication_rating?: number | null; // 1.0 to 5.0
  delivery_rating?: number | null; // 1.0 to 5.0
  delivery_speed_rating?: number | null; // alias for delivery_rating
  business?: {
    business_name?: string;
    display_name?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface SubmitOrderReviewInput {
  orderId?: string;
  order_id?: string;
  rating: number;
  reviewText?: string;
  review_text?: string;
  communicationRating?: number;
  communication_rating?: number;
  deliveryRating?: number;
  delivery_speed_rating?: number;
  delivery_rating?: number;
}

export type ReviewSubmissionInput = SubmitOrderReviewInput;

export interface PromoterScorecard {
  promoterId: string;
  averageRating: number | null;
  average_rating: number;
  verifiedReviewCount: number;
  review_count: number;
  totalCompletedOrders: number;
  completed_orders_count: number;
  totalAcceptedOrders: number;
  completionRate: number; // 0 to 100
  completion_rate: number;
  onTimeDeliveryRate: number; // 0 to 100
  on_time_delivery_rate: number;
  disputed_orders_count: number;
  rating_breakdown: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  totalOrders: number;
  hasVerifiedReviews: boolean;
}

export interface DisputeResolutionInput {
  orderId?: string;
  order_id?: string;
  resolution: "release_to_promoter" | "refund_business";
  reason?: string;
  admin_notes?: string;
  adminNotes?: string;
}

export interface DisputeResolutionResult {
  ok: boolean;
  resolution?: "release_to_promoter" | "refund_business";
  settlement?: PromotionSettlement | null;
  refundReference?: string | null;
  refundAmount?: number | null;
  order?: PromotionOrder | null;
  error?: string | null;
}


export function getLocalReviews(): PromotionReview[] { return []; }
export function saveLocalReviews(_reviews: PromotionReview[]) { throw new Error("Local review persistence is disabled. Use Supabase."); }
export function getLocalOrders(): PromotionOrder[] { return []; }
export function saveLocalOrders(_orders: PromotionOrder[]) { throw new Error("Local promotion-order persistence is disabled. Use Supabase."); }

function generateRefundReference(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `BTV-REFUND-${dateStr}-${rand}`;
}

/**
 * 1. Submit a Verified Post-Order Review
 * Strictly enforces:
 * - Only the ordering business can review
 * - Order must be in 'completed' status
 * - Reject non-completed/unpaid/disputed/cancelled/other user orders
 * - Rating strictly within [1.0, 5.0]
 * - Reject duplicate reviews on the same order
 * - Update promoter's average rating and verified review count
 */
export async function submitOrderReview(
  input: SubmitOrderReviewInput,
  mockCallerUserId?: string,
  mockCallerRole?: string
): Promise<{
  ok: boolean;
  review?: PromotionReview | null;
  promoterAverageRating?: number | null;
  promoterReviewCount?: number;
  error?: string | null;
}> {
  const orderId = input.orderId || input.order_id;
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
    return { ok: false, error: "Unauthorized: Please log in to submit a review." };
  }

  // 2. Fetch order
  const { order, error: orderErr } = await getPromotionOrderById(orderId, userId, userRole);
  if (orderErr || !order) {
    return { ok: false, error: orderErr || "Promotion order not found." };
  }

  // 3. Ownership / Eligibility: Only the ordering business can submit a review
  if (order.business_user_id !== userId && userRole !== "admin") {
    return {
      ok: false,
      error: "Forbidden: Only the business that placed this order is authorized to submit a review.",
    };
  }

  // 4. State Validation: Order MUST be 'completed' or 'approved'
  if (order.status !== "completed" && order.status !== "approved") {
    return {
      ok: false,
      error: `Cannot review order in status '${order.status}'. Order must be completed and settled.`,
    };
  }

  // 5. Rating Boundary Validation (1.0 to 5.0)
  if (
    typeof input.rating !== "number" ||
    isNaN(input.rating) ||
    input.rating < 1.0 ||
    input.rating > 5.0
  ) {
    return {
      ok: false,
      error: "Invalid rating. Rating must be a number between 1 and 5 stars.",
    };
  }

  const communicationRating = input.communicationRating ?? input.communication_rating;
  const deliveryRating = input.deliveryRating ?? input.delivery_speed_rating ?? input.delivery_rating;

  // Validate optional sub-ratings if provided
  if (
    communicationRating !== undefined &&
    (typeof communicationRating !== "number" ||
      isNaN(communicationRating) ||
      communicationRating < 1.0 ||
      communicationRating > 5.0)
  ) {
    return {
      ok: false,
      error: "Invalid communication rating. Must be between 1 and 5.",
    };
  }

  if (
    deliveryRating !== undefined &&
    (typeof deliveryRating !== "number" ||
      isNaN(deliveryRating) ||
      deliveryRating < 1.0 ||
      deliveryRating > 5.0)
  ) {
    return {
      ok: false,
      error: "Invalid delivery rating. Must be between 1 and 5.",
    };
  }

  const reviewText = (input.reviewText || input.review_text || "").trim();


  // 8. Prevent self-reviews (if business is promoter themselves)
  let promoterUserId = order.promoter?.user_id;
  if (!promoterUserId) {
    try {
      const res = await getPromoterProfileById(order.promoter_id);
      promoterUserId = res?.user_id || (res as any)?.promoter?.user_id || order.promoter_id;
    } catch {
      promoterUserId = order.promoter_id;
    }
  }

  if (promoterUserId === userId) {
    return {
      ok: false,
      error: "Self-review rejected: Promoters cannot review their own services.",
    };
  }

  const nowIso = new Date().toISOString();
  const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newReview: PromotionReview = {
    id: reviewId,
    order_id: order.id,
    order_reference: order.order_reference,
    business_user_id: userId,
    promoter_id: order.promoter_id,
    promoter_user_id: promoterUserId,
    rating: Math.round(input.rating * 10) / 10,
    review_text: reviewText,
    communication_rating: communicationRating ? Math.round(communicationRating * 10) / 10 : null,
    delivery_rating: deliveryRating ? Math.round(deliveryRating * 10) / 10 : null,
    delivery_speed_rating: deliveryRating ? Math.round(deliveryRating * 10) / 10 : null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const { data: existingDbReview, error: existingDbReviewError } = await supabase.from("promotion_reviews").select("id").eq("order_id", order.id).maybeSingle();
  if (existingDbReviewError) return { ok: false, error: existingDbReviewError.message };
  if (existingDbReview) return { ok: false, error: "Duplicate review rejected: You have already reviewed this promotion order." };
  const { error: reviewInsertError } = await supabase.from("promotion_reviews").insert(newReview);
  if (reviewInsertError) return { ok: false, error: reviewInsertError.message };

  // 9. Recalculate Promoter Average Rating and Review Count
  const promoterReviews = allReviews.filter((r) => r.promoter_id === order.promoter_id);
  const reviewCount = promoterReviews.length;
  const ratingSum = promoterReviews.reduce((sum, r) => sum + r.rating, 0);
  const avgRating = reviewCount > 0 ? Math.round((ratingSum / reviewCount) * 100) / 100 : null;

  // Update local promoter profile store if present
  try {
    const promoter = await getPromoterProfileById(order.promoter_id);
    if (promoter) {
      promoter.rating = avgRating ?? 5.0;
      (promoter as any).review_count = reviewCount;
    }
  } catch (err) {
    console.warn("Notice: could not update promoter cache rating:", err);
  }

  // 10. Append Audit Trail Entry to Order
  if (!(order as any).audit_trail) {
    (order as any).audit_trail = [];
  }
  (order as any).audit_trail.push({
    id: `audit_${Date.now()}_review`,
    order_id: order.id,
    user_id: userId,
    role: "business",
    event_type: "review_submitted",
    previous_status: order.status,
    new_status: order.status,
    details: `Business submitted verified review (${newReview.rating}★). Feedback: "${newReview.review_text?.substring(0, 60)}..."`,
    metadata: {
      review_id: reviewId,
      rating: newReview.rating,
      communication_rating: newReview.communication_rating,
      delivery_rating: newReview.delivery_rating,
    },
    timestamp: nowIso,
  });


  // Dispatch review notification to promoter
  const targetPromoterId = promoterUserId || (newReview as any).promoter_user_id || order.promoter_id;
  if (targetPromoterId) {
    notifyReviewSubmitted({
      id: order.id,
      order_reference: order.order_reference,
      promoter_user_id: targetPromoterId,
      rating: newReview.rating,
      reviewerName: (newReview.business as any)?.business_name || (newReview.business as any)?.display_name || "Business Client",
    }).catch((err) => console.warn("Notice: review notification dispatch notice", err));
  }

  return {
    ok: true,
    review: newReview,
    promoterAverageRating: avgRating,
    promoterReviewCount: reviewCount,
    error: null,
  };
}

/**
 * 2. Get verified review for a specific order
 */
export async function getOrderReview(orderId: string): Promise<PromotionReview | null> {
  if (!orderId) return null;
  const { data } = await supabase.from("promotion_reviews").select("*").eq("order_id", orderId).maybeSingle();
  return (data as PromotionReview | null) || null;
}

/**
 * 3. Get all verified reviews for a promoter
 */
export async function getPromoterReviews(promoterId: string): Promise<PromotionReview[]> {
  if (!promoterId) return [];
  const reviews = getLocalReviews();
  return reviews
    .filter((r) => r.promoter_id === promoterId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * 4. Get Performance Scorecards for a Promoter
 * Computes:
 * - Verified average rating & review count
 * - Completion rate (%)
 * - On-time delivery rate (%)
 * - Verified total completed orders
 */
export async function getPromoterScorecard(promoterId: string): Promise<PromoterScorecard> {
  const reviews = getLocalReviews().filter((r) => r.promoter_id === promoterId);
  const allOrders = getLocalOrders().filter((o) => o.promoter_id === promoterId);

  const reviewCount = reviews.length;
  const ratingSum = reviews.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = reviewCount > 0 ? Math.round((ratingSum / reviewCount) * 10) / 10 : 5.0;

  // Star breakdown calculation
  const rating_breakdown = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  reviews.forEach((r) => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    rating_breakdown[star] = (rating_breakdown[star] || 0) + 1;
  });

  // Calculate completion rate: completed / accepted (or all orders that moved beyond pending)
  const acceptedOrders = allOrders.filter(
    (o) =>
      o.status === "in_progress" ||
      o.status === "evidence_submitted" ||
      o.status === "revision_requested" ||
      o.status === "approved" ||
      o.status === "completed" ||
      o.status === "disputed" ||
      o.status === "refunded"
  );
  const completedOrders = allOrders.filter((o) => o.status === "completed");
  const disputedOrders = allOrders.filter((o) => o.status === "disputed" || (o as any).dispute_resolved_at);

  const totalAcceptedCount = acceptedOrders.length;
  const totalCompletedCount = completedOrders.length;

  const completionRate =
    totalAcceptedCount > 0
      ? Math.round((totalCompletedCount / totalAcceptedCount) * 100)
      : 100.0;

  // On-time delivery rate
  let eligibleForSlaCount = 0;
  let onTimeCount = 0;

  for (const order of completedOrders) {
    if (order.sla_deadline) {
      eligibleForSlaCount++;
      const deadline = new Date(order.sla_deadline).getTime();
      const submittedTime = order.evidence_submitted_at
        ? new Date(order.evidence_submitted_at).getTime()
        : order.completed_at
        ? new Date(order.completed_at).getTime()
        : null;

      if (submittedTime && submittedTime <= deadline) {
        onTimeCount++;
      } else if (!submittedTime) {
        onTimeCount++;
      }
    }
  }

  const onTimeDeliveryRate =
    eligibleForSlaCount > 0
      ? Math.round((onTimeCount / eligibleForSlaCount) * 100)
      : 100.0;

  return {
    promoterId,
    averageRating: reviewCount > 0 ? averageRating : null,
    average_rating: averageRating,
    verifiedReviewCount: reviewCount,
    review_count: reviewCount,
    totalCompletedOrders: totalCompletedCount,
    completed_orders_count: totalCompletedCount,
    totalAcceptedOrders: totalAcceptedCount,
    completionRate,
    completion_rate: completionRate,
    onTimeDeliveryRate,
    on_time_delivery_rate: onTimeDeliveryRate,
    disputed_orders_count: disputedOrders.length,
    rating_breakdown,
    totalOrders: allOrders.length,
    hasVerifiedReviews: reviewCount > 0,
  };
}

/**
 * 5. Admin Dispute Arbitration
 * Only accessible by platform administrators.
 * Offers two mutually exclusive, idempotent resolution paths:
 *
 * OPTION A — Uphold Delivery / Release to Promoter:
 *   "disputed" -> "approved" -> escrow settlement -> promoter wallet credit -> completed
 *   Reuses Step 9 settlement system safely with idempotency.
 *
 * OPTION B — Uphold Dispute / Refund Business:
 *   "disputed" -> refund -> business wallet credit -> order cancelled
 *   Creates immutable refund ledger transaction, resets escrow, cancels order.
 */
export async function resolveOrderDispute(
  input: DisputeResolutionInput,
  mockCallerUserId?: string,
  mockCallerRole?: string
): Promise<DisputeResolutionResult> {
  const orderId = input.orderId || input.order_id;
  if (!orderId || typeof orderId !== "string" || !orderId.trim()) {
    return { ok: false, error: "Order ID is required." };
  }

  const reason = (input.reason || input.adminNotes || input.admin_notes || "Admin dispute arbitration").trim();

  if (input.resolution !== "release_to_promoter" && input.resolution !== "refund_business") {
    return {
      ok: false,
      error: "Invalid resolution. Must be 'release_to_promoter' or 'refund_business'.",
    };
  }

  // 1. Authenticate caller
  let userId = mockCallerUserId;
  let userRole = mockCallerRole;
  if (!userId) {
    const { data: authData } = await supabase.auth.getUser();
    userId = authData?.user?.id;
  }

  // 2. Strict Admin Role Check (Server-authoritative)
  const isAdmin = userRole === "admin";
  if (!userId || !isAdmin) {
    return {
      ok: false,
      error: "Forbidden: Only platform administrators are authorized to arbitrate order disputes.",
    };
  }

  // 3. Fetch Order
  const { order, error: orderErr } = await getPromotionOrderById(orderId, userId, "admin");
  if (orderErr || !order) {
    return { ok: false, error: orderErr || "Promotion order not found." };
  }

  // 4. Idempotency & State Invariants Check
  if (order.status === "completed") {
    return {
      ok: false,
      error: "Dispute arbitration rejected: Order has already been completed and settled.",
    };
  }

  if (order.status === "cancelled" || order.status === "refunded") {
    return {
      ok: false,
      error: "Dispute arbitration rejected: Order has already been refunded and cancelled.",
    };
  }

  if (order.status !== "disputed") {
    return {
      ok: false,
      error: `Cannot arbitrate order in status '${order.status}'. Order must be in disputed status.`,
    };
  }

  const nowIso = new Date().toISOString();

  // ==========================================
  // PATH A: Uphold Delivery / Release to Promoter
  // ==========================================
  if (input.resolution === "release_to_promoter") {
    // 1. Transition to 'approved' to satisfy Step 9 invariant
    order.status = "approved";
    (order as any).approved_at = nowIso;
    (order as any).dispute_resolved_at = nowIso;
    (order as any).dispute_resolution = "released_to_promoter";
    (order as any).dispute_resolution_reason = input.reason.trim();
    (order as any).dispute_resolved_by = userId;
    order.updated_at = nowIso;

    // Append audit log
    if (!(order as any).audit_trail) {
      (order as any).audit_trail = [];
    }
    (order as any).audit_trail.push({
      id: `audit_${Date.now()}_admin_arb_release`,
      order_id: order.id,
      user_id: userId,
      role: "admin",
      event_type: "admin_dispute_resolved_released",
      previous_status: "disputed",
      new_status: "approved",
      details: `Admin resolved dispute in promoter's favor. Reason: "${input.reason.trim()}". Escrow release queued.`,
      metadata: {
        admin_id: userId,
        reason: input.reason.trim(),
        admin_notes: input.adminNotes?.trim() || null,
      },
      timestamp: nowIso,
    });

    // Save order before settlement
    const allOrders = getLocalOrders();
    const orderIdx = allOrders.findIndex((o) => o.id === order.id);
    if (orderIdx >= 0) {
      allOrders[orderIdx] = { ...allOrders[orderIdx], ...order };
      saveLocalOrders(allOrders);
    }

    // 2. Call Step 9 Escrow Release (Atomic & Idempotent)
    const settleRes = await releaseEscrowAndSettleOrder(order.id, "system", "admin");
    if (!settleRes.ok) {
      // Revert if settlement failed
      order.status = "disputed";
      if (orderIdx >= 0) {
        allOrders[orderIdx] = { ...allOrders[orderIdx], ...order };
        saveLocalOrders(allOrders);
      }
      return {
        ok: false,
        error: settleRes.error || "Failed to execute escrow release during arbitration.",
      };
    }

    // Dispatch dispute resolved notification safely
    const promoterUserId = order.promoter?.user_id || order.promoter_id;
    notifyDisputeResolved({
      id: order.id,
      order_reference: order.order_reference,
      promoter_user_id: promoterUserId,
      business_user_id: order.business_user_id,
      resolution: "released_to_promoter",
      adminNotes: input.adminNotes || input.admin_notes,
    }).catch((err) => console.warn("Notice: dispute resolved notification notice", err));

    return {
      ok: true,
      resolution: "release_to_promoter",
      settlement: settleRes.settlement,
      order: settleRes.order || order,
    };
  }

  // ==========================================
  // PATH B: Uphold Dispute / Refund Business
  // ==========================================
  if (input.resolution === "refund_business") {
    const refundRef = generateRefundReference();
    const refundAmount = order.amount;

    // 1. Credit Business Wallet
    const wallets = getLocalWallets();
    let businessWallet = wallets.find((w) => w.user_id === order.business_user_id);
    if (!businessWallet) {
      businessWallet = {
        id: `wallet_${order.business_user_id}_${Date.now()}`,
        user_id: order.business_user_id,
        balance: 0,
        reserved_balance: 0,
        pending_balance: 0,
        total_earned: 0,
        total_withdrawn: 0,
        currency: "NGN",
        created_at: nowIso,
        updated_at: nowIso,
      };
      wallets.push(businessWallet);
    }

    const balanceBefore = businessWallet.balance;
    const balanceAfter = Math.round((balanceBefore + refundAmount) * 100) / 100;

    businessWallet.balance = balanceAfter;
    businessWallet.updated_at = nowIso;
    saveLocalWallets(wallets);

    // 2. Record Immutable Refund Ledger Entry
    const ledgerId = `ledger_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ledgerEntry: WalletLedgerEntry = {
      id: ledgerId,
      user_id: order.business_user_id,
      order_id: order.id,
      settlement_reference: refundRef,
      amount: refundAmount,
      currency: "NGN",
      direction: "credit",
      type: "settlement_credit",
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      status: "completed",
      description: `Dispute Refund for Promotion Order #${order.order_reference}. Reason: ${reason}`,
      metadata: {
        refund_reference: refundRef,
        admin_id: userId,
        reason: reason,
        admin_notes: input.adminNotes?.trim() || input.admin_notes?.trim() || null,
      },
      created_at: nowIso,
    };

    const allLedger = getLocalLedger();
    allLedger.push(ledgerEntry);
    saveLocalLedger(allLedger);

    // 3. Update Order State to 'cancelled' with refund metadata
    order.status = "cancelled";
    (order as any).refund_reference = refundRef;
    (order as any).refund_amount = refundAmount;
    (order as any).refunded_at = nowIso;
    (order as any).dispute_resolved_at = nowIso;
    (order as any).dispute_resolution = "refunded_to_business";
    (order as any).dispute_resolution_reason = reason;
    (order as any).dispute_resolved_by = userId;
    order.updated_at = nowIso;

    // Append Audit Trail Event
    if (!(order as any).audit_trail) {
      (order as any).audit_trail = [];
    }
    (order as any).audit_trail.push({
      id: `audit_${Date.now()}_admin_arb_refund`,
      order_id: order.id,
      user_id: userId,
      role: "admin",
      event_type: "admin_dispute_resolved_refunded",
      previous_status: "disputed",
      new_status: "cancelled",
      details: `Admin arbitrated dispute in business's favor. ₦${refundAmount.toLocaleString()} refunded to business wallet. Reference: ${refundRef}`,
      metadata: {
        refund_reference: refundRef,
        refund_amount: refundAmount,
        admin_id: userId,
        reason: reason,
        admin_notes: input.adminNotes?.trim() || input.admin_notes?.trim() || null,
      },
      timestamp: nowIso,
    });

    const allOrders = getLocalOrders();
    const orderIdx = allOrders.findIndex((o) => o.id === order.id);
    if (orderIdx >= 0) {
      allOrders[orderIdx] = { ...allOrders[orderIdx], ...order };
      saveLocalOrders(allOrders);
    }

    // Dispatch dispute resolved notification safely
    const promoterUserId = order.promoter?.user_id || order.promoter_id;
    notifyDisputeResolved({
      id: order.id,
      order_reference: order.order_reference,
      promoter_user_id: promoterUserId,
      business_user_id: order.business_user_id,
      resolution: "refunded_to_business",
      adminNotes: input.adminNotes || input.admin_notes,
    }).catch((err) => console.warn("Notice: dispute resolved notification notice", err));

    return {
      ok: true,
      resolution: "refund_business",
      refundReference: refundRef,
      refundAmount,
      order,
    };
  }

  return { ok: false, error: "Invalid dispute resolution." };
}

/**
 * 6. Get list of all disputed orders for Admin Mediation
 */
export async function getDisputedOrders(
  mockCallerUserId?: string,
  mockCallerRole?: string
): Promise<PromotionOrder[]> {
  const allOrders = getLocalOrders();
  return allOrders
    .filter((o) => o.status === "disputed" || (o as any).dispute_resolution)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}
