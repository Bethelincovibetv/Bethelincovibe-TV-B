import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import NativeVideoCreator from "@/components/video/NativeVideoCreator";
import VixoraStudioApp from "@/vixora/App";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Clapperboard } from "lucide-react";
import FrontendSpecialistWidget from "@/components/ai/FrontendSpecialistWidget";
import SEO from "@/components/SEO";
import { PAGE_OG_IMAGES, SITE_NAME } from "@/lib/seo";

export default function VideoCreator() {
  const [searchParams] = useSearchParams();
  const topicParam = searchParams.get("topic") || "";
  const [studioMode, setStudioMode] = useState<"creator" | "timeline">("creator");

  return (
    <div className="min-h-screen bg-background pb-12">
      <SEO
        title={`AI Video Studio & Commercial Reels Creator | ${SITE_NAME}`}
        description="Generate high-converting marketing reels, promotional TikTok/Instagram short videos, voiceovers and motion animations with AI."
        url="/video-creator"
        type="website"
        image={PAGE_OG_IMAGES.video()}
      />
      <div className="container mx-auto px-4 pt-4 max-w-7xl space-y-4">
        <div className="flex items-center justify-between gap-4 pb-3 border-b">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-600 via-pink-600 to-amber-500 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none text-foreground">
                AI Video Studio & Creator
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Generate high-converting marketing reels, scene animations, voiceovers & canvas videos.
              </p>
            </div>
          </div>

          <Tabs value={studioMode} onValueChange={(v) => setStudioMode(v as any)}>
            <TabsList className="h-9 p-1 rounded-xl bg-muted">
              <TabsTrigger value="creator" className="text-xs font-bold gap-1.5 rounded-lg">
                <Sparkles className="h-3.5 w-3.5" />
                AI Video Generator
              </TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs font-bold gap-1.5 rounded-lg">
                <Clapperboard className="h-3.5 w-3.5" />
                Vixora Timeline Editor
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Video Production AI Specialist Assistant */}
        <FrontendSpecialistWidget
          agentId="content_ai"
          mode="banner"
          title="Lead Video Producer & Storyboard Director"
          subtitle="Brainstorm 30-second reel hooks, viral script narration, and cinematic visual scene cues."
          initialOpen={false}
          contextData={{
            page: "video_creator",
            mode: studioMode,
            currentTopic: topicParam,
          }}
          customPrompts={[
            "Draft a 30-Second Viral Video Script for a Product Launch",
            "Write a High-Energy Hook for TikTok / Instagram Reels",
            "Generate Scene-by-Scene Visual Prompts for AI Video",
            "Suggest Voiceover Narration with Nigerian English Cadence"
          ]}
        />

        {studioMode === "creator" ? (
          <NativeVideoCreator initialTopic={topicParam} />
        ) : (
          <VixoraStudioApp initialTopic={topicParam} />
        )}
      </div>
    </div>
  );
}



