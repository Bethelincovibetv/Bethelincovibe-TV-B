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
import { Switch } from "@/components/ui/switch";
import {
  Users,
  Lock,
  Sparkles,
  MessageCircle,
  Tv,
  Store,
  ShieldCheck,
  Check,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createCustomChatRoom } from "@/lib/firebaseChat";
import { toast } from "sonner";

export interface CreateChatRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateRoom?: (roomData: {
    name: string;
    description: string;
    roomType: "direct" | "group" | "business_inquiry" | "trade_mastermind";
    avatarEmoji: string;
    isEncrypted?: boolean;
  }) => Promise<void> | void;
  onRoomCreated?: (roomId: string) => void;
}

const EMOJI_OPTIONS = [
  "💼", "🚀", "⚡", "🛍️", "🎯", "🌟", 
  "💡", "🤝", "📦", "🏢", "👑", "🔥", 
  "📺", "💬", "🌍", "🏆", "💎", "💰"
];

const ROOM_TYPES = [
  {
    type: "group" as const,
    title: "Trade Group",
    desc: "Open multi-vendor commerce lounge",
    icon: Users,
    badge: "Public",
    color: "emerald",
  },
  {
    type: "trade_mastermind" as const,
    title: "VIP Mastermind",
    desc: "Wholesale deals, container cargo & co-op",
    icon: Sparkles,
    badge: "VIP Club",
    color: "purple",
  },
  {
    type: "business_inquiry" as const,
    title: "Merchant Hub",
    desc: "Product launches, buyer queries & leads",
    icon: Store,
    badge: "B2B Store",
    color: "blue",
  },
];

export const CreateChatRoomDialog: React.FC<CreateChatRoomDialogProps> = ({
  open,
  onOpenChange,
  onCreateRoom,
  onRoomCreated,
}) => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [roomType, setRoomType] = useState<"group" | "trade_mastermind" | "business_inquiry">("group");
  const [avatarEmoji, setAvatarEmoji] = useState("💼");
  const [onlyAdminsCanPost, setOnlyAdminsCanPost] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUserId = user?.id || "guest_" + (typeof window !== "undefined" ? window.location.host.slice(0, 5) : "user");
  const currentUserName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Entrepreneur";
  const currentUserAvatar = user?.user_metadata?.avatar_url || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (onCreateRoom) {
        await onCreateRoom({
          name: cleanName,
          description: description.trim(),
          roomType,
          avatarEmoji,
          isEncrypted: true,
        });
      } else {
        // Direct creation using Firebase service
        const newRoomId = await createCustomChatRoom({
          creatorId: currentUserId,
          creatorName: currentUserName,
          creatorAvatar: currentUserAvatar,
          name: cleanName,
          description: description.trim(),
          roomType,
          avatarEmoji,
          initialMemberIds: [currentUserId],
          onlyAdminsCanPost,
          onlyAdminsCanEditInfo: true,
        });

        toast.success(`Chat room "${cleanName}" created! 🎉`);
        if (onRoomCreated) {
          onRoomCreated(newRoomId);
        }
      }

      setName("");
      setDescription("");
      setAvatarEmoji("💼");
      setRoomType("group");
      setOnlyAdminsCanPost(false);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to create room:", err);
      toast.error(err?.message || "Failed to create chat room");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:max-w-lg max-h-[92dvh] sm:max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-card">
        {/* Mobile Pull-Down Indicator */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 pt-2 sm:pt-5 pb-3 border-b bg-muted/20 text-left shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 ring-1 ring-emerald-500/20">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1 pr-6">
              <DialogTitle className="text-base sm:text-lg font-black text-foreground tracking-tight">
                Create Chat Room
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                Launch a real-time discussion channel, supplier hub, or mastermind group
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form id="create-chat-room-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 touch-auto">
          {/* Room Type Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                Channel Category
              </Label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                {ROOM_TYPES.find((r) => r.type === roomType)?.badge}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ROOM_TYPES.map((rt) => {
                const isSelected = roomType === rt.type;
                const Icon = rt.icon;
                return (
                  <button
                    key={rt.type}
                    type="button"
                    onClick={() => setRoomType(rt.type)}
                    className={`p-3 rounded-2xl border text-left flex sm:flex-col items-center sm:items-start justify-between sm:justify-between gap-2.5 transition-all min-h-[58px] sm:min-h-[84px] active:scale-[0.98] ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 shadow-xs"
                        : "border-border/80 hover:border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:w-full sm:justify-between">
                      <div className={`p-1.5 rounded-xl shrink-0 ${isSelected ? "bg-emerald-500/20 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="sm:hidden">
                        <p className="text-xs font-bold text-foreground leading-tight">
                          {rt.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">
                          {rt.desc}
                        </p>
                      </div>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-xs font-bold text-foreground leading-tight">
                        {rt.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                        {rt.desc}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[9px] py-0 px-1.5 font-bold shrink-0 ${isSelected ? "border-emerald-500 text-emerald-700 dark:text-emerald-300" : ""}`}>
                      {rt.badge}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Emoji Avatar Picker */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">
                Channel Icon
              </Label>
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                Selected: <span className="text-lg leading-none">{avatarEmoji}</span>
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar touch-pan-x -mx-1 px-1">
              {EMOJI_OPTIONS.map((em) => {
                const isSelected = avatarEmoji === em;
                return (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setAvatarEmoji(em)}
                    className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 border transition-all active:scale-90 ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/20 scale-105 shadow-sm ring-2 ring-emerald-500/40"
                        : "border-border/80 hover:bg-muted hover:border-border"
                    }`}
                  >
                    {em}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Room Name Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="channel-name" className="text-xs font-bold text-foreground">
                Channel Name <span className="text-destructive">*</span>
              </Label>
              <span className="text-[10px] text-muted-foreground font-mono">
                {name.length}/60
              </span>
            </div>
            <Input
              id="channel-name"
              placeholder="e.g. Lagos Wholesale Hub, Auto Parts VIP"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 60))}
              className="h-12 rounded-2xl text-base sm:text-sm bg-background border-border/80 focus-visible:ring-emerald-500"
              required
            />
          </div>

          {/* Room Description */}
          <div className="space-y-1.5">
            <Label htmlFor="channel-desc" className="text-xs font-bold text-foreground">
              Topic / Purpose <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="channel-desc"
              placeholder="Describe group goals, wholesale offers, or trade guidelines..."
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 200))}
              rows={2}
              className="rounded-2xl text-base sm:text-xs resize-none bg-background border-border/80 min-h-[64px] focus-visible:ring-emerald-500"
            />
          </div>

          {/* Admin Broadcast Switch */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border/70 bg-muted/20 gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">Announcement Only Mode</p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Only group creator and designated admins can post messages
              </p>
            </div>
            <Switch
              checked={onlyAdminsCanPost}
              onCheckedChange={setOnlyAdminsCanPost}
              className="shrink-0"
            />
          </div>

          {/* Security Badge */}
          <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px]">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Real-time cloud synchronization backed by Firebase Firestore.</span>
          </div>
        </form>

        {/* Sticky Action Footer Outside Scroll Area for Mobile Visibility */}
        <div className="shrink-0 p-3 sm:p-4 border-t bg-card/95 backdrop-blur-xs flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="flex-1 h-12 rounded-2xl text-xs font-bold border-border min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-chat-room-form"
            disabled={!name.trim() || isSubmitting}
            className="flex-[2] h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 gap-1.5 min-h-[44px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Create Channel</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateChatRoomDialog;
