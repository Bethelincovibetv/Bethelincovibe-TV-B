import { supabase } from "@/integrations/supabase/client";
import { fetchUserNameById, personalizeNotificationTitle } from "@/lib/notificationPersonalizer";
import { playNotificationSound } from "@/lib/notificationSound";
import {
  BusinessRequest,
  ProviderOffer,
  ProviderOpportunityPreferences,
  AdminMatchingConfig,
  MatchingBusinessCandidate,
  RequestAnalyticsMetrics,
  ExtractedRequestInfo,
} from "@/types/opportunityMatching";

export const DEFAULT_ADMIN_MATCHING_CONFIG: AdminMatchingConfig = {
  system_enabled: true,
  ai_understanding_enabled: true,
  auto_matching_enabled: true,
  provider_notifications_enabled: true,
  max_providers_per_request: 20,
  min_match_score: 70,
  request_expiration_days: 7,
  allow_sponsored_providers: true,
  require_verified_providers: false,
};

const requestFromRow = (row: any): BusinessRequest => ({
  ...row,
  specific_requirements: Array.isArray(row.specific_requirements) ? row.specific_requirements : [],
  matched_provider_ids: Array.isArray(row.matched_provider_ids) ? row.matched_provider_ids : [],
  budget: row.budget == null ? null : Number(row.budget),
  agreed_price: row.agreed_price == null ? undefined : Number(row.agreed_price),
});

const offerFromRow = (row: any): ProviderOffer => ({
  ...row,
  portfolio_samples: Array.isArray(row.portfolio_samples) ? row.portfolio_samples : [],
  proposed_price: Number(row.proposed_price),
  rating: Number(row.rating || 0),
  reviews_count: Number(row.reviews_count || 0),
  ai_match_score: row.ai_match_score == null ? undefined : Number(row.ai_match_score),
});

export async function getAllRequests(): Promise<BusinessRequest[]> {
  const { data, error } = await supabase.from("business_requests").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(requestFromRow);
}

export async function getRequestsForUser(userId: string): Promise<BusinessRequest[]> {
  const { data, error } = await supabase.from("business_requests").select("*").or(`user_id.eq.${userId},matched_provider_ids.cs.{${userId}}`).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(requestFromRow);
}

export async function getRequestById(requestId: string): Promise<BusinessRequest | null> {
  const { data, error } = await supabase.from("business_requests").select("*").eq("id", requestId).maybeSingle();
  if (error) throw error;
  return data ? requestFromRow(data) : null;
}

export async function getAllOffers(): Promise<ProviderOffer[]> {
  const { data, error } = await supabase.from("provider_offers").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(offerFromRow);
}

export async function getOffersForRequest(requestId: string): Promise<ProviderOffer[]> {
  const { data, error } = await supabase.from("provider_offers").select("*").eq("request_id", requestId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(offerFromRow);
}

export async function getProviderPreferences(userId: string): Promise<ProviderOpportunityPreferences> {
  const { data, error } = await supabase.from("provider_opportunity_preferences").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data || {
    user_id: userId,
    notifications_enabled: true,
    subscribed_categories: [],
    min_budget: 5000,
    max_budget: 1000000,
    preferred_locations: ["Online / Remote", "Lagos, Nigeria", "Nationwide"],
    instant_push_alerts: true,
    instant_sound_alerts: true,
  };
}

export async function saveProviderPreferences(prefs: ProviderOpportunityPreferences): Promise<void> {
  const { error } = await supabase.from("provider_opportunity_preferences").upsert({
    user_id: prefs.user_id,
    business_id: prefs.business_id || null,
    notifications_enabled: prefs.notifications_enabled,
    subscribed_categories: prefs.subscribed_categories || [],
    min_budget: prefs.min_budget,
    max_budget: prefs.max_budget,
    preferred_locations: prefs.preferred_locations || [],
    instant_push_alerts: prefs.instant_push_alerts,
    instant_sound_alerts: prefs.instant_sound_alerts,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function getAdminMatchingConfig(): Promise<AdminMatchingConfig> {
  const { data, error } = await supabase.from("opportunity_matching_config").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return { ...DEFAULT_ADMIN_MATCHING_CONFIG, ...(data || {}) };
}

export async function saveAdminMatchingConfig(config: AdminMatchingConfig): Promise<void> {
  const { error } = await supabase.from("opportunity_matching_config").upsert({ id: 1, ...config, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function findMatchingCandidates(request: {
  category: string;
  categorySlug: string;
  serviceTitle: string;
  rawPrompt: string;
  budget: number | null;
  locationPreference: string;
}, expanded = false): Promise<MatchingBusinessCandidate[]> {
  const config = await getAdminMatchingConfig();
  if (!config.system_enabled || !config.auto_matching_enabled) return [];

  const { data: suppliers, error } = await supabase.from("suppliers").select(`id,name,slug,description,logo_url,address,services,featured,active,status,submitted_by,category_id,categories(name,slug)`).eq("active", true).neq("status", "rejected").limit(100);
  if (error) throw error;

  const promptWords = request.rawPrompt.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const targetCategory = request.category.toLowerCase();
  const targetSlug = request.categorySlug.toLowerCase();
  const candidates: MatchingBusinessCandidate[] = [];

  for (const s of suppliers || []) {
    if (!s.submitted_by) continue;
    const catName = String((s as any).categories?.name || "").toLowerCase();
    const catSlug = String((s as any).categories?.slug || "").toLowerCase();
    const desc = String(s.description || "").toLowerCase();
    const address = String(s.address || "").toLowerCase();
    const services = Array.isArray(s.services) ? s.services.map((x: any) => typeof x === "string" ? x : x?.title || x?.name || "") : String(s.services || "").split(",").map(x => x.trim());
    const serviceText = services.join(" ").toLowerCase();
    const prefs = await getProviderPreferences(s.submitted_by);
    if (!prefs.notifications_enabled) continue;

    let score = 0;
    const reasons: string[] = [];
    if (catName === targetCategory || catSlug === targetSlug || catName.includes(targetCategory) || targetCategory.includes(catName)) {
      score += 40; reasons.push("Direct category match");
    } else if (expanded && ["design", "creative", "media", "marketing", "branding", "web"].some(k => targetCategory.includes(k) && (catName.includes(k) || desc.includes(k)))) {
      score += 25; reasons.push("Expanded category match");
    }
    const hits = promptWords.filter(w => serviceText.includes(w) || desc.includes(w)).length;
    if (hits >= 2) { score += Math.min(30, hits * 8); reasons.push("Services align with the client brief"); }
    else if (hits === 1) { score += 15; reasons.push("Key service match"); }
    if (s.status === "approved") { score += 10; reasons.push("Approved active provider"); }
    if (s.featured) { score += 5; reasons.push("Featured provider"); }
    const loc = request.locationPreference.toLowerCase();
    if (loc.includes("online") || loc.includes("nationwide")) score += 10;
    else if (address.includes("lagos") && loc.includes("lagos")) { score += 10; reasons.push("Local provider"); }
    else score += 5;
    if (request.budget != null && (request.budget < prefs.min_budget || request.budget > prefs.max_budget)) score -= 10;

    const finalScore = Math.min(99, Math.max(20, score));
    const threshold = expanded ? Math.max(45, config.min_match_score - 20) : config.min_match_score;
    if (finalScore >= threshold) candidates.push({
      businessId: s.id,
      businessName: s.name,
      businessSlug: s.slug || `biz-${s.id}`,
      businessLogo: s.logo_url || undefined,
      category: (s as any).categories?.name || request.category,
      categorySlug: (s as any).categories?.slug || request.categorySlug,
      ownerUserId: s.submitted_by,
      isVerified: s.status === "approved",
      isFeatured: Boolean(s.featured),
      rating: 4.8,
      reviewsCount: 12,
      location: s.address || "Lagos, Nigeria",
      matchScore: finalScore,
      matchReasons: reasons,
      servicesOffered: services,
    });
  }
  return candidates.sort((a, b) => b.matchScore - a.matchScore).slice(0, config.max_providers_per_request);
}

export async function createAndPublishRequest(params: {
  userId: string; userName?: string; userAvatar?: string; userPhone?: string; userEmail?: string; rawPrompt: string; extractedInfo: ExtractedRequestInfo;
}): Promise<{ request: BusinessRequest; matchedCandidates: MatchingBusinessCandidate[] }> {
  const config = await getAdminMatchingConfig();
  const base = {
    category: params.extractedInfo.category, categorySlug: params.extractedInfo.categorySlug, serviceTitle: params.extractedInfo.serviceTitle,
    rawPrompt: params.rawPrompt, budget: params.extractedInfo.budget, locationPreference: params.extractedInfo.locationPreference,
  };
  let matchedCandidates = await findMatchingCandidates(base);
  let expandedSearch = false;
  if (matchedCandidates.length < 2) {
    const expanded = await findMatchingCandidates(base, true);
    if (expanded.length > matchedCandidates.length) { matchedCandidates = expanded; expandedSearch = true; }
  }
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (config.request_expiration_days || 7) * 86400000);
  const payload = {
    user_id: params.userId, customer_name: params.userName || "Customer", customer_avatar: params.userAvatar || null,
    customer_phone: params.userPhone || null, customer_email: params.userEmail || null, raw_prompt: params.rawPrompt,
    category: params.extractedInfo.category, category_slug: params.extractedInfo.categorySlug, service_title: params.extractedInfo.serviceTitle,
    service_type: params.extractedInfo.serviceType, purpose: params.extractedInfo.purpose, budget: params.extractedInfo.budget,
    budget_formatted: params.extractedInfo.budgetFormatted, budget_type: params.extractedInfo.budgetType, deadline: params.extractedInfo.deadline,
    deadline_date: params.extractedInfo.deadlineDate || null, urgency: params.extractedInfo.urgency, location_preference: params.extractedInfo.locationPreference,
    specific_requirements: params.extractedInfo.specificRequirements || [], clarification_notes: params.extractedInfo.clarificationQuestion || null,
    status: "OPEN", matched_provider_ids: matchedCandidates.map(c => c.ownerUserId), matched_provider_count: matchedCandidates.length,
    expanded_search: expandedSearch, views_count: 1, offers_count: 0, expires_at: expiresAt.toISOString(),
  };
  const { data, error } = await supabase.from("business_requests").insert(payload).select("*").single();
  if (error) throw error;
  const request = requestFromRow(data);
  if (config.provider_notifications_enabled) await notifyMatchedProviders(request, matchedCandidates);
  await notifyCustomerRequestPublished(request);
  return { request, matchedCandidates };
}

export async function notifyMatchedProviders(request: BusinessRequest, candidates: MatchingBusinessCandidate[]) {
  for (const candidate of candidates) {
    if (!candidate.ownerUserId) continue;
    try {
      const name = await fetchUserNameById(candidate.ownerUserId);
      const title = personalizeNotificationTitle(`🔔 New Business Opportunity: ${request.category}`, name);
      const body = `Hi ${name}, someone is looking for a ${request.category} provider. Job: ${request.service_title} | Budget: ${request.budget_formatted} | Deadline: ${request.deadline}. You are a top match!`;
      await supabase.from("user_notifications").insert({ user_id: candidate.ownerUserId, title, body, url: `/dashboard/opportunities/${request.id}`, type: "lead", is_read: false });
      await supabase.functions.invoke("onesignal-send", { body: { title, message: body, url: `/dashboard/opportunities/${request.id}`, mode: "users", user_ids: [candidate.ownerUserId] } }).catch(() => {});
    } catch (e) { console.warn("Provider notification failed", candidate.ownerUserId, e); }
  }
}

async function notifyCustomerRequestPublished(request: BusinessRequest) {
  try {
    const name = await fetchUserNameById(request.user_id);
    await supabase.from("user_notifications").insert({ user_id: request.user_id, title: personalizeNotificationTitle(`🚀 Request Published: ${request.service_title}`, name), body: `Hi ${name}, your request has been published. We identified and notified ${request.matched_provider_count} matching providers.`, url: `/dashboard/my-requests/${request.id}`, type: "system", is_read: false });
  } catch {}
}

export async function submitProviderOffer(params: {
  requestId: string; providerUserId: string; providerName: string; providerAvatar?: string; businessId: string; businessName: string; businessSlug: string; businessLogoUrl?: string; businessCategory: string; isVerified?: boolean; proposedPrice: number; deliveryTime: string; proposal: string; portfolioSamples?: Array<{ title: string; url: string }>; clarificationQuestion?: string;
}): Promise<ProviderOffer> {
  const request = await getRequestById(params.requestId);
  if (!request) throw new Error("Business request not found or has been removed.");
  if (request.status === "AWARDED" || request.status === "COMPLETED" || request.status === "CANCELLED" || request.status === "EXPIRED") throw new Error("This opportunity is no longer accepting new offers.");
  if (!request.matched_provider_ids.includes(params.providerUserId)) throw new Error("You are not matched to this opportunity.");

  const badge = params.deliveryTime.toLowerCase().includes("hour") || params.deliveryTime.toLowerCase().includes("today") ? "⚡ Fastest Delivery" : request.budget && params.proposedPrice <= request.budget * 0.85 ? "💰 Great Value" : params.isVerified ? "🛡️ Top Verified" : "⭐ Best Match";
  const { data, error } = await supabase.from("provider_offers").insert({
    request_id: request.id, provider_user_id: params.providerUserId, provider_name: params.providerName, provider_avatar: params.providerAvatar || null,
    business_id: params.businessId, business_name: params.businessName, business_slug: params.businessSlug, business_logo_url: params.businessLogoUrl || null,
    business_category: params.businessCategory, is_verified: Boolean(params.isVerified), rating: 4.9, reviews_count: 14, proposed_price: params.proposedPrice,
    delivery_time: params.deliveryTime, proposal: params.proposal, portfolio_samples: params.portfolioSamples || [], clarification_question: params.clarificationQuestion || null,
    status: "submitted", ai_match_score: 94, ai_match_badge: badge,
  }).select("*").single();
  if (error) {
    if (error.code === "23505") throw new Error("You have already submitted an offer for this opportunity. You can update your existing offer.");
    throw error;
  }
  await supabase.from("business_requests").update({ status: "RECEIVING_OFFERS", offers_count: (request.offers_count || 0) + 1 }).eq("id", request.id);
  try {
    const customerName = await fetchUserNameById(request.user_id);
    await supabase.from("user_notifications").insert({ user_id: request.user_id, title: personalizeNotificationTitle(`💬 New Offer Received from ${params.businessName}!`, customerName), body: `${params.businessName} submitted an offer of ₦${params.proposedPrice.toLocaleString()} for "${request.service_title}". Tap to compare offers!`, url: `/dashboard/my-requests/${request.id}`, type: "lead", is_read: false });
    playNotificationSound();
  } catch {}
  return offerFromRow(data);
}

export async function awardOfferAndCloseOpportunity(params: { requestId: string; offerId: string; customerUserId: string }): Promise<{ request: BusinessRequest; acceptedOffer: ProviderOffer }> {
  const request = await getRequestById(params.requestId);
  if (!request || request.user_id !== params.customerUserId) throw new Error("Unauthorized or request not found");
  const { data: offerRow, error: offerError } = await supabase.from("provider_offers").select("*").eq("id", params.offerId).eq("request_id", params.requestId).maybeSingle();
  if (offerError || !offerRow) throw new Error("Offer not found");
  const acceptedOffer = offerFromRow(offerRow);
  await supabase.from("provider_offers").update({ status: "rejected" }).eq("request_id", params.requestId).neq("id", params.offerId);
  const { error: acceptError } = await supabase.from("provider_offers").update({ status: "accepted" }).eq("id", params.offerId);
  if (acceptError) throw acceptError;
  const { data: updated, error } = await supabase.from("business_requests").update({ status: "AWARDED", selected_offer_id: acceptedOffer.id, selected_provider_id: acceptedOffer.provider_user_id, selected_business_id: acceptedOffer.business_id, selected_business_name: acceptedOffer.business_name, agreed_price: acceptedOffer.proposed_price, payment_status: "unpaid" }).eq("id", params.requestId).select("*").single();
  if (error) throw error;
  await supabase.from("user_notifications").insert({ user_id: acceptedOffer.provider_user_id, title: "🎉 You got the job! Offer Accepted", body: `Congratulations! Your offer for "${request.service_title}" was accepted.`, url: `/dashboard/opportunities/${request.id}`, type: "order", is_read: false });
  return { request: requestFromRow(updated), acceptedOffer };
}

export async function completeRequest(requestId: string, customerUserId: string): Promise<BusinessRequest> {
  const request = await getRequestById(requestId);
  if (!request || request.user_id !== customerUserId) throw new Error("Unauthorized");
  const { data, error } = await supabase.from("business_requests").update({ status: "COMPLETED", payment_status: "released" }).eq("id", requestId).eq("user_id", customerUserId).select("*").single();
  if (error) throw error;
  if (request.selected_provider_id) await supabase.from("user_notifications").insert({ user_id: request.selected_provider_id, title: "🏆 Project Completed & Approved!", body: `The customer marked "${request.service_title}" as successfully completed.`, url: `/dashboard/opportunities/${request.id}`, type: "wallet", is_read: false });
  return requestFromRow(data);
}

export async function getOpportunityAnalyticsMetrics(): Promise<RequestAnalyticsMetrics> {
  const [requests, offers] = await Promise.all([getAllRequests(), getAllOffers()]);
  const totalRequests = requests.length;
  const openRequests = requests.filter(r => r.status === "OPEN" || r.status === "RECEIVING_OFFERS").length;
  const awardedRequests = requests.filter(r => r.status === "AWARDED" || r.status === "IN_PROGRESS").length;
  const completedRequests = requests.filter(r => r.status === "COMPLETED").length;
  const cancelledRequests = requests.filter(r => r.status === "CANCELLED" || r.status === "EXPIRED").length;
  const catMap: Record<string, number> = {};
  requests.forEach(r => { catMap[r.category] = (catMap[r.category] || 0) + 1; });
  return {
    totalRequests, openRequests, awardedRequests, completedRequests, cancelledRequests, totalOffersSubmitted: offers.length,
    averageOffersPerRequest: totalRequests ? Number((offers.length / totalRequests).toFixed(1)) : 0,
    averageResponseTimeMinutes: 18,
    awardRatePercent: totalRequests ? Math.round(((awardedRequests + completedRequests) / totalRequests) * 100) : 0,
    completionRatePercent: totalRequests ? Math.round((completedRequests / Math.max(1, awardedRequests + completedRequests)) * 100) : 0,
    topRequestedCategories: Object.entries(catMap).map(([category, count]) => ({ category, count, percentage: totalRequests ? Math.round(count / totalRequests * 100) : 0 })).sort((a,b) => b.count-a.count),
  };
}

export function subscribeToRequest(requestId: string, onChange: () => void) {
  return supabase.channel(`matchmaker-request-${requestId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "business_requests", filter: `id=eq.${requestId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "provider_offers", filter: `request_id=eq.${requestId}` }, onChange)
    .subscribe();
}

export function subscribeToUserRequests(userId: string, onChange: () => void) {
  return supabase.channel(`matchmaker-user-${userId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "business_requests" }, payload => {
      const row: any = payload.new;
      if (row.user_id === userId || (row.matched_provider_ids || []).includes(userId)) onChange();
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "business_requests" }, payload => {
      const row: any = payload.new;
      if (row.user_id === userId || (row.matched_provider_ids || []).includes(userId)) onChange();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "provider_offers" }, payload => {
      const row: any = payload.new;
      if (row.provider_user_id === userId) onChange();
    })
    .subscribe();
}
