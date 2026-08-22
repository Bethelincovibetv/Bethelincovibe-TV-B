import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  FileText, Building2, FolderTree, Users, Mail, Bot, Megaphone, Tv, Rocket, BarChart3, Sparkles, Settings, Bell, Image as ImageIcon,
  TrendingUp, ArrowUpRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminDashboard() {
  const { user } = useAuth();

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
    { label: "Analytics", desc: "Post views, reads, engagement", icon: BarChart3, link: "/admin/blog-analytics" },
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
          <p className="text-xs text-muted-foreground">{greeting},</p>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight capitalize">{name} 👋</h1>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/60 px-3 py-1.5 rounded-full">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          Live data
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Link key={k.label} to={k.link}>
            <Card className={`relative overflow-hidden p-4 hover:shadow-lg transition-all active:scale-[0.98] border-border/60 bg-gradient-to-br ${k.tone}`}>
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-xl bg-background/70 backdrop-blur flex items-center justify-center shadow-sm">
                  <k.icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 opacity-40" />
              </div>
              <p className="mt-3 text-2xl md:text-3xl font-bold text-foreground">{k.value.toLocaleString()}</p>
              <p className="text-[11px] font-medium text-foreground/70 mt-0.5">{k.label}</p>
              {k.pulse && (
                <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick actions — app-style icon grid */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2.5">
          <h2 className="text-sm font-bold">Quick actions</h2>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Tap to open</span>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-3">
          {quickActions.map((a) => (
            <Link
              key={a.label}
              to={a.link}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-secondary/50 active:scale-95 transition-all"
            >
              <div className={`h-12 w-12 md:h-14 md:w-14 rounded-2xl ${a.tone} flex items-center justify-center shadow-sm`}>
                <a.icon className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <span className="text-[10px] md:text-[11px] font-medium text-center leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Manage list */}
      <div>
        <h2 className="text-sm font-bold px-1 mb-2.5">Manage</h2>
        <Card className="divide-y divide-border/60 overflow-hidden">
          {manageLinks.map((m) => (
            <Link
              key={m.label}
              to={m.link}
              className="flex items-center gap-3 p-4 hover:bg-secondary/40 active:bg-secondary/60 transition-colors"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <m.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{m.label}</p>
                <p className="text-xs text-muted-foreground truncate">{m.desc}</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </Card>
      </div>
    </div>
  );
}
