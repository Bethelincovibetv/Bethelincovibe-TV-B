import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Megaphone, Upload, Wallet, Sparkles, Image as ImageIcon, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export default function UserAds() {
  const { user, loading } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [costPerDay, setCostPerDay] = useState(500);
  const [ads, setAds] = useState<any[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [duration, setDuration] = useState(7);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reload = async () => {
    if (!user) return;
    const [{ data: w }, { data: setting }, { data: list }] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "ad_cost_per_day").maybeSingle(),
      supabase.from("user_ads").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setWallet(w);
    setCostPerDay(Number(setting?.value || 500));
    setAds(list || []);
  };

  useEffect(() => { reload(); }, [user]);

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  const totalCost = costPerDay * duration;
  const balance = Number(wallet?.balance || 0);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("ad-creatives").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("ad-creatives").getPublicUrl(path);
      setImageUrl(publicUrl);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setUploading(false); }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !targetUrl.trim() || !imageUrl) { toast.error("Title, target URL and image are required"); return; }
    if (balance < totalCost) { toast.error("Insufficient balance — please top up"); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-ad", {
        body: { title, description, target_url: targetUrl, image_url: imageUrl, duration_days: duration },
      });
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any)?.error);
      toast.success("Ad submitted! Admin will review placement & approve.");
      setTitle(""); setDescription(""); setTargetUrl(""); setImageUrl("");
      await reload();
    } catch (e: any) {
      toast.error(e.message || "Submit failed");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-12">
      <Helmet><title>Advertise | Bethelincovibe TV</title></Helmet>

      <div className="bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-600 text-white px-4 py-6 rounded-b-3xl shadow-lg">
        <div className="container mx-auto max-w-3xl">
          <Button asChild variant="ghost" size="sm" className="text-white hover:text-white hover:bg-white/10 -ml-2 mb-2">
            <Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
          </Button>
          <div className="flex items-center gap-2 text-xs opacity-80"><Megaphone className="h-4 w-4" />Bethelincovibe TV Ad Network</div>
          <h1 className="text-2xl font-bold mt-1">Run an Ad</h1>
          <div className="mt-4 bg-white/10 backdrop-blur rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs opacity-80 flex items-center gap-1"><Wallet className="h-3 w-3" />Wallet Balance</p>
              <p className="text-2xl font-extrabold">₦{balance.toLocaleString()}</p>
            </div>
            <Button asChild variant="secondary" size="sm"><Link to="/dashboard/wallet">Top Up</Link></Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 mt-6 space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Create your ad</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Ad creative (image)</Label>
              <div className="mt-2 border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 bg-muted/30">
                {imageUrl ? (
                  <img src={imageUrl} alt="preview" className="max-h-48 rounded-lg" />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground py-4">
                    <ImageIcon className="h-8 w-8 mb-1" />
                    <p className="text-xs">PNG / JPG up to 5MB</p>
                  </div>
                )}
                <label>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-3 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer hover:opacity-90">
                    <Upload className="h-3.5 w-3.5" />{uploading ? "Uploading..." : imageUrl ? "Change" : "Upload Image"}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Your ad headline" maxLength={80} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description (optional)" maxLength={200} rows={2} />
            </div>
            <div>
              <Label>Target URL *</Label>
              <Input type="url" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://your-site.com" />
            </div>

            <div className="rounded-lg bg-muted/40 border border-dashed p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">Where will it show?</strong> Our team chooses the best placements for your ad after review, so it reaches the right audience across the site.
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Duration: <span className="text-primary font-bold">{duration} day{duration > 1 ? "s" : ""}</span></Label>
                <Badge variant="outline">₦{costPerDay.toLocaleString()}/day</Badge>
              </div>
              <Slider value={[duration]} min={1} max={30} step={1} onValueChange={(v) => setDuration(v[0])} className="mt-3" />
            </div>

            <div className="rounded-xl bg-muted/50 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total cost</p>
                <p className="text-xl font-extrabold">₦{totalCost.toLocaleString()}</p>
              </div>
              <Button size="lg" onClick={handleSubmit} disabled={submitting || balance < totalCost}>
                {submitting ? "Submitting..." : balance < totalCost ? "Top up needed" : "Publish Ad"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">My Ads</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No ads yet — create your first above.</p>
            ) : ads.map((a) => (
              <Link key={a.id} to={`/dashboard/ads/${a.id}/analytics`} className="flex items-center gap-3 border rounded-xl p-3 hover:border-primary hover:shadow-sm transition group">
                {a.image_url && <img src={a.image_url} alt={a.title} className="h-14 w-14 rounded-lg object-cover" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-primary">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.duration_days}d · ₦{Number(a.cost_amount).toLocaleString()} · {Number(a.impressions || 0).toLocaleString()} views · {Number(a.clicks || 0)} clicks
                  </p>
                </div>
                <Badge variant={a.status === "active" ? "default" : a.status === "failed" || a.status === "rejected" ? "destructive" : "secondary"}>{a.status}</Badge>
                <BarChart3 className="h-4 w-4 text-primary opacity-60 group-hover:opacity-100" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
