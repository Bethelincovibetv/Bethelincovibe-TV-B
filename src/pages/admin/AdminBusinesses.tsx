import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, ShieldCheck, Sparkles, Package, Video, Wand2, Wallet,
  SlidersHorizontal, LayoutDashboard
} from "lucide-react";

import AdminBusinessDirectoryTab from "@/components/admin/business/AdminBusinessDirectoryTab";
import AdminBusinessVerificationTab from "@/components/admin/business/AdminBusinessVerificationTab";
import AdminFeaturedBusinessesTab from "@/components/admin/business/AdminFeaturedBusinessesTab";
import AdminFeaturedProductsTab from "@/components/admin/business/AdminFeaturedProductsTab";
import AdminBusinessVideosTab from "@/components/admin/business/AdminBusinessVideosTab";
import AdminBusinessAISettingsTab from "@/components/admin/business/AdminBusinessAISettingsTab";
import AdminBusinessTransactionsTab from "@/components/admin/business/AdminBusinessTransactionsTab";

export default function AdminBusinesses({ defaultTab }: { defaultTab?: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromQuery = searchParams.get("tab") || defaultTab || "directory";
  const [activeTab, setActiveTab] = useState(tabFromQuery);

  useEffect(() => {
    if (tabFromQuery && tabFromQuery !== activeTab) {
      setActiveTab(tabFromQuery);
    }
  }, [tabFromQuery]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Business Management &amp; Growth Hub | Admin</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Building2 className="h-7 w-7 text-primary" />
            Business Management Hub
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Complete executive control over directory listings, Blue Tick verification, promotions, videos, and AI enhancements.
          </p>
        </div>
      </div>

      {/* Primary Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="overflow-x-auto pb-1 scrollbar-none">
          <TabsList className="bg-muted/70 p-1 rounded-2xl h-auto inline-flex min-w-full sm:min-w-0">
            <TabsTrigger
              value="directory"
              className="rounded-xl px-3.5 py-2 text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs"
            >
              <Building2 className="h-4 w-4 text-primary" />
              Businesses &amp; Directory
            </TabsTrigger>

            <TabsTrigger
              value="verification"
              className="rounded-xl px-3.5 py-2 text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs"
            >
              <ShieldCheck className="h-4 w-4 text-sky-500" />
              Verification (Blue Tick)
            </TabsTrigger>

            <TabsTrigger
              value="featured_biz"
              className="rounded-xl px-3.5 py-2 text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs"
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              Featured Businesses
            </TabsTrigger>

            <TabsTrigger
              value="featured_products"
              className="rounded-xl px-3.5 py-2 text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs"
            >
              <Package className="h-4 w-4 text-emerald-500" />
              Featured Products
            </TabsTrigger>

            <TabsTrigger
              value="videos"
              className="rounded-xl px-3.5 py-2 text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs"
            >
              <Video className="h-4 w-4 text-rose-500" />
              Videos
            </TabsTrigger>

            <TabsTrigger
              value="ai_settings"
              className="rounded-xl px-3.5 py-2 text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs"
            >
              <Wand2 className="h-4 w-4 text-indigo-500" />
              AI Enhancer
            </TabsTrigger>

            <TabsTrigger
              value="transactions"
              className="rounded-xl px-3.5 py-2 text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs"
            >
              <Wallet className="h-4 w-4 text-teal-500" />
              Transactions
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Contents */}
        <TabsContent value="directory" className="space-y-6 m-0 focus-visible:outline-none">
          <AdminBusinessDirectoryTab onSelectTab={handleTabChange} />
        </TabsContent>

        <TabsContent value="verification" className="space-y-6 m-0 focus-visible:outline-none">
          <AdminBusinessVerificationTab />
        </TabsContent>

        <TabsContent value="featured_biz" className="space-y-6 m-0 focus-visible:outline-none">
          <AdminFeaturedBusinessesTab />
        </TabsContent>

        <TabsContent value="featured_products" className="space-y-6 m-0 focus-visible:outline-none">
          <AdminFeaturedProductsTab />
        </TabsContent>

        <TabsContent value="videos" className="space-y-6 m-0 focus-visible:outline-none">
          <AdminBusinessVideosTab />
        </TabsContent>

        <TabsContent value="ai_settings" className="space-y-6 m-0 focus-visible:outline-none">
          <AdminBusinessAISettingsTab />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6 m-0 focus-visible:outline-none">
          <AdminBusinessTransactionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
