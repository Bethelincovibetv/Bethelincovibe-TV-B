import { supabase } from "@/integrations/supabase/client";

const HUB_API_URL = (import.meta.env.VITE_PROMOTERS_HUB_API_URL || "https://xdfulgwlhqvwpntzbgeq.supabase.co/functions/v1/promoters-hub-api").replace(/\/$/, "");

export interface HubHealth { ok?: boolean; status?: string; [key: string]: unknown }
export interface HubResponse<T> { success: boolean; data?: T; error?: { code?: string; message?: string } }

async function hubFetch<T>(path: string, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET", body?: unknown, query?: Record<string, string | number | boolean | null | undefined>, walletPin?: string): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("You must be signed in to use WhatsApp Promoters.");

  const url = new URL(`${HUB_API_URL}${path.startsWith("/") ? path : `/${path}`}`);
  Object.entries(query || {}).forEach(([key, value]) => { if (value !== undefined && value !== null) url.searchParams.set(key, String(value)); });
  const response = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(walletPin ? { "X-Wallet-PIN": walletPin } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let payload: HubResponse<T>;
  try { payload = await response.json(); } catch { throw new Error(`Promoters Hub returned HTTP ${response.status}`); }
  if (!response.ok || payload?.success === false) throw new Error(payload?.error?.message || `Promoters Hub request failed (${response.status})`);
  return (payload?.data ?? payload) as T;
}

export async function promotersHubRequest<T = unknown>(path: string, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET", body?: unknown, query?: Record<string, string | number | boolean | null | undefined>, walletPin?: string): Promise<T> {
  return hubFetch<T>(path, method, body, query, walletPin);
}

async function currentPromoter() {
  const { data: sessionData } = await supabase.auth.getSession();
  const externalUserId = sessionData.session?.user?.id;
  if (!externalUserId) throw new Error("You must be signed in to use WhatsApp Promoters.");
  const promoters = await promotersHubRequest<any[]>("/api/promoters", "GET", undefined, { external_user_id: externalUserId });
  const promoter = Array.isArray(promoters) ? promoters[0] : promoters;
  if (!promoter) throw new Error("Your WhatsApp Promoter profile has not been created yet.");
  return promoter;
}

export const whatsappPromotersHub = {
  health: () => promotersHubRequest<HubHealth>("/api/health"),
  getPromoter: () => currentPromoter(),
  createPromoter: (payload: Record<string, unknown>) => promotersHubRequest("/api/promoters", "POST", payload),
  updatePromoter: (promoterId: string, payload: Record<string, unknown>) => promotersHubRequest(`/api/promoters/${encodeURIComponent(promoterId)}`, "PATCH", payload),
  channels: async () => { const promoter = await currentPromoter(); return promotersHubRequest<any[]>(`/api/promoters/${promoter.id}/channels`); },
  campaigns: async () => { const promoter = await currentPromoter(); return promotersHubRequest(`/api/campaigns`, "GET", undefined, { external_user_id: promoter.external_user_id }); },
  promotions: async () => { const promoter = await currentPromoter(); const campaigns = await promotersHubRequest<any[]>("/api/campaigns", "GET", undefined, { external_user_id: promoter.external_user_id }); const results = await Promise.all((campaigns || []).map((campaign) => promotersHubRequest<any[]>(`/api/campaigns/${campaign.id}/promotions`))); return results.flat(); },
  wallet: async () => { const promoter = await currentPromoter(); return promotersHubRequest(`/api/promoters/${promoter.id}/wallet`); },
  transactions: async () => { const promoter = await currentPromoter(); return promotersHubRequest(`/api/promoters/${promoter.id}/transactions`); },
  withdrawals: async (walletPin?: string) => { const promoter = await currentPromoter(); return promotersHubRequest(`/api/promoters/${promoter.id}/withdrawals`, "GET", undefined, undefined, walletPin); },
  requestWithdrawal: async (payload: Record<string, unknown>, walletPin: string) => { const promoter = await currentPromoter(); return promotersHubRequest(`/api/promoters/${promoter.id}/withdrawals`, "POST", payload, undefined, walletPin); },
  stats: async () => { const promoter = await currentPromoter(); return promotersHubRequest(`/api/promoters/${promoter.id}/stats`); },
  setWalletPin: async (pin: string, confirmPin: string) => { const promoter = await currentPromoter(); return promotersHubRequest(`/api/promoters/${promoter.id}/wallet/pin`, "POST", { pin, confirm_pin: confirmPin }); },
  verifyWalletPin: async (pin: string) => { const promoter = await currentPromoter(); return promotersHubRequest(`/api/promoters/${promoter.id}/wallet/verify-pin`, "POST", undefined, undefined, pin); },
};
