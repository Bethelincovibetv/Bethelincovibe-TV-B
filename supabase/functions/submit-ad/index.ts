// Submit or Reactivate a user ad to OUR ad server.
// Deducts wallet, creates/renews record. Admin approves -> goes live.
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
    const { action, ad_id, title, description, target_url, image_url, duration_days, placement } = body || {};

    const { data: settingRows } = await admin.from("site_settings")
      .select("key,value").in("key", ["ad_cost_per_day", "ad_auto_approve"]);
    const sMap: Record<string,string> = {};
    (settingRows || []).forEach((r:any)=>{ sMap[r.key] = r.value || ""; });
    const costPerDay = Number(sMap.ad_cost_per_day || 500);
    const autoApprove = ["true","on","1","yes"].includes((sMap.ad_auto_approve || "").toLowerCase());

    // REACTIVATION / RENEWAL FLOW
    if (action === "reactivate" || ad_id) {
      const days = Math.max(1, Math.min(90, Number(duration_days || 7)));
      const { data: existingAd, error: fetchErr } = await admin.from("user_ads")
        .select("*").eq("id", ad_id).eq("user_id", user.id).single();
      if (fetchErr || !existingAd) return json({ error: "Ad not found or unauthorized" }, 404);

      const total = costPerDay * days;
      const { data: deducted } = await admin.rpc("deduct_wallet", {
        _user_id: user.id, _amount: total, _description: `Reactivate Ad: ${existingAd.title} (+${days}d)`,
      });
      if (!deducted) return json({ error: "Insufficient wallet balance to reactivate" }, 400);

      const now = new Date();
      const currentEnds = existingAd.ends_at ? new Date(existingAd.ends_at) : now;
      const baseTime = currentEnds.getTime() > now.getTime() ? currentEnds.getTime() : now.getTime();
      const newEnds = new Date(baseTime + days * 86400000);

      const { data: updated, error: updateErr } = await admin.from("user_ads").update({
        status: "active",
        starts_at: existingAd.starts_at || now.toISOString(),
        ends_at: newEnds.toISOString(),
        approved_at: existingAd.approved_at || now.toISOString(),
        duration_days: (Number(existingAd.duration_days) || 0) + days,
        cost_amount: (Number(existingAd.cost_amount) || 0) + total,
      }).eq("id", ad_id).select().single();

      if (updateErr) {
        await admin.rpc("topup_wallet", { _user_id: user.id, _amount: total, _description: "Refund: ad reactivate error" });
        return json({ error: updateErr.message }, 500);
      }

      return json({ success: true, ad: updated, message: `Ad reactivated for ${days} days!` });
    }

    // NEW AD SUBMISSION FLOW
    if (!title || !target_url || !image_url || !duration_days) return json({ error: "Missing required fields" }, 400);
    const days = Math.max(1, Math.min(90, Number(duration_days)));
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