import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const HUB_BASE_URL = "https://xdfulgwlhqvwpntzbgeq.supabase.co/functions/v1/promoters-hub-api";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return response({ error: "Unauthorized" }, 401);

  const token = authorization.slice(7).trim();
  if (!token) return response({ error: "Unauthorized" }, 401);

  let payload: { path?: string; method?: string; body?: unknown } = {};
  try {
    payload = await req.json();
  } catch {
    // GET-style invocation may have no JSON body.
  }

  const path = typeof payload.path === "string" && payload.path.startsWith("/api/")
    ? payload.path
    : "/api/health";
  const method = payload.method === "POST" ? "POST" : "GET";

  const upstream = await fetch(`${HUB_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: Deno.env.get("HUB_SUPABASE_ANON_KEY") ?? "",
      "Content-Type": "application/json",
    },
    ...(method === "POST" && payload.body !== undefined ? { body: JSON.stringify(payload.body) } : {}),
  });

  const text = await upstream.text();
  let data: unknown = text;
  try { data = JSON.parse(text); } catch { /* keep text */ }
  return response(data, upstream.status);
});
