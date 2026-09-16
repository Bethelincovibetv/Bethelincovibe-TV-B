import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wallet, Heart, Building2, Sparkles, User as UserIcon, Settings, Plus, Mail,
  Calculator, FileText, CreditCard, ShoppingBag, ChevronRight, ExternalLink, Megaphone, Briefcase, Package, MousePointerClick, GraduationCap, Rocket, MessageSquare, Bell, ShieldCheck, Wand2, Activity, ArrowRight, MessageCircle, QrCode, Film, Gift, Smartphone
} from "lucide-react";

import ProfileCompletionCard from "@/components/ProfileCompletionCard";
import OnboardingSetupWizard from "@/components/OnboardingSetupWizard";
import QRCodeDialog from "@/components/QRCodeDialog";
import ProgrammaticAdBanner from "@/components/ProgrammaticAdBanner";
import PostRequestBanner from "@/components/requests/PostRequestBanner";
import DashboardAIMatchmakerWidget from "@/components/ai-match/DashboardAIMatchmakerWidget";

export default function UserDashboard() {
  const { user, loading, isAdmin } = useAuth();
  const { flags } = useFeatureFlags();
  const [params, setParams] = useSearchParams();
  const [wallet, setWallet] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [favCount, setFavCount] = useState(0);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [businessCount, setBusinessCount] = useState(0);
  const [activities, setActivities] = useState<any[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);

  const fetchUserData = async () => {
    if (!user) return;
    const [
      { data: w },
      { data: p },
      { count: fCount },
      { data: rawSubs },
      { count: bCount },
      { data: leads },
      { data: notifications },
      { data: forumPosts }
    ] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("favorites").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("guest_blog_submissions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("suppliers").select("*", { count: "exact", head: true }).eq("submitted_by", user.id),
      supabase.from("sales_page_leads").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("user_notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("forum_posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    ]);

    // Safely hydrate blog_posts relation for submissions
    let subs = rawSubs || [];
    const postIds = subs.map((s: any) => s.generated_post_id).filter(Boolean);
    if (postIds.length > 0) {
      try {
        const { data: posts } = await supabase
          .from("blog_posts")
          .select("id, slug, title")
          .in("id", postIds);
        const postMap = new Map((posts || []).map((post: any) => [post.id, post]));
        subs = subs.map((s: any) => ({
          ...s,
          blog_posts: s.generated_post_id ? postMap.get(s.generated_post_id) : null,
        }));
      } catch (e) {
        console.warn("Could not enrich blog_posts:", e);
      }
    }

    let totalFavs = fCount || 0;
    try {
      const localSaved: string[] = JSON.parse(localStorage.getItem("saved_posts") || "[]");
      if (Array.isArray(localSaved) && localSaved.length > totalFavs) {
        totalFavs = localSaved.length;
      }
    } catch {}

    setWallet(w);
    setProfile(p);
    setFavCount(totalFavs);
    setSubmissions(subs || []);
    setBusinessCount(bCount || 0);

    // Build unified activity timeline
    const feed: any[] = [];

    (leads || []).forEach((lead) => {
      feed.push({
        id: `lead-${lead.id}`,
        type: "lead",
        title: `New lead received from ${lead.name || "a visitor"}`,
        subtitle: lead.notes || lead.email || lead.phone,
        time: lead.created_at,
        icon: Mail,
        color: "text-rose-500 bg-rose-500/10",
        link: "/dashboard/leads",
      });
    });

    (notifications || []).forEach((notif) => {
      feed.push({
        id: `notif-${notif.id}`,
        type: "notification",
        title: notif.title || "System Notification",
        subtitle: notif.body,
        time: notif.created_at,
        icon: Bell,
        color: "text-amber-500 bg-amber-500/10",
        link: notif.url || "/dashboard/notifications",
      });
    });

    (forumPosts || []).forEach((fp) => {
      feed.push({
        id: `forum-${fp.id}`,
        type: "forum",
        title: `Posted in Community Forum: "${fp.title}"`,
        subtitle: fp.category || "General Discussion",
        time: fp.created_at,
        icon: MessageCircle,
        color: "text-teal-500 bg-teal-500/10",
        link: `/forum/${fp.id}`,
      });
    });

    (subs || []).forEach((sub: any) => {
      const isLive = sub.status === "published" || sub.status === "approved";
      const postSlug = sub.blog_posts?.slug || sub.generated_post_id;
      const targetLink = isLive && postSlug ? `/blog/${postSlug}` : "/dashboard/submit-blog";

      feed.push({
        id: `sub-${sub.id}`,
        type: "submission",
        title: `Business submission: "${sub.business_name}"`,
        subtitle: isLive ? "Published & Live on Blog — Tap to view article" : `Status: ${sub.status}`,
        time: sub.created_at,
        icon: Sparkles,
        color: "text-indigo-500 bg-indigo-500/10",
        link: targetLink,
      });
    });

    // Sort by most recent timestamp
    feed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setActivities(feed.slice(0, 8));
  };

  useEffect(() => {
    if (!user) return;
    fetchUserData();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const forceWizard = params.get("wizard") === "1";
    const alreadyDone = localStorage.getItem(`wizard_completed_${user.id}`);
    if (forceWizard || !alreadyDone) {
      setWizardOpen(true);
      if (forceWizard) {
        params.delete("wizard");
        setParams(params, { replace: true });
      }
    }
  }, [user, params]);

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  const balance = wallet?.balance ?? 0;
  const displayName = profile?.display_name || user.email?.split("@")[0];

  const tiles = [
    { to: "/admin", label: "Admin Portal", icon: ShieldCheck, color: "from-amber-500 to-rose-600", show: isAdmin },
    { to: "/dashboard/my-requests", label: "My Requests", icon: Sparkles, color: "from-indigo-600 via-purple-600 to-pink-600", show: flags.matchmaker !== false },
    { to: "/dashboard/opportunities", label: "Opportunities & Bids", icon: Briefcase, color: "from-amber-500 via-orange-500 to-rose-600", show: flags.matchmaker !== false },
    { to: "/dashboard/promoter/profile", label: "Promoter Hub", icon: Smartphone, color: "from-emerald-600 via-teal-600 to-green-600", show: flags.promoter_hub !== false },
    { to: "/dashboard/promoter/earnings", label: "Promoter Earnings", icon: Wallet, color: "from-emerald-500 via-green-600 to-teal-700", show: flags.promoter_hub !== false },
    { to: "/dashboard/whatsapp-engine", label: "WhatsApp Engine", icon: MessageCircle, color: "from-emerald-500 via-teal-500 to-green-600", show: flags.whatsapp_engine },
    { to: "/u/me", label: "My Profile", icon: UserIcon, color: "from-purple-500 to-pink-500", show: true },
    { to: "/referral", label: "Refer & Earn", icon: Gift, color: "from-amber-500 via-rose-500 to-purple-600", show: flags.referrals !== false },
    { to: "/dashboard/services", label: "Services & Bookings", icon: Package, color: "from-emerald-500 via-teal-600 to-cyan-600", show: true },
    { to: "/dashboard/create-video", label: "BTV Video Studio", icon: Film, color: "from-purple-600 via-pink-600 to-amber-500", show: flags.video_creator },
    { to: "/dashboard/wallet", label: "Wallet & Receipts", icon: Wallet, color: "from-emerald-500 to-teal-500", show: flags.wallet },
    { to: "/dashboard/ad-earnings", label: "Ad Earnings", icon: MousePointerClick, color: "from-green-500 to-emerald-600", show: flags.ad_earnings },
    { to: "/dashboard/coach", label: "Coach Bethel Goodgift", icon: Briefcase, color: "from-violet-500 to-fuchsia-500", show: flags.coach },
    { to: "/dashboard/inventory", label: "Inventory", icon: Package, color: "from-orange-500 to-red-500", show: flags.inventory },
    { to: "/dashboard/sales-pages", label: "Sales Pages", icon: Rocket, color: "from-purple-600 to-fuchsia-600", show: flags.sales_pages },
    { to: "/dashboard/products", label: "My Products", icon: Package, color: "from-sky-500 to-blue-600", show: flags.products },
    { to: "/dashboard/payments", label: "Payments", icon: CreditCard, color: "from-slate-600 to-slate-800", show: true },
    { to: "/dashboard/purchases", label: "My Purchases", icon: ShoppingBag, color: "from-lime-500 to-green-600", show: flags.products },
    { to: "/dashboard/leads", label: "My Leads", icon: Mail, color: "from-pink-600 to-rose-500", show: flags.sales_pages },
    { to: "/dashboard/ads", label: "Run Ad", icon: Megaphone, color: "from-fuchsia-500 to-purple-600", show: flags.advertise },
    { to: "/dashboard/favorites", label: "Saved Articles", icon: Heart, color: "from-rose-500 to-orange-500", show: true },
    { to: "/dashboard/my-blogs", label: "My Business Blogs", icon: FileText, color: "from-purple-600 via-indigo-600 to-blue-600", show: flags.guest_blog },
    { to: "/dashboard/submit-blog", label: "Submit Business", icon: Sparkles, color: "from-indigo-500 to-blue-500", show: flags.guest_blog },
    { to: "/dashboard/businesses", label: "My Business", icon: Building2, color: "from-amber-500 to-yellow-500", show: flags.businesses },
    { to: "/dashboard/messages", label: "Encrypted Messages", icon: MessageCircle, color: "from-emerald-500 via-teal-500 to-emerald-600", show: flags.businesses },
    { to: "/dashboard/notifications", label: "Notifications", icon: Bell, color: "from-amber-500 to-rose-600", show: true },
    { to: "/dashboard/graphic-designer", label: "Design & Logo Studio", icon: Sparkles, color: "from-pink-500 via-rose-500 to-amber-500", show: flags.graphic_designer },
    { to: "/dashboard/chat", label: "Realtime Chat", icon: MessageSquare, color: "from-blue-600 via-indigo-600 to-violet-600", show: flags.realtime_chat },
    { to: "/dashboard/verification", label: "Get Verified", icon: ShieldCheck, color: "from-sky-500 via-blue-500 to-indigo-600", show: true },
    { to: "/dashboard/activity", label: "Activity & Inquiries", icon: Activity, color: "from-cyan-500 via-teal-500 to-emerald-600", show: true },
    { to: "/dashboard/settings", label: "Settings", icon: Settings, color: "from-slate-600 to-zinc-800", show: true },
    { to: "/tools/startup-calculator", label: "Calculator", icon: Calculator, color: "from-cyan-500 to-sky-500", show: flags.tools },
    { to: "/learn", label: "Learning Hub", icon: GraduationCap, color: "from-blue-500 to-indigo-600", show: flags.learn },
    { to: "/forum", label: "Community", icon: MessageSquare, color: "from-teal-500 to-cyan-600", show: flags.forum },
  ].filter((t) => t.show);


  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-12">
      <Helmet><title>My Dashboard | Bethelincovibe TV</title></Helmet>

      {/* Mobile-app style header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-purple-700 to-indigo-900 text-white px-4 py-5 sm:py-8 rounded-b-3xl shadow-xl">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />
        <div className="container mx-auto max-w-5xl relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="min-w-0 flex-1 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-white/80">Welcome back</p>
                  {isAdmin && <Badge className="bg-amber-400 text-amber-950 hover:bg-amber-300 text-[10px] font-extrabold shadow-xs">Admin</Badge>}
                </div>
                <h1 className="text-xl sm:text-2xl font-black truncate tracking-tight text-white">{displayName}</h1>
              </div>

              {profile?.username && (
                <Button asChild size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white font-bold border-0 text-xs h-8 px-2.5 md:hidden shrink-0 backdrop-blur-xs">
                  <Link to={`/u/${profile.username}`} target="_blank">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> View Site
                  </Link>
                </Button>
              )}
            </div>

            <div className="flex items-center flex-wrap gap-2 shrink-0 pt-1 md:pt-0">
              {profile?.username && (
                <QRCodeDialog
                  url={`/u/${profile.username}`}
                  title={`${displayName}'s Public Site QR Code`}
                  subtitle="Print on business cards, flyers & banners for customer scanning"
                  trigger={
                    <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white font-bold border-0 shrink-0 text-xs h-9 px-2.5 sm:px-3 backdrop-blur-xs shadow-2xs">
                      <QrCode className="h-4 w-4 sm:mr-1 text-emerald-300" />
                      <span className="hidden sm:inline">My </span>QR Code
                    </Button>
                  }
                />
              )}
              <Button size="sm" variant="secondary" onClick={() => setWizardOpen(true)} className="bg-white/20 hover:bg-white/30 text-white font-bold border-0 shrink-0 text-xs h-9 px-2.5 sm:px-3 backdrop-blur-xs shadow-2xs">
                <Wand2 className="h-4 w-4 sm:mr-1 text-amber-300" />
                <span className="hidden sm:inline">Setup </span>Wizard
              </Button>
              {isAdmin && (
                <Button asChild size="sm" variant="secondary" className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold shadow text-xs h-9 px-2.5 sm:px-3">
                  <Link to="/admin">
                    <ShieldCheck className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Admin </span>Portal
                  </Link>
                </Button>
              )}
              <Button asChild size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white font-bold border-0 shrink-0 text-xs h-9 px-2.5 sm:px-3 backdrop-blur-xs shadow-2xs">
                <Link to="/dashboard/profile-edit">
                  <Settings className="h-4 w-4 sm:mr-1" />
                  <span>Edit Profile</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Wallet card */}
          <Card className="mt-5 glass-card-elevated text-card-foreground shadow-2xl border-white/20 bg-card/95 backdrop-blur-xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5 text-primary" />Wallet Balance</p>
                <p className="text-2xl font-black text-foreground">₦{balance.toLocaleString()}</p>
              </div>
              <Button asChild size="sm" className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
                <Link to="/dashboard/wallet"><Plus className="h-4 w-4 mr-1" />Top Up</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 mt-6 space-y-6">
        {/* Profile & Business Completion Card with Smart System Recommendations */}
        <ProfileCompletionCard
          profile={profile}
          businessCount={businessCount}
          onLaunchWizard={() => setWizardOpen(true)}
        />

        {/* Setup Wizard Modal */}
        <OnboardingSetupWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          user={user}
          profile={profile}
          onProfileUpdated={fetchUserData}
        />

        {/* Maya AI Matchmaker & Intelligent Recommendations */}
        {(flags.matchmaker !== false || flags.ai_recommender !== false) && <DashboardAIMatchmakerWidget />}

        {/* Smart Opportunity & Request Matcher Banner */}
        {flags.matchmaker !== false && <PostRequestBanner variant="compact" />}

        {/* Quick Link Tile Grid — 3D Glossy App Style */}
        <div className="grid grid-cols-2 min-[400px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
          {tiles.filter((t) => t.show).map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="group flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-border/80 glass-card p-3.5 text-center shadow-xs hover:shadow-xl hover:border-primary/50 transition-all duration-300 active:scale-95"
            >
              {/* 3D Elevated Icon Badge */}
              <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${t.color} flex items-center justify-center text-white shadow-[0_6px_16px_-3px_rgba(0,0,0,0.32),inset_0_1.5px_0_rgba(255,255,255,0.45)] ring-2 ring-white/20 transition-transform group-hover:scale-110 duration-300`}>
                <t.icon className="h-6 w-6 drop-shadow-sm" strokeWidth={2.2} />
              </div>
              <span className="text-xs sm:text-sm font-bold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {t.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Programmatic Sponsored Ad Banner */}
        <ProgrammaticAdBanner placement="dashboard" format="banner" className="my-2" />

        {/* Recent Activity Feed */}
        <Card className="border-border/80 glass-card shadow-md rounded-3xl overflow-hidden">
          <CardHeader className="flex-row items-center justify-between bg-muted/30 pb-3 border-b border-border/60">
            <CardTitle className="text-base font-extrabold flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Activity className="h-4 w-4" />
              </div>
              Recent Activity Feed
            </CardTitle>
            <Badge variant="secondary" className="font-bold text-xs rounded-lg">
              {activities.length} Recent
            </Badge>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            {activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground space-y-2">
                <p className="text-sm font-medium">No recent activity detected yet.</p>
                <p className="text-xs">Inquiries, leads, notifications, and forum activity will appear here in real-time.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((act) => {
                  const Icon = act.icon;
                  return (
                    <Link
                      key={act.id}
                      to={act.link}
                      className="flex items-start gap-3 p-3 rounded-2xl border border-border/50 hover:bg-muted/40 transition-all group"
                    >
                      <div className={`p-2.5 rounded-2xl shrink-0 ${act.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {act.title}
                        </p>
                        {act.subtitle && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {act.subtitle}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground/80 font-medium">
                          {new Date(act.time).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center" />
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Link to="/dashboard/favorites" className="block">
            <Card className="glass-card hover:border-primary/50 transition-all h-full">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Saved Posts</p>
                <p className="text-2xl font-bold">{favCount}</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/dashboard/my-blogs" className="block">
            <Card className="glass-card hover:border-primary/50 transition-all h-full">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Blog Submissions</p>
                <p className="text-2xl font-bold text-primary">{submissions.length}</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/dashboard/profile-edit" className="col-span-2 sm:col-span-1 block">
            <Card className="glass-card hover:border-primary/50 transition-all h-full">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Profile Status</p>
                <p className="text-sm font-semibold mt-1">
                  {profile?.username ? (
                    <Badge variant="secondary" className="font-bold">@{profile.username}</Badge>
                  ) : (
                    <Badge variant="outline">Set username</Badge>
                  )}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
