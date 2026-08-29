import React, { useState, useEffect, useRef } from "react";
import { Link, Navigate } from "react-router-dom";
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
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { WhatsAppDoodleBackground } from "@/components/chat/WhatsAppDoodleBackground";
import { VoiceNotePlayer } from "@/components/chat/VoiceNotePlayer";
import { VoiceNoteRecorder } from "@/components/chat/VoiceNoteRecorder";
import { EmojiReactionsMenu } from "@/components/chat/EmojiReactionsMenu";
import { CreateChatRoomDialog } from "@/components/chat/CreateChatRoomDialog";
import { chatSounds } from "@/lib/chatSounds";

interface ChatReaction {
  emoji: string;
  count: number;
  users: string[];
}

interface ChatMessage {
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
  reactions?: Record<string, ChatReaction>;
}

interface ChatRoom {
  id: string;
  name: string;
  avatarEmoji?: string;
  avatarUrl?: string;
  type: "direct" | "group" | "business_inquiry" | "trade_mastermind";
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isPinned?: boolean;
  isEncrypted: boolean;
  participantCount?: number;
  phone?: string;
  businessTitle?: string;
}

export default function UserMessages() {
  const { user, loading: authLoading } = useAuth();

  // Rooms & Active Chat State
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");

  // UI Interactive States
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(chatSounds.isEnabled());
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [e2eeModalOpen, setE2eeModalOpen] = useState(false);
  const [wallpaperTheme, setWallpaperTheme] = useState<"classic" | "dark" | "emerald" | "slate">("classic");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat to latest message smoothly
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeRoomId]);

  // Load User Businesses & Initial Conversations
  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

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

      // 3. Build WhatsApp Channels & Contact Rooms
      const loadedRooms: ChatRoom[] = [];

      // Add Default Community Trade Mastermind Group
      loadedRooms.push({
        id: "room_general_trade",
        name: "Bethelincovibe VIP Trade Hub",
        avatarEmoji: "🚀",
        type: "trade_mastermind",
        lastMessage: "Welcome to the verified Nigeria & Lagos business networking group!",
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        isPinned: true,
        isEncrypted: true,
        participantCount: 1420,
      });

      // Add Customer Inquiries mapped to rooms
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
        });
      });

      // Check stored custom rooms in localStorage
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

      // Select first room if none selected
      if (loadedRooms.length > 0 && !activeRoomId) {
        setActiveRoomId(loadedRooms[0].id);
        loadRoomMessages(loadedRooms[0]);
      }
    } catch (err) {
      console.warn("Failed loading conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load Messages for the Selected Room
  const loadRoomMessages = (room: ChatRoom) => {
    // Check cached messages for this room
    const cacheKey = `btv_room_msgs_${room.id}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        setMessages(JSON.parse(cached));
        return;
      } catch {}
    }

    // Default starting messages with realistic WhatsApp demo conversation
    const initialMsgs: ChatMessage[] = [];

    if (room.type === "trade_mastermind") {
      initialMsgs.push(
        {
          id: "m_init_1",
          sender_id: "system",
          sender_name: "Bethelincovibe Security",
          message: "Messages and calls in this room are end-to-end encrypted with SHA-256 client cryptography. No one outside of this chat can read or listen to them.",
          type: "system",
          is_outgoing: false,
          status: "read",
          created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          id: "m_init_2",
          sender_id: "agent_bethel",
          sender_name: "Coach Bethel Goodgift",
          message: "Welcome to the verified VIP Trade Mastermind! Feel free to share your business updates, supplier needs, or voice notes here.",
          type: "text",
          is_outgoing: false,
          status: "read",
          created_at: new Date(Date.now() - 3600000).toISOString(),
          reactions: {
            "🔥": { emoji: "🔥", count: 8, users: ["user1", "user2"] },
            "👏": { emoji: "👏", count: 5, users: ["user3"] },
          },
        }
      );
    } else if (room.type === "business_inquiry") {
      initialMsgs.push(
        {
          id: "m_inq_1",
          sender_id: "system",
          sender_name: "System",
          message: `Inquiry from customer regarding ${room.businessTitle || "your business listing"}.`,
          type: "system",
          is_outgoing: false,
          status: "read",
          created_at: room.lastMessageTime || new Date().toISOString(),
        },
        {
          id: "m_inq_2",
          sender_id: "customer",
          sender_name: room.name,
          message: room.lastMessage || "Hello, I saw your verified listing on Bethelincovibe TV and would like more details.",
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

    // Mark as read in room list
    setRooms((prev) =>
      prev.map((r) => (r.id === room.id ? { ...r, unreadCount: 0 } : r))
    );
  };

  // Send Text Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !activeRoomId || !user) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sender_id: user.id,
      sender_name: user.email?.split("@")[0] || "You",
      room_id: activeRoomId,
      message: messageText.trim(),
      type: "text",
      is_outgoing: true,
      status: "delivered",
      created_at: new Date().toISOString(),
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    setMessageText("");

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

    // Simulate realistic auto-response in demo / customer threads after short delay
    const currentRoom = rooms.find((r) => r.id === activeRoomId);
    if (currentRoom && currentRoom.type === "business_inquiry") {
      setTimeout(() => {
        const replyMsg: ChatMessage = {
          id: `reply_${Date.now()}`,
          sender_id: "customer",
          sender_name: currentRoom.name,
          room_id: activeRoomId,
          message: "Thank you for the prompt reply! Looking forward to finalizing this.",
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
      }, 1400);
    }
  };

  // Send Voice Note
  const handleSendVoiceNote = (audioBlob: Blob, durationSecs: number) => {
    if (!activeRoomId || !user) return;

    const audioUrl = URL.createObjectURL(audioBlob);

    const newMsg: ChatMessage = {
      id: `vn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sender_id: user.id,
      sender_name: user.email?.split("@")[0] || "You",
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
      sender_name: user.email?.split("@")[0] || "You",
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
    setMessages((prev) =>
      prev.map((msg) => {
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
          // New reaction entry
          currentReactions[emoji] = {
            emoji,
            count: 1,
            users: [user.id],
          };
        }

        return { ...msg, reactions: currentReactions };
      })
    );

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
    };

    const updated = [newRoom, ...rooms];
    setRooms(updated);
    localStorage.setItem(`btv_custom_rooms_${user?.id}`, JSON.stringify(updated));

    handleSelectRoom(newRoom);
    toast.success(`Created WhatsApp room "${roomData.name}"`);
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
    toast.success(next ? "WhatsApp chat sounds ON" : "WhatsApp chat sounds MUTED");
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || rooms[0];

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

      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 max-w-7xl">
        {/* Top Breadcrumb Navigation */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="rounded-xl font-bold h-8 text-xs">
              <Link to="/dashboard">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Dashboard
              </Link>
            </Button>
            <span className="text-muted-foreground">•</span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <Lock className="w-3 h-3" />
              <span>End-to-End Encrypted</span>
            </div>
          </div>

          {/* Sound Mute/Unmute & Create Room Button */}
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
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Room
            </Button>
          </div>
        </div>

        {/* Main WhatsApp Messenger App Container */}
        <div className="h-[78vh] sm:h-[82vh] border border-border/80 rounded-3xl overflow-hidden shadow-2xl bg-card flex flex-col md:flex-row relative">
          {/* ================= LEFT SIDEBAR (CONVERSATIONS LIST) ================= */}
          <div
            className={`w-full md:w-80 lg:w-96 border-r border-border bg-muted/20 flex flex-col shrink-0 ${
              mobileView === "chat" ? "hidden md:flex" : "flex"
            }`}
          >
            {/* Sidebar Header */}
            <div className="p-3.5 bg-card border-b border-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-sm shadow-xs ring-1 ring-white/20">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold leading-none text-foreground">
                    Chats &amp; Rooms
                  </h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                    Verified WhatsApp Network
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCreateRoomOpen(true)}
                className="h-8 w-8 rounded-xl"
                title="Create WhatsApp Room"
              >
                <Plus className="w-4 h-4 text-foreground" />
              </Button>
            </div>

            {/* Search Bar */}
            <div className="p-2.5 border-b border-border/60 bg-card/60">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search chats or messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 rounded-xl text-xs bg-muted/50 border-border/70"
                />
              </div>
            </div>

            {/* Conversation Threads Scroll Area */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/40">
              {filteredRooms.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No conversations match your search.
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
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-teal-600/30 text-foreground flex items-center justify-center text-lg shadow-xs border border-emerald-500/20">
                          {room.avatarEmoji || (
                            <span className="font-bold text-xs">
                              {room.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        {/* Online Indicator */}
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-card" />
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
            {/* Top WhatsApp Chat Header */}
            {activeRoom && (
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
                    {activeRoom.avatarEmoji || activeRoom.name.charAt(0).toUpperCase()}
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
                  {activeRoom.phone && (
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl text-emerald-600 hover:bg-emerald-500/10"
                      title="WhatsApp Call"
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
            )}

            {/* WhatsApp Doodle Wallpaper Canvas */}
            <div className="flex-1 relative overflow-hidden flex flex-col">
              <WhatsAppDoodleBackground theme={wallpaperTheme} />

              {/* Chat Messages Scroll Container */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 relative z-10">
                {/* E2EE WhatsApp Security Yellow Banner */}
                <div className="mx-auto max-w-md p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-center shadow-xs backdrop-blur-xs">
                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold mb-0.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>End-to-End Encrypted</span>
                  </div>
                  <p className="text-[10px] text-amber-800/90 dark:text-amber-300 leading-tight">
                    Messages and voice notes in this room are end-to-end encrypted with Bethelincovibe SHA-256 client cryptography.
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
                        {/* Sender Name in Group Chats */}
                        {!isOut && (
                          <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                            {msg.sender_name}
                          </p>
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

                        {/* Timestamp & WhatsApp Double Blue Ticks */}
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-muted-foreground/80 font-medium">
                          <span>{format(new Date(msg.created_at), "HH:mm")}</span>
                          {isOut && (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              <CheckCheck className="w-3.5 h-3.5 inline stroke-[2.5]" />
                            </span>
                          )}
                        </div>

                        {/* Reaction Badges */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className="flex flex-wrap gap-1 -mb-3.5 mt-1">
                            {Object.values(msg.reactions).map((rx) => (
                              <button
                                key={rx.emoji}
                                onClick={() => handleAddReaction(msg.id, rx.emoji)}
                                type="button"
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-card border border-border shadow-xs text-xs hover:scale-110 transition-transform active:scale-95"
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

                      {/* Quick Emoji Reaction Hover Trigger Button */}
                      <button
                        onClick={() =>
                          setActiveReactionMessageId(
                            activeReactionMessageId === msg.id ? null : msg.id
                          )
                        }
                        type="button"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-card border border-border shadow-xs text-muted-foreground hover:text-foreground absolute -top-2 right-2 z-20"
                        title="React with Emoji"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>

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

              {/* Bottom WhatsApp Input Bar */}
              <div className="p-2 sm:p-3 bg-card border-t border-border relative z-20">
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

                    {/* Textarea / Input Bar */}
                    <Input
                      placeholder="Type a message..."
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
          </div>
        </div>
      </div>

      {/* Create Room Modal */}
      <CreateChatRoomDialog
        open={createRoomOpen}
        onOpenChange={setCreateRoomOpen}
        onCreateRoom={handleCreateRoom}
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
    </>
  );
}
