import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, body, url } = await req.json();
    if (!title || !body) throw new Error("Title and body required");

    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(sbUrl, sbKey);

    // Get all subscriptions
    const { data: subs } = await sb.from("push_subscriptions").select("*");
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscribers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Store notification record
    const authHeader = req.headers.get("Authorization");
    let userId = null;
    if (authHeader) {
      const { data: { user } } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id || null;
    }

    await sb.from("push_notifications").insert({
      title, body, url,
      sent_by: userId,
      recipient_count: subs.length,
    });

    // Note: Actual push delivery requires web-push library with VAPID keys.
    // For now, we store the notification and it can be fetched by the client via polling.
    // To enable real push, add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets.

    return new Response(JSON.stringify({ sent: subs.length, message: "Notification stored and queued" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("send-push error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
