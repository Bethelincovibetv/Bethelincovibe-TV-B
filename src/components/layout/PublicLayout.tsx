import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer, { MinimalFooter } from "./Footer";
import MobileTabBar from "./MobileTabBar";
import AdPlaceholder from "@/components/AdPlaceholder";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import { useAuth } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";

/** Individual business listing pages get a clean, focused layout with no site footer or mobile tab menu. */
function isListingDetail(pathname: string) {
  return (
    /^\/businesses\/(?!list$|category\/)[^/]+$/.test(pathname) ||
    /^\/directory\/(?!category\/)[^/]+$/.test(pathname) ||
    /^\/suppliers\/(?!category\/|submit$)[^/]+$/.test(pathname)
  );
}

/** Graphic Design and Logo Creator studio pages get full immersive canvas layout with no footer menu. */
function isGraphicDesignPage(pathname: string) {
  return (
    pathname.startsWith("/graphic-designer") ||
    pathname.startsWith("/dashboard/graphic-designer") ||
    pathname.startsWith("/logo-creator") ||
    pathname.startsWith("/dashboard/logo-creator")
  );
}

/** Check if the current route is an interactive dashboard / studio page */
function isDashboardPage(pathname: string) {
  return pathname.startsWith("/dashboard");
}

export default function PublicLayout() {
  const { flags } = useFeatureFlags();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isGraphicPage = isGraphicDesignPage(pathname);
  const isDashboard = isDashboardPage(pathname);
  const isBusinessListing = isListingDetail(pathname);
  const clean = isBusinessListing || isGraphicPage || isDashboard;
  const isHome = pathname === "/";
  const showFooter = !clean && (Boolean(user) || flags.footer_for_non_members !== false);

  return (
    <div className="flex flex-col min-h-screen">
      <ErrorBoundary label="Header" fallback={null}><Header /></ErrorBoundary>
      <main className={`flex-1 ${isGraphicPage ? "pb-4 md:pb-0" : clean ? "pb-4 md:pb-0" : "pb-28 md:pb-0"}`}>
        <ErrorBoundary label="Route"><Outlet /></ErrorBoundary>
      </main>
      {flags.advertise && !clean && <AdPlaceholder placement="footer" className="container mx-auto px-4 mb-2" />}
      {showFooter && (
        <ErrorBoundary label="Footer" fallback={null}>
          {isHome ? <Footer /> : <MinimalFooter />}
        </ErrorBoundary>
      )}
      {!isGraphicPage && !isDashboard && !isBusinessListing && (
        <ErrorBoundary label="TabBar" fallback={null}><MobileTabBar /></ErrorBoundary>
      )}
    </div>
  );
}
