import { supabase } from "@/integrations/supabase/client";
import { whatsappPromotersHub } from "./whatsappPromotersHub";

export type CommunityType = "group" | "channel" | "status_audience";
export type VerificationStatus = "submitted" | "under_review" | "verified" | "rejected" | "suspended";

export interface WhatsAppCommunity {
  id: string; promoter_id: string; name: string; category_id: string | null; category?: { id: string; name: string; slug: string } | null;
  community_type: CommunityType; member_count: number; active_daily_views: number; country_primary: string; demographics_summary: string | null;
  proof_screenshot_url: string; verification_status: VerificationStatus; is_published: boolean; rejection_reason: string | null;
  verified_at: string | null; created_at: string; updated_at: string;
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
  const ext = file.name.split(".").pop() || "png";
  const path = `promoter-proofs/${promoterId}/community-proof-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("business-media").upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`Failed to upload audience proof: ${error.message}`);
  return supabase.storage.from("business-media").getPublicUrl(path).data.publicUrl;
}

export async function getMyCommunities(_promoterId: string): Promise<WhatsAppCommunity[]> {
  const data = await whatsappPromotersHub.audiences();
  return (data || []) as WhatsAppCommunity[];
}

export async function getCommunityById(communityId: string): Promise<WhatsAppCommunity | null> {
  if (!communityId) return null;
  try { return await whatsappPromotersHub.getAudience(communityId) as WhatsAppCommunity; } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) return null;
    throw new Error(`Failed to load WhatsApp audience: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function createCommunity(params: { promoterId: string; name: string; categoryId?: string | null; communityType: CommunityType; memberCount: number; activeDailyViews?: number; countryPrimary?: string; demographicsSummary?: string | null; proofScreenshotUrl: string }): Promise<WhatsAppCommunity> {
  const validation = validateCommunityInput({ name: params.name, communityType: params.communityType, memberCount: params.memberCount, activeDailyViews: params.activeDailyViews });
  if (!validation.isValid) throw new Error(validation.error);
  if (!params.proofScreenshotUrl) throw new Error("Audience proof screenshot is mandatory for verification.");
  return await whatsappPromotersHub.createAudience({ name: params.name.trim(), category_id: params.categoryId || null, community_type: params.communityType, member_count: Math.floor(params.memberCount), active_daily_views: Math.floor(params.activeDailyViews || 0), country_primary: params.countryPrimary?.trim() || "Nigeria", demographics_summary: params.demographicsSummary?.trim() || null, proof_screenshot_url: params.proofScreenshotUrl }) as WhatsAppCommunity;
}

export async function updateCommunity(params: { communityId: string; name: string; categoryId?: string | null; communityType: CommunityType; memberCount: number; activeDailyViews?: number; countryPrimary?: string; demographicsSummary?: string | null; proofScreenshotUrl?: string; isAdmin?: boolean }): Promise<WhatsAppCommunity> {
  const validation = validateCommunityInput({ name: params.name, communityType: params.communityType, memberCount: params.memberCount, activeDailyViews: params.activeDailyViews });
  if (!validation.isValid) throw new Error(validation.error);
  return await whatsappPromotersHub.updateAudience(params.communityId, { name: params.name.trim(), category_id: params.categoryId || null, community_type: params.communityType, member_count: Math.floor(params.memberCount), active_daily_views: Math.floor(params.activeDailyViews || 0), country_primary: params.countryPrimary?.trim() || "Nigeria", demographics_summary: params.demographicsSummary?.trim() || null, ...(params.proofScreenshotUrl ? { proof_screenshot_url: params.proofScreenshotUrl } : {}) }) as WhatsAppCommunity;
}

export async function deleteCommunity(communityId: string): Promise<void> { await whatsappPromotersHub.deleteAudience(communityId); }

export async function getCommunityCategories(): Promise<Array<{ id: string; name: string; slug: string }>> { return DEFAULT_COMMUNITY_CATEGORIES; }

export async function getPublicVerifiedCommunities(filters?: { categoryId?: string; communityType?: CommunityType; country?: string; minMembers?: number }): Promise<WhatsAppCommunity[]> {
  return await promotersHubPublicAudiences(filters);
}

async function promotersHubPublicAudiences(filters?: { categoryId?: string; communityType?: CommunityType; country?: string; minMembers?: number }): Promise<WhatsAppCommunity[]> {
  return await whatsappPromotersHubRequestPublic("/api/public/audiences", "GET", undefined, filters) as WhatsAppCommunity[];
}

async function whatsappPromotersHubRequestPublic(path: string, method: "GET" = "GET", body?: unknown, query?: Record<string, string | number | boolean | null | undefined>) {
  return whatsappPromotersHubRequestInternal(path, method, body, query);
}

async function whatsappPromotersHubRequestInternal(path: string, method: "GET", body?: unknown, query?: Record<string, string | number | boolean | null | undefined>) {
  return whatsappPromotersHub.promotersHubRequest ? (whatsappPromotersHub as any).promotersHubRequest(path, method, body, query) : [];
}
