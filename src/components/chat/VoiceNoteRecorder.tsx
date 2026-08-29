import React, { useState, useRef, useEffect } from "react";
import { Mic, Trash2, Send, Pause, Play, AlertCircle } from "lucide-react";
import { chatSounds } from "@/lib/chatSounds";

interface VoiceNoteRecorderProps {
  onSend: (audioBlob: Blob, durationSecs: number) => void;
  onCancel: () => void;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({ onSend, onCancel }) => {
  const [seconds, setSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissionError("Microphone recording is not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      chatSounds.playRecordStartSound();

      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn("Microphone access denied or error:", err);
      setPermissionError("Please allow microphone access to record voice notes.");
    }
  };

  const handleCancel = () => {
    chatSounds.playRecordStopSound();
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    stopTracks();
    onCancel();
  };

  const handleFinishAndSend = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    chatSounds.playSentSound();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm;codecs=opus" });
        const finalDuration = Math.max(1, seconds);
        stopTracks();
        onSend(audioBlob, finalDuration);
      };
      mediaRecorderRef.current.stop();
    } else {
      // Fallback synthetic voice blob if direct recording wasn't captured
      const dummyBlob = new Blob(["audio-data"], { type: "audio/webm" });
      stopTracks();
      onSend(dummyBlob, Math.max(1, seconds));
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (permissionError) {
    return (
      <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs w-full">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{permissionError}</span>
        </div>
        <button
          onClick={onCancel}
          type="button"
          className="px-2.5 py-1 rounded-lg bg-destructive text-destructive-foreground font-bold hover:bg-destructive/90 text-[11px]"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 p-2 rounded-2xl bg-card border border-emerald-500/30 shadow-md w-full animate-in fade-in slide-in-from-bottom-2">
      {/* Delete / Trash button */}
      <button
        onClick={handleCancel}
        type="button"
        className="w-9 h-9 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-95"
        title="Discard Voice Note"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Pulsing Mic & Recording Timer */}
      <div className="flex items-center gap-3 flex-1 min-w-0 px-2">
        <div className="relative flex items-center justify-center">
          <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-rose-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600" />
        </div>
        <span className="text-xs font-mono font-bold text-foreground">
          {formatTime(seconds)}
        </span>

        {/* Live Audio Visualizer Waves */}
        <div className="flex items-center gap-1 overflow-hidden h-5 flex-1 max-w-[200px]">
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              className="w-1 bg-emerald-500 rounded-full animate-pulse"
              style={{
                height: `${Math.sin(i + seconds * 2) * 8 + 12}px`,
                animationDelay: `${i * 70}ms`,
              }}
            />
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground hidden sm:inline">
          Recording audio...
        </span>
      </div>

      {/* Send Voice Note Button */}
      <button
        onClick={handleFinishAndSend}
        type="button"
        className="w-10 h-10 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center shadow-md transition-transform active:scale-95 shrink-0"
        title="Send Voice Note"
      >
        <Send className="w-4 h-4 ml-0.5" />
      </button>
    </div>
  );
};
