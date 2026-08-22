import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogOut, LayoutDashboard, Home, FileText, Info, Mail, Calculator, User, Megaphone, Building2 } from "lucide-react";
import SiteSearch from "@/components/SiteSearch";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NotificationBell from "@/components/NotificationBell";

import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";

const allNavLinks = [
  { to: "/", label: "Home", icon: Home, feature: null as null | string },
  { to: "/blog", label: "Blog", icon: FileText, feature: "blog" },
  { to: "/businesses", label: "Businesses", icon: Building2, feature: "businesses" },
  { to: "/tools/startup-calculator", label: "Calculator", icon: Calculator, feature: "tools" },
  { to: "/advertise", label: "Advertise", icon: Megaphone, feature: "advertise" },
  { to: "/about", label: "About", icon: Info, feature: null },
  { to: "/contact", label: "Contact", icon: Mail, feature: null },
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
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-2 text-sm rounded-md transition-colors hover:bg-secondary flex items-center gap-1.5 ${
                location.pathname === l.to ? "bg-secondary text-primary font-medium" : "text-muted-foreground"
              }`}
            >
              <l.icon className="h-3.5 w-3.5" />
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          {flags.search && <SiteSearch />}
          <LanguageSwitcher />
          {user && <NotificationBell />}
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard"><User className="h-4 w-4 mr-1" />Dashboard</Link>
              </Button>
              {isAdmin && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin"><LayoutDashboard className="h-4 w-4 mr-1" />Admin</Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-1" />Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild><Link to="/login">Login</Link></Button>
              {flags.register && <Button size="sm" asChild><Link to="/register">Register</Link></Button>}
            </>
          )}
        </div>

        {/* Mobile language + toggle */}
        <div className="flex items-center gap-1 lg:hidden">
          {user && <NotificationBell />}
          <LanguageSwitcher />
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="lg:hidden border-t bg-background">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={`px-3 py-3 rounded-md text-sm flex items-center gap-2 ${
                  location.pathname === l.to ? "bg-secondary text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </Link>
            ))}
            <div className="border-t mt-2 pt-2 flex flex-col gap-1">
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setOpen(false)} className="px-3 py-3 rounded-md text-sm flex items-center gap-2 text-primary font-medium">
                    <User className="h-4 w-4" />My Dashboard
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setOpen(false)} className="px-3 py-3 rounded-md text-sm flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />Admin Panel
                    </Link>
                  )}
                  <button onClick={() => { signOut(); setOpen(false); }} className="px-3 py-3 rounded-md text-sm flex items-center gap-2 text-left">
                    <LogOut className="h-4 w-4" />Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)} className="px-3 py-3 rounded-md text-sm">Login</Link>
                  {flags.register && <Link to="/register" onClick={() => setOpen(false)} className="px-3 py-3 rounded-md text-sm text-primary font-medium">Register</Link>}
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
