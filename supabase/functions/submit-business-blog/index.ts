import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(sbUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { submissionId } = await req.json();
    if (!submissionId) {
      return new Response(JSON.stringify({ error: "submissionId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sb = createClient(sbUrl, serviceKey);
    const { data: feature } = await sb.from("site_settings").select("value").eq("key", "feature_guest_blog").maybeSingle();
    if (["off", "false", "0", "disabled"].includes(String(feature?.value || "").toLowerCase())) {
      return new Response(JSON.stringify({ error: "Business blog submissions are currently disabled" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: sub } = await sb.from("guest_blog_submissions").select("*").eq("id", submissionId).maybeSingle();
    if (!sub) {
      return new Response(JSON.stringify({ error: "Submission not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (sub.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (sub.status !== "pending_payment") {
      return new Response(JSON.stringify({ error: "Already processed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Deduct wallet
    const { data: paid, error: payErr } = await sb.rpc("deduct_wallet", {
      _user_id: user.id,
      _amount: Number(sub.cost_credits),
      _description: `Business blog submission: ${sub.business_name}`,
      _reference_id: submissionId,
    });
    if (payErr) throw payErr;
    if (!paid) {
      return new Response(JSON.stringify({ error: "Insufficient wallet balance" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark paid (admin will review and trigger AI generation)
    await sb.from("guest_blog_submissions").update({ status: "paid" }).eq("id", submissionId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("submit-business-blog error:", e);
    return new Response(JSON.stringify({ error: e.message || "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
