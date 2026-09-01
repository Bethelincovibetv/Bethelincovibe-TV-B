import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  MessageSquare,
  Users,
  Shield,
  Crown,
  Paperclip,
  Smile,
  Send,
  MoreVertical,
  Check,
  CheckCheck,
  ArrowLeft,
  X,
  Phone,
  Video,
  Info,
  Lock,
  Download,
  Trash2,
  Reply,
  Copy,
  ChevronDown,
  Sparkles,
  Volume2,
  FileText,
  Image as ImageIcon,
  Loader2,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  Conversation,
  ChatMessage,
  TypingStatus,
  subscribeToConversations,
  subscribeToMessages,
  subscribeToTyping,
  sendMessage,
  setTypingStatus,
  toggleReaction,
  deleteMessage,
  seedOfficialCommunities,
  uploadChatMedia,
  joinGroup,
} from '@/services/realtimeChatService';
import VoiceNoteRecorder from './VoiceNoteRecorder';
import VoiceNotePlayer from './VoiceNotePlayer';
import NewGroupModal from './NewGroupModal';
import NewDirectChatModal from './NewDirectChatModal';
import GroupInfoDrawer from './GroupInfoDrawer';
import { toast } from 'sonner';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '👏', '🎉', '🚀', '💯'];

interface CommunityChatHubProps {
  initialConversationId?: string;
  className?: string;
}

export default function CommunityChatHub({ initialConversationId, className = '' }: CommunityChatHubProps) {
  const { user, isAdmin: isPlatformAdmin } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);
  const [inputText, setInputText] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'groups' | 'direct'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);

  // Modals & Drawers
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newDirectOpen, setNewDirectOpen] = useState(false);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [selectedMediaPreview, setSelectedMediaPreview] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Mobile navigation state
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Initialize official seed groups and conversations subscription
  useEffect(() => {
    seedOfficialCommunities(user?.id || 'system_admin', user?.user_metadata?.display_name || 'Bethelincovibe Admin');

    const unsub = subscribeToConversations(user?.id || null, isPlatformAdmin, (list) => {
      setConversations(list);
      // Auto-select initial or default conversation
      if (!selectedConv && list.length > 0) {
        const found = initialConversationId ? list.find((c) => c.id === initialConversationId) : list[0];
        setSelectedConv(found || list[0]);
      }
    });

    return () => unsub();
  }, [user?.id, isPlatformAdmin, initialConversationId]);

  // Subscribe to active conversation messages & typing
  useEffect(() => {
    if (!selectedConv) return;

    const unsubMessages = subscribeToMessages(selectedConv.id, (msgs) => {
      setMessages(msgs);
      setTimeout(scrollToBottom, 50);
    });

    const unsubTyping = subscribeToTyping(selectedConv.id, user?.id || null, (typers) => {
      setTypingUsers(typers);
    });

    return () => {
      unsubMessages();
      unsubTyping();
    };
  }, [selectedConv?.id, user?.id]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (!chatScrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBottom(distanceFromBottom > 150);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    if (selectedConv && user) {
      const senderName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
      setTypingStatus(selectedConv.id, { id: user.id, name: senderName, avatar: user.user_metadata?.avatar_url }, val.length > 0);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedConv || !user) {
      if (!user) toast.error('Please sign in to participate in the conversation.');
      return;
    }

    const textToSend = inputText.trim();
    setInputText('');
    setShowEmojiPicker(false);

    try {
      const senderName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Member';
      const senderAvatar = user.user_metadata?.avatar_url || '';

      await sendMessage(selectedConv.id, {
        senderId: user.id,
        senderName,
        senderAvatar,
        text: textToSend,
        type: 'text',
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              senderName: replyingTo.senderName,
              text: replyingTo.text || 'Media attachment',
              type: replyingTo.type,
            }
          : undefined,
      });

      setReplyingTo(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send message');
    }
  };

  const handleVoiceNoteSend = async (blob: Blob, duration: number) => {
    if (!selectedConv || !user) return;
    try {
      setIsUploadingMedia(true);
      const senderName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Member';
      const senderAvatar = user.user_metadata?.avatar_url || '';

      const { url, size } = await uploadChatMedia(blob, selectedConv.id, user.id, 'webm');
      await sendMessage(selectedConv.id, {
        senderId: user.id,
        senderName,
        senderAvatar,
        text: '',
        type: 'voice_note',
        mediaUrl: url,
        mediaSize: size,
        mediaDuration: duration,
      });
      toast.success('Voice note sent!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send voice note');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedConv || !user) return;

    const file = files[0];
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const type = isImage ? 'image' : isVideo ? 'video' : 'file';

    try {
      setIsUploadingMedia(true);
      const senderName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Member';
      const senderAvatar = user.user_metadata?.avatar_url || '';

      const { url, name, size } = await uploadChatMedia(file, selectedConv.id, user.id);
      await sendMessage(selectedConv.id, {
        senderId: user.id,
        senderName,
        senderAvatar,
        text: '',
        type,
        mediaUrl: url,
        mediaName: name,
        mediaSize: size,
      });
      toast.success(`${isImage ? 'Photo' : isVideo ? 'Video' : 'File'} sent!`);
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReact = async (msg: ChatMessage, emoji: string) => {
    if (!user || !selectedConv) return;
    const userName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
    await toggleReaction(selectedConv.id, msg.id, emoji, user.id, userName);
  };

  const handleDelete = async (msg: ChatMessage) => {
    if (!user || !selectedConv) return;
    const isGroupAdmin = selectedConv.adminIds?.includes(user.id) || selectedConv.createdBy === user.id;
    try {
      await deleteMessage(selectedConv.id, msg.id, user.id, isGroupAdmin || isPlatformAdmin);
      toast.success('Message deleted.');
    } catch (err: any) {
      toast.error(err?.message || 'Cannot delete message');
    }
  };

  const formatMessageTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatHeaderDate = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isUserAdminInGroup =
    selectedConv?.adminIds?.includes(user?.id || '') ||
    selectedConv?.createdBy === user?.id ||
    isPlatformAdmin;

  const cannotPostInGroup =
    selectedConv?.onlyAdminsCanPost && !isUserAdminInGroup;

  const isMemberOfSelected =
    selectedConv?.participantIds?.includes(user?.id || '');

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (filterTab === 'groups' && c.type === 'direct') return false;
    if (filterTab === 'direct' && c.type !== 'direct') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.lastMessageText && c.lastMessageText.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filter messages for search in chat
  const displayedMessages = chatSearchQuery.trim()
    ? messages.filter((m) => m.text.toLowerCase().includes(chatSearchQuery.toLowerCase()))
    : messages;

  return (
    <div
      className={`flex h-[calc(100vh-4.5rem)] min-h-[580px] w-full rounded-3xl border border-border/80 bg-card overflow-hidden shadow-2xl ${className}`}
    >
      {/* -------------------- LEFT SIDEBAR (CONVERSATIONS) -------------------- */}
      <div
        className={`w-full md:w-[360px] lg:w-[400px] border-r border-border/70 flex flex-col bg-card/60 backdrop-blur-md shrink-0 transition-all ${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-border/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img
                src={user?.user_metadata?.avatar_url || '/logo.png'}
                alt="Profile"
                className="h-10 w-10 rounded-2xl object-cover border border-primary/30 ring-2 ring-primary/10"
              />
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight text-foreground">
                Community Chats
              </div>
              <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <Radio className="h-2.5 w-2.5 text-emerald-500 animate-pulse" /> Real-Time Network
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setNewDirectOpen(true)}
              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10"
              title="New Private Chat"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              variant="default"
              onClick={() => setNewGroupOpen(true)}
              className="h-9 w-9 rounded-xl bg-gradient-to-r from-primary to-accent shadow-xs text-white"
              title="Create Community Group"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-3 pt-2.5 pb-1.5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search chats, groups, messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 rounded-xl text-xs bg-secondary/40 border-border/60"
            />
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/40">
          {[
            { id: 'all', label: 'All' },
            { id: 'groups', label: 'Groups' },
            { id: 'direct', label: 'Direct' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                filterTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/30">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground space-y-2">
              <Users className="h-8 w-8 mx-auto opacity-40 text-primary" />
              <div className="text-xs font-bold">No conversations found</div>
              <div className="text-[11px]">
                Create a new WhatsApp-style group or start a 1-on-1 private chat.
              </div>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedConv?.id === conv.id;
              const isGroup = conv.type !== 'direct';

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setSelectedConv(conv);
                    setMobileView('chat');
                  }}
                  className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-l-4 border-primary pl-2'
                      : 'hover:bg-secondary/40'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={conv.avatarUrl || '/logo.png'}
                      alt="avatar"
                      className="h-12 w-12 rounded-2xl object-cover border border-border/80 shadow-2xs"
                    />
                    {conv.type === 'official' && (
                      <span className="absolute -top-1 -right-1 p-0.5 bg-primary text-white rounded-full">
                        <Crown className="h-3 w-3 fill-current" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-bold truncate text-foreground">
                          {conv.name}
                        </span>
                        {isGroup && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-secondary text-muted-foreground shrink-0">
                            {conv.memberCount || conv.participantIds?.length || 1}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                        {conv.lastMessageTime ? formatMessageTime(conv.lastMessageTime) : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <div className="text-[11px] text-muted-foreground truncate">
                        {conv.lastSenderName && isGroup ? (
                          <span className="font-semibold text-foreground/80 mr-1">
                            {conv.lastSenderName}:
                          </span>
                        ) : null}
                        {conv.lastMessageText || 'Tap to join conversation'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* -------------------- RIGHT MAIN CHAT WINDOW -------------------- */}
      <div
        className={`flex-1 flex flex-col bg-background/50 backdrop-blur-md relative ${
          mobileView === 'list' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {selectedConv ? (
          <>
            {/* Main Chat Top Header */}
            <div className="h-16 px-4 border-b border-border/70 flex items-center justify-between bg-card/80 backdrop-blur-lg shrink-0 z-10 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setMobileView('list')}
                  className="md:hidden h-8 w-8 rounded-xl text-muted-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                <div
                  onClick={() => setGroupInfoOpen(true)}
                  className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity min-w-0"
                >
                  <div className="relative shrink-0">
                    <img
                      src={selectedConv.avatarUrl || '/logo.png'}
                      alt="Avatar"
                      className="h-10 w-10 rounded-2xl object-cover border border-primary/20"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black truncate text-foreground">
                        {selectedConv.name}
                      </span>
                      {selectedConv.type === 'official' && (
                        <span className="p-0.5 rounded-full bg-primary/20 text-primary">
                          <Crown className="h-3 w-3 fill-current" />
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                      {typingUsers.length > 0 ? (
                        <span className="text-primary font-bold animate-pulse flex items-center gap-1">
                          ✍️ {typingUsers.map((t) => t.userName).join(', ')} is typing...
                        </span>
                      ) : selectedConv.type !== 'direct' ? (
                        <span>
                          {selectedConv.participantIds?.length || 1} members • Tap for group info & rules
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active in direct chat
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Actions Top Bar */}
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowChatSearch(!showChatSearch)}
                  className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                  title="Search in Chat"
                >
                  <Search className="h-4 w-4" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setGroupInfoOpen(true)}
                  className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10"
                  title="Group Info & Settings"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Chat Search Inline Bar */}
            {showChatSearch && (
              <div className="p-2 bg-secondary/60 border-b border-border/60 flex items-center gap-2 animate-in slide-in-from-top duration-200">
                <Search className="h-4 w-4 text-muted-foreground ml-2" />
                <Input
                  placeholder="Search messages in this chat..."
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  className="h-8 text-xs rounded-xl bg-background"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setShowChatSearch(false);
                    setChatSearchQuery('');
                  }}
                  className="h-8 w-8 rounded-xl"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* Restricted Banner if only admins can post */}
            {cannotPostInGroup && (
              <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center justify-center gap-2">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span>Only Group Administrators can send messages in this channel.</span>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div
              ref={chatScrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 space-y-3 relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px]"
            >
              {displayedMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground space-y-3">
                  <div className="p-4 rounded-3xl bg-secondary/60 border border-border/80 shadow-xs">
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    Start of {selectedConv.name}
                  </div>
                  <div className="text-xs max-w-xs">
                    Messages in this real-time community chat are synchronized live across all members.
                  </div>
                </div>
              ) : (
                displayedMessages.map((msg, index) => {
                  const isSelf = msg.senderId === user?.id;
                  const isSystem = msg.type === 'system';
                  const showHeaderDate =
                    index === 0 ||
                    new Date(msg.createdAt).toDateString() !==
                      new Date(displayedMessages[index - 1].createdAt).toDateString();

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <div className="px-3 py-1 rounded-full bg-secondary/80 border border-border/60 text-[11px] font-medium text-muted-foreground shadow-2xs max-w-md text-center">
                          {msg.text}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <React.Fragment key={msg.id}>
                      {showHeaderDate && (
                        <div className="flex justify-center my-3">
                          <span className="px-3 py-0.5 rounded-full bg-background/80 border border-border/60 text-[10px] font-bold text-muted-foreground uppercase tracking-wider shadow-2xs">
                            {formatHeaderDate(msg.createdAt)}
                          </span>
                        </div>
                      )}

                      <div className={`flex items-end gap-2 group ${isSelf ? 'justify-end' : 'justify-start'}`}>
                        {/* Avatar for others in group */}
                        {!isSelf && selectedConv.type !== 'direct' && (
                          <img
                            src={msg.senderAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.senderId}`}
                            alt="Sender"
                            className="h-7 w-7 rounded-xl object-cover shrink-0 border border-border/80 shadow-2xs mb-1"
                          />
                        )}

                        {/* Bubble Container */}
                        <div
                          className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-xs transition-all ${
                            isSelf
                              ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-br-xs'
                              : 'bg-card text-card-foreground border border-border/70 rounded-bl-xs'
                          }`}
                        >
                          {/* Sender Name in Groups */}
                          {!isSelf && selectedConv.type !== 'direct' && (
                            <div className="text-[11px] font-black text-primary mb-1 flex items-center gap-1">
                              {msg.senderName}
                              {selectedConv.adminIds?.includes(msg.senderId) && (
                                <span className="text-[9px] px-1 py-0.2 rounded-md bg-primary/10 text-primary border border-primary/20">
                                  ADMIN
                                </span>
                              )}
                            </div>
                          )}

                          {/* Quoted Reply Box */}
                          {msg.replyTo && (
                            <div
                              className={`p-2 mb-1.5 rounded-xl text-xs border-l-4 ${
                                isSelf
                                  ? 'bg-black/15 border-white text-white/90'
                                  : 'bg-secondary/60 border-primary text-foreground'
                              }`}
                            >
                              <div className="font-bold text-[10px] opacity-90">{msg.replyTo.senderName}</div>
                              <div className="text-[11px] truncate opacity-80">{msg.replyTo.text}</div>
                            </div>
                          )}

                          {/* Media: Photos & Lightbox */}
                          {msg.type === 'image' && msg.mediaUrl && (
                            <div className="mb-1 rounded-xl overflow-hidden cursor-pointer">
                              <img
                                src={msg.mediaUrl}
                                alt="Attachment"
                                onClick={() => setSelectedMediaPreview(msg.mediaUrl!)}
                                className="max-h-64 w-full object-cover hover:scale-102 transition-transform"
                              />
                            </div>
                          )}

                          {/* Media: Videos */}
                          {msg.type === 'video' && msg.mediaUrl && (
                            <div className="mb-1 rounded-xl overflow-hidden">
                              <video src={msg.mediaUrl} controls className="max-h-64 w-full rounded-xl" />
                            </div>
                          )}

                          {/* Media: Voice Notes */}
                          {msg.type === 'voice_note' && msg.mediaUrl && (
                            <VoiceNotePlayer
                              audioUrl={msg.mediaUrl}
                              duration={msg.mediaDuration}
                              isSelf={isSelf}
                            />
                          )}

                          {/* Media: Document / Generic File */}
                          {msg.type === 'file' && msg.mediaUrl && (
                            <a
                              href={msg.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={`flex items-center gap-2 p-2 rounded-xl mb-1 border ${
                                isSelf ? 'bg-black/10 border-white/20 text-white' : 'bg-secondary border-border/80 text-foreground'
                              }`}
                            >
                              <FileText className="h-5 w-5 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold truncate">{msg.mediaName || 'Document'}</div>
                                <div className="text-[10px] opacity-70">
                                  {msg.mediaSize ? `${(msg.mediaSize / 1024).toFixed(0)} KB` : 'Download'}
                                </div>
                              </div>
                              <Download className="h-4 w-4 shrink-0 opacity-80" />
                            </a>
                          )}

                          {/* Message Text */}
                          {msg.text && (
                            <div className="text-xs sm:text-sm font-medium whitespace-pre-wrap break-words leading-relaxed">
                              {msg.text}
                            </div>
                          )}

                          {/* Timestamp and Read Status */}
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                              isSelf ? 'text-white/80' : 'text-muted-foreground'
                            }`}
                          >
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {msg.isEdited && <span className="italic text-[9px]">edited</span>}
                            {isSelf && (
                              <CheckCheck className="h-3.5 w-3.5 text-white stroke-[2.5]" />
                            )}
                          </div>

                          {/* Emoji Reactions Pills */}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {Object.entries(msg.reactions).map(([emoji, item]) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReact(msg, emoji)}
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold border transition-all ${
                                    item.users.includes(user?.id || '')
                                      ? 'bg-primary/20 border-primary text-primary'
                                      : 'bg-secondary/80 border-border/60 text-muted-foreground hover:bg-secondary'
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  <span>{item.count}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Hover Quick Actions (Reply, React, Delete) */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 pb-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setReplyingTo(msg)}
                            className="h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground"
                            title="Reply"
                          >
                            <Reply className="h-3 w-3" />
                          </Button>

                          <div className="flex items-center gap-0.5 bg-background/90 border border-border/70 rounded-lg p-0.5 shadow-xs">
                            {['👍', '❤️', '🔥'].map((em) => (
                              <button
                                key={em}
                                onClick={() => handleReact(msg, em)}
                                className="text-xs hover:scale-125 transition-transform px-0.5"
                              >
                                {em}
                              </button>
                            ))}
                          </div>

                          {(isSelf || isUserAdminInGroup) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(msg)}
                              className="h-6 w-6 rounded-lg text-muted-foreground hover:text-destructive"
                              title="Delete message"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Floating Scroll to Bottom Button */}
            {showScrollBottom && (
              <Button
                size="icon"
                onClick={scrollToBottom}
                className="absolute bottom-20 right-6 h-9 w-9 rounded-full bg-card border border-border shadow-lg text-foreground hover:bg-secondary z-20"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}

            {/* Quoted Reply Banner */}
            {replyingTo && (
              <div className="px-4 py-2 bg-secondary/80 border-t border-border/60 flex items-center justify-between text-xs animate-in slide-in-from-bottom duration-150">
                <div className="flex items-center gap-2 min-w-0">
                  <Reply className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-foreground">Replying to {replyingTo.senderName}: </span>
                    <span className="text-muted-foreground truncate">{replyingTo.text || 'Attachment'}</span>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setReplyingTo(null)}
                  className="h-6 w-6 rounded-full"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* Quick Emoji Picker Drawer */}
            {showEmojiPicker && (
              <div className="p-2 bg-card border-t border-border/60 flex items-center gap-1.5 overflow-x-auto">
                {QUICK_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => {
                      setInputText((prev) => prev + em);
                    }}
                    className="p-1.5 text-lg hover:scale-125 transition-transform"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}

            {/* Chat Input Bar */}
            <div className="p-3 border-t border-border/70 bg-card/90 backdrop-blur-md">
              {!isMemberOfSelected && selectedConv.type !== 'direct' ? (
                <div className="flex items-center justify-between p-2 rounded-2xl bg-secondary/60 border border-border/80">
                  <span className="text-xs text-muted-foreground">
                    You are viewing the public community. Join to participate in the conversation.
                  </span>
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (!user) {
                        toast.error('Please sign in to join.');
                        return;
                      }
                      await joinGroup(selectedConv.id, {
                        id: user.id,
                        name: user.user_metadata?.display_name || 'Member',
                        avatar: user.user_metadata?.avatar_url,
                      });
                      toast.success('Joined group!');
                    }}
                    className="rounded-xl font-bold text-xs bg-primary"
                  >
                    Join Group
                  </Button>
                </div>
              ) : cannotPostInGroup ? (
                <div className="text-center py-2 text-xs font-semibold text-muted-foreground bg-muted/40 rounded-2xl">
                  🔒 Only administrators can send messages to this announcement group.
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex items-end gap-1.5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {/* Attachment Button */}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingMedia}
                    className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
                    title="Attach Photo or Document"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  {/* Emoji Button */}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
                    title="Emoji Picker"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>

                  {/* Textarea */}
                  <div className="flex-1 relative">
                    <Textarea
                      placeholder="Type a message..."
                      value={inputText}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      rows={1}
                      className="min-h-[38px] max-h-24 resize-none py-2 px-3 text-xs sm:text-sm rounded-2xl bg-secondary/50 border-border/80 focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Voice Note Recorder or Send Button */}
                  {inputText.trim() ? (
                    <Button
                      type="submit"
                      size="icon"
                      className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent shadow-xs text-white shrink-0 hover:opacity-90 active:scale-95 transition-all"
                      title="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  ) : (
                    <VoiceNoteRecorder onSendVoiceNote={handleVoiceNoteSend} disabled={isUploadingMedia} />
                  )}
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground space-y-3">
            <div className="p-4 rounded-3xl bg-secondary/60 border border-border/80">
              <Users className="h-10 w-10 text-primary" />
            </div>
            <div className="text-base font-black text-foreground">Bethelincovibe TV Community</div>
            <div className="text-xs max-w-sm">
              Select an official channel, join a trade group, or initiate a private conversation from the sidebar.
            </div>
          </div>
        )}
      </div>

      {/* Modals and Drawers */}
      <NewGroupModal
        open={newGroupOpen}
        onOpenChange={setNewGroupOpen}
        onGroupCreated={(group) => {
          setSelectedConv(group);
          setMobileView('chat');
        }}
      />

      <NewDirectChatModal
        open={newDirectOpen}
        onOpenChange={setNewDirectOpen}
        onConversationSelected={(conv) => {
          setSelectedConv(conv);
          setMobileView('chat');
        }}
      />

      {selectedConv && (
        <GroupInfoDrawer
          open={groupInfoOpen}
          onOpenChange={setGroupInfoOpen}
          conversation={selectedConv}
          onConversationUpdated={(updates) => {
            setSelectedConv((prev) => (prev ? { ...prev, ...updates } : null));
          }}
          onDirectMessageSelected={(dmConv) => {
            setSelectedConv(dmConv);
            setMobileView('chat');
          }}
        />
      )}

      {/* Fullscreen Lightbox Modal for Media */}
      {selectedMediaPreview && (
        <div
          onClick={() => setSelectedMediaPreview(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
        >
          <img
            src={selectedMediaPreview}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
