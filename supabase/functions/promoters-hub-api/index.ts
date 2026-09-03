import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const HUB_BASE_URL = Deno.env.get("PROMOTERS_HUB_API_URL") || "https://xdfulgwlhqvwpntzbgeq.supabase.co/functions/v1/promoters-hub-api";
const HUB_API_KEY = Deno.env.get("HUB_SUPABASE_ANON_KEY") || "";
const REQUEST_TIMEOUT_MS = 12_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

const ALLOWED_PATHS = new Set([
  "/api/health", "/api/promoters", "/api/promoter-channels", "/api/campaigns", "/api/campaign-promoters",
  "/api/promotions", "/api/promotion", "/api/campaign-stats", "/api/promoter-wallet", "/api/wallet-transactions",
  "/api/withdrawals", "/api/promoter-stats", "/api/webhooks",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function normalizePath(path: string) { const clean = path.trim().split("?")[0]; return clean.startsWith("/") ? clean : `/${clean}`; }
function isAllowedPath(path: string) {
  if (ALLOWED_PATHS.has(path)) return true;
  return [
    /^\/api\/promoters\/[^/]+$/, /^\/api\/promoter-channels\/[^/]+$/, /^\/api\/campaigns\/[^/]+$/,
    /^\/api\/campaigns\/[^/]+\/stats$/, /^\/api\/campaigns\/[^/]+\/promotions$/, /^\/api\/campaign-promoters\/[^/]+$/,
    /^\/api\/promotions\/[^/]+$/, /^\/api\/promotion\/[^/]+$/, /^\/api\/promoter-wallet\/[^/]+$/,
    /^\/api\/wallet-transactions\/[^/]+$/, /^\/api\/withdrawals\/[^/]+$/, /^\/api\/promoter-stats\/[^/]+$/,
  ].some((pattern) => pattern.test(path));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return json({ error: "Authentication required" }, 401);
  let payload: { path?: string; method?: string; query?: Record<string, unknown>; body?: unknown } = {};
  try { payload = await req.json(); } catch {}
  const requestedPath = typeof payload.path === "string" ? payload.path : new URL(req.url).searchParams.get("path") || "/api/health";
  const targetPath = normalizePath(requestedPath);
  if (!isAllowedPath(targetPath)) return json({ error: "Unsupported Promoters Hub route" }, 400);
  const method = typeof payload.method === "string" ? payload.method.toUpperCase() : req.method.toUpperCase();
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) return json({ error: "Unsupported method" }, 405);
  if (!HUB_API_KEY) return json({ error: "Promoters Hub credential is not configured" }, 503);
  const targetUrl = new URL(`${HUB_BASE_URL.replace(/\/$/, "")}${targetPath}`);
  const query = payload.query && typeof payload.query === "object" ? payload.query : {};
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== null) targetUrl.searchParams.set(key, String(value));
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const upstream = await fetch(targetUrl, { method, headers: { Authorization: authorization, apikey: HUB_API_KEY, Accept: "application/json", ...(payload.body !== undefined ? { "Content-Type": "application/json" } : {}) }, ...(payload.body !== undefined ? { body: JSON.stringify(payload.body) } : {}), signal: controller.signal });
    const text = await upstream.text(); let data: unknown = text; try { data = JSON.parse(text); } catch {}
    return json(data, upstream.status);
  } catch (error) {
    const message = error instanceof DOMException && error.name === "AbortError" ? "Promoters Hub request timed out" : "Promoters Hub request failed";
    console.error(message, error instanceof Error ? error.message : String(error)); return json({ error: message }, 502);
  } finally { clearTimeout(timeout); }
});