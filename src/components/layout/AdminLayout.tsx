import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, Building2, FolderTree, ArrowLeft, Tv, Image as ImageIcon,
  Settings, Users, Mail, Bell, Bot, Sparkles, Code2, BarChart3, Menu, MoreHorizontal, Search, X, ToggleLeft, Megaphone, Music, GraduationCap, Rocket, ChevronLeft, ShoppingCart, Send, Server, MessageSquare, ShieldCheck, Package, Coins,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";

const allLinks = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true, group: "Overview", feature: null as string | null },
  { to: "/admin/ai", label: "AI Administrator", icon: Bot, group: "Overview", feature: "ai_admin" },
  { to: "/admin/analytics", label: "Platform Analytics", icon: BarChart3, group: "Overview", feature: null },

  { to: "/admin/posts", label: "Posts", icon: FileText, group: "Content", feature: "blog" },
  { to: "/admin/ai-blogger", label: "AI Blogger", icon: Bot, group: "Content", feature: "ai_blogger" },
  { to: "/admin/guest-blogs", label: "Business Blogs", icon: Sparkles, group: "Content", feature: "guest_blog" },
  { to: "/admin/blog-categories", label: "Blog Categories", icon: FolderTree, group: "Content", feature: "blog" },
  { to: "/admin/videos", label: "TV Videos", icon: Tv, group: "Content", feature: "tv_videos" },
  { to: "/admin/video-creator", label: "AI Video Studio", icon: Sparkles, group: "Content", feature: "video_creator" },
  { to: "/admin/slides", label: "Slides", icon: ImageIcon, group: "Content", feature: "hero_slider" },
  { to: "/admin/jingles", label: "Background Jingles", icon: Music, group: "Content", feature: null },

  { to: "/admin/businesses", label: "Business Hub", icon: Building2, group: "Directory", feature: "businesses" },
  { to: "/admin/community-verification", label: "WhatsApp Communities", icon: ShieldCheck, group: "Directory", feature: null },
  { to: "/admin/verification", label: "Verification (Blue Tick)", icon: ShieldCheck, group: "Directory", feature: "businesses" },
  { to: "/admin/featured", label: "Featured Promos", icon: Sparkles, group: "Directory", feature: "businesses" },
  { to: "/admin/featured-products", label: "Marketplace Products", icon: Package, group: "Directory", feature: "businesses" },
  { to: "/admin/whatsapp-engine", label: "WhatsApp Engine", icon: MessageSquare, group: "Directory", feature: "whatsapp_engine" },
  { to: "/admin/directory-categories", label: "Directory Categories", icon: FolderTree, group: "Directory", feature: "businesses" },
  { to: "/admin/courses", label: "Learning Hub", icon: GraduationCap, group: "Directory", feature: "learn" },
  { to: "/admin/sales-pages", label: "Sales Pages", icon: Rocket, group: "Directory", feature: "sales_pages" },
  { to: "/admin/sales-templates", label: "Sales Templates", icon: Rocket, group: "Directory", feature: "sales_pages" },

  { to: "/admin/users", label: "Users", icon: Users, group: "People", feature: null },
  { to: "/admin/broadcast", label: "Broadcast Email", icon: Send, group: "People", feature: null },
  { to: "/admin/email-settings", label: "Email Providers", icon: Server, group: "People", feature: null },
  { to: "/admin/leads", label: "All Leads", icon: Users, group: "People", feature: null },
  { to: "/admin/contacts", label: "Messages", icon: Mail, group: "People", feature: null },
  { to: "/admin/notifications", label: "Notifications", icon: Bell, group: "People", feature: null },

  { to: "/admin/pricing", label: "Feature Pricing (₦)", icon: Coins, group: "System", feature: null },
  { to: "/admin/ads", label: "Ad Network", icon: Megaphone, group: "System", feature: "advertise" },
  { to: "/admin/amazon", label: "Amazon Affiliate", icon: ShoppingCart, group: "System", feature: "amazon_affiliate" },
  { to: "/admin/custom-code", label: "Custom Code", icon: Code2, group: "System", feature: null },
  { to: "/admin/features", label: "Feature Toggles", icon: ToggleLeft, group: "System", feature: null },
  { to: "/admin/settings", label: "Settings", icon: Settings, group: "System", feature: null },
];

// Bottom tab bar — primary 4 + More
const bottomTabs = [
  { to: "/admin", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/admin/posts", label: "Posts", icon: FileText },
  { to: "/admin/analytics", label: "Stats", icon: BarChart3 },
  { to: "/admin/users", label: "Users", icon: Users },
];

const groupGradients: Record<string, string> = {
  Overview: "from-blue-500 via-indigo-500 to-purple-600",
  Content: "from-purple-500 via-fuchsia-500 to-pink-600",
  Directory: "from-amber-500 via-orange-500 to-rose-600",
  People: "from-emerald-500 via-teal-500 to-cyan-600",
  System: "from-slate-700 via-zinc-800 to-slate-900",
};

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { flags } = useFeatureFlags();
  const visibleLinks = useMemo(() => {
    return allLinks.filter((l) => !l.feature || (flags as any)[l.feature]);
  }, [flags]);

  const groups = useMemo(() => {
    const g: Record<string, typeof allLinks> = {};
    for (const l of visibleLinks) (g[l.group] ||= []).push(l);
    return g;
  }, [visibleLinks]);

  return (
    <nav className="flex flex-col gap-5 p-3.5">
      {Object.entries(groups).map(([group, links]) => (
        <div key={group}>
          <p className="px-3 pb-2 text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {group}
          </p>
          <div className="flex flex-col gap-1.5">
            {links.map((l) => {
              const isAiAdmin = (l.to === "/admin/ai" || l.to === "/admin/ai-admin" || l.to === "/admin/executive-ai") && 
                (location.pathname === "/admin/ai" || location.pathname === "/admin/ai-admin" || location.pathname === "/admin/executive-ai");
              const active = l.end ? location.pathname === l.to : (isAiAdmin || location.pathname.startsWith(l.to));
              const gradient = groupGradients[l.group] || "from-primary to-accent";
              return (
                <Link key={l.to} to={l.to} onClick={onNavigate} className="group block">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start gap-3 h-12 px-3 rounded-2xl transition-all duration-200",
                      active
                        ? "bg-primary/15 border-2 border-primary/30 text-primary font-black shadow-sm"
                        : "hover:bg-secondary/80 hover:shadow-xs",
                    )}
                  >
                    {/* 3D Elevated Icon Badge */}
                    <div
                      className={cn(
                        "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white",
                        "shadow-[0_4px_12px_-2px_rgba(0,0,0,0.38),inset_0_1.5px_0_rgba(255,255,255,0.45)] ring-1 ring-white/25",
                        "transition-transform group-hover:scale-110 duration-200",
                        gradient
                      )}
                    >
                      <l.icon className="h-5 w-5 drop-shadow-sm" strokeWidth={2.4} />
                    </div>

                    <span className={cn("truncate font-bold text-sm sm:text-base leading-tight", active ? "text-primary font-black" : "text-foreground")}>
                      {l.label}
                    </span>

                    {active && <span className="ml-auto h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isExecutivePage = 
    location.pathname === "/admin/ai" || 
    location.pathname.startsWith("/admin/ai") || 
    location.pathname.startsWith("/admin/platform-ai") || 
    location.pathname.startsWith("/admin/executive-ai") ||
    location.pathname.startsWith("/admin/executive");

  const currentLink = allLinks.find((l) =>
    l.end ? location.pathname === l.to : location.pathname.startsWith(l.to),
  );
  const isRootAdmin = location.pathname === "/admin";

  const { data: unreadCount } = useQuery({
    queryKey: ["unread-contacts"],
    queryFn: async () => {
      const { count } = await supabase.from("contact_submissions").select("id", { count: "exact", head: true }).eq("read", false);
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  const { data: userResults } = useQuery({
    queryKey: ["admin-search-users", search],
    queryFn: async () => {
      if (search.length < 2) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, email, username, avatar_url")
        .or(`display_name.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%`)
        .limit(5);
      return data ?? [];
    },
    enabled: search.length >= 2,
  });

  const filteredLinks = search.length > 0
    ? allLinks.filter((l) => l.label.toLowerCase().includes(search.toLowerCase()))
    : [];

  const closeSearch = () => { setSearch(""); setSearchOpen(false); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/40 via-background to-muted/30 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 border-r bg-background/80 backdrop-blur sticky top-0 h-screen">
        <div className="flex items-center gap-3 p-4 border-b bg-gradient-to-br from-primary/15 via-accent/10 to-transparent">
          <img src="/logo.png" alt="Admin" className="h-11 w-11 rounded-2xl ring-2 ring-primary/40 shadow-md object-contain" />
          <div className="min-w-0">
            <p className="font-black text-lg leading-tight text-foreground">Admin Console</p>
            <p className="text-xs font-bold text-muted-foreground truncate">Bethelincovibe TV • Management</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto"><SidebarNav /></div>
        <div className="p-3.5 border-t bg-card/50">
          <Button variant="ghost" size="sm" asChild className="w-full justify-start gap-2.5 h-11 text-sm font-black rounded-xl">
            <Link to="/"><ArrowLeft className="h-4 w-4 text-primary" />Back to Site</Link>
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile-app style top bar */}
        <header
          className="bg-background/90 backdrop-blur-xl border-b sticky top-0 z-40 flex items-center gap-2 px-3 sm:px-4"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)", height: "calc(3.75rem + env(safe-area-inset-top, 0px))" }}
        >
          {/* Mobile: back arrow on sub-pages, menu on root */}
          {isRootAdmin ? (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-11 w-11 shrink-0 rounded-2xl hover:bg-secondary">
                  <Menu className="h-6 w-6 text-foreground" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <div className="flex items-center gap-2.5 p-4 border-b shrink-0 bg-gradient-to-br from-primary/15 via-accent/10 to-transparent">
                  <img src="/logo.png" alt="Admin" className="h-10 w-10 rounded-xl ring-2 ring-primary/30" />
                  <div>
                    <p className="font-black text-base text-foreground">Admin Console</p>
                    <p className="text-xs font-semibold text-muted-foreground">Bethelincovibe TV</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <SidebarNav onNavigate={() => setMobileOpen(false)} />
                </div>
                <div className="p-3.5 border-t shrink-0 bg-background" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
                  <Button variant="ghost" size="sm" asChild className="w-full justify-start gap-2 h-11 font-bold">
                    <Link to="/" onClick={() => setMobileOpen(false)}><ArrowLeft className="h-4 w-4" />Back to Site</Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="md:hidden h-11 w-11 shrink-0 rounded-2xl active:scale-95 transition-transform hover:bg-secondary"
              aria-label="Back"
            >
              <ChevronLeft className="h-6 w-6 text-foreground" />
            </Button>
          )}

          {/* Page title on mobile / search on desktop */}
          <div className="flex-1 min-w-0 md:hidden">
            {!searchOpen && (
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] text-primary font-black uppercase tracking-wider">
                  {currentLink?.group ?? "Admin Management"}
                </span>
                <span className="text-base sm:text-lg font-black tracking-tight text-foreground truncate">
                  {currentLink?.label ?? "Admin Management"}
                </span>
              </div>
            )}
            {searchOpen && (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Search sections, users…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-8 h-10 text-sm font-medium rounded-full bg-secondary/60 border-transparent focus-visible:bg-background"
                />
                <button onClick={closeSearch} className="absolute right-2.5 top-3" aria-label="Close search">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>

          {/* Desktop search */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search admin sections, users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 h-10 text-sm font-medium rounded-full bg-secondary/50 border-transparent focus-visible:bg-background"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-3">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Mobile search toggle */}
          {!searchOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              className="md:hidden h-10 w-10 shrink-0 rounded-2xl"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </Button>
          )}

          <Link to="/admin/contacts" className="relative shrink-0 group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300/35 via-amber-500/20 to-orange-600/30 border border-amber-300/60 shadow-[0_4px_12px_rgba(245,158,11,0.25),inset_0_1px_1px_rgba(255,255,255,0.7)] group-hover:scale-110 group-active:scale-95 transition-all duration-300">
              <Bell className="h-5 w-5 text-amber-500 fill-amber-400 drop-shadow-[0_2px_4px_rgba(180,83,9,0.5)]" />
              {unreadCount && unreadCount > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] px-1 items-center justify-center text-[10px] font-black text-white rounded-full bg-gradient-to-b from-rose-400 via-rose-600 to-red-800 border border-white/80 shadow-[0_3px_8px_rgba(225,29,72,0.6),inset_0_1px_1px_rgba(255,255,255,0.85)] animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </div>
          </Link>

          {/* Search dropdown */}
          {(search.length >= 1) && (
            <div className="absolute left-2 right-2 md:left-14 md:right-auto md:w-[28rem] top-full mt-1 bg-popover border rounded-2xl shadow-2xl max-h-[70vh] overflow-y-auto z-50">
              {filteredLinks.length > 0 && (
                <div className="p-2">
                  <p className="text-xs font-black text-muted-foreground uppercase px-2 py-1">Sections</p>
                  {filteredLinks.map((l) => (
                    <Link key={l.to} to={l.to} onClick={closeSearch}
                      className="flex items-center gap-2.5 px-2 py-2.5 rounded-xl hover:bg-secondary text-sm font-bold">
                      <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                        <l.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold truncate text-foreground">{l.label}</p>
                        <p className="text-[11px] text-muted-foreground font-medium">{l.group}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {userResults && userResults.length > 0 && (
                <div className="p-2 border-t">
                  <p className="text-xs font-black text-muted-foreground uppercase px-2 py-1">Users</p>
                  {userResults.map((u: any) => (
                    <Link key={u.user_id} to="/admin/users" onClick={closeSearch}
                      className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-secondary text-sm">
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        : <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">{(u.display_name || u.email || "?")[0]?.toUpperCase()}</div>}
                      <div className="min-w-0">
                        <p className="truncate font-bold text-foreground">{u.display_name || u.username || u.email}</p>
                        {u.email && <p className="truncate text-[11px] text-muted-foreground">{u.email}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {filteredLinks.length === 0 && (!userResults || userResults.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-6">No matches for "{search}"</p>
              )}
            </div>
          )}
        </header>

        <main
          className={cn(
            "flex-1 max-w-full min-w-0",
            isExecutivePage
              ? "p-1.5 sm:p-2.5 md:p-4 flex flex-col min-h-0 pb-1 sm:pb-2"
              : "p-3 sm:p-4 md:p-6"
          )}
          style={{
            paddingBottom: isExecutivePage
              ? "calc(0.5rem + env(safe-area-inset-bottom, 0px))"
              : "calc(6rem + env(safe-area-inset-bottom, 0px))"
          }}
        >
          <Outlet />
        </main>

        {/* Mobile bottom tab bar — pill/floating style (completely hidden on Executive AI Admin page to maximize screen space) */}
        {!isExecutivePage && (
          <nav
            className="md:hidden fixed bottom-0 inset-x-0 z-50 pointer-events-none"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <div className="mx-3 mb-3 pointer-events-auto">
              <div className="bg-background/90 backdrop-blur-xl border border-border/60 rounded-2xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.25)] grid grid-cols-5 h-16 overflow-hidden">
                {bottomTabs.map((t) => {
                  const active = t.end ? location.pathname === t.to : location.pathname.startsWith(t.to);
                  return (
                    <NavLink
                      key={t.to}
                      to={t.to}
                      className={cn(
                        "flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-all active:scale-95",
                        active ? "text-primary font-black" : "text-muted-foreground",
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center h-8 w-10 rounded-xl transition-all",
                        active && "bg-primary/15",
                      )}>
                        <t.icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
                      </div>
                      {t.label}
                    </NavLink>
                  );
                })}
                <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
                  <SheetTrigger asChild>
                    <button className={cn(
                      "flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-all active:scale-95",
                      moreOpen ? "text-primary font-black" : "text-muted-foreground",
                    )}>
                      <div className={cn(
                        "flex items-center justify-center h-8 w-10 rounded-xl transition-all",
                        moreOpen && "bg-primary/15",
                      )}>
                        <MoreHorizontal className="h-5 w-5" />
                      </div>
                      More
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[80vh] p-0 rounded-t-3xl flex flex-col border-0">
                    <div className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-muted-foreground/30 shrink-0" />
                    <div className="px-5 py-3 border-b shrink-0">
                      <p className="text-xl font-black text-foreground">Admin Management</p>
                      <p className="text-xs font-semibold text-muted-foreground">Jump to any admin console section</p>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <SidebarNav onNavigate={() => setMoreOpen(false)} />
                    </div>
                    <div className="p-3.5 border-t shrink-0 bg-background" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
                      <Button variant="ghost" size="sm" asChild className="w-full justify-start gap-2 h-11 font-bold">
                        <Link to="/" onClick={() => setMoreOpen(false)}><ArrowLeft className="h-4 w-4" />Back to Site</Link>
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
