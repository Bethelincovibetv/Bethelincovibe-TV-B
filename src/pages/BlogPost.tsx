import { useParams, Link } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import SEO from "@/components/SEO";
import { resolveEntityOgImage, absUrl, SITE_NAME } from "@/lib/seo";
import { recordPageView } from "@/lib/analyticsTracker";
import BlogComments from "@/components/BlogComments";
import BlogShareButtons from "@/components/BlogShareButtons";
import FavoriteButton from "@/components/FavoriteButton";
import RelatedPosts from "@/components/RelatedPosts";
import BlogInlineInjections from "@/components/BlogInlineInjections";
import BlogReader from "@/components/BlogReader";
import RotatingBlogAd from "@/components/RotatingBlogAd";
import AmazonProductGrid from "@/components/AmazonProductGrid";
import ReadingProgress from "@/components/blog/ReadingProgress";
import ArticleUtilityBar from "@/components/blog/ArticleUtilityBar";
import PostNavigation from "@/components/blog/PostNavigation";

export default function BlogPost() {
  const { slug } = useParams();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const decodedSlug = slug ? decodeURIComponent(slug).trim() : "";
      const isUuid = /^[0-9a-f-]{36}$/i.test(decodedSlug);
      const { data } = await supabase
        .from("blog_posts")
        .select("*, categories(name, slug)")
        .eq(isUuid ? "id" : "slug", decodedSlug)
        .eq("published", true)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (post) {
      recordPageView({
        path: `/blog/${post.slug}`,
        title: post.title,
        featureType: "blog",
        entityId: post.id,
      });
    }
  }, [post?.id, post?.slug, post?.title]);

  if (isLoading) return <div className="container mx-auto px-4 py-8"><div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-3/4" /><div className="h-64 bg-muted rounded" /></div></div>;

  if (!post) return (
    <div className="container mx-auto px-4 py-16 text-center">
      <p className="text-lg text-muted-foreground">Article not found</p>
      <Button asChild className="mt-4"><Link to="/blog">Back to Blog</Link></Button>
    </div>
  );

  const postUrl = `/blog/${post.slug}`;
  const postDescription = post.excerpt || post.title;
  const ogImage = resolveEntityOgImage({
    primaryImage: post.featured_image,
    title: post.title,
    subtitle: post.excerpt || "Business playbook & startup guide",
    badge: (post.categories as any)?.name || "Playbook",
  });

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: postDescription,
    image: [ogImage],
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { "@type": "Organization", name: "Bethelincovibe TV" },
    publisher: {
      "@type": "Organization",
      name: "Bethelincovibe TV",
      logo: { "@type": "ImageObject", url: "https://bethelincovibetv.com/logo.png" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": absUrl(postUrl) },
  };

  return (
    <>
      <SEO
        title={`${post.title} - Bethelincovibe TV`}
        description={postDescription}
        url={postUrl}
        type="article"
        image={ogImage}
        articlePublishedTime={post.published_at}
        articleModifiedTime={post.updated_at}
        jsonLd={articleSchema}
      />

      <ReadingProgress />

      <article className="container mx-auto max-w-[46rem] px-4 py-8 md:py-12">
        <Button variant="ghost" size="sm" asChild className="mb-6 print:hidden">
          <Link to="/blog"><ArrowLeft className="h-4 w-4 mr-1" />Back to Blog</Link>
        </Button>

        {post.featured_image && (
          <div className="w-full aspect-[1200/630] rounded-2xl overflow-hidden bg-muted mb-7 shadow-lg">
            <img
              src={post.featured_image}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {post.categories && (
            <Link to={`/blog/category/${post.categories.slug}`}>
              <Badge>{post.categories.name}</Badge>
            </Link>
          )}
          {post.published_at && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />{format(new Date(post.published_at), "MMM d, yyyy")}
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-3 mb-5 min-w-0">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black leading-tight tracking-tight break-words min-w-0">{post.title}</h1>
          <FavoriteButton postId={post.id} showText={false} size="default" variant="outline" className="shrink-0 mt-1" />
        </div>

        {post.excerpt && (
          <p className="mb-6 text-base sm:text-lg md:text-xl leading-relaxed text-muted-foreground break-words min-w-0">{post.excerpt}</p>
        )}

        <ArticleUtilityBar html={post.content || ""} url={postUrl} postId={post.id} />

        <BlogReader title={post.title} html={post.content || ""} url={postUrl} />

        <RotatingBlogAd placement="blog" />

        <BlogInlineInjections html={post.content || ""} postId={post.id} title={post.title} />

        <PostNavigation publishedAt={post.published_at} currentId={post.id} />

        <AmazonProductGrid category={post.categories?.slug} limit={4} heading="Recommended on Amazon" />

        <BlogComments postId={post.id} />
      </article>

      <RelatedPosts currentId={post.id} categoryId={post.category_id} />

      <BlogShareButtons
        url={postUrl}
        title={post.title}
        description={postDescription}
        image={postImage}
      />

    </>
  );
}