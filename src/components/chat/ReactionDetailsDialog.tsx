import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Smile, Check } from "lucide-react";

export interface ReactorDetail {
  userId: string;
  userName: string;
  userAvatar?: string;
  emoji: string;
  isCurrentUser?: boolean;
}

interface ReactionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reactions?: Record<string, { emoji: string; count: number; users: string[] }>;
  participantNames?: Record<string, string>;
  participantAvatars?: Record<string, string>;
  currentUserId?: string;
  onToggleReaction?: (emoji: string) => void;
}

export const ReactionDetailsDialog: React.FC<ReactionDetailsDialogProps> = ({
  open,
  onOpenChange,
  reactions = {},
  participantNames = {},
  participantAvatars = {},
  currentUserId,
  onToggleReaction,
}) => {
  const [activeTab, setActiveTab] = useState<string>("all");

  const reactionEntries = Object.entries(reactions);
  const totalReactionsCount = reactionEntries.reduce(
    (acc, [, rx]) => acc + (rx.count || rx.users?.length || 0),
    0
  );

  // Flatten all reactor records
  const allReactors: ReactorDetail[] = [];

  reactionEntries.forEach(([emoji, rx]) => {
    (rx.users || []).forEach((uId) => {
      const isMe = uId === currentUserId;
      const name = isMe
        ? "You"
        : participantNames[uId] || (uId.startsWith("user") ? "Community Member" : uId);
      const avatar = participantAvatars[uId];
      allReactors.push({
        userId: uId,
        userName: name,
        userAvatar: avatar,
        emoji,
        isCurrentUser: isMe,
      });
    });
  });

  const displayedReactors =
    activeTab === "all"
      ? allReactors
      : allReactors.filter((r) => r.emoji === activeTab);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] max-w-sm rounded-3xl p-4 sm:p-5 border-border/80 shadow-2xl bg-card">
        <DialogHeader className="pb-2 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Smile className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-extrabold text-foreground">
                Reactions ({totalReactionsCount})
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* Emoji Tabs */}
        {reactionEntries.length > 1 && (
          <div className="overflow-x-auto no-scrollbar py-1">
            <div className="flex items-center gap-1.5 min-w-max border-b pb-2">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  activeTab === "all"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                All {totalReactionsCount}
              </button>
              {reactionEntries.map(([emoji, rx]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setActiveTab(emoji)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
                    activeTab === emoji
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="text-[11px] opacity-90">{rx.count || rx.users?.length}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reactor List */}
        <div className="divide-y divide-border/40 max-h-64 overflow-y-auto pt-1">
          {displayedReactors.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">
              No reactions yet.
            </p>
          ) : (
            displayedReactors.map((reactor, idx) => (
              <div
                key={`${reactor.userId}_${reactor.emoji}_${idx}`}
                className="py-2.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="w-9 h-9 rounded-2xl ring-1 ring-border">
                    <AvatarImage src={reactor.userAvatar} />
                    <AvatarFallback className="bg-emerald-600/10 text-emerald-700 text-xs font-bold rounded-2xl">
                      {reactor.userName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                      <span>{reactor.userName}</span>
                      {reactor.isCurrentUser && (
                        <Badge variant="outline" className="text-[9px] py-0 px-1 font-bold text-emerald-600 border-emerald-500/30">
                          You
                        </Badge>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {reactor.isCurrentUser ? "Tap your reaction to remove" : "Verified Participant"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (reactor.isCurrentUser && onToggleReaction) {
                        onToggleReaction(reactor.emoji);
                        onOpenChange(false);
                      }
                    }}
                    className="text-lg p-1 rounded-xl hover:bg-muted transition-transform active:scale-90"
                    title={reactor.isCurrentUser ? "Click to remove" : ""}
                  >
                    {reactor.emoji}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
