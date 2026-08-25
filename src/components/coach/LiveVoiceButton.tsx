import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Radio } from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VixoraLiveVoiceAgent, VoiceAgentState } from "@/lib/vixoraVoiceEngine";

type Props = {
  conversationId: string | null;
  businessContext: any;
  onUserText: (t: string) => void;
  onAssistantText: (t: string, conversationId?: string) => void;
};

/**
 * Live Voice mode for the AI Business Coach.
 * Powered by Vixora AI Live Voice Engine with intelligent Voice Activity
 * Detection (VAD) silence listening and real-time response.
 */
export default function LiveVoiceButton({
  conversationId,
  businessContext,
  onUserText,
  onAssistantText,
}: Props) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<VoiceAgentState>("idle");
  const agentRef = useRef<VixoraLiveVoiceAgent | null>(null);
  const convIdRef = useRef<string | null>(conversationId);

  useEffect(() => {
    convIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  const start = () => {
    stop();

    const agent = new VixoraLiveVoiceAgent(
      {
        voiceName: "Kore", // Vixora Kore Voice
        silenceTimeoutMs: 1100, // 1.1s instant pause before auto-response
        continuous: true,
        lang: "en-US",
      },
      {
        onStateChange: (s) => setStatus(s),
        onError: (err) => toast.error(err),
        onUserFinishedSpeaking: async (transcript) => {
          if (!transcript || transcript.trim().length < 2) return;
          onUserText(transcript);

          // 1. Try Supabase Edge Function
          try {
            const { data, error } = await supabase.functions.invoke("business-coach", {
              body: {
                conversationId: convIdRef.current,
                message: transcript,
                businessContext,
              },
            });

            if (!error && data?.reply) {
              const reply = String(data.reply);
              if (data.conversationId) convIdRef.current = data.conversationId;
              onAssistantText(reply, data.conversationId);
              return reply;
            }
          } catch (err) {
            console.warn("Edge function notice, using direct voice AI:", err);
          }

          // 2. Direct Gemini Fallback for spoken voice
          try {
            const apiKey =
              (import.meta as any).env?.VITE_GEMINI_API_KEY ||
              (typeof process !== "undefined" ? (process as any).env?.GEMINI_API_KEY : "") ||
              "AIzaSyAeCyBC9daZbvXNRtfLjxBWwpF3MwXJggk";

            const ai = new GoogleGenAI({ apiKey });
            const prompt = `You are Victoria & Adaobi, the lead AI Business Strategist at Vixora and Bethelincovibe.
Speak concisely, energetically, and directly in 2 to 3 natural spoken sentences without markdown asterisks.
User said: "${transcript}"`;

            const res = await ai.models.generateContent({
              model: "gemini-3.7-flash",
              contents: [{ parts: [{ text: prompt }] }],
            });

            const reply = res.text?.trim() || "I am on it. Let's optimize this strategy for your business right now.";
            onAssistantText(reply, convIdRef.current || undefined);
            return reply;
          } catch (e: any) {
            console.error("Direct voice AI error:", e);
            const errReply = "I heard you! Let us keep building momentum for your business.";
            onAssistantText(errReply, convIdRef.current || undefined);
            return errReply;
          }
        },
      }
    );

    agentRef.current = agent;
    agent.start();
    setActive(true);
    toast.success("Vixora Live Voice connected — speak naturally with your coach");
  };

  const stop = () => {
    if (agentRef.current) {
      agentRef.current.stop();
      agentRef.current = null;
    }
    setActive(false);
    setStatus("idle");
  };

  const label =
    status === "listening"
      ? "Listening…"
      : status === "processing"
      ? "Thinking…"
      : status === "speaking"
      ? "Speaking…"
      : "Vixora Live Voice";

  return (
    <Button
      type="button"
      onClick={active ? stop : start}
      variant={active ? "destructive" : "secondary"}
      size="sm"
      className="gap-1.5 font-bold"
      title="Hands-free live voice conversation powered by Vixora AI"
    >
      {status === "processing" || status === "speaking" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : active ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Radio className="h-4 w-4 text-amber-500 animate-pulse" />
      )}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
