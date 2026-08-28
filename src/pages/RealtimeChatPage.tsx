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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = user?.id || "guest_" + (typeof window !== "undefined" ? window.location.host.slice(0, 5) : "user");
  const currentUserName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Creative Member";

  // Check connection
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
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });
    return () => unsub();
  }, [activeChatId]);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChatId || isSending) return;

    const textToSend = inputText;
    setInputText("");
    setIsSending(true);

    try {
      await sendMessageToChat(
        activeChatId,
        currentUserId,
        currentUserName,
        textToSend
      );
    } catch (err) {
      console.error("Failed to send message:", err);
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

      <div className="container mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-6 h-[calc(100vh-5rem)] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="rounded-xl">
              <Link to="/dashboard">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Dashboard
              </Link>
            </Button>
            <div className="h-4 w-[1px] bg-border" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black text-foreground">
                  Real-time Chat
                </h1>
                <p className="text-[11px] text-muted-foreground hidden sm:block">
                  Direct encrypted messaging with buyers, sellers, and verified staff
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/30 flex items-center gap-1.5"
            >
              <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 animate-pulse" />
              Live Sync
            </Badge>
          </div>
        </div>

        {/* Main 2-Column Chat Grid */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3 bg-card border rounded-3xl shadow-xl overflow-hidden">
          {/* Left Column: Conversations & Directory (4 Cols) */}
          <div
            className={`md:col-span-4 border-r flex flex-col h-full bg-muted/20 ${
              activeChatId ? "hidden md:flex" : "flex"
            }`}
          >
            {/* Search / Contact Starter */}
            <div className="p-3 border-b space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts, sellers, or support..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl bg-background"
                />
              </div>

              {/* Instant Search Results Dropdown */}
              {contactSearch.trim() && (
                <div className="p-2 bg-background border rounded-2xl shadow-lg space-y-1 max-h-48 overflow-y-auto">
                  {isSearchingContacts ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                      Searching directory...
                    </div>
                  ) : discoveredContacts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center p-3">
                      No matching users or businesses found.
                    </p>
                  ) : (
                    discoveredContacts.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleStartChatWith(c)}
                        className="w-full text-left p-2 rounded-xl hover:bg-muted flex items-center gap-2.5 transition-colors"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={c.avatar} />
                          <AvatarFallback className="text-[10px] font-bold">
                            {c.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">
                            {c.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {c.role}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[9px]">
                          {c.badge}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Support Quick Contacts Section */}
            <div className="p-2 border-b bg-muted/40">
              <p className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1 tracking-wider">
                Support & Advisors
              </p>
              <div className="space-y-1">
                {DEFAULT_SUPPORT_CONTACTS.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => handleStartChatWith(sc)}
                    className="w-full text-left p-2 rounded-xl hover:bg-background/80 flex items-center gap-2.5 transition-colors group"
                  >
                    <Avatar className="h-8 w-8 ring-2 ring-primary/20 shrink-0">
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
                      <p className="text-[10px] text-muted-foreground truncate">
                        {sc.role}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <p className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1 tracking-wider">
                Active Conversations ({chats.length})
              </p>

              {chats.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
                  <MessageSquare className="h-8 w-8 mx-auto opacity-30" />
                  <p>No active chats yet.</p>
                  <p className="text-[11px]">
                    Select a support advisor above or search a seller to start real-time messaging.
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
                      onClick={() => setActiveChatId(c.id)}
                      className={`w-full text-left p-2.5 rounded-2xl flex items-center gap-3 transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-md font-bold"
                          : "hover:bg-muted/80 text-foreground"
                      }`}
                    >
                      <Avatar className="h-9 w-9 shrink-0">
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
                          <p className="text-xs font-bold truncate">{name}</p>
                          {c.lastMessageTime && (
                            <span
                              className={`text-[9px] shrink-0 ${
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
                          className={`text-[11px] truncate ${
                            isSelected ? "text-primary-foreground/90" : "text-muted-foreground"
                          }`}
                        >
                          {c.lastMessageText || "Tap to continue conversation"}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat Window (8 Cols) */}
          <div
            className={`md:col-span-8 flex flex-col h-full bg-background ${
              !activeChatId ? "hidden md:flex" : "flex"
            }`}
          >
            {activeChatId ? (
              <>
                {/* Active Chat Header */}
                <div className="p-3 sm:p-4 border-b flex items-center justify-between bg-card/60 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveChatId(null)}
                      className="md:hidden p-1 h-8 w-8 rounded-xl"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={otherParticipantAvatar} />
                      <AvatarFallback className="text-xs font-black bg-primary/10 text-primary">
                        {otherParticipantName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-foreground">
                          {otherParticipantName}
                        </h2>
                        <Badge
                          variant="outline"
                          className="text-[9px] py-0 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold"
                        >
                          Online
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-primary" />
                        Direct Real-time Thread
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-2">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                        <MessageSquare className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-bold text-foreground">
                        Say Hello to {otherParticipantName}!
                      </p>
                      <p className="text-xs max-w-sm">
                        Start your conversation regarding design orders, verified business inquiries, or general support.
                      </p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.senderId === currentUserId;
                      return (
                        <div
                          key={m.id}
                          className={`flex gap-2.5 max-w-[85%] ${
                            isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                          }`}
                        >
                          <div className="space-y-1">
                            <div
                              className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                                isMe
                                  ? "bg-primary text-primary-foreground rounded-tr-none shadow-sm"
                                  : "bg-muted/90 text-foreground rounded-tl-none border shadow-2xs"
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{m.text}</p>
                            </div>
                            <div
                              className={`flex items-center gap-1 text-[9px] text-muted-foreground ${
                                isMe ? "justify-end" : "justify-start"
                              }`}
                            >
                              <span>
                                {m.createdAt
                                  ? formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })
                                  : "just now"}
                              </span>
                              {isMe && <CheckCheck className="h-3 w-3 text-primary" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Box */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 sm:p-4 border-t bg-card flex items-center gap-2"
                >
                  <Input
                    placeholder={`Message ${otherParticipantName}...`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="h-11 rounded-2xl text-xs sm:text-sm"
                    disabled={isSending}
                  />
                  <Button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="h-11 px-5 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shrink-0 shadow-md"
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
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3">
                <div className="h-16 w-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                  <Headphones className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  Select a Conversation
                </h3>
                <p className="text-xs max-w-sm leading-relaxed">
                  Connect instantly with verified platform merchants, creative leads, and customer support with real-time sync.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
