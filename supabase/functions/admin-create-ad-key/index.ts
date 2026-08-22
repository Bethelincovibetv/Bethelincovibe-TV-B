// Admin generates a developer API key. Returns plaintext ONCE; stores SHA-256 hash.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return j({ error: "unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(url, svc);
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return j({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return j({ error: "forbidden" }, 403);

    const body = await req.json();
    const label = (body?.label || "Untitled key").toString().slice(0, 80);
    const scopes = Array.isArray(body?.scopes) && body.scopes.length ? body.scopes : ["read"];

    // Generate key
    const buf = new Uint8Array(24);
    crypto.getRandomValues(buf);
    const raw = "adv_" + Array.from(buf).map(b => b.toString(16).padStart(2, "0")).join("");
    const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");

    const { data: row, error } = await admin.from("ad_api_keys").insert({
      label, key_prefix: raw.slice(0, 10), key_hash: hashHex, scopes, created_by: user.id,
    }).select().single();
    if (error) return j({ error: error.message }, 500);

    return j({ key: raw, record: row });
  } catch (e: any) {
    return j({ error: e.message }, 500);
  }
});
function j(b: any, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }