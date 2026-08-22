// Developer-facing endpoint to submit an ad into our network using an API key.
// Ads land as 'pending' for admin approval. No wallet deduction; admins decide pricing.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "POST required" }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let key = req.headers.get("x-api-key") || "";
    const auth = req.headers.get("authorization") || "";
    if (!key && auth.toLowerCase().startsWith("bearer ")) key = auth.slice(7);
    if (!key) return j({ error: "API key required" }, 401);

    const { data: verified } = await admin.rpc("verify_ad_api_key", { _key: key });
    const row = Array.isArray(verified) ? verified[0] : verified;
    if (!row?.id) return j({ error: "Invalid API key" }, 401);
    const scopes = (row as any).scopes || [];
    const hasWrite = Array.isArray(scopes) ? scopes.includes("write") : false;
    if (!hasWrite) return j({ error: "Key lacks 'write' scope" }, 403);

    const body = await req.json();
    const { title, description, target_url, image_url, duration_days, placement, advertiser_email } = body || {};
    if (!title || !target_url || !image_url || !duration_days) return j({ error: "Missing required fields" }, 400);
    const days = Math.max(1, Math.min(60, Number(duration_days)));

    const { data: ad, error } = await admin.from("user_ads").insert({
      user_id: row.id,
      title, description: description || null,
      target_url, image_url, duration_days: days, cost_amount: 0,
      status: "pending", placement: placement || "blog",
      source: "api", external_origin: advertiser_email || req.headers.get("origin") || null,
    }).select().single();
    if (error) return j({ error: error.message }, 500);
    await admin.from("ad_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", row.id);

    return j({ success: true, ad_id: ad.id, status: ad.status });
  } catch (e: any) {
    return j({ error: e.message }, 500);
  }
});
function j(b: any, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }