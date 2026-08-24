import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell, CheckCircle2, Trash2, Search, ArrowLeft, Settings,
  Sparkles, ExternalLink, Filter, Check, ShieldCheck, Mail, Megaphone, Wallet, ShoppingBag
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

type NotificationItem = {
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const loadNotifications = async () => {
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
      setNotifications((data as NotificationItem[]) || []);
    }
    setFetching(false);
  };

  useEffect(() => {
    if (!user) return;
    loadNotifications();

    const channel = supabase
      .channel(`page_notif_${user.id}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
        () => loadNotifications())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
      loadNotifications();
    }
  };

  const markSingleRead = async (id: string, currentReadState: boolean) => {
    const { error } = await supabase
      .from("user_notifications")
      .update({ is_read: !currentReadState })
      .eq("id", id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: !currentReadState } : n))
      );
    }
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from("user_notifications")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Could not delete notification");
    } else {
      toast.success("Notification deleted");
      setNotifications((prev) => prev.filter((n) => n.id !== id));
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

  const filtered = notifications.filter((n) => {
    if (filter === "unread" && n.is_read) return false;
    if (filter === "read" && !n.is_read) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        (n.body && n.body.toLowerCase().includes(q)) ||
        (n.type && n.type.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getNotifIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "lead":
      case "sale":
        return <ShoppingBag className="h-4 w-4 text-emerald-500" />;
      case "wallet":
      case "payout":
        return <Wallet className="h-4 w-4 text-amber-500" />;
      case "broadcast":
      case "announcement":
        return <Megaphone className="h-4 w-4 text-purple-500" />;
      case "message":
        return <Mail className="h-4 w-4 text-blue-500" />;
      default:
        return <Sparkles className="h-4 w-4 text-primary" />;
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
          <Button asChild variant="outline" size="sm" className="rounded-xl border-border/80">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Dashboard
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500/20 via-amber-400/30 to-amber-300/40 border border-amber-400/50 shadow-md">
              <Bell className="h-5 w-5 text-amber-600 animate-bounce" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                Notifications Hub
              </h1>
              <p className="text-xs text-muted-foreground">Manage all your account updates and alert messages.</p>
            </div>
          </div>
        </div>

        <Button asChild variant="secondary" size="sm" className="rounded-xl font-semibold gap-1.5 shadow-xs">
          <Link to="/dashboard/settings/notifications">
            <Settings className="h-4 w-4" /> Push Settings
          </Link>
        </Button>
      </div>

      {/* Notifications Stat & Quick Action Banner */}
      <Card className="border-border/80 shadow-md rounded-2xl bg-gradient-to-r from-primary/10 via-amber-500/5 to-card overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold text-foreground">{notifications.length}</span>
                <span className="text-xs font-semibold text-muted-foreground">Total Notifications</span>
                {unreadCount > 0 && (
                  <Badge className="bg-rose-600 text-white font-bold text-xs px-2 py-0.5 rounded-full shadow-xs">
                    {unreadCount} Unread
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Stay updated on new leads, sales, and platform broadcasts.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5 shadow-xs">
                <CheckCircle2 className="h-4 w-4" /> Mark All as Read
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full sm:w-auto">
          <TabsList className="bg-muted/60 p-1 rounded-2xl">
            <TabsTrigger value="all" className="rounded-xl text-xs font-bold px-4">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="rounded-xl text-xs font-bold px-4">
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="read" className="rounded-xl text-xs font-bold px-4">
              Read ({notifications.length - unreadCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl text-xs h-9 bg-card"
          />
        </div>
      </div>

      {/* Notifications List */}
      <Card className="border-border/80 shadow-md rounded-2xl overflow-hidden bg-card">
        <CardContent className="p-0 divide-y divide-border/60">
          {fetching ? (
            <div className="p-12 text-center space-y-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
              <p className="text-xs font-semibold text-muted-foreground">Fetching notifications...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
                <Bell className="h-7 w-7 opacity-60" />
              </div>
              <p className="text-sm font-bold text-foreground">No Notifications Found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {search ? "No notifications match your search prompt." : "You have no notifications in this category yet."}
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className={`p-4 transition flex items-start gap-3.5 group ${
                  !item.is_read ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"
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
                  {getNotifIcon(item.type)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className={`text-sm font-bold truncate ${!item.is_read ? "text-foreground" : "text-foreground/80"}`}>
                        {item.title}
                      </p>
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

                  {item.body && (
                    <p className="text-xs text-muted-foreground leading-relaxed break-words">
                      {item.body}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-1.5">
                    {item.url ? (
                      <Button
                        asChild
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-xs font-bold text-primary gap-1 hover:underline"
                        onClick={() => markSingleRead(item.id, false)}
                      >
                        <Link to={item.url}>
                          View Details <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(item.created_at), "MMM d, yyyy • h:mm a")}
                      </span>
                    )}

                    <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => markSingleRead(item.id, item.is_read)}
                        className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition"
                        title={item.is_read ? "Mark as Unread" : "Mark as Read"}
                      >
                        <Check className={`h-3.5 w-3.5 ${item.is_read ? "text-muted-foreground" : "text-emerald-500"}`} />
                        {item.is_read ? "Unread" : "Read"}
                      </button>

                      <button
                        onClick={() => deleteNotification(item.id)}
                        className="text-[11px] font-medium text-muted-foreground hover:text-destructive flex items-center gap-1 transition ml-2"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
