import { supabase } from "@/integrations/supabase/client";

const FUNCTION_NAME = "promoters-hub-api";

export interface HubHealth { ok?: boolean; status?: string; [key: string]: unknown }
export interface HubResponse<T> { success: boolean; data?: T; error?: { code?: string; message?: string } }

export async function promotersHubRequest<T = unknown>(
  path: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: unknown,
  query?: Record<string, string | number | boolean | null | undefined>,
): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("You must be signed in to use WhatsApp Promoters.");

  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      path,
      method,
      ...(query ? { query } : {}),
      ...(body === undefined ? {} : { body }),
    },
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

  const promoters = await promotersHubRequest<any[]>("/api/promoters", "GET", undefined, { external_user_id: externalUserId });
  const promoter = Array.isArray(promoters) ? promoters[0] : promoters;
  if (!promoter) throw new Error("Your WhatsApp Promoter profile has not been created yet.");
  return promoter;
}

/** Browser client for the independent live WhatsApp Promoters Hub through the main app Edge Function bridge. */
export const whatsappPromotersHub = {
  health: () => promotersHubRequest<HubHealth>("/api/health"),
  getPromoter: () => currentPromoter(),
  createPromoter: (payload: Record<string, unknown>) => promotersHubRequest("/api/promoters", "POST", payload),
  updatePromoter: (promoterId: string, payload: Record<string, unknown>) =>
    promotersHubRequest(`/api/promoters/${encodeURIComponent(promoterId)}`, "PATCH", payload),
  campaigns: async () => {
    const promoter = await currentPromoter();
    return promotersHubRequest(`/api/campaigns`, "GET", undefined, { external_user_id: promoter.external_user_id });
  },
  promotions: async () => {
    const promoter = await currentPromoter();
    const campaigns = await promotersHubRequest<any[]>("/api/campaigns", "GET", undefined, { external_user_id: promoter.external_user_id });
    const results = await Promise.all((campaigns || []).map((campaign) => promotersHubRequest<any[]>(`/api/campaigns/${campaign.id}/promotions`)));
    return results.flat();
  },
  wallet: async () => {
    const promoter = await currentPromoter();
    return promotersHubRequest(`/api/promoters/${promoter.id}/wallet`);
  },
  transactions: async () => {
    const promoter = await currentPromoter();
    return promotersHubRequest(`/api/promoters/${promoter.id}/transactions`);
  },
  withdrawals: async () => {
    const promoter = await currentPromoter();
    return promotersHubRequest(`/api/promoters/${promoter.id}/withdrawals`);
  },
  stats: async () => {
    const promoter = await currentPromoter();
    return promotersHubRequest(`/api/promoters/${promoter.id}/stats`);
  },
};
