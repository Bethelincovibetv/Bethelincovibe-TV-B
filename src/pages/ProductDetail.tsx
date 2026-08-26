import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  MessageCircle, Phone, MapPin, Package, ShieldCheck, ArrowLeft,
  CheckCircle2, Share2, Copy, Sparkles, Truck, Lock, Eye, Maximize2,
  ChevronRight, ThumbsUp, Clock, Heart, Building2, ExternalLink, AlertCircle,
  Download, Zap, FileText, Check, HelpCircle, Star, Award, Layers, Play
} from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProductCard, { formatPrice, DirectoryProduct } from "@/components/directory/ProductCard";
import ProductVideo from "@/components/directory/ProductVideo";
import BuyDigitalProduct from "@/components/directory/BuyDigitalProduct";
import FavoriteButton from "@/components/FavoriteButton";
import { recordPageView } from "@/lib/analyticsTracker";
import { absUrl, ogImageUrl, SITE_NAME, truncate } from "@/lib/seo";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";

export default function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<DirectoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const isUuid = /^[0-9a-f-]{36}$/i.test(slug || "");
      const { data } = await supabase
        .from("directory_products")
        .select("*, categories(name, slug)")
        .eq(isUuid ? "id" : "slug", slug!)
        .eq("active", true)
        .maybeSingle();

      setProduct(data);

      if (data) {
        // Increment view count & log analytics
        supabase
          .from("directory_products")
          .update({ views_count: (data.views_count || 0) + 1 })
          .eq("id", data.id)
          .then(() => {}, () => {});

        recordPageView({
          path: window.location.pathname,
          title: data.name,
          featureType: "product",
          entityId: data.id,
        });

        // Load seller profile
        if (data.user_id) {
          const { data: p } = await supabase
            .from("profiles")
            .select("display_name, username, avatar_url, whatsapp, bio")
            .eq("user_id", data.user_id)
            .maybeSingle();
          setSeller(p);
        }

        // Fetch related products
        const { data: related } = await supabase
          .from("directory_products")
          .select("*, categories(name, slug)")
          .eq("active", true)
          .neq("id", data.id)
          .order("views_count", { ascending: false })
          .limit(4);

        if (related) {
          setRelatedProducts(related as DirectoryProduct[]);
        }
      }

      setLoading(false);
    })();
  }, [slug]);

  const copyProductLink = async () => {
    const currentUrl = window.location.href;
    const success = await copyToClipboard(currentUrl);
    if (success) {
      toast.success("Product link copied to clipboard!");
    } else {
      toast.info("Link: " + currentUrl);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-xs font-semibold text-muted-foreground">Loading sales page details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Package className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold">Product Not Found</h2>
        <p className="mt-1 text-sm text-muted-foreground">This item may have been removed or is no longer available.</p>
        <Button asChild className="mt-6 font-bold">
          <Link to="/products">Browse Marketplace</Link>
        </Button>
      </div>
    );
  }

  const isDigital =
    product.product_type === "digital" ||
    product.condition === "digital" ||
    product.categories?.slug?.includes("digital") ||
    product.categories?.slug?.includes("course") ||
    product.categories?.slug?.includes("ebook") ||
    product.categories?.slug?.includes("template") ||
    product.categories?.slug?.includes("software");

  const imgs: string[] = [product.cover_image, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean);
  const waNumber = (product.whatsapp || seller?.whatsapp || "").replace(/[^\d]/g, "");
  const formattedPriceStr = formatPrice(product.price, product.currency);
  const regularAnchorPrice = product.price ? Math.round(Number(product.price) * 2.2) : 0;
  const formattedRegularAnchor = regularAnchorPrice ? formatPrice(regularAnchorPrice, product.currency) : "";

  const waMessage = encodeURIComponent(
    isDigital
      ? `Hello! I want to get instant access to "${product.name}" (${formattedPriceStr}) listed on ${SITE_NAME}.\n\nPage link: ${window.location.href}`
      : `Hello! I'm interested in ordering "${product.name}" (${formattedPriceStr}) listed on ${SITE_NAME}.\n\nPage link: ${window.location.href}`
  );

  const pageTitle = `${product.name} — ${formattedPriceStr} | ${SITE_NAME}`;
  const pageDesc = truncate(
    product.description ||
      (isDigital
        ? `Get instant digital access to ${product.name} on ${SITE_NAME}. Instant download, lifetime access & verified delivery.`
        : `Order ${product.name} in Lagos on ${SITE_NAME}. Verified seller & fast delivery.`),
    160
  );
  const canonicalUrl = absUrl(`/products/${product.slug || product.id}`);

  // Format product description lines into structured sales copy
  const descParagraphs = (product.description || "")
    .split("\n")
    .map((p: string) => p.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-muted/20 pb-28 sm:pb-20 w-full max-w-full overflow-x-hidden">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={product.name} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={imgs[0] || ogImageUrl({ title: product.name, subtitle: pageDesc, badge: isDigital ? "Digital Product" : "Product" })} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: pageDesc,
          image: imgs,
          category: product.categories?.name,
          offers: {
            "@type": "Offer",
            price: product.price || 0,
            priceCurrency: product.currency || "NGN",
            availability: (product.stock ?? 1) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: canonicalUrl,
          },
        })}</script>
      </Helmet>

      {/* Top Banner Notice */}
      {isDigital ? (
        <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-indigo-900 text-white text-[11px] sm:text-xs py-2.5 px-3 text-center font-bold shadow-xs">
          <div className="container mx-auto flex items-center justify-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-[10px] shrink-0 font-extrabold">
              <Zap className="h-3 w-3 text-amber-300 fill-amber-300" /> INSTANT DIGITAL DELIVERY
            </span>
            <span className="truncate max-w-full">
              Automated File Access via Screen, Email &amp; WhatsApp in under 30 seconds • Lifetime Access &amp; Free Updates
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-purple-900 via-primary to-indigo-900 text-white text-[11px] sm:text-xs py-2 px-3 text-center font-medium shadow-xs">
          <div className="container mx-auto flex items-center justify-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 font-bold bg-white/20 px-2 py-0.5 rounded-full text-[10px] shrink-0">
              <ShieldCheck className="h-3 w-3 text-emerald-300" /> VERIFIED PHYSICAL LISTING
            </span>
            <span className="truncate max-w-full">Direct Seller Contact • Fast Delivery Across Lagos &amp; Nigeria</span>
          </div>
        </div>
      )}

      <div className="container mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-6 space-y-6 sm:space-y-8">
        <div className="overflow-x-auto pb-1">
          <Breadcrumbs items={[{ label: "Marketplace", href: "/products" }, { label: product.name }]} />
        </div>

        {/* ========================================================================= */}
        {/* CASE A: HIGH-CONVERTING DIGITAL PRODUCT SALES PAGE LAYOUT               */}
        {/* ========================================================================= */}
        {isDigital ? (
          <div className="space-y-8 sm:space-y-12">
            
            {/* HERO SALES BANNER & CHECKOUT SPOTLIGHT */}
            <div className="grid gap-6 lg:grid-cols-12 items-start">
              
              {/* LEFT: 3D Digital Mockup & Video Preview (7 Cols) */}
              <div className="lg:col-span-7 space-y-4 min-w-0">
                <Card className="overflow-hidden border-border/80 shadow-xl rounded-3xl bg-card">
                  <CardContent className="p-3 sm:p-5 space-y-3">
                    <div className="relative aspect-4/3 sm:aspect-16/10 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 group shadow-inner">
                      {imgs[activeImg] ? (
                        <img
                          src={imgs[activeImg]}
                          alt={product.name}
                          className="h-full w-full object-contain p-2 sm:p-4 transition-transform duration-500 group-hover:scale-105 cursor-pointer drop-shadow-2xl"
                          onClick={() => setLightboxOpen(true)}
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center text-white p-6 text-center space-y-2">
                          <Download className="h-16 w-16 text-primary animate-bounce opacity-90" />
                          <p className="text-lg font-black">{product.name}</p>
                          <span className="text-xs text-white/70">Instant Digital Download</span>
                        </div>
                      )}

                      {/* Badges Overlay */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[85%]">
                        <Badge className="bg-emerald-600 text-white font-black text-xs shadow-md border-0 gap-1">
                          <Zap className="h-3 w-3 fill-current" /> Instant Download
                        </Badge>
                        {product.categories && (
                          <Badge className="bg-background/90 text-foreground font-bold backdrop-blur text-xs border">
                            {product.categories.name}
                          </Badge>
                        )}
                      </div>

                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <button
                          onClick={() => setLightboxOpen(true)}
                          className="h-8 w-8 rounded-xl bg-background/80 hover:bg-background text-foreground backdrop-blur flex items-center justify-center shadow-md transition"
                          title="View Fullscreen"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Live View & Download Count Pill */}
                      <div className="absolute bottom-3 left-3 bg-black/80 text-white backdrop-blur text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/10">
                        <Eye className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span>{product.views_count || 48} views</span>
                        <span className="opacity-40">•</span>
                        <Download className="h-3 w-3 text-emerald-400 shrink-0" />
                        <span>{product.sales_count || 14} copies unlocked</span>
                      </div>
                    </div>

                    {/* Gallery Thumbnails */}
                    {imgs.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
                        {imgs.map((src, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveImg(i)}
                            className={`h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition ${
                              i === activeImg ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border/60 opacity-70 hover:opacity-100"
                            }`}
                          >
                            <img src={src} alt="" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Prominent Embedded YouTube / Video Showcase */}
                {product.video_url && (
                  <Card className="border-red-500/30 bg-gradient-to-r from-red-500/5 via-rose-500/5 to-card shadow-lg rounded-3xl overflow-hidden">
                    <CardContent className="p-4 sm:p-6 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm sm:text-base font-black flex items-center gap-2 text-foreground">
                          <div className="h-7 w-7 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
                            <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                          </div>
                          <span>Watch Video Walkthrough &amp; Preview</span>
                        </h3>
                        <Badge variant="outline" className="text-[10px] font-extrabold border-red-500/30 text-red-600 dark:text-red-400">
                          HD Preview
                        </Badge>
                      </div>
                      <ProductVideo url={product.video_url} title={product.name} />
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* RIGHT: High-Converting Sales Card & Checkout (5 Cols) */}
              <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20 min-w-0">
                <Card className="border-border/80 shadow-2xl rounded-3xl overflow-hidden bg-card min-w-0">
                  <div className="bg-gradient-to-r from-emerald-500/15 via-primary/10 to-transparent p-4 sm:p-5 border-b border-border/60">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge className="bg-emerald-600 text-white font-extrabold text-[11px] px-2.5 py-0.5">
                        ⚡ Official Digital Access
                      </Badge>
                      <span className="text-[11px] font-extrabold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> In Stock &amp; Ready
                      </span>
                    </div>

                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground tracking-tight leading-snug break-words">
                      {product.name}
                    </h1>

                    <p className="text-xs font-medium text-muted-foreground mt-1">
                      Direct digital access delivered automatically upon checkout.
                    </p>
                  </div>

                  <CardContent className="p-4 sm:p-6 space-y-5 min-w-0">
                    {/* Price & Discount Anchor */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-primary/10 to-muted/40 border border-emerald-500/20 space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <div>
                          {formattedRegularAnchor && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground line-through font-semibold">
                                {formattedRegularAnchor}
                              </span>
                              <Badge className="bg-red-500 text-white font-black text-[10px] py-0 px-1.5 rounded-md">
                                Save 55%
                              </Badge>
                            </div>
                          )}
                          <p className="text-3xl sm:text-4xl font-black text-emerald-600 tracking-tight">
                            {formattedPriceStr}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase text-right block">
                          One-Time Payment<br />Lifetime Access
                        </span>
                      </div>

                      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] font-bold text-foreground">
                        <span className="flex items-center gap-1 text-emerald-600">
                          <Check className="h-3.5 w-3.5" /> Instant delivery
                        </span>
                        <span className="flex items-center gap-1 text-primary">
                          <Check className="h-3.5 w-3.5" /> 100% Secure Checkout
                        </span>
                      </div>
                    </div>

                    {/* Paystack Automated Buy & Download Button */}
                    <div className="space-y-3">
                      <BuyDigitalProduct product={product} />

                      {waNumber && (
                        <Button
                          asChild
                          size="lg"
                          className="w-full h-12 rounded-2xl font-black text-sm sm:text-base bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 gap-2 transition-transform active:scale-[0.98]"
                        >
                          <a href={`https://wa.me/${waNumber}?text=${waMessage}`} target="_blank" rel="noopener">
                            <MessageCircle className="h-5 w-5 fill-current" />
                            Get Access via WhatsApp Directly
                          </a>
                        </Button>
                      )}
                    </div>

                    {/* Deliverables Checklist Highlights */}
                    <div className="space-y-2 rounded-2xl bg-muted/40 p-3.5 border border-border/70 text-xs">
                      <p className="font-extrabold text-foreground flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-primary" /> What's Included in Your Purchase:
                      </p>
                      <ul className="space-y-1.5 text-muted-foreground font-medium">
                        <li className="flex items-start gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>Full high-resolution master files and digital guide</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>Automated file link sent directly to your email and WhatsApp</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>Lifetime access &amp; free future updates</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>Direct creator customer support for questions</span>
                        </li>
                      </ul>
                    </div>

                    {/* Security & Guarantee Pills */}
                    <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-bold text-muted-foreground">
                      <div className="p-2 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-center gap-1.5">
                        <Lock className="h-3 w-3 text-emerald-600" />
                        <span>Paystack 256-Bit SSL</span>
                      </div>
                      <div className="p-2 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-center gap-1.5">
                        <Zap className="h-3 w-3 text-amber-500" />
                        <span>Instant Auto-Unlock</span>
                      </div>
                    </div>

                    {/* Secondary Utilities Bar */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                      <div className="flex-1 min-w-0">
                        <FavoriteButton postId={product.id} />
                      </div>
                      <Button variant="outline" size="sm" onClick={copyProductLink} className="gap-1.5 rounded-xl text-xs font-semibold shrink-0">
                        <Share2 className="h-3.5 w-3.5" /> Share Offer
                      </Button>
                    </div>

                    {/* Creator Box */}
                    {seller && (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-muted/50 to-muted/20 border border-border/70 space-y-2.5 min-w-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-11 w-11 rounded-2xl bg-primary/10 overflow-hidden flex items-center justify-center font-bold text-primary shrink-0 ring-2 ring-primary/20">
                            {seller.avatar_url ? (
                              <img src={seller.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              (seller.display_name || "S").charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs sm:text-sm font-black text-foreground">{seller.display_name || "Verified Creator"}</p>
                            <p className="flex items-center gap-1 text-[10px] sm:text-[11px] text-emerald-600 font-bold mt-0.5 truncate">
                              <Award className="h-3.5 w-3.5 shrink-0" /> Verified Digital Creator
                            </p>
                          </div>
                        </div>

                        {seller.username && (
                          <Button asChild variant="secondary" size="sm" className="w-full rounded-xl text-xs font-bold gap-1 h-9">
                            <Link to={`/u/${seller.username}`}>
                              <Building2 className="h-3.5 w-3.5" /> Visit Creator Storefront <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    )}

                  </CardContent>
                </Card>
              </div>

            </div>

            {/* DETAILED SALES PAGE SECTIONS: Write-up, Benefits & FAQ */}
            <div className="grid gap-6 lg:grid-cols-12 items-start">
              <div className="lg:col-span-8 space-y-6">

                {/* 1. Full Sales Copy / Detailed Description */}
                <Card className="border-border/80 shadow-md rounded-3xl overflow-hidden bg-card">
                  <div className="bg-gradient-to-r from-primary/10 via-indigo-500/5 to-transparent p-5 border-b border-border/60">
                    <Badge className="bg-primary/10 text-primary border-primary/20 mb-1.5 text-xs font-bold">
                      Complete Product Breakdown
                    </Badge>
                    <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                      About This Digital Masterpiece
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Everything you need to know about this digital product and implementation.
                    </p>
                  </div>

                  <CardContent className="p-5 sm:p-7 space-y-5">
                    <div className="space-y-3 break-words">
                      {descParagraphs.length > 0 ? (
                        descParagraphs.map((para: string, idx: number) => {
                          const isBullet = para.startsWith("-") || para.startsWith("*") || para.startsWith("•") || /^\d+\./.test(para);
                          if (isBullet) {
                            return (
                              <div key={idx} className="flex items-start gap-2.5 p-3 rounded-2xl bg-secondary/50 border border-border/60 text-xs sm:text-sm font-medium">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span className="break-words min-w-0 text-foreground font-semibold">
                                  {para.replace(/^[-*•\d.]+\s*/, "")}
                                </span>
                              </div>
                            );
                          }
                          return (
                            <p key={idx} className="text-xs sm:text-sm leading-relaxed text-foreground/90 font-normal">
                              {para}
                            </p>
                          );
                        })
                      ) : (
                        <p className="text-xs italic text-muted-foreground">
                          Contact the creator directly on WhatsApp or purchase above for instant delivery.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 2. 3-Step Instant Access Timeline */}
                <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-card shadow-md rounded-3xl p-5 sm:p-7 space-y-4">
                  <h3 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                    <Zap className="h-5 w-5 text-emerald-600" /> How You Receive Your Files (3 Simple Steps)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-1.5">
                      <span className="h-7 w-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center">1</span>
                      <p className="font-bold text-xs sm:text-sm text-foreground">Click Buy &amp; Checkout</p>
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        Pay securely with your debit card, bank transfer, or USSD via Paystack.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-1.5">
                      <span className="h-7 w-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center">2</span>
                      <p className="font-bold text-xs sm:text-sm text-foreground">Instant Automated Unlock</p>
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        Download link is displayed instantly on your screen and dispatched to your email &amp; WhatsApp.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-1.5">
                      <span className="h-7 w-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center">3</span>
                      <p className="font-bold text-xs sm:text-sm text-foreground">Lifetime Access</p>
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        Save files to any device (Phone, Tablet, PC) with unlimited lifetime re-downloads and support.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* 3. Frequently Asked Questions (FAQ) */}
                <Card className="border-border/80 shadow-md rounded-3xl p-5 sm:p-7 space-y-4 bg-card">
                  <h3 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-primary" /> Frequently Asked Questions
                  </h3>

                  <Accordion type="single" collapsible className="w-full space-y-2">
                    <AccordionItem value="faq-1" className="border border-border/70 rounded-2xl px-4 py-1">
                      <AccordionTrigger className="text-xs sm:text-sm font-bold text-foreground hover:no-underline">
                        How fast will I get access after payment?
                      </AccordionTrigger>
                      <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        Access is 100% automated and instant! Within seconds of completing checkout, you can download your files directly from this screen, plus you will receive an instant confirmation receipt with your access links.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="faq-2" className="border border-border/70 rounded-2xl px-4 py-1">
                      <AccordionTrigger className="text-xs sm:text-sm font-bold text-foreground hover:no-underline">
                        What payment methods do you accept?
                      </AccordionTrigger>
                      <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        We accept Nigerian debit cards (Mastercard, Visa, Verve), direct bank transfer, USSD codes, Apple Pay, and direct WhatsApp payment coordination with the creator.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="faq-3" className="border border-border/70 rounded-2xl px-4 py-1">
                      <AccordionTrigger className="text-xs sm:text-sm font-bold text-foreground hover:no-underline">
                        Can I download and open these files on my smartphone?
                      </AccordionTrigger>
                      <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        Yes! All files and templates are fully optimized for smartphones (Android &amp; iPhone), iPads, tablets, laptops, and desktop computers.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="faq-4" className="border border-border/70 rounded-2xl px-4 py-1">
                      <AccordionTrigger className="text-xs sm:text-sm font-bold text-foreground hover:no-underline">
                        What if I have questions or need assistance?
                      </AccordionTrigger>
                      <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        You can reach out directly to the verified creator via their WhatsApp button on this page for fast 1-on-1 customer assistance.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </Card>

              </div>

              {/* Sidebar Trust & Specifications */}
              <div className="lg:col-span-4 space-y-4">
                <Card className="border-border/80 shadow-md rounded-3xl p-5 bg-card space-y-3">
                  <h4 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Digital Product Details
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Format</span>
                      <span className="font-bold text-foreground">Digital Download / Stream</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="font-bold text-emerald-600">Instant (Under 30s)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">License</span>
                      <span className="font-bold text-foreground">Personal &amp; Commercial</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Compatibility</span>
                      <span className="font-bold text-foreground">Mobile &amp; PC Ready</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

          </div>
        ) : (
          /* ========================================================================= */
          /* CASE B: DEDICATED PHYSICAL PRODUCT MERCHANDISE LAYOUT                    */
          /* ========================================================================= */
          <div className="grid gap-6 lg:grid-cols-12 items-start">

            {/* LEFT COLUMN: Gallery & Physical Product Copy (7 Cols) */}
            <div className="lg:col-span-7 space-y-5 min-w-0">

              {/* Gallery Canvas */}
              <Card className="overflow-hidden border-border/80 shadow-md rounded-2xl sm:rounded-3xl bg-card">
                <CardContent className="p-2.5 sm:p-4 space-y-2.5">
                  <div className="relative aspect-4/3 sm:aspect-square max-h-[380px] sm:max-h-[480px] w-full overflow-hidden rounded-xl sm:rounded-2xl bg-muted group">
                    {imgs[activeImg] ? (
                      <img
                        src={imgs[activeImg]}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
                        onClick={() => setLightboxOpen(true)}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/90 to-purple-800 text-white">
                        <Package className="h-16 w-16 opacity-80" />
                      </div>
                    )}

                    {/* Badges Overlay */}
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1 max-w-[80%]">
                      {product.categories && (
                        <Badge className="bg-background/90 text-foreground font-semibold backdrop-blur shadow-xs border text-[10px] sm:text-xs">
                          {product.categories.name}
                        </Badge>
                      )}
                      {product.featured && (
                        <Badge className="bg-amber-500 text-white font-bold gap-1 shadow-xs text-[10px] sm:text-xs">
                          <Sparkles className="h-3 w-3" /> Featured Offer
                        </Badge>
                      )}
                    </div>

                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                      <button
                        onClick={() => setLightboxOpen(true)}
                        className="h-8 w-8 rounded-lg bg-background/80 hover:bg-background text-foreground backdrop-blur flex items-center justify-center shadow-md transition"
                        title="View Fullscreen"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Live View Count Pill */}
                    <div className="absolute bottom-2.5 left-2.5 bg-black/75 text-white backdrop-blur text-[10px] sm:text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Eye className="h-3 w-3 text-amber-400 shrink-0" />
                      <span>{product.views_count || 12} views</span>
                    </div>
                  </div>

                  {/* Gallery Thumbnails */}
                  {imgs.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
                      {imgs.map((src, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveImg(i)}
                          className={`h-14 w-14 sm:h-18 sm:w-18 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                            i === activeImg ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border/60 opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Video Showcase (if available) */}
              {product.video_url && (
                <Card className="border-border/80 shadow-md rounded-2xl sm:rounded-3xl overflow-hidden bg-card">
                  <CardContent className="p-3.5 sm:p-5">
                    <h3 className="text-xs sm:text-sm font-bold flex items-center gap-2 mb-2.5">
                      <Sparkles className="h-4 w-4 text-primary" /> Product Video Preview
                    </h3>
                    <ProductVideo url={product.video_url} title={product.name} />
                  </CardContent>
                </Card>
              )}

              {/* PHYSICAL PRODUCT WRITE-UP */}
              <Card className="border-border/80 shadow-md rounded-2xl sm:rounded-3xl overflow-hidden bg-card min-w-0">
                <div className="bg-gradient-to-r from-primary/10 via-purple-500/5 to-transparent p-4 sm:p-5 border-b border-border/60">
                  <Badge className="bg-primary/10 text-primary border-primary/20 mb-1.5 text-[10px] sm:text-xs">
                    Product Overview &amp; Details
                  </Badge>
                  <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight break-words">
                    About {product.name}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                    Complete specifications and item condition from the seller.
                  </p>
                </div>

                <CardContent className="p-4 sm:p-6 space-y-5 min-w-0">
                  {/* Formatted Write-Up Paragraphs */}
                  <div className="space-y-2.5 break-words overflow-hidden">
                    {descParagraphs.length > 0 ? (
                      descParagraphs.map((para: string, idx: number) => {
                        const isBullet = para.startsWith("-") || para.startsWith("*") || para.startsWith("•") || /^\d+\./.test(para);
                        if (isBullet) {
                          return (
                            <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-secondary/50 border border-border/50 text-xs sm:text-sm font-medium">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="break-words min-w-0">{para.replace(/^[-*•\d.]+\s*/, "")}</span>
                            </div>
                          );
                        }
                        return (
                          <p key={idx} className="text-xs sm:text-sm leading-relaxed text-foreground/90 font-normal break-words">
                            {para}
                          </p>
                        );
                      })
                    ) : (
                      <p className="text-xs italic text-muted-foreground">
                        Contact the seller directly on WhatsApp or phone for custom inquiries.
                      </p>
                    )}
                  </div>

                  {/* Bento Grid Specifications */}
                  <div className="space-y-2.5 pt-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-primary" /> Key Specifications
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-xs">
                      <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-muted/40 border border-border/60 min-w-0">
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium block">Condition</span>
                        <span className="font-bold capitalize text-foreground text-xs sm:text-sm mt-0.5 block truncate">
                          {product.condition || "New"}
                        </span>
                      </div>

                      <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-muted/40 border border-border/60 min-w-0">
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium block">Availability</span>
                        <span className="font-bold text-foreground text-xs sm:text-sm mt-0.5 block truncate">
                          {(product.stock ?? 1) > 0 ? "In Stock" : "Request"}
                        </span>
                      </div>

                      <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-muted/40 border border-border/60 min-w-0">
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium block">Location</span>
                        <span className="font-bold text-foreground text-xs sm:text-sm mt-0.5 block truncate">
                          {product.location || "Lagos, NG"}
                        </span>
                      </div>

                      <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-muted/40 border border-border/60 min-w-0">
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium block">Type</span>
                        <span className="font-bold text-foreground text-xs sm:text-sm mt-0.5 block capitalize truncate">
                          {product.product_type || "Physical"}
                        </span>
                      </div>

                      <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-muted/40 border border-border/60 min-w-0">
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium block">Verification</span>
                        <span className="font-bold text-emerald-600 text-xs sm:text-sm mt-0.5 block flex items-center gap-1 truncate">
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> Verified
                        </span>
                      </div>

                      <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-muted/40 border border-border/60 min-w-0">
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium block">Dispatch</span>
                        <span className="font-bold text-foreground text-xs sm:text-sm mt-0.5 block truncate">Fast Delivery</span>
                      </div>
                    </div>
                  </div>

                  {/* Trust & Guarantee Banner */}
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-card p-3.5 sm:p-4 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      <h4 className="text-xs sm:text-sm font-bold text-foreground">Buyer Protection Guarantee</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                      <div className="flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Direct WhatsApp &amp; Call seller contact</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Truck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Inspect items upon pickup or delivery</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Lock className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Safe local Lagos transactions</span>
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>

            </div>

            {/* RIGHT COLUMN: Physical Sales Box / Sticky Actions (5 Cols) */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20 min-w-0">

              <Card className="border-border/80 shadow-xl rounded-2xl sm:rounded-3xl overflow-hidden bg-card min-w-0">
                <CardContent className="p-4 sm:p-6 space-y-4 min-w-0">

                  {/* Category & Offer Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="secondary" className="font-semibold text-xs bg-primary/10 text-primary border-primary/20">
                      {product.categories?.name || "Marketplace"}
                    </Badge>
                    <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Ready to Order
                    </span>
                  </div>

                  {/* Title */}
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight leading-tight break-words">
                    {product.name}
                  </h1>

                  {/* Price Display Banner */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-transparent border border-primary/20 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold block">Special Price</span>
                      <p className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight truncate">{formattedPriceStr}</p>
                    </div>
                    <Badge className="bg-emerald-600 text-white font-bold text-xs py-1 px-2.5 shrink-0">
                      Best Deal
                    </Badge>
                  </div>

                  {/* Primary Contact & Ordering Actions */}
                  <div className="space-y-2 pt-1">
                    {waNumber ? (
                      <Button
                        asChild
                        size="lg"
                        className="w-full h-12 text-sm sm:text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 rounded-2xl gap-2 transition-transform active:scale-[0.98]"
                      >
                        <a href={`https://wa.me/${waNumber}?text=${waMessage}`} target="_blank" rel="noopener">
                          <MessageCircle className="h-5 w-5 animate-pulse shrink-0" />
                          Order Directly via WhatsApp
                        </a>
                      </Button>
                    ) : null}

                    {product.phone ? (
                      <Button
                        asChild
                        variant="outline"
                        size="lg"
                        className="w-full h-11 text-xs sm:text-sm font-semibold rounded-2xl gap-2 border-border/80"
                      >
                        <a href={`tel:${product.phone}`}>
                          <Phone className="h-4 w-4 text-primary shrink-0" />
                          Call Seller: {product.phone}
                        </a>
                      </Button>
                    ) : null}
                  </div>

                  {/* Secondary Utilities Bar (Favorite & Share) */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                    <div className="flex-1 min-w-0">
                      <FavoriteButton postId={product.id} />
                    </div>
                    <Button variant="outline" size="sm" onClick={copyProductLink} className="gap-1.5 rounded-xl text-xs font-semibold shrink-0">
                      <Share2 className="h-3.5 w-3.5" /> Share
                    </Button>
                  </div>

                  {/* Seller Profile Card */}
                  {seller && (
                    <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/70 space-y-2.5 mt-3 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-primary/10 overflow-hidden flex items-center justify-center font-bold text-primary shrink-0 ring-2 ring-primary/20">
                          {seller.avatar_url ? (
                            <img src={seller.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            (seller.display_name || "S").charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs sm:text-sm font-bold text-foreground">{seller.display_name || "Verified Seller"}</p>
                          <p className="flex items-center gap-1 text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" /> Verified Vendor
                          </p>
                        </div>
                      </div>

                      {seller.bio && (
                        <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2 leading-relaxed break-words">
                          {seller.bio}
                        </p>
                      )}

                      {seller.username && (
                        <Button asChild variant="secondary" size="sm" className="w-full rounded-xl text-xs font-semibold gap-1 h-9">
                          <Link to={`/u/${seller.username}`}>
                            <Building2 className="h-3.5 w-3.5" /> View Seller Profile <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  )}

                </CardContent>
              </Card>

              {/* Quick Safety Disclaimer */}
              <div className="p-3 rounded-2xl bg-card border border-border/60 text-[10px] sm:text-[11px] text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" /> Buyer Safety Tip
                </div>
                <p>Meet in a safe public location for physical pick-ups. Inspect items before paying.</p>
              </div>

            </div>

          </div>
        )}

        {/* RELATED PRODUCTS SECTION */}
        {relatedProducts.length > 0 && (
          <div className="mt-10 sm:mt-14 space-y-4 sm:space-y-6 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-extrabold text-foreground tracking-tight truncate">
                  More Marketplace Offers
                </h2>
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">Explore other verified products from our community.</p>
              </div>
              <Button asChild variant="ghost" size="sm" className="font-semibold text-xs text-primary gap-1 shrink-0">
                <Link to="/products">All Marketplace <ChevronRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* STICKY BOTTOM ACTION DOCK (sm:hidden) */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/80 p-2.5 sm:hidden z-50 shadow-2xl">
        <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold truncate">{product.name}</p>
            <p className="text-base font-extrabold text-primary leading-tight truncate">{formattedPriceStr}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {waNumber ? (
              <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md gap-1 px-3 py-4 rounded-xl text-xs">
                <a href={`https://wa.me/${waNumber}?text=${waMessage}`} target="_blank" rel="noopener">
                  <MessageCircle className="h-4 w-4 shrink-0" /> WhatsApp
                </a>
              </Button>
            ) : product.phone ? (
              <Button asChild size="sm" variant="default" className="font-bold gap-1 px-3 py-4 rounded-xl text-xs">
                <a href={`tel:${product.phone}`}>
                  <Phone className="h-4 w-4 shrink-0" /> Call
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX DIALOG */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-2 bg-black/95 border-0 text-white flex items-center justify-center">
          {imgs[activeImg] && (
            <img src={imgs[activeImg]} alt={product.name} className="max-h-[85vh] w-auto object-contain rounded-xl" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
