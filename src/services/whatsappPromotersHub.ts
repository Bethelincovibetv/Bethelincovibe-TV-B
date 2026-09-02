import { supabase } from "@/integrations/supabase/client";

const FUNCTION_NAME = "promoters-hub-api";

export interface HubHealth { ok?: boolean; status?: string; [key: string]: unknown }

export interface HubRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

/** Secure bridge from Bethelincovibe TV to the live WhatsApp Promoters Hub.
 * The browser sends the current TV user's Supabase JWT; the server-side bridge
 * is responsible for forwarding it to the Hub. No Hub API key belongs here.
 */
async function request<T>(path: string, options: HubRequestOptions = {}): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("You must be signed in to use WhatsApp Promoters.");

  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { path, ...(options.body === undefined ? {} : { body: options.body }), method: options.method ?? "GET" },
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error) throw new Error(error.message || "Promoters Hub request failed");
  return data as T;
}

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
