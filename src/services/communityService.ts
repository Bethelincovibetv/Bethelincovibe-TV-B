import { supabase } from "@/integrations/supabase/client";

export type CommunityType = "group" | "channel" | "status_audience";
export type VerificationStatus = "submitted" | "under_review" | "verified" | "rejected";

export interface WhatsAppCommunity {
  id: string;
  promoter_id: string;
  name: string;
  category_id: string | null;
  community_type: CommunityType;
  member_count: number;
  active_daily_views: number;
  country_primary: string;
  demographics_summary: string | null;
  proof_screenshot_url: string;
  verification_status: VerificationStatus;
  is_published: boolean;
  rejection_reason: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export const COMMUNITY_TYPES = [
  {
    id: "group" as CommunityType,
    label: "WhatsApp Group",
    shortLabel: "Group",
    description: "Interactive chat community with member discussions",
    sizeLabel: "Member Count",
    sizePlaceholder: "e.g. 1024",
    icon: "👥",
  },
  {
    id: "channel" as CommunityType,
    label: "WhatsApp Channel",
    shortLabel: "Channel",
    description: "One-way broadcast channel with high subscriber reach",
    sizeLabel: "Subscriber Count",
    sizePlaceholder: "e.g. 5500",
    icon: "📢",
  },
  {
    id: "status_audience" as CommunityType,
    label: "WhatsApp Status Audience",
    shortLabel: "Status Audience",
    description: "Personal contact list delivering high story/status view rates",
    sizeLabel: "Estimated Audience Size",
    sizePlaceholder: "e.g. 2500",
    icon: "📱",
  },
] as const;

/**
 * Validates community creation/update parameters
 */
export function validateCommunityInput(params: {
  name: string;
  communityType: CommunityType;
  memberCount: number;
  activeDailyViews?: number;
  proofScreenshotUrl?: string;
}): { isValid: boolean; error?: string } {
  if (!params.name || !params.name.trim()) {
    return { isValid: false, error: "Community name is required." };
  }

  if (!["group", "channel", "status_audience"].includes(params.communityType)) {
    return { isValid: false, error: "Invalid community type selected." };
  }

  if (typeof params.memberCount !== "number" || params.memberCount <= 0 || isNaN(params.memberCount)) {
    return { isValid: false, error: "Audience / member count must be greater than zero." };
  }

  if (
    params.activeDailyViews !== undefined &&
    (typeof params.activeDailyViews !== "number" || params.activeDailyViews < 0 || isNaN(params.activeDailyViews))
  ) {
    return { isValid: false, error: "Active daily views cannot be negative." };
  }

  return { isValid: true };
}

/**
 * Upload audience proof screenshot to Supabase Storage (business-media bucket)
 */
export async function uploadCommunityProofScreenshot(
  file: File,
  promoterId: string
): Promise<string> {
  if (!file) {
    throw new Error("No image file provided for upload.");
  }

  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!validTypes.includes(file.type)) {
    throw new Error("Invalid image format. Supported formats: JPG, PNG, WEBP, GIF.");
  }

  // Max 10MB
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Screenshot image size exceeds 10MB limit.");
  }

  const fileExt = file.name.split(".").pop() || "png";
  const fileName = `community-proof-${promoterId}-${Date.now()}.${fileExt}`;
  const filePath = `promoter-proofs/${promoterId}/${fileName}`;

  // Upload to business-media bucket
  const { error: uploadError } = await supabase.storage
    .from("business-media")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    // Fallback to guest-submissions bucket if business-media is restricted
    const { error: fallbackError } = await supabase.storage
      .from("guest-submissions")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (fallbackError) {
      throw new Error(`Failed to upload screenshot: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from("guest-submissions")
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  }

  const { data: publicUrlData } = supabase.storage
    .from("business-media")
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

/**
 * Fetch all communities belonging to a specific promoter profile
 */
export async function getMyCommunities(promoterId: string): Promise<WhatsAppCommunity[]> {
  if (!promoterId) return [];

  const { data, error } = await supabase
    .from("whatsapp_communities")
    .select(`
      *,
      category:categories(id, name, slug)
    `)
    .eq("promoter_id", promoterId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching promoter communities:", error);
    throw error;
  }

  return (data || []) as unknown as WhatsAppCommunity[];
}

/**
 * Create a new WhatsApp community submission
 */
export async function createCommunity(params: {
  promoterId: string;
  name: string;
  categoryId?: string | null;
  communityType: CommunityType;
  memberCount: number;
  activeDailyViews?: number;
  countryPrimary?: string;
  demographicsSummary?: string | null;
  proofScreenshotUrl: string;
}): Promise<WhatsAppCommunity> {
  const validation = validateCommunityInput({
    name: params.name,
    communityType: params.communityType,
    memberCount: params.memberCount,
    activeDailyViews: params.activeDailyViews,
  });

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  if (!params.proofScreenshotUrl) {
    throw new Error("Audience proof screenshot is mandatory for verification.");
  }

  const { data, error } = await supabase
    .from("whatsapp_communities")
    .insert({
      promoter_id: params.promoterId,
      name: params.name.trim(),
      category_id: params.categoryId || null,
      community_type: params.communityType,
      member_count: Math.floor(params.memberCount),
      active_daily_views: Math.floor(params.activeDailyViews || 0),
      country_primary: params.countryPrimary?.trim() || "Nigeria",
      demographics_summary: params.demographicsSummary?.trim() || null,
      proof_screenshot_url: params.proofScreenshotUrl,
      // Database triggers force verification_status='submitted' and is_published=false for non-admins
    })
    .select(`
      *,
      category:categories(id, name, slug)
    `)
    .single();

  if (error) {
    console.error("Error creating WhatsApp community:", error);
    throw error;
  }

  return data as unknown as WhatsAppCommunity;
}

/**
 * Update an existing WhatsApp community
 */
export async function updateCommunity(params: {
  communityId: string;
  name: string;
  categoryId?: string | null;
  communityType: CommunityType;
  memberCount: number;
  activeDailyViews?: number;
  countryPrimary?: string;
  demographicsSummary?: string | null;
  proofScreenshotUrl?: string;
}): Promise<WhatsAppCommunity> {
  const validation = validateCommunityInput({
    name: params.name,
    communityType: params.communityType,
    memberCount: params.memberCount,
    activeDailyViews: params.activeDailyViews,
  });

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const updatePayload: Record<string, any> = {
    name: params.name.trim(),
    category_id: params.categoryId || null,
    community_type: params.communityType,
    member_count: Math.floor(params.memberCount),
    active_daily_views: Math.floor(params.activeDailyViews || 0),
    country_primary: params.countryPrimary?.trim() || "Nigeria",
    demographics_summary: params.demographicsSummary?.trim() || null,
  };

  if (params.proofScreenshotUrl) {
    updatePayload.proof_screenshot_url = params.proofScreenshotUrl;
  }

  const { data, error } = await supabase
    .from("whatsapp_communities")
    .update(updatePayload)
    .eq("id", params.communityId)
    .select(`
      *,
      category:categories(id, name, slug)
    `)
    .single();

  if (error) {
    console.error("Error updating WhatsApp community:", error);
    throw error;
  }

  return data as unknown as WhatsAppCommunity;
}

/**
 * Delete a community (only allowed for unverified/rejected or admins)
 */
export async function deleteCommunity(communityId: string): Promise<void> {
  const { error } = await supabase
    .from("whatsapp_communities")
    .delete()
    .eq("id", communityId);

  if (error) {
    console.error("Error deleting community:", error);
    throw error;
  }
}

/**
 * Fetch platform categories suitable for audience categorization
 */
export async function getCommunityCategories(): Promise<Array<{ id: string; name: string; slug: string }>> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (error) {
    console.warn("Error fetching categories:", error);
    return [];
  }

  return data || [];
}

/**
 * Prepared query for Step 4: Marketplace Discovery of Verified & Published Communities
 */
export async function getPublicVerifiedCommunities(filters?: {
  categoryId?: string;
  communityType?: CommunityType;
  country?: string;
  minMembers?: number;
}): Promise<WhatsAppCommunity[]> {
  let query = supabase
    .from("whatsapp_communities")
    .select(`
      *,
      category:categories(id, name, slug)
    `)
    .eq("is_published", true)
    .eq("verification_status", "verified");

  if (filters?.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  if (filters?.communityType) {
    query = query.eq("community_type", filters.communityType);
  }

  if (filters?.country) {
    query = query.eq("country_primary", filters.country);
  }

  if (filters?.minMembers && filters.minMembers > 0) {
    query = query.gte("member_count", filters.minMembers);
  }

  const { data, error } = await query.order("member_count", { ascending: false });

  if (error) {
    console.error("Error querying verified communities:", error);
    throw error;
  }

  return (data || []) as unknown as WhatsAppCommunity[];
}
