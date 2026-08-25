import { Link } from "react-router-dom";
import { ArrowRight, Building2, BookOpen, TrendingUp, Sparkles } from "lucide-react";
import TVFrame from "@/components/TVFrame";
import HeroSlider from "@/components/HeroSlider";
import GlobalSearch from "@/components/GlobalSearch";
import FeaturedBusinessSlider from "@/components/FeaturedBusinessSlider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import AmazonProductGrid from "@/components/AmazonProductGrid";
import CategoryTile from "@/components/directory/CategoryTile";

import iconStartup3D from "@/assets/images/icon_startup_guide_3d_1787553506436.jpg";
import iconBusinessDir3D from "@/assets/images/icon_business_dir_3d_1787553523151.jpg";
import iconFeaturedBiz3D from "@/assets/images/icon_featured_biz_3d_1787553536001.jpg";
import iconMarketingSales3D from "@/assets/images/icon_marketing_sales_3d_1787553549641.jpg";

const features = [
  { icon: BookOpen, image3D: iconStartup3D, title: "Startup Guides", desc: "Step-by-step guides to launch your business in Lagos", link: "/blog/category/startup-guides", color: "from-blue-500/20 to-indigo-500/20", feature: "blog" },
  { icon: Building2, image3D: iconBusinessDir3D, title: "Business Directory", desc: "Discover and connect with trusted Lagos businesses", link: "/businesses", color: "from-amber-500/20 to-orange-500/20", feature: "businesses" },
  { icon: TrendingUp, image3D: iconMarketingSales3D, title: "Marketing & Sales", desc: "Grow your customer base with proven strategies", link: "/blog/category/marketing-sales", color: "from-emerald-500/20 to-teal-500/20", feature: "blog" },
  { icon: Sparkles, image3D: iconFeaturedBiz3D, title: "Featured Businesses", desc: "Spotlight on standout Lagos entrepreneurs", link: "/blog/category/featured-businesses", color: "from-purple-500/20 to-pink-500/20", feature: "blog" },
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

  return (
    <>
      <Helmet>
        <title>Bethelincovibe TV - Business Information for Lagos Entrepreneurs</title>
        <meta name="description" content="Your go-to platform for startup guides, the Lagos business directory, and marketing tips for Nigerian entrepreneurs." />
      </Helmet>

      {/* Hero Slider */}
      {flags.hero_slider && <HeroSlider />}

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <img src="/logo.png" alt="Bethelincovibe TV" className="h-20 w-20 rounded-2xl shadow-lg" />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Business Information for <span className="text-primary">Lagos Entrepreneurs</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              Everything Lagos entrepreneurs need — startup guides, business listings & marketing tips.
            </p>
            {flags.search && <div className="mb-6"><GlobalSearch /></div>}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {flags.businesses && <Button size="lg" asChild>
                <Link to="/businesses">Browse Businesses <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>}
              {flags.blog && <Button size="lg" variant="outline" asChild>
                <Link to="/blog/category/startup-guides">Read Guides</Link>
              </Button>}
            </div>
          </div>
        </div>

        {/* TV Video Section */}
        <div className="container mx-auto px-4 py-8">
          <TVFrame placement="home" />
        </div>
      </section>

      {/* Featured Businesses Slider */}
      {flags.businesses && <FeaturedBusinessSlider />}

      {/* WhatsApp Status Growth & Monetization Spotlight */}
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

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">Entrepreneur Toolkit</span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-2">Everything You Need to Succeed</h2>
          <p className="text-sm text-muted-foreground mt-1">Explore our key resources designed for ambitious Nigerian businesses and startups</p>
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

      {/* Featured Posts */}
      {flags.blog && posts && posts.length > 0 && (
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Latest Articles</h2>
              <Button variant="ghost" asChild><Link to="/blog">View All <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {posts.map((post: any) => (
                <Link key={post.id} to={`/blog/${post.slug}`}>
                  <Card className="h-full hover:shadow-md transition-shadow overflow-hidden">
                    {post.featured_image && (
                      <img src={post.featured_image} alt={post.title} className="w-full h-48 object-cover" loading="lazy" />
                    )}
                    <CardHeader>
                      {post.categories && (
                        <span className="text-xs text-primary font-medium">{post.categories.name}</span>
                      )}
                      <CardTitle className="text-lg line-clamp-2">{post.title}</CardTitle>
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

      {/* Business Categories - photo category grid right after Latest Articles */}
      {flags.businesses && businessCategories && businessCategories.length > 0 && (
        <section className="container mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">Browse Businesses by Category</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Explore Lagos local services, products, and enterprises</p>
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

      {/* Guest-only CTA */}
      {!user && (
        <section className="bg-primary text-primary-foreground py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Start Your Business?</h2>
            <p className="mb-8 opacity-90 max-w-md mx-auto">Join thousands of Lagos entrepreneurs using Bethelincovibe TV to grow their businesses.</p>
            <Button size="lg" variant="secondary" asChild>
              <Link to={flags.register ? "/register" : "/login"}>Get Started Free</Link>
            </Button>
          </div>
        </section>
      )}

      <div className="container mx-auto px-4"><AmazonProductGrid limit={4} heading="Editor's Picks on Amazon" /></div>
    </>
  );
}
