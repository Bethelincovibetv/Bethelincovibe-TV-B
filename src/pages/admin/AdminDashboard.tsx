import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Building2, FolderTree, Users, Mail, Bot, Megaphone, Tv, Rocket, BarChart3, Sparkles, Settings, Bell, Image as ImageIcon,
  TrendingUp, ArrowUpRight, Cpu, Radio, ShieldCheck, Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SPECIALIZED_AI_AGENTS, loadPlatformAlerts, loadAgentTasks } from "@/lib/executiveAdminAIEngine";

export default function AdminDashboard() {
  const { user } = useAuth();
  const alerts = loadPlatformAlerts();
  const tasks = loadAgentTasks();
  const pendingTasks = tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length;

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [posts, businesses, categories, users, contacts] = await Promise.all([
        supabase.from("blog_posts").select("id", { count: "exact", head: true }),
        supabase.from("suppliers").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("contact_submissions").select("id", { count: "exact", head: true }).eq("read", false),
      ]);
      return {
        posts: posts.count ?? 0,
        businesses: businesses.count ?? 0,
        categories: categories.count ?? 0,
        users: users.count ?? 0,
        unreadContacts: contacts.count ?? 0,
      };
    },
  });

  const kpis = [
    { label: "Blog Posts", value: stats?.posts ?? 0, icon: FileText, link: "/admin/posts", tone: "from-violet-500/20 to-fuchsia-500/10 text-violet-600" },
    { label: "Businesses", value: stats?.businesses ?? 0, icon: Building2, link: "/admin/businesses", tone: "from-blue-500/20 to-cyan-500/10 text-blue-600" },
    { label: "Users", value: stats?.users ?? 0, icon: Users, link: "/admin/users", tone: "from-emerald-500/20 to-teal-500/10 text-emerald-600" },
    { label: "Unread", value: stats?.unreadContacts ?? 0, icon: Mail, link: "/admin/contacts", tone: "from-rose-500/20 to-pink-500/10 text-rose-600", pulse: (stats?.unreadContacts ?? 0) > 0 },
  ];

  const quickActions = [
    { label: "New Post", icon: FileText, link: "/admin/posts", tone: "bg-primary/10 text-primary" },
    { label: "AI Blogger", icon: Bot, link: "/admin/ai-blogger", tone: "bg-fuchsia-500/10 text-fuchsia-600" },
    { label: "Business Blogs", icon: Sparkles, link: "/admin/guest-blogs", tone: "bg-amber-500/10 text-amber-600" },
    { label: "TV Videos", icon: Tv, link: "/admin/videos", tone: "bg-blue-500/10 text-blue-600" },
    { label: "Slides", icon: ImageIcon, link: "/admin/slides", tone: "bg-cyan-500/10 text-cyan-600" },
    { label: "Ads", icon: Megaphone, link: "/admin/ads", tone: "bg-rose-500/10 text-rose-600" },
    { label: "Sales Pages", icon: Rocket, link: "/admin/sales-pages", tone: "bg-emerald-500/10 text-emerald-600" },
    { label: "Notify", icon: Bell, link: "/admin/notifications", tone: "bg-orange-500/10 text-orange-600" },
  ];

  const manageLinks = [
    { label: "Platform Analytics", desc: "Direct visits, top products, businesses & blogs", icon: BarChart3, link: "/admin/analytics" },
    { label: "Categories", desc: "Blog & directory taxonomy", icon: FolderTree, link: "/admin/blog-categories" },
    { label: "Messages", desc: `${stats?.unreadContacts ?? 0} unread inquiries`, icon: Mail, link: "/admin/contacts" },
    { label: "Settings", desc: "Site config, integrations, keys", icon: Settings, link: "/admin/settings" },
  ];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const name = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Admin";

  return (
    <div className="space-y-5 md:space-y-6 max-w-6xl mx-auto">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">{greeting},</p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight capitalize text-foreground">{name} 👋</h1>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-xs font-bold text-foreground/80 bg-secondary/80 px-3.5 py-1.5 rounded-full border border-border/60 shadow-xs">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          Live data • Active
        </div>
      </div>

      {/* Executive Admin AI Command Center Feature Card */}
      <Card className="p-4 sm:p-5 md:p-6 rounded-3xl border-2 border-primary/30 bg-gradient-to-r from-primary/15 via-indigo-600/10 to-purple-600/15 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary via-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md ring-2 ring-white/30">
              <Bot className="h-7 w-7" strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-foreground">
                  Executive Admin AI Command Center
                </h2>
                <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 text-xs font-black px-2.5 py-0.5 rounded-full">
                  Central Coordinator Active
                </Badge>
              </div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                Real-time strategic oversight of 11 Specialized AI Agents across Lagos &amp; Nigeria. Journey: Discover → Learn → Promote → Connect → Sell → Grow.
              </p>
              <div className="flex items-center gap-3.5 mt-2.5 text-xs font-bold text-foreground/90 flex-wrap">
                <span className="flex items-center gap-1.5 bg-background/80 px-2.5 py-1 rounded-xl border border-border/60">
                  <Cpu className="h-4 w-4 text-primary" />
                  <strong>11</strong> Specialized Agents Ready
                </span>
                <span className="flex items-center gap-1.5 bg-background/80 px-2.5 py-1 rounded-xl border border-border/60">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Health Score: <strong className="text-emerald-600 font-black">94/100</strong>
                </span>
                {pendingTasks > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/30">
                    <Zap className="h-4 w-4" />
                    {pendingTasks} Active Directives
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <Button size="lg" asChild className="h-11 sm:h-12 px-5 sm:px-6 font-black text-sm rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md gap-2">
              <Link to="/admin/ai">
                <Cpu className="h-5 w-5" />
                Launch Command Center
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {kpis.map((k) => (
          <Link key={k.label} to={k.link}>
            <Card className={`relative overflow-hidden p-4 sm:p-5 rounded-2xl hover:shadow-lg transition-all active:scale-[0.98] border-border/60 bg-gradient-to-br ${k.tone}`}>
              <div className="flex items-start justify-between">
                <div className="h-11 w-11 rounded-2xl bg-background/80 backdrop-blur flex items-center justify-center shadow-sm">
                  <k.icon className="h-6 w-6" />
                </div>
                <ArrowUpRight className="h-5 w-5 opacity-40" />
              </div>
              <p className="mt-3.5 text-2xl sm:text-3xl md:text-4xl font-black text-foreground">{k.value.toLocaleString()}</p>
              <p className="text-xs sm:text-sm font-bold text-foreground/80 mt-0.5">{k.label}</p>
              {k.pulse && (
                <span className="absolute top-3.5 right-3.5 h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
              )}
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick actions — app-style icon grid */}
      <div>
        <div className="flex items-center justify-between px-1 mb-3">
          <h2 className="text-base sm:text-lg font-black text-foreground">Admin Quick Actions</h2>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tap to open</span>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-3">
          {quickActions.map((a) => (
            <Link
              key={a.label}
              to={a.link}
              className="flex flex-col items-center gap-2 p-2.5 rounded-2xl hover:bg-secondary/60 active:scale-95 transition-all"
            >
              <div className={`h-12 w-12 md:h-14 md:w-14 rounded-2xl ${a.tone} flex items-center justify-center shadow-sm`}>
                <a.icon className="h-6 w-6 md:h-7 md:w-7" />
              </div>
              <span className="text-xs md:text-sm font-bold text-center leading-tight text-foreground">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Manage list */}
      <div>
        <h2 className="text-base sm:text-lg font-black text-foreground px-1 mb-3">Admin Management</h2>
        <Card className="divide-y divide-border/60 overflow-hidden rounded-2xl">
          {manageLinks.map((m) => (
            <Link
              key={m.label}
              to={m.link}
              className="flex items-center gap-3.5 p-4 sm:p-5 hover:bg-secondary/40 active:bg-secondary/60 transition-colors"
            >
              <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <m.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-foreground">{m.label}</p>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">{m.desc}</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          ))}
        </Card>
      </div>
    </div>
  );
}
