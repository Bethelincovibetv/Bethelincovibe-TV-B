import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, X, ExternalLink, Star, CheckCircle2, Building2, RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";

export default function AdminGuestBlogs() {
  const qc = useQueryClient();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const { data: submissions, refetch, isFetching } = useQuery({
    queryKey: ["admin-guest-blogs"],
    queryFn: async () => {
      let data: any[] | null = null;
      const { data: joinedData, error } = await supabase
        .from("guest_blog_submissions")
        .select("*, guest_submission_photos(*)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Load submissions error:", error);
        return [];
      }
      data = joinedData || [];

      // Hydrate profiles & blog_posts safely
      const userIds = Array.from(new Set(data.map((s) => s.user_id).filter(Boolean)));
      const postIds = Array.from(new Set(data.map((s) => s.generated_post_id).filter(Boolean)));

      const [profilesRes, postsRes] = await Promise.all([
        userIds.length > 0 ? supabase.from("profiles").select("display_name,email,user_id").in("user_id", userIds) : { data: [] },
        postIds.length > 0 ? supabase.from("blog_posts").select("id, slug, title").in("id", postIds) : { data: [] },
      ]);

      const profMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
      const postMap = new Map((postsRes.data || []).map((p: any) => [p.id, p]));

      return data.map((s) => ({
        ...s,
        profiles: s.user_id ? profMap.get(s.user_id) : null,
        blog_posts: s.generated_post_id ? postMap.get(s.generated_post_id) : null,
      }));
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

  const approveAndPublish = async (sub: any) => {
    setApprovingId(sub.id);
    try {
      // 1. If generated_post_id exists, publish the blog_post directly
      if (sub.generated_post_id) {
        await supabase.from("blog_posts").update({ status: "published", published_at: new Date().toISOString() }).eq("id", sub.generated_post_id);
      }
      // 2. Mark submission as published/approved
      await supabase.from("guest_blog_submissions").update({ status: "published" }).eq("id", sub.id);

      // 3. Notify user
      if (sub.user_id) {
        await supabase.from("user_notifications").insert({
          user_id: sub.user_id,
          title: "🎉 Your Business Blog Submission was Approved!",
          body: `Congratulations! Your business feature "${sub.business_name}" is now approved and live on Bethelincovibe TV.`,
          url: sub.blog_posts?.slug ? `/blog/${sub.blog_posts.slug}` : "/blog",
          is_read: false,
        }).catch(() => {});
      }

      toast.success(`Submission "${sub.business_name}" approved & published!`);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Approval failed");
    } finally {
      setApprovingId(null);
    }
  };

  const reject = async () => {
    if (!rejectId) return;
    const sub = submissions?.find((s: any) => s.id === rejectId);
    await supabase.from("guest_blog_submissions").update({ status: "rejected", rejection_reason: rejectReason }).eq("id", rejectId);
    if (sub && Number(sub.cost_credits) > 0) {
      await supabase.rpc("topup_wallet" as any, {
        _user_id: sub.user_id, _amount: Number(sub.cost_credits),
        _description: `Refund for rejected submission: ${sub.business_name}`,
      });
    }
    if (sub?.user_id) {
      await supabase.from("user_notifications").insert({
        user_id: sub.user_id,
        title: "Update on Your Business Blog Submission",
        body: `Your submission for "${sub.business_name}" was reviewed. Note: ${rejectReason || "Please check details and re-submit."}`,
        url: "/dashboard/submit-blog",
        is_read: false,
      }).catch(() => {});
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

  const filtered = (submissions || []).filter((s) => {
    if (activeTab === "pending") return ["paid", "review", "pending_payment", "generating"].includes(s.status);
    if (activeTab === "published") return s.status === "published" || s.status === "approved";
    if (activeTab === "rejected") return s.status === "rejected";
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Business Blog Submissions</h1>
          <p className="text-sm text-muted-foreground mt-1">Review, generate with AI, approve, publish, or refund business submissions.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5 rounded-xl text-xs font-bold">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/60 p-1 rounded-2xl">
          <TabsTrigger value="all" className="rounded-xl text-xs font-bold px-4">
            All ({submissions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="pending" className="rounded-xl text-xs font-bold px-4">
            Pending / Review ({submissions?.filter((s) => ["paid", "review", "pending_payment", "generating"].includes(s.status)).length || 0})
          </TabsTrigger>
          <TabsTrigger value="published" className="rounded-xl text-xs font-bold px-4">
            Published ({submissions?.filter((s) => s.status === "published" || s.status === "approved").length || 0})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-xl text-xs font-bold px-4">
            Rejected ({submissions?.filter((s) => s.status === "rejected").length || 0})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        {filtered.length === 0 && (
          <Card className="rounded-3xl border-border/80">
            <CardContent className="p-12 text-center text-sm text-muted-foreground">
              No submissions found for this filter tab.
            </CardContent>
          </Card>
        )}

        {filtered.map((s: any) => (
          <Card key={s.id} className="overflow-hidden min-w-0 rounded-3xl border-border/80 shadow-xs hover:shadow-md transition-shadow">
            {s.banner_url && <img src={s.banner_url} alt="" className="w-full h-36 object-cover" />}
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3 flex-wrap min-w-0">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg font-extrabold break-words min-w-0 leading-snug">{s.business_name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1 break-words">
                    by {s.profiles?.display_name || s.profiles?.email || "Registered Entrepreneur"} · {new Date(s.created_at).toLocaleDateString()} · ₦{Number(s.cost_credits).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={s.status} />
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3.5 min-w-0">
              <p className="text-sm break-words leading-relaxed text-foreground/90">{s.description}</p>

              <div className="text-xs text-muted-foreground space-y-1.5 min-w-0 bg-muted/30 p-3 rounded-2xl border border-border/60">
                {s.website && <p className="truncate">🌐 <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 break-all">{s.website}</a></p>}
                {s.contact_phone && <p>📞 {s.contact_phone}</p>}
                {s.contact_whatsapp && <p>💬 WhatsApp: {s.contact_whatsapp}</p>}
                {s.contact_email && <p className="break-all">✉️ {s.contact_email}</p>}
              </div>

              {s.guest_submission_photos?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Uploaded Photos ({s.guest_submission_photos.length})</p>
                  <div className="flex gap-2.5 overflow-x-auto pb-2">
                    {s.guest_submission_photos.map((p: any) => (
                      <img key={p.id} src={p.image_url} alt="" className="h-16 w-16 object-cover rounded-xl shrink-0 border border-border shadow-xs" />
                    ))}
                  </div>
                </div>
              )}

              {s.rejection_reason && <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-xl break-words font-medium">Rejection Reason: {s.rejection_reason}</p>}

              <div className="flex items-center gap-2 flex-wrap min-w-0 pt-1">
                <span className="text-xs text-muted-foreground shrink-0 font-bold">Category:</span>
                <Select value={s.category_id || "none"} onValueChange={(v) => setCategory(s.id, v)}>
                  <SelectTrigger className="h-8 w-full sm:w-[220px] text-xs rounded-xl"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 flex-wrap pt-2">
                {/* 1. Quick Generate with AI */}
                {s.status !== "published" && (
                  <Button size="sm" onClick={() => triggerAI(s)} disabled={generatingId === s.id} className="rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-1">
                    {generatingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Generate Blog with AI
                  </Button>
                )}

                {/* 2. Direct Approve & Publish */}
                {s.status !== "published" && s.status !== "rejected" && (
                  <Button size="sm" variant="default" onClick={() => approveAndPublish(s)} disabled={approvingId === s.id} className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                    {approvingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Approve & Make Live
                  </Button>
                )}

                {/* 3. View Live Article */}
                {(s.status === "published" || s.status === "approved") && (
                  <>
                    <Button size="sm" variant="outline" asChild className="rounded-xl font-bold text-xs gap-1">
                      <a href={s.blog_posts?.slug ? `/blog/${s.blog_posts.slug}` : (s.generated_post_id ? `/blog/${s.generated_post_id}` : `/blog`)} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" /> View Live Article
                      </a>
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => toggleFeatured(s)} className="rounded-xl font-bold text-xs gap-1">
                      <Star className="h-4 w-4" /> Toggle Featured
                    </Button>
                  </>
                )}

                {/* 4. Reject & Refund */}
                {!["rejected", "published"].includes(s.status) && (
                  <Button size="sm" variant="destructive" onClick={() => setRejectId(s.id)} className="rounded-xl font-bold text-xs gap-1">
                    <X className="h-4 w-4" /> Reject & Refund
                  </Button>
                )}
              </div>

              {rejectId === s.id && (
                <div className="border border-destructive/30 rounded-2xl p-4 space-y-2.5 bg-destructive/5 min-w-0">
                  <p className="text-xs font-bold text-destructive">Provide Rejection Reason & Issue Refund</p>
                  <Textarea placeholder="Explain why this submission was not approved (shown to entrepreneur in notification)..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} className="rounded-xl text-xs min-w-0 bg-background" />
                  <div className="flex gap-2 flex-wrap pt-1">
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
    published: { label: "Published & Live", variant: "default" },
    rejected: { label: "Rejected", variant: "destructive" },
  };
  const m = map[status] || { label: status, variant: "outline" };
  return <Badge variant={m.variant} className="rounded-xl text-xs font-bold px-2.5 py-0.5">{m.label}</Badge>;
}
