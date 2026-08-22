// Public ad server. Returns a random active ad as JSON.
// Optional API-key auth (Bearer adv_xxx) for off-site developer use.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, svc);

    // Check enabled
    const { data: s } = await admin.from("site_settings").select("value").eq("key", "ad_server_enabled").maybeSingle();
    if (s?.value === "false" || s?.value === "off") return json({ ad: null, reason: "disabled" });

    const reqUrl = new URL(req.url);
    const placement = reqUrl.searchParams.get("placement") || "blog";
    const pagePath = reqUrl.searchParams.get("page") || null;

    // Optional API key check — accepts header "x-api-key" or "Authorization: Bearer <key>"
    let apiKey = req.headers.get("x-api-key") || "";
    const auth = req.headers.get("authorization") || "";
    if (!apiKey && auth.toLowerCase().startsWith("bearer ")) apiKey = auth.slice(7);
    if (apiKey.startsWith("adv_")) {
      const { data: keyRow } = await admin.rpc("verify_ad_api_key", { _key: apiKey });
      if (!keyRow || (Array.isArray(keyRow) && keyRow.length === 0)) {
        return json({ error: "Invalid API key" }, 401);
      }
      const keyId = Array.isArray(keyRow) ? keyRow[0].id : (keyRow as any).id;
      if (keyId) await admin.from("ad_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyId);
    }

    const { data, error } = await admin.rpc("serve_random_ad", { _placement: placement });
    if (error) return json({ error: error.message }, 500);
    const ad = Array.isArray(data) ? data[0] : data;
    if (!ad) return json({ ad: null });

    // Log impression
    await admin.from("ad_events").insert({
      ad_id: ad.id, event_type: "impression",
      page_path: pagePath, referrer: req.headers.get("referer"),
      origin: req.headers.get("origin"), user_agent: req.headers.get("user-agent"),
    });

    const clickUrl = `${url}/functions/v1/ad-click?id=${ad.id}`;
    return json({
      ad: {
        id: ad.id,
        title: ad.title,
        description: ad.description,
        image_url: ad.image_url,
        click_url: clickUrl,
      },
    });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});
function json(b: any, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }