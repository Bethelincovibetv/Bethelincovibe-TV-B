import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ChevronRight, Home } from "lucide-react";
import { absUrl } from "@/lib/seo";

export type Crumb = { label: string; href?: string };

/**
 * Accessible breadcrumb trail + matching BreadcrumbList structured data.
 */
export default function Breadcrumbs({ items, className = "" }: { items: Crumb[]; className?: string }) {
  const all: Crumb[] = [{ label: "Home", href: "/" }, ...items];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: absUrl(c.href) } : {}),
    })),
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <nav aria-label="Breadcrumb" className={`min-w-0 ${className}`}>
        <ol className="flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto no-scrollbar">
          {all.map((c, i) => (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1 shrink-0">
              {i > 0 && <ChevronRight className="h-3 w-3 opacity-50" aria-hidden="true" />}
              {c.href && i < all.length - 1 ? (
                <Link to={c.href} className="hover:text-primary transition-colors inline-flex items-center gap-1">
                  {i === 0 && <Home className="h-3 w-3" aria-hidden="true" />}
                  {c.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium truncate max-w-[55vw]" aria-current="page">
                  {c.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
