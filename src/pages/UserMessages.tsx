import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ChevronLeft,
  Search,
  Send,
  Mic,
  Paperclip,
  Smile,
  Phone,
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
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { WhatsAppDoodleBackground } from "@/components/chat/WhatsAppDoodleBackground";
import { VoiceNotePlayer } from "@/components/chat/VoiceNotePlayer";
import { VoiceNoteRecorder } from "@/components/chat/VoiceNoteRecorder";
import { EmojiReactionsMenu } from "@/components/chat/EmojiReactionsMenu";
import { CreateChatRoomDialog } from "@/components/chat/CreateChatRoomDialog";
import { ReactionDetailsDialog } from "@/components/chat/ReactionDetailsDialog";
import { MessageInfoDialog } from "@/components/chat/MessageInfoDialog";
import { MentionSuggestions } from "@/components/chat/MentionSuggestions";
import { WebRTCCallModal } from "@/components/chat/WebRTCCallModal";
import { chatSounds } from "@/lib/chatSounds";

export interface ChatReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  business_id?: string;
  room_id?: string;
  message?: string;
  type: "text" | "voice_note" | "image" | "file" | "system";
  media_url?: string;
  media_duration?: number;
  is_outgoing: boolean;
  status: "sent" | "delivered" | "read";
  created_at: string;
  reply_to?: {
    id: string;
    sender_name: string;
    message: string;
  };
  reactions?: Record<string, ChatReaction>;
  viewers?: {
    userId: string;
    userName: string;
    userAvatar?: string;
    readAt?: string;
  }[];
}

export interface ChatRoom {
  id: string;
  name: string;
  avatarEmoji?: string;
  avatarUrl?: string;
  type: "direct" | "group" | "business_inquiry" | "trade_mastermind" | "official";
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isPinned?: boolean;
  isEncrypted: boolean;
  participantCount?: number;
  phone?: string;
  businessTitle?: string;
  targetUserId?: string;
  participants?: string[];
  participantNames?: Record<string, string>;
  participantAvatars?: Record<string, string>;
}

export default function UserMessages() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();

  const targetUserParam = searchParams.get("targetUserId");
  const targetNameParam = searchParams.get("targetName");
  const targetAvatarParam = searchParams.get("targetAvatar");
  const officialRoomParam = searchParams.get("officialRoom");
  const roomIdParam = searchParams.get("roomId");

  // Rooms & Active Chat State
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");

  // Directory Search State (search verified vendors & members)
  const [directorySearch, setDirectorySearch] = useState("");
  const [discoveredContacts, setDiscoveredContacts] = useState<any[]>([]);
  const [isSearchingDirectory, setIsSearchingDirectory] = useState(false);

  // Reply Target
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // UI Dialog States
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(chatSounds.isEnabled());
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [e2eeModalOpen, setE2eeModalOpen] = useState(false);
  const [wallpaperTheme, setWallpaperTheme] = useState<"classic" | "dark" | "emerald" | "slate">("classic");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // Who Reacted Modal State
  const [reactionDetailsMessage, setReactionDetailsMessage] = useState<ChatMessage | null>(null);
  // Message Info / Who Viewed Modal State
  const [infoMessage, setInfoMessage] = useState<ChatMessage | null>(null);
  // Real-Time WebRTC Voice Call Modal State
  const [webrtcCallOpen, setWebrtcCallOpen] = useState(false);
  const [webrtcTargetUser, setWebrtcTargetUser] = useState<{
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  } | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);

  const currentUserId = user?.id || "guest_user";
  const currentUserName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "You";
  const currentUserAvatar = user?.user_metadata?.avatar_url;

  // Auto-scroll chat to latest message smoothly
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeRoomId]);

  // Load User Conversations & Rooms
  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  // Handle URL Query Params (e.g. clicking "Chat with Vendor" or "Official Community")
  useEffect(() => {
    if (!user || loading) return;

    if (officialRoomParam === "true" || officialRoomParam === "bethelincovibetv") {
      const officialRoom = rooms.find((r) => r.id === "room_official_lounge");
      if (officialRoom) {
        handleSelectRoom(officialRoom);
      }
    } else if (targetUserParam) {
      const existing = rooms.find((r) => r.targetUserId === targetUserParam || r.id === `direct_${targetUserParam}`);
      if (existing) {
        handleSelectRoom(existing);
      } else {
        // Create direct room on the fly
        const targetName = targetNameParam || "Platform Merchant";
        const newDirectRoom: ChatRoom = {
          id: `direct_${targetUserParam}`,
          name: targetName,
          avatarUrl: targetAvatarParam || undefined,
          avatarEmoji: "💬",
          type: "direct",
          lastMessage: "Direct encrypted chat started",
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
          isEncrypted: true,
          targetUserId: targetUserParam,
          participantNames: {
            [targetUserParam]: targetName,
            [currentUserId]: currentUserName,
          },
          participantAvatars: {
            ...(targetAvatarParam ? { [targetUserParam]: targetAvatarParam } : {}),
            ...(currentUserAvatar ? { [currentUserId]: currentUserAvatar } : {}),
          },
        };
        setRooms((prev) => [newDirectRoom, ...prev]);
        handleSelectRoom(newDirectRoom);
      }
    } else if (roomIdParam) {
      const room = rooms.find((r) => r.id === roomIdParam);
      if (room) handleSelectRoom(room);
    }
  }, [targetUserParam, targetNameParam, officialRoomParam, roomIdParam, loading]);

  const loadConversations = async () => {
    try {
      setLoading(true);

      // 1. Fetch user's registered businesses
      const { data: bizList } = await supabase
        .from("suppliers")
        .select("id, name, logo_url, phone")
        .eq("submitted_by", user?.id);

      const bizMap = new Map((bizList || []).map((b: any) => [b.id, b]));
      const bizIds = (bizList || []).map((b: any) => b.id);

      // 2. Fetch business inquiries/messages
      let inquiryMessages: any[] = [];
      if (bizIds.length > 0) {
        const { data: msgs } = await supabase
          .from("business_messages")
          .select("*")
          .in("business_id", bizIds)
          .order("created_at", { ascending: false });
        inquiryMessages = msgs || [];
      }

      // 3. Build WhatsApp Channels & Rooms
      const loadedRooms: ChatRoom[] = [];

      // Official Bethelincovibe TV Lounge (Community)
      loadedRooms.push({
        id: "room_official_lounge",
        name: "BethelincovibeTV Official Lounge",
        avatarEmoji: "📺",
        type: "official",
        lastMessage: "Global verified trade announcements, broadcasts & community discussions.",
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        isPinned: true,
        isEncrypted: true,
        participantCount: 2840,
        participantNames: {
          [currentUserId]: currentUserName,
          support: "Bethelincovibe Support",
          community: "Verified Merchants",
        },
      });

      // VIP Trade Mastermind Hub
      loadedRooms.push({
        id: "room_general_trade",
        name: "VIP Trade Mastermind Hub",
        avatarEmoji: "🚀",
        type: "trade_mastermind",
        lastMessage: "Verified Nigeria & West Africa wholesale trade and partnership group.",
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        isPinned: true,
        isEncrypted: true,
        participantCount: 1420,
        participantNames: {
          [currentUserId]: currentUserName,
          community: "VIP Traders",
        },
      });

      // Customer Inquiries mapped to rooms
      const customerMap = new Map<string, any[]>();
      inquiryMessages.forEach((m) => {
        const key = m.sender_phone || m.sender_email || m.sender_name || m.id;
        if (!customerMap.has(key)) customerMap.set(key, []);
        customerMap.get(key)!.push(m);
      });

      customerMap.forEach((msgs, key) => {
        const latest = msgs[0];
        const bizName = bizMap.get(latest.business_id)?.name || "My Business";
        const unread = msgs.filter((x) => !x.is_read).length;

        loadedRooms.push({
          id: `inquiry_${latest.id}`,
          name: latest.sender_name || "Customer Inquiry",
          avatarEmoji: "👤",
          type: "business_inquiry",
          lastMessage: latest.message,
          lastMessageTime: latest.created_at,
          unreadCount: unread,
          isEncrypted: true,
          phone: latest.sender_phone,
          businessTitle: `${bizName} · ${latest.service_title || "General"}`,
          participantNames: {
            [currentUserId]: currentUserName,
            customer: latest.sender_name || "Customer",
          },
        });
      });

      // Stored Custom Rooms in localStorage
      const storedRooms = localStorage.getItem(`btv_custom_rooms_${user?.id}`);
      if (storedRooms) {
        try {
          const parsed = JSON.parse(storedRooms);
          parsed.forEach((pr: any) => {
            if (!loadedRooms.some((r) => r.id === pr.id)) {
              loadedRooms.push(pr);
            }
          });
        } catch {}
      }

      setRooms(loadedRooms);

      // Select initial room
      if (loadedRooms.length > 0 && !activeRoomId) {
        const initial = loadedRooms[0];
        setActiveRoomId(initial.id);
        loadRoomMessages(initial);
      }
    } catch (err) {
      console.warn("Failed loading conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  // Directory Member & Business Search
  useEffect(() => {
    if (!directorySearch.trim()) {
      setDiscoveredContacts([]);
      return;
    }

    let isCancelled = false;
    setIsSearchingDirectory(true);

    async function searchDirectory() {
      try {
        const q = directorySearch.trim();
        const { data: businesses } = await supabase
          .from("businesses")
          .select("id, name, category, city, logo_url")
          .or(`name.ilike.%${q}%,category.ilike.%${q}%,city.ilike.%${q}%`)
          .limit(5);

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
          .limit(5);

        if (!isCancelled) {
          const list: any[] = [];
          (businesses || []).forEach((b) => {
            list.push({
              id: b.id,
              name: b.name,
              role: b.category || "Verified Business",
              avatar: b.logo_url,
              isBusiness: true,
            });
          });
          (profiles || []).forEach((p) => {
            if (p.id !== currentUserId) {
              list.push({
                id: p.id,
                name: p.display_name || `@${p.username}`,
                role: p.username ? `@${p.username}` : "Platform Member",
                avatar: p.avatar_url,
                isBusiness: false,
              });
            }
          });
          setDiscoveredContacts(list);
        }
      } catch (err) {
        console.warn("Directory search error:", err);
      } finally {
        if (!isCancelled) setIsSearchingDirectory(false);
      }
    }

    const timer = setTimeout(searchDirectory, 250);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [directorySearch, currentUserId]);

  const handleStartChatWith = (contact: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
    isBusiness?: boolean;
  }) => {
    const roomId = `direct_${contact.id}`;
    const existing = rooms.find((r) => r.id === roomId || r.targetUserId === contact.id);

    if (existing) {
      handleSelectRoom(existing);
    } else {
      const newRoom: ChatRoom = {
        id: roomId,
        name: contact.name,
        avatarUrl: contact.avatar,
        avatarEmoji: contact.isBusiness ? "🏬" : "👤",
        type: "direct",
        lastMessage: "Direct encrypted chat started",
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        isEncrypted: true,
        businessTitle: contact.role,
        targetUserId: contact.id,
        participantNames: {
          [contact.id]: contact.name,
          [currentUserId]: currentUserName,
        },
        participantAvatars: {
          ...(contact.avatar ? { [contact.id]: contact.avatar } : {}),
          ...(currentUserAvatar ? { [currentUserId]: currentUserAvatar } : {}),
        },
      };

      const updated = [newRoom, ...rooms];
      setRooms(updated);
      localStorage.setItem(`btv_custom_rooms_${user?.id}`, JSON.stringify(updated));
      handleSelectRoom(newRoom);
    }

    setDirectorySearch("");
    setDiscoveredContacts([]);
    toast.success(`Opened chat with ${contact.name}`);
  };

  // Load Messages for the Selected Room
  const loadRoomMessages = (room: ChatRoom) => {
    const cacheKey = `btv_room_msgs_${room.id}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        setMessages(JSON.parse(cached));
        return;
      } catch {}
    }

    // Default starting messages
    const initialMsgs: ChatMessage[] = [];

    if (room.id === "room_official_lounge") {
      initialMsgs.push(
        {
          id: "m_off_1",
          sender_id: "system",
          sender_name: "Bethelincovibe Security",
          message: "Welcome to the BethelincovibeTV Official Community Lounge! Messages and voice notes are end-to-end encrypted with SHA-256 client cryptography. Use @all to tag all channel members.",
          type: "system",
          is_outgoing: false,
          status: "read",
          created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
        },
        {
          id: "m_off_2",
          sender_id: "merchant_amina",
          sender_name: "Amina Fashion Hub",
          message: "Hello everyone! Just updated our wholesale Ankara catalogs on Bethelincovibe TV. Feel free to connect for bulk supply orders.",
          type: "text",
          is_outgoing: false,
          status: "read",
          created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          reactions: {
            "🔥": { emoji: "🔥", count: 12, users: ["u1", "u2", "u3"] },
            "👏": { emoji: "👏", count: 8, users: ["u4", "u5"] },
          },
          viewers: [
            { userId: "u1", userName: "Emeka Tech", readAt: "10:14" },
            { userId: "u2", userName: "Kemi Lagos Store", readAt: "10:18" },
            { userId: "u3", userName: "Tunde Logistics", readAt: "10:25" },
          ],
        }
      );
    } else if (room.type === "trade_mastermind") {
      initialMsgs.push(
        {
          id: "m_init_1",
          sender_id: "system",
          sender_name: "Bethelincovibe Security",
          message: "Messages and calls in this VIP trade hub are end-to-end encrypted with SHA-256 client cryptography.",
          type: "system",
          is_outgoing: false,
          status: "read",
          created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          id: "m_init_2",
          sender_id: "vendor_david",
          sender_name: "David Alaba Wholesale",
          message: "Welcome to the VIP Mastermind Hub! Share wholesale trade offers, escrow verified goods, and container inventory here.",
          type: "text",
          is_outgoing: false,
          status: "read",
          created_at: new Date(Date.now() - 3600000).toISOString(),
          reactions: {
            "🔥": { emoji: "🔥", count: 6, users: ["u1", "u2"] },
            "🤝": { emoji: "🤝", count: 4, users: ["u3"] },
          },
        }
      );
    } else if (room.type === "business_inquiry") {
      initialMsgs.push(
        {
          id: "m_inq_1",
          sender_id: "system",
          sender_name: "System",
          message: `Inquiry from verified buyer regarding ${room.businessTitle || "your business listing"}.`,
          type: "system",
          is_outgoing: false,
          status: "read",
          created_at: room.lastMessageTime || new Date().toISOString(),
        },
        {
          id: "m_inq_2",
          sender_id: "customer",
          sender_name: room.name,
          message: room.lastMessage || "Hello, I saw your verified listing on Bethelincovibe TV and would like to inquire about pricing and delivery.",
          type: "text",
          is_outgoing: false,
          status: "read",
          created_at: room.lastMessageTime || new Date().toISOString(),
        }
      );
    } else {
      initialMsgs.push({
        id: "m_custom_1",
        sender_id: "system",
        sender_name: "System",
        message: "Room created. Start chatting securely with end-to-end encryption.",
        type: "system",
        is_outgoing: false,
        status: "read",
        created_at: new Date().toISOString(),
      });
    }

    setMessages(initialMsgs);
    localStorage.setItem(cacheKey, JSON.stringify(initialMsgs));
  };

  const handleSelectRoom = (room: ChatRoom) => {
    setActiveRoomId(room.id);
    loadRoomMessages(room);
    setMobileView("chat");
    setReplyingTo(null);

    // Mark as read in room list
    setRooms((prev) =>
      prev.map((r) => (r.id === room.id ? { ...r, unreadCount: 0 } : r))
    );
  };

  // Mention Autocomplete (@...)
  const activeMentionMatch = messageText.match(/@([a-zA-Z0-9_-]*)$/);
  const mentionQuery = activeMentionMatch ? activeMentionMatch[1] : null;

  const handleSelectMention = (tag: string) => {
    if (activeMentionMatch) {
      const prefix = messageText.slice(0, activeMentionMatch.index);
      setMessageText(prefix + tag);
    } else {
      setMessageText((prev) => prev + " " + tag);
    }
    messageInputRef.current?.focus();
  };

  // Send Text Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !activeRoomId || !user) return;

    const currentRoom = rooms.find((r) => r.id === activeRoomId);

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sender_id: user.id,
      sender_name: currentUserName,
      sender_avatar: currentUserAvatar,
      room_id: activeRoomId,
      message: messageText.trim(),
      type: "text",
      is_outgoing: true,
      status: "delivered",
      created_at: new Date().toISOString(),
      reply_to: replyingTo
        ? {
            id: replyingTo.id,
            sender_name: replyingTo.sender_name,
            message: replyingTo.message || replyingTo.type,
          }
        : undefined,
      viewers: [
        {
          userId: user.id,
          userName: currentUserName,
          userAvatar: currentUserAvatar,
          readAt: format(new Date(), "HH:mm"),
        },
      ],
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    setMessageText("");
    setReplyingTo(null);

    // Cache locally
    localStorage.setItem(`btv_room_msgs_${activeRoomId}`, JSON.stringify(updated));

    // Play WhatsApp send tone
    chatSounds.playSentSound();

    // Update last message in room list
    setRooms((prev) =>
      prev.map((r) =>
        r.id === activeRoomId
          ? { ...r, lastMessage: newMsg.message, lastMessageTime: newMsg.created_at }
          : r
      )
    );

    // Auto simulated response in customer inquiries after brief delay
    if (currentRoom && currentRoom.type === "business_inquiry") {
      setTimeout(() => {
        const replyMsg: ChatMessage = {
          id: `reply_${Date.now()}`,
          sender_id: "customer",
          sender_name: currentRoom.name,
          room_id: activeRoomId,
          message: "Thank you for the prompt response! Let's proceed with the details.",
          type: "text",
          is_outgoing: false,
          status: "read",
          created_at: new Date().toISOString(),
        };
        setMessages((curr) => {
          const nextMsgs = [...curr, replyMsg];
          localStorage.setItem(`btv_room_msgs_${activeRoomId}`, JSON.stringify(nextMsgs));
          return nextMsgs;
        });
        chatSounds.playReceivedSound();
      }, 1200);
    }
  };

  // Send Voice Note
  const handleSendVoiceNote = (audioBlob: Blob, durationSecs: number) => {
    if (!activeRoomId || !user) return;

    const audioUrl = URL.createObjectURL(audioBlob);

    const newMsg: ChatMessage = {
      id: `vn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sender_id: user.id,
      sender_name: currentUserName,
      sender_avatar: currentUserAvatar,
      room_id: activeRoomId,
      type: "voice_note",
      media_url: audioUrl,
      media_duration: durationSecs,
      is_outgoing: true,
      status: "delivered",
      created_at: new Date().toISOString(),
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    setIsRecordingVoice(false);

    localStorage.setItem(`btv_room_msgs_${activeRoomId}`, JSON.stringify(updated));

    setRooms((prev) =>
      prev.map((r) =>
        r.id === activeRoomId
          ? { ...r, lastMessage: `🎤 Voice note (${durationSecs}s)`, lastMessageTime: newMsg.created_at }
          : r
      )
    );
  };

  // Handle File / Photo Attachment Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoomId || !user) return;

    const isImage = file.type.startsWith("image/");
    const mediaUrl = URL.createObjectURL(file);

    const newMsg: ChatMessage = {
      id: `file_${Date.now()}`,
      sender_id: user.id,
      sender_name: currentUserName,
      sender_avatar: currentUserAvatar,
      room_id: activeRoomId,
      type: isImage ? "image" : "file",
      message: file.name,
      media_url: mediaUrl,
      is_outgoing: true,
      status: "delivered",
      created_at: new Date().toISOString(),
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    localStorage.setItem(`btv_room_msgs_${activeRoomId}`, JSON.stringify(updated));

    chatSounds.playSentSound();
    toast.success(`${isImage ? "Image" : "Document"} attached`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Add Emoji Reaction to Message
  const handleAddReaction = (messageId: string, emoji: string) => {
    if (!user) return;
    setMessages((prev) => {
      const next = prev.map((msg) => {
        if (msg.id !== messageId) return msg;

        const currentReactions = { ...(msg.reactions || {}) };
        const existing = currentReactions[emoji];

        if (existing) {
          if (existing.users.includes(user.id)) {
            // Remove user reaction
            const newUsers = existing.users.filter((u) => u !== user.id);
            if (newUsers.length === 0) {
              delete currentReactions[emoji];
            } else {
              currentReactions[emoji] = {
                emoji,
                count: newUsers.length,
                users: newUsers,
              };
            }
          } else {
            // Add user reaction
            currentReactions[emoji] = {
              emoji,
              count: existing.count + 1,
              users: [...existing.users, user.id],
            };
          }
        } else {
          // New reaction
          currentReactions[emoji] = {
            emoji,
            count: 1,
            users: [user.id],
          };
        }

        return { ...msg, reactions: currentReactions };
      });

      if (activeRoomId) {
        localStorage.setItem(`btv_room_msgs_${activeRoomId}`, JSON.stringify(next));
      }
      return next;
    });

    setActiveReactionMessageId(null);
  };

  // Create New Room Handler
  const handleCreateRoom = (roomData: {
    name: string;
    description: string;
    roomType: "direct" | "group" | "business_inquiry" | "trade_mastermind";
    avatarEmoji: string;
    isEncrypted: boolean;
  }) => {
    const newRoom: ChatRoom = {
      id: `room_${Date.now()}`,
      name: roomData.name,
      avatarEmoji: roomData.avatarEmoji,
      type: roomData.roomType,
      lastMessage: roomData.description || "Room created",
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
      isEncrypted: true,
      participantCount: 1,
      participantNames: {
        [currentUserId]: currentUserName,
      },
    };

    const updated = [newRoom, ...rooms];
    setRooms(updated);
    localStorage.setItem(`btv_custom_rooms_${user?.id}`, JSON.stringify(updated));

    handleSelectRoom(newRoom);
    toast.success(`Created room "${roomData.name}"`);
  };

  // Clear Chat Messages
  const handleClearChat = () => {
    if (!activeRoomId) return;
    setMessages([]);
    localStorage.removeItem(`btv_room_msgs_${activeRoomId}`);
    toast.success("Chat history cleared");
  };

  // Export Chat Transcript
  const handleExportChat = () => {
    if (!activeRoomId || messages.length === 0) return;
    const lines = messages.map(
      (m) =>
        `[${format(new Date(m.created_at), "yyyy-MM-dd HH:mm:ss")}] ${m.sender_name}: ${m.message || m.type}`
    );
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bethelincovibe_chat_${activeRoomId}.txt`;
    a.click();
    toast.success("Chat transcript exported");
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    chatSounds.setEnabled(next);
    toast.success(next ? "Chat sounds ON" : "Chat sounds MUTED");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center flex-col gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-xs text-muted-foreground font-medium">Loading encrypted messages & channels...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || rooms[0] || null;

  const filteredRooms = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Helmet>
        <title>WhatsApp Real-Time Encrypted Messages | Bethelincovibe TV</title>
      </Helmet>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xlsx"
      />

      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-5 max-w-7xl">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="rounded-xl font-bold h-8 text-xs">
              <Link to="/dashboard">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Dashboard
              </Link>
            </Button>
            <span className="text-muted-foreground hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <Lock className="w-3 h-3" />
              <span>End-to-End Encrypted</span>
            </div>
          </div>

          {/* Sound Toggle & Create Room Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              type="button"
              className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground transition-all"
              title={soundEnabled ? "Mute Chat Sounds" : "Unmute Chat Sounds"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-rose-500" />}
            </button>
            <Button
              onClick={() => setCreateRoomOpen(true)}
              size="sm"
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 shadow-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Room</span>
            </Button>
          </div>
        </div>

        {/* Main WhatsApp-Style Encrypted Messenger Canvas */}
        <div className="h-[78vh] sm:h-[82vh] border border-border/80 rounded-3xl overflow-hidden shadow-2xl bg-card flex flex-col md:flex-row relative">
          
          {/* ================= LEFT SIDEBAR (CHATS & DIRECTORY SEARCH) ================= */}
          <div
            className={`w-full md:w-80 lg:w-96 border-r border-border bg-muted/20 flex flex-col shrink-0 ${
              mobileView === "chat" ? "hidden md:flex" : "flex"
            }`}
          >
            {/* Sidebar Header */}
            <div className="p-3 bg-card border-b border-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-sm shadow-xs ring-1 ring-white/20">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold leading-none text-foreground">
                    Chats &amp; Channels
                  </h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                    Verified Encrypted Network
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCreateRoomOpen(true)}
                className="h-8 w-8 rounded-xl"
                title="Create Chat Room"
              >
                <Plus className="w-4 h-4 text-foreground" />
              </Button>
            </div>

            {/* Global Directory Search (Find businesses & verified members) */}
            <div className="p-2.5 border-b border-border/60 bg-card/60 relative">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search members, businesses, categories..."
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  className="pl-8 h-8 rounded-xl text-xs bg-muted/50 border-border/70"
                />
                {directorySearch && (
                  <button
                    onClick={() => setDirectorySearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Directory Results Dropdown */}
              {directorySearch && (
                <div className="absolute left-2 right-2 top-full mt-1 bg-card border rounded-2xl shadow-xl z-40 max-h-56 overflow-y-auto divide-y divide-border/40 p-1">
                  {isSearchingDirectory ? (
                    <div className="p-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                      <span>Searching directory...</span>
                    </div>
                  ) : discoveredContacts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center p-3">
                      No matching vendors or members found.
                    </p>
                  ) : (
                    discoveredContacts.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleStartChatWith(c)}
                        className="w-full p-2 text-left rounded-xl hover:bg-muted flex items-center gap-2.5 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-xl bg-emerald-600/15 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {c.isBusiness ? <Store className="w-4 h-4" /> : c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{c.role}</p>
                        </div>
                        <Badge className="text-[9px] py-0 px-1 bg-emerald-600 text-white font-bold">
                          Chat
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Bethelincovibe TV Lounge Top Banner Button */}
            <div className="p-2 border-b bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent">
              <button
                type="button"
                onClick={() => {
                  const lounge = rooms.find((r) => r.id === "room_official_lounge");
                  if (lounge) handleSelectRoom(lounge);
                }}
                className={`w-full text-left p-2 rounded-2xl border transition-all flex items-center gap-2.5 ${
                  activeRoomId === "room_official_lounge"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                    : "bg-card border-emerald-500/30 hover:border-emerald-500 hover:shadow-xs"
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  activeRoomId === "room_official_lounge" ? "bg-white/20 text-white" : "bg-emerald-600 text-white"
                }`}>
                  <Tv className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black truncate">
                      BethelincovibeTV Lounge
                    </span>
                    <Badge className={`text-[8px] py-0 px-1 font-bold shrink-0 ${
                      activeRoomId === "room_official_lounge" ? "bg-white text-emerald-800" : "bg-emerald-600 text-white"
                    }`}>
                      Official
                    </Badge>
                  </div>
                  <p className={`text-[10px] truncate ${
                    activeRoomId === "room_official_lounge" ? "text-white/80" : "text-muted-foreground"
                  }`}>
                    Global broadcast &amp; trade community
                  </p>
                </div>
              </button>
            </div>

            {/* Conversation Threads Scroll Area */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/40">
              {filteredRooms.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No conversations found. Use directory search to start chatting.
                </div>
              ) : (
                filteredRooms.map((room) => {
                  const isActive = activeRoomId === room.id;
                  return (
                    <button
                      key={room.id}
                      onClick={() => handleSelectRoom(room)}
                      type="button"
                      className={`w-full p-3 text-left flex items-start gap-3 transition-colors select-none ${
                        isActive
                          ? "bg-emerald-500/10 border-l-4 border-l-emerald-600"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-teal-600/30 text-foreground flex items-center justify-center text-base shadow-xs border border-emerald-500/20">
                          {room.avatarEmoji || (
                            <span className="font-bold text-xs">
                              {(room.name || "C").charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        {/* Online Indicator */}
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                      </div>

                      {/* Info & Last Message */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-foreground truncate">
                            {room.name}
                          </span>
                          {room.lastMessageTime && (
                            <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                              {format(new Date(room.lastMessageTime), "HH:mm")}
                            </span>
                          )}
                        </div>

                        {room.businessTitle && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                            {room.businessTitle}
                          </p>
                        )}

                        <p className="text-[11px] text-muted-foreground truncate leading-tight">
                          {room.lastMessage || "No messages yet"}
                        </p>
                      </div>

                      {/* Unread Counter Badge */}
                      {room.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black shrink-0 self-center shadow-xs">
                          {room.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ================= RIGHT MAIN (ACTIVE CHAT CANVAS) ================= */}
          <div
            className={`flex-1 flex flex-col bg-background relative overflow-hidden ${
              mobileView === "list" ? "hidden md:flex" : "flex"
            }`}
          >
            {!activeRoom ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/10">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4 shadow-xs">
                  <MessageCircle className="w-8 h-8" />
                </div>
                <h3 className="text-base font-extrabold text-foreground mb-1">Select a Conversation</h3>
                <p className="text-xs text-muted-foreground max-w-sm leading-relaxed mb-4">
                  Choose a conversation from the left sidebar or search verified merchants in the directory to start a secure end-to-end encrypted chat.
                </p>
                <Button
                  onClick={() => setCreateRoomOpen(true)}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create New Room
                </Button>
              </div>
            ) : (
              <>
                {/* Top WhatsApp Chat Header */}
                <div className="h-14 bg-card/95 backdrop-blur-md border-b border-border px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-20">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Mobile Back Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMobileView("list")}
                      className="md:hidden h-8 w-8 rounded-xl shrink-0 -ml-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>

                    {/* Room Icon */}
                    <div className="w-9 h-9 rounded-2xl bg-emerald-600/20 text-foreground flex items-center justify-center text-base shrink-0 border border-emerald-500/30 shadow-xs">
                      {activeRoom.avatarEmoji || ((activeRoom.name || "C").charAt(0).toUpperCase())}
                    </div>

                    {/* Room Name & Encryption Status */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-extrabold text-xs sm:text-sm text-foreground truncate">
                          {activeRoom.name}
                        </h3>
                        {activeRoom.isEncrypted && (
                          <button
                            onClick={() => setE2eeModalOpen(true)}
                            type="button"
                            className="text-emerald-600 hover:text-emerald-700 transition-colors"
                            title="Click to view encryption key certificate"
                          >
                            <Lock className="w-3 h-3 inline-block" />
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Online · End-to-end encrypted</span>
                      </p>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* WebRTC Real-Time Encrypted Voice Call Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setWebrtcTargetUser({
                          id: activeRoom.id,
                          name: activeRoom.name || "Contact",
                          avatar: activeRoom.avatar,
                          role: activeRoom.badge || "Verified Merchant",
                        });
                        setWebrtcCallOpen(true);
                      }}
                      className="h-8 w-8 rounded-xl text-emerald-600 hover:bg-emerald-500/10"
                      title="Encrypted WebRTC Voice Call"
                    >
                      <Phone className="w-4 h-4 text-emerald-600" />
                    </Button>

                    {activeRoom.phone && (
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl text-emerald-600 hover:bg-emerald-500/10"
                        title="WhatsApp Chat"
                      >
                        <a
                          href={`https://wa.me/${activeRoom.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleExportChat}
                      className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                      title="Export Chat Transcript"
                    >
                      <Download className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClearChat}
                      className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive"
                      title="Clear Chat History"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* WhatsApp Doodle Wallpaper Canvas */}
                <div className="flex-1 relative overflow-hidden flex flex-col">
                  <WhatsAppDoodleBackground theme={wallpaperTheme} />

                  {/* Chat Messages Scroll Container */}
                  <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 relative z-10">
                    {/* E2EE WhatsApp Security Yellow Banner */}
                    <div className="mx-auto max-w-md p-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-center shadow-xs backdrop-blur-xs">
                      <div className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold mb-0.5">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        <span>End-to-End Encrypted</span>
                      </div>
                      <p className="text-[10px] text-amber-800/90 dark:text-amber-300 leading-tight">
                        Messages and voice notes in this room are end-to-end encrypted with SHA-256 client cryptography.
                      </p>
                    </div>

                    {/* Messages List */}
                    {messages.map((msg) => {
                      if (msg.type === "system") {
                        return (
                          <div key={msg.id} className="text-center my-2">
                            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-medium bg-card/80 text-muted-foreground border border-border/60 shadow-xs">
                              {msg.message}
                            </span>
                          </div>
                        );
                      }

                      const isOut = msg.is_outgoing;

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col group relative ${
                            isOut ? "items-end" : "items-start"
                          }`}
                        >
                          {/* Message Bubble */}
                          <div
                            className={`relative max-w-[85%] sm:max-w-[72%] rounded-2xl p-2.5 sm:p-3 shadow-md transition-shadow ${
                              isOut
                                ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-foreground rounded-tr-xs border border-emerald-500/20"
                                : "bg-card dark:bg-[#202c33] text-foreground rounded-tl-xs border border-border"
                            }`}
                          >
                            {/* Sender Name in Group/Community Chats */}
                            {!isOut && (
                              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                                {msg.sender_name}
                              </p>
                            )}

                            {/* Quoted Reply Target (WhatsApp Style) */}
                            {msg.reply_to && (
                              <div className="mb-1.5 p-2 rounded-xl bg-black/5 dark:bg-white/10 border-l-4 border-emerald-600 text-xs">
                                <span className="font-bold text-[10px] text-emerald-700 dark:text-emerald-300 block">
                                  {msg.reply_to.sender_name}
                                </span>
                                <span className="text-[11px] text-muted-foreground line-clamp-1">
                                  {msg.reply_to.message}
                                </span>
                              </div>
                            )}

                            {/* Content based on type */}
                            {msg.type === "voice_note" && msg.media_url ? (
                              <VoiceNotePlayer
                                audioUrl={msg.media_url}
                                duration={msg.media_duration}
                                isOutgoing={isOut}
                                senderName={msg.sender_name}
                              />
                            ) : msg.type === "image" && msg.media_url ? (
                              <div className="space-y-1.5">
                                <img
                                  src={msg.media_url}
                                  alt="Attachment"
                                  className="rounded-xl max-h-60 w-full object-cover border border-black/10"
                                />
                                {msg.message && (
                                  <p className="text-xs leading-relaxed">{msg.message}</p>
                                )}
                              </div>
                            ) : msg.type === "file" && msg.media_url ? (
                              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-background/50 border border-border/80">
                                <FileText className="w-6 h-6 text-primary shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold truncate">{msg.message}</p>
                                  <a
                                    href={msg.media_url}
                                    download
                                    className="text-[10px] text-primary hover:underline font-semibold"
                                  >
                                    Download Attachment
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {msg.message}
                              </p>
                            )}

                            {/* Timestamp, Info Button & WhatsApp Double Blue Ticks */}
                            <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-muted-foreground/80 font-medium">
                              <span>{format(new Date(msg.created_at), "HH:mm")}</span>
                              {isOut && (
                                <button
                                  type="button"
                                  onClick={() => setInfoMessage(msg)}
                                  title="Click to view message delivery & read receipts"
                                  className="text-emerald-600 dark:text-emerald-400 hover:scale-110 transition-transform"
                                >
                                  <CheckCheck className="w-3.5 h-3.5 inline stroke-[2.5]" />
                                </button>
                              )}
                            </div>

                            {/* Reaction Badges (Click to see WHO reacted, WhatsApp Style) */}
                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                              <div className="flex flex-wrap gap-1 -mb-3.5 mt-1">
                                {Object.values(msg.reactions).map((rx) => (
                                  <button
                                    key={rx.emoji}
                                    onClick={() => setReactionDetailsMessage(msg)}
                                    type="button"
                                    title="Click to see who reacted"
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-card border border-border shadow-xs text-xs hover:scale-105 transition-transform active:scale-95 cursor-pointer"
                                  >
                                    <span>{rx.emoji}</span>
                                    {rx.count > 1 && (
                                      <span className="text-[10px] font-bold text-muted-foreground">
                                        {rx.count}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Quick Hover Actions (Reply, React, Message Info) */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 absolute -top-3 right-2 z-20 bg-card/90 backdrop-blur-xs border border-border rounded-full p-0.5 shadow-sm">
                            <button
                              onClick={() => setReplyingTo(msg)}
                              type="button"
                              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="Reply to message"
                            >
                              <Reply className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setActiveReactionMessageId(
                                  activeReactionMessageId === msg.id ? null : msg.id
                                )
                              }
                              type="button"
                              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="React with Emoji"
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setInfoMessage(msg)}
                              type="button"
                              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="Message Info / Viewers"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Reaction Popover Bar */}
                          {activeReactionMessageId === msg.id && (
                            <div className="absolute -top-10 z-30">
                              <EmojiReactionsMenu
                                onSelectReaction={(emoji) => handleAddReaction(msg.id, emoji)}
                                onClose={() => setActiveReactionMessageId(null)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Replying Banner (WhatsApp Style) */}
                  {replyingTo && (
                    <div className="p-2 bg-muted/90 border-t border-border flex items-center justify-between gap-2 text-xs relative z-20">
                      <div className="flex items-center gap-2 min-w-0">
                        <Reply className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-emerald-700 dark:text-emerald-400 text-[11px] truncate">
                            Replying to {replyingTo.sender_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {replyingTo.message || replyingTo.type}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Bottom WhatsApp Input Bar with Mentions */}
                  <div className="p-2 sm:p-3 bg-card border-t border-border relative z-20">
                    {mentionQuery !== null && (
                      <div className="absolute bottom-full left-2 right-2 mb-1 z-30">
                        <MentionSuggestions
                          query={mentionQuery}
                          room={activeRoom ? {
                            id: activeRoom.id,
                            name: activeRoom.name,
                            participants: Object.keys(activeRoom.participantNames || {}),
                            participantNames: activeRoom.participantNames || {},
                            createdAt: new Date(),
                          } : null}
                          currentUserId={currentUserId}
                          onSelectMention={handleSelectMention}
                        />
                      </div>
                    )}

                    {isRecordingVoice ? (
                      <VoiceNoteRecorder
                        onSend={handleSendVoiceNote}
                        onCancel={() => setIsRecordingVoice(false)}
                      />
                    ) : (
                      <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
                        {/* Attach File Button */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          title="Attach photo or document"
                        >
                          <Paperclip className="w-5 h-5" />
                        </button>

                        {/* @all Tag Quick Button */}
                        <button
                          type="button"
                          onClick={() => handleSelectMention("@all ")}
                          className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-emerald-600 transition-colors shrink-0 hidden sm:flex"
                          title="Tag Everyone (@all)"
                        >
                          <AtSign className="w-5 h-5" />
                        </button>

                        {/* Textarea / Input Bar */}
                        <Input
                          ref={messageInputRef}
                          placeholder={activeRoom ? `Message ${activeRoom.name}... (Type @ for mentions)` : "Type a message..."}
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          className="h-10 rounded-2xl bg-muted/50 border-border/80 text-xs sm:text-sm px-3.5 flex-1"
                        />

                        {/* If typing, show Send button; otherwise show Voice Record Mic */}
                        {messageText.trim() ? (
                          <Button
                            type="submit"
                            size="icon"
                            className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-md transition-transform active:scale-95"
                            title="Send Message"
                          >
                            <Send className="w-4 h-4 ml-0.5" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => setIsRecordingVoice(true)}
                            size="icon"
                            className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-md transition-transform active:scale-95"
                            title="Record Voice Note"
                          >
                            <Mic className="w-4 h-4" />
                          </Button>
                        )}
                      </form>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile-Fitted Create Room Modal */}
      <CreateChatRoomDialog
        open={createRoomOpen}
        onOpenChange={setCreateRoomOpen}
        onCreateRoom={handleCreateRoom}
      />

      {/* WhatsApp-Style Who Reacted Dialog */}
      <ReactionDetailsDialog
        open={Boolean(reactionDetailsMessage)}
        onOpenChange={(open) => {
          if (!open) setReactionDetailsMessage(null);
        }}
        reactions={reactionDetailsMessage?.reactions}
        participantNames={activeRoom?.participantNames}
        participantAvatars={activeRoom?.participantAvatars}
        currentUserId={currentUserId}
        onToggleReaction={(emoji) => {
          if (reactionDetailsMessage) {
            handleAddReaction(reactionDetailsMessage.id, emoji);
          }
        }}
      />

      {/* WhatsApp-Style Message Info & Viewers Dialog */}
      <MessageInfoDialog
        open={Boolean(infoMessage)}
        onOpenChange={(open) => {
          if (!open) setInfoMessage(null);
        }}
        message={infoMessage}
        participantNames={activeRoom?.participantNames}
        participantAvatars={activeRoom?.participantAvatars}
        isGroup={activeRoom?.type !== "direct"}
      />

      {/* End-to-End Encryption Security Certificate Modal */}
      <Dialog open={e2eeModalOpen} onOpenChange={setE2eeModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-bold">
                End-to-End Encryption Verified
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Your communications in this chat room are secured with client-side 256-bit cryptography.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div className="p-3 rounded-2xl bg-muted/50 border border-border/80 space-y-1.5">
              <p className="font-bold text-foreground">Safety Number / Key Fingerprint</p>
              <p className="font-mono text-[11px] text-emerald-600 break-all bg-card p-2 rounded-xl border border-emerald-500/20">
                SHA256: 4e9a-77bc-11fa-89cd-0023-eb56-88aa-34bc-9910-fe12
              </p>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Neither Bethelincovibe TV nor third parties can intercept, view, or decrypt your text messages, voice notes, or attached documents.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Real-Time WebRTC Voice Calling Modal */}
      {webrtcTargetUser && (
        <WebRTCCallModal
          open={webrtcCallOpen}
          onOpenChange={(open) => {
            setWebrtcCallOpen(open);
            if (!open) setWebrtcTargetUser(null);
          }}
          targetUser={webrtcTargetUser}
        />
      )}
    </>
  );
}
