import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  ShieldCheck,
  Shield,
  UserPlus,
  UserMinus,
  Edit,
  Sparkles,
  Search,
  Loader2,
  Lock,
  Crown,
  Camera,
  Image as ImageIcon,
  Upload,
  Trash2,
} from "lucide-react";
import {
  RealtimeChatRoom,
  addMemberToChatRoom,
  removeMemberFromChatRoom,
  promoteMemberToAdmin,
  updateChatRoomDetails,
} from "@/lib/firebaseChat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatRoomAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: RealtimeChatRoom | null;
  currentUserId: string;
}

const EMOJI_OPTIONS = ["💼", "🚀", "⚡", "🛍️", "🎯", "🌟", "💡", "🤝", "📦", "🏢", "👑", "🔥", "📺"];

export function ChatRoomAdminDialog({
  open,
  onOpenChange,
  room,
  currentUserId,
}: ChatRoomAdminDialogProps) {
  if (!room) return null;

  const isCreator = room.creatorId === currentUserId;
  const isAdmin = isCreator || (room.adminIds || []).includes(currentUserId);

  const [activeTab, setActiveTab] = useState<"members" | "edit" | "add">("members");
  const [editName, setEditName] = useState(room.name || "");
  const [editDesc, setEditDesc] = useState(room.description || "");
  const [editEmoji, setEditEmoji] = useState(room.avatarEmoji || "💼");
  const [editAvatarUrl, setEditAvatarUrl] = useState(room.avatarUrl || "");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // User search for adding members
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setEditName(room.name || "");
    setEditDesc(room.description || "");
    setEditEmoji(room.avatarEmoji || "💼");
    setEditAvatarUrl(room.avatarUrl || "");
  }, [room]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    let isCancelled = false;
    setIsSearching(true);

    async function searchUsers() {
      try {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .or(`username.ilike.%${searchQuery.trim()}%,display_name.ilike.%${searchQuery.trim()}%`)
          .limit(8);

        if (!isCancelled) {
          const formatted = (profiles || [])
            .filter((p) => !(room.participants || []).includes(p.id))
            .map((p) => ({
              id: p.id,
              name: p.display_name || (p.username ? `@${p.username}` : "Member"),
              avatar: p.avatar_url,
              role: p.username ? `@${p.username}` : "Member",
            }));
          setSearchResults(formatted);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!isCancelled) setIsSearching(false);
      }
    }

    const timer = setTimeout(searchUsers, 250);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, room.participants]);

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("Only room admins can edit settings");
      return;
    }
    setIsSaving(true);
    try {
      await updateChatRoomDetails(room.id, {
        name: editName.trim(),
        description: editDesc.trim(),
        avatarEmoji: editEmoji,
        avatarUrl: editAvatarUrl.trim(),
      });
      toast.success("Room details updated successfully");
      setActiveTab("members");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update room details");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file must be under 5MB");
      return;
    }
    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      setEditAvatarUrl(base64Url);
      setIsUploadingPhoto(false);
      toast.success("Room photo uploaded");
    };
    reader.onerror = () => {
      setIsUploadingPhoto(false);
      toast.error("Failed to read image file");
    };
    reader.readAsDataURL(file);
  };

  const handleAddMember = async (userObj: { id: string; name: string; avatar?: string }) => {
    try {
      await addMemberToChatRoom(room.id, userObj.id, userObj.name, userObj.avatar);
      toast.success(`${userObj.name} added to the room`);
      setSearchQuery("");
      setSearchResults([]);
      setActiveTab("members");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add member");
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!isAdmin) {
      toast.error("Only room admins can remove members");
      return;
    }
    if (memberId === room.creatorId) {
      toast.error("Cannot remove the room creator");
      return;
    }
    try {
      await removeMemberFromChatRoom(room.id, memberId);
      toast.success(`${memberName} removed from room`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove member");
    }
  };

  const handlePromoteAdmin = async (memberId: string, memberName: string) => {
    if (!isAdmin) {
      toast.error("Only room admins can assign administrator roles");
      return;
    }
    try {
      await promoteMemberToAdmin(room.id, memberId);
      toast.success(`${memberName} is now a Room Admin! 🛡️`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to promote admin");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] max-w-lg max-h-[88vh] overflow-y-auto rounded-3xl p-4 sm:p-6 border-border/80 shadow-2xl">
        <DialogHeader className="text-left space-y-1.5 pb-2 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl shrink-0 border border-primary/20 shadow-xs">
              {room.avatarUrl ? (
                <img src={room.avatarUrl} alt="Room" className="w-full h-full rounded-2xl object-cover" />
              ) : (
                room.avatarEmoji || "💼"
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-black text-foreground truncate">
                  {room.name || "Chat Room"}
                </DialogTitle>
                {room.isOfficial && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold shrink-0">
                    Official
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground line-clamp-1">
                {room.description || `${(room.participants || []).length} participants`}
              </DialogDescription>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1.5 pt-2">
            <Button
              variant={activeTab === "members" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("members")}
              className="h-8 rounded-xl text-xs font-bold gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              Members ({(room.participants || []).length})
            </Button>
            {isAdmin && (
              <>
                <Button
                  variant={activeTab === "add" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("add")}
                  className="h-8 rounded-xl text-xs font-bold gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add People
                </Button>
                <Button
                  variant={activeTab === "edit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("edit")}
                  className="h-8 rounded-xl text-xs font-bold gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit Room
                </Button>
              </>
            )}
          </div>
        </DialogHeader>

        {/* Tab 1: Member Roster & Role Actions */}
        {activeTab === "members" && (
          <div className="space-y-2 py-2">
            <div className="divide-y divide-border/60">
              {(room.participants || []).map((memberId) => {
                const memberName = room.participantNames?.[memberId] || (memberId === currentUserId ? "You" : "Member");
                const memberAvatar = room.participantAvatars?.[memberId];
                const isMemberCreator = memberId === room.creatorId;
                const isMemberAdmin = isMemberCreator || (room.adminIds || []).includes(memberId);

                return (
                  <div key={memberId} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Avatar className="h-9 w-9 ring-2 ring-primary/20 shrink-0">
                        <AvatarImage src={memberAvatar} />
                        <AvatarFallback className="text-xs font-black bg-primary/10 text-primary">
                          {memberName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                            {memberName}
                          </p>
                          {memberId === currentUserId && (
                            <span className="text-[10px] text-muted-foreground font-semibold">(You)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {isMemberCreator ? (
                            <Badge className="text-[9px] py-0 px-1.5 bg-amber-500 text-white font-bold gap-0.5">
                              <Crown className="w-2.5 h-2.5" /> Creator
                            </Badge>
                          ) : isMemberAdmin ? (
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold gap-0.5">
                              <ShieldCheck className="w-2.5 h-2.5" /> Admin
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Participant</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Admin Actions for other members */}
                    {isAdmin && memberId !== currentUserId && !isMemberCreator && (
                      <div className="flex items-center gap-1 shrink-0">
                        {!isMemberAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePromoteAdmin(memberId, memberName)}
                            title="Make Admin"
                            className="h-8 px-2 rounded-xl text-[11px] font-bold text-emerald-600 hover:bg-emerald-500/10"
                          >
                            <Shield className="w-3.5 h-3.5 mr-1" />
                            Make Admin
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(memberId, memberName)}
                          title="Remove from room"
                          className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10"
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Add Members by Real-Time Search */}
        {activeTab === "add" && (
          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Type member name, @username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-xs sm:text-sm rounded-2xl bg-background"
                autoFocus
              />
            </div>

            {isSearching ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1 text-primary" />
                Searching platform members...
              </div>
            ) : searchQuery.trim() && searchResults.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center p-4">
                No new members found matching "{searchQuery}".
              </p>
            ) : (
              <div className="divide-y divide-border/60 max-h-56 overflow-y-auto">
                {searchResults.map((usr) => (
                  <div key={usr.id} className="py-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Avatar className="h-8 w-8 ring-1 ring-primary/20 shrink-0">
                        <AvatarImage src={usr.avatar} />
                        <AvatarFallback className="text-[11px] font-black">
                          {usr.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate">{usr.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{usr.role}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddMember(usr)}
                      className="h-8 px-3 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Edit Room Info (Admin Only) */}
        {activeTab === "edit" && isAdmin && (
          <form onSubmit={handleSaveDetails} className="space-y-4 py-2">
            {/* Custom Room Photo Upload */}
            <div className="space-y-2 bg-muted/20 p-3.5 rounded-2xl border border-border/60">
              <Label className="text-xs font-bold flex items-center justify-between">
                <span>Room Avatar / Community Photo</span>
                {editAvatarUrl && (
                  <span className="text-[10px] text-emerald-600 font-semibold">Custom Photo Set</span>
                )}
              </Label>
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14 rounded-2xl border ring-2 ring-primary/20 shadow-sm shrink-0">
                  {editAvatarUrl ? (
                    <AvatarImage src={editAvatarUrl} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {editEmoji || "📺"}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isUploadingPhoto}
                        className="rounded-xl text-xs h-8 font-semibold gap-1.5"
                        onClick={() => document.getElementById("room-photo-input")?.click()}
                      >
                        {isUploadingPhoto ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        Upload Photo
                      </Button>
                      <input
                        type="file"
                        id="room-photo-input"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>

                    {editAvatarUrl && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditAvatarUrl("")}
                        className="rounded-xl text-xs h-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Upload a high-resolution logo or room image (JPG, PNG, WebP)
                  </p>
                </div>
              </div>
            </div>

            {/* Emoji fallback picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Fallback Emoji Icon</Label>
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 no-scrollbar py-1">
                {EMOJI_OPTIONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEditEmoji(em)}
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center text-base shrink-0 border transition-all ${
                      editEmoji === em
                        ? "border-emerald-500 bg-emerald-500/15 scale-110 shadow-sm ring-2 ring-emerald-500/20"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-room-name" className="text-xs font-bold">
                Channel Title *
              </Label>
              <Input
                id="edit-room-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-2xl text-xs sm:text-sm h-11"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-room-desc" className="text-xs font-bold">
                Topic & Description
              </Label>
              <Textarea
                id="edit-room-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                className="rounded-2xl text-xs resize-none"
              />
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab("members")}
                className="w-full sm:w-auto rounded-2xl text-xs h-10"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={!editName.trim() || isSaving}
                className="w-full sm:w-auto rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-6 shadow-md"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
