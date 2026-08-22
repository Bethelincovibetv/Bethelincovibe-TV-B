import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tv, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^?&\s]+)/
  );
  return match ? match[1] : null;
}

interface TVFrameProps {
  placement: "home" | "about";
}

export default function TVFrame({ placement }: TVFrameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data: videos } = useQuery({
    queryKey: ["tv-videos", placement],
    queryFn: async () => {
      const { data } = await supabase
        .from("tv_videos")
        .select("*")
        .eq("active", true)
        .or(`placement.eq.${placement},placement.eq.both`)
        .order("display_order", { ascending: true });
      return data ?? [];
    },
  });

  const validVideos = (videos || []).filter((v) => extractYouTubeId(v.youtube_url));

  const next = useCallback(() => {
    if (validVideos.length > 1) {
      setIsPlaying(false);
      setCurrentIndex((i) => (i + 1) % validVideos.length);
    }
  }, [validVideos.length]);

  const prev = useCallback(() => {
    if (validVideos.length > 1) {
      setIsPlaying(false);
      setCurrentIndex((i) => (i - 1 + validVideos.length) % validVideos.length);
    }
  }, [validVideos.length]);

  // Listen to YouTube iframe player state to pause auto-cycle while playing
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (typeof e.data !== "string") return;
      try {
        const data = JSON.parse(e.data);
        if (data.event === "onStateChange") {
          // 1 = playing, 3 = buffering; 0 = ended, 2 = paused
          if (data.info === 1 || data.info === 3) setIsPlaying(true);
          else if (data.info === 0) { setIsPlaying(false); setCurrentIndex((i) => (validVideos.length > 1 ? (i + 1) % validVideos.length : i)); }
          else setIsPlaying(false);
        }
      } catch {}
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [validVideos.length]);

  // Register listener with the YT iframe once loaded
  const handleIframeLoad = () => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "listening" }),
      "*"
    );
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }),
      "*"
    );
  };

  // Auto-cycle every 30 seconds, but only when NOT playing
  useEffect(() => {
    if (validVideos.length <= 1 || isPlaying) return;
    const timer = setInterval(next, 30000);
    return () => clearInterval(timer);
  }, [next, validVideos.length, isPlaying]);

  // Reset index if videos change
  useEffect(() => {
    if (currentIndex >= validVideos.length) setCurrentIndex(0);
  }, [validVideos.length, currentIndex]);

  if (validVideos.length === 0) return null;

  const video = validVideos[currentIndex];
  const videoId = extractYouTubeId(video.youtube_url);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-full max-w-2xl mx-auto">
        <div className="bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 rounded-2xl p-3 shadow-2xl">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Tv className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold tracking-widest text-primary uppercase">
              Bethelincovibe TV
            </span>
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          </div>

          <div className="relative bg-black rounded-lg overflow-hidden border-2 border-zinc-600 shadow-inner">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent z-10 pointer-events-none" />
            <div className="aspect-video w-full">
              <iframe
                key={videoId}
                ref={iframeRef}
                src={`https://www.youtube.com/embed/${videoId}?rel=0&enablejsapi=1`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
                loading="lazy"
                onLoad={handleIframeLoad}
              />
            </div>

            {/* Navigation arrows */}
            {validVideos.length > 1 && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute left-1 top-1/2 -translate-y-1/2 z-20 h-8 w-8 bg-black/50 hover:bg-black/70 text-white rounded-full"
                  onClick={prev}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 z-20 h-8 w-8 bg-black/50 hover:bg-black/70 text-white rounded-full"
                  onClick={next}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 mt-2">
            {validVideos.length > 1 ? (
              validVideos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${i === currentIndex ? "bg-primary" : "bg-zinc-500"}`}
                />
              ))
            ) : (
              <>
                <div className="h-1 w-8 rounded-full bg-zinc-600" />
                <div className="h-2 w-2 rounded-full bg-zinc-500" />
                <div className="h-1 w-8 rounded-full bg-zinc-600" />
              </>
            )}
          </div>
        </div>

        <div className="flex justify-center">
          <div className="w-16 h-4 bg-gradient-to-b from-zinc-800 to-zinc-700 rounded-b-sm" />
        </div>
        <div className="flex justify-center -mt-px">
          <div className="w-32 h-2 bg-gradient-to-b from-zinc-700 to-zinc-600 rounded-b-lg" />
        </div>
      </div>

      {video.title && (
        <p className="text-sm font-medium text-muted-foreground text-center">
          {video.title}
          {validVideos.length > 1 && (
            <span className="text-xs ml-2 opacity-60">
              {currentIndex + 1}/{validVideos.length}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
