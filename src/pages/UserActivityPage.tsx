import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Activity,
  Mail,
  Bell,
  MessageCircle,
  Sparkles,
  ShoppingBag,
  Clock,
  ArrowRight,
  Search,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Wallet,
} from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function UserActivityPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "lead" | "notification" | "forum" | "submission" | "wallet">("all");
  const [activities, setActivities] = useState<any[]>([]);

  const fetchActivities = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [
        { data: leads },
        { data: notifications },
        { data: forumPosts },
        { data: subs },
        { data: txs },
      ] = await Promise.all([
        supabase.from("sales_page_leads").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("user_notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("forum_posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("guest_blog_submissions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(20),
      ]);

      const feed: any[] = [];

      (leads || []).forEach((lead) => {
        feed.push({
          id: `lead-${lead.id}`,
          type: "lead",
          title: `New lead from ${lead.name || "a buyer"}`,
          subtitle: lead.notes || lead.email || lead.phone || "Interested in your listed products/services",
          time: lead.created_at,
          icon: Mail,
          color: "text-rose-500 bg-rose-500/10",
          link: "/dashboard/leads",
        });
      });

      (notifications || []).forEach((notif) => {
        feed.push({
          id: `notif-${notif.id}`,
          type: "notification",
          title: notif.title || "System Notification",
          subtitle: notif.body,
          time: notif.created_at,
          icon: Bell,
          color: "text-amber-500 bg-amber-500/10",
          link: notif.url || "/dashboard/notifications",
        });
      });

      (forumPosts || []).forEach((fp) => {
        feed.push({
          id: `forum-${fp.id}`,
          type: "forum",
          title: `Community Forum Discussion: "${fp.title}"`,
          subtitle: fp.category || "General Discussion",
          time: fp.created_at,
          icon: MessageCircle,
          color: "text-teal-500 bg-teal-500/10",
          link: `/forum/${fp.id}`,
        });
      });

      (subs || []).forEach((sub: any) => {
        feed.push({
          id: `sub-${sub.id}`,
          type: "submission",
          title: `Directory Listing: "${sub.business_name}"`,
          subtitle: `Status: ${sub.status}`,
          time: sub.created_at,
          icon: Sparkles,
          color: "text-indigo-500 bg-indigo-500/10",
          link: "/dashboard/submit-blog",
        });
      });

      (txs || []).forEach((tx: any) => {
        feed.push({
          id: `tx-${tx.id}`,
          type: "wallet",
          title: `Wallet ${tx.type === "credit" ? "Credit" : "Debit"}: ₦${Number(tx.amount || 0).toLocaleString()}`,
          subtitle: tx.description || "Wallet transaction",
          time: tx.created_at,
          icon: Wallet,
          color: "text-emerald-500 bg-emerald-500/10",
          link: "/dashboard/wallet",
        });
      });

      feed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivities(feed);
    } catch (err) {
      console.error("Failed to load user activities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [user]);

  const filtered = activities.filter((a) => {
    const matchesFilter = filterType === "all" || a.type === filterType;
    const matchesSearch =
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.subtitle?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6 animate-fade-in">
      <Helmet>
        <title>Live Activity &amp; Audit Logs | Bethelincovibe TV</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Activity Logs" },
            ]}
          />
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground flex items-center gap-2.5 mt-2">
            <Activity className="h-8 w-8 text-emerald-500" />
            Live Activity &amp; Inquiries Feed
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Real-time audit log of customer inquiries, wallet transactions, notifications, and marketplace interactions.
          </p>
        </div>

        <Button
          onClick={fetchActivities}
          variant="outline"
          className="rounded-2xl font-black gap-2 border-2 border-border/80"
        >
          <RefreshCw className="h-4 w-4 text-primary" />
          Refresh Feed
        </Button>
      </div>

      {/* Filter and Search Controls */}
      <Card className="rounded-3xl border-2 border-border/80 shadow-xs bg-card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter activities by keyword or sender..."
              className="pl-10 h-11 rounded-2xl border-2 font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                filterType === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({activities.length})
            </button>
            <button
              onClick={() => setFilterType("lead")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                filterType === "lead"
                  ? "bg-rose-500 text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Leads
            </button>
            <button
              onClick={() => setFilterType("notification")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                filterType === "notification"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Alerts
            </button>
            <button
              onClick={() => setFilterType("wallet")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                filterType === "wallet"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Wallet
            </button>
            <button
              onClick={() => setFilterType("forum")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                filterType === "forum"
                  ? "bg-teal-500 text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Forum
            </button>
          </div>
        </div>
      </Card>

      {/* Activity Timeline List */}
      <Card className="rounded-3xl border-2 border-border/80 shadow-md bg-card overflow-hidden">
        <CardHeader className="p-5 border-b border-border/60">
          <CardTitle className="text-base font-black text-foreground">
            Activity Timeline ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border/60">
          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Loading recent activity feed...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
              <Activity className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="font-bold text-foreground">No matching activities found.</p>
              <p className="text-xs">Your new leads and platform interactions will appear here automatically.</p>
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.link}
                  className="flex items-center justify-between p-4 sm:p-5 hover:bg-muted/40 transition-colors group"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`p-2.5 rounded-2xl shrink-0 ${item.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-black text-foreground group-hover:text-primary transition-colors truncate">
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground font-medium line-clamp-1">
                          {item.subtitle}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1 pt-0.5">
                        <Clock className="h-3 w-3" />
                        {new Date(item.time).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-3">
                    <Badge variant="outline" className="text-[10px] uppercase font-black">
                      {item.type}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
