// Submit a user ad to OUR ad server (replaces ggd-submit-ad).
// Deducts wallet, creates pending record. Admin approves -> goes live.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(url, svc);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json();
    const { title, description, target_url, image_url, duration_days, placement } = body || {};
    if (!title || !target_url || !image_url || !duration_days) return json({ error: "Missing required fields" }, 400);
    const days = Math.max(1, Math.min(30, Number(duration_days)));

    const { data: settingRows } = await admin.from("site_settings")
      .select("key,value").in("key", ["ad_cost_per_day", "ad_auto_approve"]);
    const sMap: Record<string,string> = {};
    (settingRows || []).forEach((r:any)=>{ sMap[r.key] = r.value || ""; });
    const costPerDay = Number(sMap.ad_cost_per_day || 500);
    const autoApprove = ["true","on","1","yes"].includes((sMap.ad_auto_approve || "").toLowerCase());
    const total = costPerDay * days;

    const { data: deducted } = await admin.rpc("deduct_wallet", {
      _user_id: user.id, _amount: total, _description: `Ad: ${title} (${days}d)`,
    });
    if (!deducted) return json({ error: "Insufficient wallet balance" }, 400);

    const now = new Date();
    const ends = new Date(now.getTime() + days * 86400000);
    const { data: row, error: insErr } = await admin.from("user_ads").insert({
      user_id: user.id, title, description: description || null,
      target_url, image_url, duration_days: days, cost_amount: total,
      status: autoApprove ? "active" : "pending",
      placement: placement || "blog", source: "web",
      starts_at: autoApprove ? now.toISOString() : null,
      ends_at: autoApprove ? ends.toISOString() : null,
      approved_at: autoApprove ? now.toISOString() : null,
    }).select().single();
    if (insErr) {
      await admin.rpc("topup_wallet", { _user_id: user.id, _amount: total, _description: "Refund: ad submit error" });
      return json({ error: insErr.message }, 500);
    }
    return json({ success: true, ad: row });
  } catch (e: any) {
    return json({ error: e.message || "Server error" }, 500);
  }
});
function json(b: any, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }