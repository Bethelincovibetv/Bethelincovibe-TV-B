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
import AdsterraAd from "@/components/AdsterraAd";
import AmazonProductGrid from "@/components/AmazonProductGrid";

const features = [
  { icon: BookOpen, title: "Startup Guides", desc: "Step-by-step guides to launch your business in Lagos", link: "/blog/category/startup-guides", color: "text-primary", feature: "blog" },
  { icon: Building2, title: "Business Directory", desc: "Discover and connect with trusted Lagos businesses", link: "/businesses", color: "text-accent", feature: "businesses" },
  { icon: TrendingUp, title: "Marketing & Sales", desc: "Grow your customer base with proven strategies", link: "/blog/category/marketing-sales", color: "text-success", feature: "blog" },
  { icon: Sparkles, title: "Featured Businesses", desc: "Spotlight on standout Lagos entrepreneurs", link: "/blog/category/featured-businesses", color: "text-warning", feature: "blog" },
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

      <div className="container mx-auto px-4"><AdsterraAd slot="home_top" /></div>





      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-8">Everything You Need to Succeed</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.filter((f) => (flags as any)[f.feature]).map((f) => (
            <Link key={f.title} to={f.link}>
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <f.icon className={`h-8 w-8 ${f.color}`} />
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
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

      {/* Business Categories - icon row right after Latest Articles */}
      {flags.businesses && businessCategories && businessCategories.length > 0 && (
        <section className="container mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl md:text-2xl font-bold">Browse Businesses by Category</h2>
            <Button variant="ghost" size="sm" asChild><Link to="/businesses">View All <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {businessCategories.map((cat: any) => (
              <Link key={cat.id} to={`/businesses?category=${cat.slug}`} className="group">
                <Card className="hover:shadow-lg transition-all hover:-translate-y-0.5 text-center p-4 active:scale-95">
                  <div className="h-12 w-12 mx-auto mb-2 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-md">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <p className="font-medium text-xs leading-tight line-clamp-2">{cat.name}</p>
                </Card>
              </Link>
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
      <div className="container mx-auto px-4"><AdsterraAd slot="home_bottom" /></div>
    </>
  );
}
