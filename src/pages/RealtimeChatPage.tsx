import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  RealtimeChatRoom,
  RealtimeChatMessage,
  subscribeToUserChats,
  subscribeToChatMessages,
  sendMessageToChat,
  getOrCreateChatRoom,
  ensureFirebaseAuth,
  testFirestoreConnection,
  toggleMessageReaction,
} from "@/lib/firebaseChat";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageSquare,
  Send,
  User,
  Building2,
  Headphones,
  Sparkles,
  Search,
  ChevronLeft,
  Loader2,
  ShieldCheck,
  CheckCheck,
  Circle,
  Plus,
  Image as ImageIcon,
  X,
  Reply,
  Smile,
  Volume2,
  VolumeX,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { playNotificationSound, isNotificationSoundEnabled, setNotificationSoundEnabled } from "@/lib/notificationSound";
import { toast } from "sonner";

const DEFAULT_SUPPORT_CONTACTS = [
  {
    id: "support_bethel_hq",
    name: "Bethelincovibe Support HQ",
    role: "Official Platform Support & Verification",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    badge: "Official Support",
  },
  {
    id: "support_maya_creative",
    name: "Maya Sterling",
    role: "Senior Creative Director & Brand Lead",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80",
    badge: "Creative Lead",
  },
  {
    id: "support_aria_merchant",
    name: "Aria Chen",
    role: "Merchant Success & Escrow Specialist",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80",
    badge: "Merchant Escrow",
  },
];

export default function RealtimeChatPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const targetUserParam = searchParams.get("targetUserId");
  const targetNameParam = searchParams.get("targetName");
  const targetAvatarParam = searchParams.get("targetAvatar");

  const [chats, setChats] = useState<RealtimeChatRoom[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RealtimeChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [discoveredContacts, setDiscoveredContacts] = useState<any[]>([]);
  const [isSearchingContacts, setIsSearchingContacts] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean | null>(null);
  const [soundEnabled, setSoundState] = useState(() => isNotificationSoundEnabled());

  // WhatsApp style reply target
  const [replyingTo, setReplyingTo] = useState<RealtimeChatMessage | null>(null);
  
  // Image attachment state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUserId = user?.id || "guest_" + (typeof window !== "undefined" ? window.location.host.slice(0, 5) : "user");
  const currentUserName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Creative Member";

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundState(next);
    setNotificationSoundEnabled(next);
    if (next) {
      playNotificationSound();
      toast.success("Chat sounds enabled");
    } else {
      toast.info("Chat sounds muted");
    }
  };

  // Check Firebase connection
  useEffect(() => {
    ensureFirebaseAuth().catch(console.warn);
    testFirestoreConnection().then(setIsFirebaseConnected);
  }, []);

  // Handle URL query parameters to immediately open a chat with a specific person
  useEffect(() => {
    if (targetUserParam) {
      const targetName = targetNameParam || "Support Contact";
      getOrCreateChatRoom(
        currentUserId,
        currentUserName,
        targetUserParam,
        targetName,
        targetAvatarParam || undefined
      ).then((roomId) => {
        setActiveChatId(roomId);
      });
    }
  }, [targetUserParam, targetNameParam, currentUserId]);

  // Subscribe to user chat rooms
  useEffect(() => {
    if (!currentUserId) return;
    const unsub = subscribeToUserChats(currentUserId, (loadedChats) => {
      setChats(loadedChats);
      setActiveChatId((curr) => (!curr && loadedChats.length > 0 && !targetUserParam ? loadedChats[0].id : curr));
    });
    return () => unsub();
  }, [currentUserId, targetUserParam]);

  // Subscribe to messages in active room
  useEffect(() => {
    if (!activeChatId) return;
    const unsub = subscribeToChatMessages(activeChatId, (msgs) => {
      setMessages((prev) => {
        // If new incoming message from someone else, play sound
        if (prev.length > 0 && msgs.length > prev.length) {
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg.senderId !== currentUserId) {
            playNotificationSound();
          }
        }
        return msgs;
      });
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });
    return () => unsub();
  }, [activeChatId, currentUserId]);

  // Search user contacts and verified businesses
  useEffect(() => {
    if (!contactSearch.trim()) {
      setDiscoveredContacts([]);
      return;
    }
    let isCancelled = false;
    setIsSearchingContacts(true);

    async function searchDirectory() {
      try {
        const { data: businesses } = await supabase
          .from("businesses")
          .select("id, name, category, city, logo_url")
          .ilike("name", `%${contactSearch.trim()}%`)
          .limit(5);

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .ilike("username", `%${contactSearch.trim()}%`)
          .limit(5);

        if (!isCancelled) {
          const list: any[] = [];
          (businesses || []).forEach((b) => {
            list.push({
              id: `biz_${b.id}`,
              name: b.name,
              role: `${b.category || "Business"} • ${b.city || "Nigeria"}`,
              avatar: b.logo_url,
              badge: "Verified Business",
            });
          });
          (profiles || []).forEach((p) => {
            list.push({
              id: p.id,
              name: p.display_name || `@${p.username}`,
              role: p.username ? `@${p.username}` : "Platform Member",
              avatar: p.avatar_url,
              badge: "Member",
            });
          });
          setDiscoveredContacts(list);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!isCancelled) setIsSearchingContacts(false);
      }
    }

    searchDirectory();
    return () => {
      isCancelled = true;
    };
  }, [contactSearch]);

  const handleStartChatWith = async (contact: {
    id: string;
    name: string;
    avatar?: string;
  }) => {
    const roomId = await getOrCreateChatRoom(
      currentUserId,
      currentUserName,
      contact.id,
      contact.name,
      contact.avatar
    );
    setActiveChatId(roomId);
    setContactSearch("");
    setDiscoveredContacts([]);
  };

  const handleReplyToMessage = (message: RealtimeChatMessage) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!activeChatId) return;
    try {
      await toggleMessageReaction(activeChatId, messageId, emoji, currentUserId);
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedImage) || !activeChatId || isSending) return;

    const textToSend = inputText;
    const imgToSend = selectedImage;
    const replyContext = replyingTo
      ? {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          text: replyingTo.text ? replyingTo.text.slice(0, 100) : "Photo attachment",
        }
      : undefined;

    setInputText("");
    setSelectedImage(null);
    setReplyingTo(null);
    setIsSending(true);

    try {
      await sendMessageToChat(
        activeChatId,
        currentUserId,
        currentUserName,
        textToSend,
        user?.user_metadata?.avatar_url || undefined,
        replyContext,
        imgToSend || undefined
      );
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const activeChat = chats.find((c) => c.id === activeChatId);
  const otherParticipantId = activeChat?.participants.find((p) => p !== currentUserId);
  const otherParticipantName = otherParticipantId
    ? activeChat?.participantNames[otherParticipantId] || "Contact"
    : "Support Team";
  const otherParticipantAvatar = otherParticipantId
    ? activeChat?.participantAvatars?.[otherParticipantId]
    : undefined;

  return (
    <>
      <Helmet>
        <title>Real-time Chat & Support · Bethelincovibe</title>
      </Helmet>

      {/* Spacious Full-View Container */}
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-4 h-[calc(100vh-4.5rem)] flex flex-col">
        {/* Top Chat Bar */}
        <div className="flex items-center justify-between pb-3 pt-1 border-b border-border/60 mb-2 px-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-md">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                Real-Time Messaging
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Direct instant chat with clients, verified vendors, and support team
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSound}
              className="h-9 px-3 rounded-xl gap-1.5 text-xs font-bold border-border"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="h-4 w-4 text-emerald-500" />
                  <span className="hidden sm:inline">Sound On</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                  <span className="hidden sm:inline">Muted</span>
                </>
              )}
            </Button>

            <Badge
              variant="outline"
              className="text-xs font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/30 flex items-center gap-1.5 py-1 px-2.5 rounded-xl"
            >
              <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 animate-pulse" />
              Live Sync
            </Badge>
          </div>
        </div>

        {/* Main 2-Column Responsive Layout */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3 bg-card border rounded-3xl shadow-xl overflow-hidden">
          {/* Left Column: Conversations Directory (4/12 cols on desktop, full screen on mobile when no active chat) */}
          <div
            className={`md:col-span-4 lg:col-span-4 border-r flex flex-col h-full bg-muted/20 ${
              activeChatId ? "hidden md:flex" : "flex"
            }`}
          >
            {/* Contact & Directory Search */}
            <div className="p-3 border-b space-y-2 bg-background/50">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts, verified vendors..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="pl-9 h-10 text-xs rounded-2xl bg-background"
                />
              </div>

              {/* Instant Search Dropdown */}
              {contactSearch.trim() && (
                <div className="p-2 bg-background border rounded-2xl shadow-xl space-y-1 max-h-56 overflow-y-auto">
                  {isSearchingContacts ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1 text-primary" />
                      Searching platform members...
                    </div>
                  ) : discoveredContacts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center p-3">
                      No matching vendors or users found.
                    </p>
                  ) : (
                    discoveredContacts.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleStartChatWith(c)}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-muted flex items-center gap-3 transition-colors"
                      >
                        <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                          <AvatarImage src={c.avatar} />
                          <AvatarFallback className="text-xs font-black">
                            {c.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">
                            {c.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {c.role}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0 font-semibold">
                          {c.badge}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Quick Contacts / Official Advisors */}
            <div className="p-3 border-b bg-muted/40 space-y-1.5">
              <p className="text-[11px] font-black uppercase text-muted-foreground px-1 tracking-wider">
                Support & Advisors
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {DEFAULT_SUPPORT_CONTACTS.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => handleStartChatWith(sc)}
                    className="w-full text-left p-2 rounded-2xl hover:bg-background flex items-center gap-3 transition-all group border border-transparent hover:border-border/60 hover:shadow-xs"
                  >
                    <Avatar className="h-9 w-9 ring-2 ring-primary/30 shrink-0">
                      <AvatarImage src={sc.avatar} />
                      <AvatarFallback className="text-xs font-black bg-primary/10 text-primary">
                        {sc.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {sc.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {sc.role}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Conversations List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <p className="text-[11px] font-black uppercase text-muted-foreground px-2 py-1 tracking-wider">
                Recent Chats ({chats.length})
              </p>

              {chats.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
                  <MessageSquare className="h-10 w-10 mx-auto opacity-30 text-primary" />
                  <p className="font-bold text-foreground">No active chats yet</p>
                  <p className="text-[11px] leading-relaxed">
                    Select an advisor above or search a business directory contact to start real-time messaging.
                  </p>
                </div>
              ) : (
                chats.map((c) => {
                  const targetId = c.participants.find((p) => p !== currentUserId);
                  const name = targetId ? c.participantNames[targetId] || "Contact" : "Chat Room";
                  const avatar = targetId ? c.participantAvatars?.[targetId] : undefined;
                  const isSelected = c.id === activeChatId;

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveChatId(c.id)}
                      className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-md font-bold"
                          : "hover:bg-muted/80 text-foreground"
                      }`}
                    >
                      <Avatar className="h-10 w-10 shrink-0 ring-2 ring-primary/20">
                        <AvatarImage src={avatar} />
                        <AvatarFallback
                          className={`text-xs font-black ${
                            isSelected ? "bg-primary-foreground/20 text-white" : "bg-muted"
                          }`}
                        >
                          {name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs sm:text-sm font-bold truncate">{name}</p>
                          {c.lastMessageTime && (
                            <span
                              className={`text-[10px] shrink-0 ${
                                isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                              }`}
                            >
                              {typeof c.lastMessageTime === "string"
                                ? formatDistanceToNow(new Date(c.lastMessageTime), { addSuffix: false })
                                : "just now"}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-xs truncate mt-0.5 ${
                            isSelected ? "text-primary-foreground/90" : "text-muted-foreground"
                          }`}
                        >
                          {c.lastMessageText || "Tap to chat"}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat Stream & Interactive Messaging Window */}
          <div
            className={`md:col-span-8 lg:col-span-8 flex flex-col h-full bg-background ${
              !activeChatId ? "hidden md:flex" : "flex"
            }`}
          >
            {activeChatId ? (
              <>
                {/* Active Chat Header */}
                <div className="p-3 sm:p-4 border-b flex items-center justify-between bg-card/70 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveChatId(null)}
                      className="md:hidden p-1 h-9 w-9 rounded-xl"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Avatar className="h-10 w-10 sm:h-11 sm:w-11 ring-2 ring-primary/20">
                      <AvatarImage src={otherParticipantAvatar} />
                      <AvatarFallback className="text-xs sm:text-sm font-black bg-primary/10 text-primary">
                        {otherParticipantName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">
                          {otherParticipantName}
                        </h2>
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold"
                        >
                          Online
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        Verified Real-time Encrypted Channel
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages Scroll Area */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2 bg-muted/10">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground space-y-3">
                      <div className="h-14 w-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                        <MessageSquare className="h-7 w-7" />
                      </div>
                      <p className="text-base font-bold text-foreground">
                        Say Hello to {otherParticipantName}!
                      </p>
                      <p className="text-xs max-w-sm leading-relaxed">
                        Start your direct conversation regarding service bookings, custom creative orders, or platform support.
                      </p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.senderId === currentUserId;
                      return (
                        <div key={m.id} id={`msg-${m.id}`}>
                          <ChatMessageBubble
                            message={m}
                            isMe={isMe}
                            currentUserId={currentUserId}
                            onReply={handleReplyToMessage}
                            onToggleReaction={handleToggleReaction}
                            onScrollToMessage={(msgId) => {
                              const elem = document.getElementById(`msg-${msgId}`);
                              if (elem) {
                                elem.scrollIntoView({ behavior: "smooth", block: "center" });
                                elem.classList.add("ring-2", "ring-primary", "rounded-3xl");
                                setTimeout(() => {
                                  elem.classList.remove("ring-2", "ring-primary");
                                }, 1500);
                              }
                            }}
                          />
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* WhatsApp-Style Reply Preview Banner */}
                {replyingTo && (
                  <div className="px-4 py-2.5 bg-muted/80 border-t flex items-center justify-between backdrop-blur-md">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="h-8 w-1 bg-primary rounded-full shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-primary flex items-center gap-1">
                          <Reply className="h-3 w-3" />
                          Replying to {replyingTo.senderName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate line-clamp-1 italic">
                          "{replyingTo.text || "Attached photo"}"
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setReplyingTo(null)}
                      className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Image Attachment Preview */}
                {selectedImage && (
                  <div className="px-4 py-2 bg-muted/50 border-t flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedImage}
                        alt="Selected attachment"
                        className="h-12 w-12 object-cover rounded-xl border"
                      />
                      <span className="text-xs text-muted-foreground">Ready to attach</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedImage(null)}
                      className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Message Input Box */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 sm:p-4 border-t bg-card flex items-center gap-2"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach image"
                    className="h-11 w-11 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </Button>

                  <Input
                    ref={inputRef}
                    placeholder={`Message ${otherParticipantName}...`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="h-12 rounded-2xl text-xs sm:text-sm bg-background border-border/80 shadow-xs focus-visible:ring-primary"
                    disabled={isSending}
                  />

                  <Button
                    type="submit"
                    disabled={(!inputText.trim() && !selectedImage) || isSending}
                    className="h-12 px-5 sm:px-6 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shrink-0 shadow-md transition-all active:scale-95"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span className="hidden sm:inline">Send</span>
                      </>
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-4">
                <div className="h-20 w-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                  <Headphones className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-extrabold text-foreground">
                  Select a Conversation
                </h3>
                <p className="text-xs sm:text-sm max-w-md leading-relaxed">
                  Connect instantly with verified platform merchants, creative leads, and support team with real-time sync, WhatsApp-style replies, reactions, and attachments.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
