import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wand2,
  Sparkles,
  Layers,
  Volume2,
  Copy,
  Check,
  Zap,
  Clock,
  Play,
  RotateCcw,
  ArrowRight,
  Film,
  Send,
  Loader2,
  CheckCircle2,
  Sliders,
  Flame,
  Radio,
  Music,
  Share2,
  Lightbulb,
  Target,
  FileEdit,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateVixoraScript,
  VideoDuration,
  ScriptBeat,
  DEFAULT_SFX_LIST,
  playSfxSample,
  DEFAULT_MUSIC_TRACKS,
} from "@/lib/vixoraStudioApi";

interface AIGeneratorActionsProps {
  initialTopic?: string;
  initialDuration?: VideoDuration;
  initialNiche?: string;
  initialTone?: string;
  onApplyScript?: (data: {
    script: string;
    beats: ScriptBeat[];
    suggestedMood?: string;
    topic: string;
    title?: string;
  }) => void;
  onDirectRender?: (data: {
    script: string;
    beats: ScriptBeat[];
    topic: string;
    duration: VideoDuration;
    niche: string;
    tone: string;
  }) => void;
  className?: string;
  compact?: boolean;
}

const VIRAL_NICHES = [
  { id: "general", label: "General Business" },
  { id: "ecommerce", label: "E-Commerce & Flash Sale" },
  { id: "realestate", label: "Real Estate & Luxury Homes" },
  { id: "finance", label: "Fintech & Wealth" },
  { id: "food", label: "Food & Restaurants" },
  { id: "fashion", label: "Fashion & Lifestyle" },
  { id: "tech", label: "Tech, SaaS & AI" },
];

const VIRAL_TONES = [
  { id: "energetic", label: "🔥 Energetic & High Conversion" },
  { id: "urgent", label: "⚡ Urgent Flash Sale & FOMO" },
  { id: "luxury", label: "✨ Luxury, Premium & Exclusive" },
  { id: "professional", label: "💼 Professional & Authoritative" },
  { id: "humorous", label: "😂 Relatable, Punchy & Casual" },
  { id: "storytelling", label: "📖 Inspirational Storytelling" },
];

const QUICK_INSPIRATION_TEMPLATES = [
  {
    title: "Lekki Phase 1 Luxury Penthouse",
    topic: "Promote a newly finished 4-bedroom smart penthouse in Lekki Phase 1 Lagos with ocean views, 24/7 solar power, and 20% discount for early buyers.",
    niche: "realestate",
    tone: "luxury",
    duration: "30s" as VideoDuration,
  },
  {
    title: "Weekend 50% Flash Sale",
    topic: "Exciting 48-hour flash sale for our boutique store with 50% off African luxury fabrics, shoes, and instant same-day delivery in Lagos and Abuja.",
    niche: "ecommerce",
    tone: "urgent",
    duration: "15s" as VideoDuration,
  },
  {
    title: "Fintech 0% Transfer Fee Launch",
    topic: "Introducing our next-gen payment app that lets Nigerian freelancers receive dollars and pounds with zero hidden fees and instant bank settlement.",
    niche: "finance",
    tone: "energetic",
    duration: "30s" as VideoDuration,
  },
  {
    title: "Victoria Island Suya & Cocktail Night",
    topic: "Friday night special featuring sizzling gourmet Suya, signature Chapman cocktails, and live Afrobeats DJ at our Victoria Island lounge.",
    niche: "food",
    tone: "energetic",
    duration: "15s" as VideoDuration,
  },
];

export default function AIGeneratorActions({
  initialTopic = "",
  initialDuration = "15s",
  initialNiche = "general",
  initialTone = "energetic",
  onApplyScript,
  onDirectRender,
  className = "",
  compact = false,
}: AIGeneratorActionsProps) {
  const [topic, setTopic] = useState(initialTopic);
  const [duration, setDuration] = useState<VideoDuration>(initialDuration);
  const [niche, setNiche] = useState(initialNiche);
  const [tone, setTone] = useState(initialTone);
  const [targetAudience, setTargetAudience] = useState("TikTok, Instagram & YouTube Shoppers");

  // Output State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [generatedScript, setGeneratedScript] = useState("");
  const [scriptBeats, setScriptBeats] = useState<ScriptBeat[]>([]);
  const [suggestedMood, setSuggestedMood] = useState("motivational");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"generator" | "beats" | "polish">("generator");

  // Quick Hook Options
  const [hookOptions, setHookOptions] = useState<string[]>([]);
  const [selectedHookIndex, setSelectedHookIndex] = useState<number | null>(null);

  // Audio Playback
  const [playingSfx, setPlayingSfx] = useState<string | null>(null);

  // Main Script Generation Call -> POST /api/public/v1/scripts/generate
  const handleGenerateScript = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a video concept or campaign topic first.");
      return;
    }

    setIsGenerating(true);
    try {
      toast.info("Connecting to Vixora AI Script Engine (POST /api/public/v1/scripts/generate)...");

      const response = await generateVixoraScript({
        topic: topic.trim(),
        duration,
        niche,
        tone,
      });

      if (response.ok && response.script) {
        setGeneratedScript(response.script);
        setScriptBeats(response.beats || []);
        if (response.suggested_music_mood) {
          setSuggestedMood(response.suggested_music_mood);
        }

        // Generate 3 alternate viral hook lines from the prompt
        const hook1 = `Stop scrolling! If you're looking for ${topic.slice(0, 40)}... you need to see this!`;
        const hook2 = `Nobody is telling you the real secret about ${topic.slice(0, 35)}... until now!`;
        const hook3 = `Here is why thousands of businesses are switching to this right now in 2026!`;
        setHookOptions([hook1, hook2, hook3]);

        toast.success(`Generated viral script with ${response.beats?.length || 3} scene beats!`);
        setActiveTab("beats");

        // Notify parent if available
        onApplyScript?.({
          script: response.script,
          beats: response.beats || [],
          suggestedMood: response.suggested_music_mood,
          topic: topic.trim(),
          title: topic.slice(0, 45),
        });
      } else {
        throw new Error(response.error || "Failed to generate script");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to connect to script engine.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Quick Hook Selector
  const handleSelectHook = (hook: string, index: number) => {
    setSelectedHookIndex(index);
    if (!generatedScript) {
      setGeneratedScript(`${hook}\n\n${topic}`);
    } else {
      // Replace first sentence with new hook
      const lines = generatedScript.split("\n");
      lines[0] = hook;
      const updated = lines.join("\n");
      setGeneratedScript(updated);
      toast.success("Applied new viral opening hook!");
    }
  };

  // Quick Tone Polishing Actions
  const handlePolishTone = async (modifier: "urgent" | "humorous" | "luxury" | "pidgin") => {
    if (!generatedScript.trim()) {
      toast.error("Please generate a script first to apply AI styling.");
      return;
    }

    setIsPolishing(true);
    try {
      let promptModifier = "";
      if (modifier === "urgent") promptModifier = "Rewrite this video script to be 10x more urgent with heavy FOMO, flash sale energy, and immediate call to action:";
      if (modifier === "humorous") promptModifier = "Rewrite this video script with witty, relatable, and hilarious punchlines for Nigerian youth audience:";
      if (modifier === "luxury") promptModifier = "Rewrite this video script with ultra-high-end luxury, prestigious, and sophisticated vocabulary:";
      if (modifier === "pidgin") promptModifier = "Rewrite this video script with energetic Nigerian Pidgin English and relatable street slang for maximum engagement:";

      const response = await generateVixoraScript({
        topic: `${promptModifier}\n\n${generatedScript}`,
        duration,
        niche,
        tone: modifier,
      });

      if (response.ok && response.script) {
        setGeneratedScript(response.script);
        if (response.beats && response.beats.length > 0) {
          setScriptBeats(response.beats);
        }
        toast.success(`Polished script with ${modifier.toUpperCase()} style!`);
      }
    } catch (e: any) {
      toast.error("Could not polish script.");
    } finally {
      setIsPolishing(false);
    }
  };

  // Audio SFX Preview
  const handleAuditionSfx = (cueName: string) => {
    setPlayingSfx(cueName);
    playSfxSample(cueName);
    setTimeout(() => setPlayingSfx(null), 1200);
  };

  const handleCopyScript = () => {
    if (!generatedScript) return;
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    toast.success("Script copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToStudio = () => {
    if (!generatedScript.trim()) {
      toast.error("Please generate a script before applying.");
      return;
    }

    onApplyScript?.({
      script: generatedScript,
      beats: scriptBeats,
      suggestedMood,
      topic,
      title: topic.slice(0, 45) || "AI Marketing Video",
    });

    toast.success("Script & Scene Beats synced into Video Creator Studio!");
  };

  const handleTriggerDirectRender = () => {
    if (!generatedScript.trim()) {
      toast.error("Please generate a script first.");
      return;
    }

    onDirectRender?.({
      script: generatedScript,
      beats: scriptBeats,
      topic,
      duration,
      niche,
      tone,
    });
  };

  // Word count & duration estimate
  const wordCount = generatedScript.trim() ? generatedScript.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.round(wordCount / 2.5); // ~150 words per minute = 2.5 wps

  return (
    <div className={`space-y-4 ${className}`}>
      <Card className="border-purple-500/30 bg-gradient-to-br from-card via-purple-500/5 to-card shadow-lg">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-purple-600 text-white shadow-md">
                  <Wand2 className="h-4 w-4" />
                </div>
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-1.5">
                  Vixora AI Script & Scene Beats Generator
                  <Badge className="bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-500/30 text-[10px]">
                    POST /api/public/v1/scripts/generate
                  </Badge>
                </CardTitle>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Generate high-converting viral hooks, timed scene beats, visual keyword prompts, and SFX cues before video rendering.
              </CardDescription>
            </div>

            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-auto">
              <TabsList className="h-8 bg-secondary/80 text-xs">
                <TabsTrigger value="generator" className="text-xs font-bold gap-1 px-2.5">
                  <Sparkles className="h-3 w-3 text-purple-500" /> Prompt
                </TabsTrigger>
                <TabsTrigger value="beats" className="text-xs font-bold gap-1 px-2.5">
                  <Layers className="h-3 w-3 text-purple-500" /> Beats ({scriptBeats.length})
                </TabsTrigger>
                <TabsTrigger value="polish" className="text-xs font-bold gap-1 px-2.5">
                  <Flame className="h-3 w-3 text-purple-500" /> Viral Polish
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {/* TAB 1: SCRIPT PROMPT & GENERATION PARAMS */}
          {activeTab === "generator" && (
            <div className="space-y-4">
              {/* Concept Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> Video Concept / Campaign Goal
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Target: <span className="font-semibold text-foreground">{targetAudience}</span>
                  </span>
                </div>
                <Textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Describe your product, offer, real estate listing, food special, or tech announcement..."
                  rows={3}
                  className="text-sm font-medium resize-none"
                />
              </div>

              {/* Inspiration Chips */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Zap className="h-3 w-3 text-amber-500" /> Quick Campaign Presets:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_INSPIRATION_TEMPLATES.map((t) => (
                    <button
                      key={t.title}
                      type="button"
                      onClick={() => {
                        setTopic(t.topic);
                        setNiche(t.niche);
                        setTone(t.tone);
                        setDuration(t.duration);
                        toast.info(`Loaded "${t.title}" preset`);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-purple-500/10 hover:text-purple-600 border border-border/70 transition-colors"
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t">
                {/* Target Niche */}
                <div>
                  <Label className="text-xs font-bold">Niche / Industry</Label>
                  <select
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    className="w-full h-9 rounded-lg border bg-background px-2.5 text-xs font-medium mt-1"
                  >
                    {VIRAL_NICHES.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tone */}
                <div>
                  <Label className="text-xs font-bold">Tone & Style</Label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full h-9 rounded-lg border bg-background px-2.5 text-xs font-medium mt-1"
                  >
                    {VIRAL_TONES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <Label className="text-xs font-bold">Target Clip Length</Label>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    {(["15s", "30s", "60s"] as VideoDuration[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDuration(d)}
                        className={`h-9 rounded-lg border text-xs font-bold transition-all ${
                          duration === d
                            ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                            : "bg-secondary/70 hover:bg-secondary text-foreground"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Ready for AI generation & neural voice synthesis</span>
                </div>

                <Button
                  onClick={handleGenerateScript}
                  disabled={isGenerating || !topic.trim()}
                  className="font-bold text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white shadow-md gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Synthesizing Script...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" /> Generate Script & Scene Beats
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: SCENE BEATS BREAKDOWN & SFX TIMELINE */}
          {activeTab === "beats" && (
            <div className="space-y-4">
              {/* Script Textarea & Timing Stats */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <FileEdit className="h-3.5 w-3.5 text-purple-600" /> Spoken Voiceover Narration
                  </Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {wordCount} words (~{estimatedSeconds}s audio)
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyScript}
                      className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>

                <Textarea
                  value={generatedScript}
                  onChange={(e) => setGeneratedScript(e.target.value)}
                  placeholder="Generated voiceover narration will appear here. You can also edit it directly..."
                  rows={4}
                  className="text-sm font-mono resize-none leading-relaxed"
                />
              </div>

              {/* Alternate Hook Pickers */}
              {hookOptions.length > 0 && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5 text-amber-500" /> Viral Opening Hooks (3-Second Rule)
                    </span>
                    <span className="text-[10px] text-muted-foreground">Click to replace opening</span>
                  </div>
                  <div className="space-y-1.5">
                    {hookOptions.map((hook, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectHook(hook, idx)}
                        className={`w-full text-left text-xs p-2 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                          selectedHookIndex === idx
                            ? "bg-purple-600 text-white border-purple-600 font-semibold"
                            : "bg-card hover:bg-secondary/80 border-border/80 text-foreground"
                        }`}
                      >
                        <span className="truncate">"{hook}"</span>
                        <span className="shrink-0 text-[10px] font-bold uppercase opacity-80">
                          {selectedHookIndex === idx ? "Applied" : "Select"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Scene Beats Timeline */}
              {scriptBeats.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-purple-600" /> Timed Scene Beats & Audio Cues ({scriptBeats.length} scenes)
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      Suggested Mood: <strong className="text-purple-600 capitalize">{suggestedMood}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {scriptBeats.map((beat, idx) => (
                      <div
                        key={beat.index || idx}
                        className="p-3 rounded-xl bg-card border border-border/80 shadow-xs hover:border-purple-500/40 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <Badge className="bg-purple-600 text-white text-[10px] font-mono">
                            Scene {beat.index || idx + 1} · {beat.suggested_duration || 5}s
                          </Badge>
                          {beat.sfx_cue && (
                            <button
                              type="button"
                              onClick={() => handleAuditionSfx(beat.sfx_cue || "whoosh")}
                              className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline bg-amber-500/10 px-1.5 py-0.5 rounded"
                            >
                              <Volume2 className="h-2.5 w-2.5" />
                              SFX: {beat.sfx_cue}
                            </button>
                          )}
                        </div>

                        <p className="text-xs font-medium text-foreground line-clamp-3 leading-relaxed">
                          "{beat.text}"
                        </p>

                        <div className="pt-1 border-t flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="truncate">
                            🎬 Visual: <code className="text-purple-600 dark:text-purple-300">{beat.visual_search_query}</code>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-dashed text-center text-muted-foreground space-y-2">
                  <Sparkles className="h-6 w-6 mx-auto text-purple-400" />
                  <p className="text-xs">No scene beats generated yet. Click "Generate Script" to create timed scenes.</p>
                </div>
              )}

              {/* Bottom Sync / Render Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendToStudio}
                  className="text-xs font-bold gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Apply to Video Creator
                </Button>

                {onDirectRender && (
                  <Button
                    onClick={handleTriggerDirectRender}
                    className="text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-sm"
                  >
                    <Film className="h-3.5 w-3.5" /> Render Video Directly
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: VIRAL POLISHING MODIFIERS */}
          {activeTab === "polish" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold">1-Click Viral Tone Remixer</Label>
                <p className="text-xs text-muted-foreground">
                  Transform your existing script instantly into different high-converting marketing frameworks.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isPolishing || !generatedScript.trim()}
                  onClick={() => handlePolishTone("urgent")}
                  className="p-3 rounded-xl border bg-card hover:bg-purple-500/10 hover:border-purple-500/40 text-left transition-all space-y-1 disabled:opacity-50"
                >
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" /> 10x Urgency & FOMO
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Adds limited time discount cues, ticking clocks, and urgency hooks.
                  </p>
                </button>

                <button
                  type="button"
                  disabled={isPolishing || !generatedScript.trim()}
                  onClick={() => handlePolishTone("pidgin")}
                  className="p-3 rounded-xl border bg-card hover:bg-purple-500/10 hover:border-purple-500/40 text-left transition-all space-y-1 disabled:opacity-50"
                >
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-orange-500" /> Nigerian Street Slang & Pidgin
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    High engagement colloquial style tailored for Lagos & Nigerian TikTok.
                  </p>
                </button>

                <button
                  type="button"
                  disabled={isPolishing || !generatedScript.trim()}
                  onClick={() => handlePolishTone("luxury")}
                  className="p-3 rounded-xl border bg-card hover:bg-purple-500/10 hover:border-purple-500/40 text-left transition-all space-y-1 disabled:opacity-50"
                >
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-500" /> Ultra-Luxury & Prestige
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Elevated vocabulary tailored for real estate, jewelry, and VIP clientele.
                  </p>
                </button>

                <button
                  type="button"
                  disabled={isPolishing || !generatedScript.trim()}
                  onClick={() => handlePolishTone("humorous")}
                  className="p-3 rounded-xl border bg-card hover:bg-purple-500/10 hover:border-purple-500/40 text-left transition-all space-y-1 disabled:opacity-50"
                >
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-yellow-500" /> Relatable & Witty Punch
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Casual, self-aware, and meme-worthy script pacing to maximize watch time.
                  </p>
                </button>
              </div>

              {isPolishing && (
                <div className="flex items-center justify-center gap-2 p-4 text-xs font-semibold text-purple-600 bg-purple-500/10 rounded-xl animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Polishing script with AI neural formatting...
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-2 border-t bg-secondary/20 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono text-[11px]">
            API: <code className="text-purple-600">/api/public/v1/scripts/generate</code>
          </span>
          <span className="font-semibold text-[11px] text-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> AI Video Pipeline Sync Ready
          </span>
        </CardFooter>
      </Card>
    </div>
  );
}
