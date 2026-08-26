import React, { useEffect, useState, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import { PAGE_OG_IMAGES } from "@/lib/seo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Heart,
  Search,
  Trash2,
  Share2,
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  ExternalLink,
  Filter,
  CheckCircle2,
  FolderHeart
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";

interface SavedPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featured_image?: string;
  published_at?: string;
  reading_time_minutes?: number;
  category?: string;
  author_name?: string;
}

export default function UserFavorites() {
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);

  // Fetch saved favorites
  const loadFavorites = async () => {
    if (!user) return;
    setFetching(true);
    try {
      const { data: favs } = await supabase
        .from("favorites")
        .select("post_id, created_at")
        .eq("user_id", user.id);

      const ids = (favs || []).map((f) => f.post_id).filter(Boolean);

      if (ids.length === 0) {
        setPosts([]);
        loadTrending();
        setFetching(false);
        return;
      }

      const { data: blogData } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, featured_image, published_at, reading_time_minutes, author_name")
        .in("id", ids)
        .eq("published", true);

      setPosts((blogData as SavedPost[]) || []);
    } catch (err) {
      console.error("Error loading saved blogs:", err);
      toast.error("Could not load your saved articles");
    } finally {
      setFetching(false);
    }
  };

  // Load trending fallback if empty
  const loadTrending = async () => {
    try {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, featured_image, published_at")
        .eq("published", true)
        .order("views_count", { ascending: false })
        .limit(4);
      setTrendingPosts(data || []);
    } catch (e) {
      console.warn("Could not load trending posts:", e);
    }
  };

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  // Remove / Unsave individual post
  const handleRemoveFavorite = async (postId: string, title: string) => {
    if (!user) return;
    const prevPosts = [...posts];
    setPosts((current) => current.filter((p) => p.id !== postId));

    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", postId);

      if (error) throw error;
      toast.success(`Removed "${title}" from saved articles`);
    } catch (err) {
      console.error("Failed to remove bookmark:", err);
      setPosts(prevPosts);
      toast.error("Failed to remove article. Please try again.");
    }
  };

  // Clear all saved favorites
  const handleClearAll = async () => {
    if (!user || posts.length === 0) return;
    const confirm = window.confirm("Are you sure you want to clear all saved articles from your reading list?");
    if (!confirm) return;

    const prev = [...posts];
    setPosts([]);

    try {
      const { error } = await supabase.from("favorites").delete().eq("user_id", user.id);
      if (error) throw error;
      toast.success("All saved articles cleared");
      loadTrending();
    } catch (err) {
      console.error("Failed to clear bookmarks:", err);
      setPosts(prev);
      toast.error("Failed to clear bookmarks");
    }
  };

  // Quick share article
  const handleShare = async (slug: string, title: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://bethelincovibetv.com";
    const url = `${origin}/blog/${slug}`;

    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ title, url });
        return;
      } catch {}
    }
    const success = await copyToClipboard(url);
    if (success) {
      toast.success("Article link copied to clipboard!");
    } else {
      toast.error("Could not copy link");
    }
  };

  // Filtered posts by search query and category
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === "all" || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [posts, searchQuery, selectedCategory]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO
        title="My Saved Articles & Reading List | Bethelincovibe TV"
        description="Manage, organize, and read your saved startup guides, verified supplier research, and business articles."
        image={PAGE_OG_IMAGES.savedBlogs()}
      />

      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Button asChild variant="ghost" size="sm" className="h-8 px-2 -ml-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
              <Link to="/dashboard">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Back to Dashboard
              </Link>
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-rose-500/15 text-rose-500">
                <FolderHeart className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  Saved Articles & Bookmarks
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  You have <strong className="text-foreground">{posts.length}</strong> saved {posts.length === 1 ? "article" : "articles"} in your reading library
                </p>
              </div>
            </div>
          </div>

          {posts.length > 0 && (
            <div className="flex items-center gap-2 self-start sm:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900/50"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Clear All
              </Button>
              <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5">
                <Link to="/blog">
                  <BookOpen className="h-3.5 w-3.5" />
                  Explore More Articles
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Filter & Search Bar */}
        {posts.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved articles by title or keywords..."
                className="pl-9 text-xs h-10 rounded-xl"
              />
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {fetching ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <Card key={n} className="h-64 animate-pulse bg-card border-border">
                <div className="h-36 bg-muted rounded-t-xl" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded-md w-3/4" />
                  <div className="h-3 bg-muted rounded-md w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredPosts.length === 0 && posts.length > 0 ? (
          /* Search Empty State */
          <Card className="border-border p-10 text-center space-y-3">
            <Search className="h-8 w-8 text-muted-foreground mx-auto" />
            <h3 className="font-bold text-base text-foreground">No matching saved articles found</h3>
            <p className="text-xs text-muted-foreground">
              Try a different search keyword or clear the search bar.
            </p>
            <Button variant="outline" size="sm" onClick={() => setSearchQuery("")} className="text-xs font-bold">
              Reset Search
            </Button>
          </Card>
        ) : filteredPosts.length === 0 ? (
          /* Global Empty State */
          <div className="space-y-8">
            <Card className="border-dashed border-2 border-border p-8 sm:p-12 text-center space-y-4 bg-card/50">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
                <Heart className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-foreground">Your Reading List is Empty</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                  When reading articles or startup guides on Bethelincovibe TV, tap the heart icon on any post to bookmark it here for fast access.
                </p>
              </div>
              <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-2">
                <Link to="/blog">
                  <BookOpen className="h-4 w-4" />
                  Browse Latest Business Articles
                </Link>
              </Button>
            </Card>

            {/* Trending Articles to Bookmark */}
            {trendingPosts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Recommended Articles to Read
                  </h3>
                  <Button asChild variant="link" size="sm" className="text-xs text-purple-600 font-bold p-0">
                    <Link to="/blog">View All &rarr;</Link>
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {trendingPosts.map((p) => (
                    <Link key={p.id} to={`/blog/${p.slug}`} className="group">
                      <Card className="overflow-hidden h-full flex flex-col hover:border-purple-500/50 hover:shadow-md transition-all">
                        {p.featured_image ? (
                          <img
                            src={p.featured_image}
                            alt={p.title}
                            className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-32 bg-gradient-to-br from-purple-900/30 to-indigo-950/30 flex items-center justify-center text-purple-400">
                            <BookOpen className="h-8 w-8 opacity-40" />
                          </div>
                        )}
                        <CardContent className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                          <h4 className="font-bold text-xs line-clamp-2 group-hover:text-purple-600 transition-colors">
                            {p.title}
                          </h4>
                          {p.excerpt && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2">{p.excerpt}</p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Grid of Saved Posts */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPosts.map((post) => (
              <Card
                key={post.id}
                className="overflow-hidden flex flex-col justify-between hover:border-purple-500/40 hover:shadow-lg transition-all group bg-card"
              >
                <div>
                  {/* Article Thumbnail */}
                  <Link to={`/blog/${post.slug}`} className="relative block overflow-hidden aspect-[16/9] bg-muted">
                    {post.featured_image ? (
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-900/30 to-indigo-950/30 flex items-center justify-center text-purple-400">
                        <BookOpen className="h-10 w-10 opacity-30" />
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveFavorite(post.id, post.title);
                        }}
                        title="Remove from saved articles"
                        className="p-2 rounded-full bg-black/60 hover:bg-rose-600 text-white backdrop-blur-xs transition-colors shadow-md"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Link>

                  {/* Body Content */}
                  <CardContent className="p-4 space-y-2.5">
                    {post.published_at && (
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(post.published_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {post.reading_time_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {post.reading_time_minutes} min read
                          </span>
                        )}
                      </div>
                    )}

                    <Link to={`/blog/${post.slug}`}>
                      <h3 className="font-bold text-sm text-foreground line-clamp-2 group-hover:text-purple-600 transition-colors leading-snug">
                        {post.title}
                      </h3>
                    </Link>

                    {post.excerpt && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {post.excerpt}
                      </p>
                    )}
                  </CardContent>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 pt-0 flex items-center justify-between gap-2 border-t border-border/50 mt-2">
                  <Button
                    asChild
                    size="sm"
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5 h-8"
                  >
                    <Link to={`/blog/${post.slug}`}>
                      <BookOpen className="h-3.5 w-3.5" />
                      Read Now
                    </Link>
                  </Button>
                  <Button
                    onClick={() => handleShare(post.slug, post.title)}
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs font-semibold"
                    title="Share Article"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    onClick={() => handleRemoveFavorite(post.id, post.title)}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 text-xs"
                    title="Remove Bookmark"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
