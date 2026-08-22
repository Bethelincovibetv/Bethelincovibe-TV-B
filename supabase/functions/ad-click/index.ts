// Public click handler. Logs click + 302 redirects to target URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return new Response("Missing id", { status: 400, headers: corsHeaders });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: target } = await admin.rpc("record_ad_click", { _ad_id: id });
    await admin.from("ad_events").insert({
      ad_id: id, event_type: "click",
      referrer: req.headers.get("referer"),
      origin: req.headers.get("origin"),
      user_agent: req.headers.get("user-agent"),
    });
    const dest = (target as any) || "/";
    return Response.redirect(dest, 302);
  } catch (e: any) {
    return new Response(e.message, { status: 500, headers: corsHeaders });
  }
});