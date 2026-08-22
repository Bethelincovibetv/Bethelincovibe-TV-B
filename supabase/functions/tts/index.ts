import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Build a WAV header for raw PCM L16 audio returned by Gemini TTS
function buildWav(pcm: Uint8Array, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm.byteLength;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  new Uint8Array(buffer, 44).set(pcm);
  return new Uint8Array(buffer);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { text, voice } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Trim very long text to keep response sizes sane (~5 mins audio max)
    const clean = text.replace(/\s+/g, " ").slice(0, 5000);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: setting } = await sb.from("site_settings").select("value").eq("key", "gemini_api_key").maybeSingle();
    const apiKey = (setting?.value || Deno.env.get("GEMINI_API_KEY") || "").trim();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_KEY_MISSING", message: "Admin has not configured the Gemini API key yet." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const voiceName = voice || "Kore";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: clean }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          },
        }),
      },
    );
    if (!res.ok) {
      const t = await res.text();
      console.error("Gemini TTS failed", res.status, t);
      return new Response(JSON.stringify({ error: "TTS_FAILED", message: `Gemini error ${res.status}` }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await res.json();
    const b64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!b64) {
      return new Response(JSON.stringify({ error: "NO_AUDIO" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const pcm = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const wav = buildWav(pcm);
    return new Response(wav, { headers: { ...corsHeaders, "Content-Type": "audio/wav" } });
  } catch (e: any) {
    console.error("tts error", e);
    return new Response(JSON.stringify({ error: "SERVER_ERROR", message: e?.message }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
