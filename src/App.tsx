import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { recordDailyUserActivity } from "@/lib/dailyUsageTracker";
import PublicLayout from "@/components/layout/PublicLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import ProtectedAdminRoute from "@/components/ProtectedAdminRoute";
import { FeatureFlagsProvider, FeatureGate, useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import AdminFeatures from "./pages/admin/AdminFeatures";

import Index from "./pages/Index";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import BusinessDirectory from "./pages/BusinessDirectory";
import ProductDirectory from "./pages/ProductDirectory";
import ProductDetail from "./pages/ProductDetail";
import ListProduct from "./pages/ListProduct";
import SellerProducts from "./pages/SellerProducts";
import SellerPayments from "./pages/SellerPayments";
import UserPurchases from "./pages/UserPurchases";
import BusinessCategory from "./pages/BusinessCategory";
import BusinessProfile from "./pages/BusinessProfile";
import ListBusiness from "./pages/ListBusiness";
import UserBusinesses from "./pages/UserBusinesses";
import EditBusiness from "./pages/EditBusiness";
import BoostBusiness from "./pages/BoostBusiness";
import StartupCalculator from "./pages/StartupCalculator";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Support from "./pages/Support";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPosts from "./pages/admin/AdminPosts";
import AdminBusinesses from "./pages/admin/AdminBusinesses";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminVideos from "./pages/admin/AdminVideos";
import AdminSlides from "./pages/admin/AdminSlides";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminContacts from "./pages/admin/AdminContacts";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Disclaimer from "./pages/Disclaimer";
import LegalHub from "./pages/LegalHub";
import AdminAIBlogger from "./pages/admin/AdminAIBlogger";
import AdminPlatformAI from "./pages/admin/AdminPlatformAI";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminGuestBlogs from "./pages/admin/AdminGuestBlogs";
import UserDashboard from "./pages/UserDashboard";
import UserSettings from "./pages/UserSettings";
import UserWallet from "./pages/UserWallet";
import UserFavorites from "./pages/UserFavorites";
import UserProfileEdit from "./pages/UserProfileEdit";
import PublicProfile from "./pages/PublicProfile";
import SubmitBlog from "./pages/SubmitBlog";
import UserMyBlogs from "./pages/UserMyBlogs";
import AdvertiseWithUs from "./pages/AdvertiseWithUs";
import TransactionReceipt from "./pages/TransactionReceipt";
import UserAds from "./pages/UserAds";
import UserAdAnalytics from "./pages/UserAdAnalytics";
import BusinessCoach from "./pages/BusinessCoach";
import BusinessInventory from "./pages/BusinessInventory";
import SalesPages from "./pages/SalesPages";
import SalesPageEditor from "./pages/SalesPageEditor";
import SalesPage from "./pages/SalesPage";
import PublicSalesDirectory from "./pages/PublicSalesDirectory";
import AdminSalesPages from "./pages/admin/AdminSalesPages";
import UserLeads from "./pages/UserLeads";
import SalesPageAnalytics from "./pages/SalesPageAnalytics";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminSalesTemplates from "./pages/admin/AdminSalesTemplates";
import NotFound from "./pages/NotFound";
import AdSenseLoader from "./components/AdSenseLoader";
import AdsterraLoader from "./components/AdsterraLoader";
import ThirdPartyAdLoader from "./components/ThirdPartyAdLoader";
import ScrollToTop from "./components/ScrollToTop";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import OneSignalInit from "./components/OneSignalInit";
import GoogleAnalytics from "./components/GoogleAnalytics";
import CustomCodeInjector from "./components/CustomCodeInjector";
import DailyRewardClaim from "./components/DailyRewardClaim";
import AdminCustomCode from "./pages/admin/AdminCustomCode";
import AdminBlogAnalytics from "./pages/admin/AdminBlogAnalytics";
import AdminAds from "./pages/admin/AdminAds";
import AdminJingles from "./pages/admin/AdminJingles";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminAmazon from "./pages/admin/AdminAmazon";
import AdminBroadcast from "./pages/admin/AdminBroadcast";
import AdminEmailSettingsPage from "./pages/admin/AdminEmailSettings";
import Learn from "./pages/Learn";
import Forum from "./pages/Forum";
import ForumPost from "./pages/ForumPost";
import HowToGuide from "./pages/HowToGuide";
import AdClickTracker from "./components/AdClickTracker";
import UserAdEarnings from "./pages/UserAdEarnings";
import WhatsAppCommunityBanner from "./components/WhatsAppCommunityBanner";
import BackgroundJingle from "./components/BackgroundJingle";
import ErrorBoundary from "./components/ErrorBoundary";
import FcmPermissionPrompt from "./components/FcmPermissionPrompt";
import FcmForegroundListener from "./components/FcmForegroundListener";
import AdBlocker from "./components/AdBlocker";
import UserNotificationSettingsPage from "./pages/UserNotificationSettingsPage";
import UserNotificationsPage from "./pages/UserNotificationsPage";
import UserActivityPage from "./pages/UserActivityPage";
import UserVerification from "./pages/UserVerification";
import VideoCreator from "./pages/VideoCreator";
import VixoraStudioApp from "./vixora/App";
import WhatsAppStatusEngine from "./pages/WhatsAppStatusEngine";
import AdminWhatsAppEngine from "./pages/admin/AdminWhatsAppEngine";
import Referral from "./pages/Referral";
import GraphicDesignerPage from "./pages/GraphicDesignerPage";
import AdminPricingManagement from "./pages/admin/AdminPricingManagement";
import PromoterProfilePage from "./pages/PromoterProfilePage";
import AdminCommunityVerification from "./pages/admin/AdminCommunityVerification";
import BusinessPromotionMarketplace from "./pages/BusinessPromotionMarketplace";
import PromoterMarketplaceProfile from "./pages/PromoterMarketplaceProfile";
import BusinessPromotionOrders from "./pages/BusinessPromotionOrders";
import BusinessPromotionOrderDetail from "./pages/BusinessPromotionOrderDetail";
import PromoterPromotionOrders from "./pages/PromoterPromotionOrders";
import PromoterPromotionOrderDetail from "./pages/PromoterPromotionOrderDetail";
import AdminPromotionDisputes from "./pages/admin/AdminPromotionDisputes";
import AdminPromotionTreasury from "./pages/admin/AdminPromotionTreasury";
import PromoterEarningsPage from "./pages/PromoterEarningsPage";
import AIBusinessMatchAssistant from "./components/ai-match/AIBusinessMatchAssistant";
import CustomerMyRequests from "./pages/CustomerMyRequests";
import CustomerRequestDetail from "./pages/CustomerRequestDetail";
import ProviderOpportunitiesPage from "./pages/ProviderOpportunitiesPage";
import ProviderOpportunityDetail from "./pages/ProviderOpportunityDetail";
import ServiceManagementPage from "./pages/ServiceManagementPage";
import AdminBusinessRequests from "./pages/admin/AdminBusinessRequests";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (failureCount >= 2) return false;
        if (error?.message?.includes?.("Failed to fetch") || error?.message?.includes?.("network_error")) return false;
        return true;
      },
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2,
    },
  },
});

function FeatureAwareServices() {
  const { flags } = useFeatureFlags();
  const { user } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isAdmin = location.pathname.startsWith("/admin");

  useEffect(() => {
    recordDailyUserActivity("page_view", user?.id);
  }, [location.pathname, user?.id]);

  return (
    <ErrorBoundary label="Services" fallback={null}>
      <AdBlocker />
      <ScrollToTop />
      <GoogleAnalytics />
      <AdSenseLoader />
      <AdsterraLoader />
      <ThirdPartyAdLoader />
      {flags.pwa_install && <PWAInstallPrompt />}
      <OneSignalInit />
      <FcmPermissionPrompt />
      <FcmForegroundListener />
      <CustomCodeInjector />
      {flags.daily_rewards && <DailyRewardClaim />}
      <AdClickTracker />
      <WhatsAppCommunityBanner />
      {isHome && <BackgroundJingle />}
      {flags.ai_recommender !== false && !isAdmin && <AIBusinessMatchAssistant />}
    </ErrorBoundary>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <FeatureFlagsProvider>
          <FeatureAwareServices />
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/blog" element={<FeatureGate feature="blog"><Blog /></FeatureGate>} />
              <Route path="/blog/category/:categorySlug" element={<FeatureGate feature="blog"><Blog /></FeatureGate>} />
              <Route path="/blog/:slug" element={<FeatureGate feature="blog"><BlogPost /></FeatureGate>} />
              <Route path="/posts" element={<Navigate to="/blog" replace />} />
              <Route path="/posts/:slug" element={<FeatureGate feature="blog"><BlogPost /></FeatureGate>} />
              <Route path="/playbooks" element={<Navigate to="/blog" replace />} />
              <Route path="/playbooks/:slug" element={<FeatureGate feature="blog"><BlogPost /></FeatureGate>} />
              <Route path="/guides" element={<Navigate to="/blog" replace />} />

              <Route path="/businesses" element={<FeatureGate feature="businesses"><BusinessDirectory /></FeatureGate>} />
              <Route path="/businesses/category/:slug" element={<FeatureGate feature="businesses"><BusinessCategory /></FeatureGate>} />
              <Route path="/businesses/list" element={<FeatureGate feature="business_listing"><ListBusiness /></FeatureGate>} />
              <Route path="/businesses/:slug" element={<FeatureGate feature="businesses"><BusinessProfile /></FeatureGate>} />
              
              {/* Product marketplace & category routes */}
              <Route path="/products" element={<FeatureGate feature="products"><ProductDirectory /></FeatureGate>} />
              <Route path="/products/category/:categorySlug" element={<FeatureGate feature="products"><ProductDirectory /></FeatureGate>} />
              <Route path="/products/list" element={<FeatureGate feature="products"><ListProduct /></FeatureGate>} />
              <Route path="/products/:slug" element={<FeatureGate feature="products"><ProductDetail /></FeatureGate>} />
              <Route path="/marketplace" element={<FeatureGate feature="products"><ProductDirectory /></FeatureGate>} />
              <Route path="/marketplace/category/:categorySlug" element={<FeatureGate feature="products"><ProductDirectory /></FeatureGate>} />
              <Route path="/marketplace/list" element={<FeatureGate feature="products"><ListProduct /></FeatureGate>} />
              <Route path="/marketplace/:slug" element={<FeatureGate feature="products"><ProductDetail /></FeatureGate>} />
              <Route path="/shop" element={<FeatureGate feature="products"><ProductDirectory /></FeatureGate>} />
              <Route path="/shop/category/:categorySlug" element={<FeatureGate feature="products"><ProductDirectory /></FeatureGate>} />
              <Route path="/shop/:slug" element={<FeatureGate feature="products"><ProductDetail /></FeatureGate>} />

              {/* Legacy business aliases */}
              <Route path="/directory" element={<Navigate to="/businesses" replace />} />
              <Route path="/directory/category/:slug" element={<FeatureGate feature="businesses"><BusinessCategory /></FeatureGate>} />
              <Route path="/directory/:slug" element={<FeatureGate feature="businesses"><BusinessProfile /></FeatureGate>} />
              <Route path="/suppliers" element={<Navigate to="/businesses" replace />} />
              <Route path="/suppliers/category/:slug" element={<FeatureGate feature="businesses"><BusinessCategory /></FeatureGate>} />
              <Route path="/suppliers/submit" element={<Navigate to="/businesses/list" replace />} />
              <Route path="/suppliers/:slug" element={<FeatureGate feature="businesses"><BusinessProfile /></FeatureGate>} />
              <Route path="/tools/startup-calculator" element={<FeatureGate feature="tools"><StartupCalculator /></FeatureGate>} />
              <Route path="/tools/video-creator" element={<FeatureGate feature="video_creator"><VideoCreator /></FeatureGate>} />
              <Route path="/create-video" element={<FeatureGate feature="video_creator"><VideoCreator /></FeatureGate>} />
              <Route path="/studio/*" element={<VixoraStudioApp />} />
              <Route path="/studio" element={<VixoraStudioApp />} />
              <Route path="/advertise" element={<FeatureGate feature="advertise"><AdvertiseWithUs /></FeatureGate>} />
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/dashboard/graphic-designer" element={<FeatureGate feature="graphic_designer"><GraphicDesignerPage /></FeatureGate>} />
              <Route path="/dashboard/logo-creator" element={<FeatureGate feature="logo_creator"><GraphicDesignerPage /></FeatureGate>} />
              <Route path="/dashboard/my-designs" element={<FeatureGate feature="graphic_designer"><GraphicDesignerPage /></FeatureGate>} />
              <Route path="/graphic-designer" element={<FeatureGate feature="graphic_designer"><GraphicDesignerPage /></FeatureGate>} />
              <Route path="/logo-creator" element={<FeatureGate feature="logo_creator"><GraphicDesignerPage /></FeatureGate>} />
              <Route path="/dashboard/create-video" element={<FeatureGate feature="video_creator"><VideoCreator /></FeatureGate>} />
              <Route path="/dashboard/notifications" element={<UserNotificationsPage />} />
              <Route path="/dashboard/settings/notifications" element={<UserNotificationSettingsPage />} />
              <Route path="/dashboard/activity" element={<UserActivityPage />} />
              <Route path="/dashboard/verification" element={<FeatureGate feature="user_verification"><UserVerification /></FeatureGate>} />
              <Route path="/verification" element={<FeatureGate feature="user_verification"><UserVerification /></FeatureGate>} />
              <Route path="/activity" element={<UserActivityPage />} />
              <Route path="/dashboard/wallet" element={<FeatureGate feature="wallet"><UserWallet /></FeatureGate>} />
              <Route path="/wallet" element={<FeatureGate feature="wallet"><UserWallet /></FeatureGate>} />
              <Route path="/dashboard/receipt/:id" element={<TransactionReceipt />} />
              <Route path="/dashboard/wallet/receipt/:id" element={<TransactionReceipt />} />
              <Route path="/wallet/receipt/:id" element={<TransactionReceipt />} />
              <Route path="/receipt/:id" element={<TransactionReceipt />} />
              <Route path="/dashboard/promoter/profile" element={<FeatureGate feature="promoter_hub"><PromoterProfilePage /></FeatureGate>} />
              <Route path="/dashboard/promoter-profile" element={<FeatureGate feature="promoter_hub"><PromoterProfilePage /></FeatureGate>} />
              <Route path="/dashboard/promoter" element={<FeatureGate feature="promoter_hub"><PromoterProfilePage /></FeatureGate>} />
              <Route path="/promoter/profile" element={<FeatureGate feature="promoter_hub"><PromoterProfilePage /></FeatureGate>} />
              
              {/* Step 5: Business Promotion Marketplace & Discovery */}
              <Route path="/promoters" element={<FeatureGate feature="promoter_hub"><BusinessPromotionMarketplace /></FeatureGate>} />
              <Route path="/promoters/:id" element={<FeatureGate feature="promoter_hub"><PromoterMarketplaceProfile /></FeatureGate>} />
              <Route path="/promotions/marketplace" element={<FeatureGate feature="promoter_hub"><BusinessPromotionMarketplace /></FeatureGate>} />
              <Route path="/promotion-marketplace" element={<FeatureGate feature="promoter_hub"><BusinessPromotionMarketplace /></FeatureGate>} />

              {/* Step 6: Promotion Orders / Booking Foundation */}
              <Route path="/dashboard/promotion-orders" element={<FeatureGate feature="promoter_hub"><BusinessPromotionOrders /></FeatureGate>} />
              <Route path="/dashboard/promotion-orders/:id" element={<FeatureGate feature="promoter_hub"><BusinessPromotionOrderDetail /></FeatureGate>} />
              <Route path="/dashboard/business-orders" element={<FeatureGate feature="promoter_hub"><BusinessPromotionOrders /></FeatureGate>} />
              <Route path="/dashboard/promoter-orders" element={<FeatureGate feature="promoter_hub"><PromoterPromotionOrders /></FeatureGate>} />
              <Route path="/dashboard/promoter-orders/:id" element={<FeatureGate feature="promoter_hub"><PromoterPromotionOrderDetail /></FeatureGate>} />
              <Route path="/dashboard/promoter/earnings" element={<FeatureGate feature="promoter_hub"><PromoterEarningsPage /></FeatureGate>} />
              <Route path="/dashboard/promoter-earnings" element={<FeatureGate feature="promoter_hub"><PromoterEarningsPage /></FeatureGate>} />
              <Route path="/dashboard/earnings" element={<FeatureGate feature="promoter_hub"><PromoterEarningsPage /></FeatureGate>} />

              {/* Step 7: Smart Business Request & Opportunity Matching System */}
              <Route path="/dashboard/my-requests" element={<FeatureGate feature="matchmaker"><CustomerMyRequests /></FeatureGate>} />
              <Route path="/dashboard/my-requests/:id" element={<FeatureGate feature="matchmaker"><CustomerRequestDetail /></FeatureGate>} />
              <Route path="/dashboard/requests" element={<FeatureGate feature="matchmaker"><CustomerMyRequests /></FeatureGate>} />
              <Route path="/dashboard/requests/:id" element={<FeatureGate feature="matchmaker"><CustomerRequestDetail /></FeatureGate>} />
              <Route path="/my-requests" element={<FeatureGate feature="matchmaker"><CustomerMyRequests /></FeatureGate>} />
              <Route path="/my-requests/:id" element={<FeatureGate feature="matchmaker"><CustomerRequestDetail /></FeatureGate>} />
              <Route path="/requests" element={<FeatureGate feature="matchmaker"><CustomerMyRequests /></FeatureGate>} />
              <Route path="/dashboard/opportunities" element={<FeatureGate feature="matchmaker"><ProviderOpportunitiesPage /></FeatureGate>} />
              <Route path="/dashboard/opportunities/:id" element={<FeatureGate feature="matchmaker"><ProviderOpportunityDetail /></FeatureGate>} />
              <Route path="/opportunities" element={<FeatureGate feature="matchmaker"><ProviderOpportunitiesPage /></FeatureGate>} />
              <Route path="/opportunities/:id" element={<FeatureGate feature="matchmaker"><ProviderOpportunityDetail /></FeatureGate>} />
              <Route path="/leads" element={<FeatureGate feature="matchmaker"><ProviderOpportunitiesPage /></FeatureGate>} />

              {/* Step 8: Premium Service Management & Bookings */}
              <Route path="/dashboard/services" element={<ServiceManagementPage />} />
              <Route path="/dashboard/service-management" element={<ServiceManagementPage />} />
              <Route path="/dashboard/bookings" element={<ServiceManagementPage />} />
              <Route path="/services/manage" element={<ServiceManagementPage />} />

              <Route path="/dashboard/whatsapp-engine" element={<FeatureGate feature="whatsapp_engine"><WhatsAppStatusEngine /></FeatureGate>} />
              <Route path="/dashboard/whatsapp-monetize" element={<FeatureGate feature="whatsapp_engine"><WhatsAppStatusEngine /></FeatureGate>} />
              <Route path="/whatsapp-engine" element={<FeatureGate feature="whatsapp_engine"><WhatsAppStatusEngine /></FeatureGate>} />
              <Route path="/dashboard/ad-earnings" element={<FeatureGate feature="ad_earnings"><UserAdEarnings /></FeatureGate>} />
              <Route path="/dashboard/ads" element={<FeatureGate feature="advertise"><UserAds /></FeatureGate>} />
              <Route path="/dashboard/ads/:id/analytics" element={<FeatureGate feature="advertise"><UserAdAnalytics /></FeatureGate>} />
              <Route path="/dashboard/coach" element={<FeatureGate feature="coach"><BusinessCoach /></FeatureGate>} />
              <Route path="/dashboard/inventory" element={<FeatureGate feature="inventory"><BusinessInventory /></FeatureGate>} />
              <Route path="/dashboard/sales-pages" element={<FeatureGate feature="sales_pages"><SalesPages /></FeatureGate>} />
              <Route path="/dashboard/sales-pages/new" element={<FeatureGate feature="sales_pages"><SalesPageEditor /></FeatureGate>} />
              <Route path="/dashboard/sales-pages/:id/edit" element={<FeatureGate feature="sales_pages"><SalesPageEditor /></FeatureGate>} />
              <Route path="/dashboard/sales-pages/:id/analytics" element={<FeatureGate feature="sales_pages"><SalesPageAnalytics /></FeatureGate>} />
              <Route path="/dashboard/products" element={<FeatureGate feature="products"><SellerProducts /></FeatureGate>} />
              <Route path="/dashboard/payments" element={<SellerPayments />} />
              <Route path="/dashboard/purchases" element={<UserPurchases />} />
              <Route path="/dashboard/leads" element={<FeatureGate feature="user_leads"><UserLeads /></FeatureGate>} />
              <Route path="/dashboard/settings" element={<UserSettings />} />
              <Route path="/dashboard/settings/audio" element={<UserSettings />} />
              <Route path="/dashboard/settings/profile" element={<UserSettings />} />
              <Route path="/dashboard/settings/notifications" element={<UserSettings />} />
              <Route path="/dashboard/settings/security" element={<UserSettings />} />
              <Route path="/settings" element={<UserSettings />} />
              
              <Route path="/dashboard/favorites" element={<FeatureGate feature="favorites"><UserFavorites /></FeatureGate>} />
              <Route path="/dashboard/saved-blogs" element={<FeatureGate feature="favorites"><UserFavorites /></FeatureGate>} />
              <Route path="/saved-blogs" element={<FeatureGate feature="favorites"><UserFavorites /></FeatureGate>} />
              <Route path="/referral" element={<FeatureGate feature="referrals"><Referral /></FeatureGate>} />
              <Route path="/referrals" element={<FeatureGate feature="referrals"><Referral /></FeatureGate>} />
              <Route path="/dashboard/referrals" element={<FeatureGate feature="referrals"><Referral /></FeatureGate>} />
              <Route path="/dashboard/businesses" element={<FeatureGate feature="businesses"><UserBusinesses /></FeatureGate>} />
              <Route path="/dashboard/businesses/:id/edit" element={<FeatureGate feature="businesses"><EditBusiness /></FeatureGate>} />
              <Route path="/dashboard/businesses/:id/boost" element={<FeatureGate feature="business_boost"><BoostBusiness /></FeatureGate>} />
              <Route path="/dashboard/profile-edit" element={<UserProfileEdit />} />
              <Route path="/dashboard/services" element={<UserProfileEdit />} />
              <Route path="/services/manage" element={<UserProfileEdit />} />
              <Route path="/dashboard/how-to" element={<HowToGuide />} />
              <Route path="/dashboard/guides" element={<HowToGuide />} />
              <Route path="/how-to" element={<HowToGuide />} />
              <Route path="/how-it-works" element={<HowToGuide />} />
              <Route path="/how-to-use" element={<HowToGuide />} />
              <Route path="/guides" element={<HowToGuide />} />
              <Route path="/dashboard/submit-blog" element={<FeatureGate feature="guest_blog"><SubmitBlog /></FeatureGate>} />
              <Route path="/dashboard/my-blogs" element={<UserMyBlogs />} />
              <Route path="/dashboard/blogs" element={<UserMyBlogs />} />
              <Route path="/dashboard/blog-performance" element={<UserMyBlogs />} />
              <Route path="/u/:username" element={<PublicProfile />} />
              <Route path="/about" element={<About />} />
              <Route path="/support" element={<Support />} />
              <Route path="/contact" element={<Support />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<FeatureGate feature="register"><Register /></FeatureGate>} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/disclaimer" element={<Disclaimer />} />
              <Route path="/legal" element={<LegalHub />} />
              <Route path="/learn" element={<FeatureGate feature="learn"><Learn /></FeatureGate>} />
              <Route path="/forum" element={<FeatureGate feature="forum"><Forum /></FeatureGate>} />
              <Route path="/forum/category/:category" element={<FeatureGate feature="forum"><Forum /></FeatureGate>} />
              <Route path="/forum/:id" element={<FeatureGate feature="forum"><ForumPost /></FeatureGate>} />
              <Route path="/community" element={<FeatureGate feature="forum"><Forum /></FeatureGate>} />
              <Route path="/community/category/:category" element={<FeatureGate feature="forum"><Forum /></FeatureGate>} />
              <Route path="/community/:id" element={<FeatureGate feature="forum"><ForumPost /></FeatureGate>} />
              <Route path="/sales" element={<FeatureGate feature="sales_pages"><PublicSalesDirectory /></FeatureGate>} />
            </Route>

            <Route path="/admin" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="posts" element={<AdminPosts />} />
              <Route path="businesses" element={<AdminBusinesses />} />
              <Route path="verification" element={<AdminBusinesses defaultTab="verification" />} />
              <Route path="featured" element={<AdminBusinesses defaultTab="featured_biz" />} />
              <Route path="featured-products" element={<AdminBusinesses defaultTab="featured_products" />} />
              <Route path="business-videos" element={<AdminBusinesses defaultTab="videos" />} />
              <Route path="business-ai" element={<AdminBusinesses defaultTab="ai_settings" />} />
              <Route path="business-transactions" element={<AdminBusinesses defaultTab="transactions" />} />
              <Route path="suppliers" element={<AdminBusinesses />} />
              <Route path="business-requests" element={<AdminBusinessRequests />} />
              <Route path="requests" element={<AdminBusinessRequests />} />
              <Route path="matching" element={<AdminBusinessRequests />} />
              <Route path="opportunities" element={<AdminBusinessRequests />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="blog-categories" element={<AdminCategories categoryType="blog" />} />
              <Route path="directory-categories" element={<AdminCategories categoryType="business" />} />
              <Route path="videos" element={<AdminVideos />} />
              <Route path="video-creator" element={<VideoCreator />} />
              <Route path="slides" element={<AdminSlides />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="community-verification" element={<AdminCommunityVerification />} />
              <Route path="communities" element={<AdminCommunityVerification />} />
              <Route path="promoter-verification" element={<AdminCommunityVerification />} />
              <Route path="promotion-disputes" element={<AdminPromotionDisputes />} />
              <Route path="disputes" element={<AdminPromotionDisputes />} />
              <Route path="promotion-treasury" element={<AdminPromotionTreasury />} />
              <Route path="treasury" element={<AdminPromotionTreasury />} />
              <Route path="promotion-payouts" element={<AdminPromotionTreasury />} />
              <Route path="payouts" element={<AdminPromotionTreasury />} />
              <Route path="whatsapp-engine" element={<AdminWhatsAppEngine />} />
              <Route path="contacts" element={<AdminContacts />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="features" element={<AdminFeatures />} />
              <Route path="ai-blogger" element={<AdminAIBlogger />} />
              <Route path="ai" element={<AdminPlatformAI />} />
              <Route path="ai-admin" element={<AdminPlatformAI />} />
              <Route path="executive-ai" element={<AdminPlatformAI />} />
              <Route path="guest-blogs" element={<AdminGuestBlogs />} />
              <Route path="custom-code" element={<AdminCustomCode />} />
              <Route path="blog-analytics" element={<AdminBlogAnalytics />} />
              <Route path="analytics" element={<AdminBlogAnalytics />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="ads" element={<AdminAds />} />
              <Route path="jingles" element={<AdminJingles />} />
              <Route path="courses" element={<AdminCourses />} />
              <Route path="sales-pages" element={<AdminSalesPages />} />
              <Route path="sales-templates" element={<AdminSalesTemplates />} />
              <Route path="leads" element={<AdminLeads />} />
              <Route path="pricing" element={<AdminPricingManagement />} />
              <Route path="feature-pricing" element={<AdminPricingManagement />} />
              <Route path="amazon" element={<AdminAmazon />} />
              <Route path="broadcast" element={<AdminBroadcast />} />
              <Route path="email-settings" element={<AdminEmailSettingsPage />} />
            </Route>

            {/* Standalone public sales pages (no layout chrome) */}
            <Route path="/sales/:slug" element={<SalesPage />} />
            <Route path="/s/:slug" element={<SalesPage />} />

            {/* Chat route backward compatibility redirects */}
            <Route path="/chat" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard/chat" element={<Navigate to="/dashboard" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </FeatureFlagsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
