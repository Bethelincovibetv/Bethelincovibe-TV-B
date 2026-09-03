import { supabase } from "@/integrations/supabase/client";

export type CommunityType = "group" | "channel" | "status_audience";
export type VerificationStatus = "submitted" | "under_review" | "verified" | "rejected" | "suspended";

export interface WhatsAppCommunity {
  id: string; promoter_id: string; name: string; category_id: string | null;
  community_type: CommunityType; member_count: number; active_daily_views: number;
  country_primary: string; demographics_summary: string | null; proof_screenshot_url: string;
  verification_status: VerificationStatus; is_published: boolean; rejection_reason: string | null;
  verified_at: string | null; created_at: string; updated_at: string;
  category?: { id: string; name: string; slug: string } | null;
}

export const COMMUNITY_TYPES = [
  { id: "group" as CommunityType, label: "WhatsApp Group", shortLabel: "Group", description: "Interactive chat community with member discussions", sizeLabel: "Member Count", sizePlaceholder: "e.g. 1024", icon: "👥" },
  { id: "channel" as CommunityType, label: "WhatsApp Channel", shortLabel: "Channel", description: "One-way broadcast channel with high subscriber reach", sizeLabel: "Subscriber Count", sizePlaceholder: "e.g. 5500", icon: "📢" },
  { id: "status_audience" as CommunityType, label: "WhatsApp Status Audience", shortLabel: "Status Audience", description: "Personal contact list delivering high story/status view rates", sizeLabel: "Estimated Audience Size", sizePlaceholder: "e.g. 2500", icon: "📱" },
] as const;

export const DEFAULT_COMMUNITY_CATEGORIES = [
  { id: "cat-fashion", name: "Fashion & Apparel", slug: "fashion" }, { id: "cat-tech", name: "Technology & Gadgets", slug: "tech" },
  { id: "cat-food", name: "Food, Drinks & Restaurants", slug: "food" }, { id: "cat-beauty", name: "Beauty & Personal Care", slug: "beauty" },
  { id: "cat-business", name: "Business, Finance & Crypto", slug: "business" }, { id: "cat-real-estate", name: "Real Estate & Housing", slug: "real-estate" },
  { id: "cat-education", name: "Education & Jobs", slug: "education" }, { id: "cat-entertainment", name: "Entertainment & Events", slug: "entertainment" },
  { id: "cat-services", name: "Local Services & Trades", slug: "services" },
];

function isSchemaMissingError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || ""); const msg = String(error.message || "").toLowerCase();
  return code === "PGRST205" || code === "42P01" || msg.includes("schema cache") || msg.includes("could not find the table") || (msg.includes("relation") && msg.includes("does not exist"));
}

export function canEditCommunity(community: { verification_status?: string; is_published?: boolean }, isAdmin = false) {
  if (isAdmin) return { allowed: true };
  if (community.verification_status === "verified" && community.is_published) return { allowed: false, reason: "This audience is verified and cannot be edited directly. Contact an administrator if important information needs to be changed." };
  if (community.verification_status === "suspended") return { allowed: false, reason: "This audience has been suspended and cannot be edited." };
  return { allowed: true };
}

export function validateCommunityInput(params: { name: string; communityType: CommunityType; memberCount: number; activeDailyViews?: number }) {
  if (!params.name?.trim()) return { isValid: false, error: "Community name is required." };
  if (!["group", "channel", "status_audience"].includes(params.communityType)) return { isValid: false, error: "Invalid community type selected." };
  if (!Number.isFinite(params.memberCount) || params.memberCount <= 0) return { isValid: false, error: "Audience / member count must be greater than zero." };
  if (params.activeDailyViews !== undefined && (!Number.isFinite(params.activeDailyViews) || params.activeDailyViews < 0)) return { isValid: false, error: "Active daily views cannot be negative." };
  return { isValid: true };
}

export async function uploadCommunityProofScreenshot(file: File, promoterId: string): Promise<string> {
  if (!file) throw new Error("No image file provided for upload.");
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) throw new Error("Invalid image format. Supported formats: JPG, PNG, WEBP, GIF.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Screenshot image size exceeds 10MB limit.");
  const ext = file.name.split(".").pop() || "png"; const path = `promoter-proofs/${promoterId}/community-proof-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("business-media").upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`Failed to upload audience proof: ${error.message}`);
  return supabase.storage.from("business-media").getPublicUrl(path).data.publicUrl;
}

export async function getMyCommunities(promoterId: string): Promise<WhatsAppCommunity[]> {
  if (!promoterId) return [];
  const { data, error } = await supabase.from("whatsapp_communities").select(`*, category:categories(id,name,slug)`).eq("promoter_id", promoterId).order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load WhatsApp audiences: ${error.message}`);
  return (data || []) as unknown as WhatsAppCommunity[];
}

export async function getCommunityById(communityId: string): Promise<WhatsAppCommunity | null> {
  if (!communityId) return null;
  const { data, error } = await supabase.from("whatsapp_communities").select(`*, category:categories(id,name,slug)`).eq("id", communityId).maybeSingle();
  if (error) throw new Error(`Failed to load WhatsApp audience: ${error.message}`);
  return data as unknown as WhatsAppCommunity | null;
}

export async function createCommunity(params: { promoterId: string; name: string; categoryId?: string | null; communityType: CommunityType; memberCount: number; activeDailyViews?: number; countryPrimary?: string; demographicsSummary?: string | null; proofScreenshotUrl: string }): Promise<WhatsAppCommunity> {
  const validation = validateCommunityInput({ name: params.name, communityType: params.communityType, memberCount: params.memberCount, activeDailyViews: params.activeDailyViews });
  if (!validation.isValid) throw new Error(validation.error);
  if (!params.proofScreenshotUrl) throw new Error("Audience proof screenshot is mandatory for verification.");
  const { data, error } = await supabase.from("whatsapp_communities").insert({
    promoter_id: params.promoterId, name: params.name.trim(), category_id: params.categoryId || null,
    community_type: params.communityType, member_count: Math.floor(params.memberCount), active_daily_views: Math.floor(params.activeDailyViews || 0),
    country_primary: params.countryPrimary?.trim() || "Nigeria", demographics_summary: params.demographicsSummary?.trim() || null,
    proof_screenshot_url: params.proofScreenshotUrl,
  }).select(`*, category:categories(id,name,slug)`).single();
  if (error) throw new Error(`Failed to submit WhatsApp audience: ${error.message}`);
  return data as unknown as WhatsAppCommunity;
}

export async function updateCommunity(params: { communityId: string; name: string; categoryId?: string | null; communityType: CommunityType; memberCount: number; activeDailyViews?: number; countryPrimary?: string; demographicsSummary?: string | null; proofScreenshotUrl?: string; isAdmin?: boolean }): Promise<WhatsAppCommunity> {
  const validation = validateCommunityInput({ name: params.name, communityType: params.communityType, memberCount: params.memberCount, activeDailyViews: params.activeDailyViews });
  if (!validation.isValid) throw new Error(validation.error);
  const { data: existing, error: existingError } = await supabase.from("whatsapp_communities").select("verification_status,is_published").eq("id", params.communityId).single();
  if (existingError) throw new Error(`Failed to load audience before update: ${existingError.message}`);
  const check = canEditCommunity(existing, params.isAdmin); if (!check.allowed) throw new Error(check.reason);
  const payload: Record<string, any> = { name: params.name.trim(), category_id: params.categoryId || null, community_type: params.communityType, member_count: Math.floor(params.memberCount), active_daily_views: Math.floor(params.activeDailyViews || 0), country_primary: params.countryPrimary?.trim() || "Nigeria", demographics_summary: params.demographicsSummary?.trim() || null };
  if (params.proofScreenshotUrl) payload.proof_screenshot_url = params.proofScreenshotUrl;
  const { data, error } = await supabase.from("whatsapp_communities").update(payload).eq("id", params.communityId).select(`*, category:categories(id,name,slug)`).single();
  if (error) throw new Error(`Failed to update WhatsApp audience: ${error.message}`);
  return data as unknown as WhatsAppCommunity;
}

export async function deleteCommunity(communityId: string): Promise<void> {
  const { error } = await supabase.from("whatsapp_communities").delete().eq("id", communityId);
  if (error && !isSchemaMissingError(error)) throw new Error(`Failed to delete WhatsApp audience: ${error.message}`);
}

export async function getCommunityCategories(): Promise<Array<{ id: string; name: string; slug: string }>> {
  const { data, error } = await supabase.from("categories").select("id,name,slug").order("name", { ascending: true });
  if (error || !data?.length) return DEFAULT_COMMUNITY_CATEGORIES;
  return data;
}

export async function getPublicVerifiedCommunities(filters?: { categoryId?: string; communityType?: CommunityType; country?: string; minMembers?: number }): Promise<WhatsAppCommunity[]> {
  let query = supabase.from("whatsapp_communities").select(`*, category:categories(id,name,slug)`).eq("is_published", true).eq("verification_status", "verified");
  if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters?.communityType) query = query.eq("community_type", filters.communityType);
  if (filters?.country) query = query.eq("country_primary", filters.country);
  if (filters?.minMembers && filters.minMembers > 0) query = query.gte("member_count", filters.minMembers);
  const { data, error } = await query.order("member_count", { ascending: false });
  if (error) throw new Error(`Failed to load verified WhatsApp audiences: ${error.message}`);
  return (data || []) as unknown as WhatsAppCommunity[];
}
