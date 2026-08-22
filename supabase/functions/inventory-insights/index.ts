// Inventory AI insights
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
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: products }, { data: sales }, { data: expenses }] = await Promise.all([
      sb.from("inventory_products").select("*").eq("user_id", user.id),
      sb.from("inventory_sales").select("*").eq("user_id", user.id).gte("sold_at", since),
      sb.from("inventory_expenses").select("*").eq("user_id", user.id).gte("spent_at", since),
    ]);

    const summary = {
      products_count: products?.length ?? 0,
      low_stock: (products || []).filter((p: any) => Number(p.stock) <= Number(p.low_stock_threshold)).map((p: any) => ({ name: p.name, stock: p.stock })),
      total_sales: (sales || []).reduce((s: number, r: any) => s + Number(r.total || 0), 0),
      total_expenses: (expenses || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0),
      sales_count: sales?.length ?? 0,
      top_sellers: topByQty(products || [], sales || []),
    };

    const prompt = `As a Lagos retail business analyst, analyse this 30-day snapshot and give crisp, actionable insights:
${JSON.stringify(summary, null, 2)}

Return clean markdown with sections:
## Performance summary (1-2 lines, in Naira)
## What's selling
## Slow movers / dead stock
## Restock alerts
## Next 3 actions to grow profit this week`;

    let insights = "";
    try {
      insights = await callAI(sb as any, [{ role: "user", content: prompt }]);
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err?.message || "AI error" }), { status: err?.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ summary, insights }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function topByQty(products: any[], sales: any[]) {
  const map: Record<string, number> = {};
  for (const s of sales) {
    if (!s.product_id) continue;
    map[s.product_id] = (map[s.product_id] || 0) + Number(s.qty || 0);
  }
  const byId = new Map(products.map((p) => [p.id, p.name]));
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, qty]) => ({ name: byId.get(id) || "Unknown", qty }));
}
