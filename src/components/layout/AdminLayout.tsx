import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, Building2, FolderTree, ArrowLeft, Tv, Image as ImageIcon,
  Settings, Users, Mail, Bell, Bot, Sparkles, Code2, BarChart3, Menu, MoreHorizontal, Search, X, ToggleLeft, Megaphone, Music, GraduationCap, Rocket, ChevronLeft, ShoppingCart,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const allLinks = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true, group: "Overview" },
  { to: "/admin/ai-admin", label: "AI Administrator", icon: Bot, group: "Overview" },
  { to: "/admin/blog-analytics", label: "Analytics", icon: BarChart3, group: "Overview" },

  { to: "/admin/posts", label: "Posts", icon: FileText, group: "Content" },
  { to: "/admin/ai-blogger", label: "AI Blogger", icon: Bot, group: "Content" },
  { to: "/admin/guest-blogs", label: "Business Blogs", icon: Sparkles, group: "Content" },
  { to: "/admin/blog-categories", label: "Blog Categories", icon: FolderTree, group: "Content" },
  { to: "/admin/videos", label: "TV Videos", icon: Tv, group: "Content" },
  { to: "/admin/slides", label: "Slides", icon: ImageIcon, group: "Content" },
  { to: "/admin/jingles", label: "Background Jingles", icon: Music, group: "Content" },

  { to: "/admin/businesses", label: "Businesses", icon: Building2, group: "Directory" },
  { to: "/admin/directory-categories", label: "Directory Categories", icon: FolderTree, group: "Directory" },
  { to: "/admin/courses", label: "Learning Hub", icon: GraduationCap, group: "Directory" },
  { to: "/admin/sales-pages", label: "Sales Pages", icon: Rocket, group: "Directory" },
  { to: "/admin/sales-templates", label: "Sales Templates", icon: Rocket, group: "Directory" },

  { to: "/admin/users", label: "Users", icon: Users, group: "People" },
  { to: "/admin/leads", label: "All Leads", icon: Users, group: "People" },
  { to: "/admin/contacts", label: "Messages", icon: Mail, group: "People" },
  { to: "/admin/notifications", label: "Notifications", icon: Bell, group: "People" },

  { to: "/admin/ads", label: "Ad Network", icon: Megaphone, group: "System" },
  { to: "/admin/amazon", label: "Amazon Affiliate", icon: ShoppingCart, group: "System" },
  { to: "/admin/custom-code", label: "Custom Code", icon: Code2, group: "System" },
  { to: "/admin/features", label: "Feature Toggles", icon: ToggleLeft, group: "System" },
  { to: "/admin/settings", label: "Settings", icon: Settings, group: "System" },
];

// Bottom tab bar — primary 4 + More
const bottomTabs = [
  { to: "/admin", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/admin/posts", label: "Posts", icon: FileText },
  { to: "/admin/blog-analytics", label: "Stats", icon: BarChart3 },
  { to: "/admin/users", label: "Users", icon: Users },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const groups = useMemo(() => {
    const g: Record<string, typeof allLinks> = {};
    for (const l of allLinks) (g[l.group] ||= []).push(l);
    return g;
  }, []);

  return (
    <nav className="flex flex-col gap-4 p-3">
      {Object.entries(groups).map(([group, links]) => (
        <div key={group}>
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {group}
          </p>
          <div className="flex flex-col gap-0.5">
            {links.map((l) => {
              const active = l.end ? location.pathname === l.to : location.pathname.startsWith(l.to);
              return (
                <Link key={l.to} to={l.to} onClick={onNavigate}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start gap-2.5 h-10 rounded-xl transition-all",
                      active
                        ? "bg-gradient-to-r from-primary/15 via-primary/10 to-transparent text-primary font-semibold shadow-sm"
                        : "hover:bg-secondary/60",
                    )}
                  >
                    <l.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                    <span className="truncate">{l.label}</span>
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
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
      <aside className="hidden md:flex flex-col w-64 border-r bg-background/80 backdrop-blur sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 p-4 border-b bg-gradient-to-br from-primary/15 via-accent/10 to-transparent">
          <img src="/logo.png" alt="Admin" className="h-10 w-10 rounded-xl ring-2 ring-primary/30 shadow-sm" />
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight">Admin Console</p>
            <p className="text-[10px] text-muted-foreground truncate">Bethelincovibe TV</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto"><SidebarNav /></div>
        <div className="p-3 border-t">
          <Button variant="ghost" size="sm" asChild className="w-full justify-start gap-2">
            <Link to="/"><ArrowLeft className="h-4 w-4" />Back to Site</Link>
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile-app style top bar */}
        <header
          className="bg-background/85 backdrop-blur-xl border-b sticky top-0 z-40 flex items-center gap-2 px-3"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)", height: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}
        >
          {/* Mobile: back arrow on sub-pages, menu on root */}
          {isRootAdmin ? (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-10 w-10 shrink-0 rounded-full">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <div className="flex items-center gap-2.5 p-4 border-b shrink-0 bg-gradient-to-br from-primary/10 to-transparent">
                  <img src="/logo.png" alt="Admin" className="h-9 w-9 rounded-xl ring-2 ring-primary/30" />
                  <div>
                    <p className="font-bold text-sm">Admin Console</p>
                    <p className="text-[10px] text-muted-foreground">Bethelincovibe TV</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <SidebarNav onNavigate={() => setMobileOpen(false)} />
                </div>
                <div className="p-3 border-t shrink-0 bg-background">
                  <Button variant="ghost" size="sm" asChild className="w-full justify-start gap-2">
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
              className="md:hidden h-10 w-10 shrink-0 rounded-full active:scale-95 transition-transform"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}

          {/* Page title on mobile / search on desktop */}
          <div className="flex-1 min-w-0 md:hidden">
            {!searchOpen && (
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                  {currentLink?.group ?? "Admin"}
                </span>
                <span className="text-base font-bold truncate">
                  {currentLink?.label ?? "Admin"}
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
                  className="pl-8 pr-8 h-9 text-sm rounded-full bg-secondary/60 border-transparent focus-visible:bg-background"
                />
                <button onClick={closeSearch} className="absolute right-2 top-2.5" aria-label="Close search">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>

          {/* Desktop search */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sections, users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-8 h-9 text-sm rounded-full bg-secondary/50 border-transparent focus-visible:bg-background"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-2.5">
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
              className="md:hidden h-10 w-10 shrink-0 rounded-full"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </Button>
          )}

          <Link to="/admin/contacts" className="relative shrink-0">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
              <Bell className="h-5 w-5" />
              {unreadCount && unreadCount > 0 ? (
                <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center ring-2 ring-background">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </Button>
          </Link>

          {/* Search dropdown */}
          {(search.length >= 1) && (
            <div className="absolute left-2 right-2 md:left-14 md:right-auto md:w-[28rem] top-full mt-1 bg-popover border rounded-2xl shadow-2xl max-h-[70vh] overflow-y-auto z-50">
              {filteredLinks.length > 0 && (
                <div className="p-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1">Sections</p>
                  {filteredLinks.map((l) => (
                    <Link key={l.to} to={l.to} onClick={closeSearch}
                      className="flex items-center gap-2.5 px-2 py-2.5 rounded-lg hover:bg-secondary text-sm">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <l.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{l.label}</p>
                        <p className="text-[10px] text-muted-foreground">{l.group}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {userResults && userResults.length > 0 && (
                <div className="p-2 border-t">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1">Users</p>
                  {userResults.map((u: any) => (
                    <Link key={u.user_id} to="/admin/users" onClick={closeSearch}
                      className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-secondary text-sm">
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        : <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">{(u.display_name || u.email || "?")[0]?.toUpperCase()}</div>}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{u.display_name || u.username || u.email}</p>
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
          className="flex-1 p-3 md:p-6 max-w-full"
          style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <Outlet />
        </main>

        {/* Mobile bottom tab bar — pill/floating style */}
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
                      "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-all active:scale-95",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center h-8 w-10 rounded-xl transition-all",
                      active && "bg-primary/12",
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
                    "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-all active:scale-95",
                    moreOpen ? "text-primary" : "text-muted-foreground",
                  )}>
                    <div className={cn(
                      "flex items-center justify-center h-8 w-10 rounded-xl transition-all",
                      moreOpen && "bg-primary/12",
                    )}>
                      <MoreHorizontal className="h-5 w-5" />
                    </div>
                    More
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh] p-0 rounded-t-3xl flex flex-col border-0">
                  <div className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-muted-foreground/30 shrink-0" />
                  <div className="px-5 py-3 border-b shrink-0">
                    <p className="text-lg font-bold">All Sections</p>
                    <p className="text-xs text-muted-foreground">Jump to any admin area</p>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <SidebarNav onNavigate={() => setMoreOpen(false)} />
                  </div>
                  <div className="p-3 border-t shrink-0 bg-background" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
                    <Button variant="ghost" size="sm" asChild className="w-full justify-start gap-2">
                      <Link to="/" onClick={() => setMoreOpen(false)}><ArrowLeft className="h-4 w-4" />Back to Site</Link>
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
