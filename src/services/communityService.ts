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

export const DEFAULT_COMMUNITY_CATEGORIES = [
  { id: "cat-fashion", name: "Fashion & Apparel", slug: "fashion" },
  { id: "cat-tech", name: "Technology & Gadgets", slug: "tech" },
  { id: "cat-food", name: "Food, Drinks & Restaurants", slug: "food" },
  { id: "cat-beauty", name: "Beauty & Personal Care", slug: "beauty" },
  { id: "cat-business", name: "Business, Finance & Crypto", slug: "business" },
  { id: "cat-real-estate", name: "Real Estate & Housing", slug: "real-estate" },
  { id: "cat-education", name: "Education & Jobs", slug: "education" },
  { id: "cat-entertainment", name: "Entertainment & Events", slug: "entertainment" },
  { id: "cat-services", name: "Local Services & Trades", slug: "services" },
];

const COMMUNITY_STORAGE_KEY_PREFIX = "bincovibe_whatsapp_communities_";

/**
 * Checks if a Supabase error is caused by missing database table/migration in schema cache
 */
function isSchemaMissingError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || "");
  const msg = String(error.message || "").toLowerCase();
  const hint = String(error.hint || "").toLowerCase();
  const details = String(error.details || "").toLowerCase();
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    code === "PGRST116" ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table") ||
    (msg.includes("relation") && msg.includes("does not exist")) ||
    hint.includes("perhaps you meant") ||
    details.includes("table")
  );
}

function getLocalCommunities(promoterId: string): WhatsAppCommunity[] {
  try {
    const raw = localStorage.getItem(`${COMMUNITY_STORAGE_KEY_PREFIX}${promoterId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // ignore
  }
  return [];
}

function saveLocalCommunities(promoterId: string, items: WhatsAppCommunity[]): void {
  try {
    localStorage.setItem(`${COMMUNITY_STORAGE_KEY_PREFIX}${promoterId}`, JSON.stringify(items));
  } catch (e) {
    // ignore
  }
}

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
 * with robust local Data URL fallback.
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

  try {
    // Upload to business-media bucket
    const { error: uploadError } = await supabase.storage
      .from("business-media")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      // Fallback to guest-submissions bucket if business-media is restricted
      const { error: fallbackError } = await supabase.storage
        .from("guest-submissions")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (!fallbackError) {
        const { data: publicUrlData } = supabase.storage
          .from("guest-submissions")
          .getPublicUrl(filePath);
        return publicUrlData.publicUrl;
      }
    } else {
      const { data: publicUrlData } = supabase.storage
        .from("business-media")
        .getPublicUrl(filePath);
      return publicUrlData.publicUrl;
    }
  } catch (storageErr) {
    console.warn("Storage upload failed, falling back to data URL:", storageErr);
  }

  // Fallback: Convert to Data URL (base64) so image remains viewable and operable
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to process image file into data URL"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Fetch all communities belonging to a specific promoter profile
 */
export async function getMyCommunities(promoterId: string): Promise<WhatsAppCommunity[]> {
  if (!promoterId) return [];

  try {
    const { data, error } = await supabase
      .from("whatsapp_communities")
      .select(`
        *,
        category:categories(id, name, slug)
      `)
      .eq("promoter_id", promoterId)
      .order("created_at", { ascending: false });

    if (error) {
      if (isSchemaMissingError(error)) {
        return getLocalCommunities(promoterId);
      }
      console.warn("Notice: whatsapp_communities table fallback:", error.message);
      return getLocalCommunities(promoterId);
    }

    const items = (data || []) as unknown as WhatsAppCommunity[];
    if (items.length > 0) {
      saveLocalCommunities(promoterId, items);
    } else {
      const local = getLocalCommunities(promoterId);
      if (local.length > 0) return local;
    }
    return items;
  } catch (err: any) {
    return getLocalCommunities(promoterId);
  }
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

  const now = new Date().toISOString();
  const matchedCategory = DEFAULT_COMMUNITY_CATEGORIES.find((c) => c.id === params.categoryId);

  const fallbackCommunity: WhatsAppCommunity = {
    id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    promoter_id: params.promoterId,
    name: params.name.trim(),
    category_id: params.categoryId || null,
    community_type: params.communityType,
    member_count: Math.floor(params.memberCount),
    active_daily_views: Math.floor(params.activeDailyViews || 0),
    country_primary: params.countryPrimary?.trim() || "Nigeria",
    demographics_summary: params.demographicsSummary?.trim() || null,
    proof_screenshot_url: params.proofScreenshotUrl,
    verification_status: "submitted",
    is_published: false,
    rejection_reason: null,
    verified_at: null,
    created_at: now,
    updated_at: now,
    category: matchedCategory || null,
  };

  try {
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
      })
      .select(`
        *,
        category:categories(id, name, slug)
      `)
      .single();

    if (error) {
      if (isSchemaMissingError(error)) {
        const local = getLocalCommunities(params.promoterId);
        const updated = [fallbackCommunity, ...local];
        saveLocalCommunities(params.promoterId, updated);
        return fallbackCommunity;
      }
      console.warn("Supabase insert community fallback to local store:", error.message);
      const local = getLocalCommunities(params.promoterId);
      const updated = [fallbackCommunity, ...local];
      saveLocalCommunities(params.promoterId, updated);
      return fallbackCommunity;
    }

    const saved = data as unknown as WhatsAppCommunity;
    const local = getLocalCommunities(params.promoterId);
    saveLocalCommunities(params.promoterId, [saved, ...local.filter((c) => c.id !== saved.id)]);
    return saved;
  } catch (err: any) {
    const local = getLocalCommunities(params.promoterId);
    const updated = [fallbackCommunity, ...local];
    saveLocalCommunities(params.promoterId, updated);
    return fallbackCommunity;
  }
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

  const now = new Date().toISOString();
  const matchedCategory = DEFAULT_COMMUNITY_CATEGORIES.find((c) => c.id === params.categoryId);

  try {
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
      if (isSchemaMissingError(error)) {
        // Find in local storage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(COMMUNITY_STORAGE_KEY_PREFIX)) {
            const list: WhatsAppCommunity[] = JSON.parse(localStorage.getItem(key) || "[]");
            const idx = list.findIndex((c) => c.id === params.communityId);
            if (idx >= 0) {
              const updatedItem: WhatsAppCommunity = {
                ...list[idx],
                ...updatePayload,
                updated_at: now,
                category: matchedCategory || list[idx].category,
              };
              list[idx] = updatedItem;
              localStorage.setItem(key, JSON.stringify(list));
              return updatedItem;
            }
          }
        }
      }
      throw error;
    }

    return data as unknown as WhatsAppCommunity;
  } catch (err: any) {
    if (isSchemaMissingError(err)) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(COMMUNITY_STORAGE_KEY_PREFIX)) {
          const list: WhatsAppCommunity[] = JSON.parse(localStorage.getItem(key) || "[]");
          const idx = list.findIndex((c) => c.id === params.communityId);
          if (idx >= 0) {
            const updatedItem: WhatsAppCommunity = {
              ...list[idx],
              ...updatePayload,
              updated_at: now,
              category: matchedCategory || list[idx].category,
            };
            list[idx] = updatedItem;
            localStorage.setItem(key, JSON.stringify(list));
            return updatedItem;
          }
        }
      }
    }
    throw err;
  }
}

/**
 * Delete a community (only allowed for unverified/rejected or admins)
 */
export async function deleteCommunity(communityId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("whatsapp_communities")
      .delete()
      .eq("id", communityId);

    if (error && !isSchemaMissingError(error)) {
      console.warn("Error deleting community from Supabase:", error);
    }
  } catch (e) {
    // ignore
  }

  // Delete from local storage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(COMMUNITY_STORAGE_KEY_PREFIX)) {
        const list: WhatsAppCommunity[] = JSON.parse(localStorage.getItem(key) || "[]");
        const filtered = list.filter((c) => c.id !== communityId);
        if (filtered.length !== list.length) {
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      }
    }
  } catch (e) {
    // ignore
  }
}

/**
 * Fetch platform categories suitable for audience categorization
 */
export async function getCommunityCategories(): Promise<Array<{ id: string; name: string; slug: string }>> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug")
      .order("name", { ascending: true });

    if (error || !data || data.length === 0) {
      return DEFAULT_COMMUNITY_CATEGORIES;
    }

    return data;
  } catch (e) {
    return DEFAULT_COMMUNITY_CATEGORIES;
  }
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
  try {
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
      if (isSchemaMissingError(error)) {
        return getLocalPublishedVerified(filters);
      }
      return getLocalPublishedVerified(filters);
    }

    return (data || []) as unknown as WhatsAppCommunity[];
  } catch (err) {
    return getLocalPublishedVerified(filters);
  }
}

function getLocalPublishedVerified(filters?: {
  categoryId?: string;
  communityType?: CommunityType;
  country?: string;
  minMembers?: number;
}): WhatsAppCommunity[] {
  const result: WhatsAppCommunity[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(COMMUNITY_STORAGE_KEY_PREFIX)) {
        const list: WhatsAppCommunity[] = JSON.parse(localStorage.getItem(key) || "[]");
        for (const item of list) {
          if (item.is_published && item.verification_status === "verified") {
            if (filters?.categoryId && item.category_id !== filters.categoryId) continue;
            if (filters?.communityType && item.community_type !== filters.communityType) continue;
            if (filters?.country && item.country_primary !== filters.country) continue;
            if (filters?.minMembers && item.member_count < filters.minMembers) continue;
            result.push(item);
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return result;
}

