import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogOut, LayoutDashboard, Home, FileText, Info, Headphones, Calculator, User, Megaphone, Building2, Film, MessageCircle } from "lucide-react";
import SiteSearch from "@/components/SiteSearch";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NotificationBell from "@/components/NotificationBell";

import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";

const allNavLinks = [
  { to: "/", label: "Home", icon: Home, feature: null as null | string },
  { to: "/whatsapp-engine", label: "WhatsApp Engine", icon: MessageCircle, feature: "whatsapp_engine" },
  { to: "/create-video", label: "Create Video", icon: Film, feature: "video_creator" },
  { to: "/blog", label: "Blog", icon: FileText, feature: "blog" },
  { to: "/businesses", label: "Businesses", icon: Building2, feature: "businesses" },
  { to: "/tools/startup-calculator", label: "Calculator", icon: Calculator, feature: "tools" },
  { to: "/advertise", label: "Advertise", icon: Megaphone, feature: "advertise" },
  { to: "/about", label: "About", icon: Info, feature: null },
  { to: "/support", label: "Support", icon: Headphones, feature: null },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const { flags } = useFeatureFlags();
  const location = useLocation();
  const navLinks = allNavLinks.filter((l) => !l.feature || (flags as any)[l.feature]);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Bethelincovibe TV" className="h-10 w-10 rounded-lg object-contain" />
          <span className="text-lg font-bold text-primary hidden sm:inline">Bethelincovibe TV</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1.5">
          {navLinks.map((l) => {
            const isActive = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 py-2 text-sm font-bold rounded-xl transition-all duration-200 flex items-center gap-2 ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-xs"
                    : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span className={`p-1 rounded-lg bg-gradient-to-br from-primary to-accent text-white shadow-[0_2px_6px_-1px_rgba(0,0,0,0.25)] ring-1 ring-white/20 ${isActive ? "scale-105" : "opacity-90"}`}>
                  <l.icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                </span>
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          {flags.search && <SiteSearch />}
          <LanguageSwitcher />
          {user && <NotificationBell />}
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild className="font-bold text-sm">
                <Link to="/dashboard"><User className="h-4 w-4 mr-1 text-primary" />Dashboard</Link>
              </Button>
              {isAdmin && (
                <Button size="sm" asChild className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-extrabold shadow-sm border-0">
                  <Link to="/admin"><LayoutDashboard className="h-4 w-4 mr-1" />Admin</Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={signOut} className="font-semibold text-sm">
                <LogOut className="h-4 w-4 mr-1" />Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="font-bold text-sm"><Link to="/login">Login</Link></Button>
              {flags.register && <Button size="sm" asChild className="font-bold text-sm shadow-md"><Link to="/register">Register</Link></Button>}
            </>
          )}
        </div>

        {/* Mobile language + toggle */}
        <div className="flex items-center gap-1 lg:hidden">
          {user && <NotificationBell />}
          <LanguageSwitcher />
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {open && (
        <div className="lg:hidden border-t bg-background/98 backdrop-blur-xl shadow-2xl">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
            {navLinks.map((l) => {
              const isActive = location.pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={`px-3.5 py-3 rounded-2xl text-base font-bold flex items-center gap-3 transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20 shadow-xs"
                      : "text-foreground hover:bg-secondary/70"
                  }`}
                >
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-[0_4px_10px_-2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.4)] ring-1 ring-white/20 shrink-0">
                    <l.icon className="h-4 w-4" strokeWidth={2.2} />
                  </div>
                  {l.label}
                </Link>
              );
            })}
            <div className="border-t border-border/80 mt-2 pt-3 flex flex-col gap-2">
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setOpen(false)}
                    className="px-3.5 py-3 rounded-2xl text-base font-bold flex items-center gap-3 text-primary bg-primary/5 border border-primary/15"
                  >
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md">
                      <User className="h-5 w-5" />
                    </div>
                    My Dashboard
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="px-3.5 py-3 rounded-2xl text-base font-extrabold flex items-center gap-3 bg-amber-400 text-amber-950 shadow-md"
                    >
                      <div className="h-9 w-9 rounded-xl bg-amber-950/20 flex items-center justify-center text-amber-950">
                        <LayoutDashboard className="h-5 w-5" />
                      </div>
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => { signOut(); setOpen(false); }}
                    className="px-3.5 py-3 rounded-2xl text-base font-bold flex items-center gap-3 text-destructive hover:bg-destructive/10 text-left transition-colors"
                  >
                    <div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
                      <LogOut className="h-5 w-5" />
                    </div>
                    Logout
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button asChild variant="outline" className="h-11 font-bold text-sm rounded-xl"><Link to="/login" onClick={() => setOpen(false)}>Login</Link></Button>
                  {flags.register && <Button asChild className="h-11 font-bold text-sm rounded-xl shadow-md"><Link to="/register" onClick={() => setOpen(false)}>Register</Link></Button>}
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
