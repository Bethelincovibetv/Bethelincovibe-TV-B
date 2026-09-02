import { supabase } from "@/integrations/supabase/client";

const FUNCTION_NAME = "promoters-hub-api";

export interface HubHealth { ok?: boolean; status?: string; [key: string]: unknown }

async function request<T>(path: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("You must be signed in to use WhatsApp Promoters.");

  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { path, method, ...(body === undefined ? {} : { body }) },
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error) throw new Error(error.message || "Promoters Hub request failed");
  return data as T;
}

/** Secure browser-side client for the live WhatsApp Promoters Hub. */
export const whatsappPromotersHub = {
  health: () => request<HubHealth>("/api/health"),
  getPromoter: () => request("/api/promoters/me"),
  campaigns: () => request("/api/campaigns"),
  promotions: () => request("/api/promotions"),
  wallet: () => request("/api/promoter-wallet"),
  transactions: () => request("/api/wallet-transactions"),
  withdrawals: () => request("/api/withdrawals"),
  stats: () => request("/api/promoter-stats"),
};
