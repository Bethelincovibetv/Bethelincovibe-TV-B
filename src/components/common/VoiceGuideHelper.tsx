import React, { useState, useEffect } from "react";
import { Volume2, VolumeX, Sparkles, HelpCircle, Play, Pause, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VoiceGuideHelperProps {
  title?: string;
  explanation: string;
  simpleTip?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "badge" | "icon" | "card";
}

/**
 * Interactive voice synthesis audio guide.
 * Explains form sections and tasks with maximum clarity as if explaining simply to a beginner.
 */
export default function VoiceGuideHelper({
  title,
  explanation,
  simpleTip,
  size = "sm",
  className = "",
  variant = "badge",
}: VoiceGuideHelperProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
    }
  }, []);

  const handleToggleSpeak = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel(); // Stop any pending utterance

    const textToSpeak = `${title ? title + ". " : ""}${explanation}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.95; // Slightly slower, calm and very clear
    utterance.pitch = 1.05;

    // Pick best available natural voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice =
      voices.find((v) => v.lang.includes("en-NG")) ||
      voices.find((v) => v.lang.includes("en-GB") && v.name.includes("Female")) ||
      voices.find((v) => v.lang.includes("en-US") && (v.name.includes("Google") || v.name.includes("Natural"))) ||
      voices.find((v) => v.lang.startsWith("en"));

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  if (!supported) return null;

  if (variant === "icon") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleToggleSpeak}
              className={`inline-flex items-center justify-center rounded-full p-1 transition-all ${
                isPlaying
                  ? "bg-amber-500 text-white animate-pulse shadow-md"
                  : "bg-primary/10 hover:bg-primary/20 text-primary"
              } ${className}`}
              aria-label="Listen to voice explanation"
            >
              {isPlaying ? (
                <Volume2 className="h-3.5 w-3.5 text-current animate-bounce" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-current" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs font-normal">
            <p className="font-bold text-foreground mb-0.5">🔊 Voice Explanation</p>
            <p className="text-muted-foreground">{explanation}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={`p-3 rounded-2xl border bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent border-amber-500/20 flex items-start gap-3 ${className}`}
      >
        <div
          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all ${
            isPlaying ? "bg-amber-500 text-white animate-pulse" : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
          }`}
        >
          <Volume2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          {title && <p className="text-xs font-bold text-foreground flex items-center gap-1.5">{title}</p>}
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{explanation}</p>
          {simpleTip && (
            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 mt-1 bg-amber-500/10 px-2 py-0.5 rounded-md inline-block">
              💡 Simple rule: {simpleTip}
            </p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant={isPlaying ? "default" : "secondary"}
          onClick={handleToggleSpeak}
          className="shrink-0 h-8 text-xs font-bold gap-1 rounded-xl"
        >
          {isPlaying ? (
            <>
              <Pause className="h-3.5 w-3.5 text-white" /> Stop Voice
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 text-primary" /> Listen
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggleSpeak}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border shadow-2xs ${
        isPlaying
          ? "bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-400/50 animate-pulse"
          : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30"
      } ${className}`}
      title="Click to hear a very simple explanation"
    >
      <Volume2 className={`h-3.5 w-3.5 ${isPlaying ? "animate-bounce text-white" : "text-amber-600 dark:text-amber-400"}`} />
      <span>{isPlaying ? "Speaking..." : "Listen: How it works"}</span>
    </button>
  );
}
