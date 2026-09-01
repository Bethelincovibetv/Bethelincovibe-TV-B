import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceNoteRecorderProps {
  onSendVoiceNote: (audioBlob: Blob, durationSeconds: number) => Promise<void>;
  disabled?: boolean;
}

export default function VoiceNoteRecorder({ onSendVoiceNote, disabled }: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    if (disabled || isUploading) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      startTimeRef.current = Date.now();
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 500);
    } catch (err) {
      console.warn('Microphone access denied or unavailable:', err);
    }
  };

  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setDuration(0);
  };

  const stopAndSend = async () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const totalSeconds = Math.max(1, duration);
    setIsUploading(true);

    mediaRecorderRef.current.onstop = async () => {
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await onSendVoiceNote(audioBlob, totalSeconds);
      } catch (err) {
        console.error('Failed to send voice note:', err);
      } finally {
        setIsUploading(false);
        setIsRecording(false);
        setDuration(0);
        audioChunksRef.current = [];
      }
    };

    mediaRecorderRef.current.stop();
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isUploading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold animate-pulse">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Sending voice note...</span>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 rounded-full px-3 py-1.5 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="text-xs font-mono font-bold text-red-500">{formatDuration(duration)}</span>
        </div>

        {/* Audio Waveform visualization bars */}
        <div className="flex items-center gap-0.5 h-4 px-1">
          {[40, 80, 50, 95, 60, 100, 70, 45, 85].map((h, i) => (
            <div
              key={i}
              className="w-1 bg-red-500 rounded-full transition-all duration-150"
              style={{
                height: `${Math.max(4, Math.sin(duration * 4 + i) * 8 + 10)}px`,
                opacity: 0.7 + (i % 3) * 0.1,
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={cancelRecording}
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Cancel recording"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            size="icon"
            onClick={stopAndSend}
            className="h-8 w-8 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xs"
            title="Send voice note"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={startRecording}
      disabled={disabled}
      className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
      title="Record Voice Note"
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
}
