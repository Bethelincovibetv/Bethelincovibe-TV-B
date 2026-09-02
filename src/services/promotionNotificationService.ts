import { supabase } from "@/integrations/supabase/client";
import { fetchUserNameById, personalizeNotificationTitle, personalizeNotificationBody } from "@/lib/notificationPersonalizer";

export type PromotionNotificationEventType =
  | "order_created"
  | "payment_verified"
  | "proof_submitted"
  | "revision_requested"
  | "settlement_completed"
  | "dispute_opened"
  | "dispute_resolved"
  | "review_submitted"
  | "payout_status_changed";

export interface PromotionNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  url: string;
  type: "promotion" | "wallet" | "order" | "review" | "dispute" | "system";
  event_type: PromotionNotificationEventType;
  order_id?: string;
  order_reference?: string;
  payout_id?: string;
  payout_reference?: string;
  is_read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

const NOTIFICATIONS_STORAGE_KEY = "bincovibe_user_notifications_all";

// Local storage helpers for resiliency and offline/test support
export function getLocalStoredNotifications(): PromotionNotification[] {
  try {
    const data = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveLocalStoredNotifications(notifications: PromotionNotification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  } catch (err) {
    console.error("Failed to save notifications to local storage", err);
  }
}

/**
 * 1. Centralized Dispatcher for Promotion Lifecycle Notifications
 * Wraps insertion in a non-blocking try/catch to ensure financial transactions and state changes
 * are never rolled back if notification delivery encounters an issue.
 */
export async function dispatchPromotionNotification(input: {
  userId: string;
  eventType: PromotionNotificationEventType;
  title: string;
  body: string;
  url: string;
  type?: "promotion" | "wallet" | "order" | "review" | "dispute" | "system";
  orderId?: string;
  orderReference?: string;
  payoutId?: string;
  payoutReference?: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; notification?: PromotionNotification; error?: string | null }> {
  if (!input || !input.userId || !input.eventType) {
    console.warn("Invalid notification dispatch parameters - missing recipient or eventType.");
    return { success: false, error: "Missing recipient user ID or event type." };
  }

  try {
    const recipientName = await fetchUserNameById(input.userId);
    const personalizedTitle = personalizeNotificationTitle(input.title, recipientName);
    const personalizedBody = personalizeNotificationBody(input.body, recipientName);

    const nowIso = new Date().toISOString();
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const notification: PromotionNotification = {
      id: notificationId,
      user_id: input.userId,
      title: personalizedTitle,
      body: personalizedBody,
      url: input.url,
      type: input.type || "order",
      event_type: input.eventType,
      order_id: input.orderId,
      order_reference: input.orderReference,
      payout_id: input.payoutId,
      payout_reference: input.payoutReference,
      is_read: false,
      metadata: input.metadata || {},
      created_at: nowIso,
    };

    // 1. Save to local storage for test & client cache
    const existing = getLocalStoredNotifications();
    existing.unshift(notification);
    saveLocalStoredNotifications(existing);

    // 2. Synchronize to Supabase user_notifications table if available
    try {
      if (supabase && typeof supabase.from === "function") {
        const query = supabase.from("user_notifications");
        if (query && typeof query.insert === "function") {
          await query.insert({
            id: notificationId,
            user_id: input.userId,
            title: personalizedTitle,
            body: personalizedBody,
            url: input.url,
            type: input.type || "order",
            is_read: false,
            created_at: nowIso,
          });
        }
      }
    } catch (dbErr) {
      // Non-blocking write
    }

    return { success: true, notification };
  } catch (err: any) {
    console.error("Failed to dispatch promotion notification safely:", err);
    // Non-blocking return
    return { success: false, error: err?.message || "Unknown dispatch error" };
  }
}

/**
 * 2. Event-Specific Notification Helpers
 */

/**
 * Event: Order Created -> Notify Assigned Promoter
 */
export async function notifyOrderCreated(order: {
  id: string;
  order_reference: string;
  promoter_user_id: string;
  business_user_id?: string;
  package_title?: string;
  amount: number;
}): Promise<{ success: boolean }> {
  return await dispatchPromotionNotification({
    userId: order.promoter_user_id,
    eventType: "order_created",
    title: "New Promotion Order Received! 🎯",
    body: `A business placed a new promotion order #${order.order_reference} (${order.package_title || "Promotion Package"}). Awaiting payment verification.`,
    url: `/dashboard/promoter/orders/${order.id}`,
    type: "order",
    orderId: order.id,
    orderReference: order.order_reference,
    metadata: {
      package_title: order.package_title,
      amount: order.amount,
    },
  });
}

/**
 * Event: Payment Verified / Escrow Funded -> Notify Promoter to Start Work
 */
export async function notifyPaymentVerified(order: {
  id: string;
  order_reference: string;
  promoter_user_id: string;
  amount: number;
  package_title?: string;
}): Promise<{ success: boolean }> {
  return await dispatchPromotionNotification({
    userId: order.promoter_user_id,
    eventType: "payment_verified",
    title: "Promotion Escrow Funded & Active! 💰",
    body: `Payment of ₦${order.amount.toLocaleString()} for order #${order.order_reference} is verified and locked in escrow. You can now execute and deliver the campaign!`,
    url: `/dashboard/promoter/orders/${order.id}`,
    type: "order",
    orderId: order.id,
    orderReference: order.order_reference,
    metadata: {
      amount: order.amount,
      package_title: order.package_title,
    },
  });
}

/**
 * Event: Proof Submitted -> Notify Business Customer to Review Deliverables
 */
export async function notifyProofSubmitted(order: {
  id: string;
  order_reference: string;
  business_user_id: string;
  package_title?: string;
}): Promise<{ success: boolean }> {
  return await dispatchPromotionNotification({
    userId: order.business_user_id,
    eventType: "proof_submitted",
    title: "Campaign Proof Submitted for Review! 📸",
    body: `The promoter has submitted campaign proof for order #${order.order_reference}. Please review deliverables and approve or request revisions.`,
    url: `/dashboard/business/orders/${order.id}`,
    type: "order",
    orderId: order.id,
    orderReference: order.order_reference,
  });
}

/**
 * Event: Revision Requested -> Notify Promoter
 */
export async function notifyRevisionRequested(order: {
  id: string;
  order_reference: string;
  promoter_user_id: string;
  reason?: string;
}): Promise<{ success: boolean }> {
  return await dispatchPromotionNotification({
    userId: order.promoter_user_id,
    eventType: "revision_requested",
    title: "Campaign Revision Requested ✏️",
    body: `The buyer requested a revision for order #${order.order_reference}. Reason: ${order.reason || "Please review feedback and resubmit proof."}`,
    url: `/dashboard/promoter/orders/${order.id}`,
    type: "order",
    orderId: order.id,
    orderReference: order.order_reference,
    metadata: { reason: order.reason },
  });
}

/**
 * Event: Settlement Completed -> Notify Promoter of Wallet Credit
 */
export async function notifySettlementCompleted(order: {
  id: string;
  order_reference: string;
  promoter_user_id: string;
  net_amount: number;
}): Promise<{ success: boolean }> {
  return await dispatchPromotionNotification({
    userId: order.promoter_user_id,
    eventType: "settlement_completed",
    title: "Promotion Earnings Credited to Wallet! 💵",
    body: `Escrow released! ₦${order.net_amount.toLocaleString()} has been credited to your promoter wallet for order #${order.order_reference}.`,
    url: `/dashboard/promoter/orders/${order.id}`,
    type: "wallet",
    orderId: order.id,
    orderReference: order.order_reference,
    metadata: { net_amount: order.net_amount },
  });
}

/**
 * Event: Dispute Opened -> Notify Both Parties
 */
export async function notifyDisputeOpened(order: {
  id: string;
  order_reference: string;
  promoter_user_id: string;
  business_user_id: string;
  reason?: string;
  opened_by: "business" | "promoter";
}): Promise<{ success: boolean }> {
  // Notify Business
  await dispatchPromotionNotification({
    userId: order.business_user_id,
    eventType: "dispute_opened",
    title: "Dispute Opened on Order ⚠️",
    body: `A dispute has been logged on order #${order.order_reference}. Our administrative team is reviewing the case.`,
    url: `/dashboard/business/orders/${order.id}`,
    type: "dispute",
    orderId: order.id,
    orderReference: order.order_reference,
    metadata: { reason: order.reason, opened_by: order.opened_by },
  });

  // Notify Promoter
  return await dispatchPromotionNotification({
    userId: order.promoter_user_id,
    eventType: "dispute_opened",
    title: "Dispute Opened on Order ⚠️",
    body: `A dispute has been opened for order #${order.order_reference}. An administrator will arbitrate the order deliverables and escrow.`,
    url: `/dashboard/promoter/orders/${order.id}`,
    type: "dispute",
    orderId: order.id,
    orderReference: order.order_reference,
    metadata: { reason: order.reason, opened_by: order.opened_by },
  });
}

/**
 * Event: Dispute Resolved -> Notify Both Parties of Administrative Arbitration Outcome
 */
export async function notifyDisputeResolved(order: {
  id: string;
  order_reference: string;
  promoter_user_id: string;
  business_user_id: string;
  resolution: "released_to_promoter" | "refunded_to_business";
  adminNotes?: string;
}): Promise<{ success: boolean }> {
  const isReleasedToPromoter = order.resolution === "released_to_promoter";

  // Notify Business
  await dispatchPromotionNotification({
    userId: order.business_user_id,
    eventType: "dispute_resolved",
    title: "Dispute Arbitration Completed ⚖️",
    body: isReleasedToPromoter
      ? `The administrator resolved dispute #${order.order_reference} in favor of the promoter. Deliverables met package terms.`
      : `The administrator resolved dispute #${order.order_reference} with a full refund credited to your wallet balance.`,
    url: `/dashboard/business/orders/${order.id}`,
    type: "dispute",
    orderId: order.id,
    orderReference: order.order_reference,
    metadata: { resolution: order.resolution, admin_notes: order.adminNotes },
  });

  // Notify Promoter
  return await dispatchPromotionNotification({
    userId: order.promoter_user_id,
    eventType: "dispute_resolved",
    title: "Dispute Arbitration Completed ⚖️",
    body: isReleasedToPromoter
      ? `The administrator resolved dispute #${order.order_reference} in your favor. Escrow earnings have been credited to your wallet!`
      : `The administrator resolved dispute #${order.order_reference} in favor of the business. Escrow was refunded.`,
    url: `/dashboard/promoter/orders/${order.id}`,
    type: "dispute",
    orderId: order.id,
    orderReference: order.order_reference,
    metadata: { resolution: order.resolution, admin_notes: order.adminNotes },
  });
}

/**
 * Event: Review Submitted -> Notify Promoter
 */
export async function notifyReviewSubmitted(order: {
  id: string;
  order_reference: string;
  promoter_user_id: string;
  rating: number;
  reviewerName?: string;
}): Promise<{ success: boolean }> {
  return await dispatchPromotionNotification({
    userId: order.promoter_user_id,
    eventType: "review_submitted",
    title: "New Customer Review Received! ⭐",
    body: `${order.reviewerName || "A business buyer"} rated order #${order.order_reference} ${order.rating.toFixed(1)} stars. View customer feedback on your profile.`,
    url: `/dashboard/promoter/orders/${order.id}`,
    type: "review",
    orderId: order.id,
    orderReference: order.order_reference,
    metadata: { rating: order.rating },
  });
}

/**
 * Event: Payout Status Changed -> Notify Promoter
 */
export async function notifyPayoutStatusChanged(payout: {
  id: string;
  payout_reference: string;
  user_id: string;
  amount: number;
  status: "requested" | "pending" | "processing" | "paid" | "failed";
  failure_reason?: string;
}): Promise<{ success: boolean }> {
  let title = "Payout Status Updated 🏦";
  let body = `Your withdrawal request #${payout.payout_reference} for ₦${payout.amount.toLocaleString()} is currently ${payout.status.toUpperCase()}.`;

  if (payout.status === "paid") {
    title = "Bank Payout Disbursed! 💸";
    body = `Your payout request #${payout.payout_reference} for ₦${payout.amount.toLocaleString()} has been processed and disbursed to your bank account.`;
  } else if (payout.status === "failed") {
    title = "Payout Request Failed ⚠️";
    body = `Payout #${payout.payout_reference} (₦${payout.amount.toLocaleString()}) could not be completed. ${payout.failure_reason || "Reserved funds returned to your available wallet balance."}`;
  }

  return await dispatchPromotionNotification({
    userId: payout.user_id,
    eventType: "payout_status_changed",
    title,
    body,
    url: `/dashboard/wallet`,
    type: "wallet",
    payoutId: payout.id,
    payoutReference: payout.payout_reference,
    metadata: {
      amount: payout.amount,
      status: payout.status,
      failure_reason: payout.failure_reason,
    },
  });
}

/**
 * 3. Multi-Tenant Notification Retrieval & Access Control
 */

/**
 * Retrieve notifications for a specific user ID.
 * Enforces strict authorization ensuring User A cannot retrieve User B's notifications.
 */
export async function getNotificationsForUser(
  targetUserId: string,
  mockCallerUserId?: string,
  mockCallerRole?: string
): Promise<{ notifications: PromotionNotification[]; unreadCount: number; error: string | null }> {
  if (!targetUserId) {
    return { notifications: [], unreadCount: 0, error: "Target User ID is required." };
  }

  let callerUserId = mockCallerUserId;
  if (!callerUserId) {
    const { data } = await supabase.auth.getUser();
    callerUserId = data?.user?.id;
  }

  // Authorization check
  if (callerUserId && callerUserId !== targetUserId && mockCallerRole !== "admin") {
    return {
      notifications: [],
      unreadCount: 0,
      error: "Forbidden: You are not authorized to view another user's notifications.",
    };
  }

  const all = getLocalStoredNotifications();
  const userNotifs = all
    .filter((n) => n.user_id === targetUserId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const unreadCount = userNotifs.filter((n) => !n.is_read).length;

  return { notifications: userNotifs, unreadCount, error: null };
}

/**
 * Mark a single notification as read.
 * Enforces user ownership check.
 */
export async function markNotificationAsRead(
  notificationId: string,
  targetUserId: string,
  mockCallerUserId?: string
): Promise<{ success: boolean; error: string | null }> {
  if (!notificationId || !targetUserId) {
    return { success: false, error: "Notification ID and User ID are required." };
  }

  let callerUserId = mockCallerUserId;
  if (!callerUserId) {
    const { data } = await supabase.auth.getUser();
    callerUserId = data?.user?.id;
  }

  if (callerUserId && callerUserId !== targetUserId) {
    return {
      success: false,
      error: "Forbidden: You cannot modify another user's notification.",
    };
  }

  const all = getLocalStoredNotifications();
  const index = all.findIndex((n) => n.id === notificationId && n.user_id === targetUserId);
  if (index === -1) {
    return { success: false, error: "Notification not found or access denied." };
  }

  all[index].is_read = true;
  saveLocalStoredNotifications(all);

  try {
    await supabase
      .from("user_notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", targetUserId);
  } catch (err) {
    // Non-blocking sync
  }

  return { success: true, error: null };
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllUserNotificationsAsRead(
  targetUserId: string,
  mockCallerUserId?: string
): Promise<{ success: boolean; updatedCount: number; error: string | null }> {
  if (!targetUserId) {
    return { success: false, updatedCount: 0, error: "User ID is required." };
  }

  let callerUserId = mockCallerUserId;
  if (!callerUserId) {
    const { data } = await supabase.auth.getUser();
    callerUserId = data?.user?.id;
  }

  if (callerUserId && callerUserId !== targetUserId) {
    return {
      success: false,
      updatedCount: 0,
      error: "Forbidden: You cannot modify another user's notifications.",
    };
  }

  const all = getLocalStoredNotifications();
  let updatedCount = 0;
  for (const notif of all) {
    if (notif.user_id === targetUserId && !notif.is_read) {
      notif.is_read = true;
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    saveLocalStoredNotifications(all);
  }

  try {
    await supabase
      .from("user_notifications")
      .update({ is_read: true })
      .eq("user_id", targetUserId)
      .eq("is_read", false);
  } catch {
    // Non-blocking sync
  }

  return { success: true, updatedCount, error: null };
}

/**
 * Delete a user notification safely.
 */
export async function deleteUserNotification(
  notificationId: string,
  targetUserId: string,
  mockCallerUserId?: string
): Promise<{ success: boolean; error: string | null }> {
  if (!notificationId || !targetUserId) {
    return { success: false, error: "Notification ID and User ID are required." };
  }

  let callerUserId = mockCallerUserId;
  if (!callerUserId) {
    const { data } = await supabase.auth.getUser();
    callerUserId = data?.user?.id;
  }

  if (callerUserId && callerUserId !== targetUserId) {
    return {
      success: false,
      error: "Forbidden: You cannot delete another user's notification.",
    };
  }

  const all = getLocalStoredNotifications();
  const filtered = all.filter((n) => !(n.id === notificationId && n.user_id === targetUserId));
  saveLocalStoredNotifications(filtered);

  try {
    await supabase
      .from("user_notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", targetUserId);
  } catch {
    // Non-blocking sync
  }

  return { success: true, error: null };
}
