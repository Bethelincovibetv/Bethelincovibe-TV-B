// Generate sales page copy with Gemini 2.5 Flash, "40-year Nigerian copywriter" voice.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { callAI } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth) return j({ error: "unauthorized" }, 401);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { product_name, product_description, price, contact_whatsapp } = body || {};
    if (!product_name) return j({ error: "product_name_required" }, 400);

    const system = `You are a Nigerian master copywriter with 40 years of experience writing for Lagos, Abuja, Port Harcourt and across West Africa.
You write conversion-obsessed sales copy in clear, warm English that everyday Nigerian customers trust.
You weave in light, natural Nigerian references when appropriate (no heavy pidgin, no clichés).
Every sentence either builds desire, removes friction, or pushes the reader to buy now.
Return ONLY valid minified JSON. No markdown, no commentary.`;

    const prompt = `Write a high-converting sales page for the product below.

PRODUCT NAME: ${product_name}
DESCRIPTION: ${product_description || "(none provided)"}
PRICE (NGN): ${price ?? "unknown"}
WHATSAPP: ${contact_whatsapp || "(none)"}

Return this exact JSON shape:
{
  "headline": "10-14 word attention-grabbing benefit headline",
  "subheadline": "1 sentence reinforcing the promise and target customer",
  "problem": "1-2 short paragraphs naming the customer's pain in their own words",
  "solution": "1-2 short paragraphs introducing the product as the answer",
  "benefits": [
    { "icon": "Zap|Shield|Heart|Star|Trophy|Sparkles|Check|Gift|Crown|Rocket", "title": "Benefit title", "description": "1 sentence explaining the benefit in customer-focused language" }
  ],
  "social_proof": [
    { "name": "Realistic Nigerian first + last name", "location": "Lagos/Abuja/Ibadan/Port Harcourt/Enugu", "quote": "1-2 sentence persuasive testimonial" }
  ],
  "urgency": "1-2 sentence urgency / scarcity statement (limited stock, price going up, bonus expiring)",
  "cta_text": "3-5 word action button text",
  "seo_title": "Under 60 chars, includes product name and benefit",
  "seo_description": "Under 155 chars, persuasive meta description"
}

Constraints: 4-6 benefits. 3 testimonials. Never use the words "amazing", "revolutionary", "game-changer". Make it real, conversational, and persuasive.`;

    const raw = await callAI(sb, [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ], { model: "google/gemini-2.5-flash" });

    // Strip markdown fences if any
    const cleaned = String(raw).replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    let copy: any;
    try { copy = JSON.parse(cleaned); }
    catch { return j({ error: "ai_parse_failed", raw: cleaned.slice(0, 500) }, 500); }

    return j({ copy });
  } catch (e: any) {
    return j({ error: e.message || String(e) }, e.status || 500);
  }
});

function j(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
