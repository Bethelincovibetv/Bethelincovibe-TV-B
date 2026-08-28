import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Palette, Sparkles, FolderOpen } from "lucide-react";
import GraphicDesignStudio from "@/components/graphic-designer/GraphicDesignStudio";
import LogoCreatorStudio from "@/components/graphic-designer/LogoCreatorStudio";
import MyDesignsGallery from "@/components/graphic-designer/MyDesignsGallery";
import FrontendSpecialistWidget from "@/components/ai/FrontendSpecialistWidget";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";

export default function GraphicDesignerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { flags } = useFeatureFlags();
  const tabParam = searchParams.get("tab") || "graphic";
  const businessIdParam = searchParams.get("businessId") || undefined;
  const nameParam = searchParams.get("name") || "";
  const categoryParam = searchParams.get("category") || "";

  const initialTab =
    (tabParam === "logo" || tabParam === "logos" || flags.graphic_designer === false) && flags.logo_creator !== false
      ? "logo"
      : tabParam === "designs" || tabParam === "my-designs"
      ? "designs"
      : "graphic";

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [passedLogoUrl, setPassedLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if ((tabParam === "logo" || flags.graphic_designer === false) && flags.logo_creator !== false) {
      setActiveTab("logo");
    } else if (tabParam === "designs" || tabParam === "my-designs") {
      setActiveTab("designs");
    } else if (flags.graphic_designer !== false) {
      setActiveTab("graphic");
    }
  }, [tabParam, flags.graphic_designer, flags.logo_creator]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setSearchParams((prev) => {
      prev.set("tab", val);
      return prev;
    });
  };

  const handleSwitchToLogoCreator = (name?: string, cat?: string) => {
    if (name) setSearchParams((prev) => { prev.set("name", name); return prev; });
    if (cat) setSearchParams((prev) => { prev.set("category", cat); return prev; });
    handleTabChange("logo");
  };

  const handleLogoSelected = (logoUrl: string) => {
    setPassedLogoUrl(logoUrl);
    handleTabChange("graphic");
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="container mx-auto px-4 pt-4 max-w-7xl space-y-6">
        {/* Main Header & Tab Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-pink-500 text-white flex items-center justify-center shadow-md shrink-0">
              <Palette className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-none text-foreground">
                AI Graphic Designer & Logo Team
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Autonomous brand design studio powered by Maya Sterling (Graphic AI) & Apollo Brand (Logo AI).
              </p>
            </div>
          </div>

          {/* Studio Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="h-10 p-1 rounded-xl bg-muted/80 border">
              {flags.graphic_designer !== false && (
                <TabsTrigger value="graphic" className="text-xs font-bold gap-1.5 rounded-lg px-3">
                  <Palette className="h-3.5 w-3.5" />
                  Graphic Designer
                </TabsTrigger>
              )}
              {flags.logo_creator !== false && (
                <TabsTrigger value="logo" className="text-xs font-bold gap-1.5 rounded-lg px-3">
                  <Sparkles className="h-3.5 w-3.5" />
                  Logo Creator
                </TabsTrigger>
              )}
              {flags.graphic_designer !== false && (
                <TabsTrigger value="designs" className="text-xs font-bold gap-1.5 rounded-lg px-3">
                  <FolderOpen className="h-3.5 w-3.5" />
                  My Designs
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>

        {/* AI Workforce Specialist Guidance Widget */}
        <FrontendSpecialistWidget
          agentId={activeTab === "logo" ? "logo_ai" : "graphic_ai"}
          mode="banner"
          title={
            activeTab === "logo"
              ? "Apollo Brand — Senior Brand Identity & Logo Specialist"
              : "Maya Sterling — Lead Brand & Graphic Designer"
          }
          subtitle={
            activeTab === "logo"
              ? "Ask Apollo for corporate mark concepts, brand archetype advice, color psychology, and emblem slogans."
              : "Ask Maya for WhatsApp flyer ideas, promotion copywriting, optical hierarchy tips, and category palettes."
          }
          initialOpen={false}
          contextData={{
            page: "graphic_designer_suite",
            activeTab,
            businessName: nameParam,
            category: categoryParam,
          }}
          customPrompts={
            activeTab === "logo"
              ? [
                  "Suggest 3 Luxury Brand Name & Tagline Pairings for Nigerian Commerce",
                  "Which Logo Archetype is Best for Tech Startups vs Boutiques?",
                  "Explain the Color Psychology of Royal 3D Gold vs Emerald Green",
                  "Draft a 2-word punchy luxury tagline for my business",
                ]
              : [
                  "Draft High-Converting Promotional Copy for a Weekend Flash Sale",
                  "Suggest 3 Value Highlights that Boost WhatsApp Conversions",
                  "What is the Best Aspect Ratio for WhatsApp Status vs Instagram?",
                  "Give Me Layout Advice for a Food & Catering Flyer",
                ]
          }
        />

        {/* Studio Content */}
        {activeTab === "graphic" && flags.graphic_designer !== false && (
          <GraphicDesignStudio
            initialBusinessId={businessIdParam}
            onNavigateToLogoCreator={handleSwitchToLogoCreator}
          />
        )}

        {activeTab === "logo" && flags.logo_creator !== false && (
          <LogoCreatorStudio
            initialBusinessName={nameParam}
            initialCategory={categoryParam}
            onLogoSelectedForGraphic={handleLogoSelected}
          />
        )}

        {activeTab === "designs" && flags.graphic_designer !== false && (
          <MyDesignsGallery
            onNavigateToCreate={() => handleTabChange("graphic")}
          />
        )}
      </div>
    </div>
  );
}
