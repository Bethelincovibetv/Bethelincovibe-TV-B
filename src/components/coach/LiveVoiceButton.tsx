import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Volume2, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { VixoraVoicePipeline, VoiceState } from "@/lib/vixoraVoicePipeline";

type Props = {
  conversationId: string | null;
  businessContext: any;
  onInterimText?: (t: string) => void;
  onUserText: (t: string) => void;
  onAssistantText: (t: string, conversationId?: string) => void;
};

/**
 * Natural Live Voice Assistant Button for the AI Business Coach.
 * Powered by a robust STT → Gemini LLM → TTS pipeline.
 *
 * Flow:
 * 1. User taps mic -> listening starts
 * 2. Real Speech-To-Text captures spoken words in real time (interim transcript)
 * 3. User stops speaking -> Silence detected -> Final transcript automatically sent to Gemini
 * 4. Gemini generates response -> Response text displayed in chat
 * 5. Text-To-Speech automatically speaks the response
 * 6. Interruptible anytime by tapping during speech
 */
export default function LiveVoiceButton({
  conversationId,
  businessContext,
  onInterimText,
  onUserText,
  onAssistantText,
}: Props) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<VoiceState>("idle");
  const pipelineRef = useRef<VixoraVoicePipeline | null>(null);
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
${businessContext?.business_name ? `The user runs "${businessContext.business_name}".` : ""}
${businessContext?.industry ? `Industry: ${businessContext.industry}.` : ""}
${businessContext?.goal ? `Growth Goal: ${businessContext.goal}.` : ""}
Speak naturally, warmly, energetically, and concisely in 2 to 3 practical, spoken sentences per turn. Never output markdown asterisks or bullet points.`;

    const pipeline = new VixoraVoicePipeline(
      {
        voiceName: "Aoede",
        silenceTimeoutMs: 1200,
        continuous: true,
        lang: "en-US",
        systemPrompt: coachSystemPrompt,
        businessContext: businessContext,
      },
      {
        onStateChange: (s) => setStatus(s),
        onInterimTranscript: (t) => {
          onInterimText?.(t);
        },
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

    pipelineRef.current = pipeline;
    const ok = await pipeline.start();
    if (ok) {
      setActive(true);
      toast.success("Voice Coach active — speak naturally with your coach");
    } else {
      setActive(false);
      setStatus("idle");
    }
  };

  const stop = () => {
    onInterimText?.("");
    if (pipelineRef.current) {
      pipelineRef.current.stop();
      pipelineRef.current = null;
    }
    setActive(false);
    setStatus("idle");
  };

  const handleToggle = () => {
    // If AI is currently speaking, clicking the mic interrupts immediately and listens
    if (active && status === "speaking") {
      if (pipelineRef.current) {
        pipelineRef.current.interrupt();
      }
      return;
    }

    if (active) {
      stop();
    } else {
      start();
    }
  };

  // Compute status labels & visual styles
  const getButtonConfig = () => {
    switch (status) {
      case "listening":
        return {
          label: "Listening…",
          variant: "destructive" as const,
          icon: <span className="relative flex h-3 w-3 mr-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>,
          className: "bg-red-600 hover:bg-red-700 text-white font-extrabold shadow-md",
        };
      case "transcribing":
      case "processing":
        return {
          label: "Thinking…",
          variant: "secondary" as const,
          icon: <Loader2 className="h-4 w-4 animate-spin text-primary mr-1" />,
          className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30",
        };
      case "speaking":
        return {
          label: "Speaking… (Tap to interrupt)",
          variant: "secondary" as const,
          icon: <Volume2 className="h-4 w-4 text-emerald-500 animate-bounce mr-1" />,
          className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30 animate-pulse",
        };
      case "mic-denied":
      case "error":
        return {
          label: "Mic Error",
          variant: "outline" as const,
          icon: <AlertCircle className="h-4 w-4 text-red-500 mr-1" />,
          className: "border-red-400 text-red-600",
        };
      default:
        return {
          label: "Voice Coach",
          variant: "outline" as const,
          icon: <Mic className="h-4 w-4 text-primary mr-1" />,
          className: "hover:border-primary/50 hover:bg-primary/5 font-bold transition-all text-foreground",
        };
    }
  };

  const config = getButtonConfig();

  return (
    <Button
      type="button"
      onClick={handleToggle}
      variant={config.variant}
      size="sm"
      className={`rounded-2xl h-11 px-3.5 gap-1 text-xs shrink-0 transition-all ${config.className}`}
      title={
        active
          ? status === "speaking"
            ? "AI is speaking. Tap to interrupt and speak."
            : "Tap to stop voice coach"
          : "Tap to have a natural spoken conversation with your AI Business Coach"
      }
    >
      {config.icon}
      <span className="hidden sm:inline">{config.label}</span>
      {active && status !== "speaking" && status !== "processing" && (
        <MicOff className="h-3.5 w-3.5 opacity-60 ml-0.5" />
      )}
    </Button>
  );
}
