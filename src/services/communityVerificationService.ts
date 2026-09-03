import { supabase } from "@/integrations/supabase/client";
import { WhatsAppCommunity, VerificationStatus, CommunityType } from "./communityService";
import { playNotificationSound } from "@/lib/notificationSound";

export type VerificationAction = "submitted_for_review" | "approved" | "rejected" | "suspended";

export interface CommunityVerificationAudit {
  id: string; community_id: string; admin_id: string; action: VerificationAction;
  verification_notes: string | null; created_at: string;
  admin?: { id: string; email?: string; display_name?: string } | null;
}

export interface AdminCommunityQueueItem extends WhatsAppCommunity {
  promoter?: { id: string; user_id: string; display_name: string; phone_whatsapp: string | null; bio: string | null; niche: string[] | null; rating: number; total_completed_orders: number; is_verified: boolean; status: string } | null;
  verifications?: CommunityVerificationAudit[];
  category?: { id: string; name: string; slug: string } | null;
}

export async function fetchAdminCommunityQueue(filters?: { status?: string; search?: string; communityType?: CommunityType; categoryId?: string }): Promise<AdminCommunityQueueItem[]> {
  let query = supabase.from("whatsapp_communities").select("*").order("created_at", { ascending: false });
  if (filters?.status && filters.status !== "all") query = query.eq("verification_status", filters.status);
  if (filters?.communityType) query = query.eq("community_type", filters.communityType);
  if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);
  const { data: communities, error } = await query;
  if (error) throw new Error(`Failed to load community verification queue: ${error.message}`);
  const rows = (communities || []) as any[];
  if (!rows.length) return [];

  const promoterIds = [...new Set(rows.map(r => r.promoter_id).filter(Boolean))];
  const categoryIds = [...new Set(rows.map(r => r.category_id).filter(Boolean))];
  const [{ data: promoters, error: promoterError }, { data: categories, error: categoryError }] = await Promise.all([
    promoterIds.length ? supabase.from("promoter_profiles").select("id,user_id,display_name,phone_whatsapp,bio,niche,rating,total_completed_orders,is_verified,status").in("id", promoterIds) : Promise.resolve({ data: [], error: null } as any),
    categoryIds.length ? supabase.from("categories").select("id,name,slug").in("id", categoryIds) : Promise.resolve({ data: [], error: null } as any),
  ]);
  if (promoterError) throw new Error(`Failed to load community promoters: ${promoterError.message}`);
  if (categoryError) throw new Error(`Failed to load community categories: ${categoryError.message}`);
  const promoterMap = new Map((promoters || []).map((p: any) => [p.id, p]));
  const categoryMap = new Map((categories || []).map((c: any) => [c.id, c]));
  let items = rows.map(r => ({ ...r, promoter: promoterMap.get(r.promoter_id) || null, category: categoryMap.get(r.category_id) || null })) as AdminCommunityQueueItem[];
  if (filters?.search?.trim()) {
    const q = filters.search.toLowerCase().trim();
    items = items.filter(item => item.name.toLowerCase().includes(q) || (item.promoter?.display_name || "").toLowerCase().includes(q) || (item.promoter?.phone_whatsapp || "").toLowerCase().includes(q) || (item.category?.name || "").toLowerCase().includes(q) || (item.country_primary || "").toLowerCase().includes(q));
  }
  return items;
}

export async function fetchCommunityVerificationHistory(communityId: string): Promise<CommunityVerificationAudit[]> {
  if (!communityId) return [];
  const { data, error } = await supabase.from("community_verifications").select("*").eq("community_id", communityId).order("created_at", { ascending: false });
  if (error) throw error;
  return ((data || []) as unknown as CommunityVerificationAudit[]).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function executeAdminVerificationAction(params: { communityId: string; action: VerificationAction; notes?: string; rejectionReason?: string; promoterUserId?: string; communityName?: string }): Promise<{ success: boolean; action: VerificationAction; newStatus: VerificationStatus; isPublished: boolean; auditId?: string }> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) throw new Error("Authentication required to perform administrative reviews.");
  if (params.action === "rejected" && !params.rejectionReason?.trim()) throw new Error("A meaningful rejection reason is required to reject a community submission.");
  const statusMap: Record<VerificationAction, VerificationStatus> = { submitted_for_review: "under_review", approved: "verified", rejected: "rejected", suspended: "suspended" };
  const newStatus = statusMap[params.action];
  const isPublished = params.action === "approved";
  const { data: rpcData, error: rpcError } = await (supabase.rpc as any)("admin_verify_community", { p_community_id: params.communityId, p_action: params.action, p_notes: params.notes?.trim() || null, p_rejection_reason: params.rejectionReason?.trim() || null });
  if (rpcError) throw rpcError;
  if (!rpcData?.success) throw new Error(rpcData?.error || "Community verification action failed.");
  if (params.promoterUserId) {
    const title = params.action === "approved" ? "🎉 WhatsApp Community Approved & Published!" : params.action === "rejected" ? "WhatsApp Community Submission Update" : params.action === "submitted_for_review" ? "Community Under Review" : "WhatsApp Community Suspended";
    const body = params.action === "approved" ? `Congratulations! Your WhatsApp community "${params.communityName || "audience"}" has been verified and published to the promotion network.` : params.action === "rejected" ? `Your community "${params.communityName || "audience"}" was not approved. Reason: ${params.rejectionReason}` : params.action === "submitted_for_review" ? `Your WhatsApp community "${params.communityName || "audience"}" has been placed under administrative review.` : `Your WhatsApp community "${params.communityName || "audience"}" has been suspended by platform administration.`;
    const { error: notificationError } = await supabase.from("user_notifications").insert({ user_id: params.promoterUserId, title, body, type: "community_verification", url: "/dashboard/promoter/profile?tab=communities", is_read: false });
    if (notificationError) throw notificationError;
  }
  try { playNotificationSound(); } catch {}
  return { success: true, action: params.action, newStatus, isPublished, auditId: rpcData.audit_id || undefined };
}
