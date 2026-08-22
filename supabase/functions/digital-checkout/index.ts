import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { decryptSecret } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sellerSecret(admin: any, sellerId: string): Promise<string | null> {
  const { data } = await admin.from("seller_payment_secrets").select("secret_key").eq("user_id", sellerId).maybeSingle();
  if (!data?.secret_key) return null;
  try { return await decryptSecret(data.secret_key); } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Please sign in to continue" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Please sign in to continue" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { action, product_id, reference, buyer_name } = await req.json();

    if (action === "init") {
      const { data: product } = await admin.from("directory_products").select("*").eq("id", product_id).maybeSingle();
      if (!product) return json({ error: "Product not found" }, 404);
      if (product.user_id === user.id) return json({ error: "You cannot buy your own product" }, 400);

      const secret = await sellerSecret(admin, product.user_id);
      if (!secret) return json({ error: "This seller has not connected a payment account yet" }, 400);

      const amount = Number(product.price || 0);
      if (amount < 100) return json({ error: "Product price must be at least ₦100 to sell online" }, 400);

      const ref = `dp_${product.id.slice(0, 8)}_${Date.now()}`;
      const psRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          amount: Math.round(amount * 100),
          reference: ref,
          metadata: { product_id: product.id, buyer_id: user.id, seller_id: product.user_id },
        }),
      });
      const ps = await psRes.json();
      if (!ps.status) return json({ error: ps.message || "Could not start payment" }, 400);

      await admin.from("product_purchases").insert({
        product_id: product.id,
        buyer_id: user.id,
        buyer_email: user.email,
        buyer_name: buyer_name || null,
        seller_id: product.user_id,
        amount,
        currency: product.currency || "NGN",
        reference: ref,
        status: "pending",
      });

      return json({ reference: ref, authorization_url: ps.data.authorization_url, access_code: ps.data.access_code });
    }

    if (action === "verify") {
      const { data: purchase } = await admin.from("product_purchases").select("*").eq("reference", reference).maybeSingle();
      if (!purchase) return json({ error: "Purchase not found" }, 404);
      if (purchase.buyer_id !== user.id) return json({ error: "Not your purchase" }, 403);
      if (purchase.status === "paid") return json({ ok: true, alreadyPaid: true, purchase });

      const secret = await sellerSecret(admin, purchase.seller_id);
      if (!secret) return json({ error: "Seller payment account unavailable" }, 400);

      const vRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${secret}` },
      });
      const v = await vRes.json();
      if (!v.status || v.data?.status !== "success") return json({ error: "Payment not successful" }, 400);

      const { data: updated } = await admin.from("product_purchases")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", purchase.id).select().maybeSingle();

      const { data: product } = await admin.from("directory_products").select("name, sales_count, revenue").eq("id", purchase.product_id).maybeSingle();
      await admin.from("directory_products").update({
        sales_count: (product?.sales_count || 0) + 1,
        revenue: Number(product?.revenue || 0) + Number(purchase.amount || 0),
      }).eq("id", purchase.product_id);

      // Notify both sides
      await admin.from("user_notifications").insert([
        {
          user_id: purchase.seller_id,
          title: "New sale 🎉",
          body: `${user.email} bought ${product?.name || "your product"} for ₦${Number(purchase.amount).toLocaleString()}.`,
          url: "/dashboard/products",
          type: "sale",
        },
        {
          user_id: purchase.buyer_id,
          title: "Purchase confirmed ✅",
          body: `Your payment for ${product?.name || "your product"} was confirmed. Download it from your purchases.`,
          url: "/dashboard/purchases",
          type: "purchase",
        },
      ]);

      return json({ ok: true, purchase: updated });
    }

    if (action === "download") {
      const { data: purchase } = await admin.from("product_purchases").select("*").eq("reference", reference).maybeSingle();
      if (!purchase || purchase.buyer_id !== user.id) return json({ error: "Not found" }, 404);
      if (purchase.status !== "paid") return json({ error: "Payment not verified yet" }, 403);

      const { data: product } = await admin.from("directory_products")
        .select("delivery_method, delivery_url, delivery_file_path, downloads_count").eq("id", purchase.product_id).maybeSingle();
      if (!product) return json({ error: "Product not found" }, 404);

      let url = product.delivery_url || null;
      if (product.delivery_method === "file" && product.delivery_file_path) {
        const { data: signed, error } = await admin.storage.from("digital-products")
          .createSignedUrl(product.delivery_file_path, 60 * 30);
        if (error) return json({ error: error.message }, 500);
        url = signed?.signedUrl ?? null;
      }
      if (!url) return json({ error: "The seller has not attached a delivery link yet" }, 400);

      await admin.from("product_purchases").update({ downloads: (purchase.downloads || 0) + 1 }).eq("id", purchase.id);
      await admin.from("directory_products").update({ downloads_count: (product.downloads_count || 0) + 1 }).eq("id", purchase.product_id);

      return json({ url });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("digital-checkout error:", e);
    return json({ error: String(e) }, 500);
  }
});
