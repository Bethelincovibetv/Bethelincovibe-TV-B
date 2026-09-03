import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone, MapPin, Globe, Mail, MessageCircle, Share2, Sparkles,
  CheckCircle2, Building2, Navigation, ChevronLeft, ExternalLink,
  Instagram, Facebook, Twitter, Linkedin, Briefcase, Youtube, Users, Play,
  ShoppingBag, Store, User, ArrowRight
} from "lucide-react";
import BusinessChatDialog from "@/components/BusinessChatDialog";
import ServicePreviewDialog from "@/components/ServicePreviewDialog";
import DirectServiceBookingDialog from "@/components/directory/DirectServiceBookingDialog";
import FeaturedServiceCard from "@/components/directory/FeaturedServiceCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import BusinessCard from "@/components/directory/BusinessCard";
import ProductCard from "@/components/directory/ProductCard";
import VerifiedBadge from "@/components/VerifiedBadge";
import BusinessMapView from "@/components/maps/BusinessMapView";
import GoogleMapsProvider from "@/components/maps/GoogleMapsProvider";
import BusinessDefaultLogo from "@/components/directory/BusinessDefaultLogo";
import { absUrl, ogImageUrl, resolveEntityOgImage, SITE_NAME } from "@/lib/seo";
import SEO from "@/components/SEO";
import { copyToClipboard } from "@/lib/clipboard";
import { toast } from "sonner";
import BrandedLoader from "@/components/BrandedLoader";
import { trackRecommenderSignal } from "@/lib/aiBusinessRecommenderEngine";
import RealLife3DShopModal from "@/components/shop/RealLife3DShopModal";

type Biz = any;

function track(businessId: string, type: string) {
  // fire-and-forget
  supabase.from("business_events").insert({
    business_id: businessId,
    type,
    referrer: typeof document !== "undefined" ? document.referrer.slice(0, 200) : null,
  });
}

export default function BusinessProfile() {
  const { slug } = useParams();
  const [biz, setBiz] = useState<Biz | null>(null);
  const [images, setImages] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<any | null>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [show3DShopModal, setShow3DShopModal] = useState(false);

  useEffect(() => {
    // Check if URL specifies shop3d=true or #3d to auto-open 3D mode
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("shop3d") === "true" || window.location.hash === "#3d") {
      setShow3DShopModal(true);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setRelated([]);
      setProducts([]);
      setOwnerProfile(null);
      
      const decodedSlug = slug ? decodeURIComponent(slug).trim() : "";
      const isUuid = /^[0-9a-f-]{36}$/i.test(decodedSlug);

      let foundBiz: any = null;

      const { data } = await supabase
        .from("suppliers")
        .select("*, categories(name, slug)")
        .eq(isUuid ? "id" : "slug", decodedSlug)
        .maybeSingle();

      if (data) {
        foundBiz = data;
      } else if (!isUuid) {
        const { data: ilikeData } = await supabase
          .from("suppliers")
          .select("*, categories(name, slug)")
          .ilike("slug", decodedSlug)
          .maybeSingle();
        if (ilikeData) foundBiz = ilikeData;
      }

      setBiz(foundBiz);
      if (foundBiz?.id) {
        const { data: imgs } = await supabase
          .from("supplier_images")
          .select("*")
          .eq("supplier_id", foundBiz.id)
          .order("display_order");
        setImages(imgs ?? []);
        track(foundBiz.id, "view");
        
        // Track AI Recommender signal
        try {
          trackRecommenderSignal({
            type: "business_view",
            entityId: foundBiz.id,
            entityName: foundBiz.name,
            categorySlug: foundBiz.categories?.slug || foundBiz.category,
            categoryName: foundBiz.categories?.name,
            keywords: [
              foundBiz.name,
              foundBiz.category,
              foundBiz.city,
              foundBiz.state,
              ...(Array.isArray(foundBiz.services) ? foundBiz.services.map((s: any) => typeof s === 'string' ? s : s.title) : [])
            ].filter(Boolean),
            location: foundBiz.city || foundBiz.state,
            path: `/businesses/${foundBiz.slug || foundBiz.id}`,
          });
        } catch {}

        // Fetch products submitted by business owner
        if (foundBiz.submitted_by) {
          const { data: prods } = await supabase
            .from("directory_products")
            .select("*, categories(name, slug)")
            .eq("user_id", foundBiz.submitted_by)
            .eq("active", true)
            .order("featured", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(6);
          setProducts(prods ?? []);

          const { data: prof } = await supabase
            .from("profiles")
            .select("username, display_name, avatar_url, bio, phone, whatsapp, email")
            .eq("user_id", foundBiz.submitted_by)
            .maybeSingle();
          setOwnerProfile(prof);
        }

        if (foundBiz.category_id) {
          const { data: rel } = await supabase
            .from("suppliers")
            .select("*, categories(name, slug)")
            .eq("active", true)
            .eq("status", "approved")
            .eq("category_id", foundBiz.category_id)
            .neq("id", foundBiz.id)
            .order("boosted_until", { ascending: false, nullsFirst: false })
            .limit(6);
          setRelated(rel ?? []);
        }
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <BrandedLoader
          message="Loading business profile..."
          submessage="Connecting to verified merchant storefront"
        />
      </div>
    );
  }

  if (!biz) {
    return (
      <div className="container mx-auto max-w-md px-4 py-20 text-center space-y-5">
        <div className="h-16 w-16 rounded-3xl bg-muted border border-border/80 flex items-center justify-center mx-auto text-muted-foreground">
          <Building2 className="h-8 w-8" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-foreground">Business Not Found</h1>
          <p className="text-sm text-muted-foreground">
            This business may have been unlisted, moved, or is awaiting verification.
          </p>
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <Button asChild variant="outline" className="rounded-xl font-bold">
            <Link to="/businesses">
              <ChevronLeft className="mr-1.5 h-4 w-4" /> Back to Directory
            </Link>
          </Button>
          <Button asChild className="rounded-xl font-bold">
            <Link to="/">Return Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const sl = biz.social_links || {};
  const isVerified = Boolean(biz.verified ?? (biz.status === "approved"));
  const isBoosted = biz.boosted_until && new Date(biz.boosted_until) > new Date();
  const allowDirectCalls = sl.allow_direct_calls !== false;
  const phoneClean = biz.phone?.replace(/\D/g, "");
  const waClean = (sl.whatsapp || biz.phone)?.replace(/\D/g, "");
  const waGroupUrl = sl.whatsapp_group || sl.whatsapp_group_url || biz.whatsapp_group_url;
  const youtubeUrl = sl.youtube || sl.youtube_url || biz.youtube_url || biz.youtube_video_url;

  const getEmbedYoutubeUrl = (url?: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

  const embedYoutube = getEmbedYoutubeUrl(youtubeUrl);
  const seoTitle = `${biz.name}${biz.categories?.name ? ` — ${biz.categories.name}` : ""} | Lagos Business Directory`;
  const seoDesc = (biz.description?.slice(0, 155)) ||
    `Contact ${biz.name} — ${biz.categories?.name || "Lagos business"}${biz.address ? ` located at ${biz.address}` : ""}. View phone, address, website and more.`;

  const canonical = absUrl(`/businesses/${biz.slug}`);
  const heroImage = biz.cover_url || biz.logo_url || images[0]?.image_url;
  const ogImage = resolveEntityOgImage({
    primaryImage: heroImage,
    title: biz.name,
    subtitle: biz.categories?.name ? `${biz.categories.name} · Lagos` : "Lagos business",
    badge: "Verified Business",
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": canonical,
    name: biz.name,
    description: biz.description,
    image: [heroImage, ...images.map((i: any) => i.image_url)].filter(Boolean).slice(0, 6),
    telephone: biz.phone,
    address: biz.address
      ? { "@type": "PostalAddress", streetAddress: biz.address, addressLocality: "Lagos", addressCountry: "NG" }
      : undefined,
    url: canonical,
    ...(biz.website ? { hasMap: undefined, sameAs: [biz.website, ...Object.values(sl)].filter(Boolean) } : { sameAs: Object.values(sl).filter(Boolean) }),
    ...(biz.categories?.name ? { additionalType: biz.categories.name } : {}),
  };

  const onShare = async () => {
    track(biz.id, "share");
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) { try { await navigator.share({ title: biz.name, url }); return; } catch {} }
    const success = await copyToClipboard(url);
    if (success) {
      toast.success("Business profile link copied!");
    }
  };

  const services: any[] = Array.isArray(biz.services) ? biz.services : [];

  return (
    <>
      <SEO
        title={seoTitle}
        description={seoDesc}
        url={`/businesses/${biz.slug}`}
        type="business.business"
        image={ogImage}
        jsonLd={jsonLd}
      />

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-32 md:pb-12">
        {/* Hero / Cover */}
        <div className={`relative h-52 sm:h-72 overflow-hidden ${
          biz.cover_template === "emerald" ? "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600" :
          biz.cover_template === "sunset"  ? "bg-gradient-to-br from-orange-500 via-pink-500 to-rose-600" :
          biz.cover_template === "ocean"   ? "bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700" :
          biz.cover_template === "noir"    ? "bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" :
          biz.cover_template === "gold"    ? "bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-600" :
          "bg-gradient-to-br from-primary via-primary/80 to-accent"
        }`}>
          {(biz.cover_url || images[0]?.image_url) && (
            <img src={biz.cover_url || images[0].image_url} alt={biz.name} className="absolute inset-0 w-full h-full object-cover opacity-35" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
          <Button asChild size="sm" variant="secondary" className="absolute top-3 left-3 shadow-md h-9">
            <Link to="/businesses"><ChevronLeft className="h-4 w-4 mr-1" />Directory</Link>
          </Button>
          {isBoosted && (
            <Badge className="absolute top-3 right-3 bg-amber-500 hover:bg-amber-500 text-white shadow-md gap-1">
              <Sparkles className="h-3 w-3" />Sponsored
            </Badge>
          )}
        </div>

        <div className="container mx-auto max-w-5xl px-4 -mt-14 relative z-10">
          {/* Identity card */}
          <Card className="overflow-visible shadow-xl border-0 bg-card rounded-2xl">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl ring-4 ring-card bg-card overflow-hidden flex items-center justify-center text-2xl font-bold text-primary shadow-xl flex-shrink-0 -mt-12 sm:-mt-14 relative z-20">
                  {biz.logo_url ? (
                    <img
                      src={biz.logo_url}
                      alt={biz.name}
                      className="w-full h-full object-contain p-1.5 bg-card"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <BusinessDefaultLogo name={biz.name} category={biz.categories?.name} size="lg" shape="rounded-2xl" className="w-full h-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold leading-tight truncate">{biz.name}</h1>
                    <VerifiedBadge verified={true} size="md" />
                  </div>
                  <div className="flex items-center gap-3 flex-wrap mt-0.5">
                    {biz.categories && (
                      <Link to={`/businesses?category=${biz.categories.slug}`} className="text-sm text-primary font-medium hover:underline">
                        {biz.categories.name}
                      </Link>
                    )}
                    {ownerProfile?.username && (
                      <Link
                        to={`/u/${ownerProfile.username}`}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition font-medium"
                      >
                        <User className="h-3 w-3" />
                        <span>@{ownerProfile.username}</span>
                      </Link>
                    )}
                  </div>
                  {biz.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />{biz.address}
                    </p>
                  )}
                </div>

                {/* 3D Real Life Shop Trigger on profile header */}
                <div className="hidden sm:block shrink-0 pt-1">
                  <Button
                    onClick={() => setShow3DShopModal(true)}
                    className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-white font-black text-xs rounded-2xl shadow-lg gap-2 h-10 px-4 active:scale-95"
                  >
                    <Store className="h-4 w-4" />
                    <span>Enter 3D Shop</span>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  </Button>
                </div>
              </div>

              {/* Quick action chips (desktop) */}
              <div className="mt-5 hidden md:grid grid-cols-7 gap-2">
                <ActionBtn
                  icon={Store}
                  label="3D Shop"
                  highlight
                  onClick={() => setShow3DShopModal(true)}
                />
                {biz.phone && allowDirectCalls && <ActionBtn icon={Phone} label="Call" onClick={() => { 
                  track(biz.id, "call"); 
                  try { trackRecommenderSignal({ type: "business_contact", entityId: biz.id, entityName: biz.name, categorySlug: biz.categories?.slug || biz.category, categoryName: biz.categories?.name, keywords: [biz.name, biz.category].filter(Boolean), location: biz.city || biz.state }); } catch {}
                  window.location.href = `tel:${biz.phone}`; 
                }} />}
                {waClean && <ActionBtn icon={MessageCircle} label="WhatsApp" onClick={() => { 
                  track(biz.id, "whatsapp"); 
                  try { trackRecommenderSignal({ type: "business_contact", entityId: biz.id, entityName: biz.name, categorySlug: biz.categories?.slug || biz.category, categoryName: biz.categories?.name, keywords: [biz.name, biz.category].filter(Boolean), location: biz.city || biz.state }); } catch {}
                  window.open(`https://wa.me/${waClean}`); 
                }} />}
                {waGroupUrl && (
                  <ActionBtn
                    icon={Users}
                    label="Community"
                    highlight
                    onClick={() => { 
                      track(biz.id, "whatsapp_group"); 
                      try { trackRecommenderSignal({ type: "business_contact", entityId: biz.id, entityName: biz.name, categorySlug: biz.categories?.slug || biz.category, categoryName: biz.categories?.name, keywords: [biz.name, biz.category].filter(Boolean), location: biz.city || biz.state }); } catch {}
                      window.open(waGroupUrl, "_blank"); 
                    }}
                  />
                )}
                <BusinessChatDialog businessId={biz.id} businessName={biz.name} trigger={
                  <button onClick={() => {
                    try { trackRecommenderSignal({ type: "business_contact", entityId: biz.id, entityName: biz.name, categorySlug: biz.categories?.slug || biz.category, categoryName: biz.categories?.name, keywords: [biz.name, biz.category].filter(Boolean), location: biz.city || biz.state }); } catch {}
                  }} className="flex flex-col items-center gap-1 p-3 rounded-xl border bg-card hover:bg-secondary transition active:scale-95">
                    <MessageCircle className="h-5 w-5 text-primary" /><span className="text-xs font-medium">Message</span>
                  </button>
                } />
                {biz.website && <ActionBtn icon={Globe} label="Website" onClick={() => { track(biz.id, "website"); window.open(biz.website, "_blank"); }} />}
                <ActionBtn icon={Share2} label="Share" onClick={onShare} />
              </div>
            </CardContent>
          </Card>

          {/* 3D Real Life Shop Entrance Banner */}
          <Card className="mt-4 border-2 border-amber-500/40 bg-gradient-to-r from-neutral-950 via-neutral-900 to-amber-950/40 text-white overflow-hidden shadow-xl rounded-2xl">
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-neutral-950 flex items-center justify-center font-black shadow-lg shrink-0">
                  <Store className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base sm:text-lg text-white">
                      Step Inside Our 3D Real Life Showroom
                    </h3>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-black uppercase">
                      3D Boutique
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-300 mt-0.5">
                    Walk through virtual aisles, inspect products on 3D pedestals, and order directly with zero middleman markup.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShow3DShopModal(true)}
                className="w-full sm:w-auto bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-90 text-white font-extrabold rounded-xl h-10 px-5 gap-2 shadow-xl shrink-0 active:scale-95"
              >
                <Store className="h-4 w-4" /> Enter 3D Storefront
              </Button>
            </CardContent>
          </Card>

          {/* WhatsApp Community Banner */}
          {waGroupUrl && (
            <Card className="mt-4 border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-emerald-900/10 to-teal-950/20 overflow-hidden shadow-sm">
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base sm:text-lg text-emerald-900 dark:text-emerald-300">
                        Join Our Official WhatsApp Community
                      </h3>
                      <Badge className="bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                        Active
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Get real-time updates, direct announcements, member-only discounts, and fast support.
                    </p>
                  </div>
                </div>
                <Button asChild className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 shrink-0 shadow-md">
                  <a href={waGroupUrl} target="_blank" rel="noopener noreferrer" onClick={() => track(biz.id, "whatsapp_group")}>
                    <Users className="h-4 w-4" /> Join WhatsApp Group
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* YouTube Video Showcase Card */}
          {embedYoutube && (
            <Card className="mt-4 overflow-hidden border-2 border-red-500/20 shadow-md">
              <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 px-4 py-2.5 text-white flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Youtube className="h-5 w-5 fill-white text-red-600" /> Featured Video & Product Showcase
                </div>
                <Badge variant="outline" className="text-white border-white/40 text-[10px]">
                  Official Media
                </Badge>
              </div>
              <div className="aspect-video w-full bg-black">
                <iframe
                  src={embedYoutube}
                  title={`${biz.name} Video Showcase`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </Card>
          )}

          {/* About */}
          {biz.description && (
            <Card className="mt-4">
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">About</h2>
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{biz.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Services - clickable to chat & direct booking */}
          {services.length > 0 && (
            <Card className="mt-4 border-primary/20 shadow-sm overflow-hidden bg-gradient-to-b from-card to-card/60">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2 mb-5">
                  <div>
                    <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-foreground flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      Featured Services &amp; Solutions ({services.length})
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Professional verified services. Inquire directly or book seamlessly with instant provider notification.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {services.map((svc: any, i: number) => (
                    <FeaturedServiceCard
                      key={i}
                      service={svc}
                      businessId={biz.id}
                      businessName={biz.name}
                      ownerUserId={biz.submitted_by}
                      businessPhone={biz.phone || ownerProfile?.phone}
                      businessWhatsApp={biz.whatsapp || sl?.whatsapp || ownerProfile?.whatsapp}
                      businessEmail={sl?.email || ownerProfile?.email}
                      isVerified={isVerified}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Products & Store Section */}
          {products.length > 0 && (
            <Card className="mt-4 border-primary/20 shadow-sm overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <ShoppingBag className="h-4 w-4 text-primary" /> Products &amp; Store
                  </h2>
                  <Button asChild variant="ghost" size="sm" className="text-xs text-primary font-semibold gap-1 h-7">
                    <Link to="/products">
                      Marketplace <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {products.map((prod: any) => (
                    <ProductCard key={prod.id} product={prod} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gallery - Includes all business and service photos */}
          {(() => {
            const servicePhotos = services
              .filter((s: any) => s && (s.image_url || s.flyer_creative_url || s.photo_url || s.image))
              .map((s: any, idx: number) => ({
                id: `srv-${idx}`,
                image_url: s.image_url || s.flyer_creative_url || s.photo_url || s.image,
                caption: s.title || "Service Photo",
              }));
            const allGalleryPhotos = [...images, ...servicePhotos].filter(
              (img, idx, self) => img.image_url && self.findIndex((t) => t.image_url === img.image_url) === idx
            );

            if (allGalleryPhotos.length === 0) return null;

            return (
              <Card className="mt-4">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Business Gallery &amp; Photos ({allGalleryPhotos.length})
                    </h2>
                    <Badge variant="outline" className="text-[10px]">Verified Media</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {allGalleryPhotos.map((img: any) => (
                      <a key={img.id} href={img.image_url} target="_blank" rel="noopener" className="block aspect-square rounded-xl overflow-hidden bg-muted group relative">
                        <img src={img.image_url} alt={img.caption || biz.name} className="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" />
                        {img.caption && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 text-[10px] text-white truncate">
                            {img.caption}
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Contact & Google Maps Section */}
          <Card className="mt-4">
            <CardContent className="p-5 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Contact &amp; Physical Address
              </h2>
              <div className="grid gap-2">
                {biz.phone && <InfoRow icon={Phone} label="Phone" value={biz.phone} href={`tel:${biz.phone}`} onClick={() => track(biz.id, "call")} />}
                {sl.email && <InfoRow icon={Mail} label="Email" value={sl.email} href={`mailto:${sl.email}`} onClick={() => track(biz.id, "email")} />}
                {biz.website && <InfoRow icon={Globe} label="Website" value={biz.website} href={biz.website} external onClick={() => track(biz.id, "website")} />}
                {biz.address && (
                  <InfoRow
                    icon={Navigation} label="Address" value={biz.address}
                    href={`https://maps.google.com/?q=${encodeURIComponent(biz.address)}`} external
                    onClick={() => track(biz.id, "directions")}
                  />
                )}
              </div>

              {/* Socials */}
              {(sl.instagram || sl.facebook || sl.twitter || sl.linkedin || youtubeUrl) && (
                <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                  {sl.instagram && <SocialBtn href={sl.instagram} icon={Instagram} label="Instagram" />}
                  {sl.facebook && <SocialBtn href={sl.facebook} icon={Facebook} label="Facebook" />}
                  {sl.twitter && <SocialBtn href={sl.twitter} icon={Twitter} label="Twitter" />}
                  {sl.linkedin && <SocialBtn href={sl.linkedin} icon={Linkedin} label="LinkedIn" />}
                  {youtubeUrl && <SocialBtn href={youtubeUrl} icon={Youtube} label="YouTube" />}
                </div>
              )}

              {/* Interactive Google Map */}
              <div className="mt-4 pt-4 border-t">
                <GoogleMapsProvider>
                  <BusinessMapView
                    businessName={biz.name}
                    address={biz.address}
                    city={biz.city || "Lagos"}
                    state={biz.state || "Lagos State"}
                    country={biz.country || "Nigeria"}
                    latitude={biz.latitude ? parseFloat(biz.latitude) : null}
                    longitude={biz.longitude ? parseFloat(biz.longitude) : null}
                    phone={biz.phone}
                    whatsapp={waClean}
                  />
                </GoogleMapsProvider>
              </div>
            </CardContent>
          </Card>

          {related.length > 0 && (
            <section className="mt-8" aria-labelledby="related-biz">
              <h2 id="related-biz" className="mb-3 text-lg font-bold">
                More {biz.categories?.name?.toLowerCase() || "businesses"} in Lagos
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((r: any) => <BusinessCard key={r.id} business={r} />)}
              </div>
              {biz.categories?.slug && (
                <div className="mt-4 text-center">
                  <Button asChild variant="outline">
                    <Link to={`/businesses/category/${biz.categories.slug}`}>
                      View all {biz.categories.name} businesses
                    </Link>
                  </Button>
                </div>
              )}
            </section>
          )}

          <Breadcrumbs
            className="mt-8 justify-center"
            items={[
              { label: "Businesses", href: "/businesses" },
              ...(biz.categories ? [{ label: biz.categories.name, href: `/businesses/category/${biz.categories.slug}` }] : []),
              { label: biz.name },
            ]}
          />

          <p className="text-center text-xs text-muted-foreground mt-4">
            Are you the owner? <Link to="/dashboard/businesses" className="text-primary underline">Manage this listing</Link>
          </p>
        </div>

        {/* Sticky mobile CTA bar */}
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 px-3">
          <div className="bg-card/95 backdrop-blur border shadow-xl rounded-2xl p-2 flex gap-2 max-w-md mx-auto">
            {biz.phone && allowDirectCalls && (
              <Button className="flex-1" size="sm" onClick={() => { track(biz.id, "call"); window.location.href = `tel:${biz.phone}`; }}>
                <Phone className="h-4 w-4 mr-1" />Call
              </Button>
            )}
            {waClean && (
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" size="sm" onClick={() => { track(biz.id, "whatsapp"); window.open(`https://wa.me/${waClean}`); }}>
                <MessageCircle className="h-4 w-4 mr-1" />Chat
              </Button>
            )}
            {waGroupUrl && (
              <Button className="bg-emerald-700 hover:bg-emerald-800 text-white" size="sm" onClick={() => { track(biz.id, "whatsapp_group"); window.open(waGroupUrl, "_blank"); }}>
                <Users className="h-4 w-4 mr-1" />Group
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onShare}><Share2 className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Real Life 3D Shop Modal */}
        <RealLife3DShopModal
          open={show3DShopModal}
          onOpenChange={setShow3DShopModal}
          business={biz}
          products={products}
          services={services}
        />
      </div>
    </>
  );
}

function ActionBtn({ icon: Icon, label, onClick, highlight }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition active:scale-95 ${
        highlight
          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
          : "bg-card hover:bg-secondary"
      }`}
    >
      <Icon className={`h-5 w-5 ${highlight ? "text-emerald-600 dark:text-emerald-400" : "text-primary"}`} />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function InfoRow({ icon: Icon, label, value, href, external, onClick }: any) {
  const content = (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/60 transition min-w-0 max-w-full">
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0"><Icon className="h-4 w-4" /></div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate" title={typeof value === "string" ? value : undefined}>{value}</p>
      </div>
      {external && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
    </div>
  );
  return href ? <a href={href} target={external ? "_blank" : undefined} rel="noopener" onClick={onClick} className="block min-w-0 max-w-full no-underline">{content}</a> : content;
}

function SocialBtn({ href, icon: Icon, label }: any) {
  return (
    <Button asChild size="sm" variant="outline" className="rounded-full">
      <a href={href} target="_blank" rel="noopener"><Icon className="h-4 w-4 mr-1" />{label}</a>
    </Button>
  );
}
