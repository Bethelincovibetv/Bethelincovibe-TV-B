import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Globe,
  MessageCircle,
  Mail,
  Phone,
  Pencil,
  Share2,
  ExternalLink,
  ChevronLeft,
  Briefcase,
  ShoppingBag,
  Sparkles,
  Building2,
  LayoutGrid,
  Send,
  User,
  MapPin,
  Store,
  ArrowRight,
  ShieldCheck,
  Star,
  Clock,
  Check,
  QrCode,
  Video,
  Play,
  Flame,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import ServicePreviewDialog from "@/components/ServicePreviewDialog";
import FeaturedServiceCard from "@/components/directory/FeaturedServiceCard";
import QRCodeDialog from "@/components/QRCodeDialog";
import VerifiedBadge, { VerifiedPillBadge } from "@/components/VerifiedBadge";
import { waLink as buildWaLink } from "@/lib/phone";
import { copyToClipboard } from "@/lib/clipboard";
import { resolveEntityOgImage, absUrl } from "@/lib/seo";
import SEO from "@/components/SEO";
import { extractYouTubeVideoId } from "@/pages/UserProfileEdit";
import BrandedLoader from "@/components/BrandedLoader";

// Production-safe Vite asset imports for Vercel
import bgTech from "@/assets/images/bg_tech_innovation_1787551368560.jpg";
import bgFashion from "@/assets/images/bg_fashion_luxury_1787551382249.jpg";
import bgCreative from "@/assets/images/bg_creative_design_1787551396312.jpg";

const TEMPLATE_BACKGROUND_MAP: Record<string, { image: string; fallback: string; gradient: string }> = {
  tech: {
    image: bgTech,
    fallback: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80",
    gradient: "from-blue-600 via-indigo-600 to-cyan-700",
  },
  fashion: {
    image: bgFashion,
    fallback: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80",
    gradient: "from-amber-500 via-yellow-600 to-orange-600",
  },
  creative: {
    image: bgCreative,
    fallback: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1600&q=80",
    gradient: "from-purple-600 via-fuchsia-600 to-pink-600",
  },
  emerald: {
    image: "",
    fallback: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80",
    gradient: "from-emerald-600 via-teal-600 to-cyan-700",
  },
  sunset: {
    image: "",
    fallback: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80",
    gradient: "from-orange-500 via-rose-500 to-pink-600",
  },
  ocean: {
    image: "",
    fallback: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1600&q=80",
    gradient: "from-blue-600 via-indigo-600 to-sky-700",
  },
  noir: {
    image: "",
    fallback: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1600&q=80",
    gradient: "from-zinc-800 via-zinc-900 to-black",
  },
};

export default function PublicProfile() {
  const { username } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [salesPages, setSalesPages] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "products" | "sales" | "services" | "businesses" | "contact"
  >("overview");

  // Inquiry form state
  const [inquiry, setInquiry] = useState({ name: "", phone: "", email: "", message: "" });
  const [sendingInquiry, setSendingInquiry] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const decodedUser = username ? decodeURIComponent(username).trim() : "";
      const isUuid = /^[0-9a-f-]{36}$/i.test(decodedUser);

      let foundProfile: any = null;

      if (decodedUser === "me") {
        if (!user) {
          setLoading(false);
          return;
        }
        const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
        foundProfile = data;
      } else if (isUuid) {
        const { data } = await supabase.from("profiles").select("*").eq("user_id", decodedUser).maybeSingle();
        foundProfile = data;
      } else {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("username", decodedUser)
          .maybeSingle();

        if (data) {
          foundProfile = data;
        } else {
          const { data: ilikeData } = await supabase
            .from("profiles")
            .select("*")
            .ilike("username", decodedUser)
            .maybeSingle();
          foundProfile = ilikeData;
        }
      }

      setProfile(foundProfile);

      if (foundProfile?.user_id) {
        // Fetch Sales Pages
        const { data: sp } = await supabase
          .from("sales_pages")
          .select(
            "id, slug, product_name, headline, subheadline, price, currency, product_image_url, views_count, created_at"
          )
          .eq("user_id", foundProfile.user_id)
          .eq("active", true)
          .order("created_at", { ascending: false });
        setSalesPages(sp || []);

        // Fetch Seller Products
        const { data: prod } = await supabase
          .from("directory_products")
          .select("*, categories(name, slug)")
          .eq("user_id", foundProfile.user_id)
          .eq("active", true)
          .order("created_at", { ascending: false });
        setProducts(prod || []);

        // Fetch User Businesses / Suppliers
        const { data: supp } = await supabase
          .from("suppliers")
          .select("*, categories(name)")
          .eq("submitted_by", foundProfile.user_id)
          .order("created_at", { ascending: false });
        setBusinesses(supp || []);
      }
      setLoading(false);
    })();
  }, [username, user]);

  if (username === "me" && !user && !loading) return <Navigate to="/login" replace />;
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <BrandedLoader
          message="Loading profile & catalog..."
          submessage="Connecting to verified business storefront"
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto max-w-md py-20 px-4 text-center space-y-5">
        <div className="h-16 w-16 rounded-3xl bg-muted border border-border/80 flex items-center justify-center mx-auto text-muted-foreground">
          <User className="h-8 w-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold">Profile Not Found</h2>
          <p className="text-sm text-muted-foreground">
            This merchant profile or business store does not exist or may be private.
          </p>
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <Button asChild variant="outline" className="rounded-xl font-bold">
            <Link to="/businesses">Browse Directory</Link>
          </Button>
          <Button asChild className="rounded-xl font-bold">
            <Link to="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const sl = (profile.social_links as Record<string, any>) || {};
  const services: any[] = Array.isArray(profile.services) ? profile.services : [];
  const fullName = profile.display_name || profile.username || "Verified Business";
  const seoDesc =
    profile.bio?.slice(0, 155) ||
    `${fullName}'s official website, product catalog & services on Bethelincovibe`;
  const waClean = (buildWaLink(profile.whatsapp) || "")
    .replace("https://wa.me/", "")
    .split("?")[0];
  const canonicalLogo = profile.avatar_url || businesses[0]?.logo_url || null;
  const isOwner = user && profile.user_id === user.id;

  // Verification status
  const isVerified =
    !!sl.verified ||
    (!!sl.verified_until && new Date(sl.verified_until) > new Date()) ||
    businesses.some((b) => !!b.social_links?.verified);

  // YouTube Video URL
  const videoUrl = sl.youtube_video_url || businesses[0]?.social_links?.youtube_video_url;
  const ytVideoId = extractYouTubeVideoId(videoUrl);

  // Background resolution
  const templateConfig = TEMPLATE_BACKGROUND_MAP[profile.background_template || "tech"] || TEMPLATE_BACKGROUND_MAP.tech;
  const resolvedBgImage = profile.background_url || templateConfig.image || templateConfig.fallback;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: fullName,
    description: profile.bio,
    image: profile.avatar_url,
    url: typeof window !== "undefined" ? window.location.href : undefined,
    sameAs: Object.values(sl).filter((v) => typeof v === "string" && v.startsWith("http")),
    knowsAbout: services.map((s) => s.title),
  };

  const onShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({
          title: `${fullName} - Official Profile Website`,
          text: profile.bio || undefined,
          url,
        });
        return;
      }
    } catch {}
    const success = await copyToClipboard(url);
    if (success) {
      toast.success("Profile website link copied!");
    } else {
      toast.info("Link: " + url);
    }
  };

  const submitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiry.name.trim() || (!inquiry.phone.trim() && !inquiry.email.trim())) {
      toast.error("Please provide your name and contact info");
      return;
    }
    setSendingInquiry(true);

    try {
      // Create lead record
      await supabase.from("sales_page_leads").insert({
        user_id: profile.user_id,
        name: inquiry.name,
        phone: inquiry.phone,
        email: inquiry.email,
        notes: inquiry.message,
      });

      // Send notification to profile owner
      await supabase.from("user_notifications").insert({
        user_id: profile.user_id,
        title: `📩 New website inquiry from ${inquiry.name}`,
        body: inquiry.message || `Contact: ${inquiry.phone || inquiry.email}`,
        type: "lead",
        url: "/dashboard/leads",
      });

      toast.success("Inquiry sent successfully! The business owner will get back to you.");
      setInquiry({ name: "", phone: "", email: "", message: "" });
    } catch (err: any) {
      toast.error("Failed to send inquiry. Try WhatsApp instead.");
    } finally {
      setSendingInquiry(false);
    }
  };

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutGrid, count: null },
    { id: "products", label: "Products Store", icon: ShoppingBag, count: products.length },
    { id: "sales", label: "Special Offers", icon: Sparkles, count: salesPages.length },
    { id: "services", label: "Services", icon: Briefcase, count: services.length },
    { id: "businesses", label: "Businesses", icon: Building2, count: businesses.length },
    { id: "contact", label: "Contact & Inquiry", icon: Mail, count: null },
  ];

  const profileOgImage = resolveEntityOgImage({
    primaryImage: canonicalLogo || resolvedBgImage,
    title: fullName,
    subtitle: profile.bio || "Official Profile & Business Hub",
    badge: isVerified ? "Verified Professional" : "Professional Profile",
  });

  const profileUrl = profile.username ? `/p/${profile.username}` : `/u/${profile.id || id}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pb-28 md:pb-16">
      <SEO
        title={`${fullName} - Official Website | Bethelincovibe TV`}
        description={seoDesc}
        url={profileUrl}
        type="profile"
        image={profileOgImage}
        jsonLd={jsonLd}
      />

      {/* Top Website Brand Banner / Hero Cover */}
      <div
        className={`relative h-60 sm:h-72 overflow-hidden transition-all bg-gradient-to-br ${templateConfig.gradient}`}
      >
        {resolvedBgImage && (
          <img
            src={resolvedBgImage}
            alt={fullName}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              // Fallback to Unsplash CDN image if local fails on any host
              (e.target as HTMLImageElement).src = templateConfig.fallback;
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-black/40 to-black/20" />

        {/* Website Top Bar Nav */}
        <div className="container mx-auto max-w-7xl px-4 relative z-20 pt-4 flex items-center justify-between gap-2">
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="rounded-xl shadow-lg h-9 bg-white/20 backdrop-blur-md text-white border-white/30 hover:bg-white/30 text-xs px-2.5 sm:px-3 shrink-0"
          >
            <Link to="/businesses">
              <ChevronLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Back to </span>Directory
            </Link>
          </Button>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <QRCodeDialog
              url={typeof window !== "undefined" ? window.location.href : ""}
              title={`${fullName}'s QR Code`}
              subtitle="Scan with smartphone camera to view products, services & offers"
              trigger={
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-xl shadow-lg h-9 bg-white/20 backdrop-blur-md text-white border-white/30 hover:bg-white/30 text-xs px-2.5 sm:px-3"
                >
                  <QrCode className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">QR </span>Code
                </Button>
              }
            />

            <Button
              size="sm"
              variant="secondary"
              onClick={onShare}
              className="rounded-xl shadow-lg h-9 bg-white/20 backdrop-blur-md text-white border-white/30 hover:bg-white/30 text-xs px-2.5 sm:px-3"
            >
              <Share2 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Share</span>
            </Button>

            {isOwner && (
              <Button
                asChild
                size="sm"
                className="rounded-xl shadow-lg h-9 bg-primary text-primary-foreground font-extrabold text-xs px-3"
              >
                <Link to="/dashboard/profile-edit">
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Profile
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="container mx-auto max-w-7xl px-4 -mt-20 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Business Bio & Identity Card */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-border/80 shadow-xl rounded-3xl overflow-hidden bg-card">
              <CardContent className="p-6 text-center space-y-4">
                {/* Logo / Avatar */}
                <div className="relative inline-block mx-auto">
                  <div className="h-28 w-28 rounded-3xl bg-muted overflow-hidden flex items-center justify-center text-3xl font-black text-primary ring-4 ring-card shadow-2xl mx-auto">
                    {canonicalLogo ? (
                      <img
                        src={canonicalLogo}
                        alt={fullName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      (profile.display_name?.[0] || profile.username?.[0] || fullName?.[0] || "★").toUpperCase()
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center justify-center gap-1.5 flex-wrap">
                    <span>{fullName}</span>
                    {isVerified && (
                      <VerifiedBadge
                        verified={true}
                        verifiedUntil={sl.verified_until}
                        size="md"
                      />
                    )}
                  </h1>

                  {profile.username && (
                    <p className="text-xs font-bold text-primary">@{profile.username}</p>
                  )}

                  {isVerified && (
                    <div className="pt-1 flex justify-center">
                      <VerifiedPillBadge />
                    </div>
                  )}

                  {sl.tagline && (
                    <p className="text-xs font-extrabold text-muted-foreground italic pt-0.5">
                      “{sl.tagline}”
                    </p>
                  )}
                </div>

                {profile.bio && (
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
                    {profile.bio}
                  </p>
                )}

                {/* Direct Action Buttons */}
                <div className="pt-2 flex flex-col gap-2">
                  {!isOwner && profile.user_id && (
                    <Button
                      asChild
                      className="w-full rounded-2xl font-black bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 gap-2"
                    >
                      <Link
                        to={`/chat?targetUserId=${profile.user_id}&targetName=${encodeURIComponent(fullName)}&targetAvatar=${encodeURIComponent(canonicalLogo || "")}`}
                      >
                        <MessageCircle className="h-4 w-4" /> Message {fullName.split(" ")[0]}
                      </Link>
                    </Button>
                  )}

                  {waClean ? (
                    <Button
                      asChild
                      className="w-full rounded-2xl font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 gap-2"
                    >
                      <a href={`https://wa.me/${waClean}`} target="_blank" rel="noopener">
                        <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
                      </a>
                    </Button>
                  ) : profile.phone ? (
                    <Button
                      asChild
                      className="w-full rounded-2xl font-bold bg-primary text-white gap-2"
                    >
                      <a href={`tel:${profile.phone}`}>
                        <Phone className="h-4 w-4" /> Call Business
                      </a>
                    </Button>
                  ) : profile.email ? (
                    <Button
                      asChild
                      variant="outline"
                      className="w-full rounded-2xl font-bold gap-2"
                    >
                      <a href={`mailto:${profile.email}`}>
                        <Mail className="h-4 w-4" /> Email Business
                      </a>
                    </Button>
                  ) : null}

                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("contact")}
                    className="w-full rounded-2xl font-bold text-xs gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" /> Send Direct Inquiry
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Desktop Side Navigation Menu */}
            <Card className="hidden lg:block border-border/80 shadow-lg rounded-3xl overflow-hidden bg-card">
              <CardHeader className="py-3.5 px-5 bg-muted/40 border-b border-border/60">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Store className="h-4 w-4 text-primary" /> Navigation Pages
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md scale-[1.01]"
                          : "text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-primary"}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.count !== null && item.count > 0 && (
                        <Badge
                          className={`text-[10px] font-black px-2 py-0 rounded-full ${
                            isActive ? "bg-white text-primary" : "bg-primary/10 text-primary"
                          }`}
                        >
                          {item.count}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Right Main Content Section */}
          <div className="lg:col-span-8 space-y-5">
            {/* Mobile Horizontal Navigation Tabs */}
            <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all border ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-md"
                        : "bg-card text-foreground border-border/80 hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                    {item.count !== null && item.count > 0 && (
                      <span className="text-[10px] opacity-80">({item.count})</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* TAB 1: OVERVIEW / HOME PAGE */}
            {activeTab === "overview" && (
              <div className="space-y-5">
                {/* About & Bio Card */}
                <Card className="border-border/80 shadow-md rounded-3xl bg-card overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-extrabold flex items-center gap-2 text-foreground">
                      <Sparkles className="h-5 w-5 text-amber-500" /> About {fullName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {profile.bio ||
                        "Welcome to our official business profile. Explore our products, services, special offers, and contact us directly."}
                    </p>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div
                        onClick={() => setActiveTab("products")}
                        className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-center space-y-0.5 cursor-pointer hover:scale-[1.02] transition"
                      >
                        <span className="text-xl font-black text-primary">{products.length}</span>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Products</p>
                      </div>
                      <div
                        onClick={() => setActiveTab("sales")}
                        className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-0.5 cursor-pointer hover:scale-[1.02] transition"
                      >
                        <span className="text-xl font-black text-amber-600">{salesPages.length}</span>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Offers</p>
                      </div>
                      <div
                        onClick={() => setActiveTab("services")}
                        className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center space-y-0.5 cursor-pointer hover:scale-[1.02] transition"
                      >
                        <span className="text-xl font-black text-blue-600">{services.length}</span>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Services</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* YouTube Business Story Video Section */}
                {ytVideoId && (
                  <Card className="border-red-500/30 shadow-md rounded-3xl bg-card overflow-hidden">
                    <CardHeader className="pb-2 bg-red-500/5 border-b border-red-500/20">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-extrabold flex items-center gap-2 text-foreground">
                          <Video className="h-5 w-5 text-red-600" /> Watch Our Business Story
                        </CardTitle>
                        <Badge className="bg-red-600 text-white text-[10px] font-black gap-1">
                          <Play className="h-2.5 w-2.5 fill-white" /> Official Video
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-5">
                      <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-lg bg-black border border-border">
                        <iframe
                          src={`https://www.youtube.com/embed/${ytVideoId}?rel=0`}
                          title={`${fullName} Official Business Story`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full border-0"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Featured Products Showcase Preview (Clickable Products) */}
                {products.length > 0 && (
                  <Card className="border-border/80 shadow-md rounded-3xl bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-base font-extrabold flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-primary" /> Store Highlights
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab("products")}
                        className="text-xs font-bold text-primary gap-1"
                      >
                        View Store ({products.length}) <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {products.slice(0, 4).map((p) => {
                        const productUrl = `/products/${p.slug || p.id}`;
                        return (
                          <div
                            key={p.id}
                            className="group rounded-2xl border border-border/70 bg-card hover:shadow-lg transition-all p-3 space-y-2 flex flex-col justify-between"
                          >
                            <Link to={productUrl} className="space-y-2 block">
                              <div className="aspect-video rounded-xl bg-muted overflow-hidden relative">
                                {p.cover_image ? (
                                  <img
                                    src={p.cover_image}
                                    alt={p.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    <ShoppingBag className="h-8 w-8 opacity-40" />
                                  </div>
                                )}
                                <Badge className="absolute top-2 right-2 bg-black/60 text-white font-bold text-[9px] backdrop-blur-md">
                                  {p.product_type || "Product"}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition">
                                  {p.name}
                                </p>
                                <p className="text-xs font-extrabold text-primary">
                                  ₦{Number(p.price || 0).toLocaleString()}
                                </p>
                              </div>
                            </Link>

                            <div className="flex gap-2 pt-1">
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="flex-1 rounded-xl text-xs font-bold h-8"
                              >
                                <Link to={productUrl}>View Details</Link>
                              </Button>

                              {waClean && (
                                <Button
                                  asChild
                                  size="sm"
                                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-2.5"
                                >
                                  <a
                                    href={`https://wa.me/${waClean}?text=Hello!%20I'm%20interested%20in%20"${encodeURIComponent(
                                      p.name
                                    )}"%20for%20₦${p.price}`}
                                    target="_blank"
                                    rel="noopener"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* Featured Sales Offers Preview */}
                {salesPages.length > 0 && (
                  <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-card shadow-md rounded-3xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-base font-extrabold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        <Sparkles className="h-5 w-5 text-amber-500" /> Special Sales Offers
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab("sales")}
                        className="text-xs font-bold text-amber-600 gap-1"
                      >
                        All Offers ({salesPages.length}) <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {salesPages.slice(0, 2).map((sp) => (
                        <Link
                          key={sp.id}
                          to={`/sales/${sp.slug}`}
                          className="group p-3 rounded-2xl border border-amber-500/20 bg-card hover:shadow-lg transition-all space-y-2 block"
                        >
                          {sp.product_image_url && (
                            <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                              <img
                                src={sp.product_image_url}
                                alt={sp.product_name}
                                className="w-full h-full object-cover group-hover:scale-105 transition"
                              />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary">
                              {sp.headline || sp.product_name}
                            </p>
                            <p className="text-xs font-extrabold text-amber-600">
                              ₦{Number(sp.price || 0).toLocaleString()}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* TAB 2: PRODUCTS STORE PAGE */}
            {activeTab === "products" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-primary" /> Product Catalog ({products.length})
                  </h2>
                </div>

                {products.length === 0 ? (
                  <Card className="border-border/80 rounded-3xl p-12 text-center bg-card">
                    <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-bold">No Products Available</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This business has not uploaded products yet.
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {products.map((p) => {
                      const productUrl = `/products/${p.slug || p.id}`;
                      return (
                        <Card
                          key={p.id}
                          className="border-border/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all bg-card flex flex-col justify-between group"
                        >
                          <div>
                            <Link to={productUrl} className="block">
                              <div className="aspect-video bg-muted overflow-hidden relative">
                                {p.cover_image ? (
                                  <img
                                    src={p.cover_image}
                                    alt={p.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    <ShoppingBag className="h-10 w-10 opacity-30" />
                                  </div>
                                )}
                                <Badge className="absolute top-2 right-2 bg-black/60 text-white font-bold text-[10px] backdrop-blur-md">
                                  {p.product_type || "Product"}
                                </Badge>
                              </div>
                            </Link>

                            <CardContent className="p-4 space-y-2">
                              <Link to={productUrl} className="block">
                                <h3 className="text-base font-bold text-foreground line-clamp-1 group-hover:text-primary transition">
                                  {p.name}
                                </h3>
                              </Link>
                              {p.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                  {p.description}
                                </p>
                              )}
                              <p className="text-lg font-black text-primary">
                                ₦{Number(p.price || 0).toLocaleString()}
                              </p>
                            </CardContent>
                          </div>

                          <div className="p-4 pt-0 space-y-2">
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="w-full rounded-2xl font-bold text-xs h-9"
                            >
                              <Link to={productUrl}>View Product Details</Link>
                            </Button>

                            {waClean ? (
                              <Button
                                asChild
                                size="sm"
                                className="w-full rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs h-9"
                              >
                                <a
                                  href={`https://wa.me/${waClean}?text=Hello!%20I'm%20interested%20in%20buying%20"${encodeURIComponent(
                                    p.name
                                  )}"%20for%20₦${p.price}`}
                                  target="_blank"
                                  rel="noopener"
                                >
                                  <MessageCircle className="h-4 w-4" /> Order via WhatsApp
                                </a>
                              </Button>
                            ) : null}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SPECIAL SALES OFFERS PAGE */}
            {activeTab === "sales" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" /> Special Sales Pages & Offers ({salesPages.length})
                  </h2>
                </div>

                {salesPages.length === 0 ? (
                  <Card className="border-border/80 rounded-3xl p-12 text-center bg-card">
                    <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-bold">No Active Offers</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This business has no special sales landing pages yet.
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {salesPages.map((sp) => (
                      <Card
                        key={sp.id}
                        className="border-amber-500/30 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all bg-card flex flex-col justify-between"
                      >
                        <div>
                          {sp.product_image_url && (
                            <div className="aspect-video bg-muted overflow-hidden relative">
                              <img
                                src={sp.product_image_url}
                                alt={sp.product_name}
                                className="w-full h-full object-cover"
                              />
                              <Badge className="absolute top-2 right-2 bg-amber-600 text-white font-extrabold text-[10px]">
                                SPECIAL OFFER
                              </Badge>
                            </div>
                          )}
                          <CardContent className="p-4 space-y-2">
                            <h3 className="text-base font-bold text-foreground line-clamp-2">
                              {sp.headline || sp.product_name}
                            </h3>
                            {sp.subheadline && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {sp.subheadline}
                              </p>
                            )}
                            <p className="text-lg font-black text-amber-600">
                              ₦{Number(sp.price || 0).toLocaleString()}
                            </p>
                          </CardContent>
                        </div>

                        <div className="p-4 pt-0">
                          <Button
                            asChild
                            size="sm"
                            className="w-full rounded-2xl font-extrabold bg-gradient-to-r from-amber-500 to-orange-600 text-white gap-1.5 shadow-md"
                          >
                            <Link to={`/sales/${sp.slug}`}>
                              View Offer Page <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: SERVICES PAGE */}
            {activeTab === "services" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" /> Professional Services ({services.length})
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Explore verified client deliverables, request customized quotes, or book directly.
                    </p>
                  </div>
                </div>

                {services.length === 0 ? (
                  <Card className="border-border/80 rounded-3xl p-12 text-center bg-card">
                    <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-bold">No Services Listed</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This user has not listed services yet.
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {services.map((s, i) => (
                      <FeaturedServiceCard
                        key={i}
                        service={s}
                        businessName={fullName || "Verified Professional"}
                        ownerUserId={profile.id}
                        businessPhone={profile.phone}
                        businessWhatsApp={profile.whatsapp}
                        businessEmail={profile.email}
                        isVerified={isVerified}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: BUSINESSES PAGE */}
            {activeTab === "businesses" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" /> Registered Businesses ({businesses.length})
                  </h2>
                </div>

                {businesses.length === 0 ? (
                  <Card className="border-border/80 rounded-3xl p-12 text-center bg-card">
                    <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-bold">No Business Listings</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No directory listings submitted by this user.
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {businesses.map((b) => (
                      <Card
                        key={b.id}
                        className="border-border/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition bg-card"
                      >
                        <CardContent className="p-5 flex flex-col sm:flex-row items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-bold text-foreground">{b.name}</h3>
                              {isVerified && <VerifiedBadge verified={true} size="xs" />}
                              {b.categories?.name && (
                                <Badge variant="secondary" className="text-[10px] font-bold">
                                  {b.categories.name}
                                </Badge>
                              )}
                            </div>
                            {b.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {b.description}
                              </p>
                            )}
                            {b.city && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 font-semibold">
                                <MapPin className="h-3.5 w-3.5 text-primary" /> {b.city}
                              </p>
                            )}
                          </div>

                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="rounded-2xl shrink-0 font-bold text-xs gap-1"
                          >
                            <Link to={`/businesses/${b.slug}`}>
                              View Business Page <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: CONTACT & INQUIRY FORM */}
            {activeTab === "contact" && (
              <div className="space-y-5">
                <Card className="border-border/80 shadow-lg rounded-3xl bg-card overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg font-black flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" /> Send Direct Inquiry
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <form onSubmit={submitInquiry} className="space-y-4">
                      <div>
                        <Label className="text-xs font-bold mb-1.5 block">Your Full Name *</Label>
                        <Input
                          required
                          value={inquiry.name}
                          onChange={(e) => setInquiry({ ...inquiry, name: e.target.value })}
                          placeholder="E.g., Chidi Okafor"
                          className="rounded-xl text-xs h-10"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-bold mb-1.5 block">Phone / WhatsApp</Label>
                          <Input
                            value={inquiry.phone}
                            onChange={(e) => setInquiry({ ...inquiry, phone: e.target.value })}
                            placeholder="08012345678"
                            className="rounded-xl text-xs h-10"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-bold mb-1.5 block">Email Address</Label>
                          <Input
                            type="email"
                            value={inquiry.email}
                            onChange={(e) => setInquiry({ ...inquiry, email: e.target.value })}
                            placeholder="you@domain.com"
                            className="rounded-xl text-xs h-10"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs font-bold mb-1.5 block">Your Message / Inquiry</Label>
                        <Textarea
                          required
                          value={inquiry.message}
                          onChange={(e) => setInquiry({ ...inquiry, message: e.target.value })}
                          rows={4}
                          placeholder="Tell us what product or service you need details or pricing on..."
                          className="rounded-xl text-xs leading-relaxed"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={sendingInquiry}
                        className="w-full rounded-2xl font-extrabold bg-primary text-primary-foreground h-11 gap-2 shadow-md"
                      >
                        <Send className="h-4 w-4" />
                        {sendingInquiry ? "Sending Inquiry..." : "Submit Message to Owner"}
                      </Button>
                    </form>

                    {/* Social Channels List */}
                    {(sl.instagram || sl.facebook || sl.twitter || sl.linkedin || sl.website) && (
                      <div className="pt-4 border-t border-border/60 space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase">
                          Connect on Social Media
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {sl.website && <SocialBtn href={sl.website} icon={Globe} label="Website" />}
                          {sl.instagram && (
                            <SocialBtn href={sl.instagram} icon={Instagram} label="Instagram" />
                          )}
                          {sl.facebook && (
                            <SocialBtn href={sl.facebook} icon={Facebook} label="Facebook" />
                          )}
                          {sl.twitter && <SocialBtn href={sl.twitter} icon={Twitter} label="Twitter" />}
                          {sl.linkedin && (
                            <SocialBtn href={sl.linkedin} icon={Linkedin} label="LinkedIn" />
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Mobile Bottom Bar */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 px-3">
        <div className="bg-card/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl p-2 flex gap-2 max-w-md mx-auto">
          {waClean ? (
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs"
              size="sm"
              asChild
            >
              <a href={`https://wa.me/${waClean}`} target="_blank" rel="noopener">
                <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
              </a>
            </Button>
          ) : profile.email ? (
            <Button className="flex-1 rounded-xl font-bold text-xs" size="sm" asChild>
              <a href={`mailto:${profile.email}`}>
                <Mail className="h-4 w-4 mr-1" /> Email
              </a>
            </Button>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl font-bold text-xs"
            onClick={() => setActiveTab("contact")}
          >
            <Send className="h-3.5 w-3.5 mr-1" /> Inquiry
          </Button>

          <Button variant="secondary" size="sm" className="rounded-xl px-3" onClick={onShare}>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SocialBtn({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold">
      <a href={href} target="_blank" rel="noopener">
        <Icon className="h-3.5 w-3.5 mr-1 text-primary" />
        {label}
      </a>
    </Button>
  );
}
