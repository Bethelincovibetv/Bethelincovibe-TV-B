import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Radio } from "lucide-react";
import { toast } from "sonner";
import { VixoraLiveVoiceAgent, VoiceAgentState } from "@/lib/vixoraVoiceEngine";

type Props = {
  conversationId: string | null;
  businessContext: any;
  onInterimText?: (t: string) => void;
  onUserText: (t: string) => void;
  onAssistantText: (t: string, conversationId?: string) => void;
};

/**
 * Live Voice mode for the AI Business Coach.
 * Powered by Google Gemini Live API (`gemini-3.1-flash-live-preview`).
 * Features bidirectional 16kHz PCM audio streaming, live user transcription,
 * and gapless 24kHz voice responses.
 */
export default function LiveVoiceButton({
  conversationId,
  businessContext,
  onInterimText,
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

  const start = async () => {
    stop();

    const coachSystemPrompt = `You are Coach Bethel Goodgift, the Executive AI Business Strategist at BTV.
${businessContext?.business_name ? `The business name is "${businessContext.business_name}".` : ""}
${businessContext?.industry ? `Industry: ${businessContext.industry}.` : ""}
${businessContext?.goal ? `Goal: ${businessContext.goal}.` : ""}
Speak naturally, warmly, energetically, and concisely in 2 to 3 practical, spoken sentences per turn. Never output markdown asterisks or bullet points.`;

    const agent = new VixoraLiveVoiceAgent(
      {
        voiceName: "Aoede", // Victoria Studio Lead
        silenceTimeoutMs: 1100,
        continuous: true,
        lang: "en-US",
        systemPrompt: coachSystemPrompt,
      },
      {
        onStateChange: (s) => setStatus(s),
        onInterimTranscript: (t) => onInterimText?.(t),
        onFinalTranscript: (t) => {
          onInterimText?.("");
          if (t && t.trim().length > 1) {
            onUserText(t.trim());
          }
        },
        onAIResponse: (reply) => {
          if (reply && reply.trim()) {
            onAssistantText(reply.trim(), convIdRef.current || undefined);
          }
        },
        onError: (err) => {
          onInterimText?.("");
          toast.error(err);
        },
      }
    );

    agentRef.current = agent;
    const ok = await agent.start();
    if (ok) {
      setActive(true);
      toast.success("Google Gemini Live Voice connected — speak naturally with your coach");
    }
  };

  const stop = () => {
    onInterimText?.("");
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
      : "Gemini Live Voice";

  return (
    <Button
      type="button"
      onClick={active ? stop : start}
      variant={active ? "destructive" : "secondary"}
      size="sm"
      className="gap-1.5 font-bold"
      title="Bidirectional live voice conversation powered by Google Gemini Live API"
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
