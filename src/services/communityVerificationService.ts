import { WhatsAppCommunity, VerificationStatus, CommunityType } from "./communityService";
import { whatsappPromotersHub } from "./whatsappPromotersHub";
import { playNotificationSound } from "@/lib/notificationSound";

export type VerificationAction = "submitted_for_review" | "approved" | "rejected" | "suspended";
export interface CommunityVerificationAudit { id:string; community_id:string; admin_id:string; action:VerificationAction; verification_notes:string|null; created_at:string; admin?:{id:string;email?:string;display_name?:string}|null; }
export interface AdminCommunityQueueItem extends WhatsAppCommunity { promoter?:any|null; verifications?:CommunityVerificationAudit[]; category?:{id:string;name:string;slug:string}|null; }

const ADMIN_API_URL="https://xdfulgwlhqvwpntzbgeq.supabase.co/functions/v1/promoters-admin-api";
async function adminRequest<T>(path:string,method:"GET"|"PATCH"="GET",payload?:unknown):Promise<T>{
  const request=async(token:string)=>{const response=await fetch(`${ADMIN_API_URL}${path}`,{method,headers:{Authorization:`Bearer ${token}`,...(payload===undefined?{}:{"Content-Type":"application/json"})},body:payload===undefined?undefined:JSON.stringify(payload)});let data:any=null;try{data=await response.json();}catch{throw new Error(`Promoters Admin API returned HTTP ${response.status}`);}if(!response.ok||data?.success===false){const e:any=new Error(data?.error?.message||`Promoters Admin API failed (${response.status})`);e.status=response.status;throw e;}return data?.data as T;};
  const {supabase}=await import("@/integrations/supabase/client");let session=(await supabase.auth.getSession()).data.session;if(!session?.access_token)throw new Error("You must be signed in as an administrator.");try{return await request(session.access_token);}catch(e:any){if(e?.status!==401)throw e;session=(await supabase.auth.refreshSession()).data.session;if(!session?.access_token)throw new Error("Your session has expired. Please sign in again.");return await request(session.access_token);}
}

export async function fetchAdminCommunityQueue(filters?:{status?:string;search?:string;communityType?:CommunityType;categoryId?:string}):Promise<AdminCommunityQueueItem[]> {
  const params=new URLSearchParams();if(filters?.status)params.set("status",filters.status);if(filters?.communityType)params.set("community_type",filters.communityType);if(filters?.categoryId)params.set("category_id",filters.categoryId);
  const rows=await adminRequest<AdminCommunityQueueItem[]>(`/api/admin/audiences${params.toString()?`?${params}`:""}`);let items=(rows||[]) as AdminCommunityQueueItem[];
  if(filters?.search?.trim()){const q=filters.search.toLowerCase().trim();items=items.filter(i=>i.name.toLowerCase().includes(q)||(i.country_primary||"").toLowerCase().includes(q));}return items;
}
export async function fetchCommunityVerificationHistory(_communityId:string):Promise<CommunityVerificationAudit[]> { return []; }
export async function executeAdminVerificationAction(params:{communityId:string;action:VerificationAction;notes?:string;rejectionReason?:string;promoterUserId?:string;communityName?:string}):Promise<{success:boolean;action:VerificationAction;newStatus:VerificationStatus;isPublished:boolean;auditId?:string}> {
  if(params.action==="rejected"&&!params.rejectionReason?.trim())throw new Error("A meaningful rejection reason is required to reject a community submission.");
  await adminRequest(`/api/admin/audiences/${encodeURIComponent(params.communityId)}/status`,"PATCH",{action:params.action,notes:params.notes?.trim()||null,rejection_reason:params.rejectionReason?.trim()||null});
  const map:Record<VerificationAction,VerificationStatus>={submitted_for_review:"under_review",approved:"verified",rejected:"rejected",suspended:"suspended"};try{playNotificationSound();}catch{}return{success:true,action:params.action,newStatus:map[params.action],isPublished:params.action==="approved"};
}
