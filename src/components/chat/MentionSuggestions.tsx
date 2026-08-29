import React from "react";
import { AtSign, Users, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RealtimeChatRoom } from "@/lib/firebaseChat";

interface MentionSuggestionsProps {
  query: string;
  room: RealtimeChatRoom | null;
  currentUserId: string;
  onSelectMention: (tag: string) => void;
}

export function MentionSuggestions({
  query,
  room,
  currentUserId,
  onSelectMention,
}: MentionSuggestionsProps) {
  if (!room) return null;

  const participants = (room.participants || []).filter((id) => id !== currentUserId);
  const q = query.toLowerCase();

  const showAll = "all".includes(q) || !q;

  const matchedMembers = participants.filter((id) => {
    const name = (room.participantNames?.[id] || "").toLowerCase();
    return name.includes(q);
  });

  if (!showAll && matchedMembers.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-72 sm:w-80 max-h-52 overflow-y-auto bg-card/95 backdrop-blur-md rounded-2xl border border-border/80 shadow-2xl z-50 p-1.5 space-y-1">
      <div className="px-2 py-1 text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <AtSign className="w-3 h-3 text-primary" /> Mention in room
      </div>

      {showAll && (
        <button
          type="button"
          onClick={() => onSelectMention("@all ")}
          className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-primary/10 transition-colors group"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/30">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-foreground group-hover:text-primary flex items-center gap-1">
              <span>@all</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500 text-white font-bold">Everyone</span>
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              Notify all {(room.participants || []).length} participants
            </p>
          </div>
        </button>
      )}

      {matchedMembers.map((memberId) => {
        const name = room.participantNames?.[memberId] || "Member";
        const avatar = room.participantAvatars?.[memberId];
        const isAdmin = (room.adminIds || []).includes(memberId) || room.creatorId === memberId;
        const tagHandle = `@${name.replace(/\s+/g, "_")} `;

        return (
          <button
            key={memberId}
            type="button"
            onClick={() => onSelectMention(tagHandle)}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-muted transition-colors group"
          >
            <Avatar className="w-8 h-8 ring-1 ring-primary/20 shrink-0">
              <AvatarImage src={avatar} />
              <AvatarFallback className="text-[11px] font-black">
                {name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground group-hover:text-primary flex items-center gap-1 truncate">
                {name}
                {isAdmin && <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{tagHandle.trim()}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
