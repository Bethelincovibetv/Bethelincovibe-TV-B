import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Send,
  Mic,
  Paperclip,
  Phone,
  Video,
  MessageCircle,
  Lock,
  ShieldCheck,
  Volume2,
  VolumeX,
  Users,
  Plus,
  ArrowLeft,
  FileText,
  Trash2,
  Loader2,
  Reply,
  X,
  Settings2,
  Radio,
  User,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Bot,
  Flame,
  Globe,
  CheckCircle2,
  ChevronDown,
  Palette,
  ExternalLink,
  Copy,
  Info,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { WhatsAppDoodleBackground } from "@/components/chat/WhatsAppDoodleBackground";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { VoiceNoteRecorder } from "@/components/chat/VoiceNoteRecorder";
import { CreateChatRoomDialog } from "@/components/chat/CreateChatRoomDialog";
import { ChatRoomAdminDialog } from "@/components/chat/ChatRoomAdminDialog";
import { EmojiPickerPopover } from "@/components/chat/EmojiPickerPopover";
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
  updateUserPresence,
  subscribeToUserPresence,
  getFirestoreDiagnostics,
} from "@/lib/firebaseChat";
import { uploadChatAttachment } from "@/lib/chatStorage";
import {
  AI_ADVISORS,
  OFFICIAL_COMMUNITY_LOUNGES,
  getDefaultOfficialRooms,
  getDefaultAIAdvisorRooms,
  generateAIAdvisorResponse,
  getAIAdvisorByChatId,
  isAIAdvisorChat,
} from "@/lib/chatAIAdvisors";

export default function UserMessages() {
  const { user } = useAuth();
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

  // Sidebar Filter Tab State
  const [sidebarTab, setSidebarTab] = useState<"all" | "official" | "ai" | "direct" | "trade" | "discover">("all");

  // Rooms & Active Chat State
  const [userRooms, setUserRooms] = useState<RealtimeChatRoom[]>([]);
  const [publicRooms, setPublicRooms] = useState<RealtimeChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RealtimeChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // In-Chat Search State
  const [isSearchingInChat, setIsSearchingInChat] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");

  // Pinned Notice Collapsible Banner
  const [showPinnedNotice, setShowPinnedNotice] = useState(true);

  // Directory Search State (Search users to start 1-on-1 chat)
  const [directorySearch, setDirectorySearch] = useState("");
  const [discoveredContacts, setDiscoveredContacts] = useState<any[]>([]);
  const [isSearchingDirectory, setIsSearchingDirectory] = useState(false);
  const [featuredMerchants, setFeaturedMerchants] = useState<any[]>([]);

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

  // AI Advisor Chat Local Message State
  const [aiChatMessages, setAiChatMessages] = useState<Record<string, RealtimeChatMessage[]>>({});
  const [isAIGenerating, setIsAIGenerating] = useState(false);

  // Firestore connection & API status
  const [firestoreStatus, setFirestoreStatus] = useState<{
    connected: boolean;
    message: string;
    isApiDisabled: boolean;
    projectId: string;
  } | null>(null);
  const [checkingFirestore, setCheckingFirestore] = useState(false);

  const checkFirestoreHealth = async () => {
    setCheckingFirestore(true);
    try {
      const diag = await getFirestoreDiagnostics();
      setFirestoreStatus(diag);
    } catch {
      // Ignored
    } finally {
      setCheckingFirestore(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial featured merchants for directory discovery
  useEffect(() => {
    async function loadFeatured() {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .limit(10);
        if (data && data.length > 0) {
          setFeaturedMerchants(
            data
              .filter((p) => p.id !== currentUserId)
              .map((p) => ({
                id: p.id,
                name: p.display_name || (p.username ? `@${p.username}` : "Verified Member"),
                avatar: p.avatar_url,
                role: p.username ? `@${p.username}` : "Verified Merchant",
              }))
          );
        }
      } catch (e) {
        console.warn("Featured merchants load:", e);
      }
    }
    loadFeatured();
  }, [currentUserId]);

  // Generate All Rooms (combining Official Lounges, AI Advisors, Firebase User Rooms, and Public Rooms)
  const allRooms = useMemo(() => {
    const map = new Map<string, RealtimeChatRoom>();

    // 1. Add Default Official Community Lounges
    getDefaultOfficialRooms().forEach((r) => map.set(r.id, r));

    // 2. Add Default AI Executive Advisors
    getDefaultAIAdvisorRooms(currentUserId, currentUserName, currentUserAvatar).forEach((r) =>
      map.set(r.id, r)
    );

    // 3. Merge Firebase Public Lounges (which may have newer lastMessages)
    publicRooms.forEach((r) => {
      const existing = map.get(r.id);
      if (existing) {
        map.set(r.id, { ...existing, ...r });
      } else {
        map.set(r.id, r);
      }
    });

    // 4. Merge User Personal Chats
    userRooms.forEach((r) => {
      const existing = map.get(r.id);
      if (existing) {
        map.set(r.id, { ...existing, ...r });
      } else {
        map.set(r.id, r);
      }
    });

    // Sort by most recent message or creation
    return Array.from(map.values()).sort((a, b) => {
      const tA = new Date(a.lastMessageTime || a.createdAt || 0).getTime();
      const tB = new Date(b.lastMessageTime || b.createdAt || 0).getTime();
      return tB - tA;
    });
  }, [userRooms, publicRooms, currentUserId, currentUserName, currentUserAvatar]);

  // Filtered rooms by tab and search query
  const filteredRooms = useMemo(() => {
    let list = allRooms;

    if (sidebarTab === "official") {
      list = list.filter(
        (r) => r.isOfficial && r.roomType !== "direct" && r.roomType !== "trade_mastermind"
      );
    } else if (sidebarTab === "ai") {
      list = list.filter((r) => isAIAdvisorChat(r.id) || isAIAdvisorChat(r.creatorId || ""));
    } else if (sidebarTab === "trade") {
      list = list.filter((r) => r.roomType === "trade_mastermind");
    } else if (sidebarTab === "direct") {
      list = list.filter(
        (r) => r.roomType === "direct" && !isAIAdvisorChat(r.id) && !isAIAdvisorChat(r.creatorId || "")
      );
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.lastMessageText?.toLowerCase().includes(q)
    );
  }, [allRooms, sidebarTab, searchQuery]);

  const activeRoom = useMemo(() => {
    return allRooms.find((r) => r.id === activeRoomId) || null;
  }, [allRooms, activeRoomId]);

  const activeAIAdvisor = useMemo(() => {
    if (!activeRoomId) return null;
    return getAIAdvisorByChatId(activeRoomId) || (activeRoom?.creatorId ? getAIAdvisorByChatId(activeRoom.creatorId) : null);
  }, [activeRoomId, activeRoom]);

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

  // Real-time presence for contact in active direct chat
  const [otherPresence, setOtherPresence] = useState<{
    status: "online" | "offline";
    lastSeen?: any;
    userName?: string;
  } | null>(null);

  useEffect(() => {
    if (!otherUserId || isAIAdvisorChat(otherUserId)) {
      setOtherPresence(null);
      return;
    }
    const unsub = subscribeToUserPresence(otherUserId, (presence) => {
      setOtherPresence(presence);
    });
    return () => unsub();
  }, [otherUserId]);

  // Current user presence heartbeat and visibility listener
  useEffect(() => {
    if (!currentUserId || currentUserId.startsWith("guest_")) return;

    updateUserPresence(currentUserId, currentUserName, "online");

    const heartbeat = setInterval(() => {
      if (document.visibilityState === "visible") {
        updateUserPresence(currentUserId, currentUserName, "online");
      }
    }, 45000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateUserPresence(currentUserId, currentUserName, "online");
      } else {
        updateUserPresence(currentUserId, currentUserName, "offline");
      }
    };

    const onBeforeUnload = () => {
      updateUserPresence(currentUserId, currentUserName, "offline");
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
      updateUserPresence(currentUserId, currentUserName, "offline");
    };
  }, [currentUserId, currentUserName]);

  // Initial Firebase setup & auto-provisioning official rooms
  useEffect(() => {
    ensureFirebaseAuth();
    checkFirestoreHealth();
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
    });

    const unsubPublic = subscribeToPublicCommunityRooms((pubList) => {
      setPublicRooms(pubList);
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
    } else if (officialRoomParam === "true" || officialRoomParam === "bethelincovibetv") {
      getOrCreateGeneralBethelChatRoom(currentUserId, currentUserName, currentUserAvatar).then((r) => {
        setActiveRoomId(r.id);
        setMobileView("chat");
      });
    } else if (targetUserParam) {
      const tName = targetNameParam || "Bethelincovibe Member";
      getOrCreateChatRoom(
        currentUserId,
        currentUserName,
        targetUserParam,
        tName,
        targetAvatarParam || undefined,
        undefined,
        currentUserAvatar
      )
        .then((room) => {
          const id = typeof room === "string" ? room : (room as any)?.id;
          if (id) setActiveRoomId(id);
          setMobileView("chat");
        })
        .catch((err) => {
          toast.error(err?.message || "Could not create this conversation");
        });
    }
  }, [
    roomIdParam,
    officialRoomParam,
    targetUserParam,
    targetNameParam,
    targetAvatarParam,
    currentUserId,
    currentUserName,
    currentUserAvatar,
  ]);

  // If no room is active and we have rooms, auto-select official general room on desktop
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

    // Check if this is an AI Advisor chat
    if (activeAIAdvisor) {
      const existing = aiChatMessages[activeRoomId];
      if (existing && existing.length > 0) {
        setMessages(existing);
      } else {
        // Initial greeting message from the AI Advisor
        const initialMsg: RealtimeChatMessage = {
          id: `init_ai_${Date.now()}`,
          chatId: activeRoomId,
          senderId: activeAIAdvisor.id,
          senderName: activeAIAdvisor.name,
          senderAvatar: activeAIAdvisor.avatar,
          text: activeAIAdvisor.greeting,
          type: "text",
          createdAt: new Date().toISOString(),
        };
        setMessages([initialMsg]);
        setAiChatMessages((prev) => ({ ...prev, [activeRoomId]: [initialMsg] }));
      }
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      return;
    }

    // Normal Firestore Subscription for Community & User Rooms
    const unsubMessages = subscribeToChatMessages(activeRoomId, (loadedMsgs) => {
      setMessages((prev) => {
        // Retain optimistic pending messages that are not yet returned from Firestore
        const pending = prev.filter(
          (p) =>
            p.isLocalPending &&
            !loadedMsgs.some((l) => l.senderId === p.senderId && l.text === p.text && l.type === p.type)
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
  }, [activeRoomId, currentUserId, activeAIAdvisor]);

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
    if (!activeRoomId || activeAIAdvisor) return;

    setChatTypingState(activeRoomId, currentUserId, currentUserName, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setChatTypingState(activeRoomId, currentUserId, currentUserName, false);
    }, 2000);
  };

  // Send text or media message (Optimistic UI + Instant AI Response for Advisor Lounges)
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    if (!activeRoomId) return;

    if (!canPostInActiveRoom) {
      toast.error("Only group admins are permitted to broadcast in this channel");
      return;
    }

    const cleanText = (customText !== undefined ? customText : messageText).trim();
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

    // If active chat is an AI Executive Advisor, generate AI response!
    if (activeAIAdvisor) {
      const updatedMessages = [...messages, optimisticMsg];
      setAiChatMessages((prev) => ({ ...prev, [activeRoomId]: updatedMessages }));
      setIsAIGenerating(true);

      // Simulate realistic typing indicator delay
      setTimeout(async () => {
        try {
          const aiResponseText = await generateAIAdvisorResponse(
            activeAIAdvisor,
            cleanText,
            currentUserName
          );

          const aiMsg: RealtimeChatMessage = {
            id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            chatId: activeRoomId,
            senderId: activeAIAdvisor.id,
            senderName: activeAIAdvisor.name,
            senderAvatar: activeAIAdvisor.avatar,
            text: aiResponseText,
            type: "text",
            createdAt: new Date().toISOString(),
          };

          setMessages((prev) => [...prev, aiMsg]);
          setAiChatMessages((prev) => ({
            ...prev,
            [activeRoomId]: [...(prev[activeRoomId] || []), aiMsg],
          }));
          chatSounds.playReceive();
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 30);
        } catch (err: any) {
          toast.error(err?.message || "Could not generate advisor reply");
        } finally {
          setIsAIGenerating(false);
        }
      }, 1000);
      return;
    }

    // Background Firestore write for Community / Direct Chats
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
    reader.onload = async (event) => {
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

      try {
        let permanentUrl = base64Url;
        try {
          const uploaded = await uploadChatAttachment(audioBlob, "voice_notes", `vn_${Date.now()}.webm`);
          if (uploaded) permanentUrl = uploaded;
        } catch {
          // Keep base64 fallback if storage upload encounters network constraint
        }

        if (activeAIAdvisor) {
          setAiChatMessages((prev) => ({
            ...prev,
            [activeRoomId]: [...(prev[activeRoomId] || []), optimisticVoiceMsg],
          }));
          return;
        }

        await sendMessageToChat({
          chatId: activeRoomId,
          senderId: currentUserId,
          senderName: currentUserName,
          senderAvatar: currentUserAvatar,
          text: `🎙️ Voice Note (${Math.round(durationSeconds)}s)`,
          type: "voice_note",
          mediaUrl: permanentUrl,
          mediaDuration: durationSeconds,
          replyTo: replyToSend,
        });
      } catch (err: any) {
        toast.error(err?.message || "Failed to send voice note");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    };
    reader.readAsDataURL(audioBlob);
  };

  // Media file select handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size must be under 15MB");
      return;
    }

    setIsUploadingMedia(true);
    let mediaType: "image" | "video" | "file" = "file";
    let folder: "images" | "videos" | "files" = "files";
    if (file.type.startsWith("image/")) {
      mediaType = "image";
      folder = "images";
    } else if (file.type.startsWith("video/")) {
      mediaType = "video";
      folder = "videos";
    }

    try {
      const uploadedUrl = await uploadChatAttachment(file, folder, file.name);
      setSelectedMedia({
        url: uploadedUrl,
        type: mediaType,
        fileName: file.name,
        fileSize: file.size,
      });
      toast.success(`${file.name} ready to send`);
    } catch {
      // Fallback to data URL for seamless offline/local preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        setSelectedMedia({
          url: base64Url,
          type: mediaType,
          fileName: file.name,
          fileSize: file.size,
        });
        toast.success(`${file.name} ready to send`);
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingMedia(false);
    }
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
    try {
      setLoading(true);
      const room = await getOrCreateChatRoom(
        currentUserId,
        currentUserName,
        contact.id,
        contact.name,
        contact.avatar,
        undefined,
        currentUserAvatar
      );
      const targetRoomId = typeof room === "string" ? room : (room as any)?.id;
      if (targetRoomId) setActiveRoomId(targetRoomId);
      setDirectorySearch("");
      setDiscoveredContacts([]);
      setMobileView("chat");
      setLoading(false);
      toast.success(`Connected to chat with ${contact.name}`);
    } catch (err: any) {
      setLoading(false);
      toast.error(err?.message || "Could not start this conversation");
    }
  };

  // Quick Prompt Chips based on active room type or advisor
  const currentPromptChips = useMemo(() => {
    if (activeAIAdvisor) {
      return activeAIAdvisor.quickPrompts;
    }
    const official = OFFICIAL_COMMUNITY_LOUNGES.find((l) => l.id === activeRoomId);
    if (official) {
      return official.quickPrompts;
    }
    if (activeRoom?.roomType === "trade_mastermind") {
      return [
        "📦 Request wholesale bulk price quotation",
        "🛡️ Request Bethel Escrow protection for this deal",
        "🤝 Are you open to cargo container freight sharing?",
        "🏷️ What is the minimum order quantity (MOQ)?",
      ];
    }
    return [
      "👋 Hello! Inquiring about your product listing",
      "📦 Is this item available for fast nationwide delivery?",
      "🚚 What is the delivery timeframe to my location?",
      "🤝 Can we discuss wholesale pricing for bulk order?",
    ];
  }, [activeRoomId, activeAIAdvisor, activeRoom]);

  // Messages filtered by in-chat search
  const visibleMessages = useMemo(() => {
    if (!chatSearchQuery.trim()) return messages;
    const q = chatSearchQuery.toLowerCase();
    return messages.filter((m) => m.text?.toLowerCase().includes(q) || m.senderName?.toLowerCase().includes(q));
  }, [messages, chatSearchQuery]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Real-Time Chat &amp; Trade Hub | Bethelincovibe TV</title>
        <meta
          name="description"
          content="Real-time encrypted WhatsApp-style messaging, AI executive advisors, merchant collaboration, and VIP wholesale trade lounges."
        />
      </Helmet>

      {/* Firestore Infrastructure Status Banner (if offline/disabled) */}
      {firestoreStatus && !firestoreStatus.connected && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>Cloud Sync Status:</strong>{" "}
              {firestoreStatus.isApiDisabled ? (
                <>
                  Cloud Firestore API is activating for project{" "}
                  <code className="font-mono bg-amber-500/15 px-1 py-0.5 rounded font-bold">
                    {firestoreStatus.projectId}
                  </code>
                  . Local cache and AI advisors remain 100% active.
                </>
              ) : (
                firestoreStatus.message
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] rounded-lg border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 gap-1.5"
              onClick={checkFirestoreHealth}
              disabled={checkingFirestore}
            >
              <RefreshCw className={`w-3 h-3 ${checkingFirestore ? "animate-spin" : ""}`} />
              {checkingFirestore ? "Checking..." : "Re-check"}
            </Button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden h-[calc(100dvh-64px)] max-h-[1000px] w-full max-w-full border-b border-border/80">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Chat Rooms List & Discover Directory */}
        {/* ========================================================================= */}
        <div
          className={`w-full md:w-[380px] lg:w-[420px] flex-shrink-0 flex flex-col border-r border-border bg-card/60 backdrop-blur-md transition-all max-w-full overflow-hidden ${
            mobileView === "chat" ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Top Bar / Header */}
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
                  Bethel Hub
                  <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
                </h1>
                <p className="text-[11px] text-muted-foreground truncate">
                  {currentUserName} • Live
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Sound toggle button */}
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

              {/* Create new group button */}
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

          {/* Search bar */}
          <div className="p-3 space-y-2 border-b border-border/60">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chats, merchants, advisors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs rounded-xl bg-background/80"
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

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
              {[
                { id: "all", label: "All Chats", icon: MessageCircle },
                { id: "official", label: "Lounges", icon: Globe },
                { id: "ai", label: "AI Advisors", icon: Bot },
                { id: "trade", label: "VIP Trade", icon: Flame },
                { id: "direct", label: "Direct DMs", icon: User },
                { id: "discover", label: "Discover", icon: Users },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = sidebarTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSidebarTab(tab.id as any)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 whitespace-nowrap transition-all ${
                      active
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat Rooms Scroll List OR Discover Tab */}
          {sidebarTab === "discover" ? (
            /* Discover Tab: Verified Merchants & Community Search */
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div className="space-y-1.5">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground px-1">
                  Search Platform Members
                </p>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by username or business name..."
                    value={directorySearch}
                    onChange={(e) => setDirectorySearch(e.target.value)}
                    className="pl-8 h-8 text-xs rounded-xl bg-background"
                  />
                  {isSearchingDirectory && (
                    <Loader2 className="absolute right-3 top-2 h-3.5 w-3.5 animate-spin text-primary" />
                  )}
                </div>
              </div>

              {discoveredContacts.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-primary px-1">
                    Search Results
                  </p>
                  {discoveredContacts.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-2xl border bg-card/80 hover:bg-muted/50 flex items-center justify-between gap-2 transition-all shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-9 w-9 rounded-xl ring-1 ring-border">
                          <AvatarImage src={c.avatar} />
                          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                            {c.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{c.role}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleStartDirectChat(c)}
                        className="h-7 px-2.5 text-[11px] rounded-xl font-bold bg-primary text-primary-foreground gap-1"
                      >
                        <MessageCircle className="h-3 w-3" />
                        Chat
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Featured Verified Merchants */}
              <div className="space-y-1.5 pt-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-1 flex items-center justify-between">
                  <span>Verified Platform Merchants</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 inline" />
                </p>
                {featuredMerchants.length > 0 ? (
                  featuredMerchants.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-2xl border bg-card/80 hover:bg-muted/50 flex items-center justify-between gap-2 transition-all shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-9 w-9 rounded-xl ring-1 ring-border">
                          <AvatarImage src={m.avatar} />
                          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                            {m.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate flex items-center gap-1">
                            {m.name}
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 inline shrink-0" />
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{m.role}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartDirectChat(m)}
                        className="h-7 px-2.5 text-[11px] rounded-xl font-bold border-primary/30 text-primary hover:bg-primary/10 gap-1"
                      >
                        <MessageCircle className="h-3 w-3" />
                        Message
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground p-3 text-center">
                    Loading verified directory merchants...
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Regular Chat Rooms List */
            <div className="flex-1 overflow-y-auto divide-y divide-border/40">
              {filteredRooms.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-foreground">No conversations match</p>
                  <p className="text-[11px] text-muted-foreground">
                    Try another search term or click "All Chats" to see all active lounges.
                  </p>
                </div>
              ) : (
                filteredRooms.map((room) => {
                  const isActive = room.id === activeRoomId;
                  const isGroup = room.roomType !== "direct";
                  const isOfficial = room.isOfficial || room.roomType === "community" || room.roomType === "official";
                  const isAI = isAIAdvisorChat(room.id) || isAIAdvisorChat(room.creatorId || "");

                  let displayName = room.name || "Chat Room";
                  let displayAvatar = room.avatarUrl;
                  if (!isGroup && room.participants) {
                    const otherId = room.participants.find((id) => id !== currentUserId) || room.participants[0];
                    displayName = room.participantNames?.[otherId] || displayName;
                    displayAvatar = room.participantAvatars?.[otherId] || displayAvatar;
                  }

                  const unreadCount =
                    (room as any)[`unreadCount_${currentUserId}`] ||
                    (room.unreadCounts as any)?.[currentUserId] ||
                    0;

                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => {
                        setActiveRoomId(room.id);
                        setMobileView("chat");
                      }}
                      className={`w-full p-3 sm:p-3.5 flex items-start gap-3 text-left transition-all relative ${
                        isActive ? "bg-primary/10 border-l-4 border-primary" : "hover:bg-muted/40"
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
                        {isOfficial && !isAI && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] shadow-xs">
                            <ShieldCheck className="h-3 w-3" />
                          </div>
                        )}
                        {isAI && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] shadow-xs">
                            <Bot className="h-3 w-3" />
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
                            {isOfficial && !isAI && (
                              <Badge className="text-[9px] py-0 px-1 bg-emerald-500/15 text-emerald-600 border-emerald-500/30 font-extrabold shrink-0">
                                Official
                              </Badge>
                            )}
                            {isAI && (
                              <Badge className="text-[9px] py-0 px-1 bg-blue-500/15 text-blue-600 border-blue-500/30 font-extrabold shrink-0">
                                AI Advisor
                              </Badge>
                            )}
                            {room.roomType === "trade_mastermind" && (
                              <Badge className="text-[9px] py-0 px-1 bg-purple-500/15 text-purple-600 border-purple-500/30 font-extrabold shrink-0">
                                VIP Trade
                              </Badge>
                            )}
                          </div>
                          <span
                            className={`text-[10px] whitespace-nowrap ${
                              unreadCount > 0 ? "text-emerald-500 font-bold" : "text-muted-foreground"
                            }`}
                          >
                            {room.lastMessageTime
                              ? formatDistanceToNow(new Date(room.lastMessageTime), {
                                  addSuffix: false,
                                })
                              : ""}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-1">
                          <p
                            className={`text-xs truncate line-clamp-1 ${
                              unreadCount > 0 ? "text-foreground font-bold" : "text-muted-foreground font-medium"
                            }`}
                          >
                            {room.lastMessageSenderName ? `${room.lastMessageSenderName}: ` : ""}
                            {room.lastMessageText || room.description || "Start chatting..."}
                          </p>
                          {unreadCount > 0 && (
                            <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
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
                  {otherUserId && !activeAIAdvisor ? (
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
                          ) : otherPresence?.status === "online" ? (
                            <span className="flex items-center gap-1 text-emerald-600 font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                              Online
                            </span>
                          ) : otherPresence?.lastSeen ? (
                            <span className="text-muted-foreground font-normal">
                              Last seen{" "}
                              {(() => {
                                try {
                                  const d = otherPresence.lastSeen?.toDate
                                    ? otherPresence.lastSeen.toDate()
                                    : new Date(otherPresence.lastSeen);
                                  return formatDistanceToNow(d, { addSuffix: true });
                                } catch {
                                  return "recently";
                                }
                              })()}
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
                          {activeRoom.isOfficial && !activeAIAdvisor && (
                            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                          )}
                          {activeAIAdvisor && (
                            <Badge className="text-[10px] py-0 px-1 bg-blue-500/15 text-blue-600 border-blue-500/30 font-bold shrink-0">
                              {activeAIAdvisor.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {isAIGenerating ? (
                            <span className="text-blue-500 font-bold animate-pulse flex items-center gap-1">
                              <Bot className="h-3 w-3 inline" />
                              {activeAIAdvisor?.name} is thinking &amp; typing...
                            </span>
                          ) : typingUsers.length > 0 ? (
                            <span className="text-emerald-500 font-bold animate-pulse">
                              {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                            </span>
                          ) : activeAIAdvisor ? (
                            <span className="text-blue-600 font-medium flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block animate-pulse" />
                              24/7 AI Autonomous Executive Advisor
                            </span>
                          ) : activeRoom.roomType !== "direct" ? (
                            `${(activeRoom.participants || []).length || "50+"} active entrepreneurs`
                          ) : (
                            "Direct Encrypted Message"
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                  {/* Voice Call Button (Always accessible) */}
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

                  {/* Desktop Only Actions: Video Call, Search, Wallpaper, Settings */}
                  <div className="hidden sm:flex items-center gap-1">
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

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setIsSearchingInChat(!isSearchingInChat);
                        if (isSearchingInChat) setChatSearchQuery("");
                      }}
                      title="Search messages in this chat"
                      className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                    >
                      <Search className="h-4 w-4" />
                    </Button>

                    {/* Wallpaper Theme Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Change chat background wallpaper"
                          className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                        >
                          <Palette className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1">
                        <DropdownMenuLabel className="text-xs font-bold px-2 py-1">
                          Wallpaper Theme
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setWallpaperTheme("classic")}
                          className={`text-xs rounded-xl ${wallpaperTheme === "classic" ? "bg-muted font-bold" : ""}`}
                        >
                          🎨 Classic WhatsApp Doodle
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setWallpaperTheme("dark")}
                          className={`text-xs rounded-xl ${wallpaperTheme === "dark" ? "bg-muted font-bold" : ""}`}
                        >
                          🌙 Dark AMOLED
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setWallpaperTheme("emerald")}
                          className={`text-xs rounded-xl ${wallpaperTheme === "emerald" ? "bg-muted font-bold" : ""}`}
                        >
                          🌿 Emerald Luxe
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setWallpaperTheme("slate")}
                          className={`text-xs rounded-xl ${wallpaperTheme === "slate" ? "bg-muted font-bold" : ""}`}
                        >
                          💼 Slate Minimalist
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

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

                  {/* Mobile Compact Overflow Menu */}
                  <div className="sm:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1 shadow-xl">
                        <DropdownMenuItem
                          onClick={() =>
                            setActiveCall({
                              isOpen: true,
                              contactName: activeRoom.name || "Community Member",
                              contactAvatar: activeRoom.avatarUrl,
                              isVideo: true,
                            })
                          }
                          className="text-xs rounded-xl font-medium gap-2"
                        >
                          <Video className="h-4 w-4 text-primary" /> Start Video Call
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setIsSearchingInChat(!isSearchingInChat);
                            if (isSearchingInChat) setChatSearchQuery("");
                          }}
                          className="text-xs rounded-xl font-medium gap-2"
                        >
                          <Search className="h-4 w-4 text-primary" /> Search in Chat
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground px-2 py-1">
                          Wallpaper Theme
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => setWallpaperTheme("classic")}
                          className={`text-xs rounded-xl ${wallpaperTheme === "classic" ? "bg-muted font-bold" : ""}`}
                        >
                          🎨 Classic Doodle
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setWallpaperTheme("dark")}
                          className={`text-xs rounded-xl ${wallpaperTheme === "dark" ? "bg-muted font-bold" : ""}`}
                        >
                          🌙 Dark AMOLED
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setWallpaperTheme("emerald")}
                          className={`text-xs rounded-xl ${wallpaperTheme === "emerald" ? "bg-muted font-bold" : ""}`}
                        >
                          🌿 Emerald Luxe
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setAdminDialogOpen(true)}
                          className="text-xs rounded-xl font-medium gap-2"
                        >
                          <Settings2 className="h-4 w-4 text-primary" /> Lounge Info & Members
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {/* In-Chat Search Bar if active */}
              {isSearchingInChat && (
                <div className="p-2.5 px-4 bg-muted/90 border-b border-border flex items-center justify-between gap-2 z-10">
                  <div className="flex items-center gap-2 flex-1 relative">
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Input
                      autoFocus
                      placeholder="Type words to filter messages..."
                      value={chatSearchQuery}
                      onChange={(e) => setChatSearchQuery(e.target.value)}
                      className="h-8 text-xs bg-background/80 rounded-xl"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {visibleMessages.length} found
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsSearchingInChat(false);
                      setChatSearchQuery("");
                    }}
                    className="h-7 w-7 rounded-xl"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* Pinned Community Notice Banner (for official & trade rooms) */}
              {showPinnedNotice && (activeRoom.isOfficial || activeRoom.roomType === "trade_mastermind") && (
                <div className="p-2.5 px-4 bg-primary/10 border-b border-primary/20 flex items-center justify-between gap-3 text-xs z-10">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="h-4 w-4 text-primary shrink-0 animate-pulse" />
                    <span className="text-foreground/90 font-medium truncate">
                      {activeRoom.roomType === "trade_mastermind"
                        ? "💎 All wholesale trade transactions are backed by Bethel Safe Escrow. Verify seller CAC before wiring funds."
                        : "📢 Welcome! Connect with verified Nigerian merchants, share cargo logistics, and build valuable partnerships."}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPinnedNotice(false)}
                    className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

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

                  {visibleMessages.length === 0 ? (
                    <div className="py-16 text-center space-y-2">
                      <p className="text-xs font-bold text-muted-foreground">
                        {chatSearchQuery ? "No matching messages found." : "No messages yet in this lounge."}
                      </p>
                      <p className="text-[11px] text-muted-foreground/80">
                        {chatSearchQuery
                          ? "Try searching for a different keyword."
                          : "Be the first to say hello or click a starter template chip below!"}
                      </p>
                    </div>
                  ) : (
                    visibleMessages.map((msg) => (
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

                  {/* AI Generating Bubble */}
                  {isAIGenerating && activeAIAdvisor && (
                    <div className="flex items-center gap-2 p-3 max-w-sm rounded-2xl bg-card border border-blue-500/30 shadow-md animate-pulse">
                      <Avatar className="h-7 w-7 ring-1 ring-blue-500/30">
                        <AvatarImage src={activeAIAdvisor.avatar} />
                        <AvatarFallback className="text-[10px] font-bold">
                          {activeAIAdvisor.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-foreground">{activeAIAdvisor.name}</p>
                        <p className="text-[11px] text-blue-600 font-medium">
                          Crafting tailored response...
                        </p>
                      </div>
                    </div>
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
                        {selectedMedia.fileSize
                          ? `${(selectedMedia.fileSize / 1024).toFixed(1)} KB`
                          : "Attached file"}
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

              {/* Quick Action Prompt Chips Bar */}
              {currentPromptChips.length > 0 && (
                <div className="px-2.5 sm:px-3 py-1.5 bg-card/60 backdrop-blur-md border-t border-border/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none z-10 w-full max-w-full touch-pan-x">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase whitespace-nowrap pl-1 shrink-0">
                    Suggestions:
                  </span>
                  {currentPromptChips.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(undefined, chip)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted/80 hover:bg-primary/15 hover:text-primary border border-border/80 text-foreground/90 whitespace-nowrap transition-all shrink-0 active:scale-95"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {/* Bottom Messaging Input Bar */}
              <div className="p-2 sm:p-3 border-t border-border/80 bg-card/90 backdrop-blur-md z-10 w-full max-w-full overflow-hidden">
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
                  <form onSubmit={handleSendMessage} className="flex items-center gap-1 sm:gap-2 w-full max-w-full">
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
                      className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl text-muted-foreground hover:text-foreground shrink-0"
                    >
                      {isUploadingMedia ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </Button>

                    {/* Emoji Picker Popover */}
                    <EmojiPickerPopover
                      onSelectEmoji={(emoji) => {
                        setMessageText((prev) => prev + emoji);
                        messageInputRef.current?.focus();
                      }}
                    />

                    {/* Message text input */}
                    <div className="flex-1 min-w-0 relative">
                      <Input
                        ref={messageInputRef}
                        placeholder={
                          activeAIAdvisor
                            ? `Ask ${activeAIAdvisor.name}...`
                            : `Message ${activeRoom.name || "group"}...`
                        }
                        value={messageText}
                        onChange={handleInputChange}
                        className="rounded-xl sm:rounded-2xl h-10 sm:h-11 text-xs sm:text-sm bg-background/80 px-3 border-border/80 shadow-xs w-full"
                      />
                    </div>

                    {/* Mic Button or Send Button */}
                    {messageText.trim() || selectedMedia ? (
                      <Button
                        type="submit"
                        className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-md transition-all active:scale-95"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => setIsRecordingVoice(true)}
                        className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-md transition-all active:scale-95"
                        title="Record voice note"
                      >
                        <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
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
                  Bethelincovibe TV Community Hub
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Connect with verified merchants, chat 1-on-1 with AI Executive Advisors, or participate in wholesale trade mastermind lounges.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  onClick={() => setCreateRoomOpen(true)}
                  className="rounded-2xl bg-primary text-primary-foreground font-bold text-xs h-10 px-6 gap-2"
                >
                  <Plus className="h-4 w-4" /> Create Discussion Lounge
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSidebarTab("ai")}
                  className="rounded-2xl font-bold text-xs h-10 px-5 gap-2"
                >
                  <Bot className="h-4 w-4 text-blue-500" /> Chat with AI Advisors
                </Button>
              </div>
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
        targetUser={
          otherUserId
            ? {
                id: otherUserId,
                name: activeCall.contactName,
                avatar: activeCall.contactAvatar,
              }
            : undefined
        }
        participantIds={activeRoom?.participants?.filter((p) => p !== currentUserId)}
      />
    </div>
  );
}
