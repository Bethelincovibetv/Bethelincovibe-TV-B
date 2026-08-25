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
  Film,
  Sparkles,
  Play,
  Pause,
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
  Layers,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FolderOpen,
  Plus,
  Wand2,
  ChevronRight,
  Music,
  Search,
  Zap,
  Tag,
  Radio,
  Sliders,
  FileText,
  VolumeX,
  Eye,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import {
  VideoAspectRatio,
  VideoDuration,
  VideoVoice,
  ScriptBeat,
  VoiceOption,
  SfxItem,
  MusicTrack,
  StockMediaAsset,
  DEFAULT_VIXORA_VOICES,
  DEFAULT_SFX_LIST,
  DEFAULT_MUSIC_TRACKS,
  DEFAULT_STOCK_ASSETS,
  getVixoraApiBase,
  syncVixoraAuthUser,
  generateVixoraScript,
  createVixoraVideoJob,
  pollVixoraVideoStatus,
  fetchVixoraVoices,
  fetchVixoraSfxCatalog,
  fetchVixoraMusicCatalog,
  searchVixoraStockMedia,
  playSfxSample,
} from "@/lib/vixoraStudioApi";
import {
  createVixoraVideo,
  generateNativeVixoraVideo,
  getSavedVideosHistory,
  saveCreatedVideoToHistory,
  removeSavedVideo,
  setCustomVixoraBackendUrl,
  getVixoraBackendUrl,
  isForceNativeEngine,
  setForceNativeEngine,
  VideoJobStatus,
} from "@/lib/vixoraVideoEngine";
import { supabase } from "@/integrations/supabase/client";
import AIGeneratorActions from "@/components/video/AIGeneratorActions";
import VixoraCoachLiveDialog from "@/components/coach/VixoraCoachLiveDialog";

const ASPECT_RATIOS: { id: VideoAspectRatio; label: string; ratio: string; icon: any; desc: string }[] = [
  { id: "vertical", label: "Vertical", ratio: "9:16", icon: Smartphone, desc: "TikTok, Reels & YouTube Shorts" },
  { id: "square", label: "Square", ratio: "1:1", icon: Square, desc: "Instagram & Facebook Feed" },
  { id: "horizontal", label: "Horizontal", ratio: "16:9", icon: Monitor, desc: "YouTube, Banners & Bethel TV" },
];

const DURATIONS: { id: VideoDuration; label: string; seconds: number; badge?: string }[] = [
  { id: "15s", label: "15s (Snackable)", seconds: 15, badge: "Fastest" },
  { id: "30s", label: "30s (Engaging)", seconds: 30, badge: "Popular" },
  { id: "60s", label: "60s (Comprehensive)", seconds: 60, badge: "Story" },
];

const NICHES = [
  { id: "finance", label: "Finance & Wealth" },
  { id: "ecommerce", label: "E-Commerce & Retail" },
  { id: "realestate", label: "Real Estate & Homes" },
  { id: "tech", label: "Tech & SaaS" },
  { id: "food", label: "Food & Dining" },
  { id: "fashion", label: "Fashion & Beauty" },
  { id: "general", label: "General Business" },
];

const TONES = [
  { id: "energetic", label: "Energetic & High Drive" },
  { id: "professional", label: "Professional & Trustworthy" },
  { id: "humorous", label: "Casual & Relatable" },
  { id: "urgent", label: "Urgent Flash Sale" },
  { id: "storytelling", label: "Inspirational Story" },
  { id: "luxury", label: "Luxury & Exclusive" },
];

const PROMPT_TEMPLATES = [
  {
    title: "Lagos Real Estate Spotlight",
    prompt: "A high-converting promotional video showcasing luxury apartments in Lekki Phase 1 with waterfront views and smart home amenities.",
    niche: "realestate",
    tone: "luxury",
  },
  {
    title: "E-commerce Flash Sale Reel",
    prompt: "Exciting promotional short announcing a 50% discount flash sale on authentic African fashion and shoes in Lagos with fast delivery.",
    niche: "ecommerce",
    tone: "urgent",
  },
  {
    title: "Fintech Cross-Border App",
    prompt: "An energetic startup pitch explaining how our automated fintech app solves cross-border payments for Nigerian businesses in seconds.",
    niche: "finance",
    tone: "energetic",
  },
  {
    title: "Lagos Restaurant & Suya Lounge",
    prompt: "Mouth-watering video reel highlighting spicy Jollof rice, grilled Suya, and cocktail happy hour at our Victoria Island lounge.",
    niche: "food",
    tone: "energetic",
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

  // Active Studio Sub-Tab
  const [studioTab, setStudioTab] = useState<"create" | "ai_script" | "beats" | "audio_sfx" | "stock" | "library">("create");

  // Form State
  const [mode, setMode] = useState<"prompt" | "script">("prompt");
  const [topic, setTopic] = useState(initialTopic);
  const [script, setScript] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [duration, setDuration] = useState<VideoDuration>("15s");
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("vertical");
  const [voice, setVoice] = useState<VideoVoice>("Kore");
  const [niche, setNiche] = useState("general");
  const [tone, setTone] = useState("energetic");
  const [selectedMusicId, setSelectedMusicId] = useState("motivational-pulse");

  // AI Script Generation & Beats
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptBeats, setScriptBeats] = useState<ScriptBeat[]>([]);
  const [suggestedMusicMood, setSuggestedMusicMood] = useState<string>("motivational");

  // Catalog Data
  const [voices, setVoices] = useState<VoiceOption[]>(DEFAULT_VIXORA_VOICES);
  const [sfxList, setSfxList] = useState<SfxItem[]>(DEFAULT_SFX_LIST);
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>(DEFAULT_MUSIC_TRACKS);
  const [stockAssets, setStockAssets] = useState<StockMediaAsset[]>(DEFAULT_STOCK_ASSETS);
  const [stockQuery, setStockQuery] = useState("business");
  const [isSearchingStock, setIsSearchingStock] = useState(false);

  // Audio Playback Preview
  const [playingMusicId, setPlayingMusicId] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Execution & Progress State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<VideoJobStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [logsList, setLogsList] = useState<string[]>([]);

  // SSO Auth Sync Status
  const [ssoSynced, setSsoSynced] = useState(false);

  // Engine Settings Dialog
  const [configOpen, setConfigOpen] = useState(false);
  const [showVoiceAgentDialog, setShowVoiceAgentDialog] = useState(false);
  const [backendUrl, setBackendUrl] = useState("");
  const [tempUrlInput, setTempUrlInput] = useState("");
  const [forceNative, setForceNative] = useState(false);
  const [testingEndpoint, setTestingEndpoint] = useState(false);
  const [endpointStatus, setEndpointStatus] = useState<"idle" | "ok" | "failed">("idle");

  // Saved Videos History
  const [videoHistory, setVideoHistory] = useState<VideoJobStatus[]>([]);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);

  // 1. Synchronize Auth Session on Mount & Auth Change
  useEffect(() => {
    (async () => {
      const url = await getVixoraBackendUrl();
      setBackendUrl(url);
      setTempUrlInput(url);
      setForceNative(isForceNativeEngine());
      setVideoHistory(getSavedVideosHistory());

      // Fetch catalogs
      const [vList, sfx, music] = await Promise.all([
        fetchVixoraVoices(),
        fetchVixoraSfxCatalog(),
        fetchVixoraMusicCatalog(),
      ]);
      setVoices(vList);
      setSfxList(sfx);
      setMusicTracks(music);

      // Perform Unified SSO Sync (Requirement 1 & 7)
      if (user?.id) {
        const { data: sessionData } = await supabase.auth.getSession();
        const syncRes = await syncVixoraAuthUser({
          user_id: user.id,
          email: user.email || undefined,
          full_name: (user.user_metadata as any)?.full_name || (user.email ? user.email.split("@")[0] : undefined),
          access_token: sessionData?.session?.access_token,
        });
        if (syncRes.ok) {
          setSsoSynced(true);
        }
      }
    })();
  }, [user]);

  // Audio Preview Play / Pause handler
  const handleToggleMusicPreview = (track: MusicTrack) => {
    if (playingMusicId === track.id) {
      audioPreviewRef.current?.pause();
      setPlayingMusicId(null);
    } else {
      if (!audioPreviewRef.current) {
        audioPreviewRef.current = new Audio();
      }
      audioPreviewRef.current.src = track.stream_url;
      audioPreviewRef.current.play().catch(() => {
        toast.info("Playing audio preview stream");
      });
      setPlayingMusicId(track.id);
      audioPreviewRef.current.onended = () => setPlayingMusicId(null);
    }
  };

  // 2. Generate AI Viral Script & Scene Beats
  const handleGenerateScript = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a video topic or business concept first.");
      return;
    }

    setIsGeneratingScript(true);
    try {
      toast.info("Crafting high-converting AI script & scene beats...");
      const result = await generateVixoraScript({
        topic: topic.trim(),
        duration,
        niche,
        tone,
      });

      if (result.ok && result.script) {
        setScript(result.script);
        setScriptBeats(result.beats || []);
        if (result.suggested_music_mood) {
          setSuggestedMusicMood(result.suggested_music_mood);
          // Match closest music track
          const matched = musicTracks.find((m) =>
            m.mood.toLowerCase().includes(result.suggested_music_mood.toLowerCase())
          );
          if (matched) setSelectedMusicId(matched.id);
        }
        setMode("script");
        toast.success(`Generated script with ${result.beats?.length || 3} scene beats!`);
      } else {
        throw new Error(result.error || "Failed to generate script");
      }
    } catch (err: any) {
      toast.error(err.message || "Could not generate script.");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // 3. Stock Media Search Handler
  const handleSearchStockMedia = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!stockQuery.trim()) return;

    setIsSearchingStock(true);
    try {
      const results = await searchVixoraStockMedia({
        query: stockQuery.trim(),
        orientation: aspectRatio,
      });
      setStockAssets(results);
      toast.success(`Found ${results.length} media assets`);
    } catch (e) {
      toast.error("Stock media search failed");
    } finally {
      setIsSearchingStock(false);
    }
  };

  // 4. Create and Submit Video Job
  const handleCreateVideo = async (e?: React.FormEvent, forceLocal = false) => {
    if (e) e.preventDefault();

    if (mode === "prompt" && !topic.trim()) {
      toast.error("Please enter a video topic or prompt.");
      return;
    }
    if (mode === "script" && !script.trim()) {
      toast.error("Please enter or generate a video script.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setLogsList(["[00:00:01] Initializing Vixora AI Video Engine pipeline..."]);

    const finalTitle =
      videoTitle.trim() ||
      (mode === "prompt"
        ? topic.slice(0, 45) + (topic.length > 45 ? "..." : "")
        : "AI Marketing Video");

    setJobStatus({
      job_id: "init_job",
      status: "queued",
      progress: 5,
      current_step: "Queuing video job and syncing AI voiceover stems...",
      aspect_ratio: aspectRatio,
      title: finalTitle,
    });

    const payload = {
      topic: mode === "prompt" ? topic.trim() : undefined,
      script: mode === "script" ? script.trim() : undefined,
      title: finalTitle,
      duration,
      aspect_ratio: aspectRatio,
      voice,
      user_id: user?.id,
      niche,
      tone,
      music_track_id: selectedMusicId,
      sfx_cues: scriptBeats.map((b) => b.sfx_cue).filter(Boolean) as string[],
    };

    try {
      // Step A: Attempt public REST job creation
      if (!forceLocal && !forceNative) {
        const jobRes = await createVixoraVideoJob(payload);
        if (jobRes.ok && jobRes.job_id) {
          const jobId = jobRes.job_id;
          setCurrentJobId(jobId);
          setJobStatus({
            job_id: jobId,
            status: "processing",
            progress: 10,
            current_step: "Synthesizing voiceover and compositing scene beats...",
            aspect_ratio: aspectRatio,
            title: finalTitle,
          });

          // Step B: Poll every 2s until completion
          let pollCount = 0;
          const maxPolls = 150;
          let completed = false;

          while (!completed && pollCount < maxPolls) {
            await new Promise((r) => setTimeout(r, 2000));
            pollCount++;

            const pollData = await pollVixoraVideoStatus(jobId);
            if (pollData.ok) {
              setJobStatus({
                job_id: jobId,
                status: pollData.status,
                progress: pollData.progress,
                current_step: pollData.current_step,
                video_url: pollData.video_url,
                thumbnail_url: pollData.thumbnail_url,
                asset_id: pollData.asset_id,
                aspect_ratio: aspectRatio,
                title: finalTitle,
                logs: pollData.logs,
              });

              if (pollData.logs && pollData.logs.length > 0) {
                setLogsList(pollData.logs);
              }

              if (pollData.status === "ready" && pollData.video_url) {
                completed = true;
                const finalObj: VideoJobStatus = {
                  job_id: jobId,
                  status: "ready",
                  progress: 100,
                  current_step: "Rendering complete",
                  video_url: pollData.video_url,
                  thumbnail_url: pollData.thumbnail_url,
                  asset_id: pollData.asset_id,
                  aspect_ratio: aspectRatio,
                  title: finalTitle,
                  created_at: new Date().toISOString(),
                };
                saveCreatedVideoToHistory(finalObj);
                setVideoHistory(getSavedVideosHistory());
                onVideoCreated?.(finalObj);
                toast.success("Video rendered successfully!");
                return;
              }

              if (pollData.status === "failed") {
                throw new Error(pollData.error || "Video rendering failed on remote server.");
              }
            }
          }
        }
      }

      // Step C: Fallback to high-performance local Native Studio
      toast.info("Using Native Studio Engine for immediate rendering...");
      const finalVideo = await generateNativeVixoraVideo(payload, (prog) => {
        setJobStatus({ ...prog, title: finalTitle });
        if (prog.current_step) {
          setLogsList((prev) => [...prev.slice(-10), `[${new Date().toLocaleTimeString()}] ${prog.current_step}`]);
        }
      });

      setJobStatus(finalVideo);
      setCurrentJobId(finalVideo.job_id);
      saveCreatedVideoToHistory(finalVideo);
      setVideoHistory(getSavedVideosHistory());
      onVideoCreated?.(finalVideo);
      toast.success("Your video is ready for playback!");
    } catch (err: any) {
      console.warn("Video creation notice:", err);
      // Seamless native fallback
      try {
        const fallbackVideo = await generateNativeVixoraVideo(payload, (prog) => {
          setJobStatus({ ...prog, title: finalTitle });
        });
        setJobStatus(fallbackVideo);
        setCurrentJobId(fallbackVideo.job_id);
        saveCreatedVideoToHistory(fallbackVideo);
        setVideoHistory(getSavedVideosHistory());
        onVideoCreated?.(fallbackVideo);
        toast.success("Your video has been rendered!");
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
        description: `Created with Vixora AI Video Studio (${duration}, ${aspectRatio})`,
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
    setLogsList([]);
  };

  const handleTestEndpoint = async () => {
    setTestingEndpoint(true);
    setEndpointStatus("idle");
    try {
      const clean = tempUrlInput.trim().replace(/\/+$/, "");
      const res = await fetch(`${clean}/api/public/v1/audio/voices`, {
        method: "GET",
        headers: { Accept: "application/json" },
      }).catch(() => null);

      if (res && res.ok) {
        setEndpointStatus("ok");
        toast.success("Connection to Vixora Studio API verified!");
      } else {
        setEndpointStatus("failed");
        toast.info("Custom endpoint offline. Native Engine will process videos.");
      }
    } catch {
      setEndpointStatus("failed");
    } finally {
      setTestingEndpoint(false);
    }
  };

  const handleSaveBackendUrl = () => {
    const clean = tempUrlInput.trim().replace(/\/+$/, "");
    setCustomVixoraBackendUrl(clean);
    setBackendUrl(clean || "https://ais-dev-z3gmsn2xsvk2qfmakpvm37-164225214835.europe-west3.run.app");
    setForceNativeEngine(forceNative);
    setConfigOpen(false);
    toast.success("Vixora Engine settings saved.");
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Studio Header & Global Controls */}
      <div className="flex flex-col gap-4 pb-3 border-b border-border/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25 ring-1 ring-white/20">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                  Vixora AI Studio
                </h2>
                <Badge className="bg-purple-600/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px] font-bold">
                  Native Pipeline
                </Badge>
                {ssoSynced && (
                  <Badge variant="outline" className="hidden sm:inline-flex bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> SSO Synced
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1 sm:line-clamp-none">
                AI Script generation, neural voiceover synthesis, sound effects & video compositing.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowVoiceAgentDialog(true)}
              className="h-9 px-3 gap-1.5 font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs shrink-0"
            >
              <Radio className="h-3.5 w-3.5 text-emerald-200 animate-pulse" />
              <span className="inline">Live Voice Coach</span>
            </Button>

            <Dialog open={configOpen} onOpenChange={setConfigOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 font-semibold text-xs shrink-0">
                  <Settings className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base font-bold">
                    <Settings className="h-4 w-4 text-purple-600" />
                    Vixora Studio Configuration
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Configure live REST API endpoints and single sign-on synchronization.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-purple-600" /> Cloud Database & SSO
                      </span>
                      <Badge className="bg-emerald-600 text-white text-[10px]">Connected</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Supabase DB: <code>https://gndcgttnpxsjufmehgyi.supabase.co</code>
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs font-bold">Vixora REST API Endpoint</Label>
                    <Input
                      value={tempUrlInput}
                      onChange={(e) => setTempUrlInput(e.target.value)}
                      placeholder="https://ais-dev-z3gmsn2xsvk2qfmakpvm37-164225214835.europe-west3.run.app"
                      className="font-mono text-xs mt-1"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Used for <code>/api/public/v1/*</code> video, script, and voice routes.
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
                      {testingEndpoint ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      Verify REST API
                    </Button>

                    {endpointStatus === "ok" && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> API Connected
                      </span>
                    )}
                    {endpointStatus === "failed" && (
                      <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" /> Native Engine Ready
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

        {/* Navigation Tabs (Smooth horizontal scroll on mobile) */}
        <div className="w-full overflow-x-auto no-scrollbar pb-1">
          <Tabs
            value={studioTab}
            onValueChange={(v: any) => setStudioTab(v)}
            className="w-full sm:w-auto"
          >
            <TabsList className="inline-flex h-9 p-1 bg-secondary/80 rounded-xl gap-1 shrink-0">
              <TabsTrigger value="create" className="text-xs font-bold gap-1 px-3 py-1 whitespace-nowrap">
                <Wand2 className="h-3.5 w-3.5" /> Studio
              </TabsTrigger>
              <TabsTrigger value="ai_script" className="text-xs font-bold gap-1 text-purple-600 dark:text-purple-400 px-3 py-1 whitespace-nowrap">
                <Sparkles className="h-3.5 w-3.5" /> AI Script
              </TabsTrigger>
              <TabsTrigger value="beats" className="text-xs font-bold gap-1 px-3 py-1 whitespace-nowrap">
                <Layers className="h-3.5 w-3.5" /> Beats
              </TabsTrigger>
              <TabsTrigger value="audio_sfx" className="text-xs font-bold gap-1 px-3 py-1 whitespace-nowrap">
                <Music className="h-3.5 w-3.5" /> Audio
              </TabsTrigger>
              <TabsTrigger value="stock" className="text-xs font-bold gap-1 px-3 py-1 whitespace-nowrap">
                <Search className="h-3.5 w-3.5" /> Media
              </TabsTrigger>
              <TabsTrigger value="library" className="text-xs font-bold gap-1 px-3 py-1 whitespace-nowrap">
                <FolderOpen className="h-3.5 w-3.5" /> Library ({videoHistory.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MAIN STUDIO (VIDEO CREATION & REAL-TIME POLL RENDERER) */}
      {/* ========================================================================= */}
      {studioTab === "create" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: STUDIO FORM (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            <Card className="border-border/80 shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      1. Video Concept & AI Script
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Type a concept and let Vixora generate viral hooks, scene beats, and voiceover.
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
                      AI Concept
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
                      Voiceover Script
                    </button>
                  </div>
                </div>
              </CardHeader>

              <form onSubmit={(e) => handleCreateVideo(e)}>
                <CardContent className="space-y-4 pt-0">
                  {/* Video Title */}
                  <div>
                    <Label className="text-xs font-bold">Video Title / Project Name</Label>
                    <Input
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      placeholder="e.g., Lekki Luxury Penthouse Showcase"
                      className="mt-1 text-sm font-medium"
                    />
                  </div>

                  {/* Niche & Tone Pickers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <Label className="text-xs font-bold">Target Niche</Label>
                      <select
                        value={niche}
                        onChange={(e) => setNiche(e.target.value)}
                        className="w-full h-9 rounded-lg border bg-background px-2.5 text-xs font-medium focus:ring-1 focus:ring-primary mt-1"
                      >
                        {NICHES.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold">Script Tone & Style</Label>
                      <select
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                        className="w-full h-9 rounded-lg border bg-background px-2.5 text-xs font-medium focus:ring-1 focus:ring-primary mt-1"
                      >
                        {TONES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Concept Prompt Input */}
                  {mode === "prompt" ? (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold">Concept Prompt / Campaign Goal</Label>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setStudioTab("ai_script")}
                            className="h-6 text-[11px] font-bold text-purple-600 hover:text-purple-700 hover:bg-purple-500/10 px-2 gap-1"
                          >
                            <Sparkles className="h-3 w-3" />
                            AI Script Studio
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleGenerateScript}
                            disabled={isGeneratingScript || !topic.trim()}
                            className="h-6 text-[11px] font-bold text-foreground hover:bg-secondary px-2 gap-1"
                          >
                            {isGeneratingScript ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Wand2 className="h-3 w-3" />
                            )}
                            Quick Generate
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="What do you want to create? e.g., A vibrant 30-second promotional short for our Lagos fashion boutique announcing an upcoming weekend sale with free delivery..."
                        rows={4}
                        className="text-sm resize-none"
                      />

                      {/* Prompt Inspiration Templates */}
                      <div className="pt-1">
                        <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                          <Zap className="h-3 w-3 text-amber-500" /> Nigerian Business Templates:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {PROMPT_TEMPLATES.map((tmpl) => (
                            <button
                              key={tmpl.title}
                              type="button"
                              onClick={() => {
                                setTopic(tmpl.prompt);
                                setVideoTitle(tmpl.title);
                                setNiche(tmpl.niche);
                                setTone(tmpl.tone);
                                toast.info(`Loaded "${tmpl.title}" template`);
                              }}
                              className="text-[11px] px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-secondary-foreground border border-border/60 transition-colors text-left"
                            >
                              {tmpl.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Script Input Mode */
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold">Voiceover Script</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setStudioTab("beats")}
                          className="h-6 text-[11px] font-bold text-purple-600 hover:text-purple-700 px-2 gap-1"
                        >
                          <Layers className="h-3 w-3" /> View Scene Beats ({scriptBeats.length})
                        </Button>
                      </div>
                      <Textarea
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        placeholder="Enter the exact narration text to be spoken word-for-word in the video..."
                        rows={5}
                        className="text-sm resize-none font-mono"
                      />
                    </div>
                  )}

                  {/* Aspect Ratio Cards (Vertical 9:16, Square 1:1, Horizontal 16:9) */}
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
                                ? "bg-purple-500/10 border-purple-500 shadow-sm text-purple-700 dark:text-purple-300 ring-1 ring-purple-500/30"
                                : "bg-card hover:bg-secondary/60 border-border/70 text-foreground"
                            }`}
                          >
                            <div
                              className={`p-2 rounded-lg mb-1.5 ${
                                isSelected ? "bg-purple-600 text-white" : "bg-secondary text-foreground"
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

                  {/* Duration & Voice Selector Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                    {/* Duration (15s, 30s, 60s) */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" /> Duration
                      </Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {DURATIONS.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setDuration(d.id)}
                            className={`py-2 px-1 rounded-lg border text-xs font-bold transition-all text-center ${
                              duration === d.id
                                ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                                : "bg-secondary/70 hover:bg-secondary text-foreground border-border/60"
                            }`}
                          >
                            {d.id}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Voiceover Actor */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Volume2 className="h-3.5 w-3.5 text-primary" /> Voiceover Actor
                        </span>
                        {voice === "Kore" && (
                          <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                            ★ Flagship Nigerian
                          </span>
                        )}
                      </Label>
                      <select
                        value={voice}
                        onChange={(e) => setVoice(e.target.value as VideoVoice)}
                        className="w-full h-9 rounded-lg border bg-background px-2.5 text-xs font-medium focus:ring-1 focus:ring-primary"
                      >
                        {voices.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({v.description})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Background Music Selector */}
                  <div className="pt-2 border-t space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Music className="h-3.5 w-3.5 text-primary" /> Background Music Track
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        Mood: <span className="font-semibold text-purple-600">{suggestedMusicMood}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedMusicId}
                        onChange={(e) => setSelectedMusicId(e.target.value)}
                        className="w-full h-9 rounded-lg border bg-background px-2.5 text-xs font-medium"
                      >
                        {musicTracks.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title} ({m.mood} · {m.bpm} BPM)
                          </option>
                        ))}
                      </select>
                      {(() => {
                        const curTrack = musicTracks.find((m) => m.id === selectedMusicId);
                        if (!curTrack) return null;
                        return (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleToggleMusicPreview(curTrack)}
                            className="h-9 px-3 text-xs font-bold gap-1 shrink-0"
                          >
                            {playingMusicId === curTrack.id ? (
                              <>
                                <Pause className="h-3.5 w-3.5 text-purple-600" /> Stop
                              </>
                            ) : (
                              <>
                                <Play className="h-3.5 w-3.5 text-purple-600" /> Preview
                              </>
                            )}
                          </Button>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-3 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Engine: Vixora Cloud API + Native Canvas Compositor
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

          {/* RIGHT: REAL-TIME PROGRESS & NATIVE PLAYER (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Case 1: In Progress / Rendering */}
            {isSubmitting || (jobStatus && jobStatus.status !== "ready" && jobStatus.status !== "failed") ? (
              <Card className="border-purple-500/30 bg-purple-500/5 shadow-xl relative overflow-hidden">
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
                      <span className="text-foreground">Overall Render Progress</span>
                      <span className="text-purple-600 dark:text-purple-400 font-mono text-sm">{jobStatus?.progress || 10}%</span>
                    </div>
                    <Progress value={jobStatus?.progress || 10} className="h-3 rounded-full bg-secondary" />
                  </div>

                  {/* Current Step Text */}
                  <div className="p-3 rounded-xl bg-card border border-border/80 space-y-1">
                    <div className="text-[11px] uppercase tracking-wider font-extrabold text-purple-600 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-600 animate-ping" />
                      Active Rendering Step
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      {jobStatus?.current_step || "Rendering video frames and compositing audio tracks..."}
                    </p>
                  </div>

                  {/* Stages Checklist */}
                  <div className="space-y-2 pt-2 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {(jobStatus?.progress || 0) >= 20 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-muted-foreground/40 flex items-center justify-center text-[9px]">1</span>
                      )}
                      <span className={(jobStatus?.progress || 0) >= 20 ? "text-foreground font-semibold" : ""}>
                        Script beats & viral hook synthesis
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      {(jobStatus?.progress || 0) >= 45 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-muted-foreground/40 flex items-center justify-center text-[9px]">2</span>
                      )}
                      <span className={(jobStatus?.progress || 0) >= 45 ? "text-foreground font-semibold" : ""}>
                        Neural voiceover ({voice} voice) & SFX cues
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      {(jobStatus?.progress || 0) >= 70 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-muted-foreground/40 flex items-center justify-center text-[9px]">3</span>
                      )}
                      <span className={(jobStatus?.progress || 0) >= 70 ? "text-foreground font-semibold" : ""}>
                        Visual frame composition & motion graphics
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

                  {/* Terminal Execution Logs */}
                  {logsList.length > 0 && (
                    <div className="mt-2 p-2.5 rounded-lg bg-black/90 text-emerald-400 font-mono text-[10px] max-h-28 overflow-y-auto space-y-1">
                      {logsList.map((log, i) => (
                        <div key={i} className="truncate">
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : jobStatus?.status === "ready" && jobStatus.video_url ? (
              /* Case 2: Ready - Native HTML5 Video Player */
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
                  {/* Native HTML5 <video controls playsinline> element */}
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
                      ref={videoPlayerRef}
                      src={jobStatus.video_url}
                      poster={jobStatus.thumbnail_url}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-contain rounded-2xl"
                    />
                  </div>

                  {/* Actions Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="default"
                      size="sm"
                      asChild
                      className="text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                    >
                      <a href={jobStatus.video_url} download={`vixora-${jobStatus.job_id}.mp4`} target="_blank" rel="noreferrer">
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
              /* Case 3: Failed / Error State */
              <Card className="border-rose-500/30 bg-rose-500/5 shadow-md">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" /> Video Generation Notice
                  </CardTitle>
                  <CardDescription className="text-xs text-rose-500/80">
                    A connection error occurred with the server.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-background border text-xs font-mono text-rose-700 dark:text-rose-300">
                    {errorMsg || jobStatus?.error || "Unable to reach remote render node."}
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button size="sm" onClick={() => handleCreateVideo(undefined, true)} className="text-xs font-bold bg-purple-600 text-white">
                    <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Render Locally (Native Engine)
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleReset} className="text-xs">
                    Reset
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              /* Case 4: Default Empty Preview */
              <Card className="border-dashed border-2 border-border/80 bg-secondary/20 flex flex-col items-center justify-center p-8 text-center min-h-[380px]">
                <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 ring-1 ring-purple-500/30 shadow-inner">
                  <Film className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">Live Video Canvas</h3>
                <p className="text-xs text-muted-foreground max-w-xs mb-4">
                  Configure your concept on the left and click "Generate Video Now". Your video will render here with real-time progress.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground font-semibold">
                  <span className="px-2.5 py-1 rounded-full bg-secondary border">9:16 / 1:1 / 16:9</span>
                  <span className="px-2.5 py-1 rounded-full bg-secondary border">Kore Flagship Voice</span>
                  <span className="px-2.5 py-1 rounded-full bg-secondary border">HD 1080p MP4</span>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI SCRIPT GENERATOR & SCENE BEATS ACTIONS (POST /api/public/v1/scripts/generate) */}
      {/* ========================================================================= */}
      {studioTab === "ai_script" && (
        <AIGeneratorActions
          initialTopic={topic}
          initialDuration={duration}
          initialNiche={niche}
          initialTone={tone}
          onApplyScript={({ script: s, beats: b, suggestedMood: m, topic: t, title: ttl }) => {
            setScript(s);
            if (b && b.length > 0) setScriptBeats(b);
            if (m) {
              setSuggestedMusicMood(m);
              const matched = musicTracks.find((trk) =>
                trk.mood.toLowerCase().includes(m.toLowerCase())
              );
              if (matched) setSelectedMusicId(matched.id);
            }
            if (t) setTopic(t);
            if (ttl) setVideoTitle(ttl);
            setMode("script");
            setStudioTab("create");
            toast.success("Applied AI Script & Scene Beats to Studio!");
          }}
          onDirectRender={(payload) => {
            setScript(payload.script);
            setScriptBeats(payload.beats);
            setTopic(payload.topic);
            setDuration(payload.duration);
            setNiche(payload.niche);
            setTone(payload.tone);
            setMode("script");
            setStudioTab("create");
            setTimeout(() => {
              handleCreateVideo();
            }, 100);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SCENE BEATS & VISUAL CUES LAB */}
      {/* ========================================================================= */}
      {studioTab === "beats" && (
        <Card className="border-border/80 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-600" />
                  AI Viral Script & Scene Beats Breakdown
                </CardTitle>
                <CardDescription className="text-xs">
                  Review the structured visual search queries, sound effects cues, and spoken sentences.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={handleGenerateScript}
                disabled={isGeneratingScript || !topic.trim()}
                className="text-xs font-bold gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isGeneratingScript ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Regenerate Beats
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {scriptBeats.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-xl space-y-3">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
                <p className="text-sm font-semibold">No Scene Beats Generated Yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Enter a topic in the Studio tab and click "Generate AI Script" to automatically generate timed scene beats.
                </p>
                <Button size="sm" variant="outline" onClick={() => setStudioTab("create")} className="text-xs font-bold">
                  Go to Studio
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {scriptBeats.map((beat, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-secondary/40 border border-border/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-600 text-white text-[10px]">Scene {beat.index || idx + 1}</Badge>
                        <span className="font-mono text-muted-foreground text-[11px]">{beat.suggested_duration}s duration</span>
                      </div>
                      {beat.sfx_cue && (
                        <button
                          type="button"
                          onClick={() => playSfxSample(beat.sfx_cue || "whoosh")}
                          className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 hover:bg-amber-500/20 transition-colors"
                        >
                          <Volume2 className="h-3 w-3" /> SFX: {beat.sfx_cue} (Click to test)
                        </button>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm font-medium text-foreground">
                      "{beat.text}"
                    </p>

                    <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                      <span className="font-bold text-foreground flex items-center gap-1">
                        <Search className="h-3 w-3 text-primary" /> Visual Query:
                      </span>
                      <code className="px-2 py-0.5 rounded bg-background border text-[10px] text-purple-600 font-mono">
                        {beat.visual_search_query}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          {scriptBeats.length > 0 && (
            <CardFooter className="pt-2 border-t flex justify-end">
              <Button
                size="sm"
                onClick={() => setStudioTab("create")}
                className="text-xs font-bold bg-primary text-primary-foreground gap-1.5"
              >
                Continue to Render <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SOUND EFFECTS (SFX) & MUSIC CATALOG */}
      {/* ========================================================================= */}
      {studioTab === "audio_sfx" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SFX Catalog & Soundboard */}
          <Card className="border-border/80 shadow-md">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-amber-500" />
                Sound Effects (SFX) Soundboard
              </CardTitle>
              <CardDescription className="text-xs">
                Audition sound cues embedded during video scene transitions.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2.5">
              {sfxList.map((sfx) => (
                <button
                  key={sfx.id}
                  type="button"
                  onClick={() => playSfxSample(sfx.cue)}
                  className="p-3 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/80 text-left transition-all hover:scale-[1.02] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-foreground">{sfx.name}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">{sfx.category}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{sfx.description}</p>
                  </div>
                  <div className="mt-2 text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Play className="h-2.5 w-2.5 fill-current" /> Click to Test Sound
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Background Music Catalog */}
          <Card className="border-border/80 shadow-md">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Music className="h-4 w-4 text-purple-600" />
                Background Music Library
              </CardTitle>
              <CardDescription className="text-xs">
                Royalty-free background tracks synced to your target video duration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {musicTracks.map((track) => {
                const isSelected = selectedMusicId === track.id;
                const isPlaying = playingMusicId === track.id;
                return (
                  <div
                    key={track.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      isSelected
                        ? "bg-purple-500/10 border-purple-500 ring-1 ring-purple-500/20"
                        : "bg-secondary/40 border-border/70"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{track.title}</span>
                        {isSelected && <Badge className="bg-purple-600 text-white text-[9px]">Selected</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {track.mood} · {track.bpm} BPM · {track.duration_seconds}s
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleMusicPreview(track)}
                        className="h-7 px-2 text-xs"
                      >
                        {isPlaying ? <Pause className="h-3.5 w-3.5 text-purple-600" /> : <Play className="h-3.5 w-3.5 text-purple-600" />}
                      </Button>
                      <Button
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => {
                          setSelectedMusicId(track.id);
                          toast.success(`Selected "${track.title}" for background music`);
                        }}
                        className="h-7 text-xs font-bold"
                      >
                        {isSelected ? "Active" : "Use"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STOCK MEDIA SEARCH */}
      {/* ========================================================================= */}
      {studioTab === "stock" && (
        <Card className="border-border/80 shadow-md">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Search className="h-4 w-4 text-purple-600" />
                  Stock Media & Visual Assets Search
                </CardTitle>
                <CardDescription className="text-xs">
                  Search HD vertical, square, and widescreen visuals to ground your video scene beats.
                </CardDescription>
              </div>

              <form onSubmit={handleSearchStockMedia} className="flex items-center gap-2">
                <Input
                  value={stockQuery}
                  onChange={(e) => setStockQuery(e.target.value)}
                  placeholder="Search assets (e.g. Lagos, Tech, Sales)..."
                  className="h-8 text-xs w-48 sm:w-64"
                />
                <Button size="sm" type="submit" disabled={isSearchingStock} className="h-8 text-xs font-bold">
                  {isSearchingStock ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                </Button>
              </form>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {stockAssets.map((asset) => (
                <div key={asset.id} className="group relative rounded-xl overflow-hidden border bg-card shadow-xs">
                  <div className="aspect-[9/16] bg-black relative">
                    <img src={asset.thumbnail_url} alt={asset.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2 text-white">
                      <span className="text-[11px] font-bold truncate">{asset.title}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge className="bg-white/20 text-white text-[8px]">{asset.category}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="p-2 border-t">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setTopic((prev) => `${prev ? prev + " " : ""}Featuring ${asset.title}.`);
                        setStudioTab("create");
                        toast.success(`Added "${asset.title}" to video prompt`);
                      }}
                      className="w-full h-7 text-[10px] font-bold"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Use in Video
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SAVED VIDEOS LIBRARY */}
      {/* ========================================================================= */}
      {studioTab === "library" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Saved Video Creations & Projects</h3>
              <p className="text-xs text-muted-foreground">
                All videos created on this platform are saved locally and synced with Vixora Studio.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setVideoHistory(getSavedVideosHistory());
                toast.info("Library refreshed");
              }}
              className="text-xs gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
          </div>

          {videoHistory.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-foreground">No videos in your library yet</p>
              <p className="text-xs text-muted-foreground mb-4">Generate your first AI promotional video in the Studio tab.</p>
              <Button size="sm" onClick={() => setStudioTab("create")} className="font-bold text-xs bg-purple-600 text-white">
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
                        <button
                          type="button"
                          onClick={() => {
                            setJobStatus(video);
                            setStudioTab("create");
                          }}
                          className="p-2.5 rounded-full bg-white text-black hover:scale-110 transition-transform shadow-lg"
                        >
                          <Play className="h-4 w-4 fill-black" />
                        </button>
                      )}
                    </div>
                    <Badge className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px]">
                      {video.aspect_ratio || "9:16"}
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
                        download={`vixora-${video.job_id}.mp4`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" /> Download MP4
                      </a>
                    )}
                    <button
                      onClick={() => {
                        removeSavedVideo(video.job_id);
                        setVideoHistory(getSavedVideosHistory());
                        toast.success("Removed from library");
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

      {/* Victoria Studio AI Live Voice Agent Dialog */}
      <VixoraCoachLiveDialog
        open={showVoiceAgentDialog}
        onOpenChange={setShowVoiceAgentDialog}
        coachName="Victoria (Studio Lead)"
        systemPrompt="You are Victoria, the Executive Studio Director & AI Creative Producer at Vixora AI Studio & Bethelincovibe. You guide users in creating viral video scripts, hooks, marketing angles, voiceovers, and business growth campaigns."
      />
    </div>
  );
}
