import { supabase } from "@/integrations/supabase/client";

const FUNCTION_NAME = "promoters-hub-api";

export interface HubHealth { ok?: boolean; status?: string; [key: string]: unknown }
export interface HubResponse<T> { success: boolean; data?: T; error?: { code?: string; message?: string } }

async function request<T>(path: string, method: "GET" | "POST" | "PATCH" | "DELETE" = "GET", body?: unknown): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const userId = sessionData.session?.user?.id;
  if (!token || !userId) throw new Error("You must be signed in to use WhatsApp Promoters.");

  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { path, method, ...(body === undefined ? {} : { body }) },
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error) throw new Error(error.message || "Promoters Hub request failed");
  const response = data as HubResponse<T>;
  if (response?.success === false) {
    throw new Error(response.error?.message || "Promoters Hub request failed");
  }
  return (response?.data ?? response) as T;
}

async function currentPromoter() {
  const { data: sessionData } = await supabase.auth.getSession();
  const externalUserId = sessionData.session?.user?.id;
  if (!externalUserId) throw new Error("You must be signed in to use WhatsApp Promoters.");

  const promoters = await request<any[]>(`/api/promoters?external_user_id=${encodeURIComponent(externalUserId)}`);
  const promoter = promoters?.[0];
  if (!promoter) throw new Error("Your WhatsApp Promoter profile has not been created yet.");
  return promoter;
}

/** Browser client for the live WhatsApp Promoters Hub through the main app Edge Function bridge. */
export const whatsappPromotersHub = {
  health: () => request<HubHealth>("/api/health"),
  getPromoter: () => currentPromoter(),
  campaigns: async () => {
    const promoter = await currentPromoter();
    return request(`/api/campaigns?external_user_id=${encodeURIComponent(promoter.external_user_id)}`);
  },
  promotions: async () => {
    const promoter = await currentPromoter();
    const campaigns = await request<any[]>(`/api/campaigns?external_user_id=${encodeURIComponent(promoter.external_user_id)}`);
    const results = await Promise.all((campaigns || []).map((campaign) => request<any[]>(`/api/campaigns/${campaign.id}/promotions`)));
    return results.flat();
  },
  wallet: async () => {
    const promoter = await currentPromoter();
    return request(`/api/promoters/${promoter.id}/wallet`);
  },
  transactions: async () => {
    const promoter = await currentPromoter();
    return request(`/api/promoters/${promoter.id}/transactions`);
  },
  withdrawals: async () => {
    const promoter = await currentPromoter();
    return request(`/api/promoters/${promoter.id}/withdrawals`);
  },
  stats: async () => {
    const promoter = await currentPromoter();
    return request(`/api/promoters/${promoter.id}/stats`);
  },
};
