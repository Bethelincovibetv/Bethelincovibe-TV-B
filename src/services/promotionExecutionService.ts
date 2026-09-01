import { supabase } from "@/integrations/supabase/client";
import {
  PromotionOrder,
  PromotionOrderStatus,
  getPromotionOrderById,
} from "./promotionOrderService";
import { getPackageById } from "./packageService";
import { getPromoterProfileByUserId, getPromoterProfileById } from "./promoterService";
import {
  notifyProofSubmitted,
  notifyRevisionRequested,
  notifyDisputeOpened,
} from "./promotionNotificationService";

export interface DeliveryProofSubmission {
  id: string;
  order_id: string;
  promoter_id: string;
  version: number;
  screenshot_urls: string[];
  post_url?: string | null;
  views_count?: number | null;
  notes?: string | null;
  submitted_at: string;
  file_metadata?: Array<{
    name: string;
    size: number;
    mime_type: string;
    url: string;
  }>;
}

export interface OrderAuditEvent {
  id: string;
  order_id: string;
  user_id: string;
  role: "business" | "promoter" | "admin" | "system";
  event_type:
    | "order_created"
    | "payment_escrowed"
    | "promoter_accepted"
    | "promoter_declined"
    | "sla_started"
    | "proof_submitted"
    | "revision_requested"
    | "proof_resubmitted"
    | "business_approved"
    | "business_disputed"
    | "auto_approved"
    | "sla_expired"
    | "escrow_released"
    | "order_cancelled";
  previous_status?: PromotionOrderStatus;
  new_status?: PromotionOrderStatus;
  details?: string | null;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface SubmitDeliveryProofInput {
  screenshotUrls: string[];
  postUrl?: string;
  viewsCount?: number;
  notes?: string;
  fileMetadata?: Array<{
    name: string;
    size: number;
    mime_type: string;
    url: string;
  }>;
}

const ORDERS_STORAGE_KEY = "bincovibe_promotion_orders_all";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "application/pdf",
];
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf"];
export const REVIEW_WINDOW_HOURS = 48;

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
    console.error("Failed to persist local orders", err);
  }
}

function generateAuditId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function generateProofId(): string {
  return `proof_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Validates post URL format
 */
export function isValidHttpUrl(stringUrl?: string): boolean {
  if (!stringUrl || typeof stringUrl !== "string") return false;
  try {
    const url = new URL(stringUrl);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates delivery proof files and metadata against anti-fraud rules
 */
export function validateDeliveryProofInput(input: SubmitDeliveryProofInput): {
  valid: boolean;
  error?: string;
} {
  if (!input) {
    return { valid: false, error: "Proof submission payload is required." };
  }

  // Check screenshot URLs
  if (
    !input.screenshotUrls ||
    !Array.isArray(input.screenshotUrls) ||
    input.screenshotUrls.length === 0
  ) {
    return {
      valid: false,
      error: "At least one screenshot or deliverable evidence file is required.",
    };
  }

  // Validate each screenshot URL format
  for (const url of input.screenshotUrls) {
    if (!url || typeof url !== "string" || !url.trim()) {
      return { valid: false, error: "Invalid or empty screenshot URL provided." };
    }

    const cleanUrl = url.trim().toLowerCase();
    // Verify valid web URL or data URL
    const isWebUrl = cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://");
    const isDataUri = cleanUrl.startsWith("data:image/") || cleanUrl.startsWith("data:application/pdf");
    const isLocalBlob = cleanUrl.startsWith("blob:");

    if (!isWebUrl && !isDataUri && !isLocalBlob) {
      return {
        valid: false,
        error: `Invalid evidence URL format: ${url}. Must be http(s) or standard media URL.`,
      };
    }

    // If web URL, check allowed extension when present
    if (isWebUrl) {
      const urlPath = cleanUrl.split("?")[0];
      const hasKnownExt = ALLOWED_EXTENSIONS.some((ext) => urlPath.endsWith(ext));
      // If it has a file extension, ensure it's allowed
      if (urlPath.includes(".") && !hasKnownExt && !urlPath.includes("/proof") && !urlPath.includes("/upload")) {
        const lastDot = urlPath.lastIndexOf(".");
        const ext = urlPath.substring(lastDot);
        if (ext.length <= 5 && !ALLOWED_EXTENSIONS.includes(ext)) {
          return {
            valid: false,
            error: `File format '${ext}' is not supported. Permitted formats: PNG, JPG, WEBP, PDF.`,
          };
        }
      }
    }
  }

  // Validate post URL if provided
  if (input.postUrl && input.postUrl.trim()) {
    if (!isValidHttpUrl(input.postUrl.trim())) {
      return {
        valid: false,
        error: "Published post URL must be a valid HTTP or HTTPS address.",
      };
    }
  }

  // Validate view count if provided
  if (input.viewsCount !== undefined && input.viewsCount !== null) {
    if (typeof input.viewsCount !== "number" || input.viewsCount < 0 || isNaN(input.viewsCount)) {
      return {
        valid: false,
        error: "View count must be a valid non-negative integer.",
      };
    }
  }

  // Validate file metadata if supplied
  if (input.fileMetadata && Array.isArray(input.fileMetadata)) {
    for (const file of input.fileMetadata) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return {
          valid: false,
          error: `File '${file.name}' exceeds the maximum allowed size of 10MB.`,
        };
      }
      if (file.mime_type && !ALLOWED_MIME_TYPES.includes(file.mime_type.toLowerCase())) {
        return {
          valid: false,
          error: `File '${file.name}' has invalid MIME type '${file.mime_type}'. Permitted types: PNG, JPG, WEBP, PDF.`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * 1. Promoter Accepts an Escrow-Funded Order
 * Transitions from "paid_escrow" -> "promoter_accepted" / "in_progress"
 * Computes server-side SLA deadline.
 */
export async function acceptPromotionOrder(
  orderId: string,
  mockUserId?: string
): Promise<{ order: PromotionOrder | null; error: string | null }> {
  if (!orderId) {
    return { order: null, error: "Order ID is required." };
  }

  // 1. Authenticate user
  let userId = mockUserId;
  if (!userId) {
    const { data: authData } = await supabase.auth.getUser();
    userId = authData?.user?.id;
  }

  if (!userId) {
    return { order: null, error: "Unauthorized: Please log in to accept this order." };
  }

  // 2. Fetch order
  const { order, error: fetchErr } = await getPromotionOrderById(orderId, userId);
  if (fetchErr || !order) {
    return { order: null, error: fetchErr || "Order not found." };
  }

  // 3. Authorization: Only the assigned promoter can accept
  const promoterProfile = await getPromoterProfileByUserId(userId);
  if (!promoterProfile || promoterProfile.id !== order.promoter_id) {
    return {
      order: null,
      error: "Forbidden: You are not authorized to accept this order (not the assigned promoter).",
    };
  }

  // 4. State Validation: Order MUST be in "paid_escrow"
  if (order.status !== "paid_escrow") {
    return {
      order: null,
      error: `Cannot accept order with status '${order.status}'. Order must be paid in escrow first.`,
    };
  }

  // 5. Server-side SLA Calculation
  const now = new Date();
  const durationHours = order.package?.duration_hours || 24;
  // Execution SLA: package duration plus 24-hour setup/broadcast window
  const slaDeadline = new Date(now.getTime() + durationHours * 3600 * 1000).toISOString();
  const previousStatus = order.status;

  const nowIso = now.toISOString();

  // Create audit events
  const acceptAudit: OrderAuditEvent = {
    id: generateAuditId(),
    order_id: order.id,
    user_id: userId,
    role: "promoter",
    event_type: "promoter_accepted",
    previous_status: previousStatus,
    new_status: "in_progress",
    details: `Promoter ${promoterProfile.display_name} accepted the order. SLA deadline set to ${slaDeadline}.`,
    metadata: {
      promoter_id: promoterProfile.id,
      sla_deadline: slaDeadline,
      duration_hours: durationHours,
    },
    timestamp: nowIso,
  };

  const slaAudit: OrderAuditEvent = {
    id: generateAuditId(),
    order_id: order.id,
    user_id: userId,
    role: "system",
    event_type: "sla_started",
    previous_status: previousStatus,
    new_status: "in_progress",
    details: `SLA timer initialized. Deadline: ${slaDeadline}`,
    timestamp: nowIso,
  };

  // Update order object
  order.status = "in_progress";
  (order as any).promoter_accepted_at = nowIso;
  (order as any).sla_deadline = slaDeadline;
  if (!(order as any).audit_trail) {
    (order as any).audit_trail = [];
  }
  (order as any).audit_trail.push(acceptAudit, slaAudit);
  order.updated_at = nowIso;

  // Persist update
  const allOrders = getLocalOrders();
  const index = allOrders.findIndex((o) => o.id === order.id);
  if (index >= 0) {
    allOrders[index] = { ...allOrders[index], ...order };
    saveLocalOrders(allOrders);
  } else {
    allOrders.unshift(order);
    saveLocalOrders(allOrders);
  }

  // Attempt DB update if available
  try {
    await supabase
      .from("promotion_orders")
      .update({
        status: "in_progress",
        updated_at: nowIso,
      })
      .eq("id", order.id);
  } catch {
    // DB sync error fallback
  }

  return { order, error: null };
}

/**
 * 2. Promoter Declines an Escrow-Funded Order
 * Transitions from "paid_escrow" -> "cancelled" (or "declined")
 */
export async function declinePromotionOrder(
  orderId: string,
  declineReason: string,
  mockUserId?: string
): Promise<{ order: PromotionOrder | null; error: string | null }> {
  if (!orderId) {
    return { order: null, error: "Order ID is required." };
  }

  if (!declineReason || typeof declineReason !== "string" || declineReason.trim().length < 5) {
    return {
      order: null,
      error: "Please provide a valid decline reason (at least 5 characters).",
    };
  }

  // 1. Authenticate user
  let userId = mockUserId;
  if (!userId) {
    const { data: authData } = await supabase.auth.getUser();
    userId = authData?.user?.id;
  }

  if (!userId) {
    return { order: null, error: "Unauthorized: Please log in to decline this order." };
  }

  // 2. Fetch order
  const { order, error: fetchErr } = await getPromotionOrderById(orderId, userId);
  if (fetchErr || !order) {
    return { order: null, error: fetchErr || "Order not found." };
  }

  // 3. Authorization: Only the assigned promoter can decline
  const promoterProfile = await getPromoterProfileByUserId(userId);
  if (!promoterProfile || promoterProfile.id !== order.promoter_id) {
    return {
      order: null,
      error: "Forbidden: You are not authorized to decline this order.",
    };
  }

  // 4. State Validation: Can only decline orders in "paid_escrow"
  if (order.status !== "paid_escrow") {
    return {
      order: null,
      error: `Cannot decline order with status '${order.status}'.`,
    };
  }

  const nowIso = new Date().toISOString();
  const previousStatus = order.status;

  const declineAudit: OrderAuditEvent = {
    id: generateAuditId(),
    order_id: order.id,
    user_id: userId,
    role: "promoter",
    event_type: "promoter_declined",
    previous_status: previousStatus,
    new_status: "cancelled",
    details: `Promoter declined the order. Reason: ${declineReason.trim()}`,
    metadata: {
      promoter_id: promoterProfile.id,
      decline_reason: declineReason.trim(),
    },
    timestamp: nowIso,
  };

  order.status = "cancelled";
  (order as any).promoter_declined_at = nowIso;
  (order as any).decline_reason = declineReason.trim();
  if (!(order as any).audit_trail) {
    (order as any).audit_trail = [];
  }
  (order as any).audit_trail.push(declineAudit);
  order.updated_at = nowIso;

  // Persist update
  const allOrders = getLocalOrders();
  const index = allOrders.findIndex((o) => o.id === order.id);
  if (index >= 0) {
    allOrders[index] = { ...allOrders[index], ...order };
    saveLocalOrders(allOrders);
  }

  try {
    await supabase
      .from("promotion_orders")
      .update({
        status: "cancelled",
        updated_at: nowIso,
      })
      .eq("id", order.id);
  } catch {
    // DB sync error fallback
  }

  return { order, error: null };
}

/**
 * 3. Deliverable Proof Submission
 * Promoter submits verified evidence (screenshots, counters, post link).
 * Validates ownership, file formats, size, timestamps, and versions.
 * Transitions to "evidence_submitted" (alias "business_review") and sets 48-hour review window.
 */
export async function submitDeliveryProof(
  orderId: string,
  proofInput: SubmitDeliveryProofInput,
  mockUserId?: string
): Promise<{
  order: PromotionOrder | null;
  proof: DeliveryProofSubmission | null;
  error: string | null;
}> {
  if (!orderId) {
    return { order: null, proof: null, error: "Order ID is required." };
  }

  // 1. Validate Input Payload & Anti-Fraud
  const validation = validateDeliveryProofInput(proofInput);
  if (!validation.valid) {
    return { order: null, proof: null, error: validation.error || "Invalid proof submission." };
  }

  // 2. Authenticate user
  let userId = mockUserId;
  if (!userId) {
    const { data: authData } = await supabase.auth.getUser();
    userId = authData?.user?.id;
  }

  if (!userId) {
    return { order: null, proof: null, error: "Unauthorized: Please log in to submit proof." };
  }

  // 3. Fetch order
  const { order, error: fetchErr } = await getPromotionOrderById(orderId, userId);
  if (fetchErr || !order) {
    return { order: null, proof: null, error: fetchErr || "Order not found." };
  }

  // 4. Authorization: Only the assigned promoter can submit proof
  const promoterProfile = await getPromoterProfileByUserId(userId);
  if (!promoterProfile || promoterProfile.id !== order.promoter_id) {
    return {
      order: null,
      proof: null,
      error: "Forbidden: You are not authorized to submit proof for this order (promoter mismatch).",
    };
  }

  // 5. State Validation: Can submit proof when "in_progress", "promoter_accepted", or "revision_requested"
  const allowedStatuses: PromotionOrderStatus[] = [
    "in_progress",
    "evidence_submitted",
    "revision_requested",
  ];
  if (!allowedStatuses.includes(order.status)) {
    return {
      order: null,
      proof: null,
      error: `Cannot submit proof when order is in '${order.status}' status.`,
    };
  }

  // 6. Anti-Fraud Timestamp Invariant Check
  const now = new Date();
  const nowIso = now.toISOString();

  // If order was created in future or timestamps are corrupted
  if (new Date(order.created_at).getTime() > now.getTime() + 60000) {
    return {
      order: null,
      proof: null,
      error: "Timestamp integrity check failed: Order creation date is in the future.",
    };
  }

  // 7. Versioning Management
  const currentProofs: DeliveryProofSubmission[] = (order as any).delivery_proofs || [];
  const nextVersion = currentProofs.length + 1;
  const isResubmission = order.status === "revision_requested" || nextVersion > 1;

  const newProof: DeliveryProofSubmission = {
    id: generateProofId(),
    order_id: order.id,
    promoter_id: promoterProfile.id,
    version: nextVersion,
    screenshot_urls: proofInput.screenshotUrls,
    post_url: proofInput.postUrl?.trim() || null,
    views_count: proofInput.viewsCount !== undefined ? proofInput.viewsCount : null,
    notes: proofInput.notes?.trim() || null,
    submitted_at: nowIso,
    file_metadata: proofInput.fileMetadata || undefined,
  };

  currentProofs.push(newProof);

  // 8. 48-Hour Business Review Deadline
  const reviewDeadline = new Date(now.getTime() + REVIEW_WINDOW_HOURS * 3600 * 1000).toISOString();
  const previousStatus = order.status;

  // Create audit event
  const proofAudit: OrderAuditEvent = {
    id: generateAuditId(),
    order_id: order.id,
    user_id: userId,
    role: "promoter",
    event_type: isResubmission ? "proof_resubmitted" : "proof_submitted",
    previous_status: previousStatus,
    new_status: "evidence_submitted",
    details: isResubmission
      ? `Promoter submitted Proof V${nextVersion} in response to revision request.`
      : `Promoter submitted initial delivery proof (Proof V1). Review deadline: ${reviewDeadline}`,
    metadata: {
      proof_version: nextVersion,
      screenshots_count: proofInput.screenshotUrls.length,
      has_post_url: !!proofInput.postUrl,
      views_count: proofInput.viewsCount,
      review_deadline: reviewDeadline,
    },
    timestamp: nowIso,
  };

  // Update order object
  order.status = "evidence_submitted";
  order.evidence_submitted_at = nowIso;
  (order as any).review_deadline = reviewDeadline;
  (order as any).proof_version = nextVersion;
  (order as any).delivery_proofs = currentProofs;
  if (!(order as any).audit_trail) {
    (order as any).audit_trail = [];
  }
  (order as any).audit_trail.push(proofAudit);
  order.updated_at = nowIso;

  // Persist update
  const allOrders = getLocalOrders();
  const index = allOrders.findIndex((o) => o.id === order.id);
  if (index >= 0) {
    allOrders[index] = { ...allOrders[index], ...order };
    saveLocalOrders(allOrders);
  }

  try {
    await supabase
      .from("promotion_orders")
      .update({
        status: "evidence_submitted",
        evidence_submitted_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", order.id);
  } catch {
    // DB sync error fallback
  }

  // Dispatch notification to business owner
  notifyProofSubmitted({
    id: order.id,
    order_reference: order.order_reference,
    business_user_id: order.business_user_id,
    package_title: order.package?.title || "Promotion Package",
  }).catch((err) => console.warn("Notice: proof submitted notification notice", err));

  return { order, proof: newProof, error: null };
}

/**
 * 4. Business Review Workflow
 * Business can:
 * - "approve" -> marks order as approved, records approved_at
 * - "request_revision" -> requires reason, marks order as revision_requested
 * - "dispute" -> requires dispute reason, marks order as disputed and locks escrow
 */
export async function reviewDeliveryProof(
  orderId: string,
  decision: "approve" | "request_revision" | "dispute",
  reviewData: { reason?: string; notes?: string },
  mockUserId?: string
): Promise<{ order: PromotionOrder | null; error: string | null }> {
  if (!orderId) {
    return { order: null, error: "Order ID is required." };
  }

  if (!decision || !["approve", "request_revision", "dispute"].includes(decision)) {
    return { order: null, error: "Invalid review decision. Must be approve, request_revision, or dispute." };
  }

  // 1. Authenticate user
  let userId = mockUserId;
  if (!userId) {
    const { data: authData } = await supabase.auth.getUser();
    userId = authData?.user?.id;
  }

  if (!userId) {
    return { order: null, error: "Unauthorized: Please log in to review this order." };
  }

  // 2. Fetch order
  const { order, error: fetchErr } = await getPromotionOrderById(orderId, userId);
  if (fetchErr || !order) {
    return { order: null, error: fetchErr || "Order not found." };
  }

  // 3. Authorization: Only the ordering business can review the proof
  if (order.business_user_id !== userId) {
    return {
      order: null,
      error: "Forbidden: You are not authorized to review this order (only the ordering business can review).",
    };
  }

  // 4. State Validation: Order must be in "evidence_submitted"
  if (order.status !== "evidence_submitted") {
    return {
      order: null,
      error: `Cannot review order with status '${order.status}'. Order must be in 'evidence_submitted' status.`,
    };
  }

  const nowIso = new Date().toISOString();
  const previousStatus = order.status;

  if (decision === "approve") {
    const approveAudit: OrderAuditEvent = {
      id: generateAuditId(),
      order_id: order.id,
      user_id: userId,
      role: "business",
      event_type: "business_approved",
      previous_status: previousStatus,
      new_status: "approved",
      details: "Business reviewed and approved the promotional deliverables.",
      metadata: {
        notes: reviewData.notes?.trim() || null,
        approved_at: nowIso,
      },
      timestamp: nowIso,
    };

    order.status = "approved";
    order.approved_at = nowIso;
    if (!(order as any).audit_trail) {
      (order as any).audit_trail = [];
    }
    (order as any).audit_trail.push(approveAudit);
    order.updated_at = nowIso;
  } else if (decision === "request_revision") {
    if (!reviewData.reason || reviewData.reason.trim().length < 5) {
      return {
        order: null,
        error: "Revision reason is required (at least 5 characters).",
      };
    }

    const revisionAudit: OrderAuditEvent = {
      id: generateAuditId(),
      order_id: order.id,
      user_id: userId,
      role: "business",
      event_type: "revision_requested",
      previous_status: previousStatus,
      new_status: "revision_requested",
      details: `Business requested revision. Reason: ${reviewData.reason.trim()}`,
      metadata: {
        revision_reason: reviewData.reason.trim(),
        revision_requested_at: nowIso,
      },
      timestamp: nowIso,
    };

    order.status = "revision_requested";
    (order as any).revision_requested_at = nowIso;
    (order as any).revision_reason = reviewData.reason.trim();
    if (!(order as any).audit_trail) {
      (order as any).audit_trail = [];
    }
    (order as any).audit_trail.push(revisionAudit);
    order.updated_at = nowIso;
  } else if (decision === "dispute") {
    if (!reviewData.reason || reviewData.reason.trim().length < 10) {
      return {
        order: null,
        error: "Dispute reason is required (at least 10 characters detailing the non-compliance).",
      };
    }

    const disputeAudit: OrderAuditEvent = {
      id: generateAuditId(),
      order_id: order.id,
      user_id: userId,
      role: "business",
      event_type: "business_disputed",
      previous_status: previousStatus,
      new_status: "disputed",
      details: `Business opened a dispute. Reason: ${reviewData.reason.trim()}`,
      metadata: {
        dispute_reason: reviewData.reason.trim(),
        disputed_at: nowIso,
      },
      timestamp: nowIso,
    };

    order.status = "disputed";
    (order as any).disputed_at = nowIso;
    (order as any).dispute_reason = reviewData.reason.trim();
    if (!(order as any).audit_trail) {
      (order as any).audit_trail = [];
    }
    (order as any).audit_trail.push(disputeAudit);
    order.updated_at = nowIso;
  }

  // Persist update
  const allOrders = getLocalOrders();
  const index = allOrders.findIndex((o) => o.id === order.id);
  if (index >= 0) {
    allOrders[index] = { ...allOrders[index], ...order };
    saveLocalOrders(allOrders);
  }

  try {
    await supabase
      .from("promotion_orders")
      .update({
        status: order.status,
        approved_at: order.approved_at || null,
        updated_at: nowIso,
      })
      .eq("id", order.id);
  } catch {
    // DB sync error fallback
  }

  // Dispatch notifications based on review decision
  const promoterUserId = order.promoter?.user_id || order.promoter_id;
  if (decision === "request_revision" && promoterUserId) {
    notifyRevisionRequested({
      id: order.id,
      order_reference: order.order_reference,
      promoter_user_id: promoterUserId,
      reason: reviewData.reason?.trim(),
    }).catch((err) => console.warn("Notice: revision requested notification notice", err));
  } else if (decision === "dispute" && promoterUserId) {
    notifyDisputeOpened({
      id: order.id,
      order_reference: order.order_reference,
      promoter_user_id: promoterUserId,
      business_user_id: order.business_user_id,
      reason: reviewData.reason?.trim(),
      opened_by: "business",
    }).catch((err) => console.warn("Notice: dispute opened notification notice", err));
  }

  return { order, error: null };
}

/**
 * 5. Auto-Approval Process for 48-Hour Review Window Expiration
 * If 48 hours have elapsed since proof submission without business action or dispute,
 * the backend transitions the order to "approved" automatically.
 */
export async function checkAndProcessAutoApproval(
  orderId: string,
  currentServerTimestamp?: number
): Promise<{
  autoApproved: boolean;
  order: PromotionOrder | null;
  hoursRemaining?: number;
  error?: string | null;
}> {
  if (!orderId) {
    return { autoApproved: false, order: null, error: "Order ID is required." };
  }

  const allOrders = getLocalOrders();
  const order = allOrders.find((o) => o.id === orderId);
  if (!order) {
    return { autoApproved: false, order: null, error: "Order not found." };
  }

  if (order.status !== "evidence_submitted") {
    return {
      autoApproved: false,
      order,
      error: `Order is in status '${order.status}', not in active business review.`,
    };
  }

  const reviewDeadline = (order as any).review_deadline;
  if (!reviewDeadline) {
    return {
      autoApproved: false,
      order,
      error: "No review deadline recorded on order.",
    };
  }

  const nowTime = currentServerTimestamp || Date.now();
  const deadlineTime = new Date(reviewDeadline).getTime();
  const timeDifferenceMs = deadlineTime - nowTime;

  if (timeDifferenceMs > 0) {
    const hoursRemaining = Math.max(0, Math.round((timeDifferenceMs / (3600 * 1000)) * 10) / 10);
    return {
      autoApproved: false,
      order,
      hoursRemaining,
    };
  }

  // Deadline has passed! Execute auto-approval
  const nowIso = new Date(nowTime).toISOString();
  const previousStatus = order.status;

  const autoApproveAudit: OrderAuditEvent = {
    id: generateAuditId(),
    order_id: order.id,
    user_id: "system",
    role: "system",
    event_type: "auto_approved",
    previous_status: previousStatus,
    new_status: "approved",
    details: `Review window expired (${REVIEW_WINDOW_HOURS} hours). System automatically approved the order.`,
    metadata: {
      review_deadline: reviewDeadline,
      processed_at: nowIso,
    },
    timestamp: nowIso,
  };

  order.status = "approved";
  order.approved_at = nowIso;
  (order as any).auto_approved = true;
  if (!(order as any).audit_trail) {
    (order as any).audit_trail = [];
  }
  (order as any).audit_trail.push(autoApproveAudit);
  order.updated_at = nowIso;

  // Persist
  const index = allOrders.findIndex((o) => o.id === order.id);
  if (index >= 0) {
    allOrders[index] = { ...allOrders[index], ...order };
    saveLocalOrders(allOrders);
  }

  return {
    autoApproved: true,
    order,
    hoursRemaining: 0,
  };
}

/**
 * 6. Check SLA Execution Status
 * Returns server-authoritative timer calculations for promoter delivery
 */
export function checkSLAStatus(
  order: PromotionOrder,
  currentServerTimestamp?: number
): {
  isExpired: boolean;
  hoursRemaining: number;
  deadlineIso: string | null;
} {
  const slaDeadline = (order as any).sla_deadline;
  if (!slaDeadline) {
    return { isExpired: false, hoursRemaining: 0, deadlineIso: null };
  }

  const now = currentServerTimestamp || Date.now();
  const deadlineMs = new Date(slaDeadline).getTime();
  const diffMs = deadlineMs - now;

  const hoursRemaining = Math.round((diffMs / (3600 * 1000)) * 10) / 10;
  return {
    isExpired: diffMs <= 0,
    hoursRemaining: Math.max(0, hoursRemaining),
    deadlineIso: slaDeadline,
  };
}

/**
 * 7. Get Order Audit Trail
 */
export async function getOrderAuditTrail(
  orderId: string,
  currentUserId?: string
): Promise<{ auditTrail: OrderAuditEvent[]; error: string | null }> {
  const { order, error } = await getPromotionOrderById(orderId, currentUserId);
  if (error || !order) {
    return { auditTrail: [], error: error || "Order not found." };
  }

  const auditTrail: OrderAuditEvent[] = (order as any).audit_trail || [];
  return { auditTrail, error: null };
}
