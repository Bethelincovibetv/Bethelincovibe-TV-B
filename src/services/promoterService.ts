import { supabase } from "@/integrations/supabase/client";

export type PromoterStatus = "active" | "suspended" | "vacation";

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

  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = "234" + cleaned.substring(1);
  }

  if (!cleaned.startsWith("234") && cleaned.length === 10 && /^[789]/.test(cleaned)) {
    cleaned = "234" + cleaned;
  }

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
    return {
      isValid: true,
      normalizedE164: `+${cleaned}`,
      formattedDisplay: `+${cleaned}`,
    };
  }

  return {
    isValid: false,
    normalizedE164: cleaned ? `+${cleaned}` : "",
    formattedDisplay: rawPhone,
    error: "Please enter a valid WhatsApp phone number with country code (e.g. 08012345678 or +234...)",
  };
}

export async function getPromoterProfileById(profileId: string): Promise<PromoterProfile | null> {
  if (!profileId) return null;

  const { data, error } = await supabase
    .from("promoter_profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();

  if (error) throw new Error(`Unable to load promoter profile: ${error.message}`);
  return data as PromoterProfile | null;
}

export async function getPromoterProfileByUserId(userId: string): Promise<PromoterProfile | null> {
  return getMyPromoterProfile(userId);
}

export async function getMyPromoterProfile(userId: string): Promise<PromoterProfile | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("promoter_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Unable to load promoter profile: ${error.message}`);
  return data as PromoterProfile | null;
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

  const { data, error } = await supabase
    .from("promoter_profiles")
    .insert({
      user_id: params.userId,
      display_name: params.displayName.trim(),
      phone_whatsapp: normalizedE164,
      bio: params.bio?.trim() || null,
      niche: params.niches?.length ? params.niches : [],
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("A promoter profile already exists for this account.");
    throw new Error(`Unable to create promoter profile: ${error.message}`);
  }

  return data as PromoterProfile;
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

  const { data, error } = await supabase
    .from("promoter_profiles")
    .update({
      display_name: params.displayName.trim(),
      phone_whatsapp: normalizedE164,
      bio: params.bio?.trim() || null,
      niche: params.niches || [],
    })
    .eq("id", params.profileId)
    .select()
    .single();

  if (error) throw new Error(`Unable to update promoter profile: ${error.message}`);
  return data as PromoterProfile;
}
