import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function PostNavigation({ publishedAt, currentId }: { publishedAt: string | null; currentId: string }) {
  const { data } = useQuery({
    queryKey: ["post-nav", currentId, publishedAt],
    enabled: !!publishedAt,
    queryFn: async () => {
      const [prev, next] = await Promise.all([
        supabase.from("blog_posts").select("title,slug").eq("published", true)
          .lt("published_at", publishedAt!).order("published_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("blog_posts").select("title,slug").eq("published", true)
          .gt("published_at", publishedAt!).order("published_at", { ascending: true }).limit(1).maybeSingle(),
      ]);
      return { prev: prev.data, next: next.data };
    },
  });

  if (!data?.prev && !data?.next) return null;

  return (
    <nav className="mt-10 grid gap-3 sm:grid-cols-2 print:hidden" aria-label="Article navigation">
      {data?.prev ? (
        <Link to={`/blog/${data.prev.slug}`} className="group rounded-2xl border p-4 transition hover:border-primary/50 hover:bg-muted/40">
          <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Previous
          </span>
          <p className="mt-1 line-clamp-2 font-semibold group-hover:text-primary">{data.prev.title}</p>
        </Link>
      ) : <span className="hidden sm:block" />}
      {data?.next && (
        <Link to={`/blog/${data.next.slug}`} className="group rounded-2xl border p-4 text-right transition hover:border-primary/50 hover:bg-muted/40">
          <span className="flex items-center justify-end gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Next <ArrowRight className="h-3.5 w-3.5" />
          </span>
          <p className="mt-1 line-clamp-2 font-semibold group-hover:text-primary">{data.next.title}</p>
        </Link>
      )}
    </nav>
  );
}
