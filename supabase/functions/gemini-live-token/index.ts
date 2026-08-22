// Mints an ephemeral auth token for Google's Gemini Live API so the browser
// can open a bidirectional WebSocket without ever seeing GEMINI_API_KEY.
// Docs: https://ai.google.dev/api/live#auth_tokens.create
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Token usable for the next 30 minutes; new WebSocket sessions must start within 1 min.
    const now = Date.now();
    const expireTime = new Date(now + 30 * 60_000).toISOString();
    const newSessionExpireTime = new Date(now + 60_000).toISOString();

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/auth_tokens?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uses: 1,
          expireTime,
          newSessionExpireTime,
          bidiGenerateContentSetup: {
            model: "models/gemini-2.0-flash-exp",
          },
        }),
      },
    );

    const data = await r.json();
    if (!r.ok) {
      return new Response(JSON.stringify({ error: data?.error?.message || "Token request failed", details: data }), {
        status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ token: data.name, expireTime }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
