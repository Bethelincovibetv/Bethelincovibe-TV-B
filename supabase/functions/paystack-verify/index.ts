import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { reference } = await req.json();
    if (!reference) return new Response(JSON.stringify({ error: "Missing reference" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Idempotency: if a transaction already exists with this reference description, skip
    const { data: existing } = await admin.from("wallet_transactions").select("id").eq("description", `Paystack top-up: ${reference}`).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: true, alreadyCredited: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: setting } = await admin.from("site_settings").select("value").eq("key", "paystack_secret_key").maybeSingle();
    const secret = setting?.value || Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) return new Response(JSON.stringify({ error: "Paystack not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const v = await verifyRes.json();
    if (!v.status || v.data?.status !== "success") {
      return new Response(JSON.stringify({ error: "Payment not successful", details: v }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const amountNaira = Number(v.data.amount) / 100;
    const meta = v.data.metadata || {};
    if (meta.user_id && meta.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Reference does not belong to this user" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: rpcErr } = await admin.rpc("topup_wallet", {
      _user_id: user.id,
      _amount: amountNaira,
      _description: `Paystack top-up: ${reference}`,
    });
    if (rpcErr) throw rpcErr;

    // Credit one-time referral purchase bonus (best effort, never blocks the top-up)
    try {
      await admin.rpc("credit_referral_purchase", { _user_id: user.id, _amount: amountNaira });
    } catch (e) { console.warn("referral bonus skipped:", e); }

    return new Response(JSON.stringify({ ok: true, amount: amountNaira }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
