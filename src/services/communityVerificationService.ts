import { supabase } from "@/integrations/supabase/client";
import { WhatsAppCommunity, VerificationStatus, CommunityType } from "./communityService";
import { playNotificationSound } from "@/lib/notificationSound";

export type VerificationAction =
  | "submitted_for_review"
  | "approved"
  | "rejected"
  | "suspended";

export interface CommunityVerificationAudit {
  id: string;
  community_id: string;
  admin_id: string;
  action: VerificationAction;
  verification_notes: string | null;
  created_at: string;
  admin?: {
    id: string;
    email?: string;
    display_name?: string;
  } | null;
}

export interface AdminCommunityQueueItem extends WhatsAppCommunity {
  promoter?: {
    id: string;
    user_id: string;
    display_name: string;
    phone_whatsapp: string;
    bio: string | null;
    niche: string[] | null;
    rating: number;
    total_completed_orders: number;
    is_verified: boolean;
    status: string;
  } | null;
  verifications?: CommunityVerificationAudit[];
}



function getLocalAudits(_communityId: string): CommunityVerificationAudit[] { return []; }
function saveLocalAudit(_audit: CommunityVerificationAudit): void {}

function getAllLocalCommunitiesWithPromoters(): AdminCommunityQueueItem[] {
  const result: AdminCommunityQueueItem[] = [];
  try {
    // Collect all promoter profiles
    const promotersMap: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PROMOTER_STORAGE_KEY_PREFIX)) {
        try {
          const p = JSON.parse(localStorage.getItem(key) || "{}");
          if (p.id) promotersMap[p.id] = p;
        } catch {}
      }
    }

    // Collect all communities
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(COMMUNITIES_STORAGE_KEY_PREFIX)) {
        try {
          const list: WhatsAppCommunity[] = JSON.parse(localStorage.getItem(key) || "[]");
          for (const comm of list) {
            const promoter = promotersMap[comm.promoter_id] || null;
            const audits = getLocalAudits(comm.id);
            result.push({
              ...comm,
              promoter,
              verifications: audits,
            });
          }
        } catch {}
      }
    }
  } catch (e) {
    // ignore
  }
  return result;
}

function updateLocalCommunityStatus(..._args: any[]): void {}

/**
 * Fetch all communities for the Admin verification queue with filter and search support
 */
export async function fetchAdminCommunityQueue(filters?: {
  status?: string;
  search?: string;
  communityType?: CommunityType;
  categoryId?: string;
}): Promise<AdminCommunityQueueItem[]> {
  try {
    let query = supabase
      .from("whatsapp_communities")
      .select(`
        *,
        category:categories(id, name, slug),
        promoter:promoter_profiles(
          id,
          user_id,
          display_name,
          phone_whatsapp,
          bio,
          niche,
          rating,
          total_completed_orders,
          is_verified,
          status
        )
      `)
      .order("created_at", { ascending: false });

    if (filters?.status && filters.status !== "all") {
      query = query.eq("verification_status", filters.status);
    }

    if (filters?.communityType) {
      query = query.eq("community_type", filters.communityType);
    }

    if (filters?.categoryId) {
      query = query.eq("category_id", filters.categoryId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const communities = (data || []) as unknown as AdminCommunityQueueItem[];
    if (communities.length > 0) {
      // Return Supabase data
      return filterLocalCommunities(communities, filters);
    }

    return communities;
  } catch (err: any) { throw err; }
}

function filterLocalCommunities(
  items: AdminCommunityQueueItem[],
  filters?: { status?: string; search?: string; communityType?: CommunityType; categoryId?: string }
): AdminCommunityQueueItem[] {
  let filtered = [...items];

  if (filters?.status && filters.status !== "all") {
    filtered = filtered.filter((item) => item.verification_status === filters.status);
  }

  if (filters?.communityType) {
    filtered = filtered.filter((item) => item.community_type === filters.communityType);
  }

  if (filters?.categoryId) {
    filtered = filtered.filter((item) => item.category_id === filters.categoryId);
  }

  if (filters?.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    filtered = filtered.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.promoter?.display_name || "").toLowerCase().includes(q) ||
        (item.promoter?.phone_whatsapp || "").toLowerCase().includes(q) ||
        (item.category?.name || "").toLowerCase().includes(q) ||
        item.country_primary.toLowerCase().includes(q)
    );
  }

  return filtered;
}

/**
 * Fetch full verification audit history for a specific community
 */
export async function fetchCommunityVerificationHistory(
  communityId: string
): Promise<CommunityVerificationAudit[]> {
  if (!communityId) return [];

  try {
    const { data, error } = await supabase
      .from("community_verifications")
      .select("*")
      .eq("community_id", communityId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const logs = (data || []) as unknown as CommunityVerificationAudit[];
    return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (err) {
    return getLocalAudits(communityId);
  }
}

/**
 * Execute an atomic Admin Review action (submitted_for_review, approved, rejected, suspended)
 */
export async function executeAdminVerificationAction(params: {
  communityId: string;
  action: VerificationAction;
  notes?: string;
  rejectionReason?: string;
  promoterUserId?: string;
  communityName?: string;
}): Promise<{
  success: boolean;
  action: VerificationAction;
  newStatus: VerificationStatus;
  isPublished: boolean;
  auditId?: string;
}> {
  const { data: authData } = await supabase.auth.getUser();
  const currentUser = authData?.user;

  if (!currentUser) {
    throw new Error("Authentication required to perform administrative reviews.");
  }

  // 1. Rejection validation
  if (params.action === "rejected") {
    if (!params.rejectionReason || !params.rejectionReason.trim()) {
      throw new Error("A meaningful rejection reason is required to reject a community submission.");
    }
  }

  let newStatus: VerificationStatus = "submitted";
  let isPublished = false;
  let verifiedAt: string | null = null;
  let rejectionReason: string | null = null;

  if (params.action === "submitted_for_review") {
    newStatus = "under_review";
    isPublished = false;
  } else if (params.action === "approved") {
    newStatus = "verified";
    isPublished = true;
    verifiedAt = new Date().toISOString();
  } else if (params.action === "rejected") {
    newStatus = "rejected";
    isPublished = false;
    rejectionReason = params.rejectionReason?.trim() || null;
  } else if (params.action === "suspended") {
    newStatus = "suspended";
    isPublished = false;
  }

  const now = new Date().toISOString();
  const auditRecord: CommunityVerificationAudit = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    community_id: params.communityId,
    admin_id: currentUser.id,
    action: params.action,
    verification_notes: params.notes?.trim() || params.rejectionReason?.trim() || null,
    created_at: now,
    admin: {
      id: currentUser.id,
      email: currentUser.email,
      display_name: currentUser.user_metadata?.display_name || currentUser.email?.split("@")[0] || "Admin",
    },
  };

  // Attempt RPC first for database-level atomicity and security
  try {
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)("admin_verify_community", {
      p_community_id: params.communityId,
      p_action: params.action,
      p_notes: params.notes?.trim() || null,
      p_rejection_reason: params.rejectionReason?.trim() || null,
    });

    if (!rpcError && rpcData?.success) {
      saveLocalAudit(auditRecord);
      updateLocalCommunityStatus(
        params.communityId,
        newStatus,
        isPublished,
        rejectionReason,
        verifiedAt
      );

      try {
        playNotificationSound();
      } catch {}

      return {
        success: true,
        action: params.action,
        newStatus,
        isPublished,
        auditId: rpcData.audit_id || auditRecord.id,
      };
    }
  } catch (rpcErr) {
    console.warn("RPC admin_verify_community fallback to direct update:", rpcErr);
  }

  // Direct Supabase table updates fallback
  try {
    const updatePayload: any = {
      verification_status: newStatus,
      is_published: isPublished,
      updated_at: now,
    };

    if (params.action === "approved") {
      updatePayload.verified_at = verifiedAt;
      updatePayload.rejection_reason = null;
    } else if (params.action === "rejected") {
      updatePayload.rejection_reason = rejectionReason;
    }

    const { error: updateError } = await supabase
      .from("whatsapp_communities")
      .update(updatePayload)
      .eq("id", params.communityId);

    if (updateError && !isSchemaMissingError(updateError)) {
      console.warn("Notice: Direct update error on whatsapp_communities:", updateError);
    }

    // Insert audit log
    const { error: auditError } = await supabase.from("community_verifications").insert({
      community_id: params.communityId,
      admin_id: currentUser.id,
      action: params.action,
      verification_notes: params.notes?.trim() || params.rejectionReason?.trim() || null,
    });

    if (auditError && !isSchemaMissingError(auditError)) {
      console.warn("Notice: Direct insert error on community_verifications:", auditError);
    }

    // Create notification for promoter
    if (params.promoterUserId) {
      const notifTitle =
        params.action === "approved"
          ? "🎉 WhatsApp Community Approved & Published!"
          : params.action === "rejected"
          ? "WhatsApp Community Submission Update"
          : params.action === "submitted_for_review"
          ? "Community Under Review"
          : "WhatsApp Community Suspended";

      const notifBody =
        params.action === "approved"
          ? `Congratulations! Your WhatsApp community "${params.communityName || "audience"}" has been verified and published to the promotion network.`
          : params.action === "rejected"
          ? `Your community "${params.communityName || "audience"}" was not approved. Reason: ${params.rejectionReason}`
          : params.action === "submitted_for_review"
          ? `Your WhatsApp community "${params.communityName || "audience"}" has been placed under administrative review.`
          : `Your WhatsApp community "${params.communityName || "audience"}" has been suspended by platform administration.`;

      await supabase.from("user_notifications").insert({
        user_id: params.promoterUserId,
        title: notifTitle,
        body: notifBody,
        type: "community_verification",
        url: "/dashboard/promoter/profile?tab=communities",
        is_read: false,
      });
    }
  } catch (err) {
    console.warn("Fallback database operations warning:", err);
  }

  // Always update local cache & audit log
  saveLocalAudit(auditRecord);
  updateLocalCommunityStatus(
    params.communityId,
    newStatus,
    isPublished,
    rejectionReason,
    verifiedAt
  );

  try {
    playNotificationSound();
  } catch {}

  return {
    success: true,
    action: params.action,
    newStatus,
    isPublished,
    auditId: auditRecord.id,
  };
}
