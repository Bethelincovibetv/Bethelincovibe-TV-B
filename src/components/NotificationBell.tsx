import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, ExternalLink, Settings, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

type N = { id: string; title: string; body: string | null; url: string | null; is_read: boolean; created_at: string; type: string };

export default function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<N[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as any[]) || []);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const channel = supabase
      .channel(`notif_${user.id}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) return null;
  const unread = items.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    await supabase.from("user_notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    load();
  };

  const markRead = async (id: string) => {
    await supabase.from("user_notifications").update({ is_read: true }).eq("id", id);
    load();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative group p-2 rounded-2xl transition-all duration-300 transform active:scale-95 focus:outline-hidden"
          title="Notifications"
        >
          {/* 3D Glossy Floating Background Disk */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-amber-300/40 via-amber-400/20 to-amber-600/30 border border-amber-300/50 shadow-[0_4px_12px_rgba(245,158,11,0.25),inset_0_1px_1px_rgba(255,255,255,0.6)] group-hover:shadow-[0_6px_18px_rgba(245,158,11,0.4),inset_0_1px_2px_rgba(255,255,255,0.8)] transition-all duration-300" />

          {/* 3D Bell Icon with Gold Gradient Fill and Drop Shadow */}
          <div className="relative z-10 flex items-center justify-center h-5 w-5">
            <Bell
              className={`h-5 w-5 text-amber-500 fill-amber-400/80 drop-shadow-[0_2px_4px_rgba(180,83,9,0.5)] transition-transform duration-300 ${
                unread > 0 ? "animate-bounce group-hover:rotate-12" : "group-hover:rotate-12"
              }`}
            />
          </div>

          {/* 3D Red Sphere Badge */}
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 z-20 flex h-5 min-w-[20px] px-1 items-center justify-center text-[10px] font-black text-white rounded-full bg-gradient-to-b from-rose-400 via-rose-600 to-red-700 border border-rose-200/60 shadow-[0_3px_8px_rgba(225,29,72,0.6),inset_0_1px_1px_rgba(255,255,255,0.8)] animate-pulse">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 sm:w-88 p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-card">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/10 via-amber-500/5 to-card border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-600">
              <Bell className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm font-extrabold text-foreground">Notifications</p>
            {unread > 0 && (
              <Badge className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0 rounded-full">
                {unread} New
              </Badge>
            )}
          </div>

          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 transition"
            >
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>

        {/* List Items */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
          {items.length === 0 && (
            <div className="p-8 text-center space-y-2">
              <div className="h-10 w-10 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
                <Bell className="h-5 w-5 opacity-60" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground">No new notifications yet</p>
            </div>
          )}

          {items.map((n) => {
            const inner = (
              <div className={`p-3.5 hover:bg-muted/40 transition cursor-pointer ${!n.is_read ? "bg-primary/5" : ""}`}>
                <div className="flex items-start gap-2.5">
                  {!n.is_read ? (
                    <span className="h-2 w-2 rounded-full bg-rose-500 mt-1.5 shrink-0 shadow-xs ring-2 ring-rose-500/20" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/30 mt-1.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${!n.is_read ? "text-foreground" : "text-foreground/80"}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                        {n.body}
                      </p>
                    )}
                    <p className="text-[10px] font-medium text-muted-foreground/80 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            );

            return n.url ? (
              <Link key={n.id} to={n.url} onClick={() => { markRead(n.id); setOpen(false); }}>{inner}</Link>
            ) : (
              <div key={n.id} onClick={() => markRead(n.id)}>{inner}</div>
            );
          })}
        </div>

        {/* Footer Link to Management Page */}
        <div className="p-2.5 bg-muted/30 border-t border-border/60 text-center">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 rounded-xl gap-1.5"
            onClick={() => setOpen(false)}
          >
            <Link to="/dashboard/notifications">
              Manage All Notifications <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
