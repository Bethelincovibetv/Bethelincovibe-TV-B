import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Mic } from "lucide-react";

interface VoiceNotePlayerProps {
  audioUrl: string;
  duration?: number; // duration in seconds
  isOutgoing?: boolean;
  avatarUrl?: string;
  senderName?: string;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  audioUrl,
  duration = 5,
  isOutgoing = false,
  avatarUrl,
  senderName,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const [audioDuration, setAudioDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate static pseudo-random waveform bars for realistic WhatsApp visualizer
  const waveformBars = useRef<number[]>(
    Array.from({ length: 28 }, (_, i) => {
      const v = Math.sin(i * 0.45) * 0.4 + Math.cos(i * 0.9) * 0.35 + 0.55;
      return Math.max(0.18, Math.min(1, v));
    })
  ).current;

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      }
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleCycleSpeed = () => {
    const nextRate: 1 | 1.5 | 2 = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = pct * audioDuration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progressPct = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="flex items-center gap-3 py-1 px-1 min-w-[240px] max-w-[320px]">
      {/* Sender Avatar with Mic Overlay */}
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-full bg-emerald-600/20 text-emerald-600 flex items-center justify-center font-bold text-xs overflow-hidden border border-emerald-500/30">
          {avatarUrl ? (
            <img src={avatarUrl} alt={senderName || "User"} className="w-full h-full object-cover" />
          ) : (
            <span>{senderName?.charAt(0)?.toUpperCase() || "U"}</span>
          )}
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
          <Mic className="w-2.5 h-2.5" />
        </div>
      </div>

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        type="button"
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 ${
          isOutgoing
            ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
            : "bg-emerald-600/90 text-white hover:bg-emerald-700 shadow-xs"
        }`}
        title={isPlaying ? "Pause" : "Play Voice Note"}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      {/* Waveform & Scrubber */}
      <div className="flex-1 min-w-0 space-y-1">
        <div
          onClick={handleSeek}
          className="flex items-center gap-[2.5px] h-6 cursor-pointer relative py-1"
          title="Click to seek"
        >
          {waveformBars.map((h, i) => {
            const barPct = (i / waveformBars.length) * 100;
            const isPlayed = barPct <= progressPct;
            return (
              <span
                key={i}
                className={`w-[2.5px] rounded-full transition-colors ${
                  isPlayed
                    ? isOutgoing
                      ? "bg-emerald-700 dark:bg-emerald-400"
                      : "bg-emerald-600 dark:bg-emerald-400"
                    : isOutgoing
                    ? "bg-emerald-950/25 dark:bg-white/30"
                    : "bg-muted-foreground/30 dark:bg-white/20"
                }`}
                style={{ height: `${Math.round(h * 18 + 4)}px` }}
              />
            );
          })}
        </div>

        {/* Duration & Speed multiplier */}
        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground/90">
          <span>{isPlaying ? formatTime(currentTime) : formatTime(audioDuration)}</span>
          <button
            onClick={handleCycleSpeed}
            type="button"
            className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-muted/60 hover:bg-muted text-foreground/80 transition-colors"
            title="Change Playback Speed"
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
};
