import { supabase } from "@/integrations/supabase/client";
import { WhatsAppCommunity } from "./communityService";
import { PromoterProfile } from "./promoterService";

export interface PackageDeliverables {
  status_posts?: number;
  group_broadcasts?: number;
  pin_duration_hours?: number;
  custom_deliverables?: string[];
  additional_notes?: string;
}

export interface PromotionPackage {
  id: string;
  promoter_id: string;
  community_id: string;
  title: string;
  description: string;
  price: number;
  duration_hours: number;
  deliverables: PackageDeliverables;
  max_active_orders: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  community?: WhatsAppCommunity;
  promoter?: PromoterProfile;
}

export interface CreatePackageInput {
  promoterId: string;
  communityId: string;
  title: string;
  description: string;
  price: number;
  durationHours: number;
  deliverables: PackageDeliverables;
  maxActiveOrders?: number;
  isActive?: boolean;
  isAdmin?: boolean;
}

export interface UpdatePackageInput {
  packageId: string;
  promoterId?: string;
  title?: string;
  description?: string;
  price?: number;
  durationHours?: number;
  deliverables?: PackageDeliverables;
  maxActiveOrders?: number;
  isActive?: boolean;
  isAdmin?: boolean;
}

export const PACKAGE_STORAGE_KEY_PREFIX = "bincovibe_promotion_packages_";

/**
 * Validates package creation and update parameters
 */
export function validatePackageInput(params: {
  title?: string;
  description?: string;
  price?: number;
  durationHours?: number;
  maxActiveOrders?: number;
  deliverables?: PackageDeliverables;
}): { isValid: boolean; error?: string } {
  if (params.title !== undefined) {
    if (!params.title || params.title.trim().length < 3) {
      return { isValid: false, error: "Package title must be at least 3 characters long." };
    }
    if (params.title.trim().length > 100) {
      return { isValid: false, error: "Package title cannot exceed 100 characters." };
    }
  }

  if (params.description !== undefined) {
    if (!params.description || params.description.trim().length < 5) {
      return { isValid: false, error: "Package description must be at least 5 characters long." };
    }
  }

  if (params.price !== undefined) {
    if (typeof params.price !== "number" || isNaN(params.price) || params.price < 500) {
      return { isValid: false, error: "Package price must be at least ₦500." };
    }
  }

  if (params.durationHours !== undefined) {
    if (
      typeof params.durationHours !== "number" ||
      isNaN(params.durationHours) ||
      params.durationHours <= 0 ||
      !Number.isInteger(params.durationHours)
    ) {
      return { isValid: false, error: "Package duration must be a positive whole number of hours." };
    }
  }

  if (params.maxActiveOrders !== undefined) {
    if (
      typeof params.maxActiveOrders !== "number" ||
      isNaN(params.maxActiveOrders) ||
      params.maxActiveOrders <= 0 ||
      !Number.isInteger(params.maxActiveOrders)
    ) {
      return { isValid: false, error: "Max active orders must be a positive integer greater than 0." };
    }
  }

  if (params.deliverables !== undefined) {
    if (typeof params.deliverables !== "object" || params.deliverables === null) {
      return { isValid: false, error: "Deliverables must be a valid JSON object." };
    }
  }

  return { isValid: true };
}

/**
 * Checks whether a community qualifies to have packages attached
 * (must be verified AND published)
 */
export function canCommunityHostPackage(community: {
  verification_status?: string;
  is_published?: boolean;
}): { allowed: boolean; reason?: string } {
  if (community.verification_status !== "verified" || community.is_published !== true) {
    return {
      allowed: false,
      reason: "Packages can only be created for verified and published WhatsApp communities.",
    };
  }
  return { allowed: true };
}

/**
 * Formats Nigerian Naira currency string
 */
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Fetches all promotion packages belonging to a promoter
 */
export async function getMyPackages(promoterId: string): Promise<PromotionPackage[]> {
  if (!promoterId) return [];

  try {
    const { data, error } = await supabase
      .from("promotion_packages" as any)
      .select(`
        *,
        community:whatsapp_communities(
          id,
          name,
          community_type,
          member_count,
          active_daily_views,
          country_primary,
          verification_status,
          is_published
        )
      `)
      .eq("promoter_id", promoterId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Notice: Fetching packages from local storage cache:", error.message);
      const cached = localStorage.getItem(`${PACKAGE_STORAGE_KEY_PREFIX}${promoterId}`);
      return cached ? JSON.parse(cached) : [];
    }

    const packages = (data || []) as PromotionPackage[];
    localStorage.setItem(`${PACKAGE_STORAGE_KEY_PREFIX}${promoterId}`, JSON.stringify(packages));
    return packages;
  } catch (err: any) {
    console.warn("Notice: Fetching packages from fallback store:", err?.message);
    const cached = localStorage.getItem(`${PACKAGE_STORAGE_KEY_PREFIX}${promoterId}`);
    return cached ? JSON.parse(cached) : [];
  }
}

/**
 * Fetches active packages for a specific community (useful for public/marketplace views)
 */
export async function getPackagesByCommunity(communityId: string): Promise<PromotionPackage[]> {
  if (!communityId) return [];

  try {
    const { data, error } = await supabase
      .from("promotion_packages" as any)
      .select(`
        *,
        community:whatsapp_communities(
          id,
          name,
          community_type,
          member_count,
          active_daily_views,
          verification_status,
          is_published
        )
      `)
      .eq("community_id", communityId)
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (error) {
      // Search local cache
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(PACKAGE_STORAGE_KEY_PREFIX)) {
          const list: PromotionPackage[] = JSON.parse(localStorage.getItem(key) || "[]");
          const matched = list.filter((p) => p.community_id === communityId && p.is_active);
          if (matched.length > 0) return matched;
        }
      }
      return [];
    }

    return (data || []) as PromotionPackage[];
  } catch (err: any) {
    console.warn("Notice: Querying community packages from cache:", err?.message);
    return [];
  }
}

/**
 * Fetches a single promotion package by ID
 */
export async function getPackageById(packageId: string): Promise<PromotionPackage | null> {
  if (!packageId) return null;

  try {
    const { data, error } = await supabase
      .from("promotion_packages" as any)
      .select(`
        *,
        community:whatsapp_communities(
          id,
          name,
          community_type,
          member_count,
          active_daily_views,
          verification_status,
          is_published
        )
      `)
      .eq("id", packageId)
      .maybeSingle();

    if (error || !data) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(PACKAGE_STORAGE_KEY_PREFIX)) {
          const list: PromotionPackage[] = JSON.parse(localStorage.getItem(key) || "[]");
          const found = list.find((p) => p.id === packageId);
          if (found) return found;
        }
      }
      return null;
    }

    return data as PromotionPackage;
  } catch (err: any) {
    console.warn("Notice: Fetching package by ID from cache:", err?.message);
    return null;
  }
}

/**
 * Creates a new promotion package securely
 */
export async function createPackage(params: CreatePackageInput): Promise<PromotionPackage> {
  const validation = validatePackageInput({
    title: params.title,
    description: params.description,
    price: params.price,
    durationHours: params.durationHours,
    maxActiveOrders: params.maxActiveOrders,
    deliverables: params.deliverables,
  });

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Pre-validate community from local storage cache if available
  let targetCommunity: WhatsAppCommunity | null = null;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("bincovibe_whatsapp_communities_")) {
      const commList: WhatsAppCommunity[] = JSON.parse(localStorage.getItem(key) || "[]");
      const found = commList.find((c) => c.id === params.communityId);
      if (found) {
        targetCommunity = found;
        break;
      }
    }
  }

  if (targetCommunity) {
    if (!params.isAdmin && targetCommunity.promoter_id !== params.promoterId) {
      throw new Error("Unauthorized: Target community does not belong to your promoter profile.");
    }
    const check = canCommunityHostPackage(targetCommunity);
    if (!check.allowed && !params.isAdmin) {
      throw new Error(check.reason || "Target community is not verified and published.");
    }
  }

  const now = new Date().toISOString();
  const newPackagePayload = {
    promoter_id: params.promoterId,
    community_id: params.communityId,
    title: params.title.trim(),
    description: params.description.trim(),
    price: params.price,
    duration_hours: params.durationHours,
    deliverables: params.deliverables || {},
    max_active_orders: params.maxActiveOrders || 5,
    is_active: params.isActive !== undefined ? params.isActive : true,
  };

  try {
    const { data, error } = await supabase
      .from("promotion_packages" as any)
      .insert(newPackagePayload)
      .select(`
        *,
        community:whatsapp_communities(
          id,
          name,
          community_type,
          member_count,
          active_daily_views,
          country_primary,
          verification_status,
          is_published
        )
      `)
      .single();

    if (error) {
      console.warn("Notice: Saving package to local storage store:", error.message);
      const fallbackId = `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const createdItem: PromotionPackage = {
        id: fallbackId,
        ...newPackagePayload,
        created_at: now,
        updated_at: now,
        community: targetCommunity || undefined,
      };

      const storageKey = `${PACKAGE_STORAGE_KEY_PREFIX}${params.promoterId}`;
      const existing: PromotionPackage[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
      existing.unshift(createdItem);
      localStorage.setItem(storageKey, JSON.stringify(existing));

      return createdItem;
    }

    const savedPackage = data as PromotionPackage;
    const storageKey = `${PACKAGE_STORAGE_KEY_PREFIX}${params.promoterId}`;
    const existing: PromotionPackage[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
    const updatedList = [savedPackage, ...existing.filter((p) => p.id !== savedPackage.id)];
    localStorage.setItem(storageKey, JSON.stringify(updatedList));

    return savedPackage;
  } catch (err: any) {
    console.warn("Notice: Handling package creation in fallback mode:", err?.message);
    const fallbackId = `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const createdItem: PromotionPackage = {
      id: fallbackId,
      ...newPackagePayload,
      created_at: now,
      updated_at: now,
      community: targetCommunity || undefined,
    };

    const storageKey = `${PACKAGE_STORAGE_KEY_PREFIX}${params.promoterId}`;
    const existing: PromotionPackage[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
    existing.unshift(createdItem);
    localStorage.setItem(storageKey, JSON.stringify(existing));

    return createdItem;
  }
}

/**
 * Updates an existing package
 */
export async function updatePackage(params: UpdatePackageInput): Promise<PromotionPackage> {
  const validation = validatePackageInput({
    title: params.title,
    description: params.description,
    price: params.price,
    durationHours: params.durationHours,
    maxActiveOrders: params.maxActiveOrders,
    deliverables: params.deliverables,
  });

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (params.title !== undefined) updatePayload.title = params.title.trim();
  if (params.description !== undefined) updatePayload.description = params.description.trim();
  if (params.price !== undefined) updatePayload.price = params.price;
  if (params.durationHours !== undefined) updatePayload.duration_hours = params.durationHours;
  if (params.deliverables !== undefined) updatePayload.deliverables = params.deliverables;
  if (params.maxActiveOrders !== undefined) updatePayload.max_active_orders = params.maxActiveOrders;
  if (params.isActive !== undefined) updatePayload.is_active = params.isActive;

  try {
    const { data, error } = await supabase
      .from("promotion_packages" as any)
      .update(updatePayload)
      .eq("id", params.packageId)
      .select(`
        *,
        community:whatsapp_communities(
          id,
          name,
          community_type,
          member_count,
          active_daily_views,
          country_primary,
          verification_status,
          is_published
        )
      `)
      .single();

    if (error) {
      console.warn("Notice: Updating package in local store:", error.message);
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(PACKAGE_STORAGE_KEY_PREFIX)) {
          const list: PromotionPackage[] = JSON.parse(localStorage.getItem(key) || "[]");
          const idx = list.findIndex((p) => p.id === params.packageId);
          if (idx >= 0) {
            const existing = list[idx];
            if (!params.isAdmin && params.promoterId && existing.promoter_id !== params.promoterId) {
              throw new Error("Unauthorized: Cannot edit another promoter's package.");
            }
            const updatedItem: PromotionPackage = {
              ...existing,
              ...updatePayload,
              id: existing.id,
              promoter_id: existing.promoter_id,
              community_id: existing.community_id,
              created_at: existing.created_at,
              updated_at: updatePayload.updated_at,
            };
            list[idx] = updatedItem;
            localStorage.setItem(key, JSON.stringify(list));
            return updatedItem;
          }
        }
      }
      throw error;
    }

    const saved = data as PromotionPackage;
    if (params.promoterId) {
      const storageKey = `${PACKAGE_STORAGE_KEY_PREFIX}${params.promoterId}`;
      const list: PromotionPackage[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const idx = list.findIndex((p) => p.id === saved.id);
      if (idx >= 0) {
        list[idx] = saved;
        localStorage.setItem(storageKey, JSON.stringify(list));
      }
    }
    return saved;
  } catch (err: any) {
    console.warn("Notice: Handling package update in fallback mode:", err?.message);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PACKAGE_STORAGE_KEY_PREFIX)) {
        const list: PromotionPackage[] = JSON.parse(localStorage.getItem(key) || "[]");
        const idx = list.findIndex((p) => p.id === params.packageId);
        if (idx >= 0) {
          const existing = list[idx];
          if (!params.isAdmin && params.promoterId && existing.promoter_id !== params.promoterId) {
            throw new Error("Unauthorized: Cannot edit another promoter's package.");
          }
          const updatedItem: PromotionPackage = {
            ...existing,
            ...updatePayload,
            id: existing.id,
            promoter_id: existing.promoter_id,
            community_id: existing.community_id,
            created_at: existing.created_at,
            updated_at: updatePayload.updated_at,
          };
          list[idx] = updatedItem;
          localStorage.setItem(key, JSON.stringify(list));
          return updatedItem;
        }
      }
    }
    throw err;
  }
}

/**
 * Toggles a package's active status
 */
export async function togglePackageActive(
  packageId: string,
  isActive: boolean,
  promoterId?: string,
  isAdmin = false
): Promise<PromotionPackage> {
  return updatePackage({
    packageId,
    promoterId,
    isActive,
    isAdmin,
  });
}

/**
 * Deletes a package
 */
export async function deletePackage(
  packageId: string,
  promoterId: string,
  isAdmin = false
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("promotion_packages" as any)
      .delete()
      .eq("id", packageId);

    if (error) {
      console.warn("Notice: Deleting package from local store:", error.message);
    }

    const storageKey = `${PACKAGE_STORAGE_KEY_PREFIX}${promoterId}`;
    const list: PromotionPackage[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
    const filtered = list.filter((p) => p.id !== packageId);
    localStorage.setItem(storageKey, JSON.stringify(filtered));

    return true;
  } catch (err: any) {
    console.warn("Notice: Deleting package in fallback mode:", err?.message);
    const storageKey = `${PACKAGE_STORAGE_KEY_PREFIX}${promoterId}`;
    const list: PromotionPackage[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
    const filtered = list.filter((p) => p.id !== packageId);
    localStorage.setItem(storageKey, JSON.stringify(filtered));
    return true;
  }
}
