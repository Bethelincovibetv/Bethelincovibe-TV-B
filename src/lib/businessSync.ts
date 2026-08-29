import { supabase } from "@/integrations/supabase/client";
import { resolveSafeCategoryUuid } from "@/lib/businessCategories";

export interface BusinessLocationData {
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface BusinessSyncInput {
  userId: string;
  name: string;
  username?: string;
  bioOrDescription?: string;
  phoneOrWhatsapp?: string;
  website?: string;
  logoOrAvatarUrl?: string;
  coverUrl?: string;
  coverTemplate?: string;
  categoryId?: string | null;
  location?: BusinessLocationData;
  services?: any[];
  socialLinks?: Record<string, any>;
  isPublic?: boolean;
  categoriesList?: any[];
}

/**
 * Generates a clean URL slug from a business name or username
 */
export function generateCanonicalSlug(name: string, fallbackId?: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  
  if (base.length >= 2) return base;
  return `biz-${(fallbackId || Math.random().toString(36)).slice(0, 8)}`;
}

/**
 * Builds a strict, schema-compliant payload for the `suppliers` table.
 * Strips non-existent columns (country, state, city, latitude, longitude)
 * and correctly places them into `social_links.location`.
 */
export function buildSupplierCleanPayload({
  name,
  slug,
  categoryId,
  description,
  phone,
  address,
  website,
  logoUrl,
  coverUrl,
  coverTemplate,
  location,
  socialLinks = {},
  services = [],
  submittedBy,
  active = true,
  status = "approved",
  categoriesList = [],
}: {
  name: string;
  slug: string;
  categoryId?: string | null;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  coverTemplate?: string | null;
  location?: BusinessLocationData;
  socialLinks?: Record<string, any>;
  services?: any[];
  submittedBy: string;
  active?: boolean;
  status?: string;
  categoriesList?: any[];
}) {
  const safeCatId = resolveSafeCategoryUuid(categoryId, categoriesList);
  const cleanServices = Array.isArray(services)
    ? services.filter((s) => s && (typeof s === "string" ? s.trim() : s.title?.trim()))
    : [];

  const locCountry = location?.country || socialLinks?.location?.country || "Nigeria";
  const locState = location?.state || socialLinks?.location?.state || "Lagos State";
  const locCity = location?.city || socialLinks?.location?.city || "Lagos";
  const locAddress = address || location?.address || socialLinks?.location?.address || "";
  const locLat = location?.latitude ?? socialLinks?.location?.latitude ?? 6.5244;
  const locLng = location?.longitude ?? socialLinks?.location?.longitude ?? 3.3792;

  const mergedSocialLinks = {
    ...(socialLinks || {}),
    whatsapp: phone || socialLinks?.whatsapp || null,
    website: website || socialLinks?.website || null,
    location: {
      country: locCountry,
      state: locState,
      city: locCity,
      address: locAddress,
      latitude: locLat,
      longitude: locLng,
    },
    city: locCity,
    state: locState,
    country: locCountry,
  };

  return {
    name: name.trim() || "Business",
    slug,
    category_id: safeCatId,
    description: description?.trim() || null,
    phone: phone?.trim() || null,
    address: locAddress.trim() || null,
    website: website?.trim() || null,
    logo_url: logoUrl || null,
    cover_url: coverUrl || null,
    cover_template: coverUrl ? null : (coverTemplate || "tech"),
    social_links: mergedSocialLinks,
    services: cleanServices,
    submitted_by: submittedBy,
    active,
    status,
  };
}

/**
 * Synchronizes single canonical business identity across `suppliers` (Directory)
 * and `profiles` (User Profile / Seller identity).
 * Prevents duplicate supplier creation for the same user.
 */
export async function syncCanonicalBusinessAndProfile(input: BusinessSyncInput): Promise<{
  supplierId: string | null;
  slug: string | null;
  error: any | null;
}> {
  const {
    userId,
    name,
    username,
    bioOrDescription,
    phoneOrWhatsapp,
    website,
    logoOrAvatarUrl,
    coverUrl,
    coverTemplate,
    categoryId,
    location,
    services = [],
    socialLinks = {},
    isPublic = true,
    categoriesList = [],
  } = input;

  try {
    const locCountry = location?.country || socialLinks?.location?.country || "Nigeria";
    const locState = location?.state || socialLinks?.location?.state || "Lagos State";
    const locCity = location?.city || socialLinks?.location?.city || "Lagos";
    const locAddress = location?.address || socialLinks?.location?.address || "";
    const locLat = location?.latitude ?? socialLinks?.location?.latitude ?? 6.5244;
    const locLng = location?.longitude ?? socialLinks?.location?.longitude ?? 3.3792;

    const safeCatId = resolveSafeCategoryUuid(categoryId, categoriesList);
    const matchedCategory = categoriesList.find((c) => c.id === safeCatId);

    const mergedSocialLinks = {
      ...(socialLinks || {}),
      whatsapp: phoneOrWhatsapp || socialLinks?.whatsapp || null,
      website: website || socialLinks?.website || null,
      category_id: safeCatId,
      category_name: matchedCategory?.name || socialLinks?.category_name || null,
      category_slug: matchedCategory?.slug || socialLinks?.category_slug || null,
      location: {
        country: locCountry,
        state: locState,
        city: locCity,
        address: locAddress,
        latitude: locLat,
        longitude: locLng,
      },
      city: locCity,
      state: locState,
      country: locCountry,
    };

    // 1. Update/Upsert Canonical Profile
    const profilePayload: any = {
      user_id: userId,
      display_name: name.trim(),
      bio: bioOrDescription?.trim() || null,
      avatar_url: logoOrAvatarUrl || null,
      background_url: coverUrl || null,
      background_template: coverTemplate || "tech",
      whatsapp: phoneOrWhatsapp?.trim() || null,
      social_links: mergedSocialLinks,
      services: services || [],
      is_public: isPublic,
    };

    if (username) {
      profilePayload.username = username;
    }

    const { error: profileErr } = await supabase
      .from("profiles")
      .upsert(profilePayload, { onConflict: "user_id" });

    if (profileErr) {
      console.error("Profile sync error:", profileErr);
    }

    // 2. Locate existing supplier record for this user (prevent duplicates)
    const { data: existingSupplier } = await supabase
      .from("suppliers")
      .select("id, slug, status, active, featured, boosted_until")
      .eq("submitted_by", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let targetSlug = existingSupplier?.slug;
    if (!targetSlug) {
      targetSlug = username || generateCanonicalSlug(name, userId);
    }

    const supplierPayload = buildSupplierCleanPayload({
      name,
      slug: targetSlug,
      categoryId: safeCatId,
      description: bioOrDescription,
      phone: phoneOrWhatsapp,
      address: locAddress,
      website,
      logoUrl: logoOrAvatarUrl,
      coverUrl,
      coverTemplate,
      location: {
        country: locCountry,
        state: locState,
        city: locCity,
        address: locAddress,
        latitude: locLat,
        longitude: locLng,
      },
      socialLinks: mergedSocialLinks,
      services,
      submittedBy: userId,
      active: isPublic,
      status: existingSupplier?.status || "approved",
      categoriesList,
    });

    let finalSupplierId: string | null = null;
    let finalSlug: string | null = targetSlug;

    if (existingSupplier?.id) {
      // Update existing supplier
      const { error: supUpdateErr } = await supabase
        .from("suppliers")
        .update(supplierPayload)
        .eq("id", existingSupplier.id);

      if (supUpdateErr) {
        console.error("Supplier update sync error:", supUpdateErr);
        return { supplierId: existingSupplier.id, slug: targetSlug, error: supUpdateErr };
      }
      finalSupplierId = existingSupplier.id;
    } else {
      // Insert new supplier with collision-safe slug handling
      const { data: inserted, error: insertErr } = await supabase
        .from("suppliers")
        .insert(supplierPayload)
        .select("id, slug")
        .maybeSingle();

      if (insertErr) {
        // Retry with unique random suffix if slug collided
        const uniqueSlug = `${targetSlug}-${Math.random().toString(36).slice(2, 6)}`;
        supplierPayload.slug = uniqueSlug;
        const { data: retryData, error: retryErr } = await supabase
          .from("suppliers")
          .insert(supplierPayload)
          .select("id, slug")
          .maybeSingle();

        if (retryErr) {
          console.error("Supplier insert sync error:", retryErr);
          return { supplierId: null, slug: null, error: retryErr };
        }
        finalSupplierId = retryData?.id || null;
        finalSlug = retryData?.slug || uniqueSlug;
      } else {
        finalSupplierId = inserted?.id || null;
        finalSlug = inserted?.slug || targetSlug;
      }
    }

    return { supplierId: finalSupplierId, slug: finalSlug, error: null };
  } catch (err: any) {
    console.error("syncCanonicalBusinessAndProfile exception:", err);
    return { supplierId: null, slug: null, error: err };
  }
}
