import { Helmet } from "react-helmet-async";
import NativeVideoCreator from "@/components/video/NativeVideoCreator";
import { Film, Sparkles, CheckCircle2, Zap, Share2, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function VideoCreator() {
  return (
    <div className="min-h-screen bg-background pb-16">
      <Helmet>
        <title>AI Video Creator Studio | Bethelincovibe TV</title>
        <meta
          name="description"
          content="Generate engaging promotional videos, TikTok reels, and YouTube shorts natively powered by the Vixora video creation engine."
        />
      </Helmet>

      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background pt-8 pb-6 border-b">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                Vixora Native Video Studio
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                Create Professional Marketing Videos in Seconds
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 max-w-2xl">
                Turn your business concepts or scripts into high-impact vertical reels, square posts, and widescreen TV videos with AI voiceover.
              </p>
            </div>

            {/* Quick feature badges */}
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-card border shadow-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>15s, 30s & 60s clips</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-card border shadow-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Kore & Pro Voices</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-card border shadow-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>9:16, 1:1, 16:9 formats</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-card border shadow-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Native MP4 Export</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Container */}
      <div className="container mx-auto px-4 max-w-6xl mt-8">
        <NativeVideoCreator />
      </div>
    </div>
  );
}
