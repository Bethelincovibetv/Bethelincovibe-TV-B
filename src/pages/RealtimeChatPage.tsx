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
  getOrCreateGeneralBethelChatRoom,
  createCustomChatRoom,
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
  Users,
  Settings,
  Tv,
  Info,
  AtSign,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { CreateChatRoomDialog } from "@/components/chat/CreateChatRoomDialog";
import { ChatRoomAdminDialog } from "@/components/chat/ChatRoomAdminDialog";
import { MentionSuggestions } from "@/components/chat/MentionSuggestions";
import { playNotificationSound, isNotificationSoundEnabled, setNotificationSoundEnabled } from "@/lib/notificationSound";
import { toast } from "sonner";
import VoiceGuideHelper from "@/components/common/VoiceGuideHelper";
import { getDigitalEmployeeById, INITIAL_DIGITAL_WORKFORCE } from "@/lib/aiWorkforceRegistry";

// Professional Nigerian AI Workforce Specialists & Executive Support Contacts
const DEFAULT_SUPPORT_CONTACTS = [
  {
    id: "support_bethel_hq",
    name: "Dr. Chidi Okafor (HQ Operations)",
    role: "Official Platform Operations & CAC Verification Director",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=500&h=500&fit=crop&crop=faces&auto=format&q=80",
    badge: "HQ Director",
    systemPrompt: "You are Dr. Chidi Okafor, the Principal Director of Platform Operations and Verification at Bethelincovibe. You assist Nigerian businesses and international partners with verified listings, vendor compliance, CAC credentials, and safe commerce.",
  },
  {
    id: "support_maya_creative",
    name: "Maya Sterling (Brand & Video Lead)",
    role: "Senior Creative Director & Graphic Brand Lead",
    avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=500&h=500&fit=crop&crop=faces&auto=format&q=80",
    badge: "Creative Lead",
    systemPrompt: "You are Maya Sterling, Senior Creative Director at Bethelincovibe. You guide users on visual branding, high-converting product photos, promotional video creation, logos, and digital marketing strategies.",
  },
  {
    id: "support_aria_merchant",
    name: "Nkechi Adebayo (Merchant Success)",
    role: "Merchant Growth, Escrow & Payment Specialist",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&h=500&fit=crop&crop=faces&auto=format&q=80",
    badge: "Merchant Escrow",
    systemPrompt: "You are Nkechi Adebayo, Merchant Growth & Escrow Specialist at Bethelincovibe. You assist merchants with getting more buyer orders, escrow payment safety, logistics dispatch, and store optimization.",
  },
  {
    id: "support_queen_concierge",
    name: "Queen Victoria (Executive AI)",
    role: "Executive Strategy Concierge & AI Workforce Lead",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500&h=500&fit=crop&crop=faces&auto=format&q=80",
    badge: "AI Concierge",
    systemPrompt: "You are Queen Victoria, Executive AI Strategist at Bethelincovibe. You provide 24/7 business intelligence, revenue growth plans, customer acquisition blueprints, and autonomous workforce coordination.",
  },
];

export default function RealtimeChatPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const targetUserParam = searchParams.get("targetUserId");
  const targetNameParam = searchParams.get("targetName");
  const targetAvatarParam = searchParams.get("targetAvatar");
  const officialRoomParam = searchParams.get("officialRoom");

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

  // Dialog states
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);

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

  // Handle URL query parameters to open official community room or direct chat
  useEffect(() => {
    if (officialRoomParam === "true" || officialRoomParam === "bethelincovibetv") {
      getOrCreateGeneralBethelChatRoom(
        currentUserId,
        currentUserName,
        user?.user_metadata?.avatar_url
      ).then((roomId) => {
        setActiveChatId(roomId);
      });
    } else if (targetUserParam) {
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
  }, [targetUserParam, targetNameParam, officialRoomParam, currentUserId, currentUserName]);

  // Subscribe to user chat rooms
  useEffect(() => {
    if (!currentUserId) return;
    const unsub = subscribeToUserChats(currentUserId, (loadedChats) => {
      setChats(loadedChats);
      setActiveChatId((curr) => (!curr && loadedChats.length > 0 && !targetUserParam && !officialRoomParam ? loadedChats[0].id : curr));
    });
    return () => unsub();
  }, [currentUserId, targetUserParam, officialRoomParam]);

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
        const queryTerm = contactSearch.trim();
        const { data: businesses } = await supabase
          .from("businesses")
          .select("id, name, category, city, logo_url")
          .or(`name.ilike.%${queryTerm}%,category.ilike.%${queryTerm}%,city.ilike.%${queryTerm}%`)
          .limit(6);

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .or(`username.ilike.%${queryTerm}%,display_name.ilike.%${queryTerm}%`)
          .limit(6);

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
            if (p.id !== currentUserId) {
              list.push({
                id: p.id,
                name: p.display_name || `@${p.username}`,
                role: p.username ? `@${p.username}` : "Platform Member",
                avatar: p.avatar_url,
                badge: "Member",
              });
            }
          });
          setDiscoveredContacts(list);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!isCancelled) setIsSearchingContacts(false);
      }
    }

    const timer = setTimeout(searchDirectory, 200);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [contactSearch, currentUserId]);

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

  const handleJoinOfficialLounge = async () => {
    try {
      const roomId = await getOrCreateGeneralBethelChatRoom(
        currentUserId,
        currentUserName,
        user?.user_metadata?.avatar_url
      );
      setActiveChatId(roomId);
      toast.success("Joined BethelincovibeTV Official Lounge! 📺✨");
    } catch (err: any) {
      toast.error(err?.message || "Failed to open official lounge");
    }
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

  // Mention check (@...)
  const activeMentionMatch = inputText.match(/@([a-zA-Z0-9_-]*)$/);
  const mentionQuery = activeMentionMatch ? activeMentionMatch[1] : null;

  const handleSelectMention = (tag: string) => {
    if (activeMentionMatch) {
      const prefix = inputText.slice(0, activeMentionMatch.index);
      setInputText(prefix + tag);
    } else {
      setInputText((prev) => prev + " " + tag);
    }
    inputRef.current?.focus();
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

      // Check if chatting with an AI Agent / Official Support Specialist
      const currentActiveRoom = chats.find((c) => c.id === activeChatId);
      const recipientId = currentActiveRoom?.participants.find((p) => p !== currentUserId);

      if (recipientId && (recipientId.startsWith("support_") || recipientId.includes("_ai") || recipientId.startsWith("ai_"))) {
        const supportContact = DEFAULT_SUPPORT_CONTACTS.find((s) => s.id === recipientId);
        const digitalEmp = getDigitalEmployeeById(recipientId);
        const agentName = supportContact?.name || digitalEmp?.name || "AI Operations Specialist";
        const agentAvatar = supportContact?.avatar || digitalEmp?.profilePhotoUrl || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=500&h=500&fit=crop&crop=faces&auto=format&q=80";

        // Asynchronously process real-time AI agent response
        setTimeout(async () => {
          try {
            const employeeProfile = digitalEmp || {
              id: recipientId,
              name: agentName,
              codename: agentName.split(" ")[0],
              profilePhotoUrl: agentAvatar,
              jobTitle: supportContact?.role || "Bethelincovibe Executive Support Specialist",
              department: "Executive Platform Support",
              workplace: "Live Support Center",
              workplaceRoute: "/chat",
              status: "active" as const,
              rating: 4.95,
              salaryTier: "executive" as const,
              monthlyTokenUsage: 0,
              accentColor: "#10b981",
              capabilities: ["Real-time customer consultation", "Marketplace guidance", "Business listing optimization", "Escrow security"],
              systemPrompt: supportContact?.systemPrompt || `You are ${agentName}, an elite Nigerian business specialist and support lead at Bethelincovibe. Provide practical, crystal-clear, actionable guidance to the user.`,
            };

            const { executeDigitalEmployeeTask } = await import("@/lib/aiWorkforceRegistry");
            const aiAnswer = await executeDigitalEmployeeTask(
              employeeProfile,
              textToSend,
              { userName: currentUserName, userEmail: user?.email, activeChatId }
            );

            if (aiAnswer) {
              await sendMessageToChat(
                activeChatId,
                recipientId,
                agentName,
                aiAnswer,
                agentAvatar
              );
              playNotificationSound();
            }
          } catch (agentErr) {
            console.error("AI agent reply failed:", agentErr);
          }
        }, 1200);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const activeChat = chats.find((c) => c.id === activeChatId);
  const isGroupRoom = activeChat?.roomType === "group" || activeChat?.roomType === "trade_mastermind" || activeChat?.isOfficial || (activeChat?.participants.length || 0) > 2;

  // Determine active chat display metadata
  let activeTitle = "Chat Room";
  let activeSubtitle = "Encrypted messaging channel";
  let activeAvatar: string | undefined = undefined;
  let activeEmoji: string | undefined = undefined;

  if (activeChat) {
    if (activeChat.name) {
      activeTitle = activeChat.name;
      activeSubtitle = activeChat.description || `${(activeChat.participants || []).length} participants`;
      activeAvatar = activeChat.avatarUrl;
      activeEmoji = activeChat.avatarEmoji;
    } else {
      const otherId = activeChat.participants.find((p) => p !== currentUserId);
      if (otherId) {
        activeTitle = activeChat.participantNames[otherId] || "Contact";
        activeSubtitle = "Verified Encrypted Channel";
        activeAvatar = activeChat.participantAvatars?.[otherId];
      }
    }
  }

  return (
    <>
      <Helmet>
        <title>Real-time Chat & Community · Bethelincovibe</title>
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
                Real-Time Messaging & Channels
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Direct chat with clients, verified vendors, trade masterminds, and support team
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsCreateRoomOpen(true)}
              className="h-9 px-3.5 rounded-xl gap-1.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
            >
              <Plus className="h-4 w-4" />
              <span>New Room</span>
            </Button>

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
                  placeholder="Search members, businesses, categories..."
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
                      Searching platform directory...
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

            {/* Official Bethelincovibe TV Lounge Top Banner */}
            <div className="p-2.5 border-b bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent">
              <button
                type="button"
                onClick={handleJoinOfficialLounge}
                className="w-full text-left p-2.5 rounded-2xl bg-card border border-emerald-500/30 hover:border-emerald-500 hover:shadow-md flex items-center gap-3 transition-all group"
              >
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Tv className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-foreground group-hover:text-emerald-600 transition-colors truncate">
                      BethelincovibeTV Lounge
                    </span>
                    <Badge className="text-[9px] py-0 px-1.5 bg-emerald-600 text-white font-bold shrink-0">
                      Official
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    Global community channel &amp; broadcasts
                  </p>
                </div>
              </button>
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
                    Select an advisor, create a group channel, or search a business directory contact to start messaging.
                  </p>
                </div>
              ) : (
                chats.map((c) => {
                  const isRoom = Boolean(c.name || c.roomType === "group" || c.roomType === "trade_mastermind" || c.isOfficial);
                  const targetId = c.participants.find((p) => p !== currentUserId);
                  const roomName = c.name || (targetId ? c.participantNames[targetId] || "Contact" : "Chat Room");
                  const avatar = c.avatarUrl || (targetId ? c.participantAvatars?.[targetId] : undefined);
                  const emoji = c.avatarEmoji;
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
                      {emoji ? (
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 ${
                          isSelected ? "bg-primary-foreground/20 text-white" : "bg-primary/10 text-primary"
                        }`}>
                          {emoji}
                        </div>
                      ) : (
                        <Avatar className="h-10 w-10 shrink-0 ring-2 ring-primary/20">
                          <AvatarImage src={avatar} />
                          <AvatarFallback
                            className={`text-xs font-black ${
                              isSelected ? "bg-primary-foreground/20 text-white" : "bg-muted"
                            }`}
                          >
                            {roomName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs sm:text-sm font-bold truncate">{roomName}</p>
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
                  <div className="flex items-center gap-3 min-w-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveChatId(null)}
                      className="md:hidden p-1 h-9 w-9 rounded-xl shrink-0"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>

                    {activeEmoji ? (
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl shrink-0 border border-primary/20 shadow-xs">
                        {activeEmoji}
                      </div>
                    ) : (
                      <Avatar className="h-10 w-10 sm:h-11 sm:w-11 ring-2 ring-primary/20 shrink-0">
                        <AvatarImage src={activeAvatar} />
                        <AvatarFallback className="text-xs sm:text-sm font-black bg-primary/10 text-primary">
                          {activeTitle.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight truncate">
                          {activeTitle}
                        </h2>
                        {activeChat?.isOfficial ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 px-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold shrink-0"
                          >
                            Official
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 px-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold shrink-0"
                          >
                            Online
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{activeSubtitle}</span>
                      </p>
                    </div>
                  </div>

                  {/* Header Actions (Room Settings / Info) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAdminDialogOpen(true)}
                      title="Room Info &amp; Members"
                      className="h-9 px-2.5 rounded-xl text-xs font-bold gap-1.5 hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <Users className="h-4 w-4 text-primary" />
                      <span className="hidden sm:inline">Info &amp; Members</span>
                    </Button>
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
                        Say Hello in {activeTitle}!
                      </p>
                      <p className="text-xs max-w-sm leading-relaxed">
                        Start your conversation regarding service bookings, wholesale trade, or community discussions. Use <span className="font-bold text-primary">@all</span> to tag everyone in the room.
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

                {/* Message Input Box with Mention Autocomplete */}
                <div className="relative">
                  {mentionQuery !== null && (
                    <MentionSuggestions
                      query={mentionQuery}
                      room={activeChat || null}
                      currentUserId={currentUserId}
                      onSelectMention={handleSelectMention}
                    />
                  )}

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

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSelectMention("@all ")}
                      title="Mention Everyone (@all)"
                      className="h-11 w-11 rounded-2xl text-muted-foreground hover:text-primary hover:bg-muted shrink-0 hidden sm:flex"
                    >
                      <AtSign className="h-5 w-5" />
                    </Button>

                    <Input
                      ref={inputRef}
                      placeholder={`Message ${activeTitle}... (Type @ for mentions)`}
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
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-4">
                <div className="h-20 w-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                  <Headphones className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-extrabold text-foreground">
                  Select a Conversation or Channel
                </h3>
                <p className="text-xs sm:text-sm max-w-md leading-relaxed">
                  Connect instantly with verified platform merchants, trade masterminds, creative leads, and the BethelincovibeTV community with real-time sync, WhatsApp-style replies, reactions, @all mentions, and attachments.
                </p>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => setIsCreateRoomOpen(true)}
                    className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Create Trade Room
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleJoinOfficialLounge}
                    className="rounded-2xl font-bold text-xs gap-1.5"
                  >
                    <Tv className="w-4 h-4 text-emerald-600" /> BethelincovibeTV Lounge
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Room Dialog */}
      <CreateChatRoomDialog
        open={isCreateRoomOpen}
        onOpenChange={setIsCreateRoomOpen}
        onRoomCreated={(roomId) => {
          setActiveChatId(roomId);
        }}
      />

      {/* Chat Room Admin & Info Dialog */}
      <ChatRoomAdminDialog
        open={isAdminDialogOpen}
        onOpenChange={setIsAdminDialogOpen}
        room={activeChat || null}
        currentUserId={currentUserId}
      />
    </>
  );
}

