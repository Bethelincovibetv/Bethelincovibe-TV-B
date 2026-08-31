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

/**
 * Validates and normalizes Nigerian & international WhatsApp phone numbers.
 * Supports Nigerian formats (e.g. 080..., 090..., 070..., 081..., +234...)
 * and converts to standardized E.164 (+2348012345678).
 */
export function validateAndNormalizeWhatsAppNumber(rawPhone: string): {
  isValid: boolean;
  normalizedE164: string;
  formattedDisplay: string;
  error?: string;
} {
  if (!rawPhone || typeof rawPhone !== "string") {
    return { isValid: false, normalizedE164: "", formattedDisplay: "", error: "WhatsApp phone number is required" };
  }

  // Strip non-digits except initial '+'
  let cleaned = rawPhone.trim().replace(/[^\d+]/g, "");

  // If starts with +, remove for processing
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  // Handle Nigerian 11-digit local mobile numbers (e.g., 08012345678, 09012345678, 070..., 081...)
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = "234" + cleaned.substring(1);
  }

  // Handle 10-digit without leading 0 for Nigerian numbers (e.g., 8012345678)
  if (!cleaned.startsWith("234") && cleaned.length === 10 && /^[789]/.test(cleaned)) {
    cleaned = "234" + cleaned;
  }

  // Check Nigerian prefix (234) validation
  if (cleaned.startsWith("234")) {
    if (cleaned.length !== 13) {
      return {
        isValid: false,
        normalizedE164: `+${cleaned}`,
        formattedDisplay: rawPhone,
        error: "Nigerian WhatsApp number must contain 11 digits (e.g. 0801 234 5678)",
      };
    }

    const normalizedE164 = `+${cleaned}`;
    // Format: +234 801 234 5678
    const formattedDisplay = `+234 ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)} ${cleaned.substring(9)}`;

    return {
      isValid: true,
      normalizedE164,
      formattedDisplay,
    };
  }

  // Handle generic international numbers
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

/**
 * Fetch the current user's promoter profile
 */
export async function getMyPromoterProfile(userId: string): Promise<PromoterProfile | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("promoter_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching promoter profile:", error);
    throw error;
  }

  return data as PromoterProfile | null;
}

/**
 * Register/Create a new promoter profile for the authenticated user
 */
export async function createPromoterProfile(params: {
  userId: string;
  displayName: string;
  phoneWhatsApp: string;
  bio?: string;
  niches?: string[];
}): Promise<PromoterProfile> {
  const { isValid, normalizedE164, error: validationError } = validateAndNormalizeWhatsAppNumber(params.phoneWhatsApp);

  if (!isValid) {
    throw new Error(validationError || "Invalid WhatsApp phone number");
  }

  if (!params.displayName.trim()) {
    throw new Error("Display name is required");
  }

  const { data, error } = await supabase
    .from("promoter_profiles")
    .insert({
      user_id: params.userId,
      display_name: params.displayName.trim(),
      phone_whatsapp: normalizedE164,
      bio: params.bio?.trim() || null,
      niche: params.niches && params.niches.length > 0 ? params.niches : [],
      // Note: rating, total_completed_orders, is_verified, and status are set by database defaults and protected by triggers
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A promoter profile already exists for this account.");
    }
    console.error("Error creating promoter profile:", error);
    throw error;
  }

  return data as PromoterProfile;
}

/**
 * Update editable fields of the promoter profile
 */
export async function updatePromoterProfile(params: {
  profileId: string;
  displayName: string;
  phoneWhatsApp: string;
  bio?: string;
  niches?: string[];
}): Promise<PromoterProfile> {
  const { isValid, normalizedE164, error: validationError } = validateAndNormalizeWhatsAppNumber(params.phoneWhatsApp);

  if (!isValid) {
    throw new Error(validationError || "Invalid WhatsApp phone number");
  }

  if (!params.displayName.trim()) {
    throw new Error("Display name is required");
  }

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

  if (error) {
    console.error("Error updating promoter profile:", error);
    throw error;
  }

  return data as PromoterProfile;
}
