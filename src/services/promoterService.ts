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

const PROMOTER_STORAGE_KEY_PREFIX = "bincovibe_promoter_profile_";

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

function getLocalPromoterProfile(userId: string): PromoterProfile | null {
  try {
    const raw = localStorage.getItem(`${PROMOTER_STORAGE_KEY_PREFIX}${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function getLocalPromoterProfileById(profileId: string): PromoterProfile | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PROMOTER_STORAGE_KEY_PREFIX)) {
        const item = JSON.parse(localStorage.getItem(key) || "{}");
        if (item.id === profileId) {
          return item;
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function saveLocalPromoterProfile(profile: PromoterProfile): void {
  try {
    localStorage.setItem(
      `${PROMOTER_STORAGE_KEY_PREFIX}${profile.user_id}`,
      JSON.stringify(profile)
    );
  } catch (e) {
    // ignore
  }
}

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

  try {
    const { data, error } = await supabase
      .from("promoter_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      if (isSchemaMissingError(error)) {
        return getLocalPromoterProfile(userId);
      }
      console.warn("Notice: promoter_profiles table query fallback:", error.message);
      return getLocalPromoterProfile(userId);
    }

    if (data) {
      const profile = data as PromoterProfile;
      saveLocalPromoterProfile(profile);
      return profile;
    }

    return getLocalPromoterProfile(userId);
  } catch (err: any) {
    if (isSchemaMissingError(err)) {
      return getLocalPromoterProfile(userId);
    }
    return getLocalPromoterProfile(userId);
  }
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

  const now = new Date().toISOString();
  const fallbackProfile: PromoterProfile = {
    id: `promoter_${params.userId.replace(/[^a-zA-Z0-9]/g, "")}_${Date.now()}`,
    user_id: params.userId,
    display_name: params.displayName.trim(),
    phone_whatsapp: normalizedE164,
    bio: params.bio?.trim() || null,
    niche: params.niches && params.niches.length > 0 ? params.niches : [],
    rating: 5.0,
    total_completed_orders: 0,
    is_verified: false,
    status: "active",
    created_at: now,
    updated_at: now,
  };

  try {
    const { data, error } = await supabase
      .from("promoter_profiles")
      .insert({
        user_id: params.userId,
        display_name: params.displayName.trim(),
        phone_whatsapp: normalizedE164,
        bio: params.bio?.trim() || null,
        niche: params.niches && params.niches.length > 0 ? params.niches : [],
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("A promoter profile already exists for this account.");
      }
      if (isSchemaMissingError(error)) {
        saveLocalPromoterProfile(fallbackProfile);
        return fallbackProfile;
      }
      console.warn("Supabase insert fallback to local store:", error.message);
      saveLocalPromoterProfile(fallbackProfile);
      return fallbackProfile;
    }

    const saved = data as PromoterProfile;
    saveLocalPromoterProfile(saved);
    return saved;
  } catch (err: any) {
    if (err.message === "A promoter profile already exists for this account.") {
      throw err;
    }
    saveLocalPromoterProfile(fallbackProfile);
    return fallbackProfile;
  }
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

  const now = new Date().toISOString();

  try {
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
      if (isSchemaMissingError(error)) {
        const existing = getLocalPromoterProfileById(params.profileId);
        const updated: PromoterProfile = {
          ...(existing || {
            id: params.profileId,
            user_id: "current_user",
            rating: 5.0,
            total_completed_orders: 0,
            is_verified: false,
            status: "active",
            created_at: now,
          }),
          display_name: params.displayName.trim(),
          phone_whatsapp: normalizedE164,
          bio: params.bio?.trim() || null,
          niche: params.niches || [],
          updated_at: now,
        };
        saveLocalPromoterProfile(updated);
        return updated;
      }
      throw error;
    }

    const saved = data as PromoterProfile;
    saveLocalPromoterProfile(saved);
    return saved;
  } catch (err: any) {
    if (isSchemaMissingError(err)) {
      const existing = getLocalPromoterProfileById(params.profileId);
      const updated: PromoterProfile = {
        ...(existing || {
          id: params.profileId,
          user_id: "current_user",
          rating: 5.0,
          total_completed_orders: 0,
          is_verified: false,
          status: "active",
          created_at: now,
        }),
        display_name: params.displayName.trim(),
        phone_whatsapp: normalizedE164,
        bio: params.bio?.trim() || null,
        niche: params.niches || [],
        updated_at: now,
      };
      saveLocalPromoterProfile(updated);
      return updated;
    }
    throw err;
  }
}

