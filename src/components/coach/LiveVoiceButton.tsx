import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GoogleLiveVoiceAgent, VoiceAgentState } from "@/lib/googleLiveVoiceEngine";

type Props = {
  conversationId: string | null;
  businessContext: any;
  onUserText: (t: string) => void;
  onAssistantText: (t: string, conversationId?: string) => void;
};

/**
 * Live Voice mode for the AI Business Coach.
 * Powered by Google Live Voice Engine (Kore Voice) with intelligent Voice Activity
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
  const agentRef = useRef<GoogleLiveVoiceAgent | null>(null);
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

    const agent = new GoogleLiveVoiceAgent(
      {
        voiceName: "Kore", // Google Kore Voice
        silenceTimeoutMs: 1400, // 1.4s natural pause before auto-response
        continuous: true,
        lang: "en-US",
      },
      {
        onStateChange: (s) => setStatus(s),
        onError: (err) => toast.error(err),
        onUserFinishedSpeaking: async (transcript) => {
          if (!transcript || transcript.trim().length < 2) return;
          onUserText(transcript);

          try {
            const { data, error } = await supabase.functions.invoke("business-coach", {
              body: {
                conversationId: convIdRef.current,
                message: transcript,
                businessContext,
              },
            });

            if (error || data?.error) throw new Error(data?.error || error?.message);
            const reply = String(data.reply || "");
            if (data.conversationId) convIdRef.current = data.conversationId;

            onAssistantText(reply, data.conversationId);
            return reply;
          } catch (err: any) {
            toast.error(err.message || "Coach error");
            const errReply = "I heard you, but hit a network error. Could you repeat that?";
            return errReply;
          }
        },
      }
    );

    agentRef.current = agent;
    agent.start();
    setActive(true);
    toast.success("Google Live Voice on — speak naturally with Coach Adaobi");
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
    status === "listening" ? "Listening…" :
    status === "processing" ? "Thinking…" :
    status === "speaking" ? "Speaking…" : "Live Voice (Kore)";

  return (
    <Button
      type="button"
      onClick={active ? stop : start}
      variant={active ? "destructive" : "secondary"}
      size="sm"
      className="gap-1.5 font-bold"
      title="Hands-free live voice conversation with Google Kore Voice"
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
