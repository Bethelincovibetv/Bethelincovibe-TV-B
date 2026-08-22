import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Instagram, Twitter, Facebook, Linkedin, Globe, MessageCircle, Mail, Phone,
  CheckCircle2, Pencil, Share2, ExternalLink, ChevronLeft, Briefcase
} from "lucide-react";
import { toast } from "sonner";
import ServicePreviewDialog from "@/components/ServicePreviewDialog";
import { waLink as buildWaLink } from "@/lib/phone";

export default function PublicProfile() {
  const { username } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [salesPages, setSalesPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let q = supabase.from("profiles").select("*").eq("is_public", true).maybeSingle();
      if (username === "me") {
        if (!user) { setLoading(false); return; }
        q = supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      } else {
        q = supabase.from("profiles").select("*").eq("username", username!).eq("is_public", true).maybeSingle();
      }
      const { data } = await q;
      setProfile(data);
      if (data?.user_id) {
        const { data: sp } = await supabase
          .from("sales_pages")
          .select("id, slug, product_name, headline, subheadline, price, currency, product_image_url, views_count, created_at")
          .eq("user_id", data.user_id)
          .eq("active", true)
          .order("created_at", { ascending: false });
        setSalesPages(sp || []);
      }
      setLoading(false);
    })();
  }, [username, user]);

  if (username === "me" && !user && !loading) return <Navigate to="/login" replace />;
  if (loading) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!profile) return <div className="container mx-auto py-12 text-center text-muted-foreground">Profile not found.</div>;

  const sl = profile.social_links || {};
  const services: any[] = Array.isArray(profile.services) ? profile.services : [];
  const fullName = profile.display_name || profile.username;
  const seoDesc = profile.bio?.slice(0, 155) || `${fullName}'s business profile on Bethelincovibe TV`;
  const waClean = (buildWaLink(profile.whatsapp) || "").replace("https://wa.me/", "").split("?")[0];
  const isOwner = user && profile.user_id === user.id;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: fullName,
    description: profile.bio,
    image: profile.avatar_url,
    url: typeof window !== "undefined" ? window.location.href : undefined,
    sameAs: Object.values(sl).filter(Boolean),
    knowsAbout: services,
  };

  const onShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: fullName, text: profile.bio || undefined, url });
        return;
      }
    } catch {}
    try { await navigator.clipboard.writeText(url); toast.success("Link copied!"); } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-32 md:pb-12">
      <Helmet>
        <title>{fullName} | Bethelincovibe TV</title>
        <meta name="description" content={seoDesc} />
        <meta property="og:title" content={fullName} />
        <meta property="og:description" content={seoDesc} />
        {profile.avatar_url && <meta property="og:image" content={profile.avatar_url} />}
        <link rel="canonical" href={typeof window !== "undefined" ? window.location.href : ""} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* Cover */}
      <div className={`relative h-56 sm:h-64 overflow-hidden ${
        profile.background_template === "emerald" ? "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600" :
        profile.background_template === "sunset"  ? "bg-gradient-to-br from-orange-500 via-pink-500 to-rose-600" :
        profile.background_template === "ocean"   ? "bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700" :
        profile.background_template === "noir"    ? "bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" :
        profile.background_template === "gold"    ? "bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-600" :
        "bg-gradient-to-br from-primary via-primary/80 to-accent"
      }`}>
        {profile.background_url && (
          <img src={profile.background_url} alt={fullName} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
        <Button asChild size="sm" variant="secondary" className="absolute top-3 left-3 shadow-md h-9">
          <Link to="/dashboard"><ChevronLeft className="h-4 w-4 mr-1" />Back</Link>
        </Button>
      </div>

      <div className="container mx-auto max-w-2xl px-4 relative">
        {/* Avatar sits above the card so the full photo is visible */}
        <div className="flex justify-center -mt-14 sm:-mt-16 relative z-10">
          <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl ring-4 ring-background bg-muted overflow-hidden flex items-center justify-center text-3xl font-bold text-primary shadow-xl">
            {profile.avatar_url ? <img src={profile.avatar_url} alt={fullName} className="w-full h-full object-cover" /> : fullName?.[0]?.toUpperCase()}
          </div>
        </div>
        {/* Identity card */}
        <Card className="overflow-hidden shadow-xl border-0 mt-3">
          <CardContent className="p-5 sm:p-6 text-center">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">{fullName}</h1>
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
            </div>
            {profile.username && <p className="text-xs text-muted-foreground">@{profile.username}</p>}
            {profile.bio && <p className="text-[15px] mt-4 leading-relaxed whitespace-pre-wrap text-left">{profile.bio}</p>}
            {isOwner && (
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link to="/dashboard/profile-edit"><Pencil className="h-3.5 w-3.5 mr-1" />Edit profile</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Services */}
        {services.length > 0 && (
          <Card className="mt-4">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" /> Services
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {services.map((s: any, i: number) => <ServicePreviewDialog key={i} service={s} />)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact */}
        <Card className="mt-4">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Contact</h2>
            <div className="grid gap-2">
              {profile.whatsapp && <InfoRow icon={MessageCircle} label="WhatsApp" value={profile.whatsapp} href={`https://wa.me/${waClean}`} external />}
              {profile.email && <InfoRow icon={Mail} label="Email" value={profile.email} href={`mailto:${profile.email}`} />}
              {sl.website && <InfoRow icon={Globe} label="Website" value={sl.website} href={sl.website} external />}
            </div>

            {(sl.instagram || sl.facebook || sl.twitter || sl.linkedin) && (
              <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                {sl.instagram && <SocialBtn href={sl.instagram} icon={Instagram} label="Instagram" />}
                {sl.facebook && <SocialBtn href={sl.facebook} icon={Facebook} label="Facebook" />}
                {sl.twitter && <SocialBtn href={sl.twitter} icon={Twitter} label="Twitter" />}
                {sl.linkedin && <SocialBtn href={sl.linkedin} icon={Linkedin} label="LinkedIn" />}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales Pages */}
        {salesPages.length > 0 && (
          <Card className="mt-4">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> Sales Pages ({salesPages.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {salesPages.map((sp: any) => (
                  <Link key={sp.id} to={`/sales/${sp.slug}`} className="group rounded-xl border bg-card hover:shadow-lg transition-all overflow-hidden">
                    {sp.product_image_url && (
                      <div className="aspect-video bg-muted overflow-hidden">
                        <img src={sp.product_image_url} alt={sp.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="font-semibold text-sm line-clamp-1">{sp.headline || sp.product_name}</p>
                      {sp.subheadline && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{sp.subheadline}</p>}
                      <div className="flex items-center justify-between mt-2">
                        {Number(sp.price) > 0
                          ? <span className="text-sm font-bold text-primary">₦{Number(sp.price).toLocaleString()}</span>
                          : <span className="text-xs text-muted-foreground">Contact for price</span>}
                        <Badge variant="secondary" className="text-[10px]">View →</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sticky mobile CTA bar */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 px-3">
        <div className="bg-card/95 backdrop-blur border shadow-xl rounded-2xl p-2 flex gap-2 max-w-md mx-auto">
          {waClean ? (
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" size="sm" asChild>
              <a href={`https://wa.me/${waClean}`} target="_blank" rel="noopener"><MessageCircle className="h-4 w-4 mr-1" />Chat</a>
            </Button>
          ) : profile.email ? (
            <Button className="flex-1" size="sm" asChild>
              <a href={`mailto:${profile.email}`}><Mail className="h-4 w-4 mr-1" />Email</a>
            </Button>
          ) : null}
          <Button variant="outline" size="sm" className="flex-1" onClick={onShare}><Share2 className="h-4 w-4 mr-1" />Share</Button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, href, external }: any) {
  const content = (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/60 transition">
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Icon className="h-4 w-4" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
      {external && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />}
    </div>
  );
  return href ? <a href={href} target={external ? "_blank" : undefined} rel="noopener">{content}</a> : content;
}

function SocialBtn({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Button asChild size="sm" variant="outline" className="rounded-full">
      <a href={href} target="_blank" rel="noopener"><Icon className="h-4 w-4 mr-1" />{label}</a>
    </Button>
  );
}
