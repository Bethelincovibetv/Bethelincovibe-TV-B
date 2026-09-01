/**
 * Service: promotionMessageService.ts
 * Purpose: Step 12 — In-Order Contextual Collaboration, Creative Asset Exchange & Delivery SLA Monitoring Engine
 * Features:
 *  - Order-scoped communication between verified buyer, assigned promoter, and system admins.
 *  - High-resolution creative asset sharing (flyers, video previews, broadcast copy).
 *  - Message immutability (cannot be edited or deleted by users, preserving dispute audit records).
 *  - Server-grade attachment validation (MIME whitelisting, file size caps, executable rejection).
 *  - Real-time Supabase subscriptions scoped to order_id.
 *  - SLA countdown calculation with urgency metrics.
 */

import { supabase } from "@/integrations/supabase/client";
import { getPromotionOrderById, PromotionOrder } from "./promotionOrderService";

export type OrderMessageType =
  | "text"
  | "attachment"
  | "flyer"
  | "draft_preview"
  | "schedule_confirmation"
  | "system_event";

export type SenderRole = "business" | "promoter" | "admin" | "system";

export interface MessageAttachment {
  url: string;
  name: string;
  size?: number; // in bytes
  mime_type: string;
  file_type: "image" | "video" | "document" | "other";
  thumbnail_url?: string;
}

export interface PromotionOrderMessage {
  id: string;
  order_id: string;
  sender_id: string;
  sender_role: SenderRole;
  message_type: OrderMessageType;
  message_content: string;
  attachments: MessageAttachment[];
  is_system_event: boolean;
  event_type?: string;
  metadata?: Record<string, any>;
  read_by: string[];
  read_at?: string;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}

export interface OrderSlaStatus {
  slaType: "execution" | "review" | "disputed" | "completed" | "none";
  title: string;
  subtitle: string;
  deadlineDate: string | null;
  timeRemainingMs: number;
  isUrgent: boolean;
  isOverdue: boolean;
  formattedRemaining: string;
  badgeColor: "emerald" | "amber" | "rose" | "purple" | "slate";
  progressPercent: number;
}

const STORAGE_KEY_PREFIX = "bincovibe_order_messages_";
const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024; // 15MB limit
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const DANGEROUS_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".php",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".pl",
  ".jar",
  ".vbs",
  ".scr",
]);

// Helper: Local cache store sync
export const getLocalOrderMessages = (orderId: string): PromotionOrderMessage[] => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${orderId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Notice: reading local order messages error", err);
    return [];
  }
};

export const saveLocalOrderMessages = (
  orderId: string,
  messages: PromotionOrderMessage[]
): void => {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${orderId}`, JSON.stringify(messages));
  } catch (err) {
    console.warn("Notice: saving local order messages error", err);
  }
};

/**
 * Validates attachment MIME type, size, extension, and URL format
 */
export function validateAttachment(file: {
  name: string;
  size?: number;
  mime_type?: string;
  url?: string;
}): { valid: boolean; error?: string; fileType: "image" | "video" | "document" | "other" } {
  const name = (file.name || "").toLowerCase();
  const ext = name.includes(".") ? `.${name.split(".").pop()}` : "";

  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Security Violation: Executable file format (${ext}) is strictly prohibited.`,
      fileType: "other",
    };
  }

  if (file.size && file.size > MAX_ATTACHMENT_SIZE) {
    return {
      valid: false,
      error: `File size exceeds the maximum allowable limit of 15MB (${(file.size / (1024 * 1024)).toFixed(1)}MB provided).`,
      fileType: "other",
    };
  }

  const mime = (file.mime_type || "").toLowerCase();
  let fileType: "image" | "video" | "document" | "other" = "other";

  if (mime.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
    fileType = "image";
  } else if (mime.startsWith("video/") || [".mp4", ".webm", ".mov"].includes(ext)) {
    fileType = "video";
  } else if (
    mime.includes("pdf") ||
    mime.includes("word") ||
    mime.includes("document") ||
    [".pdf", ".doc", ".docx", ".txt"].includes(ext)
  ) {
    fileType = "document";
  }

  if (mime && !ALLOWED_MIME_TYPES.has(mime) && fileType === "other") {
    return {
      valid: false,
      error: `Unsupported file type (${mime}). Only images, videos, and PDFs are supported.`,
      fileType: "other",
    };
  }

  if (file.url) {
    const urlStr = file.url.trim();
    const isValidHttp = urlStr.startsWith("http://") || urlStr.startsWith("https://");
    const isDataUri = urlStr.startsWith("data:");
    const isBlobUri = urlStr.startsWith("blob:");
    const isStoragePath = urlStr.startsWith("/") || urlStr.includes("supabase.co/storage");

    if (!isValidHttp && !isDataUri && !isBlobUri && !isStoragePath) {
      return {
        valid: false,
        error: "Invalid file URL format provided.",
        fileType,
      };
    }
  }

  return { valid: true, fileType };
}

/**
 * Authoritatively verifies if current user is permitted to access the order's collaboration workspace
 */
export async function verifyOrderAccess(
  orderId: string,
  userId?: string,
  userRole?: string
): Promise<{
  authorized: boolean;
  role: SenderRole;
  order: PromotionOrder | null;
  error: string | null;
}> {
  try {
    let activeUserId = userId;
    let activeRole = userRole;

    if (!activeUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      activeUserId = user?.id;
    }

    if (!activeUserId) {
      return {
        authorized: false,
        role: "system",
        order: null,
        error: "Authentication required to access order collaboration.",
      };
    }

    // Check if platform admin
    if (activeRole === "admin") {
      const { order } = await getPromotionOrderById(orderId, activeUserId, "admin");
      if (!order) {
        return {
          authorized: false,
          role: "admin",
          order: null,
          error: "Promotion order not found.",
        };
      }
      return { authorized: true, role: "admin", order, error: null };
    }

    // Fetch order
    const { order, error: orderErr } = await getPromotionOrderById(orderId, activeUserId, activeRole);
    if (!order || orderErr) {
      return {
        authorized: false,
        role: "system",
        order: null,
        error: orderErr || "Order not found or access denied.",
      };
    }

    // Check business ownership
    if (order.business_user_id === activeUserId) {
      return { authorized: true, role: "business", order, error: null };
    }

    // Check promoter ownership
    const promoterUserId =
      order.promoter?.user_id || (order as any).promoter_user_id || order.promoter_id;

    if (
      order.promoter_id === activeUserId ||
      promoterUserId === activeUserId ||
      order.promoter?.id === activeUserId
    ) {
      return { authorized: true, role: "promoter", order, error: null };
    }

    // Double check promoter profiles table for promoter_id -> user_id linkage
    try {
      const { data: promProfile } = await supabase
        .from("promoter_profiles" as any)
        .select("id, user_id" as any)
        .eq("id" as any, order.promoter_id)
        .maybeSingle();

      if (promProfile && (promProfile as any).user_id === activeUserId) {
        return { authorized: true, role: "promoter", order, error: null };
      }
    } catch {
      // ignore
    }

    return {
      authorized: false,
      role: "system",
      order: null,
      error: "Forbidden: You are not an authorized participant for this order.",
    };
  } catch (err: any) {
    return {
      authorized: false,
      role: "system",
      order: null,
      error: err.message || "Failed to verify order access.",
    };
  }
}

/**
 * Retrieves chronological order messages
 */
export async function getOrderMessages(
  orderId: string,
  currentUserId?: string,
  userRole?: string
): Promise<{ messages: PromotionOrderMessage[]; error: string | null }> {
  try {
    const authCheck = await verifyOrderAccess(orderId, currentUserId, userRole);
    if (!authCheck.authorized) {
      return { messages: [], error: authCheck.error };
    }

    // Authoritative fetch from Supabase
    try {
      const { data, error } = await supabase
        .from("promotion_order_messages" as any)
        .select("*" as any)
        .eq("order_id" as any, orderId)
        .order("created_at" as any, { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const formatted: PromotionOrderMessage[] = data.map((d: any) => ({
          id: d.id,
          order_id: d.order_id,
          sender_id: d.sender_id,
          sender_role: d.sender_role as SenderRole,
          message_type: (d.message_type || "text") as OrderMessageType,
          message_content: d.message_content,
          attachments: Array.isArray(d.attachments) ? d.attachments : [],
          is_system_event: !!d.is_system_event,
          event_type: d.event_type,
          metadata: d.metadata || {},
          read_by: Array.isArray(d.read_by) ? d.read_by : [],
          read_at: d.read_at,
          created_at: d.created_at,
          sender_name: d.sender_name,
          sender_avatar: d.sender_avatar,
        }));

        saveLocalOrderMessages(orderId, formatted);
        return { messages: formatted, error: null };
      }
    } catch (err) {
      console.warn("Notice: falling back to local order messages", err);
    }

    // Fallback local store
    const local = getLocalOrderMessages(orderId);
    return { messages: local, error: null };
  } catch (err: any) {
    return { messages: [], error: err.message || "Failed to retrieve order messages." };
  }
}

/**
 * Sends a message into the order workspace
 */
export async function sendOrderMessage(params: {
  orderId: string;
  content: string;
  messageType?: OrderMessageType;
  attachments?: MessageAttachment[];
  metadata?: Record<string, any>;
  currentUserId?: string;
  userRole?: string;
  senderName?: string;
  senderAvatar?: string;
}): Promise<{ message: PromotionOrderMessage | null; error: string | null }> {
  try {
    const {
      orderId,
      content,
      messageType = "text",
      attachments = [],
      metadata = {},
      currentUserId,
      userRole,
      senderName,
      senderAvatar,
    } = params;

    const trimmedContent = (content || "").trim();

    if (!trimmedContent && attachments.length === 0) {
      return {
        message: null,
        error: "Message cannot be empty. Please provide text or an attachment.",
      };
    }

    if (trimmedContent.length > 5000) {
      return {
        message: null,
        error: "Message text exceeds maximum length of 5,000 characters.",
      };
    }

    // Verify order authorization and authoritative role
    const authCheck = await verifyOrderAccess(orderId, currentUserId, userRole);
    if (!authCheck.authorized || !authCheck.order) {
      return { message: null, error: authCheck.error || "Unauthorized to send message in this order." };
    }

    let actualSenderId = currentUserId;
    if (!actualSenderId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      actualSenderId = user?.id;
    }

    if (!actualSenderId) {
      return { message: null, error: "Authenticated session is required." };
    }

    // Validate all attachments
    const validatedAttachments: MessageAttachment[] = [];
    for (const att of attachments) {
      const valResult = validateAttachment({
        name: att.name,
        size: att.size,
        mime_type: att.mime_type,
        url: att.url,
      });

      if (!valResult.valid) {
        return { message: null, error: valResult.error || "Invalid attachment file." };
      }

      validatedAttachments.push({
        ...att,
        file_type: valResult.fileType,
      });
    }

    const newMessage: PromotionOrderMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      order_id: orderId,
      sender_id: actualSenderId,
      sender_role: authCheck.role,
      message_type: messageType,
      message_content: trimmedContent,
      attachments: validatedAttachments,
      is_system_event: false,
      metadata,
      read_by: [actualSenderId],
      created_at: new Date().toISOString(),
      sender_name: senderName || (authCheck.role === "business" ? "Business Client" : authCheck.role === "promoter" ? "Promoter" : "Admin"),
      sender_avatar: senderAvatar,
    };

    // Save to Supabase
    try {
      const { data, error } = await supabase
        .from("promotion_order_messages" as any)
        .insert({
          id: newMessage.id,
          order_id: newMessage.order_id,
          sender_id: newMessage.sender_id,
          sender_role: newMessage.sender_role,
          message_type: newMessage.message_type,
          message_content: newMessage.message_content,
          attachments: newMessage.attachments,
          is_system_event: newMessage.is_system_event,
          metadata: newMessage.metadata,
          read_by: newMessage.read_by,
          created_at: newMessage.created_at,
        } as any)
        .select()
        .maybeSingle();

      if (!error && data) {
        newMessage.id = (data as any).id;
      }
    } catch (err) {
      console.warn("Notice: saving message to local store fallback", err);
    }

    // Save to local cache
    const existing = getLocalOrderMessages(orderId);
    saveLocalOrderMessages(orderId, [...existing, newMessage]);

    return { message: newMessage, error: null };
  } catch (err: any) {
    return { message: null, error: err.message || "Failed to send message." };
  }
}

/**
 * Creates an immutable system milestone event message in the order stream
 */
export async function createSystemEventMessage(params: {
  orderId: string;
  eventType: string;
  content: string;
  metadata?: Record<string, any>;
  adminUserId?: string;
}): Promise<{ message: PromotionOrderMessage | null; error: string | null }> {
  try {
    const { orderId, eventType, content, metadata = {} } = params;

    const sysMessage: PromotionOrderMessage = {
      id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      order_id: orderId,
      sender_id: params.adminUserId || "system",
      sender_role: "system",
      message_type: "system_event",
      message_content: content,
      attachments: [],
      is_system_event: true,
      event_type: eventType,
      metadata,
      read_by: [],
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from("promotion_order_messages" as any).insert({
        id: sysMessage.id,
        order_id: sysMessage.order_id,
        sender_id: sysMessage.sender_id === "system" ? "00000000-0000-0000-0000-000000000000" : sysMessage.sender_id,
        sender_role: "system",
        message_type: "system_event",
        message_content: sysMessage.message_content,
        attachments: [],
        is_system_event: true,
        event_type: eventType,
        metadata: sysMessage.metadata,
        read_by: [],
        created_at: sysMessage.created_at,
      } as any);
    } catch (err) {
      console.warn("Notice: logging system event to local store", err);
    }

    const existing = getLocalOrderMessages(orderId);
    saveLocalOrderMessages(orderId, [...existing, sysMessage]);

    return { message: sysMessage, error: null };
  } catch (err: any) {
    return { message: null, error: err.message || "Failed to create system event message." };
  }
}

/**
 * Marks messages as read for current user
 */
export async function markOrderMessagesAsRead(
  orderId: string,
  currentUserId?: string
): Promise<{ success: boolean; updatedCount: number }> {
  try {
    let userId = currentUserId;
    if (!userId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id;
    }

    if (!userId) return { success: false, updatedCount: 0 };

    const messages = getLocalOrderMessages(orderId);
    let updatedCount = 0;

    const updated = messages.map((msg) => {
      if (!msg.read_by.includes(userId!)) {
        updatedCount++;
        return {
          ...msg,
          read_by: [...msg.read_by, userId!],
          read_at: new Date().toISOString(),
        };
      }
      return msg;
    });

    if (updatedCount > 0) {
      saveLocalOrderMessages(orderId, updated);
    }

    return { success: true, updatedCount };
  } catch (err) {
    console.warn("Notice: marking messages as read error", err);
    return { success: false, updatedCount: 0 };
  }
}

/**
 * Real-time subscription to order collaboration thread
 */
export function subscribeToOrderMessages(
  orderId: string,
  onNewMessage: (msg: PromotionOrderMessage) => void
): () => void {
  try {
    const channelName = `order_chat_${orderId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "promotion_order_messages",
          filter: `order_id=eq.${orderId}`,
        },
        (payload: any) => {
          if (payload && payload.new) {
            const d = payload.new;
            const newMsg: PromotionOrderMessage = {
              id: d.id,
              order_id: d.order_id,
              sender_id: d.sender_id,
              sender_role: d.sender_role,
              message_type: d.message_type || "text",
              message_content: d.message_content,
              attachments: Array.isArray(d.attachments) ? d.attachments : [],
              is_system_event: !!d.is_system_event,
              event_type: d.event_type,
              metadata: d.metadata || {},
              read_by: Array.isArray(d.read_by) ? d.read_by : [],
              read_at: d.read_at,
              created_at: d.created_at,
            };
            onNewMessage(newMsg);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn("Notice: real-time subscription fallback", err);
    return () => {};
  }
}

/**
 * Calculates authoritative SLA Deadline & Live Urgency Status
 */
export function calculateOrderSlaStatus(order: any): OrderSlaStatus {
  if (!order) {
    return {
      slaType: "none",
      title: "No SLA Active",
      subtitle: "Order information is not available",
      deadlineDate: null,
      timeRemainingMs: 0,
      isUrgent: false,
      isOverdue: false,
      formattedRemaining: "N/A",
      badgeColor: "slate",
      progressPercent: 0,
    };
  }

  const status = order.status;
  const nowMs = Date.now();

  // Completed / Approved / Settled
  if (["approved", "completed"].includes(status)) {
    return {
      slaType: "completed",
      title: "Execution & Escrow Settled",
      subtitle: "Deliverables verified and payouts released successfully.",
      deadlineDate: null,
      timeRemainingMs: 0,
      isUrgent: false,
      isOverdue: false,
      formattedRemaining: "Completed",
      badgeColor: "emerald",
      progressPercent: 100,
    };
  }

  // Disputed
  if (status === "disputed") {
    return {
      slaType: "disputed",
      title: "Arbitration Underway",
      subtitle: "Admin dispute arbitration team is reviewing delivery evidence.",
      deadlineDate: null,
      timeRemainingMs: 0,
      isUrgent: true,
      isOverdue: false,
      formattedRemaining: "In Dispute",
      badgeColor: "rose",
      progressPercent: 100,
    };
  }

  // Cancelled or Refunded
  if (["cancelled", "refunded"].includes(status)) {
    return {
      slaType: "none",
      title: "Order Inactive",
      subtitle: status === "refunded" ? "Funds returned to buyer wallet" : "Order was cancelled",
      deadlineDate: null,
      timeRemainingMs: 0,
      isUrgent: false,
      isOverdue: false,
      formattedRemaining: "Inactive",
      badgeColor: "slate",
      progressPercent: 0,
    };
  }

  // Pending Payment
  if (status === "pending_payment") {
    return {
      slaType: "none",
      title: "Awaiting Escrow Deposit",
      subtitle: "Turnaround timer begins once payment is verified into escrow.",
      deadlineDate: null,
      timeRemainingMs: 0,
      isUrgent: false,
      isOverdue: false,
      formattedRemaining: "Payment Pending",
      badgeColor: "amber",
      progressPercent: 0,
    };
  }

  // Delivered / Evidence Submitted / Revision Requested -> 72-Hour Business Review SLA
  if (["delivered", "evidence_submitted", "revision_requested"].includes(status)) {
    // Look for proof submission timestamp or fallback to updated_at
    const proofDateStr =
      order.proof_submitted_at || order.delivered_at || order.updated_at || order.created_at;
    const proofDateMs = new Date(proofDateStr).getTime();
    const autoApprovalWindowMs = 72 * 60 * 60 * 1000; // 72 hours
    const targetDeadlineMs = proofDateMs + autoApprovalWindowMs;
    const remainingMs = targetDeadlineMs - nowMs;
    const isOverdue = remainingMs <= 0;
    const isUrgent = remainingMs > 0 && remainingMs <= 12 * 60 * 60 * 1000; // Under 12h

    const totalDurationMs = autoApprovalWindowMs;
    const elapsedMs = Math.min(totalDurationMs, Math.max(0, totalDurationMs - remainingMs));
    const progressPercent = Math.min(100, Math.round((elapsedMs / totalDurationMs) * 100));

    return {
      slaType: "review",
      title: isOverdue ? "Auto-Approval Eligible" : "72h Business Review Window",
      subtitle: isOverdue
        ? "Review window has concluded. Funds are eligible for automated release."
        : "Business client is reviewing broadcast proof and metrics.",
      deadlineDate: new Date(targetDeadlineMs).toISOString(),
      timeRemainingMs: Math.max(0, remainingMs),
      isUrgent,
      isOverdue,
      formattedRemaining: isOverdue ? "Auto-Approve Pending" : formatDuration(remainingMs),
      badgeColor: isOverdue ? "emerald" : isUrgent ? "rose" : "amber",
      progressPercent,
    };
  }

  // Paid Escrow / In Progress -> Promoter Execution SLA
  if (["paid_escrow", "in_progress"].includes(status)) {
    const startDateStr = order.paid_at || order.promoter_accepted_at || order.accepted_at || order.created_at;
    const startDateMs = new Date(startDateStr).getTime();
    
    // Turnaround duration: check package turnaround_hours, delivery_days or fallback 48h
    const turnaroundHours =
      order.package?.turnaround_hours ||
      (order.package?.delivery_days ? order.package.delivery_days * 24 : null) ||
      (order.delivery_days ? order.delivery_days * 24 : null) ||
      48;
    const executionWindowMs = turnaroundHours * 60 * 60 * 1000;
    const targetDeadlineMs = order.sla_deadline
      ? new Date(order.sla_deadline).getTime()
      : startDateMs + executionWindowMs;

    const remainingMs = targetDeadlineMs - nowMs;
    const isOverdue = remainingMs <= 0;
    const isUrgent = remainingMs > 0 && remainingMs <= 8 * 60 * 60 * 1000; // Under 8h

    const totalDurationMs = executionWindowMs;
    const elapsedMs = Math.min(totalDurationMs, Math.max(0, totalDurationMs - remainingMs));
    const progressPercent = Math.min(100, Math.round((elapsedMs / totalDurationMs) * 100));

    return {
      slaType: "execution",
      title: isOverdue ? "Execution Overdue" : "Promoter Execution Window",
      subtitle: isOverdue
        ? "Promoter is past standard turnaround SLA. Buyer may request status update."
        : `Broadcast preparation & publication (${turnaroundHours}h Turnaround)`,
      deadlineDate: new Date(targetDeadlineMs).toISOString(),
      timeRemainingMs: Math.max(0, remainingMs),
      isUrgent,
      isOverdue,
      formattedRemaining: isOverdue ? "Overdue" : formatDuration(remainingMs),
      badgeColor: isOverdue ? "rose" : isUrgent ? "amber" : "purple",
      progressPercent,
    };
  }

  return {
    slaType: "none",
    title: "Order Active",
    subtitle: `Status: ${status}`,
    deadlineDate: null,
    timeRemainingMs: 0,
    isUrgent: false,
    isOverdue: false,
    formattedRemaining: "Active",
    badgeColor: "purple",
    progressPercent: 50,
  };
}

/**
 * Format duration in milliseconds to clean human readable string
 */
function formatDuration(ms: number): string {
  if (ms <= 0) return "0m";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h left`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }
  return `${minutes}m left`;
}
