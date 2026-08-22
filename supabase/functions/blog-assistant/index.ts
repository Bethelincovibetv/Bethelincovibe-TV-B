// Public, lightweight AI assistant used by blog mini-apps.
// Answers short reader questions in the context of the article topic.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { callAI } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, topic } = await req.json();
    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "BAD_REQUEST", message: "Question required" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const answer = await callAI(sb, [
      {
        role: "system",
        content:
          "You are the Bethelincovibe TV business assistant, helping Nigerian entrepreneurs. " +
          "Answer in plain text (no markdown, no asterisks), warm and practical, 60-140 words. " +
          "Use naira figures and Nigerian context where useful. If a question is outside business, " +
          "answer briefly and steer back to business value.",
      },
      {
        role: "user",
        content: `${topic ? `Article topic: ${topic}\n\n` : ""}Reader question: ${String(question).slice(0, 500)}`,
      },
    ]);

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const code = e?.status === 402 ? "AI_CREDITS_EXHAUSTED" : e?.status === 429 ? "RATE_LIMITED" : "SERVICE_FAILED";
    const message = e?.status === 402
      ? "AI credits exhausted. Please try again later."
      : e?.status === 429
        ? "Too many questions right now — please try again in a moment."
        : e?.message || "Assistant unavailable";
    return new Response(JSON.stringify({ error: code, message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
