import { WhatsAppCommunity, VerificationStatus, CommunityType } from "./communityService";
import { whatsappPromotersHub } from "./whatsappPromotersHub";
import { playNotificationSound } from "@/lib/notificationSound";

export type VerificationAction = "submitted_for_review" | "approved" | "rejected" | "suspended";
export interface CommunityVerificationAudit { id:string; community_id:string; admin_id:string; action:VerificationAction; verification_notes:string|null; created_at:string; admin?:{id:string;email?:string;display_name?:string}|null; }
export interface AdminCommunityQueueItem extends WhatsAppCommunity { promoter?:any|null; verifications?:CommunityVerificationAudit[]; category?:{id:string;name:string;slug:string}|null; }

export async function fetchAdminCommunityQueue(filters?:{status?:string;search?:string;communityType?:CommunityType;categoryId?:string}):Promise<AdminCommunityQueueItem[]> {
  const rows=await whatsappPromotersHub.adminAudiences({status:filters?.status,community_type:filters?.communityType,category_id:filters?.categoryId});
  let items=(rows||[]) as AdminCommunityQueueItem[];
  if(filters?.search?.trim()){const q=filters.search.toLowerCase().trim();items=items.filter(i=>i.name.toLowerCase().includes(q)||(i.country_primary||"").toLowerCase().includes(q));}
  return items;
}

export async function fetchCommunityVerificationHistory(_communityId:string):Promise<CommunityVerificationAudit[]> { return []; }

export async function executeAdminVerificationAction(params:{communityId:string;action:VerificationAction;notes?:string;rejectionReason?:string;promoterUserId?:string;communityName?:string}):Promise<{success:boolean;action:VerificationAction;newStatus:VerificationStatus;isPublished:boolean;auditId?:string}> {
  if(params.action==="rejected"&&!params.rejectionReason?.trim())throw new Error("A meaningful rejection reason is required to reject a community submission.");
  const result=await whatsappPromotersHub.adminAudienceStatus(params.communityId,{action:params.action,notes:params.notes?.trim()||null,rejection_reason:params.rejectionReason?.trim()||null}) as any;
  const map:Record<VerificationAction,VerificationStatus>={submitted_for_review:"under_review",approved:"verified",rejected:"rejected",suspended:"suspended"};
  try{playNotificationSound();}catch{}
  return {success:true,action:params.action,newStatus:map[params.action],isPublished:params.action==="approved",auditId:result?.audit_id};
}
