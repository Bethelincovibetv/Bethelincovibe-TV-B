import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Users, Lock, Sparkles, MessageCircle, Building2, Store } from "lucide-react";

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

const EMOJI_OPTIONS = ["💼", "🚀", "⚡", "🛍️", "🎯", "🌟", "💡", "🤝", "📦", "🏢", "👑", "🔥"];

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
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-xl font-bold">Create WhatsApp Chat Room</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Create an end-to-end encrypted discussion group, customer direct channel, or supplier mastermind.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Room Type Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Channel Archetype
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRoomType("group")}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                  roomType === "group"
                    ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <Badge variant="outline" className="text-[10px] font-bold">Group</Badge>
                </div>
                <span className="text-xs font-bold text-foreground">Trade Group</span>
                <span className="text-[10px] text-muted-foreground">Multi-user business chat</span>
              </button>

              <button
                type="button"
                onClick={() => setRoomType("trade_mastermind")}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                  roomType === "trade_mastermind"
                    ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/20"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <Badge variant="outline" className="text-[10px] font-bold">VIP</Badge>
                </div>
                <span className="text-xs font-bold text-foreground">VIP Mastermind</span>
                <span className="text-[10px] text-muted-foreground">Executive deals &amp; co-op</span>
              </button>
            </div>
          </div>

          {/* Emoji Avatar Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Room Icon</Label>
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
              {EMOJI_OPTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setAvatarEmoji(em)}
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center text-lg shrink-0 border transition-all ${
                    avatarEmoji === em
                      ? "border-emerald-500 bg-emerald-500/15 scale-110 shadow-sm"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Room Name Input */}
          <div className="space-y-1.5">
            <Label htmlFor="room-name" className="text-xs font-bold">
              Room / Channel Name *
            </Label>
            <Input
              id="room-name"
              placeholder="e.g. Lagos Electronics Hub, Wholesale Buyers VIP"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl text-sm"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="room-desc" className="text-xs font-bold">
              Topic / Purpose (Optional)
            </Label>
            <Textarea
              id="room-desc"
              placeholder="State the objective, trading guidelines, or business introduction..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rounded-xl text-xs resize-none"
            />
          </div>

          {/* End-to-End Encryption Notice */}
          <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px]">
            <Lock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            <span>Encrypted with End-to-End client security keys.</span>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              Create Room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
