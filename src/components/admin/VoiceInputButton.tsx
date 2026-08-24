import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Loader2, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VoiceInputButtonProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export default function VoiceInputButton({
  onTranscript,
  className = "",
  disabled = false,
}: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);
  const isStoppingRef = useRef(false);

  // Check SpeechRecognition API availability
  const isSupported =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const startListening = () => {
    if (!isSupported) {
      toast.error("Speech Recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US"; // Excellent recognition for Nigerian & African English accents

      recognition.onstart = () => {
        setIsListening(true);
        isStoppingRef.current = false;
        setInterimText("");
        toast.info("Listening... Speak your command or complex instructions now.");
      };

      recognition.onresult = (event: any) => {
        let currentInterim = "";
        let finalSegment = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalSegment += transcriptPiece;
          } else {
            currentInterim += transcriptPiece;
          }
        }

        if (finalSegment) {
          onTranscript(finalSegment.trim(), true);
          setInterimText("");
        } else if (currentInterim) {
          setInterimText(currentInterim);
          onTranscript(currentInterim.trim(), false);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          toast.error("Microphone access was denied. Please allow microphone permissions.");
          setIsListening(false);
        } else if (event.error === "no-speech") {
          // Keep listening or allow timeout
        } else if (event.error !== "aborted") {
          toast.error(`Voice error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        if (!isStoppingRef.current && isListening) {
          // If ended unexpectedly, restart if still supposed to listen
          try {
            recognition.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
          setInterimText("");
        }
      };

      recognition.start();
    } catch (err: any) {
      toast.error("Could not start voice recognition: " + err.message);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    isStoppingRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setInterimText("");
    toast.success("Voice recording captured.");
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <Button
        type="button"
        size="icon"
        variant={isListening ? "default" : "outline"}
        onClick={toggleListening}
        disabled={disabled}
        title={isListening ? "Stop Voice Input" : "Click to Speak (Voice-to-Text)"}
        className={`relative h-11 w-11 rounded-xl transition-all duration-300 ${
          isListening
            ? "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/30 ring-4 ring-rose-500/30 animate-pulse"
            : "border-border hover:bg-primary/10 hover:text-primary"
        } ${className}`}
      >
        {isListening ? (
          <div className="relative flex items-center justify-center">
            <Mic className="h-5 w-5 text-white animate-bounce" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
          </div>
        ) : (
          <Mic className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        )}
      </Button>

      {/* Floating active speech indicator */}
      {isListening && (
        <div className="absolute bottom-14 right-0 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/95 text-white border border-rose-500/40 shadow-xl backdrop-blur-md text-xs whitespace-nowrap animate-in fade-in slide-in-from-bottom-2">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
          <span className="font-extrabold text-[11px] text-rose-300">Listening to your voice…</span>
          <div className="flex items-center gap-0.5 ml-1 h-3">
            <span className="w-0.5 h-2 bg-rose-400 animate-pulse" />
            <span className="w-0.5 h-3 bg-rose-400 animate-pulse delay-75" />
            <span className="w-0.5 h-1.5 bg-rose-400 animate-pulse delay-150" />
            <span className="w-0.5 h-3.5 bg-rose-400 animate-pulse delay-100" />
          </div>
        </div>
      )}
    </div>
  );
}
