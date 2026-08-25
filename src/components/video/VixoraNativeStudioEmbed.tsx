import React, { useState, useEffect } from "react";
import { vixora } from "@/services/vixoraClient";
import { Sparkles, Film, Loader2, Download, CheckCircle2, AlertCircle, Play, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export interface VixoraNativeStudioEmbedProps {
  currentUser?: {
    id: string;
    email: string;
    name?: string;
    fullName?: string;
  } | null;
}

export function VixoraNativeStudioEmbed({ currentUser }: VixoraNativeStudioEmbedProps) {
  const [topic, setTopic] = useState("3 Daily Habits for Peak Energy & Business Growth");
  const [script, setScript] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"vertical" | "square" | "horizontal">("vertical");
  const [duration, setDuration] = useState<"15s" | "30s" | "60s">("15s");
  const [voice, setVoice] = useState("Kore");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isWritingScript, setIsWritingScript] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepText, setStepText] = useState("");
  const [videoResult, setVideoResult] = useState<{
    jobId: string;
    videoUrl: string;
    thumbnailUrl?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-sync logged-in website user on mount (Single Sign-On)
  useEffect(() => {
    if (currentUser?.id && currentUser?.email) {
      vixora
        .syncUserSession({
          userId: currentUser.id,
          email: currentUser.email,
          fullName: currentUser.name || currentUser.fullName,
        })
        .catch((err) => console.warn("Vixora SSO auto-sync notice:", err));
    }
  }, [currentUser]);

  // AI Script Generation Handler
  const handleGenerateScript = async () => {
    if (!topic.trim()) return;
    setIsWritingScript(true);
    setError(null);
    try {
      const data = await vixora.generateScript({ topic, duration, niche: "general", tone: "engaging" });
      if (data.ok && data.script) {
        setScript(data.script);
      } else {
        setError(data.error || "Could not generate script from server.");
      }
    } catch (err: any) {
      setError("Failed to auto-write script: " + (err.message || "Network issue"));
    } finally {
      setIsWritingScript(false);
    }
  };

  // Full Video Render Handler
  const handleRenderVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsGenerating(true);
    setError(null);
    setVideoResult(null);
    setProgress(5);
    setStepText("Initializing video pipeline & cloud render farm...");

    try {
      const result = await vixora.createAndRenderVideo({
        topic,
        script: script || undefined,
        duration,
        aspectRatio,
        voice,
        onProgress: (p) => {
          setProgress(p.progress);
          setStepText(p.step);
        },
      });
      setVideoResult(result);
    } catch (err: any) {
      setError(err.message || "An error occurred during video creation");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-xl border-border/80 bg-card overflow-hidden">
      <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Vixora AI Video Creator</CardTitle>
              <CardDescription className="text-xs">Native Universal Studio Engine</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 text-xs py-0.5 font-semibold">
            Cloud Synced
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-5">
        <form onSubmit={handleRenderVideo} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vixora-topic" className="text-sm font-semibold">
              Topic or Marketing Concept
            </Label>
            <div className="flex gap-2">
              <Input
                id="vixora-topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. 5 Habits of Highly Successful Founders"
                required
                className="h-11"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleGenerateScript}
                disabled={isWritingScript || !topic.trim()}
                className="h-11 px-4 font-semibold shrink-0 gap-1.5"
              >
                {isWritingScript ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Writing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span>AI Script</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {script && (
            <div className="space-y-2 animate-in fade-in-50 duration-200">
              <Label htmlFor="vixora-script" className="text-sm font-semibold flex items-center justify-between">
                <span>Generated Voiceover Script</span>
                <span className="text-xs text-muted-foreground font-normal">{script.split(/\s+/).length} words</span>
              </Label>
              <Textarea
                id="vixora-script"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                rows={3}
                className="resize-y text-sm font-normal leading-relaxed"
                placeholder="Edit or customize your voiceover script here..."
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Format / Ratio</Label>
              <Select value={aspectRatio} onValueChange={(val: any) => setAspectRatio(val)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Aspect Ratio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vertical">9:16 (Reels/TikTok)</SelectItem>
                  <SelectItem value="square">1:1 (Feed/Square)</SelectItem>
                  <SelectItem value="horizontal">16:9 (Landscape)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Target Duration</Label>
              <Select value={duration} onValueChange={(val: any) => setDuration(val)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15s">15 Seconds</SelectItem>
                  <SelectItem value="30s">30 Seconds</SelectItem>
                  <SelectItem value="60s">60 Seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">AI Voice</Label>
              <Select value={voice} onValueChange={(val) => setVoice(val)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Voice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kore">Adaobi (Kore Voice)</SelectItem>
                  <SelectItem value="Aoede">Victoria (Studio Lead)</SelectItem>
                  <SelectItem value="Puck">Puck (Viral Upbeat)</SelectItem>
                  <SelectItem value="Charon">Charon (Cinematic Deep)</SelectItem>
                  <SelectItem value="Fenrir">Fenrir (Bold Reviewer)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isGenerating || !topic.trim()}
            className="w-full h-12 text-base font-bold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-md transition-all duration-200"
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Rendering ({progress}%)...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 fill-current" />
                <span>Generate Video Now</span>
              </div>
            )}
          </Button>
        </form>

        {/* Real-Time Generation Progress */}
        {isGenerating && (
          <div className="space-y-2 p-4 rounded-xl bg-muted/40 border border-border/60 animate-in fade-in-50">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-foreground">{stepText || "Synthesizing assets & rendering frames..."}</span>
              <span className="text-orange-600 dark:text-orange-400">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2.5 bg-muted" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="flex-1 leading-relaxed">{error}</p>
          </div>
        )}

        {/* Rendered Video Player */}
        {videoResult && (
          <div className="space-y-3 pt-2 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Generated Video Ready:
              </h3>
              <span className="text-xs text-muted-foreground">MP4 H.264</span>
            </div>

            <div className="rounded-xl overflow-hidden bg-black shadow-lg border border-border/60 aspect-video flex items-center justify-center">
              <video
                src={videoResult.videoUrl}
                poster={videoResult.thumbnailUrl}
                controls
                playsInline
                autoPlay
                className="w-full h-full max-h-[380px] object-contain"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <Button asChild variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-5 gap-2 rounded-xl shadow-xs">
                <a href={videoResult.videoUrl} download="vixora_generated_video.mp4" target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4" />
                  <span>Download MP4 Video</span>
                </a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default VixoraNativeStudioEmbed;
