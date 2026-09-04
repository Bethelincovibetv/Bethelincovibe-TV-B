import { supabase } from "@/integrations/supabase/client";
import { syncCanonicalBusinessAndProfile } from "@/lib/businessSync";
import { recordBusinessLead } from "@/lib/leadCaptureEngine";

export interface ServicePortfolioSample {
  id: string;
  title: string;
  image_url?: string;
  video_url?: string;
  description?: string;
  link_url?: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  description?: string;
  price?: string; // Formatted price e.g. "₦75,000" or "Contact for Quote"
  price_numeric?: number;
  pricing_type?: "fixed" | "starting_at" | "hourly" | "custom";
  duration?: string; // Turnaround e.g. "2-3 Days"
  category?: string;
  image_url?: string;
  youtube_video_url?: string; // YouTube video explaining or demonstrating the service
  samples?: ServicePortfolioSample[]; // Work samples / portfolio projects for this service
  benefits?: string[]; // Deliverables or key features
  link_url?: string; // Custom WhatsApp or booking link
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceBooking {
  id: string;
  provider_user_id: string;
  business_id?: string;
  business_name: string;
  customer_user_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  service_title: string;
  service_price?: string;
  preferred_date?: string;
  message?: string;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  source: string;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
}

const SERVICES_CACHE_KEY_PREFIX = "btv_services_";
const BOOKINGS_CACHE_KEY_PREFIX = "btv_service_bookings_";

/**
 * Extracts a standard YouTube video ID from any valid YouTube URL
 */
export function extractYouTubeId(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const clean = url.trim();
  const match = clean.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
  );
  return match ? match[1] : null;
}

export function getYouTubeEmbedUrl(url?: string | null): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}?rel=0` : null;
}

export function getYouTubeThumbnailUrl(url?: string | null): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

function normalizeServiceItem(raw: any, index: number): ServiceItem {
  if (typeof raw === "string") {
    return {
      id: `svc_${index}_${Date.now()}`,
      title: raw,
      description: "",
      price: "",
      pricing_type: "fixed",
      duration: "",
      image_url: "",
      youtube_video_url: "",
      samples: [],
      benefits: [],
      link_url: "",
      active: true,
      created_at: new Date().toISOString(),
    };
  }

  const rawSamples = Array.isArray(raw?.samples) ? raw.samples : [];
  const samples: ServicePortfolioSample[] = rawSamples.map((s: any, sIdx: number) => ({
    id: s?.id || `sample_${sIdx}_${Date.now()}`,
    title: s?.title || `Sample #${sIdx + 1}`,
    image_url: s?.image_url || s?.url || "",
    video_url: s?.video_url || "",
    description: s?.description || "",
    link_url: s?.link_url || "",
  }));

  const rawBenefits = Array.isArray(raw?.benefits)
    ? raw.benefits
    : typeof raw?.benefits === "string"
    ? raw.benefits.split("\n").map((b: string) => b.trim()).filter(Boolean)
    : [];

  return {
    id: raw?.id || `svc_${index}_${Date.now()}`,
    title: raw?.title || "Professional Service",
    description: raw?.description || "",
    price: raw?.price || raw?.suggestedPrice || "",
    price_numeric: typeof raw?.price_numeric === "number" ? raw.price_numeric : undefined,
    pricing_type: raw?.pricing_type || "fixed",
    duration: raw?.duration || "",
    category: raw?.category || "",
    image_url: raw?.image_url || raw?.photo_url || raw?.image || "",
    youtube_video_url: raw?.youtube_video_url || raw?.video_url || "",
    samples,
    benefits: rawBenefits,
    link_url: raw?.link_url || raw?.url || "",
    active: raw?.active !== false,
    created_at: raw?.created_at || new Date().toISOString(),
    updated_at: raw?.updated_at || new Date().toISOString(),
  };
}

/**
 * Loads current services for a provider from suppliers & profiles
 */
export async function getProviderServices(userId: string): Promise<{
  services: ServiceItem[];
  supplier: any | null;
  profile: any | null;
}> {
  let profileData: any = null;
  let supplierData: any = null;

  try {
    const [{ data: pData }, { data: sData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("suppliers")
        .select("id, name, slug, category_id, address, phone, website, social_links, services, logo_url, cover_url, active, status, submitted_by")
        .eq("submitted_by", userId)
        .maybeSingle(),
    ]);
    profileData = pData;
    supplierData = sData;
  } catch (err) {
    console.warn("Error fetching provider services:", err);
  }

  // Choose the richest source of services
  const supplierServicesRaw = Array.isArray(supplierData?.services) ? supplierData.services : [];
  const profileServicesRaw = Array.isArray(profileData?.services) ? profileData.services : [];
  const rawList = supplierServicesRaw.length > 0 ? supplierServicesRaw : profileServicesRaw;

  let services: ServiceItem[] = [];
  if (rawList.length > 0) {
    services = rawList.map((item: any, idx: number) => normalizeServiceItem(item, idx));
  } else {
    try {
      const cached = localStorage.getItem(`${SERVICES_CACHE_KEY_PREFIX}${userId}`);
      if (cached) services = JSON.parse(cached);
    } catch {}
  }

  // Sync back to cache
  try {
    localStorage.setItem(`${SERVICES_CACHE_KEY_PREFIX}${userId}`, JSON.stringify(services));
  } catch {}

  return { services, supplier: supplierData, profile: profileData };
}

/**
 * Persists updated services directly into suppliers & profiles without going through profile edit
 */
export async function saveProviderServices(params: {
  userId: string;
  services: ServiceItem[];
  supplierId?: string;
  businessName?: string;
  categoryId?: string | null;
}): Promise<{ success: boolean; services: ServiceItem[] }> {
  const { userId, services } = params;

  // Local sync first
  try {
    localStorage.setItem(`${SERVICES_CACHE_KEY_PREFIX}${userId}`, JSON.stringify(services));
  } catch {}

  // 1. Direct update into suppliers table
  try {
    const { data: existingSupplier } = await supabase
      .from("suppliers")
      .select("id, name, slug, category_id, address, phone, website, social_links, services, logo_url, cover_url")
      .eq("submitted_by", userId)
      .maybeSingle();

    if (existingSupplier) {
      await supabase
        .from("suppliers")
        .update({
          services: services as any,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", existingSupplier.id);
    }

    // 2. Also update profiles.services for redundancy
    await supabase
      .from("profiles")
      .update({
        services: services as any,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("user_id", userId);

  } catch (dbErr: any) {
    console.warn("Direct update caught notice, attempting sync fallback:", dbErr?.message || dbErr);
  }

  // 3. Dispatch global event so all components on this tab update immediately
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("btv_services_updated", { detail: { userId, services } }));
  }

  return { success: true, services };
}

/**
 * Fetch all service bookings received by the provider
 */
export async function getProviderServiceBookings(userId: string): Promise<ServiceBooking[]> {
  const localCacheKey = `${BOOKINGS_CACHE_KEY_PREFIX}${userId}`;
  let bookings: ServiceBooking[] = [];

  try {
    const { data, error } = await supabase
      .from("service_bookings")
      .select("*")
      .eq("provider_user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      bookings = data.map((b: any) => ({
        id: b.id,
        provider_user_id: b.provider_user_id,
        business_id: b.business_id,
        business_name: b.business_name || "Verified Business",
        customer_user_id: b.customer_user_id,
        customer_name: b.customer_name || "Client",
        customer_phone: b.customer_phone || "",
        customer_email: b.customer_email || undefined,
        service_title: b.service_title || "General Service",
        service_price: b.service_price || undefined,
        preferred_date: b.preferred_date || undefined,
        message: b.message || "",
        status: b.status || "pending",
        source: b.source || "web_direct",
        internal_notes: b.internal_notes || undefined,
        created_at: b.created_at,
        updated_at: b.updated_at,
      }));
    }
  } catch (e) {
    console.warn("Could not query service_bookings table, checking fallback leads:", e);
  }

  // If table was empty or not yet seeded, also merge leads with source 'service_booking'
  try {
    const { data: leads } = await supabase
      .from("sales_page_leads")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (leads && leads.length > 0) {
      const existingIds = new Set(bookings.map((b) => b.id));
      for (const lead of leads) {
        if (!existingIds.has(lead.id)) {
          // Parse service title and notes if embedded in message
          let serviceTitle = "General Service Booking";
          let customerMsg = lead.message || "";
          let preferredDate = "";

          if (lead.message && lead.message.includes("Requested Service:")) {
            const parts = lead.message.split("|");
            for (const part of parts) {
              const clean = part.trim();
              if (clean.startsWith("Requested Service:")) {
                serviceTitle = clean.replace("Requested Service:", "").trim();
              } else if (clean.startsWith("Preferred Date:")) {
                preferredDate = clean.replace("Preferred Date:", "").trim();
              } else if (clean.startsWith("Customer Message:")) {
                customerMsg = clean.replace("Customer Message:", "").trim();
              }
            }
          }

          bookings.push({
            id: lead.id,
            provider_user_id: userId,
            business_name: "My Business",
            customer_name: lead.name || "Prospective Client",
            customer_phone: lead.phone || "",
            customer_email: lead.email || undefined,
            service_title: serviceTitle,
            preferred_date: preferredDate,
            message: customerMsg,
            status: lead.status === "contacted" ? "confirmed" : lead.status === "converted" ? "completed" : "pending",
            source: "lead_capture",
            created_at: lead.created_at,
            updated_at: lead.created_at,
          });
        }
      }
    }
  } catch {}

  // Cache fallback
  if (bookings.length === 0) {
    try {
      const cached = localStorage.getItem(localCacheKey);
      if (cached) bookings = JSON.parse(cached);
    } catch {}
  } else {
    try {
      localStorage.setItem(localCacheKey, JSON.stringify(bookings));
    } catch {}
  }

  return bookings;
}

/**
 * Creates a new service booking entry in database and notifies the provider
 */
export async function createServiceBooking(params: {
  providerUserId: string;
  businessId?: string;
  businessName: string;
  customerUserId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceTitle: string;
  servicePrice?: string;
  preferredDate?: string;
  message?: string;
  source?: string;
}): Promise<ServiceBooking> {
  const newId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `sb_${Date.now()}`;
  const now = new Date().toISOString();

  const payload: ServiceBooking = {
    id: newId,
    provider_user_id: params.providerUserId,
    business_id: params.businessId,
    business_name: params.businessName,
    customer_user_id: params.customerUserId,
    customer_name: params.customerName,
    customer_phone: params.customerPhone,
    customer_email: params.customerEmail,
    service_title: params.serviceTitle,
    service_price: params.servicePrice,
    preferred_date: params.preferredDate,
    message: params.message,
    status: "pending",
    source: params.source || "service_booking_page",
    created_at: now,
    updated_at: now,
  };

  // 1. Save to service_bookings table
  try {
    await supabase.from("service_bookings").insert({
      id: payload.id,
      provider_user_id: payload.provider_user_id,
      business_id: payload.business_id || null,
      business_name: payload.business_name,
      customer_user_id: payload.customer_user_id || null,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone,
      customer_email: payload.customer_email || null,
      service_title: payload.service_title,
      service_price: payload.service_price || null,
      preferred_date: payload.preferredDate || null,
      message: payload.message || null,
      status: "pending",
      source: payload.source,
      created_at: now,
      updated_at: now,
    } as any);
  } catch (err) {
    console.warn("Direct service_bookings insert fallback:", err);
  }

  // 2. Also record as lead to guarantee notification & leads tab presence
  try {
    await recordBusinessLead({
      userId: params.providerUserId,
      businessId: params.businessId,
      businessName: params.businessName,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      customerEmail: params.customerEmail,
      serviceTitle: params.serviceTitle,
      message: `${params.message || "Direct service booking inquiry"}${
        params.preferredDate ? ` | Preferred Date: ${params.preferredDate}` : ""
      }`,
      source: "service_booking",
    });
  } catch {}

  // 3. Local cache update
  try {
    const key = `${BOOKINGS_CACHE_KEY_PREFIX}${params.providerUserId}`;
    const raw = localStorage.getItem(key);
    const list: ServiceBooking[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(key, JSON.stringify([payload, ...list]));
  } catch {}

  return payload;
}

/**
 * Updates status of a service booking
 */
export async function updateServiceBookingStatus(
  bookingId: string,
  providerUserId: string,
  status: ServiceBooking["status"],
  notes?: string
): Promise<void> {
  try {
    await supabase
      .from("service_bookings")
      .update({
        status,
        internal_notes: notes || null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", bookingId);
  } catch (e) {
    console.warn("Error updating service_bookings table:", e);
  }

  // Also update sales_page_leads status if matched
  try {
    const mappedStatus = status === "confirmed" ? "contacted" : status === "completed" ? "converted" : "new";
    await supabase.from("sales_page_leads").update({ status: mappedStatus }).eq("id", bookingId);
  } catch {}

  // Update local cache
  try {
    const key = `${BOOKINGS_CACHE_KEY_PREFIX}${providerUserId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const list: ServiceBooking[] = JSON.parse(raw);
      const updated = list.map((b) => (b.id === bookingId ? { ...b, status, internal_notes: notes ?? b.internal_notes } : b));
      localStorage.setItem(key, JSON.stringify(updated));
    }
  } catch {}
}

/**
 * Deletes a service booking
 */
export async function deleteServiceBooking(bookingId: string, providerUserId: string): Promise<void> {
  try {
    await supabase.from("service_bookings").delete().eq("id", bookingId);
  } catch {}
  try {
    await supabase.from("sales_page_leads").delete().eq("id", bookingId);
  } catch {}

  try {
    const key = `${BOOKINGS_CACHE_KEY_PREFIX}${providerUserId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const list: ServiceBooking[] = JSON.parse(raw);
      localStorage.setItem(key, JSON.stringify(list.filter((b) => b.id !== bookingId)));
    }
  } catch {}
}

/**
 * Subscribes to realtime updates for service bookings
 */
export function subscribeToServiceBookings(userId: string, onChange: () => void) {
  try {
    return supabase
      .channel(`service-bookings-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_bookings",
          filter: `provider_user_id=eq.${userId}`,
        },
        () => onChange()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales_page_leads",
          filter: `user_id=eq.${userId}`,
        },
        () => onChange()
      )
      .subscribe();
  } catch {
    return { unsubscribe: () => {} };
  }
}
