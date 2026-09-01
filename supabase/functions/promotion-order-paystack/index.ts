import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Helper to get Paystack secret key from site_settings or environment variables
async function getPaystackSecretKey(adminClient: any): Promise<string | null> {
  try {
    const { data: setting } = await adminClient
      .from("site_settings")
      .select("value")
      .eq("key", "paystack_secret_key")
      .maybeSingle();

    if (setting?.value && String(setting.value).trim()) {
      return String(setting.value).trim();
    }
  } catch (err) {
    console.warn("Could not read site_settings for paystack_secret_key", err);
  }

  return Deno.env.get("PAYSTACK_SECRET_KEY") || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Webhook handling (Paystack server-to-server POST)
    const paystackSignature = req.headers.get("x-paystack-signature");
    if (paystackSignature && req.method === "POST") {
      const rawBody = await req.text();
      const secret = await getPaystackSecretKey(admin);
      if (!secret) {
        return json({ error: "Paystack secret key not configured on server" }, 500);
      }

      // Verify HMAC-SHA512 signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-512" },
        false,
        ["verify"]
      );

      const signatureBytes = new Uint8Array(
        paystackSignature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
      );

      const isValid = await crypto.subtle.verify(
        "HMAC",
        key,
        signatureBytes,
        encoder.encode(rawBody)
      );

      if (!isValid) {
        return json({ error: "Invalid webhook signature" }, 401);
      }

      const event = JSON.parse(rawBody);
      if (event.event === "charge.success" && event.data?.status === "success") {
        const txData = event.data;
        const metadata = txData.metadata || {};

        if (metadata.purpose === "promotion_order_payment" && metadata.order_id) {
          const orderId = metadata.order_id;
          const ref = txData.reference;
          const paidNaira = Number(txData.amount) / 100;
          const currency = txData.currency || "NGN";

          // Execute DB confirmation RPC
          const { data: rpcResult, error: rpcError } = await admin.rpc(
            "verify_and_confirm_promotion_order_payment",
            {
              p_order_id: orderId,
              p_payment_reference: ref,
              p_paystack_tx_id: String(txData.id || ""),
              p_verified_amount_naira: paidNaira,
              p_verified_currency: currency,
              p_paystack_raw_response: txData,
            }
          );

          if (rpcError) {
            console.error("Webhook promotion order payment confirmation error:", rpcError);
            return json({ error: rpcError.message }, 500);
          }

          return json({ ok: true, result: rpcResult });
        }
      }

      return json({ ok: true, message: "Webhook acknowledged" });
    }

    // 2. Client-facing endpoints (Authorization header required)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized: Missing authentication header" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) {
      return json({ error: "Unauthorized: Invalid user session" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const { action, order_id, reference } = body;

    // Action A: Initialize Payment
    if (action === "init") {
      if (!order_id) {
        return json({ error: "Order ID is required" }, 400);
      }

      // Step 1: Retrieve order
      const { data: order, error: orderErr } = await admin
        .from("promotion_orders")
        .select(`
          *,
          package:promotion_packages(*),
          community:whatsapp_communities(*)
        `)
        .eq("id", order_id)
        .maybeSingle();

      if (orderErr || !order) {
        return json({ error: "Promotion order not found" }, 404);
      }

      // Step 2: Validate ownership
      if (order.business_user_id !== user.id) {
        return json({ error: "Unauthorized: You do not own this promotion order" }, 403);
      }

      // Step 3: Validate status
      if (order.status === "paid_escrow") {
        return json({ error: "Order is already paid and funded in escrow", alreadyPaid: true }, 400);
      }

      if (order.status !== "pending_payment") {
        return json({ error: `Cannot pay for order with status '${order.status}'` }, 400);
      }

      // Step 4: Validate package and community active state
      if (order.package && !order.package.is_active) {
        return json({ error: "This promotion package is currently inactive" }, 400);
      }

      if (order.community && (order.community.verification_status !== "verified" || !order.community.is_published)) {
        return json({ error: "The associated WhatsApp community is no longer verified or published" }, 400);
      }

      // Step 5: Amount check (Trusted order amount in Naira and Kobo)
      const trustedAmountNaira = Number(order.amount);
      if (!trustedAmountNaira || trustedAmountNaira <= 0) {
        return json({ error: "Invalid order amount" }, 400);
      }

      const amountKobo = Math.round(trustedAmountNaira * 100);

      // Step 6: Get Paystack secret key
      const secret = await getPaystackSecretKey(admin);
      if (!secret) {
        return json({ error: "Paystack is not configured on the platform" }, 500);
      }

      // Step 7: Generate unique payment reference
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randStr = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
      const paymentRef = `BTV-PAY-PROM-${dateStr}-${randStr}`;

      // Step 8: Call Paystack Transaction Initialize API
      const origin = req.headers.get("origin") || "https://bincovibe.tv";
      const callbackUrl = `${origin}/dashboard/promotion-orders/${order.id}?paystack_ref=${paymentRef}`;

      const psRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: amountKobo,
          reference: paymentRef,
          currency: "NGN",
          callback_url: callbackUrl,
          metadata: {
            order_id: order.id,
            order_reference: order.order_reference,
            user_id: user.id,
            purpose: "promotion_order_payment",
            package_id: order.package_id,
            promoter_id: order.promoter_id,
            community_id: order.community_id,
          },
        }),
      });

      const psData = await psRes.json();

      if (!psData.status) {
        return json({ error: psData.message || "Paystack initialization failed" }, 502);
      }

      // Step 9: Record payment reference in database & payment log
      await admin
        .from("promotion_orders")
        .update({
          payment_reference: paymentRef,
          payment_method: "paystack",
        })
        .eq("id", order.id);

      await admin.from("promotion_payment_logs").upsert(
        {
          order_id: order.id,
          order_reference: order.order_reference,
          payment_reference: paymentRef,
          business_user_id: user.id,
          amount_naira: trustedAmountNaira,
          amount_kobo: amountKobo,
          currency: "NGN",
          status: "initialized",
        },
        { onConflict: "payment_reference" }
      );

      return json({
        ok: true,
        reference: paymentRef,
        access_code: psData.data?.access_code,
        authorization_url: psData.data?.authorization_url,
        amount: trustedAmountNaira,
        amount_kobo: amountKobo,
        currency: "NGN",
        order_reference: order.order_reference,
      });
    }

    // Action B: Verify Payment
    if (action === "verify") {
      const checkRef = reference;
      if (!checkRef) {
        return json({ error: "Payment reference is required for verification" }, 400);
      }

      // Step 1: Retrieve order
      const { data: order, error: orderErr } = await admin
        .from("promotion_orders")
        .select("*")
        .or(`id.eq.${order_id || "00000000-0000-0000-0000-000000000000"},payment_reference.eq.${checkRef}`)
        .maybeSingle();

      if (orderErr || !order) {
        return json({ error: "Order associated with reference not found" }, 404);
      }

      // Step 2: Validate ownership
      if (order.business_user_id !== user.id) {
        return json({ error: "Unauthorized: You do not own this order" }, 403);
      }

      // Step 3: Idempotency check: If order is already paid_escrow
      if (order.status === "paid_escrow") {
        return json({
          ok: true,
          alreadyPaid: true,
          status: "paid_escrow",
          order,
        });
      }

      // Step 4: Validate status
      if (order.status !== "pending_payment") {
        return json({ error: `Cannot verify payment for order with status '${order.status}'` }, 400);
      }

      // Step 5: Get Paystack secret key
      const secret = await getPaystackSecretKey(admin);
      if (!secret) {
        return json({ error: "Paystack is not configured on the platform" }, 500);
      }

      // Step 6: Query Paystack verification endpoint
      const vRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(checkRef)}`, {
        headers: { Authorization: `Bearer ${secret}` },
      });

      const vData = await vRes.json();

      if (!vData.status || vData.data?.status !== "success") {
        return json(
          {
            error: "Payment verification failed with provider",
            paystack_message: vData.message || "Transaction not marked as successful",
            status: "failed",
          },
          400
        );
      }

      const tx = vData.data;
      const paidKobo = Number(tx.amount);
      const paidNaira = paidKobo / 100;
      const expectedKobo = Math.round(Number(order.amount) * 100);

      // Step 7: Verify Currency & Exact Amount
      if (tx.currency !== "NGN") {
        return json({ error: `Invalid currency: Expected NGN, received ${tx.currency}` }, 400);
      }

      if (paidKobo < expectedKobo) {
        return json(
          {
            error: `Payment amount mismatch: Expected ₦${order.amount} (${expectedKobo} kobo), received ₦${paidNaira} (${paidKobo} kobo)`,
          },
          400
        );
      }

      // Step 8: Atomic Transition to paid_escrow via RPC
      const { data: rpcResult, error: rpcError } = await admin.rpc(
        "verify_and_confirm_promotion_order_payment",
        {
          p_order_id: order.id,
          p_payment_reference: checkRef,
          p_paystack_tx_id: String(tx.id || ""),
          p_verified_amount_naira: paidNaira,
          p_verified_currency: "NGN",
          p_paystack_raw_response: tx,
        }
      );

      if (rpcError) {
        console.error("RPC confirmation error:", rpcError);
        return json({ error: rpcError.message }, 500);
      }

      // Fetch fresh order details
      const { data: updatedOrder } = await admin
        .from("promotion_orders")
        .select(`
          *,
          package:promotion_packages(*),
          community:whatsapp_communities(*),
          promoter:promoter_profiles(*)
        `)
        .eq("id", order.id)
        .maybeSingle();

      return json({
        ok: true,
        status: "paid_escrow",
        order: updatedOrder || order,
        result: rpcResult,
      });
    }

    return json({ error: `Unknown action '${action}'` }, 400);
  } catch (e) {
    console.error("promotion-order-paystack error:", e);
    return json({ error: String(e) }, 500);
  }
});
