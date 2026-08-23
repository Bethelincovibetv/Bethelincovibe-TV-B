import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Phone, MapPin, Package, ShieldCheck, ArrowLeft } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { formatPrice } from "@/components/directory/ProductCard";
import { absUrl, ogImageUrl, SITE_NAME, truncate } from "@/lib/seo";
import ProductVideo from "@/components/directory/ProductVideo";
import BuyDigitalProduct from "@/components/directory/BuyDigitalProduct";
import { recordPageView } from "@/lib/analyticsTracker";

export default function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);

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
      if (data?.user_id) {
        const { data: p } = await supabase
          .from("profiles")
          .select("display_name, username, avatar_url, whatsapp")
          .eq("user_id", data.user_id)
          .maybeSingle();
        setSeller(p);
        supabase.from("directory_products").update({ views_count: (data.views_count || 0) + 1 }).eq("id", data.id).then(() => {}, () => {});
        recordPageView({ path: window.location.pathname, title: data.name, featureType: "product", entityId: data.id });
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>;
  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Product not found or no longer available.</p>
        <Button asChild className="mt-4"><Link to="/products">Back to marketplace</Link></Button>
      </div>
    );
  }

  const imgs: string[] = [product.cover_image, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean);
  const wa = (product.whatsapp || seller?.whatsapp || "").replace(/[^\d]/g, "");
  const title = `${product.name} — ${formatPrice(product.price, product.currency)} | ${SITE_NAME}`;
  const desc = truncate(product.description || `Buy ${product.name} in Lagos.`, 155);
  const url = absUrl(`/products/${product.slug || product.id}`);

  return (
    <div className="container mx-auto px-4 py-6">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={product.name} />
        <meta property="og:description" content={desc} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={imgs[0] || ogImageUrl({ title: product.name, subtitle: desc, badge: "Product" })} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: desc,
          image: imgs,
          category: product.categories?.name,
          offers: {
            "@type": "Offer",
            price: product.price || 0,
            priceCurrency: product.currency || "NGN",
            availability: (product.stock ?? 1) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url,
          },
        })}</script>
      </Helmet>

      <Breadcrumbs items={[{ label: "Products", href: "/products" }, { label: product.name }]} />

      <div className="mt-3 grid gap-6 lg:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl border bg-muted">
            {imgs[active] ? (
              <img src={imgs[active]} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-accent">
                <Package className="h-14 w-14 text-primary-foreground/90" />
              </div>
            )}
          </div>
          {imgs.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {imgs.map((src, i) => (
                <button key={i} onClick={() => setActive(i)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${i === active ? "border-primary" : "border-transparent"}`}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.categories && <Badge variant="secondary" className="mb-2">{product.categories.name}</Badge>}
          <h1 className="text-2xl font-bold sm:text-3xl">{product.name}</h1>
          <p className="mt-2 text-3xl font-extrabold text-primary">{formatPrice(product.price, product.currency)}</p>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {product.condition && <span className="rounded-full bg-muted px-2.5 py-1 capitalize">{product.condition}</span>}
            {typeof product.stock === "number" && <span className="rounded-full bg-muted px-2.5 py-1">{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</span>}
            {product.location && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1"><MapPin className="h-3 w-3" />{product.location}</span>}
          </div>

          <ProductVideo url={product.video_url} title={product.name} />
          <BuyDigitalProduct product={product} />

          {product.description && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{product.description}</p>}

          {seller && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border p-3">
              {seller.avatar_url ? (
                <img src={seller.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                  {(seller.display_name || "S").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{seller.display_name || seller.username}</p>
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><ShieldCheck className="h-3 w-3 text-primary" />Verified seller</p>
              </div>
              {seller.username && <Button asChild size="sm" variant="outline"><Link to={`/u/${seller.username}`}>Profile</Link></Button>}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {wa && (
              <Button asChild className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi, I'm interested in ${product.name} on ${SITE_NAME}`)}`} target="_blank" rel="noopener">
                  <MessageCircle className="mr-1.5 h-4 w-4" />WhatsApp seller
                </a>
              </Button>
            )}
            {product.phone && (
              <Button asChild variant="outline" className="flex-1">
                <a href={`tel:${product.phone}`}><Phone className="mr-1.5 h-4 w-4" />Call</a>
              </Button>
            )}
          </div>

          <Button asChild variant="ghost" size="sm" className="mt-4">
            <Link to="/products"><ArrowLeft className="mr-1 h-4 w-4" />Back to marketplace</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
