import React, { useState, useRef } from "react";
import { motion, PanInfo } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Reply, Smile, CheckCheck, Check, MoreVertical, Copy, ShieldCheck, AtSign } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RealtimeChatMessage } from "@/lib/firebaseChat";
import { toast } from "sonner";

const QUICK_REACTION_EMOJIS = ["❤️", "👍", "🔥", "😂", "👏", "🎉", "😍", "🙏", "🚀", "💯", "🤝", "👑"];

interface ChatMessageBubbleProps {
  message: RealtimeChatMessage;
  isMe: boolean;
  currentUserId: string;
  onReply: (message: RealtimeChatMessage) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onScrollToMessage?: (messageId: string) => void;
}

/**
 * Parses message text to highlight @all and @mentions
 */
function renderFormattedMessageText(text: string, isMe: boolean) {
  if (!text) return null;
  // Match @all or @username
  const parts = text.split(/(@all|@[a-zA-Z0-9_-]+)/g);

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
            isMe
              ? "bg-white/20 text-white"
              : "bg-primary/15 text-primary"
          }`}
        >
          {part}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export function ChatMessageBubble({
  message,
  isMe,
  currentUserId,
  onReply,
  onToggleReaction,
  onScrollToMessage,
}: ChatMessageBubbleProps) {
  const [isSwiping, setIsSwiping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsSwiping(false);
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

  const reactionsList = Object.entries(message.reactions || {}).filter(
    ([_, users]) => users && users.length > 0
  );

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
        onDragStart={() => setIsSwiping(true)}
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
                ? "bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground rounded-br-xs shadow-primary/20"
                : "bg-card text-foreground rounded-bl-xs border border-border/80 shadow-xs"
            }`}
          >
            {/* Replied Quote Banner if this message is a reply */}
            {message.replyTo && (
              <div
                onClick={() => onScrollToMessage?.(message.replyTo!.id)}
                className={`mb-2.5 p-2 sm:p-2.5 rounded-2xl border-l-4 text-xs cursor-pointer transition-opacity hover:opacity-90 ${
                  isMe
                    ? "bg-black/20 border-white text-white"
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

            {/* Attached Image if any */}
            {message.imageUrl && (
              <div className="mb-2 overflow-hidden rounded-2xl border border-black/10">
                <img
                  src={message.imageUrl}
                  alt="Attachment"
                  className="max-h-64 sm:max-h-80 w-full object-cover cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => window.open(message.imageUrl, "_blank")}
                />
              </div>
            )}

            {/* Message Text with Mentions */}
            {message.text && (
              <div className="whitespace-pre-wrap break-words font-medium text-sm sm:text-base leading-relaxed tracking-normal">
                {renderFormattedMessageText(message.text, isMe)}
              </div>
            )}

            {/* Timestamp and Double Tick Delivery Marks */}
            <div
              className={`flex items-center gap-1.5 text-[11px] font-medium mt-1.5 pt-1 ${
                isMe ? "justify-end text-primary-foreground/80" : "justify-start text-muted-foreground"
              }`}
            >
              <span>
                {message.createdAt
                  ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })
                  : "just now"}
              </span>
              {isMe && (
                <span className="inline-flex items-center" title="Delivered & Read">
                  <CheckCheck className="h-4 w-4 text-emerald-300 ml-0.5 stroke-[2.5]" />
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
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-all transform active:scale-95 border ${
                      hasReacted
                        ? "bg-primary/15 border-primary/40 text-primary shadow-xs"
                        : "bg-muted/80 border-border/70 text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{emoji}</span>
                    <span className="text-[10px] font-black">{userIds.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Hover / Action Bar */}
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

          {/* Copy Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={copyText}
            title="Copy text"
            className="h-7 w-7 rounded-full bg-background/80 hover:bg-background border shadow-xs text-muted-foreground hover:text-foreground hidden sm:flex"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
