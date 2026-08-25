import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Volume2,
  Play,
  Square,
  Sparkles,
  Sliders,
  CheckCircle2,
  Download,
  RotateCcw,
  Radio,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { VOICE_CATALOG } from "../constants";
import { sfx } from "../sfxLibrary";

interface VoiceoverReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  script: string;
  onScriptChange: (newScript: string) => void;
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
}

export default function VoiceoverReviewModal({
  open,
  onOpenChange,
  script,
  onScriptChange,
  selectedVoice,
  onVoiceChange,
}: VoiceoverReviewModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1);
  const [pitch, setPitch] = useState<number>(1.05);
  const [rate, setRate] = useState<number>(1.02);
  const [volume, setVolume] = useState<number>(1.0);
  const [waveBars, setWaveBars] = useState<number[]>([15, 25, 40, 60, 30, 20, 50, 45, 30, 15]);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const animationIntervalRef = useRef<any>(null);

  const persona = VOICE_CATALOG.find((v) => v.id === selectedVoice) || VOICE_CATALOG[0];

  // Set default pitch and rate based on chosen voice persona
  useEffect(() => {
    if (persona) {
      setPitch(persona.pitch || 1.0);
      setRate(persona.rate || 1.0);
    }
  }, [selectedVoice, persona]);

  // Clean up speech on close
  useEffect(() => {
    if (!open) {
      stopVoiceover();
    }
    return () => {
      stopVoiceover();
    };
  }, [open]);

  const words = script.trim() ? script.trim().split(/\s+/) : [];

  const startVoiceover = () => {
    if (!script.trim()) {
      toast.error("Please provide a script to review.");
      return;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(script);
      utter.pitch = pitch;
      utter.rate = rate;
      utter.volume = volume;

      // Handle voice accents if available
      const voices = window.speechSynthesis.getVoices();
      if (selectedVoice === "Kore") {
        // Look for Nigerian or British/Warm female English voice
        const ngVoice = voices.find((v) => v.lang.includes("en-NG") || v.name.toLowerCase().includes("nigeria") || v.lang.includes("en-GB"));
        if (ngVoice) utter.voice = ngVoice;
      } else if (selectedVoice === "Aoede") {
        const studioVoice = voices.find((v) => v.lang.includes("en-US") && v.name.toLowerCase().includes("female"));
        if (studioVoice) utter.voice = studioVoice;
      }

      utter.onboundary = (event) => {
        if (event.name === "word") {
          const charIndex = event.charIndex;
          const textBefore = script.slice(0, charIndex);
          const wordCount = textBefore.trim().split(/\s+/).length - 1;
          setCurrentWordIndex(Math.max(0, wordCount));
        }
      };

      utter.onstart = () => {
        setIsPlaying(true);
        sfx.playWhoosh(0.3);
        // Start animated audio wave
        animationIntervalRef.current = setInterval(() => {
          setWaveBars(Array.from({ length: 12 }, () => Math.floor(Math.random() * 55) + 10));
        }, 120);
      };

      utter.onend = () => {
        stopVoiceover();
      };

      utter.onerror = () => {
        stopVoiceover();
      };

      utteranceRef.current = utter;
      window.speechSynthesis.speak(utter);
    } else {
      toast.error("Speech synthesis is not supported on this device.");
    }
  };

  const stopVoiceover = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    setIsPlaying(false);
    setCurrentWordIndex(-1);
    setWaveBars([10, 15, 20, 15, 10, 15, 20, 15, 10, 15]);
  };

  const handleInsertPhrase = (phrase: string) => {
    onScriptChange(script ? `${script} ${phrase}` : phrase);
    toast.success("Added Nigerian marketing hook to script!");
    sfx.playPop(0.3);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-card">
        {/* Header */}
        <DialogHeader className="p-5 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md">
                <Volume2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>AI Voiceover Review & Soundstage</span>
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30 text-[10px] font-bold">
                    Studio Audition
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Audition natural pronunciation, adjust playback speed and pitch, and sync speech for your video.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Persona Selection & Radar Wave */}
          <div className="p-4 rounded-2xl border border-border/80 bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left w-full sm:w-auto">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h4 className="text-sm font-bold text-foreground">{persona.name}</h4>
                <Badge className="text-[10px] font-bold bg-primary text-primary-foreground py-0">
                  {persona.tag || "Active"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{persona.description}</p>
            </div>

            {/* Visualizer Waves */}
            <div className="flex items-center gap-1.5 h-12 px-4 py-2 bg-background/80 rounded-xl border border-border/60">
              {waveBars.map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${isPlaying ? h : 8}px` }}
                  className={`w-1.5 rounded-full transition-all duration-100 ${
                    isPlaying
                      ? "bg-gradient-to-t from-orange-500 to-amber-400"
                      : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Script Word Tracker Area */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <Label className="text-xs font-bold text-foreground">Narrative Voiceover Script</Label>
              <span className="text-muted-foreground">{words.length} words (~{Math.ceil(words.length / 2.5)} sec)</span>
            </div>

            <Textarea
              value={script}
              onChange={(e) => onScriptChange(e.target.value)}
              rows={4}
              className="text-xs leading-relaxed font-mono rounded-xl resize-y"
              placeholder="Type or generate your voiceover narrative..."
            />

            {/* Highlighted Spoken Preview during playback */}
            {isPlaying && (
              <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 text-xs leading-relaxed animate-in fade-in">
                <span className="font-bold text-[11px] text-orange-600 block mb-1">Live Audio Sync:</span>
                <p className="text-foreground">
                  {words.map((w, idx) => (
                    <span
                      key={idx}
                      className={`inline-block mr-1 rounded px-1 transition-colors ${
                        idx === currentWordIndex
                          ? "bg-orange-500 text-white font-bold scale-105"
                          : idx < currentWordIndex
                          ? "text-muted-foreground"
                          : "text-foreground font-medium"
                      }`}
                    >
                      {w}
                    </span>
                  ))}
                </p>
              </div>
            )}
          </div>

          {/* Voice Tuning Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl border border-border/60 bg-muted/20">
            {/* Voice Select */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">Voice Persona</Label>
              <Select value={selectedVoice} onValueChange={(v) => onVoiceChange(v)}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICE_CATALOG.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-xs">
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pitch */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-muted-foreground">Voice Pitch</span>
                <span>{pitch.toFixed(2)}x</span>
              </div>
              <Slider
                value={[pitch]}
                min={0.7}
                max={1.4}
                step={0.05}
                onValueChange={(val) => setPitch(val[0])}
                className="py-1"
              />
            </div>

            {/* Rate / Speed */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-muted-foreground">Pace & Speed</span>
                <span>{rate.toFixed(2)}x</span>
              </div>
              <Slider
                value={[rate]}
                min={0.75}
                max={1.4}
                step={0.05}
                onValueChange={(val) => setRate(val[0])}
                className="py-1"
              />
            </div>
          </div>

          {/* Quick Viral Nigerian Hooks */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-orange-500" />
              <span>Quick Nigerian Commercial Hooks (Click to append):</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                "Oya, let's dive straight in!",
                "Stop wasting money on marketing that doesn't convert.",
                "Here is the exact blueprint to double your profit in Naira.",
                "Zero stories, 100% execution. Take action today!",
                "Send a WhatsApp DM now to claim your exclusive discount.",
              ].map((phrase, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleInsertPhrase(phrase)}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-colors font-medium text-left"
                >
                  + "{phrase.slice(0, 35)}..."
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border/60 bg-muted/30 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setPitch(persona.pitch || 1.0);
              setRate(persona.rate || 1.0);
              toast.info("Reset voice parameters to persona default");
            }}
            className="rounded-xl text-xs font-semibold gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Tone</span>
          </Button>

          <div className="flex items-center gap-2">
            {isPlaying ? (
              <Button
                type="button"
                variant="destructive"
                onClick={stopVoiceover}
                className="h-10 px-5 rounded-xl font-bold text-xs gap-2"
              >
                <Square className="h-4 w-4 fill-current" />
                <span>Stop Audio</span>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={startVoiceover}
                className="h-10 px-6 rounded-xl font-bold text-xs bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md gap-2"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Audition Voiceover</span>
              </Button>
            )}

            <Button
              type="button"
              variant="default"
              onClick={() => {
                stopVoiceover();
                onOpenChange(false);
                toast.success("Voiceover configuration applied to studio!");
              }}
              className="h-10 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              <span>Apply to Video</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
