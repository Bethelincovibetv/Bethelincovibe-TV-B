import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { encryptSecret } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { action, public_key, secret_key, merchant_id } = await req.json();

    if (action === "status") {
      const { data } = await admin.from("seller_payment_accounts").select("*").eq("user_id", user.id).maybeSingle();
      return json({ account: data ?? null });
    }

    if (action === "disconnect") {
      await admin.from("seller_payment_secrets").delete().eq("user_id", user.id);
      await admin.from("seller_payment_accounts").delete().eq("user_id", user.id);
      return json({ ok: true });
    }

    if (action === "connect") {
      const pk = String(public_key || "").trim();
      const sk = String(secret_key || "").trim();
      if (!pk.startsWith("pk_")) return json({ error: "Public key must start with pk_test_ or pk_live_" }, 400);
      if (!sk.startsWith("sk_")) return json({ error: "Secret key must start with sk_test_ or sk_live_" }, 400);

      // Verify credentials against Paystack before saving
      const res = await fetch("https://api.paystack.co/transaction?perPage=1", {
        headers: { Authorization: `Bearer ${sk}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.status === false) {
        await admin.from("seller_payment_accounts").upsert(
          { user_id: user.id, provider: "paystack", public_key: pk, merchant_id: merchant_id || null, status: "invalid" },
          { onConflict: "user_id" },
        );
        return json({ error: body?.message || "Invalid Paystack credentials", status: "invalid" }, 400);
      }

      let businessName: string | null = null;
      try {
        const iRes = await fetch("https://api.paystack.co/integration", { headers: { Authorization: `Bearer ${sk}` } });
        const iBody = await iRes.json();
        businessName = iBody?.data?.business_name ?? null;
      } catch (_e) { /* optional */ }

      await admin.from("seller_payment_secrets").upsert(
        { user_id: user.id, secret_key: await encryptSecret(sk), updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
      const { data: account } = await admin.from("seller_payment_accounts").upsert(
        {
          user_id: user.id,
          provider: "paystack",
          public_key: pk,
          merchant_id: merchant_id || null,
          business_name: businessName,
          status: "connected",
          last_verified_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      ).select().maybeSingle();

      return json({ ok: true, account });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("seller-paystack error:", e);
    return json({ error: String(e) }, 500);
  }
});
