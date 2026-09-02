import { supabase } from "@/integrations/supabase/client";

export interface NetworkMember {
  id: string;
  name: string;
  businessName: string;
  category: string;
  location: string;
  phone: string;
  email?: string;
  statusViewsEstimate: number;
  verified: boolean;
  openForAds: boolean;
  ratePerPost?: number;
  bundlePrice?: number;
  bio: string;
  avatarUrl?: string;
  joinedAt: string;
}

export interface ConnectionLog {
  id: string;
  contactId: string;
  contactName: string;
  businessName: string;
  category: string;
  phone: string;
  syncedAt: string;
  method: "google_api" | "vcf_export";
  googleResourceName?: string;
  mutualConfirmed: boolean;
}

export interface StatusAdBooking {
  id: string;
  creatorId: string;
  creatorName: string;
  advertiserId: string;
  advertiserName: string;
  advertiserPhone: string;
  advertiserEmail?: string;
  campaignTitle: string;
  caption: string;
  mediaUrl?: string;
  targetDate: string;
  slotCount: number;
  totalAmount: number;
  status: "pending" | "accepted" | "declined" | "posted_with_proof" | "completed";
  proofScreenshotUrl?: string;
  proofSubmittedAt?: string;
  proofViewerCount?: number;
  notes?: string;
  createdAt: string;
}

export interface UserEnginePreferences {
  autoExchangeEnabled: boolean;
  isPaused: boolean;
  targetCategories: string[];
  targetLocations: string[];
  openForAds: boolean;
  ratePerPost: number;
  bundlePrice: number;
  audienceNiche: string;
  estimatedViews: number;
  customWhatsAppNumber: string;
}

export const BUSINESS_CATEGORIES = [
  "All Categories", "Tech & Electronics", "Fashion & Apparel", "Food & Catering",
  "Events & Entertainment", "Solar & Energy", "Media & Photography", "Logistics & Transport",
  "Beauty & Wellness", "Real Estate & Property", "Professional Services", "Automotive & Spare Parts",
];

export const LAGOS_LOCATIONS = [
  "All Lagos Locations", "Computer Village, Ikeja", "Ikeja / Maryland", "Lekki Phase 1 & 2",
  "Victoria Island", "Ikoyi", "Yaba / Akoka", "Surulere", "Alaba International, Ojo",
  "Trade Fair Complex", "Balogun / Idumota", "Gbagada / Ogudu", "Ikorodu", "Festac Town", "Ajah / Sangotedo",
];

export const DEFAULT_PREFERENCES: UserEnginePreferences = {
  autoExchangeEnabled: true,
  isPaused: false,
  targetCategories: ["All Categories"],
  targetLocations: ["All Lagos Locations"],
  openForAds: false,
  ratePerPost: 0,
  bundlePrice: 0,
  audienceNiche: "",
  estimatedViews: 0,
  customWhatsAppNumber: "",
};

/** Production network: only verified + published communities from Supabase. */
export async function getVerifiedNetworkMembers(): Promise<NetworkMember[]> {
  const { data, error } = await supabase
    .from("whatsapp_communities")
    .select(`id,name,member_count,active_daily_views,verification_status,is_published,created_at,promoter:promoter_profiles(id,user_id,display_name,phone_whatsapp,bio,niche,is_verified,status),category:categories(name)`)
    .eq("verification_status", "verified")
    .eq("is_published", true)
    .order("active_daily_views", { ascending: false });
  if (error) throw error;

  return (data ?? []).flatMap((row: any) => {
    const promoter = Array.isArray(row.promoter) ? row.promoter[0] : row.promoter;
    const category = Array.isArray(row.category) ? row.category[0] : row.category;
    if (!promoter || promoter.status !== "active" || !promoter.is_verified) return [];
    return [{
      id: row.id,
      name: promoter.display_name,
      businessName: row.name,
      category: category?.name ?? promoter.niche?.[0] ?? "Business",
      location: "Nigeria",
      phone: promoter.phone_whatsapp,
      statusViewsEstimate: row.active_daily_views ?? 0,
      verified: true,
      openForAds: false,
      ratePerPost: undefined,
      bundlePrice: undefined,
      bio: promoter.bio ?? "",
      joinedAt: row.created_at,
    }];
  });
}

/** @deprecated Kept only for compatibility; no seeded/demo members are returned. */
export const INITIAL_VERIFIED_POOL: NetworkMember[] = [];

export async function getConnectionLogs(): Promise<ConnectionLog[]> {
  const { data, error } = await supabase
    .from("whatsapp_engine_connection_logs")
    .select("*")
    .order("synced_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id, contactId: r.contact_id, contactName: r.contact_name, businessName: r.business_name,
    category: r.category, phone: r.phone, syncedAt: r.synced_at, method: r.method,
    googleResourceName: r.google_resource_name ?? undefined, mutualConfirmed: r.mutual_confirmed,
  }));
}

export async function recordConnectionLog(log: Omit<ConnectionLog, "id" | "syncedAt">): Promise<ConnectionLog> {
  const { data, error } = await supabase.from("whatsapp_engine_connection_logs").upsert({
    user_id: (await supabase.auth.getUser()).data.user?.id,
    contact_id: log.contactId, contact_name: log.contactName, business_name: log.businessName,
    category: log.category, phone: log.phone, method: log.method,
    google_resource_name: log.googleResourceName ?? null, mutual_confirmed: log.mutualConfirmed,
  }, { onConflict: "user_id,contact_id" }).select().single();
  if (error) throw error;
  return { id: data.id, contactId: data.contact_id, contactName: data.contact_name, businessName: data.business_name,
    category: data.category, phone: data.phone, syncedAt: data.synced_at, method: data.method,
    googleResourceName: data.google_resource_name ?? undefined, mutualConfirmed: data.mutual_confirmed };
}

export async function isContactConnected(contactId: string): Promise<boolean> {
  const { data, error } = await supabase.from("whatsapp_engine_connection_logs").select("id").eq("contact_id", contactId).maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function getUserEnginePreferences(): Promise<UserEnginePreferences> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return DEFAULT_PREFERENCES;
  const { data, error } = await supabase.from("whatsapp_engine_preferences").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_PREFERENCES;
  return {
    autoExchangeEnabled: data.auto_exchange_enabled, isPaused: data.is_paused,
    targetCategories: data.target_categories ?? [], targetLocations: data.target_locations ?? [],
    openForAds: data.open_for_ads, ratePerPost: data.rate_per_post, bundlePrice: data.bundle_price,
    audienceNiche: data.audience_niche, estimatedViews: data.estimated_views,
    customWhatsAppNumber: data.custom_whatsapp_number,
  };
}

export async function saveUserEnginePreferences(prefs: UserEnginePreferences): Promise<void> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("You must be signed in to save WhatsApp engine preferences.");
  const { error } = await supabase.from("whatsapp_engine_preferences").upsert({
    user_id: userId, auto_exchange_enabled: prefs.autoExchangeEnabled, is_paused: prefs.isPaused,
    target_categories: prefs.targetCategories, target_locations: prefs.targetLocations,
    open_for_ads: prefs.openForAds, rate_per_post: prefs.ratePerPost, bundle_price: prefs.bundlePrice,
    audience_niche: prefs.audienceNiche, estimated_views: prefs.estimatedViews,
    custom_whatsapp_number: prefs.customWhatsAppNumber,
  });
  if (error) throw error;
}

function mapBooking(r: any): StatusAdBooking {
  return { id: r.id, creatorId: r.creator_id, creatorName: r.creator_name, advertiserId: r.advertiser_id,
    advertiserName: r.advertiser_name, advertiserPhone: r.advertiser_phone, advertiserEmail: r.advertiser_email ?? undefined,
    campaignTitle: r.campaign_title, caption: r.caption, mediaUrl: r.media_url ?? undefined, targetDate: r.target_date,
    slotCount: r.slot_count, totalAmount: r.total_amount, status: r.status, proofScreenshotUrl: r.proof_screenshot_url ?? undefined,
    proofSubmittedAt: r.proof_submitted_at ?? undefined, proofViewerCount: r.proof_viewer_count ?? undefined,
    notes: r.notes ?? undefined, createdAt: r.created_at };
}

export async function getStatusAdBookings(): Promise<StatusAdBooking[]> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return [];
  const { data, error } = await supabase.from("whatsapp_status_ad_bookings").select("*").or(`creator_id.eq.${userId},advertiser_id.eq.${userId}`).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapBooking);
}

export async function createStatusAdBooking(booking: Omit<StatusAdBooking, "id" | "createdAt" | "status">): Promise<StatusAdBooking> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("You must be signed in to create an ad booking.");
  const { data, error } = await supabase.from("whatsapp_status_ad_bookings").insert({
    ...booking, creator_id: booking.creatorId, advertiser_id: booking.advertiserId,
    advertiser_email: booking.advertiserEmail ?? null, media_url: booking.mediaUrl ?? null,
    target_date: booking.targetDate, slot_count: booking.slotCount, total_amount: booking.totalAmount,
    proof_screenshot_url: booking.proofScreenshotUrl ?? null, proof_submitted_at: booking.proofSubmittedAt ?? null,
    proof_viewer_count: booking.proofViewerCount ?? null,
  }).select().single();
  if (error) throw error;
  return mapBooking(data);
}

export async function updateBookingStatus(bookingId: string, update: Partial<StatusAdBooking>): Promise<StatusAdBooking[]> {
  const patch: any = {};
  if (update.status !== undefined) patch.status = update.status;
  if (update.proofScreenshotUrl !== undefined) patch.proof_screenshot_url = update.proofScreenshotUrl;
  if (update.proofSubmittedAt !== undefined) patch.proof_submitted_at = update.proofSubmittedAt;
  if (update.proofViewerCount !== undefined) patch.proof_viewer_count = update.proofViewerCount;
  if (update.notes !== undefined) patch.notes = update.notes;
  const { error } = await supabase.from("whatsapp_status_ad_bookings").update(patch).eq("id", bookingId);
  if (error) throw error;
  return getStatusAdBookings();
}

/** Production clear: deletes only the signed-in user's persisted engine data. */
export async function clearAllEngineData(): Promise<void> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return;
  await Promise.all([
    supabase.from("whatsapp_engine_connection_logs").delete().eq("user_id", userId),
    supabase.from("whatsapp_engine_preferences").delete().eq("user_id", userId),
  ]);
}
