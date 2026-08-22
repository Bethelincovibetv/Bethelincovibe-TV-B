import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { callAI } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { businessIdea, location, startupCapital, monthlyExpenses, expectedRevenue, teamSize, industry } = await req.json();

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Quick numeric calculations
    const capital = Number(startupCapital) || 0;
    const expenses = Number(monthlyExpenses) || 0;
    const revenue = Number(expectedRevenue) || 0;
    const runwayMonths = expenses > 0 ? (capital / expenses).toFixed(1) : "N/A";
    const monthlyProfit = revenue - expenses;
    const breakEvenMonths = monthlyProfit > 0 ? (capital / monthlyProfit).toFixed(1) : "N/A";
    const annualProfit = monthlyProfit * 12;
    const roi = capital > 0 ? ((annualProfit / capital) * 100).toFixed(1) : "N/A";

    const systemPrompt = `You are a seasoned business advisor for African entrepreneurs, especially in Nigeria. Give practical, grounded advice in a warm conversational tone. Never use asterisks, markdown bold, or robotic phrases. Write like a mentor speaking directly to the founder. Use Naira (₦) where appropriate.`;

    const userPrompt = `Analyze this startup idea and give a clear, honest assessment:

Business: ${businessIdea}
Industry: ${industry || "general"}
Location: ${location || "Nigeria"}
Team size: ${teamSize || 1}
Startup capital: ₦${capital.toLocaleString()}
Monthly expenses: ₦${expenses.toLocaleString()}
Expected monthly revenue: ₦${revenue.toLocaleString()}

Calculated metrics:
- Runway: ${runwayMonths} months
- Monthly profit/loss: ₦${monthlyProfit.toLocaleString()}
- Break-even point: ${breakEvenMonths} months
- Annual ROI: ${roi}%

Give a response with these sections (use plain section headings, no asterisks):

Viability Verdict
One paragraph on whether this looks promising, risky, or needs rework, and why.

Strengths
Three short bullet points using a dash.

Risks to Watch
Three short bullet points using a dash.

Smart Money Moves
Four practical actions to stretch the capital and grow faster.

Recommended Next Steps
A short numbered list of the first five things to do this month.

Keep it under 450 words. Be direct and useful.`;

    let analysis = "";
    try {
      analysis = await callAI(sb as any, [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);
    } catch (err: any) {
      const status = err?.status === 429 ? 429 : err?.status === 402 ? 402 : 500;
      return new Response(JSON.stringify({ error: err?.message || "AI error" }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({
        analysis,
        metrics: {
          runwayMonths,
          monthlyProfit,
          breakEvenMonths,
          annualProfit,
          roi,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
