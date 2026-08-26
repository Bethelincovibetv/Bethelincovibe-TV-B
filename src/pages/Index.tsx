import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, BookOpen, TrendingUp, Sparkles, ShoppingBag, Store, Megaphone, Rocket, ChevronRight } from "lucide-react";
import TVFrame from "@/components/TVFrame";
import HeroSlider from "@/components/HeroSlider";
import GlobalSearch from "@/components/GlobalSearch";
import FeaturedBusinessSlider from "@/components/FeaturedBusinessSlider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import AmazonProductGrid from "@/components/AmazonProductGrid";
import CategoryTile from "@/components/directory/CategoryTile";
import ProductCard from "@/components/directory/ProductCard";

import iconStartup3D from "@/assets/images/icon_startup_guide_3d_1787553506436.jpg";
import iconBusinessDir3D from "@/assets/images/icon_business_dir_3d_1787553523151.jpg";
import iconFeaturedBiz3D from "@/assets/images/icon_featured_biz_3d_1787553536001.jpg";
import iconMarketingSales3D from "@/assets/images/icon_marketing_sales_3d_1787553549641.jpg";

const features = [
  { icon: BookOpen, image3D: iconStartup3D, title: "Startup Guides & Playbooks", desc: "Learn step-by-step how to source from China, navigate clearing, register your CAC, and launch in Nigeria.", link: "/blog/category/startup-guides", color: "from-blue-500/20 to-indigo-500/20", feature: "blog" },
  { icon: Building2, image3D: iconBusinessDir3D, title: "Verified Business Directory", desc: "Discover, contact, and partner with vetted Lagos suppliers, manufacturers, logistics agents, and artisans.", link: "/businesses", color: "from-amber-500/20 to-orange-500/20", feature: "businesses" },
  { icon: TrendingUp, image3D: iconMarketingSales3D, title: "Marketing & Sales Funnels", desc: "Master customer acquisition, launch automated 1-page sales funnels, and boost WhatsApp status conversions.", link: "/blog/category/marketing-sales", color: "from-emerald-500/20 to-teal-500/20", feature: "blog" },
  { icon: Sparkles, image3D: iconFeaturedBiz3D, title: "Founder Spotlights & Case Studies", desc: "Learn from real breakdown case studies of successful Nigerian entrepreneurs, wholesalers, and creators.", link: "/blog/category/featured-businesses", color: "from-purple-500/20 to-pink-500/20", feature: "blog" },
];

export default function Index() {
  const { user } = useAuth();
  const { flags } = useFeatureFlags();

  const { data: posts } = useQuery({
    queryKey: ["featured-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, featured_image, published_at, categories(name, slug)")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
  });

  const { data: businessCategories } = useQuery({
    queryKey: ["business-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("type", "business")
        .order("name");
      return data ?? [];
    },
  });

  const { data: marketplaceProducts } = useQuery({
    queryKey: ["home-marketplace-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("directory_products")
        .select("id, name, slug, description, price, currency, condition, stock, location, cover_image, images, featured, categories(name, slug)")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  return (
    <>
      <Helmet>
        <title>Bethelincovibe TV - Lagos Business Growth Engine & Marketplace</title>
        <meta
          name="description"
          content="The ultimate growth engine for Lagos entrepreneurs: verified business directory, marketplace products for sale, startup playbooks, and digital marketing tools."
        />
        <link rel="canonical" href="https://bethelincovibetv.com/" />
        <meta property="og:title" content="Bethelincovibe TV | Business Growth Engine & Marketplace" />
        <meta
          property="og:description"
          content="Discover businesses, shop verified products, read startup guides, and scale your business with Bethelincovibe TV."
        />
      </Helmet>

      {/* 1. Hero Slider */}
      {flags.hero_slider && <HeroSlider />}

      {/* 2. Hero & Business Growth Engine Positioning */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="flex justify-center mb-2">
              <img src="/logo.png" alt="Bethelincovibe TV" className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl shadow-lg" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-bold uppercase tracking-wider">
              <Rocket className="h-3.5 w-3.5" />
              <span>Business Growth Engine</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Start. Grow. Promote. Connect. <span className="text-primary">Sell.</span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Everything Lagos entrepreneurs and Nigerian businesses need to scale — from verified supplier directories and marketplace product sales to startup execution guides and AI marketing tools.
            </p>

            {/* Quick Action Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 pb-2">
              {flags.businesses && (
                <Link to="/businesses">
                  <Badge variant="outline" className="hover:bg-primary/10 transition-colors py-1.5 px-3 rounded-xl gap-1.5 cursor-pointer text-xs font-semibold">
                    <Store className="h-3.5 w-3.5 text-primary" /> Discover Businesses
                  </Badge>
                </Link>
              )}
              {flags.products && (
                <Link to="/products">
                  <Badge variant="outline" className="hover:bg-primary/10 transition-colors py-1.5 px-3 rounded-xl gap-1.5 cursor-pointer text-xs font-semibold">
                    <ShoppingBag className="h-3.5 w-3.5 text-primary" /> Explore Products
                  </Badge>
                </Link>
              )}
              {flags.blog && (
                <Link to="/blog/category/startup-guides">
                  <Badge variant="outline" className="hover:bg-primary/10 transition-colors py-1.5 px-3 rounded-xl gap-1.5 cursor-pointer text-xs font-semibold">
                    <BookOpen className="h-3.5 w-3.5 text-primary" /> Startup Guides
                  </Badge>
                </Link>
              )}
              {flags.business_listing && (
                <Link to="/businesses/list">
                  <Badge variant="outline" className="hover:bg-primary/10 transition-colors py-1.5 px-3 rounded-xl gap-1.5 cursor-pointer text-xs font-semibold">
                    <Megaphone className="h-3.5 w-3.5 text-primary" /> List Your Business
                  </Badge>
                </Link>
              )}
            </div>

            {/* Global Search */}
            {flags.search && <div className="max-w-xl mx-auto pt-2"><GlobalSearch /></div>}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              {flags.businesses && (
                <Button size="lg" className="rounded-xl font-bold shadow-md" asChild>
                  <Link to="/businesses">Browse Businesses <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              )}
              {flags.products && (
                <Button size="lg" variant="secondary" className="rounded-xl font-bold shadow-sm" asChild>
                  <Link to="/products">Shop Marketplace <ShoppingBag className="ml-2 h-4 w-4" /></Link>
                </Button>
              )}
              {flags.blog && (
                <Button size="lg" variant="outline" className="rounded-xl font-bold" asChild>
                  <Link to="/blog/category/startup-guides">Read Guides</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* TV Video Section */}
        <div className="container mx-auto px-4 py-6">
          <TVFrame placement="home" />
        </div>
      </section>

      {/* 3. Featured Businesses Slider */}
      {flags.businesses && <FeaturedBusinessSlider />}

      {/* 4. WhatsApp Status Growth & Monetization Spotlight */}
      {flags.whatsapp_engine && (
        <section className="container mx-auto px-4 py-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-700 via-teal-700 to-indigo-800 p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full text-white backdrop-blur-md">
                ⚡ Real Google Contacts & People API Integration
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Grow Your WhatsApp Status Network & Earn
              </h2>
              <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-medium">
                Connect with verified Lagos entrepreneurs via consent-based Google Contacts sync. Expand your daily status audience and earn from sponsor ads.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
              <Button asChild size="lg" className="w-full sm:w-auto bg-white text-emerald-800 hover:bg-white/90 font-extrabold text-sm rounded-2xl shadow-lg h-11 px-6">
                <Link to="/whatsapp-engine">Launch WhatsApp Engine <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* 5. EXPLORE PRODUCTS / MARKETPLACE DISCOVERY */}
      {flags.products && (
        <section className="container mx-auto px-4 py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-primary mb-1">
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Marketplace Discovery</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Explore Products & Wholesale Deals
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Discover trending physical goods, direct merchant wholesale offers, and digital assets from verified sellers.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" asChild className="rounded-xl text-xs font-bold gap-1">
                <Link to="/products/list">
                  <span>Sell a Product</span>
                </Link>
              </Button>
              <Button size="sm" asChild className="rounded-xl text-xs font-bold gap-1 bg-primary text-primary-foreground">
                <Link to="/products">
                  <span>Explore All Products</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </div>

          {marketplaceProducts && marketplaceProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
              {marketplaceProducts.map((prod: any) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border/80 p-8 text-center bg-muted/20 space-y-3 max-w-lg mx-auto">
              <ShoppingBag className="h-10 w-10 text-primary mx-auto opacity-80" />
              <h3 className="text-base font-bold">Lagos Marketplace is Open for Vendors</h3>
              <p className="text-xs text-muted-foreground">
                List your products today to reach thousands of high-intent Lagos buyers and business owners.
              </p>
              <Button asChild size="sm" className="rounded-xl font-bold">
                <Link to="/products/list">List Your First Product</Link>
              </Button>
            </div>
          )}
        </section>
      )}

      {/* 6. Business Growth Hub & Entrepreneur Toolkit */}
      <section className="container mx-auto px-4 py-12">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
            Business Growth Hub
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-2">
            Everything You Need to Succeed
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Explore core resources and tools designed for ambitious Nigerian businesses and startups
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.filter((f) => (flags as any)[f.feature]).map((f) => (
            <Link key={f.title} to={f.link} className="group block">
              <Card className="h-full border border-border/60 hover:border-primary/40 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden bg-card flex flex-col justify-between group-hover:-translate-y-1">
                <div>
                  <div className={`relative h-44 w-full overflow-hidden bg-gradient-to-br ${f.color} flex items-center justify-center p-4`}>
                    <img
                      src={f.image3D}
                      alt={f.title}
                      className="h-36 w-36 object-contain filter drop-shadow-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-1"
                      loading="lazy"
                    />
                    <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-md p-1.5 rounded-xl border border-border/40 shadow-sm">
                      <f.icon className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <CardHeader className="pt-4 pb-2">
                    <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors flex items-center justify-between">
                      <span>{f.title}</span>
                      <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* 7. Featured Posts / Growth Guides */}
      {flags.blog && posts && posts.length > 0 && (
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Startup Guides & Growth Insights</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Practical playbooks on sourcing, sales, and business operations</p>
              </div>
              <Button variant="ghost" asChild><Link to="/blog">View All <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {posts.map((post: any) => (
                <Link key={post.id} to={`/blog/${post.slug}`}>
                  <Card className="h-full hover:shadow-md transition-shadow overflow-hidden group">
                    {post.featured_image && (
                      <div className="relative h-48 w-full overflow-hidden bg-muted">
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <CardHeader>
                      {post.categories && (
                        <span className="text-xs text-primary font-medium">{post.categories.name}</span>
                      )}
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">{post.title}</CardTitle>
                    </CardHeader>
                    {post.excerpt && (
                      <CardContent><p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p></CardContent>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 8. Business Categories */}
      {flags.businesses && businessCategories && businessCategories.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">Browse Businesses by Category</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Explore Lagos local services, suppliers, and enterprises</p>
            </div>
            <Button variant="ghost" size="sm" asChild><Link to="/businesses">View All <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {businessCategories.map((cat: any) => (
              <CategoryTile key={cat.id} name={cat.name} slug={cat.slug} />
            ))}
          </div>
        </section>
      )}

      {/* 9. Guest-only CTA */}
      {!user && (
        <section className="bg-primary text-primary-foreground py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Grow Your Business?</h2>
            <p className="mb-8 opacity-90 max-w-md mx-auto">Join thousands of Lagos entrepreneurs using Bethelincovibe TV to connect, promote, and sell.</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" variant="secondary" className="rounded-xl font-bold" asChild>
                <Link to={flags.register ? "/register" : "/login"}>Get Started Free</Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-xl font-bold border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link to="/products">Explore Marketplace</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* 10. Editor's Picks */}
      <div className="container mx-auto px-4 py-8">
        <AmazonProductGrid limit={4} heading="Editor's Picks on Amazon" />
      </div>
    </>
  );
}

