import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  Star,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Share2,
  Sparkles,
  Smartphone,
  Save,
  Clock,
  Layers,
  HelpCircle,
  Eye,
  Edit3,
  TrendingUp,
  Users,
  Radio,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  getMyPromoterProfile,
  createPromoterProfile,
  updatePromoterProfile,
  validateAndNormalizeWhatsAppNumber,
  PROMOTER_NICHES,
  PromoterProfile,
} from "@/services/promoterService";
import PromoterCommunitiesSection from "@/components/promoter/PromoterCommunitiesSection";

export default function PromoterProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<PromoterProfile | null>(null);

  // Active Tab: "audiences" | "profile" | "preview"
  const activeTabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"audiences" | "profile" | "preview">(
    activeTabParam === "profile" || activeTabParam === "preview" ? activeTabParam : "audiences"
  );

  // Form states
  const [displayName, setDisplayName] = useState("");
  const [phoneWhatsApp, setPhoneWhatsApp] = useState("");
  const [bio, setBio] = useState("");
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);

  // Live validation for WhatsApp number
  const phoneValidation = validateAndNormalizeWhatsAppNumber(phoneWhatsApp);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login?redirect=/dashboard/promoter-profile");
      return;
    }

    if (user) {
      loadProfile();
    }
  }, [user, authLoading]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getMyPromoterProfile(user.id);
      if (data) {
        setProfile(data);
        setDisplayName(data.display_name);
        setPhoneWhatsApp(data.phone_whatsapp);
        setBio(data.bio || "");
        setSelectedNiches(data.niche || []);
      } else {
        // Pre-fill display name from user profile / email if available
        setDisplayName(user.user_metadata?.display_name || user.email?.split("@")[0] || "");
        // If no profile exists yet, default to profile tab
        setActiveTab("profile");
      }
    } catch (err: any) {
      console.warn("Notice: Initializing promoter profile state:", err?.message);
      setDisplayName(user.user_metadata?.display_name || user.email?.split("@")[0] || "");
      setActiveTab("profile");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNiche = (nicheId: string) => {
    setSelectedNiches((prev) =>
      prev.includes(nicheId) ? prev.filter((id) => id !== nicheId) : [...prev, nicheId]
    );
  };

  const handleTabChange = (tab: "audiences" | "profile" | "preview") => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!displayName.trim()) {
      toast.error("Please provide a valid display or brand name.");
      return;
    }

    if (!phoneValidation.isValid) {
      toast.error(phoneValidation.error || "Please enter a valid WhatsApp phone number.");
      return;
    }

    try {
      setSaving(true);
      if (profile) {
        // Update existing profile
        const updated = await updatePromoterProfile({
          profileId: profile.id,
          displayName,
          phoneWhatsApp,
          bio,
          niches: selectedNiches,
        });
        setProfile(updated);
        toast.success("Promoter profile updated successfully!");
      } else {
        // Create new profile
        const created = await createPromoterProfile({
          userId: user.id,
          displayName,
          phoneWhatsApp,
          bio,
          niches: selectedNiches,
        });
        setProfile(created);
        setActiveTab("audiences");
        toast.success("Welcome! Your Promoter Profile has been registered.");
      }
    } catch (err: any) {
      console.error("Error saving promoter profile:", err);
      toast.error(err.message || "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 px-4">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-600 animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse font-medium">
          Loading Promoter Profile & Audiences...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background pb-16 pt-4 sm:pt-8">
      <Helmet>
        <title>Promoter Profile & WhatsApp Audiences | Bethelincovibe TV</title>
        <meta
          name="description"
          content="Manage your verified WhatsApp communities, groups, channels, status audiences, and promotion profile on Bethelincovibe TV."
        />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Dashboard
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Promoter Hub & Audiences
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Business Promotion Network • WhatsApp Communities & Monetization
                </p>
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          {profile && (
            <div className="flex items-center bg-muted/80 p-1 rounded-xl border self-start sm:self-center gap-1">
              <Button
                type="button"
                variant={activeTab === "audiences" ? "default" : "ghost"}
                size="sm"
                className={`h-8 text-xs font-medium rounded-lg ${
                  activeTab === "audiences" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                }`}
                onClick={() => handleTabChange("audiences")}
              >
                <Users className="w-3.5 h-3.5 mr-1.5" /> Audiences
              </Button>
              <Button
                type="button"
                variant={activeTab === "profile" ? "default" : "ghost"}
                size="sm"
                className="h-8 text-xs font-medium rounded-lg"
                onClick={() => handleTabChange("profile")}
              >
                <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Identity & Contact
              </Button>
              <Button
                type="button"
                variant={activeTab === "preview" ? "default" : "ghost"}
                size="sm"
                className="h-8 text-xs font-medium rounded-lg"
                onClick={() => handleTabChange("preview")}
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" /> Public View
              </Button>
            </div>
          )}
        </div>

        {/* Status & Trust Overview Cards (System-Controlled / Read-Only) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {/* Verification Status Card */}
          <Card className="border-border/60 bg-card/80 backdrop-blur shadow-sm">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Verification</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3.5 h-3.5 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Admin-audited status. Automatically verified after submitting authentic WhatsApp audience metrics.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div>
                {profile?.is_verified ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 w-fit font-semibold px-2 py-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified
                  </Badge>
                ) : profile?.status === "suspended" ? (
                  <Badge variant="destructive" className="flex items-center gap-1 w-fit font-semibold px-2 py-0.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Suspended
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 flex items-center gap-1 w-fit font-semibold px-2 py-0.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" /> Not Verified
                  </Badge>
                )}
                <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">
                  {profile?.is_verified ? "Official Partner" : "Verification Stage"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Rating Card */}
          <Card className="border-border/60 bg-card/80 backdrop-blur shadow-sm">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Trust Rating</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3.5 h-3.5 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Starts at 5.00 and is updated automatically from verified business order completions.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-foreground">
                    {profile ? Number(profile.rating || 5.0).toFixed(2) : "5.00"}
                  </span>
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400 inline" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                  {profile ? "System-managed rating" : "Default starting score"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Completed Orders Card */}
          <Card className="border-border/60 bg-card/80 backdrop-blur shadow-sm">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Deliveries</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3.5 h-3.5 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Total count of promotions verified and approved by business advertisers.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div>
                <div className="text-xl font-bold text-foreground">
                  {profile?.total_completed_orders ?? 0}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                  Completed orders
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Account Status Card */}
          <Card className="border-border/60 bg-card/80 backdrop-blur shadow-sm">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Account Status</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3.5 h-3.5 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Governed by platform compliance and promoter availability.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div>
                <Badge
                  variant="outline"
                  className={`w-fit font-semibold px-2 py-0.5 uppercase text-[10px] ${
                    profile?.status === "active"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                      : profile?.status === "vacation"
                      ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
                      : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                  }`}
                >
                  {profile?.status || "Active"}
                </Badge>
                <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">
                  Platform standing
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab 1: WhatsApp Audiences Section */}
        {profile && activeTab === "audiences" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <PromoterCommunitiesSection promoterId={profile.id} />
          </motion.div>
        )}

        {/* Tab 2: Profile Edit / Registration Form */}
        {activeTab === "profile" && (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4 border-b border-border/50">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  {profile ? "Edit Promoter Identity & Channels" : "Register As A Promoter"}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Provide accurate details to establish your promoter identity and connect with businesses looking for WhatsApp promotion.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 sm:p-6 space-y-6">
                {/* Display / Brand Name */}
                <div className="space-y-2">
                  <label htmlFor="display_name" className="text-xs font-semibold text-foreground">
                    Display / Brand Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    id="display_name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Lagos Lifestyle & Tech Hub"
                    className="h-10 text-sm font-medium"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This public name will appear on the Business Promotion Network marketplace.
                  </p>
                </div>

                {/* WhatsApp Phone Number */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="phone_whatsapp" className="text-xs font-semibold text-foreground">
                      WhatsApp Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      Primary Market: 🇳🇬 Nigeria (+234)
                    </span>
                  </div>

                  <div className="relative">
                    <Input
                      id="phone_whatsapp"
                      type="tel"
                      value={phoneWhatsApp}
                      onChange={(e) => setPhoneWhatsApp(e.target.value)}
                      placeholder="e.g. 08012345678 or +2348012345678"
                      className={`h-10 font-mono text-sm pl-3 pr-10 ${
                        phoneWhatsApp && !phoneValidation.isValid
                          ? "border-rose-500 focus-visible:ring-rose-500"
                          : phoneWhatsApp && phoneValidation.isValid
                          ? "border-emerald-500 focus-visible:ring-emerald-500"
                          : ""
                      }`}
                      required
                    />
                    {phoneWhatsApp && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {phoneValidation.isValid ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Real-time Normalization feedback */}
                  {phoneWhatsApp && (
                    <div
                      className={`text-[11px] p-2.5 rounded-lg border flex items-center justify-between ${
                        phoneValidation.isValid
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
                      }`}
                    >
                      <span>
                        {phoneValidation.isValid
                          ? `Standardized E.164: ${phoneValidation.normalizedE164} (${phoneValidation.formattedDisplay})`
                          : phoneValidation.error}
                      </span>
                      {phoneValidation.isValid && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/20 px-2 py-0.5 rounded">
                          Valid
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Accepts Nigerian formats like <code className="font-mono text-foreground">08012345678</code> or international <code className="font-mono text-foreground">+234...</code>.
                  </p>
                </div>

                {/* Short Bio */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="bio" className="text-xs font-semibold text-foreground">
                      Promoter Bio & Audience Profile
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      {bio.length} / 500 characters
                    </span>
                  </div>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 500))}
                    placeholder="Briefly describe your audience reach, target demographic (age, location, interests), and promotion experience..."
                    rows={4}
                    className="text-sm resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Highlight your audience engagement rate and the primary Nigerian states or demographics you reach.
                  </p>
                </div>

                {/* Niches Multi-Select */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Promotion Niches & Categories
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      {selectedNiches.length} selected
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PROMOTER_NICHES.map((niche) => {
                      const isSelected = selectedNiches.includes(niche.id);
                      return (
                        <button
                          key={niche.id}
                          type="button"
                          onClick={() => handleToggleNiche(niche.id)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-card hover:bg-muted/60 text-foreground border-border/80"
                          }`}
                        >
                          <span className="text-base">{niche.icon}</span>
                          <span className="truncate">{niche.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Select all industries that match your audience interests for targeted business bookings.
                  </p>
                </div>

                {/* System Fields Explainer Card */}
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Tamper-Proof Platform Protection</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    To maintain strict marketplace trust, your <strong>Verification Badge</strong>, <strong>Trust Rating</strong>, <strong>Delivery Count</strong>, and <strong>Account Status</strong> are securely calculated at database-level and cannot be altered via client edits.
                  </p>
                </div>
              </CardContent>

              {/* Form Submission Footer */}
              <div className="p-4 sm:p-6 bg-muted/30 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-[11px] text-muted-foreground">
                  By saving, your promoter identity is registered under your authenticated account.
                </p>
                <Button
                  type="submit"
                  disabled={saving || !displayName.trim() || !phoneValidation.isValid}
                  className="w-full sm:w-auto h-10 px-6 gap-2 font-semibold shadow bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : profile ? "Save Profile Changes" : "Register As Promoter"}
                </Button>
              </div>
            </Card>
          </motion.form>
        )}

        {/* Tab 3: Public Advertiser Preview Mode */}
        {profile && activeTab === "preview" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <Card className="border-border overflow-hidden shadow-lg">
              <div className="h-28 bg-gradient-to-r from-emerald-600 via-teal-600 to-primary relative">
                <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Public Advertiser View
                </div>
              </div>

              <CardContent className="px-6 pb-6 pt-0 relative">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-12 mb-4 gap-4">
                  <div className="flex items-end gap-3.5">
                    <div className="w-20 h-20 rounded-2xl bg-card border-4 border-card shadow-md flex items-center justify-center text-2xl font-bold text-primary">
                      {displayName.charAt(0).toUpperCase() || "P"}
                    </div>
                    <div className="mb-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
                        {profile.is_verified && (
                          <ShieldCheck className="w-5 h-5 text-emerald-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span>🇳🇬 Nigeria</span> •{" "}
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          WhatsApp Promoter
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => handleTabChange("profile")}
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Profile Details
                    </Button>
                  </div>
                </div>

                {/* Bio */}
                <div className="mt-4 pt-4 border-t border-border/60">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Audience Overview & Bio
                  </h3>
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                    {bio || "No bio provided yet. Add an audience description to attract more business bookings."}
                  </p>
                </div>

                {/* Niches */}
                <div className="mt-6 pt-4 border-t border-border/60">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                    Promotion Niches
                  </h3>
                  {selectedNiches.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedNiches.map((nicheId) => {
                        const niche = PROMOTER_NICHES.find((n) => n.id === nicheId);
                        return (
                          <Badge
                            key={nicheId}
                            variant="secondary"
                            className="px-3 py-1 text-xs font-medium flex items-center gap-1.5 bg-muted"
                          >
                            <span>{niche?.icon || "🏷️"}</span>
                            <span>{niche?.label || nicheId}</span>
                          </Badge>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No niches selected yet.</p>
                  )}
                </div>

                {/* WhatsApp Contact Preview */}
                <div className="mt-6 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">Verified WhatsApp Channel</h4>
                      <p className="text-xs text-muted-foreground font-mono">
                        {phoneValidation.formattedDisplay || phoneWhatsApp}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 w-fit text-xs px-3 py-1 font-medium">
                    Protected Channel
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
