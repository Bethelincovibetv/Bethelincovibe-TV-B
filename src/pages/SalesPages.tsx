import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Eye, Edit, Copy as CopyIcon, Trash2, MessageCircle, Share2, BarChart3, Sparkles, ArrowLeft, LineChart } from "lucide-react";

export default function SalesPages() {
  const { user, loading } = useAuth();
  const [pages, setPages] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("sales_pages").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setPages(data || []);
  };

  useEffect(() => { load(); }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const share = (p: any) => {
    const url = `${origin}/sales/${p.slug}`;
    const text = encodeURIComponent(`Check out ${p.product_name}: ${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const copyLink = (p: any) => {
    const url = `${origin}/sales/${p.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  const duplicate = async (p: any) => {
    const payload = {
      product_name: p.product_name + " (copy)",
      product_description: p.product_description,
      price: p.price,
      contact_whatsapp: p.contact_whatsapp,
      contact_phone: p.contact_phone,
      contact_email: p.contact_email,
      product_image_url: p.product_image_url,
        gallery_image_urls: p.gallery_image_urls,
      image_source: p.image_source,
        youtube_video_url: p.youtube_video_url,
      headline: p.headline, subheadline: p.subheadline,
      problem: p.problem, solution: p.solution,
      benefits: p.benefits, social_proof: p.social_proof,
      urgency: p.urgency, cta_text: p.cta_text,
      seo_title: p.seo_title, seo_description: p.seo_description,
    };
    const { data, error } = await supabase.rpc("create_sales_page", { _payload: payload });
    if (error) { toast.error(error.message); return; }
    const res = data as any;
    if (!res?.success) { toast.error(res?.error === "insufficient_balance" ? "Insufficient wallet balance" : res?.error || "Failed"); return; }
    toast.success("Duplicated");
    load();
  };

  const remove = async (p: any) => {
    if (!confirm(`Delete "${p.product_name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("sales_pages").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    load();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background pb-12">
      <Helmet><title>My Sales Pages | Bethelincovibe TV</title></Helmet>

      <div className="container max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild><Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />Sales Pages
            </h1>
          </div>
          <Button asChild className="bg-gradient-to-r from-primary to-purple-600">
            <Link to="/dashboard/sales-pages/new"><Plus className="h-4 w-4 mr-1" />New</Link>
          </Button>
        </div>

        {pages.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center space-y-3">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-bold">Create your first sales page</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                AI-written, professionally designed, ready to share on WhatsApp. Your first one is on us.
              </p>
              <Button asChild size="lg"><Link to="/dashboard/sales-pages/new"><Plus className="h-4 w-4 mr-1" />Create Sales Page</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {pages.map((p) => (
              <Card key={p.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-muted relative">
                  {p.product_image_url
                    ? <img src={p.product_image_url} alt={p.product_name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Sparkles className="h-10 w-10" /></div>}
                  {!p.active && <Badge variant="destructive" className="absolute top-2 right-2">Disabled</Badge>}
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold truncate">{p.product_name}</h3>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{p.views_count || 0} views</span>
                    <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />{p.clicks_count || 0} clicks</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="secondary" asChild><Link to={`/sales/${p.slug}`} target="_blank"><Eye className="h-3.5 w-3.5 mr-1" />Preview</Link></Button>
                    <Button size="sm" variant="outline" asChild><Link to={`/dashboard/sales-pages/${p.id}/edit`}><Edit className="h-3.5 w-3.5 mr-1" />Edit</Link></Button>
                    <Button size="sm" variant="outline" asChild><Link to={`/dashboard/sales-pages/${p.id}/analytics`}><LineChart className="h-3.5 w-3.5 mr-1" />Analytics</Link></Button>
                    <Button size="sm" variant="outline" onClick={() => share(p)} className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"><MessageCircle className="h-3.5 w-3.5 mr-1" />WhatsApp</Button>
                    <Button size="sm" variant="ghost" onClick={() => copyLink(p)}><Share2 className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => duplicate(p)}><CopyIcon className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(p)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
