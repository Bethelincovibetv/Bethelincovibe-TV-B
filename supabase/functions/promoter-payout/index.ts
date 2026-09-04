import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized: Missing authorization header" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return json({ error: "Unauthorized: Invalid session" }, 401);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Retrieve Paystack secret key securely on backend (following the paystack-verify pattern)
    const { data: setting } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", "paystack_secret_key")
      .maybeSingle();

    const secret = setting?.value || Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) {
      return json({ error: "Paystack secret key is not configured on server" }, 500);
    }

    const body = await req.json();
    const { action } = body;

    // Action: Resolve bank account details securely via Paystack API
    if (action === "resolve_account") {
      const { account_number, bank_code } = body;
      if (!account_number || !bank_code) {
        return json({ error: "Missing required parameters: account_number and bank_code" }, 400);
      }

      const res = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(account_number)}&bank_code=${encodeURIComponent(bank_code)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
        }
      );

      const paystackData = await res.json();
      if (!res.ok || !paystackData.status) {
        return json(
          {
            status: false,
            error: paystackData.message || "Failed to resolve bank account with Paystack",
          },
          400
        );
      }

      return json({
        status: true,
        data: {
          account_name: paystackData.data?.account_name,
          account_number: paystackData.data?.account_number,
          bank_id: paystackData.data?.bank_id,
        },
      });
    }

    return json({ error: `Unsupported action: ${action}` }, 400);
  } catch (err: any) {
    console.error("Promoter payout edge function exception:", err);
    return json({ error: err?.message || "Internal server error" }, 500);
  }
});
