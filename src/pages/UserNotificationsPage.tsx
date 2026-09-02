import { useEffect, useState, useMemo } from "react";
import { Link, Navigate, useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bell, CheckCircle2, Trash2, Search, ArrowLeft, Settings,
  Sparkles, ExternalLink, Filter, Check, ShieldCheck, Mail, Megaphone, Wallet, ShoppingBag,
  Volume2, VolumeX, MessageSquare, Gift, Copy, Share2, Eye
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { playNotificationSound, isNotificationSoundEnabled, setNotificationSoundEnabled } from "@/lib/notificationSound";
import { getBestUserName, personalizeNotificationTitle, personalizeNotificationBody } from "@/lib/notificationPersonalizer";

export type NotificationItem = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  url: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
};

export default function UserNotificationsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "announcement" | "wallet" | "lead" | "forum" | "read">("all");
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [soundEnabled, setSoundState] = useState(() => isNotificationSoundEnabled());

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundState(next);
    setNotificationSoundEnabled(next);
    if (next) {
      playNotificationSound();
      toast.success("Notification sound enabled");
    } else {
      toast.info("Notification sound muted");
    }
  };

  const loadNotifications = async (isRealtimeUpdate = false) => {
    if (!user) return;
    setFetching(true);
    const { data, error } = await supabase
      .from("user_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading notifications:", error);
    } else {
      if (isRealtimeUpdate) {
        playNotificationSound();
      }
      const loadedList = (data as NotificationItem[]) || [];
      setNotifications(loadedList);

      // Check if URL contains an ID to open directly
      const targetId = searchParams.get("id") || searchParams.get("highlight");
      if (targetId) {
        const found = loadedList.find((n) => n.id === targetId);
        if (found) {
          setSelectedNotification(found);
          setIsDetailOpen(true);
          if (!found.is_read) {
            markSingleRead(found.id, false);
          }
        }
      }
    }
    setFetching(false);
  };

  useEffect(() => {
    if (!user) return;
    loadNotifications(false);

    const channel = supabase
      .channel(`page_notif_${user.id}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
        () => loadNotifications(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Handle URL param changes dynamically
  useEffect(() => {
    const targetId = searchParams.get("id") || searchParams.get("highlight");
    if (targetId && notifications.length > 0) {
      const found = notifications.find((n) => n.id === targetId);
      if (found) {
        setSelectedNotification(found);
        setIsDetailOpen(true);
        if (!found.is_read) {
          markSingleRead(found.id, false);
        }
      }
    }
  }, [searchParams, notifications]);

  const userName = getBestUserName(user);

  // Filtered notifications calculation (top-level hook)
  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === "unread" && n.is_read) return false;
      if (filter === "read" && !n.is_read) return false;
      if (filter === "announcement" && !["system", "announcement", "broadcast", "marketing"].includes(n.type?.toLowerCase())) return false;
      if (filter === "wallet" && !["wallet", "reward", "payout"].includes(n.type?.toLowerCase())) return false;
      if (filter === "lead" && !["lead", "sale", "inquiry", "order"].includes(n.type?.toLowerCase())) return false;
      if (filter === "forum" && !["forum", "forum_reply", "forum_reaction"].includes(n.type?.toLowerCase())) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const pTitle = personalizeNotificationTitle(n.title, userName).toLowerCase();
        const pBody = n.body ? personalizeNotificationBody(n.body, userName).toLowerCase() : "";
        return (
          pTitle.includes(q) ||
          pBody.includes(q) ||
          (n.type && n.type.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [notifications, filter, search, userName]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from("user_notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      toast.error("Failed to mark notifications as read");
    } else {
      toast.success("All notifications marked as read!");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  const markSingleRead = async (id: string, currentReadState: boolean) => {
    const nextState = !currentReadState;
    const { error } = await supabase
      .from("user_notifications")
      .update({ is_read: nextState })
      .eq("id", id)
      .eq("user_id", user.id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: nextState } : n))
      );
      if (selectedNotification?.id === id) {
        setSelectedNotification((prev) => prev ? { ...prev, is_read: nextState } : null);
      }
    }
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from("user_notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Could not delete notification");
    } else {
      toast.success("Notification removed");
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (selectedNotification?.id === id) {
        setIsDetailOpen(false);
        setSelectedNotification(null);
      }
    }
  };

  const clearAllRead = async () => {
    const { error } = await supabase
      .from("user_notifications")
      .delete()
      .eq("user_id", user.id)
      .eq("is_read", true);

    if (error) {
      toast.error("Failed to clear read notifications");
    } else {
      toast.success("Cleared read notifications");
      loadNotifications();
    }
  };

  const openDetailModal = (item: NotificationItem) => {
    setSelectedNotification(item);
    setIsDetailOpen(true);
    if (!item.is_read) {
      markSingleRead(item.id, false);
    }
  };

  const handleActionClick = (url: string) => {
    setIsDetailOpen(false);
    if (url.startsWith("http://") || url.startsWith("https://")) {
      window.open(url, "_blank");
    } else {
      navigate(url);
    }
  };

  const copyNotificationLink = (id: string) => {
    const link = `${window.location.origin}/dashboard/notifications?id=${id}`;
    navigator.clipboard.writeText(link);
    toast.success("Notification link copied to clipboard");
  };

  const getNotifMeta = (type: string) => {
    switch (type?.toLowerCase()) {
      case "lead":
      case "sale":
      case "inquiry":
      case "order":
        return {
          icon: <ShoppingBag className="h-4 w-4 text-emerald-500" />,
          label: "Business Lead / Sale",
          badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        };
      case "wallet":
      case "payout":
        return {
          icon: <Wallet className="h-4 w-4 text-amber-500" />,
          label: "Wallet & Credits",
          badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        };
      case "reward":
        return {
          icon: <Gift className="h-4 w-4 text-rose-500" />,
          label: "Daily Reward",
          badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/20",
        };
      case "broadcast":
      case "announcement":
        return {
          icon: <Megaphone className="h-4 w-4 text-purple-500" />,
          label: "Platform Announcement",
          badgeClass: "bg-purple-500/10 text-purple-600 border-purple-500/20",
        };
      case "forum":
      case "forum_reply":
      case "forum_reaction":
        return {
          icon: <MessageSquare className="h-4 w-4 text-blue-500" />,
          label: "Community Forum",
          badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        };
      default:
        return {
          icon: <Sparkles className="h-4 w-4 text-primary" />,
          label: "Bethelincovibe TV System",
          badgeClass: "bg-primary/10 text-primary border-primary/20",
        };
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 space-y-6">
      <Helmet>
        <title>Notifications Hub | Bethelincovibe TV</title>
      </Helmet>

      {/* Top Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="rounded-xl border-border/80 shadow-xs">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Dashboard
            </Link>
          </Button>

          <div className="flex items-center gap-2.5">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500/20 via-amber-400/30 to-amber-300/40 border border-amber-400/50 shadow-md">
              <Bell className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                Notifications Hub
              </h1>
              <p className="text-xs text-muted-foreground">Real-time alerts, daily rewards, broadcasts, and business updates.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleSound}
            className="rounded-xl font-semibold gap-1.5 shadow-xs border-border/80"
            title={soundEnabled ? "Mute notification sound" : "Enable notification sound"}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="h-4 w-4 text-primary" /> <span className="hidden sm:inline">Sound:</span> On
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4 text-muted-foreground" /> <span className="hidden sm:inline">Sound:</span> Muted
              </>
            )}
          </Button>

          <Button asChild variant="secondary" size="sm" className="rounded-xl font-semibold gap-1.5 shadow-xs">
            <Link to="/dashboard/settings/notifications">
              <Settings className="h-4 w-4" /> <span className="hidden sm:inline">Push</span> Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Notifications Stat & Quick Action Banner */}
      <Card className="border-border/80 shadow-md rounded-2xl bg-gradient-to-r from-primary/10 via-amber-500/5 to-card overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-xs">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold text-foreground">{notifications.length}</span>
                <span className="text-xs font-semibold text-muted-foreground">Total Notifications</span>
                {unreadCount > 0 && (
                  <Badge className="bg-rose-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-full shadow-xs">
                    {unreadCount} Unread
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">All messages are privately isolated and securely delivered to your devices.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5 shadow-xs">
                <CheckCircle2 className="h-4 w-4" /> Mark All Read
              </Button>
            )}

            {notifications.some((n) => n.is_read) && (
              <Button onClick={clearAllRead} variant="outline" size="sm" className="rounded-xl font-semibold gap-1.5 text-xs text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" /> Clear Read
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full sm:w-auto overflow-x-auto">
            <TabsList className="bg-muted/70 p-1 rounded-2xl inline-flex w-max">
              <TabsTrigger value="all" className="rounded-xl text-xs font-bold px-3.5">
                All ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread" className="rounded-xl text-xs font-bold px-3.5">
                Unread ({unreadCount})
              </TabsTrigger>
              <TabsTrigger value="announcement" className="rounded-xl text-xs font-bold px-3">
                Announcements
              </TabsTrigger>
              <TabsTrigger value="wallet" className="rounded-xl text-xs font-bold px-3">
                Rewards & Wallet
              </TabsTrigger>
              <TabsTrigger value="lead" className="rounded-xl text-xs font-bold px-3">
                Leads & Sales
              </TabsTrigger>
              <TabsTrigger value="read" className="rounded-xl text-xs font-bold px-3">
                Read ({notifications.length - unreadCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl text-xs h-9 bg-card border-border/80"
            />
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <Card className="border-border/80 shadow-md rounded-2xl overflow-hidden bg-card">
        <CardContent className="p-0 divide-y divide-border/60">
          {fetching ? (
            <div className="p-12 text-center space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
              <p className="text-xs font-semibold text-muted-foreground">Fetching your secure notifications...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto shadow-inner">
                <Bell className="h-7 w-7 opacity-60" />
              </div>
              <p className="text-sm font-bold text-foreground">No Notifications Found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {search ? "No notifications match your search query." : "You have no notifications in this category yet."}
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const meta = getNotifMeta(item.type);
              const displayTitle = personalizeNotificationTitle(item.title, userName);
              const displayBody = item.body ? personalizeNotificationBody(item.body, userName) : null;
              return (
                <div
                  key={item.id}
                  onClick={() => openDetailModal(item)}
                  className={`p-4 transition-all duration-200 flex items-start gap-3.5 group cursor-pointer ${
                    !item.is_read
                      ? "bg-primary/5 hover:bg-primary/10 border-l-4 border-primary"
                      : "hover:bg-muted/40"
                  }`}
                >
                  {/* Icon Container */}
                  <div
                    className={`p-2.5 rounded-2xl shrink-0 mt-0.5 border ${
                      !item.is_read
                        ? "bg-primary/10 border-primary/30 text-primary shadow-xs"
                        : "bg-muted border-border/60 text-muted-foreground"
                    }`}
                  >
                    {meta.icon}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <p className={`text-sm font-bold ${!item.is_read ? "text-foreground" : "text-foreground/80"}`}>
                          {displayTitle}
                        </p>
                        <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0 h-4.5 rounded-full ${meta.badgeClass}`}>
                          {meta.label}
                        </Badge>
                        {!item.is_read && (
                          <Badge className="bg-rose-600 text-white text-[9px] px-1.5 py-0 h-4 rounded-full font-extrabold shrink-0">
                            NEW
                          </Badge>
                        )}
                      </div>

                      <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    {displayBody && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {displayBody}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[11px] font-semibold text-primary group-hover:underline flex items-center gap-1">
                          <Eye className="h-3 w-3" /> View full message
                        </span>
                        {item.url && (
                          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md">
                            <ExternalLink className="h-2.5 w-2.5" /> Direct link attached
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => markSingleRead(item.id, item.is_read)}
                          className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition p-1"
                          title={item.is_read ? "Mark as Unread" : "Mark as Read"}
                        >
                          <Check className={`h-3.5 w-3.5 ${item.is_read ? "text-muted-foreground" : "text-emerald-500"}`} />
                          <span className="hidden sm:inline">{item.is_read ? "Unread" : "Read"}</span>
                        </button>

                        <button
                          onClick={() => deleteNotification(item.id)}
                          className="text-[11px] font-medium text-muted-foreground hover:text-destructive flex items-center gap-1 transition p-1 ml-1"
                          title="Delete notification"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Full Notification Detail Modal Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6 space-y-4">
          {selectedNotification && (
            <>
              <DialogHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${getNotifMeta(selectedNotification.type).badgeClass}`}>
                    {getNotifMeta(selectedNotification.type).label}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-medium">
                    {format(new Date(selectedNotification.created_at), "MMM d, yyyy • h:mm a")}
                  </span>
                </div>
                <DialogTitle className="text-lg sm:text-xl font-black text-foreground leading-snug">
                  {personalizeNotificationTitle(selectedNotification.title, userName)}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Delivered securely to your Bethelincovibe TV dashboard inbox and active devices.
                </DialogDescription>
              </DialogHeader>

              {/* Full Un-truncated Body */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border/80 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {selectedNotification.body
                  ? personalizeNotificationBody(selectedNotification.body, userName)
                  : `Hi ${userName}, no additional text content provided for this notification.`}
              </div>

              {/* Action Buttons */}
              <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyNotificationLink(selectedNotification.id)}
                    className="rounded-xl text-xs font-semibold gap-1"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy Link
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => markSingleRead(selectedNotification.id, selectedNotification.is_read)}
                    className="rounded-xl text-xs font-semibold gap-1"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {selectedNotification.is_read ? "Mark Unread" : "Mark Read"}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {selectedNotification.url && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleActionClick(selectedNotification.url!)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl gap-1.5 shadow-xs flex-1 sm:flex-initial"
                    >
                      Open Action Destination <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDetailOpen(false)}
                    className="rounded-xl text-xs"
                  >
                    Close
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

