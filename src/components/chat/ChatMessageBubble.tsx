import React, { useState, useRef, useEffect } from "react";
import { motion, PanInfo } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Reply,
  Smile,
  CheckCheck,
  Check,
  MoreVertical,
  Copy,
  ShieldCheck,
  AtSign,
  Play,
  Pause,
  FileText,
  Download,
  Trash2,
  Image as ImageIcon,
  Film,
  Mic,
  Info,
  ExternalLink,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RealtimeChatMessage } from "@/lib/firebaseChat";
import { toast } from "sonner";

const QUICK_REACTION_EMOJIS = [
  "❤️",
  "👍",
  "🔥",
  "😂",
  "👏",
  "🎉",
  "😍",
  "🙏",
  "🚀",
  "💯",
  "🤝",
  "👑",
];

interface ChatMessageBubbleProps {
  message: RealtimeChatMessage;
  isMe: boolean;
  currentUserId: string;
  isGroupAdmin?: boolean;
  isPlatformAdmin?: boolean;
  onReply: (message: RealtimeChatMessage) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onDeleteForEveryone?: (messageId: string) => void;
  onScrollToMessage?: (messageId: string) => void;
}

/**
 * Parses message text to highlight @all and @mentions and links
 */
function renderFormattedMessageText(text: string, isMe: boolean) {
  if (!text) return null;

  // Split by @all, @username, and urls
  const parts = text.split(/(@all|@[a-zA-Z0-9_-]+|https?:\/\/[^\s]+)/g);

  return parts.map((part, idx) => {
    if (part.toLowerCase() === "@all") {
      return (
        <span
          key={idx}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-xs font-black mx-0.5 shadow-xs ${
            isMe
              ? "bg-white/25 text-white ring-1 ring-white/40"
              : "bg-amber-500/20 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30"
          }`}
        >
          <AtSign className="h-3 w-3 inline" />
          all
        </span>
      );
    }
    if (part.startsWith("@") && part.length > 1) {
      return (
        <span
          key={idx}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-xs font-bold mx-0.5 ${
            isMe ? "bg-white/20 text-white" : "bg-primary/15 text-primary"
          }`}
        >
          {part}
        </span>
      );
    }
    if (part.startsWith("http://") || part.startsWith("https://")) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline break-all font-semibold inline-flex items-center gap-1 ${
            isMe ? "text-white hover:text-white/80" : "text-primary hover:underline"
          }`}
        >
          {part}
          <ExternalLink className="h-3 w-3 inline shrink-0" />
        </a>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function AudioVoiceNotePlayer({
  mediaUrl,
  isMe,
  duration,
}: {
  mediaUrl: string;
  isMe: boolean;
  duration?: number;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(mediaUrl);
    audioRef.current = audio;

    audio.onended = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(audio.currentTime);
      }
    };

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [mediaUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => toast.error("Could not play audio"));
      setIsPlaying(true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded-2xl ${
        isMe ? "bg-white/15 text-white" : "bg-muted/70 text-foreground"
      }`}
    >
      <button
        type="button"
        onClick={togglePlay}
        className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95 ${
          isMe
            ? "bg-white text-primary hover:bg-white/90"
            : "bg-primary text-white hover:bg-primary/90"
        }`}
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
      </button>

      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="flex items-center gap-1">
            <Mic className="h-3 w-3" /> Voice Note
          </span>
          <span>
            {formatTime(currentTime || duration || 0)}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-black/20 overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ${
              isMe ? "bg-white" : "bg-primary"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function ChatMessageBubble({
  message,
  isMe,
  currentUserId,
  isGroupAdmin,
  isPlatformAdmin,
  onReply,
  onToggleReaction,
  onDeleteForEveryone,
  onScrollToMessage,
}: ChatMessageBubbleProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const canDeleteForEveryone =
    isMe || isGroupAdmin || isPlatformAdmin;

  const handleDragEnd = (_: any, info: PanInfo) => {
    // WhatsApp style swipe right to reply
    if (info.offset.x > 50) {
      onReply(message);
    }
  };

  const handleTouchStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      setShowEmojiPicker(true);
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const copyText = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
      toast.success("Message copied to clipboard");
    }
  };

  // System Message Display
  if (message.type === "system") {
    return (
      <div className="my-3 flex justify-center">
        <div className="max-w-md rounded-2xl bg-muted/80 backdrop-blur-xs px-4 py-1.5 text-center text-xs font-semibold text-muted-foreground border border-border/60 shadow-xs">
          {message.text}
        </div>
      </div>
    );
  }

  // Deleted Message Display
  if (message.deletedForEveryone) {
    return (
      <div
        className={`my-1.5 flex ${
          isMe ? "justify-end" : "justify-start"
        }`}
      >
        <div className="flex items-center gap-2 rounded-2xl bg-muted/40 border border-border/50 px-3.5 py-2 text-xs italic text-muted-foreground">
          <Trash2 className="h-3.5 w-3.5 opacity-60" />
          <span>This message was deleted</span>
        </div>
      </div>
    );
  }

  const reactionsList = Object.entries(message.reactions || {}).filter(
    ([_, users]) => users && users.length > 0
  );

  const hasRead = (message.readBy || []).length > 1;

  return (
    <div className="relative group/bubble select-none my-1.5 transition-all">
      {/* Swipe to Reply Backing Indicator */}
      <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none opacity-60 text-primary z-0">
        <div className="flex items-center gap-1.5 text-xs font-bold bg-primary/10 px-2 py-1 rounded-full text-primary">
          <Reply className="h-4 w-4 rotate-180" />
          <span className="text-[10px] hidden sm:inline">Swipe to reply</span>
        </div>
      </div>

      {/* Draggable Message Body Container */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 80 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`relative z-10 flex gap-2.5 max-w-[94%] sm:max-w-[80%] ${
          isMe ? "ml-auto flex-row-reverse" : "mr-auto"
        }`}
      >
        {/* Avatar (for incoming messages) */}
        {!isMe && (
          <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 ring-2 ring-primary/10 self-end mb-1">
            <AvatarImage src={message.senderAvatar} />
            <AvatarFallback className="text-[11px] font-black bg-primary/10 text-primary">
              {(message.senderName || "U").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="space-y-1 max-w-full">
          {/* Sender Name if not me */}
          {!isMe && message.senderName && (
            <p className="text-[11px] font-bold text-foreground/80 pl-1 flex items-center gap-1">
              {message.senderName}
              <ShieldCheck className="h-3 w-3 text-emerald-500 inline" />
            </p>
          )}

          {/* Main Bubble Card */}
          <div
            className={`relative rounded-3xl p-3.5 sm:p-4 text-sm sm:text-base leading-relaxed transition-all shadow-sm ${
              isMe
                ? "bg-gradient-to-br from-primary via-purple-600 to-accent text-white rounded-br-xs shadow-primary/20"
                : "bg-card text-foreground rounded-bl-xs border border-border/80 shadow-xs"
            }`}
          >
            {/* Replied Quote Banner if this message is a reply */}
            {message.replyTo && (
              <div
                onClick={() => onScrollToMessage?.(message.replyTo!.id)}
                className={`mb-2.5 p-2 sm:p-2.5 rounded-2xl border-l-4 text-xs cursor-pointer transition-opacity hover:opacity-90 ${
                  isMe
                    ? "bg-black/25 border-white text-white"
                    : "bg-muted border-primary text-foreground"
                }`}
              >
                <p className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Reply className="h-3 w-3" />
                  Replying to {message.replyTo.senderName}
                </p>
                <p className="text-xs truncate mt-0.5 line-clamp-1 italic font-medium">
                  "{message.replyTo.text}"
                </p>
              </div>
            )}

            {/* Attached Image */}
            {message.type === "image" && message.mediaUrl && (
              <div className="mb-2 overflow-hidden rounded-2xl border border-black/10">
                <img
                  src={message.mediaUrl}
                  alt="Attachment"
                  className="max-h-72 sm:max-h-96 w-full object-cover cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => window.open(message.mediaUrl, "_blank")}
                />
              </div>
            )}

            {/* Attached Video */}
            {message.type === "video" && message.mediaUrl && (
              <div className="mb-2 overflow-hidden rounded-2xl border border-black/10">
                <video
                  src={message.mediaUrl}
                  controls
                  className="max-h-72 sm:max-h-96 w-full rounded-2xl"
                />
              </div>
            )}

            {/* Voice Note Audio Player */}
            {message.type === "voice_note" && message.mediaUrl && (
              <div className="mb-2">
                <AudioVoiceNotePlayer
                  mediaUrl={message.mediaUrl}
                  isMe={isMe}
                  duration={message.mediaDuration}
                />
              </div>
            )}

            {/* Document / File Attachment */}
            {message.type === "file" && message.mediaUrl && (
              <div
                className={`mb-2 flex items-center justify-between gap-3 p-3 rounded-2xl ${
                  isMe ? "bg-black/20 text-white" : "bg-muted text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-primary/20 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">
                      {message.fileName || "Attached Document"}
                    </p>
                    {message.fileSize ? (
                      <p className="text-[10px] opacity-75">
                        {(message.fileSize / 1024).toFixed(1)} KB
                      </p>
                    ) : null}
                  </div>
                </div>
                <a
                  href={message.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={message.fileName || "attachment"}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            )}

            {/* Message Text with Mentions & Links */}
            {message.text && (
              <div className="whitespace-pre-wrap break-words font-medium text-sm sm:text-base leading-relaxed tracking-normal">
                {renderFormattedMessageText(message.text, isMe)}
              </div>
            )}

            {/* Timestamp and Double Tick Delivery Marks */}
            <div
              className={`flex items-center gap-1.5 text-[11px] font-medium mt-1.5 pt-1 ${
                isMe
                  ? "justify-end text-white/80"
                  : "justify-start text-muted-foreground"
              }`}
            >
              <span>
                {message.createdAt
                  ? formatDistanceToNow(new Date(message.createdAt), {
                      addSuffix: true,
                    })
                  : "just now"}
              </span>
              {isMe && (
                <span
                  className="inline-flex items-center"
                  title={hasRead ? "Read by members" : "Sent & Delivered"}
                >
                  <CheckCheck
                    className={`h-4 w-4 ml-0.5 stroke-[2.5] ${
                      hasRead ? "text-emerald-300" : "text-white/60"
                    }`}
                  />
                </span>
              )}
            </div>
          </div>

          {/* Emoji Reactions Badges */}
          {reactionsList.length > 0 && (
            <div
              className={`flex flex-wrap gap-1 mt-1 ${
                isMe ? "justify-end" : "justify-start"
              }`}
            >
              {reactionsList.map(([emoji, userIds]) => {
                const hasReacted = userIds.includes(currentUserId);
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onToggleReaction(message.id, emoji)}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold transition-all transform active:scale-95 border ${
                      hasReacted
                        ? "bg-primary/20 border-primary/40 text-primary shadow-xs"
                        : "bg-muted/80 border-border/70 text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{emoji}</span>
                    <span className="text-[10px] font-black">
                      {userIds.length}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Bar (Reactions, Reply, Menu) */}
        <div
          className={`flex items-center gap-1 self-center opacity-0 group-hover/bubble:opacity-100 transition-opacity ${
            isMe ? "flex-row-reverse" : "flex-row"
          }`}
        >
          {/* Reaction Picker Popover */}
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full bg-background/80 hover:bg-background border shadow-xs text-muted-foreground hover:text-foreground"
              >
                <Smile className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align={isMe ? "end" : "start"}
              className="p-2 rounded-2xl w-auto max-w-[280px] sm:max-w-none flex flex-wrap items-center gap-1.5 bg-card/95 backdrop-blur-md shadow-xl border border-border"
            >
              {QUICK_REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onToggleReaction(message.id, emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-muted hover:scale-125 transition-all text-base active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Quick Reply Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onReply(message)}
            title="Reply to message"
            className="h-7 w-7 rounded-full bg-background/80 hover:bg-background border shadow-xs text-muted-foreground hover:text-primary"
          >
            <Reply className="h-3.5 w-3.5" />
          </Button>

          {/* More Actions Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full bg-background/80 hover:bg-background border shadow-xs text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isMe ? "end" : "start"} className="rounded-2xl w-44">
              <DropdownMenuItem onClick={copyText} className="gap-2 text-xs font-semibold cursor-pointer">
                <Copy className="h-3.5 w-3.5" /> Copy Text
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onReply(message)} className="gap-2 text-xs font-semibold cursor-pointer">
                <Reply className="h-3.5 w-3.5" /> Reply
              </DropdownMenuItem>
              {canDeleteForEveryone && onDeleteForEveryone && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDeleteForEveryone(message.id)}
                    className="gap-2 text-xs font-semibold text-destructive cursor-pointer hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete for everyone
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>
    </div>
  );
}
