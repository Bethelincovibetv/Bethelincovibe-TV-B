import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, X, ExternalLink, Star } from "lucide-react";
import { toast } from "sonner";

export default function AdminGuestBlogs() {
  const qc = useQueryClient();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const { data: submissions, refetch } = useQuery({
    queryKey: ["admin-guest-blogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_blog_submissions")
        .select("*, guest_submission_photos(*), profiles(display_name,email,user_id)")
        .order("created_at", { ascending: false });
      if (error) console.error("Load submissions error:", error);
      return data || [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-blog-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name").eq("type", "blog").order("name");
      return data || [];
    },
  });

  const setCategory = async (subId: string, categoryId: string) => {
    const { error } = await supabase.from("guest_blog_submissions")
      .update({ category_id: categoryId === "none" ? null : categoryId })
      .eq("id", subId);
    if (error) return toast.error(error.message);
    toast.success("Category updated");
    refetch();
  };

  const triggerAI = async (sub: any) => {
    setGeneratingId(sub.id);
    try {
      const { data: adminRole } = await supabase.from("user_roles").select("user_id").eq("role", "admin").limit(1).single();
      if (!adminRole) throw new Error("No admin user found");
      const { data, error } = await supabase.functions.invoke("ai-blogger", {
        body: { guestSubmissionId: sub.id, autoPublish: true, authorId: adminRole.user_id },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success(data.auto_published ? "Blog published!" : "Blog generated — check status");
      refetch();
    } catch (e: any) { toast.error(e.message || "Generation failed"); }
    finally { setGeneratingId(null); }
  };

  const reject = async () => {
    if (!rejectId) return;
    await supabase.from("guest_blog_submissions").update({ status: "rejected", rejection_reason: rejectReason }).eq("id", rejectId);
    const sub = submissions?.find((s: any) => s.id === rejectId);
    if (sub && Number(sub.cost_credits) > 0) {
      await supabase.rpc("topup_wallet" as any, {
        _user_id: sub.user_id, _amount: Number(sub.cost_credits),
        _description: `Refund for rejected submission: ${sub.business_name}`,
      });
    }
    toast.success("Rejected and refunded");
    setRejectId(null); setRejectReason(""); refetch();
  };

  const toggleFeatured = async (sub: any) => {
    if (!sub.generated_post_id) return toast.error("Blog not generated yet");
    const { data: post } = await supabase.from("blog_posts").select("is_featured").eq("id", sub.generated_post_id).single();
    const next = !post?.is_featured;
    const { error } = await supabase.from("blog_posts").update({ is_featured: next }).eq("id", sub.generated_post_id);
    if (error) return toast.error(error.message);
    toast.success(next ? "Marked featured" : "Removed from featured");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Business Blog Submissions</h1>
        <p className="text-sm text-muted-foreground mt-1">Submit your own business blog from the user dashboard — admin submissions are auto-approved & free.</p>
      </div>

      <div className="space-y-3">
        {submissions?.length === 0 && <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No submissions yet.</CardContent></Card>}

        {submissions?.map((s: any) => (
          <Card key={s.id} className="overflow-hidden min-w-0">
            {s.banner_url && <img src={s.banner_url} alt="" className="w-full h-32 object-cover" />}
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3 flex-wrap min-w-0">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base font-extrabold break-words min-w-0 leading-snug">{s.business_name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1 break-words">
                    by {s.profiles?.display_name || s.profiles?.email} · {new Date(s.created_at).toLocaleDateString()} · ₦{Number(s.cost_credits).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={s.status} />
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3 min-w-0">
              <p className="text-sm break-words leading-relaxed text-foreground/90">{s.description}</p>

              <div className="text-xs text-muted-foreground space-y-1.5 min-w-0 break-all">
                {s.website && <p className="truncate">🌐 <a href={s.website} target="_blank" rel="noopener" className="text-primary underline hover:text-primary/80 break-all">{s.website}</a></p>}
                {s.contact_phone && <p>📞 {s.contact_phone}</p>}
                {s.contact_whatsapp && <p>💬 {s.contact_whatsapp}</p>}
                {s.contact_email && <p className="break-all">✉️ {s.contact_email}</p>}
              </div>

              {s.guest_submission_photos?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {s.guest_submission_photos.map((p: any) => (
                    <img key={p.id} src={p.image_url} alt="" className="h-16 w-16 object-cover rounded-xl shrink-0 border" />
                  ))}
                </div>
              )}

              {s.rejection_reason && <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-xl break-words">Reason: {s.rejection_reason}</p>}

              <div className="flex items-center gap-2 flex-wrap min-w-0 pt-1">
                <span className="text-xs text-muted-foreground shrink-0 font-bold">Category:</span>
                <Select value={s.category_id || "none"} onValueChange={(v) => setCategory(s.id, v)}>
                  <SelectTrigger className="h-8 w-full sm:w-[200px] text-xs rounded-xl"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 flex-wrap pt-2">
                {(s.status === "paid" || s.status === "review") && (
                  <Button size="sm" onClick={() => triggerAI(s)} disabled={generatingId === s.id} className="rounded-xl font-bold text-xs">
                    {generatingId === s.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                    Generate Blog with AI
                  </Button>
                )}
                {s.status === "published" && s.generated_post_id && (
                  <>
                    <Button size="sm" variant="outline" asChild className="rounded-xl font-bold text-xs">
                      <a href={`/blog`} target="_blank" rel="noopener"><ExternalLink className="h-4 w-4 mr-1" />View Blog</a>
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => toggleFeatured(s)} className="rounded-xl font-bold text-xs">
                      <Star className="h-4 w-4 mr-1" />Toggle Featured
                    </Button>
                  </>
                )}
                {!["rejected", "published"].includes(s.status) && (
                  <Button size="sm" variant="destructive" onClick={() => setRejectId(s.id)} className="rounded-xl font-bold text-xs">
                    <X className="h-4 w-4 mr-1" />Reject & Refund
                  </Button>
                )}
              </div>

              {rejectId === s.id && (
                <div className="border rounded-2xl p-3 space-y-2 bg-muted/40 min-w-0">
                  <Textarea placeholder="Rejection reason (shown to user)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} className="rounded-xl text-xs min-w-0" />
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="destructive" onClick={reject} className="rounded-xl text-xs font-bold">Confirm Reject & Refund</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setRejectId(null); setRejectReason(""); }} className="rounded-xl text-xs font-bold">Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: any }> = {
    pending_payment: { label: "Awaiting Payment", variant: "outline" },
    paid: { label: "Paid · Ready to Generate", variant: "default" },
    generating: { label: "Generating", variant: "secondary" },
    review: { label: "In Review", variant: "secondary" },
    approved: { label: "Approved", variant: "default" },
    published: { label: "Published", variant: "default" },
    rejected: { label: "Rejected", variant: "destructive" },
  };
  const m = map[status] || { label: status, variant: "outline" };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
