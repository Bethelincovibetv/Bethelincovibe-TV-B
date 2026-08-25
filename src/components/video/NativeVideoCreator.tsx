import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Video,
  Sparkles,
  Play,
  RotateCcw,
  Download,
  Share2,
  Copy,
  Check,
  Smartphone,
  Square,
  Monitor,
  Volume2,
  Clock,
  Settings,
  Tv,
  Film,
  Layers,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FolderOpen,
  Plus,
  Wand2,
  ChevronRight,
  ExternalLink,
  Info,
  Globe,
  Radio,
} from "lucide-react";
import {
  createVixoraVideo,
  generateNativeVixoraVideo,
  pollVixoraVideoProgress,
  getVixoraBackendUrl,
  setCustomVixoraBackendUrl,
  isForceNativeEngine,
  setForceNativeEngine,
  getSavedVideosHistory,
  removeSavedVideo,
  VideoAspectRatio,
  VideoDuration,
  VideoVoice,
  VideoJobStatus,
  VixoraProject,
  fetchVixoraProjectsList,
} from "@/lib/vixoraVideoEngine";
import { supabase } from "@/integrations/supabase/client";

const ASPECT_RATIOS: { id: VideoAspectRatio; label: string; ratio: string; icon: any; desc: string }[] = [
  { id: "vertical", label: "Vertical", ratio: "9:16", icon: Smartphone, desc: "TikTok, Instagram Reels & YouTube Shorts" },
  { id: "square", label: "Square", ratio: "1:1", icon: Square, desc: "Instagram & Facebook Feed posts" },
  { id: "horizontal", label: "Horizontal", ratio: "16:9", icon: Monitor, desc: "YouTube, Website Banners & Bethel TV" },
];

const DURATIONS: { id: VideoDuration; label: string; seconds: number; badge?: string }[] = [
  { id: "15s", label: "15s (Snackable)", seconds: 15, badge: "Fastest" },
  { id: "30s", label: "30s (Engaging)", seconds: 30, badge: "Popular" },
  { id: "60s", label: "60s (Comprehensive)", seconds: 60, badge: "Story" },
];

const VOICES: { id: VideoVoice; name: string; gender: string; style: string }[] = [
  { id: "Aoede", name: "Aoede (Google Gemini)", gender: "Female", style: "Melodic, articulate & authoritative" },
  { id: "Charon", name: "Charon (Google Gemini)", gender: "Male", style: "Deep, authoritative & corporate" },
  { id: "Fenrir", name: "Fenrir (Google Gemini)", gender: "Male", style: "Cinematic, rich storytelling" },
  { id: "Kore", name: "Kore (Google Gemini)", gender: "Female", style: "Natural, articulate & warm" },
  { id: "Puck", name: "Puck (Google Gemini)", gender: "Male", style: "Energetic, dynamic & persuasive" },
  { id: "Zephyr", name: "Zephyr (Google Gemini)", gender: "Male", style: "Calm, friendly & informative" },
  { id: "Alloy", name: "Alloy", gender: "Neutral", style: "Crisp & balanced commercial" },
  { id: "Shimmer", name: "Shimmer", gender: "Female", style: "Bright, engaging & upbeat" },
];

const PROMPT_TEMPLATES = [
  {
    title: "Lagos Real Estate Spotlight",
    prompt: "A high-converting promotional video showcasing luxury apartments in Lekki Phase 1 with waterfront views and smart home amenities.",
    style: "Cinematic Real Estate",
  },
  {
    title: "E-commerce Flash Sale Reel",
    prompt: "Exciting 30-second promotional short announcing a 50% discount flash sale on authentic African fashion and shoes in Lagos.",
    style: "Dynamic Commercial",
  },
  {
    title: "Tech Startup Explainer",
    prompt: "An energetic startup pitch explaining how our automated fintech app solves cross-border payments for Nigerian businesses.",
    style: "Modern SaaS",
  },
  {
    title: "Lagos Restaurant & Food Showcase",
    prompt: "Mouth-watering video reel highlighting spicy Jollof rice, grilled Suya, and cocktail happy hour at our Victoria Island lounge.",
    style: "Vibrant Foodie",
  },
];

interface NativeVideoCreatorProps {
  initialTopic?: string;
  onVideoCreated?: (video: VideoJobStatus) => void;
  className?: string;
  compact?: boolean;
}

export default function NativeVideoCreator({
  initialTopic = "",
  onVideoCreated,
  className = "",
  compact = false,
}: NativeVideoCreatorProps) {
  const { user } = useAuth();

  // Form State
  const [mode, setMode] = useState<"prompt" | "script">("prompt");
  const [topic, setTopic] = useState(initialTopic);
  const [script, setScript] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [duration, setDuration] = useState<VideoDuration>("15s");
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("vertical");
  const [voice, setVoice] = useState<VideoVoice>("Aoede");
  const [stylePreset, setStylePreset] = useState("Lagos Business Promo");

  // Execution & Progress State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<VideoJobStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Backend Config Dialog State
  const [backendUrl, setBackendUrl] = useState("");
  const [configOpen, setConfigOpen] = useState(false);
  const [tempUrlInput, setTempUrlInput] = useState("");
  const [forceNative, setForceNative] = useState(false);
  const [testingEndpoint, setTestingEndpoint] = useState(false);
  const [endpointStatus, setEndpointStatus] = useState<"idle" | "ok" | "failed" | "frontend_app">("idle");

  // History & Projects Tab
  const [activeTab, setActiveTab] = useState<"create" | "vixora_web" | "library">("create");
  const [videoHistory, setVideoHistory] = useState<VideoJobStatus[]>([]);
  const [projectsList, setProjectsList] = useState<VixoraProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Video Ref for controls
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Load configuration & history on mount
  useEffect(() => {
    (async () => {
      const url = await getVixoraBackendUrl();
      setBackendUrl(url);
      setTempUrlInput(url);
      setForceNative(isForceNativeEngine());
      setVideoHistory(getSavedVideosHistory());
    })();
  }, []);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const projs = await fetchVixoraProjectsList(backendUrl);
      setProjectsList(projs);
    } catch (e) {
      console.warn("Could not fetch projects:", e);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleTestEndpoint = async () => {
    setTestingEndpoint(true);
    setEndpointStatus("idle");
    try {
      const clean = tempUrlInput.trim().replace(/\/+$/, "");
      if (clean.includes("vixora-sepia.vercel.app")) {
        setEndpointStatus("frontend_app");
        toast.info("Vixora Web App detected. Native Engine will be used for flawless rendering.");
        return;
      }

      const res = await fetch(`${clean}/api/public/v1/projects/list`, {
        method: "GET",
        headers: { Accept: "application/json" },
      }).catch(() => null);

      if (res && res.ok) {
        setEndpointStatus("ok");
        toast.success("Connection to custom video backend successful!");
      } else {
        setEndpointStatus("failed");
        toast.error("Custom backend unreachable. Native Engine will handle video generation.");
      }
    } catch (err: any) {
      setEndpointStatus("failed");
      toast.error(err.message || "Failed to reach backend API.");
    } finally {
      setTestingEndpoint(false);
    }
  };

  const handleSaveBackendUrl = () => {
    const clean = tempUrlInput.trim().replace(/\/+$/, "");
    setCustomVixoraBackendUrl(clean);
    setBackendUrl(clean || "https://vixora-sepia.vercel.app");
    setForceNativeEngine(forceNative);
    setConfigOpen(false);
    toast.success("Video creator configuration updated.");
  };

  const handleUseTemplate = (tmpl: (typeof PROMPT_TEMPLATES)[0]) => {
    setTopic(tmpl.prompt);
    setVideoTitle(tmpl.title);
    setStylePreset(tmpl.style);
    toast.info(`Loaded "${tmpl.title}" prompt`);
  };

  // Submit Video Creation Form
  const handleCreateVideo = async (e?: React.FormEvent, forceLocalMode = false) => {
    if (e) e.preventDefault();

    if (mode === "prompt" && !topic.trim()) {
      toast.error("Please enter a video topic or prompt.");
      return;
    }
    if (mode === "script" && !script.trim()) {
      toast.error("Please enter your custom video script.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setJobStatus({
      job_id: "",
      status: "queued",
      progress: 5,
      current_step: "Initializing Vixora AI video rendering engine...",
    });

    const finalTitle =
      videoTitle.trim() ||
      (mode === "prompt"
        ? topic.slice(0, 45) + (topic.length > 45 ? "..." : "")
        : "Custom Script Video");

    const payload = {
      topic: mode === "prompt" ? topic.trim() : undefined,
      script: mode === "script" ? script.trim() : undefined,
      title: finalTitle,
      duration,
      aspect_ratio: aspectRatio,
      voice,
      style: stylePreset,
      user_id: user?.id,
    };

    try {
      let finalVideo: VideoJobStatus;

      if (forceLocalMode) {
        finalVideo = await generateNativeVixoraVideo(payload, (prog) => {
          setJobStatus({ ...prog, title: finalTitle });
        });
      } else {
        finalVideo = await createVixoraVideo(payload, backendUrl, (prog) => {
          setJobStatus({ ...prog, title: finalTitle });
        });
      }

      setJobStatus(finalVideo);
      setCurrentJobId(finalVideo.job_id);
      setVideoHistory(getSavedVideosHistory());
      onVideoCreated?.(finalVideo);
      toast.success("Your video is ready for playback!");
    } catch (err: any) {
      console.warn("Video creation error:", err);
      // Automatic seamless fallback to local native generator
      try {
        toast.info("Switching to Native Studio Engine for immediate rendering...");
        const fallbackVideo = await generateNativeVixoraVideo(payload, (prog) => {
          setJobStatus({ ...prog, title: finalTitle });
        });
        setJobStatus(fallbackVideo);
        setCurrentJobId(fallbackVideo.job_id);
        setVideoHistory(getSavedVideosHistory());
        onVideoCreated?.(fallbackVideo);
        toast.success("Your video has been rendered successfully!");
      } catch (fallbackErr: any) {
        const msg = fallbackErr.message || "Failed to render video.";
        setErrorMsg(msg);
        setJobStatus({
          job_id: currentJobId || "error",
          status: "failed",
          progress: 0,
          error: msg,
        });
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (jobStatus?.video_url) {
      navigator.clipboard.writeText(jobStatus.video_url);
      setCopiedLink(true);
      toast.success("Video URL copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleAddToTvVideos = async () => {
    if (!jobStatus?.video_url) return;
    try {
      const { error } = await supabase.from("tv_videos").insert({
        title: jobStatus.title || "AI Generated Video",
        youtube_url: jobStatus.video_url,
        description: `Created with Vixora Native Video Engine (${duration}, ${aspectRatio})`,
        placement: "both",
        display_order: 0,
        active: true,
      });

      if (error) throw error;
      toast.success("Video added to Bethelincovibe TV playlist!");
    } catch (err: any) {
      toast.error(err.message || "Could not add to TV playlist.");
    }
  };

  const handleReset = () => {
    setJobStatus(null);
    setCurrentJobId(null);
    setErrorMsg(null);
    setIsSubmitting(false);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-600 via-pink-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20 ring-1 ring-white/20">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Native AI Video Creator
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold">
                  Vixora Studio
                </Badge>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Generate high-converting marketing reels, promo clips, and explainers with server-rendered audio & visuals.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & API Settings Trigger */}
        <div className="flex items-center gap-2">
          <Tabs
            value={activeTab}
            onValueChange={(v: any) => {
              setActiveTab(v);
              if (v === "library") loadProjects();
            }}
            className="w-auto"
          >
            <TabsList className="grid grid-cols-3 h-9 p-1">
              <TabsTrigger value="create" className="text-xs font-bold gap-1.5">
                <Wand2 className="h-3.5 w-3.5" /> Studio
              </TabsTrigger>
              <TabsTrigger value="vixora_web" className="text-xs font-bold gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Web App
              </TabsTrigger>
              <TabsTrigger value="library" className="text-xs font-bold gap-1.5">
                <FolderOpen className="h-3.5 w-3.5" /> Library ({videoHistory.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Dialog open={configOpen} onOpenChange={setConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 font-semibold text-xs">
                <Settings className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Engine Settings</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base font-bold">
                  <Settings className="h-4 w-4 text-primary" />
                  Vixora Video Engine Settings
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Configure rendering mode and custom backend endpoints.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Engine Mode Status */}
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-purple-600" /> Vixora AI Video Engine
                    </span>
                    <Badge className="bg-emerald-600 text-white text-[10px]">Live & Active</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Connected to Vixora Cloud API for server-rendered MP4 video generation, Gemini neural narration, and kinetic subtitles.
                  </p>
                </div>

                <div>
                  <Label className="text-xs font-bold">Target Live API Base URL</Label>
                  <Input
                    value={tempUrlInput}
                    onChange={(e) => setTempUrlInput(e.target.value)}
                    placeholder="https://ais-dev-z3gmsn2xsvk2qfmakpvm37-164225214835.europe-west3.run.app"
                    className="font-mono text-xs mt-1"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Default: <code>https://ais-dev-z3gmsn2xsvk2qfmakpvm37-164225214835.europe-west3.run.app</code>
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleTestEndpoint}
                    disabled={testingEndpoint || !tempUrlInput.trim()}
                    className="text-xs gap-1.5"
                  >
                    {testingEndpoint ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Verify Endpoint
                  </Button>

                  {endpointStatus === "frontend_app" && (
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Vixora Online
                    </span>
                  )}
                  {endpointStatus === "ok" && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Live API Connected
                    </span>
                  )}
                  {endpointStatus === "failed" && (
                    <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                      <Info className="h-3.5 w-3.5" /> Native Engine Fallback Ready
                    </span>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" size="sm" onClick={() => setConfigOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveBackendUrl}>
                  Save Settings
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* TAB 1: STUDIO (CREATE & REAL-TIME RENDER) */}
      {activeTab === "create" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: VIDEO FORM (Step 1) */}
          <div className="lg:col-span-7 space-y-5">
            <Card className="border-border/80 shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      1. Video Concept & Script
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Describe your campaign topic or input a complete customized voiceover script.
                    </CardDescription>
                  </div>

                  <div className="flex rounded-lg bg-secondary p-0.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setMode("prompt")}
                      className={`px-3 py-1 rounded-md transition-all ${
                        mode === "prompt"
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      AI Prompt
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("script")}
                      className={`px-3 py-1 rounded-md transition-all ${
                        mode === "script"
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Custom Script
                    </button>
                  </div>
                </div>
              </CardHeader>

              <form onSubmit={(e) => handleCreateVideo(e)}>
                <CardContent className="space-y-4 pt-0">
                  {/* Title */}
                  <div>
                    <Label className="text-xs font-bold">Video Title / Project Name</Label>
                    <Input
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      placeholder="e.g., Lekki Luxury Penthouse Promo"
                      className="mt-1 text-sm"
                    />
                  </div>

                  {/* Mode = Prompt */}
                  {mode === "prompt" ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold">Topic or Video Prompt</Label>
                        <span className="text-[11px] text-muted-foreground">{topic.length}/500</span>
                      </div>
                      <Textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="What do you want to create? e.g., A vibrant 30-second promotional short for a Lagos fashion boutique announcing an upcoming weekend sale with free nationwide shipping..."
                        rows={4}
                        maxLength={500}
                        className="text-sm resize-none"
                      />

                      {/* Quick prompt ideas */}
                      <div className="pt-1">
                        <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                          <Wand2 className="h-3 w-3 text-purple-500" /> Lagos Business Ideas:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {PROMPT_TEMPLATES.map((tmpl) => (
                            <button
                              key={tmpl.title}
                              type="button"
                              onClick={() => handleUseTemplate(tmpl)}
                              className="text-[11px] px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-secondary-foreground border border-border/60 transition-colors text-left"
                            >
                              {tmpl.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Mode = Custom Script */
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold">Exact Voiceover Script</Label>
                        <span className="text-[11px] text-muted-foreground">{script.length}/1000</span>
                      </div>
                      <Textarea
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        placeholder="Enter the exact narration text to be spoken word-for-word in the video..."
                        rows={5}
                        maxLength={1000}
                        className="text-sm resize-none font-mono"
                      />
                    </div>
                  )}

                  {/* Aspect Ratio Cards (Step 1 Requirement) */}
                  <div className="pt-2 border-t space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-primary" /> Aspect Ratio
                    </Label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {ASPECT_RATIOS.map((item) => {
                        const Icon = item.icon;
                        const isSelected = aspectRatio === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setAspectRatio(item.id)}
                            className={`p-3 rounded-xl border text-left flex flex-col items-center text-center transition-all ${
                              isSelected
                                ? "bg-primary/10 border-primary shadow-sm text-primary ring-1 ring-primary/30"
                                : "bg-card hover:bg-secondary/60 border-border/70 text-foreground"
                            }`}
                          >
                            <div
                              className={`p-2 rounded-lg mb-1.5 ${
                                isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-extrabold">{item.label}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{item.ratio}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Duration & Voice Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                    {/* Duration Selection (15s / 30s / 60s) */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" /> Target Duration
                      </Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {DURATIONS.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setDuration(d.id)}
                            className={`py-2 px-1 rounded-lg border text-xs font-bold transition-all text-center ${
                              duration === d.id
                                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                : "bg-secondary/70 hover:bg-secondary text-foreground border-border/60"
                            }`}
                          >
                            {d.id}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Voice Selection */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Volume2 className="h-3.5 w-3.5 text-primary" /> Voiceover Actor
                      </Label>
                      <select
                        value={voice}
                        onChange={(e) => setVoice(e.target.value as VideoVoice)}
                        className="w-full h-9 rounded-lg border bg-background px-2.5 text-xs font-medium focus:ring-1 focus:ring-primary"
                      >
                        {VOICES.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({v.style})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Engine: Vixora Studio Native AI
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="font-bold text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white shadow-md"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rendering Video...
                      </>
                    ) : (
                      <>
                        <Film className="h-4 w-4 mr-2" /> Generate Video Now
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* RIGHT: REAL-TIME PROGRESS & NATIVE VIDEO PLAYER (Steps 2 & 3) */}
          <div className="lg:col-span-5 space-y-5">
            {/* 1. If currently processing / rendering -> Show Real-Time Progress Bar & Steps */}
            {isSubmitting || (jobStatus && jobStatus.status !== "ready" && jobStatus.status !== "failed") ? (
              <Card className="border-purple-500/30 bg-purple-500/5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 animate-pulse" />
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
                    Rendering Video in Real-Time
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Job ID: <code className="font-mono text-purple-600 dark:text-purple-400">{jobStatus?.job_id || currentJobId || "Initializing..."}</code>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Progress Bar (0-100%) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-foreground">Overall Progress</span>
                      <span className="text-purple-600 dark:text-purple-400 font-mono text-sm">{jobStatus?.progress || 10}%</span>
                    </div>
                    <Progress value={jobStatus?.progress || 10} className="h-3 rounded-full bg-secondary" />
                  </div>

                  {/* Current Step */}
                  <div className="p-3 rounded-xl bg-card border border-border/80 space-y-1">
                    <div className="text-[11px] uppercase tracking-wider font-extrabold text-primary flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                      Current Operation
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      {jobStatus?.current_step || "Processing creative prompt and assembling scenes..."}
                    </p>
                  </div>

                  {/* Live Render Stages Checklist */}
                  <div className="space-y-2 pt-2 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {(jobStatus?.progress || 0) >= 20 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-muted-foreground/40 flex items-center justify-center text-[9px]">1</span>
                      )}
                      <span className={(jobStatus?.progress || 0) >= 20 ? "text-foreground font-semibold" : ""}>
                        Script & scene storyboard generation
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      {(jobStatus?.progress || 0) >= 45 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-muted-foreground/40 flex items-center justify-center text-[9px]">2</span>
                      )}
                      <span className={(jobStatus?.progress || 0) >= 45 ? "text-foreground font-semibold" : ""}>
                        Voiceover audio synthesis ({voice} voice)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      {(jobStatus?.progress || 0) >= 70 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-muted-foreground/40 flex items-center justify-center text-[9px]">3</span>
                      )}
                      <span className={(jobStatus?.progress || 0) >= 70 ? "text-foreground font-semibold" : ""}>
                        Visual frame composition & motion fx
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      {(jobStatus?.progress || 0) >= 95 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-muted-foreground/40 flex items-center justify-center text-[9px]">4</span>
                      )}
                      <span className={(jobStatus?.progress || 0) >= 95 ? "text-foreground font-semibold" : ""}>
                        HD video encoding & audio mastering
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : jobStatus?.status === "ready" && jobStatus.video_url ? (
              /* 2. STEP 3: NATIVE VIDEO PLAYER (Status = Ready) */
              <Card className="border-emerald-500/30 shadow-xl overflow-hidden">
                <CardHeader className="bg-emerald-500/10 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      Video Ready For Playback
                    </CardTitle>
                    <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                      {jobStatus.aspect_ratio || aspectRatio}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs truncate">
                    {jobStatus.title || "AI Generated Video Project"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {/* Native HTML5 <video> Element */}
                  <div
                    className={`relative rounded-2xl overflow-hidden bg-black shadow-inner border border-border/80 flex items-center justify-center ${
                      (jobStatus.aspect_ratio || aspectRatio) === "vertical"
                        ? "aspect-[9/16] max-h-[480px] mx-auto"
                        : (jobStatus.aspect_ratio || aspectRatio) === "square"
                        ? "aspect-square max-h-[380px] mx-auto"
                        : "aspect-video w-full"
                    }`}
                  >
                    <video
                      ref={videoRef}
                      src={jobStatus.video_url}
                      poster={jobStatus.thumbnail_url}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-contain rounded-2xl"
                    />
                  </div>

                  {/* Playback Controls & Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="default"
                      size="sm"
                      asChild
                      className="text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                    >
                      <a href={jobStatus.video_url} download={`vixora-video-${jobStatus.job_id}.mp4`} target="_blank" rel="noreferrer">
                        <Download className="h-3.5 w-3.5" /> Download MP4
                      </a>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                      className="text-xs font-bold gap-1.5"
                    >
                      {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedLink ? "Copied Link" : "Copy Link"}
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleAddToTvVideos}
                      className="text-xs font-bold gap-1.5"
                    >
                      <Tv className="h-3.5 w-3.5 text-amber-500" /> Add to TV Playlist
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      className="text-xs font-bold gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" /> Create Another
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : jobStatus?.status === "failed" || errorMsg ? (
              /* 3. STEP 3: NATIVE ERROR STATE WITH INSTANT FALLBACK */
              <Card className="border-rose-500/30 bg-rose-500/5 shadow-md">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" /> Video Generation Alert
                  </CardTitle>
                  <CardDescription className="text-xs text-rose-500/80">
                    A connection or rendering issue occurred with the remote endpoint.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-background border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 font-mono break-words">
                    {errorMsg || jobStatus?.error || "Unknown server error occurred."}
                  </div>

                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs space-y-1">
                    <p className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Instant Native Resolution:
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      Click below to render your video immediately using the built-in Native Engine without relying on external servers.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleCreateVideo(undefined, true)}
                    className="text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto"
                  >
                    <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Render with Native Engine
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleReset} className="text-xs font-bold">
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset Form
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              /* 4. DEFAULT EMPTY STATE PREVIEW CARD */
              <Card className="border-dashed border-2 border-border/80 bg-secondary/20 flex flex-col items-center justify-center p-8 text-center min-h-[360px]">
                <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 ring-1 ring-purple-500/30 shadow-inner">
                  <Film className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">Live Video Canvas</h3>
                <p className="text-xs text-muted-foreground max-w-xs mb-4">
                  Configure your concept on the left and click "Generate Video Now". Your video will render here with real-time progress.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground font-semibold">
                  <span className="px-2.5 py-1 rounded-full bg-secondary border">9:16 / 1:1 / 16:9</span>
                  <span className="px-2.5 py-1 rounded-full bg-secondary border">Google Gemini Voice</span>
                  <span className="px-2.5 py-1 rounded-full bg-secondary border">HD 1080p Export</span>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VIXORA WEB STUDIO (Direct Embedded Web App Workspace) */}
      {activeTab === "vixora_web" && (
        <Card className="border-border/80 shadow-md overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-3 bg-secondary/30">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-600" />
                Vixora Web Studio Workspace
              </CardTitle>
              <CardDescription className="text-xs">
                Interactive cloud video studio suite at <code>https://vixora-sepia.vercel.app</code>
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              asChild
              className="text-xs font-semibold gap-1.5"
            >
              <a href="https://vixora-sepia.vercel.app" target="_blank" rel="noreferrer">
                Open in New Tab <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full h-[650px] bg-black">
              <iframe
                src="https://vixora-sepia.vercel.app"
                title="Vixora Studio Web Workspace"
                className="w-full h-full border-0"
                allow="camera; microphone; display-capture; autoplay; clipboard-write;"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: PROJECT LIBRARY & HISTORY */}
      {activeTab === "library" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Saved Video Creations & Projects</h3>
              <p className="text-xs text-muted-foreground">
                All videos generated on this account are saved for instant playback and distribution.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={loadProjects} disabled={loadingProjects} className="text-xs gap-1">
              {loadingProjects ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              Refresh
            </Button>
          </div>

          {videoHistory.length === 0 && projectsList.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-foreground">No videos in your library yet</p>
              <p className="text-xs text-muted-foreground mb-4">Generate your first AI promotional video to build your gallery.</p>
              <Button size="sm" onClick={() => setActiveTab("create")} className="font-bold text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Create Your First Video
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {videoHistory.map((video) => (
                <Card key={video.job_id} className="overflow-hidden border shadow-sm group hover:shadow-md transition-all">
                  <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt={video.title || "Video"} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center text-white/50">
                        <Play className="h-8 w-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {video.video_url && (
                        <a
                          href={video.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-full bg-white text-black hover:scale-110 transition-transform"
                        >
                          <Play className="h-4 w-4 fill-black" />
                        </a>
                      )}
                    </div>
                    <Badge className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px]">
                      {video.aspect_ratio || "video"}
                    </Badge>
                  </div>

                  <CardContent className="p-3 space-y-1">
                    <p className="text-xs font-bold truncate text-foreground">{video.title || "AI Video Project"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(video.created_at || Date.now()).toLocaleDateString()}
                    </p>
                  </CardContent>

                  <CardFooter className="p-3 pt-0 flex items-center justify-between border-t border-border/40 text-xs">
                    {video.video_url && (
                      <a
                        href={video.video_url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" /> Download
                      </a>
                    )}
                    <button
                      onClick={() => {
                        removeSavedVideo(video.job_id);
                        setVideoHistory(getSavedVideosHistory());
                        toast.success("Removed from local history");
                      }}
                      className="text-muted-foreground hover:text-rose-500 text-[11px]"
                    >
                      Delete
                    </button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
