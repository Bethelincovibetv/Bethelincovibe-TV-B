import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Loader2, Sparkles, Volume2, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VoiceInputButtonProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  onOpenLiveAgent?: () => void;
  className?: string;
  disabled?: boolean;
}

export default function VoiceInputButton({
  onTranscript,
  onOpenLiveAgent,
  className = "",
  disabled = false,
}: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [activeSpeechDetected, setActiveSpeechDetected] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const isStoppingRef = useRef(false);
  const silenceTimerRef = useRef<any>(null);
  const accumulatedTextRef = useRef<string>("");

  // Check SpeechRecognition API availability
  const isSupported =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    
    // Auto-detect when user finishes talking after 1.5s of silence
    silenceTimerRef.current = setTimeout(() => {
      if (isListening && accumulatedTextRef.current.trim().length > 3) {
        // User stopped talking, auto-finalize speech input
        stopListening(true);
      }
    }, 1500);
  };

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
      recognition.lang = "en-US";

      accumulatedTextRef.current = "";

      recognition.onstart = () => {
        setIsListening(true);
        isStoppingRef.current = false;
        setActiveSpeechDetected(false);
        setInterimText("");
        toast.info("Listening... Speak instructions (will auto-submit when you pause).");
      };

      recognition.onresult = (event: any) => {
        setActiveSpeechDetected(true);
        let currentInterim = "";
        let finalSegment = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalSegment += " " + transcriptPiece;
          } else {
            currentInterim += " " + transcriptPiece;
          }
        }

        if (finalSegment.trim()) {
          accumulatedTextRef.current = (accumulatedTextRef.current + " " + finalSegment).trim();
          onTranscript(accumulatedTextRef.current, true);
          setInterimText("");
        }

        if (currentInterim.trim()) {
          setInterimText(currentInterim.trim());
          const preview = (accumulatedTextRef.current + " " + currentInterim).trim();
          onTranscript(preview, false);
        }

        // Intelligently reset pause detection window
        resetSilenceTimer();
      };

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed") {
          toast.error("Microphone access was denied. Please allow microphone permissions.");
          setIsListening(false);
        } else if (event.error === "no-speech") {
          // Keep listening
        } else if (event.error !== "aborted") {
          console.warn("Speech recognition notice:", event.error);
        }
      };

      recognition.onend = () => {
        if (!isStoppingRef.current && isListening) {
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

  const stopListening = (autoPaused = false) => {
    isStoppingRef.current = true;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setInterimText("");
    
    if (autoPaused) {
      toast.success("Voice input captured (intelligent pause detected).");
    } else {
      toast.success("Voice recording captured.");
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <Button
        type="button"
        size="icon"
        variant={isListening ? "default" : "outline"}
        onClick={toggleListening}
        disabled={disabled}
        title={isListening ? "Listening... (Stops when you pause or click)" : "Click to Speak (Real-Time Voice Recognition & VAD)"}
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

      {onOpenLiveAgent && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onOpenLiveAgent}
          disabled={disabled}
          title="Open Google Live Voice Agent (Google Kore Voice & Auto Reply)"
          className="hidden sm:flex h-11 px-3 rounded-xl border-primary/30 bg-primary/5 hover:bg-primary/15 text-primary text-xs font-black gap-1.5 items-center shadow-xs"
        >
          <Radio className="h-4 w-4 animate-pulse text-amber-500" />
          <span>Live Voice</span>
        </Button>
      )}

      {/* Floating active speech indicator */}
      {isListening && (
        <div className="absolute bottom-14 right-0 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/95 text-white border border-rose-500/40 shadow-xl backdrop-blur-md text-xs whitespace-nowrap animate-in fade-in slide-in-from-bottom-2">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
          <span className="font-extrabold text-[11px] text-rose-300">
            {activeSpeechDetected ? "Listening (pause to submit)…" : "Listening for speech…"}
          </span>
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
