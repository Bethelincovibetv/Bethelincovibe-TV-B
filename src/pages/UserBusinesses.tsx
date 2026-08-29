import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Building2, Plus, Eye, MousePointerClick, Sparkles, Pencil, ExternalLink, TrendingUp, Trash2, ArrowLeft, Wand2, Crown } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";
import BusinessDefaultLogo from "@/components/directory/BusinessDefaultLogo";
import AILogoGeneratorModal from "@/components/AILogoGeneratorModal";
import QueenServiceConciergeModal from "@/components/admin/business/QueenServiceConciergeModal";

export default function UserBusinesses() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(true);
  const [logoModalOpen, setLogoModalOpen] = useState(false);
  const [activeLogoBiz, setActiveLogoBiz] = useState<any | null>(null);
  const [queenModalOpen, setQueenModalOpen] = useState(false);
  const [selectedQueenBiz, setSelectedQueenBiz] = useState<any | null>(null);

  const removeListing = async (id: string) => {
    await supabase.from("supplier_images").delete().eq("supplier_id", id);
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setItems((prev) => prev.filter((b) => b.id !== id));
    toast.success("Listing deleted");
  };

  const handleApplyLogoToBiz = async (logoUrl: string) => {
    if (!activeLogoBiz) return;
    const { error } = await supabase
      .from("suppliers")
      .update({ logo_url: logoUrl })
      .eq("id", activeLogoBiz.id);
    if (error) {
      toast.error("Failed to update logo: " + error.message);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === activeLogoBiz.id ? { ...item, logo_url: logoUrl } : item))
    );
    toast.success(`✨ AI Logo saved to ${activeLogoBiz.name}!`);
  };


  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("*, categories(name)")
        .eq("submitted_by", user.id)
        .order("created_at", { ascending: false });
      const list = data ?? [];
      setItems(list);

      if (list.length) {
        const ids = list.map((s) => s.id);
        const since = new Date(Date.now() - 30 * 86400000).toISOString();
        const { data: evs } = await supabase
          .from("business_events")
          .select("business_id,type,created_at")
          .in("business_id", ids)
          .gte("created_at", since);
        const map: Record<string, any> = {};
        ids.forEach((id) => (map[id] = { views: 0, clicks: 0, daily: {} as Record<string, { views: number; clicks: number }> }));
        (evs ?? []).forEach((e: any) => {
          const day = e.created_at.slice(5, 10);
          map[e.business_id].daily[day] ??= { views: 0, clicks: 0, date: day };
          if (e.type === "view") { map[e.business_id].views++; map[e.business_id].daily[day].views++; }
          else { map[e.business_id].clicks++; map[e.business_id].daily[day].clicks++; }
        });
        Object.keys(map).forEach((k) => {
          map[k].daily = Object.values(map[k].daily).sort((a: any, b: any) => a.date.localeCompare(b.date));
        });
        setStats(map);
      }
      setBusy(false);
    })();
  }, [user]);

  if (loading || busy) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <>
      <Helmet><title>My Business | Bethelincovibe TV</title></Helmet>
      <div className="container mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="h-9 px-2.5 rounded-xl font-bold">
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Dashboard
              </Link>
            </Button>
            <div className="h-6 w-px bg-border hidden sm:block" />
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6 text-primary" />My Business Profile</h1>
              <p className="text-sm text-muted-foreground">Manage your directory presence, track views, and feature your business.</p>
            </div>
          </div>
          <Button asChild size="sm" className="rounded-xl font-bold">
            <Link to="/dashboard/profile-edit">
              <Pencil className="h-4 w-4 mr-1" />Edit Profile & Services
            </Link>
          </Button>
        </div>

        {items.length === 0 ? (
          <Card><CardContent className="py-12 text-center space-y-3">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-1" />
            <h3 className="text-lg font-semibold">No Business Profile in Directory Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Complete your Public Business Profile with your services, contact info, and website cover to automatically appear in the Business Directory.
            </p>
            <Button asChild className="mt-2 rounded-xl font-bold">
              <Link to="/dashboard/profile-edit">Set Up My Business Profile</Link>
            </Button>
          </CardContent></Card>
        ) : (
          <div className="space-y-4">
            {items.map((b) => {
              const s = stats[b.id] || { views: 0, clicks: 0, daily: [] };
              const isBoosted = b.boosted_until && new Date(b.boosted_until) > new Date();
              const approved = b.status === "approved" && b.active;
              return (
                <Card key={b.id} className="overflow-hidden">
                  <CardHeader className="flex flex-row items-start gap-3 pb-3">
                    {b.logo_url ? (
                      <img src={b.logo_url} className="h-12 w-12 rounded-xl object-contain ring-2 ring-primary/20 bg-card p-1" alt="" />
                    ) : (
                      <BusinessDefaultLogo name={b.name} category={b.categories?.name} size="md" shape="rounded-xl" className="h-12 w-12 ring-2 ring-primary/20" />
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate flex items-center gap-2">
                        {b.name}
                        {isBoosted && <Badge className="bg-amber-500 text-white gap-1"><Sparkles className="h-3 w-3" />Featured</Badge>}
                      </CardTitle>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <Badge variant={approved ? "default" : b.status === "rejected" ? "destructive" : "secondary"} className="text-[10px]">
                          {approved ? "Active in Directory" : b.status}
                        </Badge>
                        {b.categories && <span className="text-xs text-muted-foreground">{b.categories.name}</span>}
                        {Array.isArray(b.services) && b.services.length > 0 && (
                          <span className="text-xs text-primary font-medium">{b.services.length} services listed</span>
                        )}
                        {!b.logo_url && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/30">
                            Auto AI Logo Active
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <Stat icon={Eye} label="Views (30d)" value={s.views} />
                      <Stat icon={MousePointerClick} label="Clicks (30d)" value={s.clicks} />
                      <Stat icon={TrendingUp} label="CTR" value={s.views ? `${Math.round((s.clicks / s.views) * 100)}%` : "—"} />
                    </div>

                    {/* Chart */}
                    {s.daily.length > 1 && (
                      <div className="h-24">
                        <ResponsiveContainer>
                          <AreaChart data={s.daily}>
                            <defs>
                              <linearGradient id={`g-${b.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="date" hide />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                            <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill={`url(#g-${b.id})`} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {approved && (
                        <Button asChild size="sm" variant="outline" className="rounded-xl font-medium">
                          <Link to={`/businesses/${b.slug}`}><ExternalLink className="h-3.5 w-3.5 mr-1" />View Public Site</Link>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedQueenBiz(b);
                          setQueenModalOpen(true);
                        }}
                        className="rounded-xl font-bold border-purple-500/40 text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20"
                      >
                        <Crown className="h-3.5 w-3.5 mr-1 text-purple-500" />
                        Queen Concierge AI
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActiveLogoBiz(b);
                          setLogoModalOpen(true);
                        }}
                        className="rounded-xl font-semibold border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-500" />
                        AI Logo Studio
                      </Button>
                      <Button asChild size="sm" variant="outline" className="rounded-xl font-medium">
                        <Link to="/dashboard/profile-edit"><Pencil className="h-3.5 w-3.5 mr-1" />Edit Profile</Link>
                      </Button>
                      {approved && (
                        <Button asChild size="sm" className="rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white shadow-sm">
                          <Link to={`/dashboard/businesses/${b.id}/boost`}><Sparkles className="h-3.5 w-3.5 mr-1" />{isBoosted ? "Extend Promotion" : "Feature My Business"}</Link>
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="rounded-xl font-medium text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete “{b.name}”?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently removes the listing and its photos from the directory. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeListing(b.id)}>Delete listing</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    {b.status === "rejected" && b.rejection_reason && (
                      <p className="text-xs text-destructive">Reason: {b.rejection_reason}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {activeLogoBiz && (
        <AILogoGeneratorModal
          open={logoModalOpen}
          onOpenChange={(isOpen) => {
            setLogoModalOpen(isOpen);
            if (!isOpen) setActiveLogoBiz(null);
          }}
          businessName={activeLogoBiz.name}
          category={activeLogoBiz.categories?.name || "Enterprise"}
          currentLogoUrl={activeLogoBiz.logo_url}
          onSelectLogo={handleApplyLogoToBiz}
        />
      )}

      {selectedQueenBiz && (
        <QueenServiceConciergeModal
          open={queenModalOpen}
          onOpenChange={(isOpen) => {
            setQueenModalOpen(isOpen);
            if (!isOpen) setSelectedQueenBiz(null);
          }}
          business={selectedQueenBiz}
          onSuccess={(res) => {
            setItems((prev) =>
              prev.map((b) =>
                b.id === res.businessId
                  ? {
                      ...b,
                      tagline: res.updatedFields?.tagline || b.tagline,
                      description: res.updatedFields?.description || b.description,
                      services: res.updatedFields?.services || b.services,
                      featured_until: res.featuredUntil || b.featured_until,
                      verified_until: res.verifiedUntil || b.verified_until,
                    }
                  : b
              )
            );
          }}
        />
      )}
    </>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3 w-3" />{label}</div>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}
