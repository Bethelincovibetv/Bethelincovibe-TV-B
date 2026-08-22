import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer, { MinimalFooter } from "./Footer";
import MobileTabBar from "./MobileTabBar";
import AdPlaceholder from "@/components/AdPlaceholder";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import ErrorBoundary from "@/components/ErrorBoundary";

/** Individual business listing pages get a clean, full-width layout (no footer link menus). */
function isListingDetail(pathname: string) {
  return /^\/businesses\/(?!list$|category\/)[^/]+$/.test(pathname);
}

export default function PublicLayout() {
  const { flags } = useFeatureFlags();
  const { pathname } = useLocation();
  const clean = isListingDetail(pathname);
  const isHome = pathname === "/";

  return (
    <div className="flex flex-col min-h-screen">
      <ErrorBoundary label="Header" fallback={null}><Header /></ErrorBoundary>
      {flags.advertise && !clean && <AdPlaceholder placement="header" className="container mx-auto px-4 mt-2" />}
      <main className="flex-1 pb-28 md:pb-0">
        <ErrorBoundary label="Route"><Outlet /></ErrorBoundary>
      </main>
      {flags.advertise && !clean && <AdPlaceholder placement="footer" className="container mx-auto px-4 mb-2" />}
      {!clean && (
        <ErrorBoundary label="Footer" fallback={null}>
          {isHome ? <Footer /> : <MinimalFooter />}
        </ErrorBoundary>
      )}
      <ErrorBoundary label="TabBar" fallback={null}><MobileTabBar /></ErrorBoundary>
    </div>
  );
}
