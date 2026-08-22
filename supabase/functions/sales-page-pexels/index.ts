// Fetch a product image from Pexels by search query.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const key = Deno.env.get("PEXELS_API_KEY");
    if (!key) return j({ error: "pexels_key_missing" }, 500);
    const { query } = await req.json();
    if (!query) return j({ error: "query_required" }, 400);

    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
    const r = await fetch(url, { headers: { Authorization: key } });
    if (!r.ok) return j({ error: `pexels_${r.status}` }, 500);
    const data = await r.json();
    const photos = (data.photos || []).map((p: any) => ({
      id: p.id,
      url: p.src?.large2x || p.src?.large || p.src?.original,
      photographer: p.photographer,
      source: p.url,
    }));
    return j({ photos });
  } catch (e: any) {
    return j({ error: e.message }, 500);
  }
});

function j(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
