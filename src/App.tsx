import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
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
import UserMessages from "./pages/UserMessages";
import EditBusiness from "./pages/EditBusiness";
import BoostBusiness from "./pages/BoostBusiness";
import StartupCalculator from "./pages/StartupCalculator";
import About from "./pages/About";
import Contact from "./pages/Contact";
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
import AdminAIBlogger from "./pages/admin/AdminAIBlogger";
import AdminPlatformAI from "./pages/admin/AdminPlatformAI";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminGuestBlogs from "./pages/admin/AdminGuestBlogs";
import UserDashboard from "./pages/UserDashboard";
import UserWallet from "./pages/UserWallet";
import UserFavorites from "./pages/UserFavorites";
import UserProfileEdit from "./pages/UserProfileEdit";
import PublicProfile from "./pages/PublicProfile";
import SubmitBlog from "./pages/SubmitBlog";
import AdvertiseWithUs from "./pages/AdvertiseWithUs";
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
import AdClickTracker from "./components/AdClickTracker";
import UserAdEarnings from "./pages/UserAdEarnings";
import WhatsAppCommunityBanner from "./components/WhatsAppCommunityBanner";
import BackgroundJingle from "./components/BackgroundJingle";
import ErrorBoundary from "./components/ErrorBoundary";
import FcmPermissionPrompt from "./components/FcmPermissionPrompt";
import FcmForegroundListener from "./components/FcmForegroundListener";
import UserNotificationSettingsPage from "./pages/UserNotificationSettingsPage";
import UserNotificationsPage from "./pages/UserNotificationsPage";
const queryClient = new QueryClient();

function FeatureAwareServices() {
  const { flags } = useFeatureFlags();
  const isHome = useLocation().pathname === "/";
  return (
    <ErrorBoundary label="Services" fallback={null}>
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
              <Route path="/businesses" element={<FeatureGate feature="businesses"><BusinessDirectory /></FeatureGate>} />
              <Route path="/businesses/category/:slug" element={<FeatureGate feature="businesses"><BusinessCategory /></FeatureGate>} />
              <Route path="/businesses/list" element={<FeatureGate feature="business_listing"><ListBusiness /></FeatureGate>} />
              <Route path="/businesses/:slug" element={<FeatureGate feature="businesses"><BusinessProfile /></FeatureGate>} />
              {/* Product marketplace */}
              <Route path="/products" element={<FeatureGate feature="products"><ProductDirectory /></FeatureGate>} />
              <Route path="/products/list" element={<FeatureGate feature="products"><ListProduct /></FeatureGate>} />
              <Route path="/products/:slug" element={<FeatureGate feature="products"><ProductDetail /></FeatureGate>} />
              {/* Legacy redirects */}
              <Route path="/directory" element={<Navigate to="/businesses" replace />} />
              <Route path="/suppliers" element={<Navigate to="/businesses" replace />} />
              <Route path="/suppliers/submit" element={<Navigate to="/businesses/list" replace />} />
              <Route path="/suppliers/:slug" element={<FeatureGate feature="businesses"><BusinessProfile /></FeatureGate>} />
              <Route path="/tools/startup-calculator" element={<FeatureGate feature="tools"><StartupCalculator /></FeatureGate>} />
              <Route path="/advertise" element={<FeatureGate feature="advertise"><AdvertiseWithUs /></FeatureGate>} />
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/dashboard/notifications" element={<UserNotificationsPage />} />
              <Route path="/dashboard/settings/notifications" element={<UserNotificationSettingsPage />} />
              <Route path="/dashboard/wallet" element={<FeatureGate feature="wallet"><UserWallet /></FeatureGate>} />
              <Route path="/dashboard/ad-earnings" element={<UserAdEarnings />} />
              <Route path="/dashboard/ads" element={<FeatureGate feature="advertise"><UserAds /></FeatureGate>} />
              <Route path="/dashboard/ads/:id/analytics" element={<FeatureGate feature="advertise"><UserAdAnalytics /></FeatureGate>} />
              <Route path="/dashboard/coach" element={<FeatureGate feature="coach"><BusinessCoach /></FeatureGate>} />
              <Route path="/dashboard/inventory" element={<FeatureGate feature="inventory"><BusinessInventory /></FeatureGate>} />
              <Route path="/dashboard/sales-pages" element={<SalesPages />} />
              <Route path="/dashboard/sales-pages/new" element={<SalesPageEditor />} />
              <Route path="/dashboard/sales-pages/:id/edit" element={<SalesPageEditor />} />
              <Route path="/dashboard/sales-pages/:id/analytics" element={<SalesPageAnalytics />} />
              <Route path="/dashboard/products" element={<SellerProducts />} />
              <Route path="/dashboard/payments" element={<SellerPayments />} />
              <Route path="/dashboard/purchases" element={<UserPurchases />} />
              <Route path="/dashboard/leads" element={<UserLeads />} />
              
              <Route path="/dashboard/favorites" element={<FeatureGate feature="favorites"><UserFavorites /></FeatureGate>} />
              <Route path="/dashboard/businesses" element={<FeatureGate feature="businesses"><UserBusinesses /></FeatureGate>} />
              <Route path="/dashboard/messages" element={<FeatureGate feature="businesses"><UserMessages /></FeatureGate>} />
              <Route path="/dashboard/businesses/:id/edit" element={<FeatureGate feature="businesses"><EditBusiness /></FeatureGate>} />
              <Route path="/dashboard/businesses/:id/boost" element={<FeatureGate feature="business_boost"><BoostBusiness /></FeatureGate>} />
              <Route path="/dashboard/profile-edit" element={<UserProfileEdit />} />
              <Route path="/dashboard/submit-blog" element={<FeatureGate feature="guest_blog"><SubmitBlog /></FeatureGate>} />
              <Route path="/u/:username" element={<PublicProfile />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<FeatureGate feature="register"><Register /></FeatureGate>} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/disclaimer" element={<Disclaimer />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/forum" element={<FeatureGate feature="forum"><Forum /></FeatureGate>} />
              <Route path="/forum/:id" element={<FeatureGate feature="forum"><ForumPost /></FeatureGate>} />
              <Route path="/sales" element={<PublicSalesDirectory />} />
            </Route>

            <Route path="/admin" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="posts" element={<AdminPosts />} />
              <Route path="businesses" element={<AdminBusinesses />} />
              <Route path="suppliers" element={<AdminBusinesses />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="blog-categories" element={<AdminCategories categoryType="blog" />} />
              <Route path="directory-categories" element={<AdminCategories categoryType="business" />} />
              <Route path="videos" element={<AdminVideos />} />
              <Route path="slides" element={<AdminSlides />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="contacts" element={<AdminContacts />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="features" element={<AdminFeatures />} />
              <Route path="ai-blogger" element={<AdminAIBlogger />} />
              <Route path="ai-admin" element={<AdminPlatformAI />} />
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
              <Route path="amazon" element={<AdminAmazon />} />
              <Route path="broadcast" element={<AdminBroadcast />} />
              <Route path="email-settings" element={<AdminEmailSettingsPage />} />
            </Route>

            {/* Standalone public sales pages (no layout chrome) */}
            <Route path="/sales/:slug" element={<SalesPage />} />

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
