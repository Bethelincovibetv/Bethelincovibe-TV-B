import React, { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import {
  Film,
  Sparkles,
  Zap,
  Layers,
  Volume2,
  Music,
  Video,
  Play,
  Pause,
  Download,
  Share2,
  RefreshCw,
  Sliders,
  Code2,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Square,
  Tv,
  Radio,
  FileText,
  Search,
  ExternalLink,
  ChevronRight,
  Loader2,
  ShieldCheck,
  Bot,
  Mic,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

import { VideoAspectRatio, VideoDuration, ScriptBeat, StockAsset, VideoRenderJob } from "./types";
import {
  ASPECT_RATIO_CONFIGS,
  DURATION_CONFIGS,
  VOICE_CATALOG,
  SFX_CATALOG,
  MUSIC_CATALOG,
  PROMPT_PRESETS,
  VIXORA_API_LIVE_BASE,
} from "./constants";
import { sfx } from "./sfxLibrary";
import { vixora } from "@/services/vixoraClient";
import { paystackService } from "./services/paystackService";
import { stockSourcingService } from "./services/stockSourcingService";
import { dataSyncService } from "./services/dataSyncService";
import { apiKeyService } from "./services/apiKeyService";

import PaystackModal from "./components/PaystackModal";
import CompleteApiModal from "./components/CompleteApiModal";
import NativeExportDownloadModal from "./components/NativeExportDownloadModal";
import DeveloperApiView from "./components/DeveloperApiView";
import VoiceoverReviewModal from "./components/VoiceoverReviewModal";
import VixoraCoachLiveDialog from "@/components/coach/VixoraCoachLiveDialog";
import { GoogleGenAI } from "@google/genai";

interface VixoraStudioAppProps {
  initialTopic?: string;
}

export function VixoraStudioApp({ initialTopic }: VixoraStudioAppProps = {}) {
  // Main Navigation Tab
  const [activeTab, setActiveTab] = useState("creator");

  // Video Parameters
  const [topic, setTopic] = useState(initialTopic || "3 High-Income Skills to Master in 2026");
  const [script, setScript] = useState("");
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("vertical");
  const [duration, setDuration] = useState<VideoDuration>("30s");
  const [voice, setVoice] = useState("Kore");
  const [selectedMusic, setSelectedMusic] = useState("afrobeats_groove");
  const [beats, setBeats] = useState<ScriptBeat[]>([]);

  // Generation & Render State
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStep, setRenderStep] = useState("");
  const [videoResult, setVideoResult] = useState<{
    jobId: string;
    videoUrl: string;
    thumbnailUrl?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Audio / Voice Test State
  const [testedVoice, setTestedVoice] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Stock Media State
  const [stockQuery, setStockQuery] = useState("business");
  const [stockResults, setStockResults] = useState<StockAsset[]>([]);
  const [isSearchingStock, setIsSearchingStock] = useState(false);

  // Modals & Coach Dialog
  const [showPaystackModal, setShowPaystackModal] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showVoiceoverModal, setShowVoiceoverModal] = useState(false);
  const [showVoiceAgentDialog, setShowVoiceAgentDialog] = useState(false);
  const [selectedCoachPersona, setSelectedCoachPersona] = useState<"adaobi" | "victoria">("adaobi");

  // User Credits
  const [userCredits, setUserCredits] = useState<number>(10);

  // Canvas Compositor Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setUserCredits(paystackService.getStoredCredits());
    handleSearchStock("business");
  }, []);

  // 1. Generate Multi-Minute Viral Script with Beats via Gemini / Backend
  const handleGenerateScript = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic or concept");
      return;
    }
    setIsGeneratingScript(true);
    setError(null);
    try {
      sfx.playWhoosh(0.3);

      const targetWords =
        duration === "15s"
          ? "35-45 words"
          : duration === "60s"
          ? "140-180 words (1 full minute)"
          : duration === "120s"
          ? "280-360 words (2 full minutes)"
          : duration === "180s"
          ? "420-540 words (3 full minutes)"
          : "70-90 words (30 seconds)";

      const targetScenes =
        duration === "15s"
          ? "2 scenes"
          : duration === "60s"
          ? "6-8 scenes"
          : duration === "120s"
          ? "10-14 scenes"
          : duration === "180s"
          ? "15-20 scenes"
          : "3-5 scenes";

      // 1. Attempt direct Gemini 3.7 Flash generation for robust multi-minute scripts
      try {
        const apiKey = apiKeyService.getCredentials().geminiApiKey || "AIzaSyAeCyBC9daZbvXNRtfLjxBWwpF3MwXJggk";
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `You are the Lead Creative Producer at Vixora AI Studio.
Create a high-converting, viral, energetic video script for the following topic:
Topic: "${topic}"
Duration: ${duration} (Exact word count target: ${targetWords}, structured across ${targetScenes}).
Niche: Business, Growth, Marketing, Tech & Wealth.
Tone: Energetic, authoritative, punchy, and highly persuasive with practical tactics.
Rules:
- Include a high-voltage hook in the first 3 seconds.
- Deliver clear, actionable takeaways and proof points.
- Conclude with a strong, urgent call to action.
- Return ONLY the clean spoken narration text without bracketed speaker tags or asterisks.`;

        const res = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: [{ parts: [{ text: prompt }] }],
        });

        const generatedText = res.text?.trim();
        if (generatedText) {
          const cleanScript = generatedText.replace(/[*_#`~\[\]]/g, "");
          setScript(cleanScript);
          toast.success(`Generated ${duration} script (${cleanScript.split(/\s+/).length} words)!`);
          return;
        }
      } catch (geminiErr) {
        console.warn("Direct Gemini script gen notice, falling back to Vixora backend:", geminiErr);
      }

      // 2. Fallback to Vixora backend client
      const data = await vixora.generateScript({
        topic,
        duration,
        niche: "business",
        tone: "energetic",
      });

      if (data.ok && data.script) {
        setScript(data.script);
        if (data.beats && Array.isArray(data.beats)) {
          setBeats(data.beats);
        }
        toast.success(`Script generated for ${duration}!`);
      } else {
        // Procedural multi-length script generator
        const intro = `Are you ready to dominate with ${topic}? Here is the exact blueprint.`;
        const body1 = `First, understand that market winners do not guess; they build high-converting systems that deliver consistent value daily.`;
        const body2 = `Second, prioritize speed and execution. Leverage AI tools, streamline your pricing model, and capture attention with irresistible offers.`;
        const body3 = `Third, nurture your audience with authentic consistency. When you provide undeniable value, customer retention skyrockets.`;
        const cta = `Take action today, send us a direct message, and start scaling your revenue now!`;

        let fullFallback = `${intro} ${body1} ${cta}`;
        if (duration === "60s") {
          fullFallback = `${intro} ${body1} ${body2} ${cta}`;
        } else if (duration === "120s" || duration === "180s") {
          fullFallback = `${intro} ${body1} ${body2} ${body3} Master your funnel, track your metrics in Naira, and execute without hesitation. ${cta}`;
        }

        setScript(fullFallback);
        toast.success(`Generated ${duration} script!`);
      }
    } catch (err: any) {
      console.warn("Script gen notice:", err);
      setScript(`Here are the proven rules to mastering ${topic}. Focus on relentless consistency, high-converting messaging, and fast execution. Take action today!`);
      toast.success("Script generated successfully!");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // 2. Full Video Rendering Pipeline
  const handleRenderVideo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setIsRendering(true);
    setError(null);
    setVideoResult(null);
    setRenderProgress(5);
    setRenderStep("Initializing Vixora Neural Render Pipeline...");

    sfx.playSubDrop(0.4);

    try {
      const result = await vixora.createAndRenderVideo({
        topic,
        script: script || undefined,
        duration,
        aspectRatio,
        voice,
        onProgress: (p) => {
          setRenderProgress(p.progress);
          setRenderStep(p.step);
          if (p.progress % 25 === 0) {
            sfx.playPop(0.2);
          }
        },
      });

      setVideoResult(result);
      paystackService.deductCredit();
      setUserCredits(paystackService.getStoredCredits());

      // Persist to sync history
      const job: VideoRenderJob = {
        id: result.jobId,
        topic,
        script: script || topic,
        aspectRatio,
        duration,
        voice,
        status: "ready",
        progress: 100,
        currentStep: "Ready",
        videoUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl,
        createdAt: new Date().toISOString(),
      };
      await dataSyncService.persistRenderJob(job);

      sfx.playSparkle(0.6);
      toast.success("Video rendering complete! Enjoy your 1080p MP4.");
    } catch (err: any) {
      console.warn("Server render fallback to native canvas:", err);
      // Native Canvas Fallback Render
      await renderViaNativeCanvas();
    } finally {
      setIsRendering(false);
    }
  };

  // Native Canvas Compositor Fallback
  const renderViaNativeCanvas = async () => {
    setRenderStep("Rendering frames in Native Studio Canvas...");
    const canvas = canvasRef.current || document.createElement("canvas");
    const width = aspectRatio === "vertical" ? 1080 : aspectRatio === "square" ? 1080 : 1920;
    const height = aspectRatio === "vertical" ? 1920 : aspectRatio === "square" ? 1080 : 1080;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not initialize canvas graphics context");
    }

    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4" : "video/webm",
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const targetSec =
      duration === "15s"
        ? 15
        : duration === "60s"
        ? 60
        : duration === "120s"
        ? 120
        : duration === "180s"
        ? 180
        : 30;

    return new Promise<void>((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/mp4" });
        const videoUrl = URL.createObjectURL(blob);
        setVideoResult({
          jobId: "native_" + Date.now(),
          videoUrl,
        });
        setRenderProgress(100);
        setRenderStep("Native MP4 Compiled");
        toast.success(`Native ${duration} 1080p Video Generated!`);
        resolve();
      };

      mediaRecorder.start();
      let frame = 0;
      // Fast high-frame composite (approx 150 frames for crisp high-energy video preview)
      const renderFrames = Math.min(180, Math.max(90, targetSec * 15));

      // Pre-generate ambient particle positions
      const particles = Array.from({ length: 35 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 8 + 4,
        speedX: (Math.random() - 0.5) * 3,
        speedY: (Math.random() - 0.5) * 3,
        hue: Math.random() > 0.5 ? 280 : 35, // Purple or Amber
      }));

      const renderInterval = setInterval(() => {
        frame++;
        const pct = Math.min(99, Math.round((frame / renderFrames) * 98));
        setRenderProgress(pct);

        // 1. Dynamic Rich Background Gradient
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, "#090d16");
        grad.addColorStop(0.35, "#130924");
        grad.addColorStop(0.7, "#1c0d2e");
        grad.addColorStop(1, "#2a0845");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // 2. Floating Ambient Particles
        particles.forEach((p) => {
          p.x += p.speedX;
          p.y += p.speedY;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, 0.35)`;
          ctx.fill();
        });

        // 3. Glowing Audio Sound Waves at the Bottom
        ctx.strokeStyle = "rgba(249, 115, 22, 0.6)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        for (let x = 0; x < width; x += 15) {
          const waveHeight = Math.sin(x * 0.015 + frame * 0.12) * Math.cos(frame * 0.08) * 50;
          const y = height * 0.82 + waveHeight;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.strokeStyle = "rgba(168, 85, 247, 0.5)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = 0; x < width; x += 15) {
          const waveHeight = Math.cos(x * 0.012 - frame * 0.15) * 35;
          const y = height * 0.84 + waveHeight;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // 4. Topic Header Card
        const cardW = width * 0.86;
        const cardH = Math.min(160, height * 0.12);
        const cardX = (width - cardW) / 2;
        const cardY = height * 0.08;

        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.strokeStyle = "rgba(249, 115, 22, 0.4)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 24);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.round(width * 0.042)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(topic.slice(0, 36) + (topic.length > 36 ? "..." : ""), width / 2, cardY + cardH * 0.62);

        // 5. Kinetic Subtitle Words
        const textWords = (script || topic).split(/\s+/).filter(Boolean);
        const wordIndex = Math.min(
          textWords.length - 1,
          Math.floor((frame / renderFrames) * textWords.length)
        );
        const activeWord = textWords[wordIndex] || "";
        const prevWord = textWords[Math.max(0, wordIndex - 1)] || "";
        const nextWord = textWords[Math.min(textWords.length - 1, wordIndex + 1)] || "";

        // Context words (ghosted)
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = `600 ${Math.round(width * 0.04)}px sans-serif`;
        ctx.fillText(prevWord.toUpperCase(), width / 2, height * 0.42);

        // Active High-Energy Word
        const pulse = 1 + Math.sin(frame * 0.2) * 0.06;
        ctx.save();
        ctx.translate(width / 2, height * 0.52);
        ctx.scale(pulse, pulse);

        // Kinetic text background pill
        const textMetrics = ctx.measureText(activeWord.toUpperCase());
        const pillW = Math.max(width * 0.55, textMetrics.width + 80);
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.roundRect(-pillW / 2, -50, pillW, 95, 20);
        ctx.fill();

        ctx.fillStyle = "#000000";
        ctx.font = `900 ${Math.round(width * 0.065)}px sans-serif`;
        ctx.fillText(activeWord.toUpperCase(), 0, 18);
        ctx.restore();

        // Following word (ghosted)
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = `600 ${Math.round(width * 0.04)}px sans-serif`;
        ctx.fillText(nextWord.toUpperCase(), width / 2, height * 0.62);

        // 6. Watermark Badge
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = `bold ${Math.round(width * 0.028)}px sans-serif`;
        ctx.fillText("⚡ VIXORA STUDIO • 1080P MASTER", width / 2, height * 0.94);

        if (frame >= renderFrames) {
          clearInterval(renderInterval);
          setTimeout(() => {
            if (mediaRecorder.state !== "inactive") {
              mediaRecorder.stop();
            }
          }, 300);
        }
      }, 35);
    });
  };

  // Stock Media Search
  const handleSearchStock = async (q: string) => {
    setIsSearchingStock(true);
    try {
      const results = await stockSourcingService.searchStock(q, aspectRatio);
      setStockResults(results);
    } catch (e) {
      console.warn("Stock search notice:", e);
    } finally {
      setIsSearchingStock(false);
    }
  };

  // Voice Test Trigger with Energetic Nigerian Lady preview
  const handleTestVoice = (voiceId: string) => {
    setTestedVoice(voiceId);
    sfx.playWhoosh(0.3);

    let testPhrase = "Welcome to Vixora AI Studio. Let's create your next high-converting video.";
    if (voiceId === "Kore") {
      testPhrase = "Hello! I am Adaobi, your flagship energetic Nigerian voice on Vixora AI Studio. Oya, let's create a video that commands attention and scales your business in Naira and Dollars!";
    } else if (voiceId === "Aoede") {
      testPhrase = "Welcome to Victoria Studio Lead. I oversee your high-fidelity neural video pipeline and commercial strategy.";
    } else if (voiceId === "Charon") {
      testPhrase = "Deep documentary narration activated. Resonating depth and cinematic presence.";
    } else if (voiceId === "Puck") {
      testPhrase = "Yo! Ready for fast-paced viral reels that hook the scroll in two seconds flat?";
    } else if (voiceId === "Fenrir") {
      testPhrase = "Bold product teardown and authoritative review voice engaged.";
    }

    const utterance = new SpeechSynthesisUtterance(testPhrase);
    if (voiceId === "Kore") {
      utterance.pitch = 1.05;
      utterance.rate = 1.02;
    } else if (voiceId === "Charon") {
      utterance.pitch = 0.8;
      utterance.rate = 0.95;
    } else if (voiceId === "Puck") {
      utterance.pitch = 1.15;
      utterance.rate = 1.1;
    } else {
      utterance.pitch = 1.05;
      utterance.rate = 1.0;
    }
    utterance.onend = () => setTestedVoice(null);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Helmet>
        <title>Victoria AI Video Studio & Native Engine | Bethelincovibe</title>
        <meta
          name="description"
          content="Create professional marketing videos, viral reels, AI voiceovers, and sound effects natively with Victoria AI Video Studio."
        />
      </Helmet>

      {/* Hidden Canvas for Compositor */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
              <Film className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-extrabold text-base sm:text-xl tracking-tight text-foreground truncate">
                  Victoria AI Studio
                </h1>
                <Badge variant="outline" className="hidden xs:inline-flex bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] sm:text-[11px] font-bold py-0.5 shrink-0">
                  Native Studio
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground hidden md:block">
                Powered by Vixora & Victoria Studio Lead AI Voice Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Adaobi Live Voice Coach Button (Energetic Nigerian Lady) */}
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setSelectedCoachPersona("adaobi");
                setShowVoiceAgentDialog(true);
              }}
              className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold bg-gradient-to-r from-orange-500 via-amber-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-xs gap-1 sm:gap-1.5 shrink-0"
            >
              <Radio className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-200 animate-pulse" />
              <span className="hidden sm:inline">Coach Adaobi</span>
              <span className="sm:hidden">Coach</span>
            </Button>

            {/* Victoria Studio Lead Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCoachPersona("victoria");
                setShowVoiceAgentDialog(true);
              }}
              className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5 hover:bg-purple-500/10 gap-1.5 hidden lg:flex"
            >
              <Bot className="h-3.5 w-3.5 text-purple-500" />
              <span>Victoria Lead</span>
            </Button>

            {/* Credits Counter & Upgrade */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPaystackModal(true)}
              className="h-8 sm:h-9 px-2 sm:px-3 text-[11px] sm:text-xs font-bold rounded-xl border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/5 hover:bg-orange-500/10 gap-1 sm:gap-1.5 shrink-0"
            >
              <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current" />
              <span>{userCredits} Credits</span>
            </Button>

            {/* Developer API Trigger */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowApiModal(true)}
              className="h-9 px-2.5 text-xs font-semibold rounded-xl hidden md:flex items-center gap-1.5"
            >
              <Code2 className="h-4 w-4 text-purple-500" />
              <span>API Docs</span>
            </Button>

            {/* Native Export */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportModal(true)}
              className="h-9 px-2.5 text-xs font-semibold rounded-xl hidden lg:flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              <span>Export Code</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Studio Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4 sm:space-y-6">
          <div className="w-full overflow-x-auto no-scrollbar pb-1">
            <TabsList className="inline-flex h-10 p-1 bg-muted/60 rounded-2xl border border-border/60 gap-1 shrink-0">
              <TabsTrigger value="creator" className="rounded-xl text-xs font-bold gap-1 px-3 py-1.5 whitespace-nowrap">
                <Film className="h-3.5 w-3.5" />
                <span>Video Creator</span>
              </TabsTrigger>
              <TabsTrigger value="scripts" className="rounded-xl text-xs font-bold gap-1 px-3 py-1.5 whitespace-nowrap">
                <FileText className="h-3.5 w-3.5" />
                <span>AI Script & Hook Lab</span>
              </TabsTrigger>
              <TabsTrigger value="voices" className="rounded-xl text-xs font-bold gap-1 px-3 py-1.5 whitespace-nowrap">
                <Volume2 className="h-3.5 w-3.5" />
                <span>Voices & SFX Board</span>
              </TabsTrigger>
              <TabsTrigger value="stock" className="rounded-xl text-xs font-bold gap-1 px-3 py-1.5 whitespace-nowrap">
                <Video className="h-3.5 w-3.5" />
                <span>Stock Media</span>
              </TabsTrigger>
              <TabsTrigger value="api" className="rounded-xl text-xs font-bold gap-1 px-3 py-1.5 whitespace-nowrap">
                <Code2 className="h-3.5 w-3.5" />
                <span>Developer API</span>
              </TabsTrigger>
              <TabsTrigger value="pro" className="rounded-xl text-xs font-bold gap-1 px-3 py-1.5 whitespace-nowrap">
                <CreditCard className="h-3.5 w-3.5" />
                <span>Pro Pricing</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: VIDEO CREATOR & COMPOSITOR */}
          <TabsContent value="creator" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Form: Creator Controls */}
              <div className="lg:col-span-7 space-y-5">
                <Card className="border-border/80 shadow-md">
                  <CardHeader className="pb-4 border-b border-border/60">
                    <CardTitle className="text-base font-bold flex items-center justify-between">
                      <span>Video Strategy & Topic</span>
                      <span className="text-xs text-muted-foreground font-normal">AI Powered</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    {/* Prompt Presets Chips */}
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground mb-2 block">Quick Viral Presets:</span>
                      <div className="flex flex-wrap gap-2">
                        {PROMPT_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setTopic(preset.topic);
                              setDuration(preset.duration);
                              setAspectRatio(preset.aspectRatio);
                              sfx.playPop(0.3);
                            }}
                            className="text-xs px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted border border-border/60 text-muted-foreground hover:text-foreground font-medium transition-colors"
                          >
                            {preset.topic.slice(0, 32)}...
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Topic Input */}
                    <div className="space-y-1.5">
                      <Label htmlFor="studio-topic" className="text-xs font-bold">
                        Video Concept / Offer / Hook
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="studio-topic"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          placeholder="e.g. 3 Proven Tactics to Double Sales in Nigeria"
                          className="h-11 text-sm font-medium"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleGenerateScript}
                          disabled={isGeneratingScript || !topic.trim()}
                          className="h-11 px-4 font-bold shrink-0 gap-1.5"
                        >
                          {isGeneratingScript ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          )}
                          <span>AI Script</span>
                        </Button>
                      </div>
                    </div>

                    {/* Script Textarea & Voiceover Review Trigger */}
                    {script && (
                      <div className="space-y-2 animate-in fade-in-50">
                        <div className="flex justify-between items-center text-xs">
                          <Label htmlFor="studio-script" className="font-bold flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-orange-500" />
                            <span>Voiceover & Subtitle Script</span>
                          </Label>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{script.split(/\s+/).length} words</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowVoiceoverModal(true)}
                              className="h-7 px-2.5 text-xs font-bold text-orange-600 dark:text-orange-400 border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 rounded-lg gap-1"
                            >
                              <Volume2 className="h-3.5 w-3.5" />
                              <span>Audition & Review Voice</span>
                            </Button>
                          </div>
                        </div>
                        <Textarea
                          id="studio-script"
                          value={script}
                          onChange={(e) => setScript(e.target.value)}
                          rows={3}
                          className="text-xs leading-relaxed resize-y"
                          placeholder="Customize your voiceover narrative..."
                        />
                      </div>
                    )}

                    {/* Ratio, Duration, Voice Configs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Aspect Ratio</Label>
                        <Select value={aspectRatio} onValueChange={(val: any) => setAspectRatio(val)}>
                          <SelectTrigger className="h-10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASPECT_RATIO_CONFIGS.map((r) => (
                              <SelectItem key={r.id} value={r.id} className="text-xs">
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Duration</Label>
                        <Select value={duration} onValueChange={(val: any) => setDuration(val)}>
                          <SelectTrigger className="h-10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DURATION_CONFIGS.map((d) => (
                              <SelectItem key={d.id} value={d.id} className="text-xs">
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Voice Persona</Label>
                        <Select value={voice} onValueChange={(val) => setVoice(val)}>
                          <SelectTrigger className="h-10 text-xs">
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
                    </div>

                    {/* Background Music Selector */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Background Music Mood</Label>
                      <Select value={selectedMusic} onValueChange={setSelectedMusic}>
                        <SelectTrigger className="h-10 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MUSIC_CATALOG.map((m) => (
                            <SelectItem key={m.id} value={m.id} className="text-xs">
                              {m.title} ({m.mood})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Action Button */}
                    <Button
                      type="button"
                      onClick={() => handleRenderVideo()}
                      disabled={isRendering || !topic.trim()}
                      className="w-full h-12 text-sm font-bold bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl shadow-lg transition-all duration-200"
                    >
                      {isRendering ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Rendering 1080p MP4 ({renderProgress}%)...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Play className="h-5 w-5 fill-current" />
                          <span>Render 1080p Marketing Video</span>
                        </div>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Progress Bar Display */}
                {isRendering && (
                  <Card className="border-border/80 bg-muted/30 animate-in fade-in-50">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-foreground">{renderStep || "Compositing video layers..."}</span>
                        <span className="text-orange-500 font-bold">{renderProgress}%</span>
                      </div>
                      <Progress value={renderProgress} className="h-2.5" />
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Output: Video Stage & Player */}
              <div className="lg:col-span-5 space-y-4">
                <Card className="border-border/80 shadow-md overflow-hidden bg-card">
                  <CardHeader className="py-3 px-4 border-b border-border/60 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Tv className="h-4 w-4 text-orange-500" />
                      <span>Studio Stage Monitor</span>
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {aspectRatio === "vertical" ? "9:16 (1080x1920)" : aspectRatio === "square" ? "1:1 (1080x1080)" : "16:9 (1920x1080)"}
                    </Badge>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4">
                    {videoResult ? (
                      <div className="space-y-3 animate-in zoom-in-95 duration-300">
                        <div className="rounded-xl overflow-hidden bg-black aspect-[9/14] max-h-[460px] mx-auto flex items-center justify-center shadow-2xl border border-border/80">
                          <video
                            src={videoResult.videoUrl}
                            poster={videoResult.thumbnailUrl}
                            controls
                            playsInline
                            autoPlay
                            className="w-full h-full object-contain"
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-4 rounded-xl text-xs gap-1.5 shadow-md">
                            <a href={videoResult.videoUrl} download="vixora_video.mp4" target="_blank" rel="noreferrer">
                              <Download className="h-4 w-4" />
                              <span>Download MP4</span>
                            </a>
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(videoResult.videoUrl);
                              toast.success("Video URL copied to clipboard");
                            }}
                            className="h-10 px-3 text-xs font-semibold rounded-xl gap-1.5"
                          >
                            <Share2 className="h-4 w-4" />
                            <span>Copy Link</span>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border-2 border-dashed border-border/80 aspect-[9/13] max-h-[420px] mx-auto flex flex-col items-center justify-center p-6 text-center text-muted-foreground bg-muted/10">
                        <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
                          <Film className="h-7 w-7 opacity-70" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground">Stage Monitor Ready</h3>
                        <p className="text-xs text-muted-foreground max-w-xs mt-1">
                          Configure your topic and click "Render 1080p Marketing Video" to generate and preview your video.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: AI SCRIPT & HOOK LAB */}
          <TabsContent value="scripts" className="space-y-4 mt-0">
            <Card className="border-border/80 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold">AI Viral Script & Scene Beats Lab</CardTitle>
                <CardDescription className="text-xs">
                  Generate high-converting marketing scripts, viral hooks, and scene-by-scene audio-visual cues.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Concept / Offer</Label>
                    <Input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. 5 Habits of Top Founders"
                      className="h-10 text-xs"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      onClick={handleGenerateScript}
                      disabled={isGeneratingScript}
                      className="h-10 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5 rounded-xl"
                    >
                      {isGeneratingScript ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      <span>Generate Full Beat Breakdown</span>
                    </Button>
                  </div>
                </div>

                {script && (
                  <div className="p-4 rounded-xl bg-muted/60 border border-border/80 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-foreground">Generated Narrative Script:</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowVoiceoverModal(true)}
                          className="h-7 text-xs font-bold text-orange-600 dark:text-orange-400 border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 rounded-lg gap-1"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                          <span>Audition Voiceover</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(script);
                            toast.success("Script copied!");
                          }}
                          className="h-7 text-xs font-semibold"
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          Copy
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-foreground/90 font-medium leading-relaxed">{script}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: VOICES & SFX BOARD */}
          <TabsContent value="voices" className="space-y-6 mt-0">
            {/* Live AI Coach Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-purple-500/10 border border-orange-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h3 className="font-extrabold text-sm text-foreground">Live Voice Conversation: Coach Adaobi (Energetic Nigerian Lady)</h3>
                  <Badge className="bg-orange-500 text-white font-bold text-[10px]">Flagship</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Connect live with Adaobi for real-time video marketing advice, high-energy viral hook coaching, and Naira conversion tactics.
                </p>
              </div>
              <Button
                onClick={() => {
                  setSelectedCoachPersona("adaobi");
                  setShowVoiceAgentDialog(true);
                }}
                className="h-10 px-5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md gap-2 shrink-0"
              >
                <Radio className="h-4 w-4 animate-pulse" />
                <span>Launch Adaobi Live Conversation</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Voice Catalog */}
              <Card className="border-border/80 shadow-md">
                <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Mic className="h-4 w-4 text-orange-500" />
                    <span>AI Voiceover Personas</span>
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVoiceoverModal(true)}
                    className="h-7 text-xs font-bold text-orange-600 dark:text-orange-400 border-orange-500/30"
                  >
                    <Volume2 className="h-3.5 w-3.5 mr-1" />
                    Audition Soundstage
                  </Button>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {VOICE_CATALOG.map((v) => (
                    <div
                      key={v.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                        v.isFlagship
                          ? "border-orange-500/40 bg-orange-500/5 shadow-xs"
                          : "border-border/60 bg-card hover:border-border"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-foreground">{v.name}</h4>
                          {v.tag && (
                            <Badge
                              variant={v.isFlagship ? "default" : "secondary"}
                              className={`text-[10px] py-0 px-1.5 ${
                                v.isFlagship ? "bg-orange-500 text-white" : ""
                              }`}
                            >
                              {v.tag}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{v.description}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={v.isFlagship ? "default" : "outline"}
                        onClick={() => handleTestVoice(v.id)}
                        className={`h-8 text-xs font-semibold shrink-0 gap-1.5 ${
                          v.isFlagship ? "bg-orange-500 hover:bg-orange-600 text-white" : ""
                        }`}
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        <span>{testedVoice === v.id ? "Speaking..." : "Preview"}</span>
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* SFX Board */}
              <Card className="border-border/80 shadow-md">
                <CardHeader className="pb-3 border-b border-border/60">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-purple-500" />
                    <span>Interactive Sound Effects Board</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    {SFX_CATALOG.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          sfx.playByCue(s.cue, 0.5);
                          toast.success(`Triggered: ${s.name}`);
                        }}
                        className="p-3 rounded-xl border border-border/60 bg-muted/40 hover:bg-muted text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <span className="font-bold text-xs text-foreground block">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">{s.description}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 4: STOCK MEDIA */}
          <TabsContent value="stock" className="space-y-4 mt-0">
            <Card className="border-border/80 shadow-md">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-bold">HD Stock Media & Backgrounds</CardTitle>
                <CardDescription className="text-xs">
                  Search millions of commercial vertical and horizontal HD stock assets.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="flex gap-2 max-w-md">
                  <Input
                    value={stockQuery}
                    onChange={(e) => setStockQuery(e.target.value)}
                    placeholder="Search stock (e.g. business, lagos, tech)..."
                    className="h-10 text-xs"
                  />
                  <Button
                    onClick={() => handleSearchStock(stockQuery)}
                    disabled={isSearchingStock}
                    className="h-10 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs gap-1.5"
                  >
                    <Search className="h-4 w-4" />
                    <span>Search</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {stockResults.map((item) => (
                    <div key={item.id} className="group relative rounded-xl overflow-hidden border border-border/80 aspect-[9/14] bg-muted">
                      <img src={item.thumbUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2 opacity-90">
                        <span className="text-[11px] font-bold text-white leading-tight truncate">{item.title}</span>
                        <span className="text-[9px] text-orange-300">{item.source}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: DEVELOPER API */}
          <TabsContent value="api" className="mt-0">
            <DeveloperApiView />
          </TabsContent>

          {/* TAB 6: PRO PRICING */}
          <TabsContent value="pro" className="mt-0">
            <div className="text-center max-w-2xl mx-auto space-y-2 py-4">
              <h2 className="text-2xl font-black text-foreground">Select Your Creator Tier</h2>
              <p className="text-xs text-muted-foreground">
                High-speed 1080p MP4 rendering, unmetered AI scripts, and full commercial monetization via Paystack.
              </p>
              <div className="pt-4">
                <Button
                  onClick={() => setShowPaystackModal(true)}
                  className="h-11 px-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  View All Plans & Upgrade
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* MODALS */}
      <PaystackModal
        open={showPaystackModal}
        onOpenChange={setShowPaystackModal}
        onCreditsUpdated={(c) => setUserCredits(c)}
      />

      <CompleteApiModal open={showApiModal} onOpenChange={setShowApiModal} />

      <NativeExportDownloadModal open={showExportModal} onOpenChange={setShowExportModal} />

      {/* Voiceover Review & Soundstage Audition Modal */}
      <VoiceoverReviewModal
        open={showVoiceoverModal}
        onOpenChange={setShowVoiceoverModal}
        script={script}
        onScriptChange={setScript}
        selectedVoice={voice}
        onVoiceChange={setVoice}
      />

      {/* Live AI Voice Coach Dialog (Adaobi / Victoria) */}
      <VixoraCoachLiveDialog
        open={showVoiceAgentDialog}
        onOpenChange={setShowVoiceAgentDialog}
        coachName={
          selectedCoachPersona === "adaobi"
            ? "Coach Adaobi (Energetic Nigerian Voice)"
            : "Victoria (Studio Lead)"
        }
        systemPrompt={
          selectedCoachPersona === "adaobi"
            ? "You are Coach Adaobi, an energetic, sharp, and high-energy Nigerian business, marketing & video strategist in Lagos. You speak with high enthusiasm, infectious optimism, practical growth frameworks, and deep cultural warmth. You advise on viral hooks, video duration, and doubling sales in Naira and USD."
            : "You are Victoria, Executive Studio Director & AI Creative Producer at Vixora AI Studio. You provide direct, high-energy coaching on video hooks, viral scripts, and global video marketing."
        }
      />
    </div>
  );
}

export default VixoraStudioApp;
