import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Users, Lock, Sparkles, MessageCircle, Tv, Store } from "lucide-react";

interface CreateChatRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateRoom: (roomData: {
    name: string;
    description: string;
    roomType: "direct" | "group" | "business_inquiry" | "trade_mastermind";
    avatarEmoji: string;
    isEncrypted: boolean;
  }) => void;
}

const EMOJI_OPTIONS = ["💼", "🚀", "⚡", "🛍️", "🎯", "🌟", "💡", "🤝", "📦", "🏢", "👑", "🔥", "📺", "💬"];

export const CreateChatRoomDialog: React.FC<CreateChatRoomDialogProps> = ({
  open,
  onOpenChange,
  onCreateRoom,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [roomType, setRoomType] = useState<"direct" | "group" | "business_inquiry" | "trade_mastermind">("group");
  const [avatarEmoji, setAvatarEmoji] = useState("💼");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreateRoom({
      name: name.trim(),
      description: description.trim(),
      roomType,
      avatarEmoji,
      isEncrypted: true,
    });

    setName("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-md rounded-3xl p-3.5 sm:p-5 border-border/80 shadow-2xl bg-card">
        <DialogHeader className="text-left space-y-0.5 pb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black text-foreground">
                Create Chat Room
              </DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground line-clamp-1">
                Launch an encrypted discussion group, supplier co-op, or trade room.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          {/* Room Type Selector - Compact 2-column on mobile */}
          <div className="space-y-1">
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
              Channel Type
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRoomType("group")}
                className={`p-2 sm:p-2.5 rounded-2xl border text-left flex flex-col gap-0.5 transition-all ${
                  roomType === "group"
                    ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 shadow-xs"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <Badge variant="outline" className="text-[9px] py-0 px-1 font-bold">Group</Badge>
                </div>
                <span className="text-xs font-bold text-foreground">Trade Group</span>
                <span className="text-[10px] text-muted-foreground">Public multi-member</span>
              </button>

              <button
                type="button"
                onClick={() => setRoomType("trade_mastermind")}
                className={`p-2 sm:p-2.5 rounded-2xl border text-left flex flex-col gap-0.5 transition-all ${
                  roomType === "trade_mastermind"
                    ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/20 shadow-xs"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <Badge variant="outline" className="text-[9px] py-0 px-1 font-bold text-purple-600">VIP</Badge>
                </div>
                <span className="text-xs font-bold text-foreground">VIP Mastermind</span>
                <span className="text-[10px] text-muted-foreground">Deals &amp; co-op</span>
              </button>
            </div>
          </div>

          {/* Emoji Avatar Picker - Sleek scrollable strip */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-foreground">Room Icon</Label>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar py-0.5">
              {EMOJI_OPTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setAvatarEmoji(em)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 border transition-all ${
                    avatarEmoji === em
                      ? "border-emerald-500 bg-emerald-500/15 scale-105 shadow-xs ring-2 ring-emerald-500/20"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Room Name Input */}
          <div className="space-y-1">
            <Label htmlFor="room-name" className="text-[11px] font-bold text-foreground">
              Room / Channel Name *
            </Label>
            <Input
              id="room-name"
              placeholder="e.g. Lagos Wholesale Hub, Electronics VIP"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-2xl text-xs sm:text-sm h-10 bg-background"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="room-desc" className="text-[11px] font-bold text-foreground">
              Topic / Purpose (Optional)
            </Label>
            <Textarea
              id="room-desc"
              placeholder="State topic, trade focus, or community guidelines..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rounded-2xl text-xs resize-none bg-background min-h-[48px]"
            />
          </div>

          {/* E2EE Info Badge */}
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px]">
            <Lock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            <span>End-to-end encrypted with SHA-256 client cryptography.</span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-2xl text-xs h-10 font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 shadow-md transition-all active:scale-95"
            >
              Create Room
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
