// Shared AI helper. Honors the admin-selected provider (lovable | gemini).
// Used by every text-generation edge function. Image generation still goes
// through Lovable directly (in ai-blogger) per product decision.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type Msg = { role: string; content: string };

export async function getAIConfig(sb: ReturnType<typeof createClient>) {
  const { data } = await sb.from("site_settings")
    .select("key,value")
    .in("key", ["ai_provider", "ai_text_model", "gemini_api_key"]);
  const map: Record<string, string> = {};
  (data || []).forEach((r: any) => { map[r.key] = r.value || ""; });
  const provider = (map.ai_provider || "lovable").toLowerCase() === "gemini" ? "gemini" : "lovable";
  let model = map.ai_text_model || "google/gemini-2.5-flash";
  const geminiKey = map.gemini_api_key || "";
  return { provider, model, geminiKey };
}

/** Call an AI chat completion using the admin-selected provider.
 *  Returns the assistant message string. Throws on hard errors with .status set. */
export async function callAI(
  sb: ReturnType<typeof createClient>,
  messages: Msg[],
  override?: { model?: string }
): Promise<string> {
  const { provider, model, geminiKey } = await getAIConfig(sb);
  const useModel = override?.model || model;

  if (provider === "gemini") {
    // Prefer admin-saved key in site_settings, fall back to backend secret.
    const key = geminiKey || Deno.env.get("GEMINI_API_KEY") || "";
    if (!key) {
      throw Object.assign(new Error("Gemini API key not configured. Add it in Admin → Settings → Analytics."), { status: 500 });
    }
    // Use a free-tier-friendly Google AI Studio model. Admin can override via ai_text_model.
    let geminiModel = (useModel || "").replace(/^google\//, "").trim();
    // If admin pasted a Lovable-style model or left blank, default to a known free model.
    if (!geminiModel || !geminiModel.startsWith("gemini-")) geminiModel = "gemini-2.0-flash";
    // Convert OpenAI-style messages into Gemini's generateContent format.
    const systemParts = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
    const body: any = { contents };
    if (systemParts) body.systemInstruction = { parts: [{ text: systemParts }] };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      throw Object.assign(new Error(`Gemini error ${res.status}: ${t}`), { status: res.status });
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text || "")
      .join("") || "";
    return text;
  }

  // default: Lovable AI gateway
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw Object.assign(new Error("LOVABLE_API_KEY not set"), { status: 500 });
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: useModel, messages }),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw Object.assign(new Error("Rate limited, try again shortly"), { status: 429 });
    if (res.status === 402) throw Object.assign(new Error("AI credits exhausted"), { status: 402 });
    throw Object.assign(new Error(`AI error ${res.status}: ${t}`), { status: res.status });
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}