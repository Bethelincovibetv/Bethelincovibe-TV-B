import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronLeft,
  Search,
  Send,
  Mic,
  Paperclip,
  Smile,
  Phone,
  Video,
  MessageCircle,
  MoreVertical,
  Lock,
  ShieldCheck,
  Check,
  CheckCheck,
  Volume2,
  VolumeX,
  Users,
  Plus,
  ArrowLeft,
  Image as ImageIcon,
  FileText,
  Trash2,
  Download,
  Share2,
  Sparkles,
  Loader2,
  Info,
  Tv,
  AtSign,
  Reply,
  X,
  Store,
  PhoneCall,
  Crown,
  Settings2,
  Radio,
  User,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { WhatsAppDoodleBackground } from "@/components/chat/WhatsAppDoodleBackground";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { VoiceNoteRecorder } from "@/components/chat/VoiceNoteRecorder";
import { CreateChatRoomDialog } from "@/components/chat/CreateChatRoomDialog";
import { ChatRoomAdminDialog } from "@/components/chat/ChatRoomAdminDialog";
import { MentionSuggestions } from "@/components/chat/MentionSuggestions";
import { WebRTCCallModal } from "@/components/chat/WebRTCCallModal";
import { chatSounds } from "@/lib/chatSounds";
import {
  RealtimeChatRoom,
  RealtimeChatMessage,
  subscribeToUserChats,
  subscribeToPublicCommunityRooms,
  subscribeToChatMessages,
  subscribeToChatTyping,
  sendMessageToChat,
  toggleMessageReaction,
  deleteMessageForEveryone,
  setChatTypingState,
  getOrCreateChatRoom,
  getOrCreateGeneralBethelChatRoom,
  getOrCreateVIPTradeChatRoom,
  createCustomChatRoom,
  markMessagesAsRead,
  isPlatformAdminEmail,
  ensureFirebaseAuth,
} from "@/lib/firebaseChat";

export default function UserMessages() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();

  const targetUserParam = searchParams.get("targetUserId");
  const targetNameParam = searchParams.get("targetName");
  const targetAvatarParam = searchParams.get("targetAvatar");
  const officialRoomParam = searchParams.get("officialRoom");
  const roomIdParam = searchParams.get("roomId");

  const currentUserId = user?.id || "guest_" + (typeof window !== "undefined" ? window.location.host.slice(0, 5) : "user");
  const currentUserName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Entrepreneur";
  const currentUserAvatar = user?.user_metadata?.avatar_url || "";
  const currentUserEmail = user?.email || "";

  const isPlatformAdmin = isPlatformAdminEmail(currentUserEmail);

  // Rooms & Active Chat State
  const [userRooms, setUserRooms] = useState<RealtimeChatRoom[]>([]);
  const [publicRooms, setPublicRooms] = useState<RealtimeChatRoom[]>([]);
  const [optimisticRooms, setOptimisticRooms] = useState<Record<string, RealtimeChatRoom>>({});
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RealtimeChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Directory Search State (Search users to start 1-on-1 chat)
  const [directorySearch, setDirectorySearch] = useState("");
  const [discoveredContacts, setDiscoveredContacts] = useState<any[]>([]);
  const [isSearchingDirectory, setIsSearchingDirectory] = useState(false);

  // Reply Target
  const [replyingTo, setReplyingTo] = useState<RealtimeChatMessage | null>(null);

  // Media attachment state
  const [selectedMedia, setSelectedMedia] = useState<{
    url: string;
    type: "image" | "video" | "file";
    fileName?: string;
    fileSize?: number;
  } | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog & Call States
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(chatSounds.isEnabled());
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [wallpaperTheme, setWallpaperTheme] = useState<"classic" | "dark" | "emerald" | "slate">("classic");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [activeCall, setActiveCall] = useState<{
    isOpen: boolean;
    contactName: string;
    contactAvatar?: string;
    isVideo: boolean;
  }>({
    isOpen: false,
    contactName: "",
    isVideo: false,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Combine user rooms, public rooms, and optimistic instantaneous rooms
  const allRooms = useMemo(() => {
    const map = new Map<string, RealtimeChatRoom>();
    Object.values(optimisticRooms).forEach((r) => map.set(r.id, r));
    userRooms.forEach((r) => map.set(r.id, r));
    publicRooms.forEach((r) => {
      if (!map.has(r.id)) map.set(r.id, r);
    });
    return Array.from(map.values()).sort((a, b) => {
      const tA = new Date(a.lastMessageTime || a.createdAt || 0).getTime();
      const tB = new Date(b.lastMessageTime || b.createdAt || 0).getTime();
      return tB - tA;
    });
  }, [userRooms, publicRooms, optimisticRooms]);

  const activeRoom = useMemo(() => {
    return allRooms.find((r) => r.id === activeRoomId) || null;
  }, [allRooms, activeRoomId]);

  const otherUserId = useMemo(() => {
    if (!activeRoom) return targetUserParam || null;
    if (activeRoom.roomType === "direct") {
      return activeRoom.participants?.find((id) => id !== currentUserId) || targetUserParam || null;
    }
    return null;
  }, [activeRoom, currentUserId, targetUserParam]);

  const isRoomAdmin = useMemo(() => {
    if (!activeRoom) return false;
    if (isPlatformAdmin) return true;
    if (activeRoom.creatorId === currentUserId) return true;
    return (activeRoom.adminIds || []).includes(currentUserId);
  }, [activeRoom, currentUserId, isPlatformAdmin]);

  const canPostInActiveRoom = useMemo(() => {
    if (!activeRoom) return true;
    if (!activeRoom.onlyAdminsCanPost) return true;
    return isRoomAdmin;
  }, [activeRoom, isRoomAdmin]);

  // Initial Firebase setup & auto-provisioning official rooms
  useEffect(() => {
    ensureFirebaseAuth();
    if (user?.id) {
      getOrCreateGeneralBethelChatRoom(user.id, currentUserName, currentUserAvatar).catch(console.warn);
      getOrCreateVIPTradeChatRoom(user.id, currentUserName, currentUserAvatar).catch(console.warn);
    }
  }, [user?.id, currentUserName, currentUserAvatar]);

  // Subscribe to user chat rooms
  useEffect(() => {
    if (!currentUserId) return;
    const unsubUser = subscribeToUserChats(currentUserId, (roomsList) => {
      setUserRooms(roomsList);
      setLoading(false);
    });

    const unsubPublic = subscribeToPublicCommunityRooms((pubList) => {
      setPublicRooms(pubList);
      setLoading(false);
    });

    return () => {
      unsubUser();
      unsubPublic();
    };
  }, [currentUserId]);

  // Handle URL query parameters (instant 0ms direct room opening)
  useEffect(() => {
    if (!currentUserId) return;

    if (roomIdParam) {
      setActiveRoomId(roomIdParam);
      setMobileView("chat");
      setLoading(false);
    } else if (officialRoomParam === "true" || officialRoomParam === "bethelincovibetv") {
      getOrCreateGeneralBethelChatRoom(currentUserId, currentUserName, currentUserAvatar).then((r) => {
        setActiveRoomId(r.id);
        setMobileView("chat");
        setLoading(false);
      });
    } else if (targetUserParam) {
      const sortedIds = [currentUserId, targetUserParam].sort();
      const directRoomId = `room_${sortedIds[0].replace(/[^a-zA-Z0-9_]/g, "_")}_${sortedIds[1].replace(/[^a-zA-Z0-9_]/g, "_")}`;
      const tName = targetNameParam || "Bethelincovibe Member";
      
      const syntheticRoom: RealtimeChatRoom = {
        id: directRoomId,
        name: tName,
        description: `Direct conversation with ${tName}`,
        roomType: "direct",
        avatarUrl: targetAvatarParam || "",
        avatarEmoji: "👤",
        creatorId: currentUserId,
        adminIds: [currentUserId, targetUserParam],
        participants: [currentUserId, targetUserParam],
        participantNames: {
          [currentUserId]: currentUserName,
          [targetUserParam]: tName,
        },
        participantAvatars: {
          [currentUserId]: currentUserAvatar,
          [targetUserParam]: targetAvatarParam || "",
        },
        createdAt: new Date().toISOString(),
      };

      setOptimisticRooms((prev) => ({ ...prev, [directRoomId]: syntheticRoom }));
      setActiveRoomId(directRoomId);
      setMobileView("chat");
      setLoading(false);

      // In background, ensure Firestore record is created / synchronized
      getOrCreateChatRoom(
        currentUserId,
        currentUserName,
        targetUserParam,
        tName,
        targetAvatarParam || undefined,
        undefined,
        currentUserAvatar
      ).catch(console.warn);
    }
  }, [roomIdParam, officialRoomParam, targetUserParam, targetNameParam, targetAvatarParam, currentUserId, currentUserName, currentUserAvatar]);

  // If no room is active and we have rooms, select the first one on desktop
  useEffect(() => {
    if (!activeRoomId && allRooms.length > 0 && !targetUserParam && !roomIdParam && !officialRoomParam) {
      setActiveRoomId(allRooms[0].id);
    }
  }, [activeRoomId, allRooms, targetUserParam, roomIdParam, officialRoomParam]);

  // Subscribe to messages in active room
  useEffect(() => {
    if (!activeRoomId) {
      setMessages([]);
      return;
    }

    const unsubMessages = subscribeToChatMessages(activeRoomId, (loadedMsgs) => {
      setMessages((prev) => {
        // Retain optimistic pending messages that are not yet returned from Firestore
        const pending = prev.filter(
          (p) =>
            p.isLocalPending &&
            !loadedMsgs.some(
              (l) => l.senderId === p.senderId && l.text === p.text && l.type === p.type
            )
        );

        // If incoming message from someone else, play sound
        if (prev.length > 0 && loadedMsgs.length > prev.length) {
          const last = loadedMsgs[loadedMsgs.length - 1];
          if (last.senderId !== currentUserId) {
            chatSounds.playReceive();
          }
        }
        return [...loadedMsgs, ...pending];
      });

      // Mark as read
      if (currentUserId) {
        markMessagesAsRead(activeRoomId, currentUserId);
      }

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    });

    const unsubTyping = subscribeToChatTyping(activeRoomId, currentUserId, (users) => {
      setTypingUsers(users);
    });

    return () => {
      unsubMessages();
      unsubTyping();
    };
  }, [activeRoomId, currentUserId]);

  // Directory Search (find verified businesses / members to chat with)
  useEffect(() => {
    if (!directorySearch.trim()) {
      setDiscoveredContacts([]);
      return;
    }

    let isCancelled = false;
    setIsSearchingDirectory(true);

    async function searchMembers() {
      try {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .or(`username.ilike.%${directorySearch.trim()}%,display_name.ilike.%${directorySearch.trim()}%`)
          .limit(8);

        if (!isCancelled) {
          const formatted = (profiles || [])
            .filter((p) => p.id !== currentUserId)
            .map((p) => ({
              id: p.id,
              name: p.display_name || (p.username ? `@${p.username}` : "Member"),
              avatar: p.avatar_url,
              role: p.username ? `@${p.username}` : "Verified Member",
            }));
          setDiscoveredContacts(formatted);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!isCancelled) setIsSearchingDirectory(false);
      }
    }

    const timer = setTimeout(searchMembers, 250);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [directorySearch, currentUserId]);

  // Handle typing indicator heartbeat
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    if (!activeRoomId) return;

    setChatTypingState(activeRoomId, currentUserId, currentUserName, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setChatTypingState(activeRoomId, currentUserId, currentUserName, false);
    }, 2000);
  };

  // Send text or media message (Instant Optimistic UI)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeRoomId) return;

    if (!canPostInActiveRoom) {
      toast.error("Only group admins are permitted to broadcast in this channel");
      return;
    }

    const cleanText = messageText.trim();
    if (!cleanText && !selectedMedia) return;

    const mediaToSend = selectedMedia;
    const replyToSend = replyingTo
      ? {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          text: replyingTo.text,
        }
      : undefined;

    // Generate local optimistic message
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const optimisticMsg: RealtimeChatMessage = {
      id: tempId,
      chatId: activeRoomId,
      senderId: currentUserId,
      senderName: currentUserName,
      senderAvatar: currentUserAvatar,
      text: cleanText,
      type: mediaToSend ? mediaToSend.type : "text",
      mediaUrl: mediaToSend?.url,
      fileName: mediaToSend?.fileName,
      fileSize: mediaToSend?.fileSize,
      createdAt: new Date().toISOString(),
      replyTo: replyToSend,
      isLocalPending: true,
    };

    // Instant UI update
    setMessages((prev) => [...prev, optimisticMsg]);
    setMessageText("");
    setSelectedMedia(null);
    setReplyingTo(null);
    chatSounds.playSend();

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 20);

    // Background Firestore write
    sendMessageToChat({
      chatId: activeRoomId,
      senderId: currentUserId,
      senderName: currentUserName,
      senderAvatar: currentUserAvatar,
      text: cleanText,
      type: mediaToSend ? mediaToSend.type : "text",
      mediaUrl: mediaToSend?.url,
      fileName: mediaToSend?.fileName,
      fileSize: mediaToSend?.fileSize,
      replyTo: replyToSend,
    })
      .then(() => {
        setChatTypingState(activeRoomId, currentUserId, currentUserName, false);
      })
      .catch((err: any) => {
        toast.error(err?.message || "Failed to deliver message");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      });
  };

  // Send voice note (Instant Optimistic UI)
  const handleSendVoiceNote = async (audioBlob: Blob, durationSeconds: number) => {
    if (!activeRoomId) return;

    setIsRecordingVoice(false);
    const replyToSend = replyingTo
      ? {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          text: replyingTo.text,
        }
      : undefined;
    setReplyingTo(null);

    const tempId = `temp_voice_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Read audio blob to base64 for instant optimistic preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;

      const optimisticVoiceMsg: RealtimeChatMessage = {
        id: tempId,
        chatId: activeRoomId,
        senderId: currentUserId,
        senderName: currentUserName,
        senderAvatar: currentUserAvatar,
        text: `🎙️ Voice Note (${Math.round(durationSeconds)}s)`,
        type: "voice_note",
        mediaUrl: base64Url,
        mediaDuration: durationSeconds,
        createdAt: new Date().toISOString(),
        replyTo: replyToSend,
        isLocalPending: true,
      };

      setMessages((prev) => [...prev, optimisticVoiceMsg]);
      chatSounds.playSend();
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 20);

      sendMessageToChat({
        chatId: activeRoomId,
        senderId: currentUserId,
        senderName: currentUserName,
        senderAvatar: currentUserAvatar,
        text: `🎙️ Voice Note (${Math.round(durationSeconds)}s)`,
        type: "voice_note",
        mediaUrl: base64Url,
        mediaDuration: durationSeconds,
        replyTo: replyToSend,
      }).catch((err: any) => {
        toast.error(err?.message || "Failed to send voice note");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      });
    };
    reader.readAsDataURL(audioBlob);
  };

  // Media file select handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size must be under 15MB");
      return;
    }

    setIsUploadingMedia(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      let mediaType: "image" | "video" | "file" = "file";
      if (file.type.startsWith("image/")) mediaType = "image";
      else if (file.type.startsWith("video/")) mediaType = "video";

      setSelectedMedia({
        url: base64Url,
        type: mediaType,
        fileName: file.name,
        fileSize: file.size,
      });
      setIsUploadingMedia(false);
      toast.success(`${file.name} ready to send`);
    };
    reader.onerror = () => {
      setIsUploadingMedia(false);
      toast.error("Failed to read file");
    };
    reader.readAsDataURL(file);
  };

  // Reaction toggle
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!activeRoomId) return;
    try {
      await toggleMessageReaction(activeRoomId, messageId, emoji, currentUserId);
    } catch (err) {
      console.warn(err);
    }
  };

  // Delete message for everyone
  const handleDeleteForEveryone = async (messageId: string) => {
    if (!activeRoomId) return;
    try {
      await deleteMessageForEveryone(activeRoomId, messageId);
      toast.success("Message deleted for everyone");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete message");
    }
  };

  // Create new custom room
  const handleCreateRoom = async (roomData: {
    name: string;
    description: string;
    roomType: "direct" | "group" | "business_inquiry" | "trade_mastermind";
    avatarEmoji: string;
  }) => {
    try {
      const newId = await createCustomChatRoom({
        creatorId: currentUserId,
        creatorName: currentUserName,
        creatorAvatar: currentUserAvatar,
        name: roomData.name,
        description: roomData.description,
        roomType: roomData.roomType === "business_inquiry" ? "trade_mastermind" : roomData.roomType,
        avatarEmoji: roomData.avatarEmoji,
        initialMemberIds: [currentUserId],
        onlyAdminsCanPost: false,
        onlyAdminsCanEditInfo: true,
      });
      setActiveRoomId(newId);
      setMobileView("chat");
      toast.success(`Group "${roomData.name}" created!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create room");
    }
  };

  // Start direct chat with user from directory (Instant Optimistic Room)
  const handleStartDirectChat = async (contact: { id: string; name: string; avatar?: string }) => {
    const sortedIds = [currentUserId, contact.id].sort();
    const directRoomId = `room_${sortedIds[0].replace(/[^a-zA-Z0-9_]/g, "_")}_${sortedIds[1].replace(/[^a-zA-Z0-9_]/g, "_")}`;
    
    const syntheticRoom: RealtimeChatRoom = {
      id: directRoomId,
      name: contact.name,
      description: `Direct conversation with ${contact.name}`,
      roomType: "direct",
      avatarUrl: contact.avatar || "",
      avatarEmoji: "👤",
      creatorId: currentUserId,
      adminIds: [currentUserId, contact.id],
      participants: [currentUserId, contact.id],
      participantNames: {
        [currentUserId]: currentUserName,
        [contact.id]: contact.name,
      },
      participantAvatars: {
        [currentUserId]: currentUserAvatar,
        [contact.id]: contact.avatar || "",
      },
      createdAt: new Date().toISOString(),
    };

    setOptimisticRooms((prev) => ({ ...prev, [directRoomId]: syntheticRoom }));
    setActiveRoomId(directRoomId);
    setDirectorySearch("");
    setDiscoveredContacts([]);
    setMobileView("chat");
    setLoading(false);
    toast.success(`Connected to chat with ${contact.name}`);

    // In background, ensure Firestore record is created / synchronized
    getOrCreateChatRoom(
      currentUserId,
      currentUserName,
      contact.id,
      contact.name,
      contact.avatar,
      undefined,
      currentUserAvatar
    ).catch(console.warn);
  };

  // Filtered rooms list by search query
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return allRooms;
    const q = searchQuery.toLowerCase();
    return allRooms.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.lastMessageText?.toLowerCase().includes(q)
    );
  }, [allRooms, searchQuery]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Community Chat &amp; Trade Hub | Bethelincovibe TV</title>
        <meta
          name="description"
          content="Real-time encrypted WhatsApp-style messaging, merchant collaboration, and VIP wholesale trade lounges."
        />
      </Helmet>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden h-[calc(100vh-64px)] max-h-[1000px] border-b border-border/80">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Chat Rooms List & Discover Directory */}
        {/* ========================================================================= */}
        <div
          className={`w-full md:w-[380px] lg:w-[420px] flex-shrink-0 flex flex-col border-r border-border bg-card/60 backdrop-blur-md transition-all ${
            mobileView === "chat" ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-border/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="h-9 w-9 ring-2 ring-primary/20 shrink-0">
                <AvatarImage src={currentUserAvatar} />
                <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                  {currentUserName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-black text-foreground truncate flex items-center gap-1.5">
                  Bethel Community
                  <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
                </h1>
                <p className="text-[11px] text-muted-foreground truncate">
                  {currentUserName} • Live
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  chatSounds.setEnabled(next);
                  toast.info(next ? "Chat audio enabled" : "Chat audio muted");
                }}
                title={soundEnabled ? "Mute sounds" : "Enable sounds"}
                className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
              >
                {soundEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4" />}
              </Button>

              <Button
                size="sm"
                onClick={() => setCreateRoomOpen(true)}
                className="h-8 px-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Group</span>
              </Button>
            </div>
          </div>

          {/* Search bar & Directory search */}
          <div className="p-3 space-y-2 border-b border-border/60">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chats or messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-background/80"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Quick Find Vendor / Member */}
            <div className="relative">
              <Users className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Find member or merchant to message..."
                value={directorySearch}
                onChange={(e) => setDirectorySearch(e.target.value)}
                className="pl-8 h-8 text-[11px] rounded-xl bg-muted/30 border-dashed"
              />
              {isSearchingDirectory && (
                <Loader2 className="absolute right-3 top-2 h-3.5 w-3.5 animate-spin text-primary" />
              )}
            </div>

            {/* Discovered Directory Contacts Dropdown */}
            {discoveredContacts.length > 0 && (
              <div className="rounded-2xl border border-primary/30 bg-card p-2 shadow-lg space-y-1 max-h-48 overflow-y-auto">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-2 py-0.5">
                  Verified Platform Members
                </p>
                {discoveredContacts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleStartDirectChat(c)}
                    className="w-full flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-muted text-left transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-7 w-7 ring-1 ring-primary/20">
                        <AvatarImage src={c.avatar} />
                        <AvatarFallback className="text-[10px] font-bold">
                          {c.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{c.role}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] py-0 px-1 font-bold text-primary border-primary/30">
                      Message
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chat Rooms Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {loading ? (
              <div className="p-8 text-center space-y-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                <p className="text-xs">Loading live discussions...</p>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-foreground">No conversations yet</p>
                <p className="text-[11px] text-muted-foreground">
                  Join an official group or search for members above to start a conversation.
                </p>
              </div>
            ) : (
              filteredRooms.map((room) => {
                const isActive = room.id === activeRoomId;
                const isGroup = room.roomType !== "direct";
                const isOfficial = room.isOfficial || room.roomType === "community" || room.roomType === "official";

                let displayName = room.name || "Chat Room";
                let displayAvatar = room.avatarUrl;
                if (!isGroup && room.participants) {
                  const otherId = room.participants.find((id) => id !== currentUserId) || room.participants[0];
                  displayName = room.participantNames?.[otherId] || displayName;
                  displayAvatar = room.participantAvatars?.[otherId] || displayAvatar;
                }

                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => {
                      setActiveRoomId(room.id);
                      setMobileView("chat");
                    }}
                    className={`w-full p-3 sm:p-3.5 flex items-start gap-3 text-left transition-all relative ${
                      isActive
                        ? "bg-primary/10 border-l-4 border-primary"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    {/* Room Avatar */}
                    <div className="relative shrink-0">
                      <Avatar className="h-11 w-11 rounded-2xl ring-1 ring-border shadow-xs">
                        {displayAvatar ? (
                          <AvatarImage src={displayAvatar} className="object-cover" />
                        ) : null}
                        <AvatarFallback className="text-base font-bold bg-primary/15 text-primary">
                          {room.avatarEmoji || (isGroup ? "👥" : displayName.slice(0, 2).toUpperCase())}
                        </AvatarFallback>
                      </Avatar>
                      {isOfficial && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] shadow-xs">
                          <ShieldCheck className="h-3 w-3" />
                        </div>
                      )}
                    </div>

                    {/* Room Info & Last Message Snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                            {displayName}
                          </p>
                          {isOfficial && (
                            <Badge className="text-[9px] py-0 px-1 bg-emerald-500/15 text-emerald-600 border-emerald-500/30 font-extrabold shrink-0">
                              Official
                            </Badge>
                          )}
                          {room.roomType === "trade_mastermind" && (
                            <Badge className="text-[9px] py-0 px-1 bg-purple-500/15 text-purple-600 border-purple-500/30 font-extrabold shrink-0">
                              VIP Trade
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {room.lastMessageTime
                            ? formatDistanceToNow(new Date(room.lastMessageTime), {
                                addSuffix: false,
                              })
                            : ""}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground truncate mt-1 line-clamp-1 font-medium">
                        {room.lastMessageSenderName ? `${room.lastMessageSenderName}: ` : ""}
                        {room.lastMessageText || room.description || "Start chatting..."}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Active Chat Room Conversation & Live Input Bar */}
        {/* ========================================================================= */}
        <div
          className={`flex-1 flex flex-col bg-background relative ${
            mobileView === "list" ? "hidden md:flex" : "flex"
          }`}
        >
          {activeRoom ? (
            <>
              {/* Active Room Top Header */}
              <div className="p-3 sm:p-3.5 border-b border-border/80 flex items-center justify-between gap-2 bg-card/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Mobile back button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileView("list")}
                    className="h-8 w-8 rounded-xl md:hidden shrink-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>

                  {/* Header Avatar & Name with profile link */}
                  {otherUserId ? (
                    <Link
                      to={`/u/${otherUserId}`}
                      className="flex items-center gap-2.5 min-w-0 group hover:opacity-90 transition-opacity"
                    >
                      <Avatar className="h-10 w-10 rounded-2xl ring-2 ring-primary/20 shrink-0 group-hover:ring-primary/50 transition-all">
                        {activeRoom.avatarUrl ? (
                          <AvatarImage src={activeRoom.avatarUrl} className="object-cover" />
                        ) : null}
                        <AvatarFallback className="text-base font-bold bg-primary/15 text-primary">
                          {activeRoom.avatarEmoji || "👤"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h2 className="text-sm sm:text-base font-black text-foreground truncate group-hover:text-primary transition-colors">
                            {activeRoom.name || "Bethel Community"}
                          </h2>
                          {activeRoom.isOfficial && (
                            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {typingUsers.length > 0 ? (
                            <span className="text-emerald-500 font-bold animate-pulse">
                              {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-emerald-600 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                              Direct Verified Contact
                            </span>
                          )}
                        </p>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-10 w-10 rounded-2xl ring-2 ring-primary/20 shrink-0">
                        {activeRoom.avatarUrl ? (
                          <AvatarImage src={activeRoom.avatarUrl} className="object-cover" />
                        ) : null}
                        <AvatarFallback className="text-base font-bold bg-primary/15 text-primary">
                          {activeRoom.avatarEmoji || (activeRoom.roomType !== "direct" ? "👥" : "👤")}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h2 className="text-sm sm:text-base font-black text-foreground truncate">
                            {activeRoom.name || "Bethel Community"}
                          </h2>
                          {activeRoom.isOfficial && (
                            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {typingUsers.length > 0 ? (
                            <span className="text-emerald-500 font-bold animate-pulse">
                              {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                            </span>
                          ) : activeRoom.roomType !== "direct" ? (
                            `${(activeRoom.participants || []).length} members active`
                          ) : (
                            "Direct Encrypted Message"
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {otherUserId && (
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary"
                      title="View Member Profile & Store"
                    >
                      <Link to={`/u/${otherUserId}`}>
                        <User className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}

                  {/* Call Simulation Buttons */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setActiveCall({
                        isOpen: true,
                        contactName: activeRoom.name || "Community Member",
                        contactAvatar: activeRoom.avatarUrl,
                        isVideo: false,
                      })
                    }
                    title="Start Voice Call"
                    className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setActiveCall({
                        isOpen: true,
                        contactName: activeRoom.name || "Community Member",
                        contactAvatar: activeRoom.avatarUrl,
                        isVideo: true,
                      })
                    }
                    title="Start Video Call"
                    className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary"
                  >
                    <Video className="h-4 w-4" />
                  </Button>

                  {/* Room Settings / Admin Management Dialog */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAdminDialogOpen(true)}
                    title="Group Settings & Members"
                    className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages Container with WhatsApp Background */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 relative">
                <WhatsAppDoodleBackground theme={wallpaperTheme} />

                <div className="relative z-10 space-y-1">
                  {/* Security Notice Pill */}
                  <div className="flex justify-center my-3">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-semibold shadow-xs">
                      <Lock className="h-3 w-3" />
                      <span>End-to-end verified real-time communications channel.</span>
                    </div>
                  </div>

                  {messages.length === 0 ? (
                    <div className="py-16 text-center space-y-2">
                      <p className="text-xs font-bold text-muted-foreground">
                        No messages yet in this lounge.
                      </p>
                      <p className="text-[11px] text-muted-foreground/80">
                        Be the first to say hello or post trade inquiry!
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} id={`msg-${msg.id}`}>
                        <ChatMessageBubble
                          message={msg}
                          isMe={msg.senderId === currentUserId}
                          currentUserId={currentUserId}
                          isGroupAdmin={isRoomAdmin}
                          isPlatformAdmin={isPlatformAdmin}
                          onReply={(m) => {
                            setReplyingTo(m);
                            messageInputRef.current?.focus();
                          }}
                          onToggleReaction={handleToggleReaction}
                          onDeleteForEveryone={handleDeleteForEveryone}
                          onScrollToMessage={(id) => {
                            const el = document.getElementById(`msg-${id}`);
                            el?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }}
                        />
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Replying To Preview Banner */}
              {replyingTo && (
                <div className="p-2.5 px-4 bg-muted/90 border-t border-border flex items-center justify-between gap-3 z-10">
                  <div className="flex items-center gap-2 min-w-0 border-l-4 border-primary pl-2.5">
                    <Reply className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground">
                        Replying to {replyingTo.senderName}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate line-clamp-1 italic">
                        "{replyingTo.text}"
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setReplyingTo(null)}
                    className="h-6 w-6 rounded-full"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* Selected Media Preview Banner */}
              {selectedMedia && (
                <div className="p-2.5 px-4 bg-card border-t border-border flex items-center justify-between gap-3 z-10">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedMedia.type === "image" ? (
                      <img
                        src={selectedMedia.url}
                        alt="Preview"
                        className="h-12 w-12 rounded-xl object-cover border"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                        <FileText className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        {selectedMedia.fileName || "Ready to send attachment"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {selectedMedia.fileSize ? `${(selectedMedia.fileSize / 1024).toFixed(1)} KB` : "Attached file"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedMedia(null)}
                    className="h-7 w-7 rounded-full text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Bottom Messaging Input Bar */}
              <div className="p-2.5 sm:p-3 border-t border-border/80 bg-card/90 backdrop-blur-md z-10">
                {!canPostInActiveRoom ? (
                  <div className="p-3 text-center bg-muted/60 rounded-2xl text-xs font-bold text-muted-foreground border">
                    🔒 Only designated group administrators can broadcast in this channel.
                  </div>
                ) : isRecordingVoice ? (
                  <VoiceNoteRecorder
                    onSend={handleSendVoiceNote}
                    onCancel={() => setIsRecordingVoice(false)}
                  />
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*,video/*,.pdf,.doc,.docx"
                      onChange={handleFileSelect}
                    />

                    {/* Paperclip attachment button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingMedia}
                      className="h-10 w-10 rounded-2xl text-muted-foreground hover:text-foreground shrink-0"
                    >
                      {isUploadingMedia ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Paperclip className="h-5 w-5" />
                      )}
                    </Button>

                    {/* Message input */}
                    <div className="flex-1 relative">
                      <Input
                        ref={messageInputRef}
                        placeholder={`Message ${activeRoom.name || "group"}... (@all, @name)`}
                        value={messageText}
                        onChange={handleInputChange}
                        className="rounded-2xl h-11 text-xs sm:text-sm bg-background/80 pr-10 border-border/80 shadow-xs"
                      />
                    </div>

                    {/* Mic Button or Send Button */}
                    {messageText.trim() || selectedMedia ? (
                      <Button
                        type="submit"
                        className="h-11 w-11 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-md transition-all active:scale-95"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => setIsRecordingVoice(true)}
                        className="h-11 w-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-md transition-all active:scale-95"
                        title="Record voice note"
                      >
                        <Mic className="h-5 w-5" />
                      </Button>
                    )}
                  </form>
                )}
              </div>
            </>
          ) : (
            /* No room selected placeholder */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-lg">
                <MessageCircle className="h-8 w-8" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-lg font-black text-foreground">
                  Bethelincovibe TV Community
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Connect with verified merchants, participate in wholesale mastermind lounges, or start private encrypted conversations.
                </p>
              </div>
              <Button
                onClick={() => setCreateRoomOpen(true)}
                className="rounded-2xl bg-primary text-primary-foreground font-bold text-xs h-10 px-6 gap-2"
              >
                <Plus className="h-4 w-4" /> Create Discussion Lounge
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create Room Dialog */}
      <CreateChatRoomDialog
        open={createRoomOpen}
        onOpenChange={setCreateRoomOpen}
        onCreateRoom={handleCreateRoom}
      />

      {/* Group Admin & Permissions Dialog */}
      {activeRoom && (
        <ChatRoomAdminDialog
          open={adminDialogOpen}
          onOpenChange={setAdminDialogOpen}
          room={activeRoom}
          currentUserId={currentUserId}
          currentUserEmail={currentUserEmail}
          onRoomDeleted={(deletedId) => {
            if (activeRoomId === deletedId) {
              setActiveRoomId(null);
              setMobileView("list");
            }
          }}
        />
      )}

      {/* WebRTC Call Modal */}
      <WebRTCCallModal
        open={activeCall.isOpen}
        onOpenChange={(open) => setActiveCall((prev) => ({ ...prev, isOpen: open }))}
        contactName={activeCall.contactName}
        contactAvatar={activeCall.contactAvatar}
        isVideo={activeCall.isVideo}
      />
    </div>
  );
}
