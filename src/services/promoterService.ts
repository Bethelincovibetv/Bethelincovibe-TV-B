import { supabase } from "@/integrations/supabase/client";
import { promotersHubRequest, whatsappPromotersHub } from "@/services/whatsappPromotersHub";

export type PromoterStatus = "active" | "suspended" | "vacation" | "pending" | "rejected";

export interface PromoterProfile {
  id: string;
  user_id: string;
  display_name: string;
  phone_whatsapp: string;
  bio: string | null;
  niche: string[] | null;
  rating: number;
  total_completed_orders: number;
  is_verified: boolean;
  status: PromoterStatus;
  created_at: string;
  updated_at: string;
  username?: string | null;
}

export const PROMOTER_NICHES = [
  { id: "fashion", label: "Fashion & Apparel", icon: "👗" },
  { id: "beauty", label: "Beauty & Cosmetics", icon: "💄" },
  { id: "food", label: "Food & Restaurants", icon: "🍲" },
  { id: "real_estate", label: "Real Estate & Housing", icon: "🏢" },
  { id: "business", label: "Business & Finance", icon: "💼" },
  { id: "tech", label: "Technology & Gadgets", icon: "📱" },
  { id: "education", label: "Education & Courses", icon: "📚" },
  { id: "events", label: "Events & Entertainment", icon: "🎉" },
  { id: "jobs", label: "Jobs & Opportunities", icon: "🤝" },
  { id: "services", label: "Local Services", icon: "🛠️" },
  { id: "health", label: "Health & Fitness", icon: "💪" },
  { id: "travel", label: "Travel & Hospitality", icon: "✈️" },
] as const;

export function validateAndNormalizeWhatsAppNumber(rawPhone: string): {
  isValid: boolean;
  normalizedE164: string;
  formattedDisplay: string;
  error?: string;
} {
  if (!rawPhone || typeof rawPhone !== "string") {
    return { isValid: false, normalizedE164: "", formattedDisplay: "", error: "WhatsApp phone number is required" };
  }

  let cleaned = rawPhone.trim().replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) cleaned = cleaned.substring(1);
  if (cleaned.startsWith("0") && cleaned.length === 11) cleaned = "234" + cleaned.substring(1);
  if (!cleaned.startsWith("234") && cleaned.length === 10 && /^[789]/.test(cleaned)) cleaned = "234" + cleaned;

  if (cleaned.startsWith("234")) {
    if (cleaned.length !== 13) {
      return {
        isValid: false,
        normalizedE164: `+${cleaned}`,
        formattedDisplay: rawPhone,
        error: "Nigerian WhatsApp number must contain 11 digits (e.g. 0801 234 5678)",
      };
    }
    return {
      isValid: true,
      normalizedE164: `+${cleaned}`,
      formattedDisplay: `+234 ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)} ${cleaned.substring(9)}`,
    };
  }

  if (cleaned.length >= 8 && cleaned.length <= 15) {
    return { isValid: true, normalizedE164: `+${cleaned}`, formattedDisplay: `+${cleaned}` };
  }

  return {
    isValid: false,
    normalizedE164: cleaned ? `+${cleaned}` : "",
    formattedDisplay: rawPhone,
    error: "Please enter a valid WhatsApp phone number with country code (e.g. 08012345678 or +234...)",
  };
}

function mapHubPromoter(raw: any): PromoterProfile {
  const promoter = raw?.data ?? raw;
  const phone = promoter?.phone_whatsapp ?? promoter?.whatsapp_number ?? promoter?.phone_number ?? "";
  const niches = promoter?.niche ?? promoter?.niches ?? [];
  return {
    id: String(promoter?.id ?? promoter?.promoter_id ?? ""),
    user_id: String(promoter?.external_user_id ?? promoter?.user_id ?? ""),
    display_name: String(promoter?.display_name ?? promoter?.name ?? ""),
    phone_whatsapp: String(phone),
    bio: promoter?.bio ?? null,
    niche: Array.isArray(niches) ? niches : [],
    rating: Number(promoter?.rating ?? 5),
    total_completed_orders: Number(promoter?.total_completed_orders ?? promoter?.completed_orders ?? 0),
    is_verified: Boolean(promoter?.is_verified ?? promoter?.verified ?? promoter?.verification_status === "verified"),
    status: (promoter?.status ?? (promoter?.is_verified ? "active" : "pending")) as PromoterStatus,
    created_at: String(promoter?.created_at ?? new Date().toISOString()),
    updated_at: String(promoter?.updated_at ?? new Date().toISOString()),
    username: promoter?.username ?? null,
  };
}

export async function getPromoterProfileById(profileId: string): Promise<PromoterProfile | null> {
  if (!profileId) return null;
  try {
    const raw = await promotersHubRequest(`/api/promoters/${encodeURIComponent(profileId)}`);
    return mapHubPromoter(raw);
  } catch (error: any) {
    if (/not found|404/i.test(error?.message || "")) return null;
    throw new Error(`Unable to load promoter profile: ${error?.message || "Promoters Hub request failed"}`);
  }
}

export async function getPromoterProfileByUserId(userId: string): Promise<PromoterProfile | null> {
  return getMyPromoterProfile(userId);
}

export async function getMyPromoterProfile(userId: string): Promise<PromoterProfile | null> {
  if (!userId) return null;
  try {
    const raw = await promotersHubRequest<any[]>("/api/promoters", "GET", undefined, { external_user_id: userId });
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return list.length ? mapHubPromoter(list[0]) : null;
  } catch (error: any) {
    if (/not found|no promoter|does not exist|404/i.test(error?.message || "")) return null;
    throw new Error(`Unable to load promoter profile: ${error?.message || "Promoters Hub request failed"}`);
  }
}

export async function createPromoterProfile(params: {
  userId: string;
  displayName: string;
  phoneWhatsApp: string;
  bio?: string;
  niches?: string[];
}): Promise<PromoterProfile> {
  const { isValid, normalizedE164, error: validationError } = validateAndNormalizeWhatsAppNumber(params.phoneWhatsApp);
  if (!isValid) throw new Error(validationError || "Invalid WhatsApp phone number");
  if (!params.displayName.trim()) throw new Error("Display name is required");

  const { data: sessionData } = await supabase.auth.getSession();
  const email = sessionData.session?.user?.email ?? null;

  try {
    const raw = await whatsappPromotersHub.createPromoter({
      external_user_id: params.userId,
      display_name: params.displayName.trim(),
      email,
      phone_number: normalizedE164,
      whatsapp_number: normalizedE164,
      bio: params.bio?.trim() || null,
      niches: params.niches?.length ? params.niches : [],
      niche: params.niches?.length ? params.niches : [],
    });
    return mapHubPromoter(raw);
  } catch (error: any) {
    if (/already exists|duplicate|unique|23505/i.test(error?.message || "")) {
      throw new Error("A promoter profile already exists for this account.");
    }
    throw new Error(`Unable to create promoter profile: ${error?.message || "Promoters Hub request failed"}`);
  }
}

export async function updatePromoterProfile(params: {
  profileId: string;
  displayName: string;
  phoneWhatsApp: string;
  bio?: string;
  niches?: string[];
}): Promise<PromoterProfile> {
  const { isValid, normalizedE164, error: validationError } = validateAndNormalizeWhatsAppNumber(params.phoneWhatsApp);
  if (!isValid) throw new Error(validationError || "Invalid WhatsApp phone number");
  if (!params.displayName.trim()) throw new Error("Display name is required");

  try {
    const raw = await whatsappPromotersHub.updatePromoter(params.profileId, {
      display_name: params.displayName.trim(),
      phone_number: normalizedE164,
      whatsapp_number: normalizedE164,
      bio: params.bio?.trim() || null,
      niches: params.niches || [],
      niche: params.niches || [],
    });
    return mapHubPromoter(raw);
  } catch (error: any) {
    throw new Error(`Unable to update promoter profile: ${error?.message || "Promoters Hub request failed"}`);
  }
}
