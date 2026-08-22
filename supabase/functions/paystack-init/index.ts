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

    const { amount } = await req.json();
    const amt = Number(amount);
    if (!amt || amt < 100) return new Response(JSON.stringify({ error: "Minimum top-up is ₦100" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get Paystack secret — prefer site_settings, fallback to env
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: setting } = await admin.from("site_settings").select("value").eq("key", "paystack_secret_key").maybeSingle();
    const secret = setting?.value || Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) return new Response(JSON.stringify({ error: "Paystack not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const reference = `wallet_${user.id.slice(0, 8)}_${Date.now()}`;

    const psRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(amt * 100), // kobo
        reference,
        metadata: { user_id: user.id, purpose: "wallet_topup" },
      }),
    });
    const ps = await psRes.json();
    if (!ps.status) return new Response(JSON.stringify({ error: ps.message || "Paystack init failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ reference, access_code: ps.data.access_code, authorization_url: ps.data.authorization_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
