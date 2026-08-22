import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check } from "lucide-react";
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
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 text-[10px] rounded-full bg-rose-600 hover:bg-rose-600">
              {unread > 9 ? "9+" : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-[11px] text-primary hover:underline flex items-center gap-1">
              <Check className="h-3 w-3" />Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && <p className="text-xs text-muted-foreground p-4 text-center">No notifications yet</p>}
          {items.map((n) => {
            const inner = (
              <div className={`p-3 border-b last:border-0 hover:bg-muted/40 transition cursor-pointer ${!n.is_read ? "bg-primary/5" : ""}`}>
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">
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
      </PopoverContent>
    </Popover>
  );
}