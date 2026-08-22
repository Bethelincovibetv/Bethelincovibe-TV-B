// Business Execution Coach — chat completion via Lovable AI
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { callAI } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are an elite Lagos-based business consultant with 10+ years advising Nigerian SMEs and entrepreneurs. Tone: warm, candid, practical, no fluff. For every user message you must:
1. Diagnose the real problem in plain English.
2. Give "What WILL work" — specific tactics with numbers, channels, examples.
3. Give "What to AVOID" — common traps in the Nigerian market.
4. Reveal an INSIDER SECRET most beginners miss.
5. Provide 3 ranked NEXT ACTIONS the user can do in the next 7 days, each with a clear definition of done.

Use clean Markdown headings (## What WILL work, ## What to AVOID, ## Insider Secret, ## Next 3 Actions). DO NOT use asterisks for emphasis (no **bold** or *italic*) — write plainly so the text reads cleanly when spoken aloud. Reference Lagos/Nigerian context (Naira, Lagos markets, Paystack, Flutterwave, NEPA, etc.) where relevant.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { conversationId, message, businessContext } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: feature } = await sb.from("site_settings").select("value").eq("key", "feature_coach").maybeSingle();
    if (["off", "false", "0", "disabled"].includes(String(feature?.value || "").toLowerCase())) {
      return new Response(JSON.stringify({ error: "AI coach is currently disabled" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Auth — require logged in user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Ensure conversation
    let convId = conversationId;
    if (!convId) {
      const { data: created, error: cErr } = await sb.from("coach_conversations").insert({
        user_id: user.id,
        title: message.slice(0, 60),
        business_context: businessContext || {},
      }).select().single();
      if (cErr) throw cErr;
      convId = created.id;
    }

    // Load history
    const { data: history } = await sb.from("coach_messages")
      .select("role,content").eq("conversation_id", convId).order("created_at", { ascending: true }).limit(40);

    // Save user message
    await sb.from("coach_messages").insert({ conversation_id: convId, role: "user", content: message });

    const ctx = businessContext && Object.keys(businessContext).length
      ? `\n\nBusiness profile: ${JSON.stringify(businessContext)}`
      : "";

    const messages = [
      { role: "system", content: SYSTEM + ctx },
      ...((history || []).map((m: any) => ({ role: m.role, content: m.content }))),
      { role: "user", content: message },
    ];

    let reply = "Sorry, no response.";
    try {
      reply = (await callAI(sb as any, messages)) || reply;
    } catch (err: any) {
      const status = err?.status === 429 ? 429 : err?.status === 402 ? 402 : 500;
      return new Response(JSON.stringify({ error: err?.message || "AI error" }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Strip markdown bold/italic asterisks for cleaner reading & voice output
    reply = reply
      .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1$2")
      .replace(/^\s*\*\s+/gm, "• ");

    await sb.from("coach_messages").insert({ conversation_id: convId, role: "assistant", content: reply });

    return new Response(JSON.stringify({ conversationId: convId, reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
