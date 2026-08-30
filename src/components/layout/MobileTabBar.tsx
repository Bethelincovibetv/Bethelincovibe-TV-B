import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Home, Newspaper, Building2, LayoutDashboard, User, Users, ShoppingBag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";

const allTabs = [
  { to: "/", label: "Home", icon: Home, match: (p: string) => p === "/", feature: null as null | string },
  { to: "/products", label: "Shop", icon: ShoppingBag, match: (p: string) => p.startsWith("/products"), feature: "products" },
  { to: "/blog", label: "Blog", icon: Newspaper, match: (p: string) => p.startsWith("/blog"), feature: "blog" },
  { to: "/businesses", label: "Services", icon: Building2, match: (p: string) => p.startsWith("/businesses"), feature: "businesses" },
  { to: "/forum", label: "Community", icon: Users, match: (p: string) => p.startsWith("/forum"), feature: "forum" },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: (p: string) => p.startsWith("/dashboard"), feature: null, requiresAuth: true as const },
];

/** Ultra-responsive mobile bottom bar: hides immediately on scroll down, slides back in immediately on scroll up. */
function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY.current;
        if (y < 40) {
          setHidden(false);
        } else if (delta > 3) {
          // Immediately hide when user drags down
          setHidden(true);
        } else if (delta < -3) {
          // Immediately reveal when user drags up
          setHidden(false);
        }
        if (Math.abs(delta) > 2) lastY.current = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return hidden;
}

export default function MobileTabBar() {
  const loc = useLocation();
  const { user } = useAuth();
  const { flags } = useFeatureFlags();
  const hidden = useHideOnScroll();
  if (loc.pathname.startsWith("/admin")) return null;

  const tabs = allTabs.filter((t) => {
    if (t.requiresAuth && !user) return false;
    if (t.feature && !(flags as any)[t.feature]) return false;
    return true;
  });
  const items = [
    ...tabs,
    user
      ? { to: "/u/me", label: "Profile", icon: User, match: (p: string) => p.startsWith("/u/") }
      : { to: "/login", label: "Sign in", icon: User, match: (p: string) => p === "/login" || p === "/register" },
  ];

  return (
    <nav
      className={`md:hidden fixed bottom-0 inset-x-0 z-40 px-3 transition-transform duration-200 ease-out will-change-transform ${
        hidden ? "translate-y-[140%]" : "translate-y-0"
      }`}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
      aria-label="Primary"
    >
      <div className="rounded-3xl border border-border/80 glass-surface shadow-[0_12px_40px_rgba(0,0,0,0.18)] ring-1 ring-white/10">
        <div
          className="grid px-1.5 py-2"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((t) => {
            const active = t.match(loc.pathname);
            return (
              <Link
                key={t.to}
                to={t.to}
                aria-current={active ? "page" : undefined}
                className={`tap flex flex-col items-center justify-center gap-1 rounded-2xl py-1 text-[10px] font-bold transition-all duration-200 active:scale-90 ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`relative flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300 ${
                    active
                      ? "icon-3d scale-105"
                      : "bg-gradient-to-br from-muted/80 to-muted/40 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                  }`}
                >
                  <t.icon className="h-5 w-5 drop-shadow-xs" strokeWidth={active ? 2.3 : 2} />
                </span>
                <span className="leading-none tracking-tight">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
