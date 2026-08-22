import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, X, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_COST = 1000;

export default function SubmitBlog() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<any>(null);
  const [feeFromSettings, setFeeFromSettings] = useState<number>(DEFAULT_COST);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [form, setForm] = useState({
    business_name: "",
    description: "",
    website: "",
    contact_email: "",
    contact_phone: "",
    contact_whatsapp: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => setWallet(data));
    supabase.from("site_settings").select("value").eq("key", "business_blog_fee").maybeSingle().then(({ data }) => {
      const n = Number(data?.value);
      if (!Number.isNaN(n) && n >= 0) setFeeFromSettings(n);
    });
    supabase.from("categories").select("id,name").eq("type", "blog").order("name").then(({ data }) => setCategories(data || []));
  }, [user]);

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  const COST_CREDITS = isAdmin ? 0 : feeFromSettings;
  const balance = wallet?.balance ?? 0;
  const canAfford = isAdmin || balance >= COST_CREDITS;

  const uploadFile = async (file: File, prefix: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from("guest-submissions").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("guest-submissions").getPublicUrl(path);
    return data.publicUrl;
  };

  const submit = async () => {
    if (!form.business_name || !form.description) return toast.error("Business name and description are required");
    if (!canAfford) return toast.error(`Insufficient wallet balance. Need ₦${COST_CREDITS.toLocaleString()}`);
    setSubmitting(true);
    try {
      // Upload banner
      let bannerUrl: string | null = null;
      if (bannerFile) bannerUrl = await uploadFile(bannerFile, "banner");

      // Create submission
      const { data: sub, error: insErr } = await supabase.from("guest_blog_submissions").insert({
        user_id: user.id,
        business_name: form.business_name,
        description: form.description,
        website: form.website || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        contact_whatsapp: form.contact_whatsapp || null,
        banner_url: bannerUrl,
        category_id: categoryId || null,
        cost_credits: COST_CREDITS,
        status: "pending_payment",
      }).select().single();
      if (insErr) throw insErr;

      // Upload photos
      for (let i = 0; i < photos.length; i++) {
        const url = await uploadFile(photos[i], "photo");
        await supabase.from("guest_submission_photos").insert({
          submission_id: sub.id,
          image_url: url,
          display_order: i,
        });
      }

      // Deduct wallet via edge function (skip for admin/free)
      if (COST_CREDITS > 0) {
        const { data: payRes, error: payErr } = await supabase.functions.invoke("submit-business-blog", {
          body: { submissionId: sub.id },
        });
        if (payErr || payRes?.error) throw new Error(payRes?.error || payErr?.message);
      } else {
        // Mark as paid directly (free for admin)
        await supabase.from("guest_blog_submissions").update({ status: "paid" }).eq("id", sub.id);
      }

      // Auto-trigger AI blog generation immediately — no waiting on admin
      toast.success("Submitted! AI is writing your blog now…");
      supabase.functions.invoke("ai-blogger", {
        body: { guestSubmissionId: sub.id, autoPublish: true, authorId: user.id },
      }).then(({ data, error }) => {
        if (error || data?.error) {
          toast.error("AI generation queued — admin will retry shortly");
        } else {
          toast.success("Your blog has been published! 🎉");
        }
      });

      navigate(isAdmin ? "/admin/guest-blogs" : "/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6 space-y-6">
      <Helmet><title>Submit Your Business | Bethelincovibe TV</title></Helmet>
      <Button asChild variant="ghost" size="sm"><Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Submit Your Business for AI Blog</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Our AI will write a high-SEO featured blog post about your business with your photos, description, and contact details.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdmin ? (
            <div className="rounded-lg p-3 border-l-4 border-primary bg-primary/10 text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Admin: free submission. Your blog will be generated immediately.
            </div>
          ) : (
            <div className={`rounded-lg p-3 flex items-center justify-between gap-3 border-l-4 ${canAfford ? "border-emerald-500 bg-emerald-500/10" : "border-amber-500 bg-amber-500/10"}`}>
              <div className="flex items-center gap-2 text-sm">
                <Wallet className="h-4 w-4" />
                <span>Wallet: <strong>₦{balance.toLocaleString()}</strong></span>
                <span className="text-muted-foreground">· Cost: ₦{COST_CREDITS.toLocaleString()}</span>
              </div>
              {!canAfford && <Button asChild size="sm" variant="outline"><Link to="/dashboard/wallet">Top Up</Link></Button>}
            </div>
          )}

          <div className="space-y-2">
            <Label>Business Name *</Label>
            <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} maxLength={150} />
          </div>
          <div className="space-y-2">
            <Label>Business Description *</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} maxLength={2000} placeholder="What you do, who you serve, what makes you unique..." />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Choose a category for your blog" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Banner / Cover Image</Label>
            <input type="file" accept="image/*" id="banner" hidden onChange={(e) => setBannerFile(e.target.files?.[0] || null)} />
            <Button type="button" variant="outline" onClick={() => document.getElementById("banner")?.click()}>
              <Upload className="h-4 w-4 mr-1" />{bannerFile ? bannerFile.name.slice(0, 30) : "Choose banner image"}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Business Photos (gallery)</Label>
            <input type="file" accept="image/*" id="photos" hidden multiple onChange={(e) => setPhotos(Array.from(e.target.files || []).slice(0, 8))} />
            <Button type="button" variant="outline" onClick={() => document.getElementById("photos")?.click()}>
              <Upload className="h-4 w-4 mr-1" />Add photos (max 8)
            </Button>
            {photos.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative">
                    <span className="px-2 py-1 bg-secondary rounded text-xs">{p.name.slice(0, 15)}</span>
                    <button onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="ml-1"><X className="h-3 w-3 inline" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3 border-t pt-4">
            <div className="space-y-1"><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." /></div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
            <div className="space-y-1"><Label>WhatsApp</Label><Input value={form.contact_whatsapp} onChange={(e) => setForm({ ...form, contact_whatsapp: e.target.value })} placeholder="+234..." /></div>
          </div>

          <Button onClick={submit} disabled={submitting || !canAfford} className="w-full" size="lg">
            {submitting ? "Submitting..." : (COST_CREDITS > 0 ? `Submit & Pay ₦${COST_CREDITS.toLocaleString()}` : "Submit Free (Admin)")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
