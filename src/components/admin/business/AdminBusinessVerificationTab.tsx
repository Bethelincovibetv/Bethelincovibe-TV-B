import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShieldCheck, ShieldAlert, Plus, Pencil, Trash2, Search, Check, X,
  Clock, DollarSign, Wallet, Sparkles, Building2, UserCheck, RefreshCw, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_VERIFICATION_PACKAGES, VerificationPackage } from "@/components/VerificationModal";
import { Link } from "react-router-dom";

export default function AdminBusinessVerificationTab() {
  const queryClient = useQueryClient();

  // Search & Filter
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expired">("all");

  // Manual Grant Modal
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [selectedBizId, setSelectedBizId] = useState("");
  const [selectedPlanDays, setSelectedPlanDays] = useState(365);
  const [grantNotes, setGrantNotes] = useState("");

  // Plans Management State
  const [plans, setPlans] = useState<VerificationPackage[]>(DEFAULT_VERIFICATION_PACKAGES);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansSaving, setPlansSaving] = useState(false);
  const [planEditModalOpen, setPlanEditModalOpen] = useState(false);
  const [editingPlanIndex, setEditingPlanIndex] = useState<number | null>(null);
  const [planForm, setPlanForm] = useState<VerificationPackage>({
    id: "",
    label: "",
    durationDays: 90,
    price: 5000,
    description: "",
    popular: false,
  });

  // Fetch Businesses
  const { data: businesses = [], isLoading: bizLoading, refetch } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*, categories(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch Owners Map
  const { data: profilesMap = {} } = useQuery({
    queryKey: ["admin-business-owners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, email, username, avatar_url, social_links");
      const map: Record<string, any> = {};
      (data || []).forEach((p: any) => {
        map[p.user_id] = p;
      });
      return map;
    },
  });

  // Fetch Verification Wallet Transactions
  const { data: verificationTransactions = [] } = useQuery({
    queryKey: ["admin-verification-txs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .or("description.ilike.%verif%,reference_id.ilike.VERIFY-%")
        .order("created_at", { ascending: false });
      if (error) return [];
      return data ?? [];
    },
  });

  // Load configured plans from site_settings
  useEffect(() => {
    (async () => {
      setPlansLoading(true);
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "verification_packages")
          .maybeSingle();

        if (data?.value) {
          const parsed = JSON.parse(data.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPlans(parsed);
          }
        }
      } catch (err) {
        console.error("Failed to load verification packages", err);
      } finally {
        setPlansLoading(false);
      }
    })();
  }, []);

  // Save plans mutation
  const savePlans = async (updatedPlans: VerificationPackage[]) => {
    setPlansSaving(true);
    try {
      const { error } = await supabase.from("site_settings").upsert(
        {
          key: "verification_packages",
          value: JSON.stringify(updatedPlans),
        },
        { onConflict: "key" }
      );
      if (error) throw error;
      setPlans(updatedPlans);
      toast.success("Verification plans configuration saved live!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save verification plans");
    } finally {
      setPlansSaving(false);
    }
  };

  // Toggle or Update Verification
  const updateVerificationMutation = useMutation({
    mutationFn: async ({
      bizId,
      verified,
      days,
    }: {
      bizId: string;
      verified: boolean;
      days?: number;
    }) => {
      const targetBiz = businesses.find((b: any) => b.id === bizId);
      if (!targetBiz) throw new Error("Business not found");

      const now = new Date();
      const endsAt = verified && days ? new Date(now.getTime() + days * 86400000).toISOString() : null;
      const currentLinks = (targetBiz.social_links as Record<string, any>) || {};
      const nextLinks = {
        ...currentLinks,
        verified,
        verified_until: endsAt,
        verified_by_admin: true,
        verified_at: verified ? now.toISOString() : null,
      };

      // 1. Update supplier record
      const { error: sErr } = await supabase
        .from("suppliers")
        .update({ social_links: nextLinks })
        .eq("id", bizId);
      if (sErr) throw sErr;

      // 2. If submitted_by user exists, update their profile too
      if (targetBiz.submitted_by) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("social_links")
          .eq("user_id", targetBiz.submitted_by)
          .maybeSingle();
        if (prof) {
          const profLinks = (prof.social_links as Record<string, any>) || {};
          await supabase
            .from("profiles")
            .update({
              social_links: {
                ...profLinks,
                verified,
                verified_until: endsAt,
              },
            })
            .eq("user_id", targetBiz.submitted_by);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-business-owners"] });
      toast.success(
        variables.verified
          ? "Blue Tick Verification granted successfully!"
          : "Verification revoked."
      );
      setGrantModalOpen(false);
      setSelectedBizId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Filter verified businesses
  const verifiedList = useMemo(() => {
    return businesses.filter((b: any) => {
      const sl = (b.social_links as Record<string, any>) || {};
      const isCurrentlyVerified =
        !!sl?.verified || (!!sl?.verified_until && new Date(sl.verified_until) > new Date());
      const isExpired = !!sl?.verified_until && new Date(sl.verified_until) <= new Date() && !sl.verified;

      if (filter === "active" && !isCurrentlyVerified) return false;
      if (filter === "expired" && !isExpired) return false;
      if (filter === "all" && !isCurrentlyVerified && !isExpired && !sl?.verified_at) return false;

      if (search.trim()) {
        const owner = profilesMap[b.submitted_by];
        const text = [
          b.name,
          b.slug,
          b.phone,
          owner?.display_name,
          owner?.email,
          owner?.username,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.includes(search.toLowerCase())) return false;
      }

      return true;
    });
  }, [businesses, profilesMap, search, filter]);

  // High level metrics
  const activeVerifiedCount = businesses.filter((b: any) => {
    const sl = (b.social_links as Record<string, any>) || {};
    return !!sl?.verified || (!!sl?.verified_until && new Date(sl.verified_until) > new Date());
  }).length;

  const totalRevenue = verificationTransactions.reduce((acc: number, tx: any) => {
    return acc + Number(tx.amount || 0);
  }, 0);

  const openAddPlan = () => {
    setEditingPlanIndex(null);
    setPlanForm({
      id: `plan_${Date.now()}`,
      label: "",
      durationDays: 30,
      price: 3000,
      description: "",
      popular: false,
    });
    setPlanEditModalOpen(true);
  };

  const openEditPlan = (index: number) => {
    setEditingPlanIndex(index);
    setPlanForm({ ...plans[index] });
    setPlanEditModalOpen(true);
  };

  const handleSavePlanForm = () => {
    if (!planForm.label.trim()) {
      toast.error("Plan name is required");
      return;
    }
    const next = [...plans];
    if (editingPlanIndex !== null) {
      next[editingPlanIndex] = planForm;
    } else {
      next.push(planForm);
    }
    savePlans(next);
    setPlanEditModalOpen(false);
  };

  const handleDeletePlan = (index: number) => {
    if (plans.length <= 1) {
      toast.error("You must have at least one verification plan active.");
      return;
    }
    if (confirm(`Delete plan "${plans[index].label}"?`)) {
      const next = plans.filter((_, i) => i !== index);
      savePlans(next);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Verified Businesses</span>
            <ShieldCheck className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-2">{activeVerifiedCount}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Active Blue Tick badges live</p>
        </Card>

        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Verification Plans</span>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{plans.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Configured pricing tiers</p>
        </Card>

        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            ₦{totalRevenue.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Paid badge subscriptions</p>
        </Card>

        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Transactions Logged</span>
            <Wallet className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{verificationTransactions.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Wallet verification records</p>
        </Card>
      </div>

      {/* Verification Pricing Plans Configuration */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-sky-500" />
              Verification Plans &amp; Pricing Engine
            </CardTitle>
            <CardDescription className="text-xs">
              Configure available Blue Tick subscription duration, pricing (₦), benefits, and popular badges shown to merchants.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={openAddPlan}
            className="rounded-xl font-bold text-xs gap-1 h-8"
          >
            <Plus className="h-3.5 w-3.5" /> Add Plan
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p, idx) => (
              <div
                key={p.id || idx}
                className="p-3.5 rounded-2xl border bg-muted/20 relative space-y-2 flex flex-col justify-between"
              >
                {p.popular && (
                  <Badge className="absolute -top-2.5 right-3 bg-sky-500 text-white font-bold text-[9px] px-2">
                    Popular
                  </Badge>
                )}
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-foreground truncate">{p.label}</h4>
                    <span className="text-xs font-extrabold text-primary">₦{Number(p.price).toLocaleString()}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                    {p.description || "Official Blue Tick verified trust badge."}
                  </p>
                  <div className="mt-2 text-[10px] font-semibold text-foreground/80 flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-sky-500" />
                    {p.durationDays} Days ({Math.round(p.durationDays / 30)} mo)
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1 pt-2 border-t mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditPlan(idx)}
                    className="h-7 px-2 text-xs font-bold rounded-lg"
                  >
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeletePlan(idx)}
                    className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 rounded-lg"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Verified Businesses Management Section */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Verified Businesses ({verifiedList.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Inspect businesses with active Blue Tick verification, extend memberships, or grant verification manually.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setSelectedBizId("");
                  setGrantModalOpen(true);
                }}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl h-8 gap-1"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Grant Verification
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                className="h-8 w-8 rounded-xl"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Search & Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search verified business by name, phone, owner..."
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
            <div className="flex gap-1">
              {(["all", "active", "expired"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "outline"}
                  onClick={() => setFilter(f)}
                  className="capitalize text-xs h-8 rounded-xl"
                >
                  {f}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {bizLoading ? (
            <p className="text-center text-xs text-muted-foreground py-8">Loading verification records...</p>
          ) : verifiedList.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <ShieldCheck className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-bold text-foreground">No verification records found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Use &ldquo;Grant Verification&rdquo; above to assign Blue Tick status to any registered business.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {verifiedList.map((b: any) => {
                const owner = profilesMap[b.submitted_by];
                const sl = (b.social_links as Record<string, any>) || {};
                const isCurrentlyVerified =
                  !!sl?.verified || (!!sl?.verified_until && new Date(sl.verified_until) > new Date());
                const endsAt = sl?.verified_until ? new Date(sl.verified_until) : null;

                return (
                  <div
                    key={b.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="h-11 w-11 rounded-xl bg-muted border overflow-hidden flex items-center justify-center p-1 shrink-0">
                        {b.logo_url ? (
                          <img src={b.logo_url} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-foreground truncate">{b.name}</span>
                          <Badge
                            className={`text-[10px] font-bold gap-1 px-1.5 py-0 ${
                              isCurrentlyVerified
                                ? "bg-sky-500 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <ShieldCheck className="h-3 w-3" />
                            {isCurrentlyVerified ? "Active Blue Tick" : "Expired"}
                          </Badge>
                          {sl?.verified_by_admin && (
                            <Badge variant="outline" className="text-[9px] py-0 text-muted-foreground">
                              Admin Verified
                            </Badge>
                          )}
                        </div>

                        <p className="text-muted-foreground">
                          Owner:{" "}
                          <strong className="text-foreground/90">
                            {owner?.display_name || owner?.username || owner?.email || "Unknown"}
                          </strong>{" "}
                          · Category: {b.categories?.name || "Commerce"}
                        </p>

                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3 text-sky-500" />
                          {endsAt ? (
                            <span>
                              {isCurrentlyVerified ? "Valid until: " : "Expired on: "}
                              <strong>{endsAt.toLocaleDateString()}</strong>
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              Permanent Verification
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="h-8 px-2.5 text-xs font-bold rounded-xl"
                      >
                        <Link to={`/businesses/${b.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" /> Profile
                        </Link>
                      </Button>

                      {isCurrentlyVerified ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            updateVerificationMutation.mutate({
                              bizId: b.id,
                              verified: false,
                            })
                          }
                          className="h-8 px-2.5 text-xs font-bold rounded-xl"
                          disabled={updateVerificationMutation.isPending}
                        >
                          Revoke Tick
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateVerificationMutation.mutate({
                              bizId: b.id,
                              verified: true,
                              days: 365,
                            })
                          }
                          className="h-8 px-2.5 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl"
                          disabled={updateVerificationMutation.isPending}
                        >
                          Re-Verify (1 Year)
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Payments & Wallet Ledger */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-500" />
            Verification Transaction Ledger ({verificationTransactions.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Real wallet debit records for verified badge purchases across the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {verificationTransactions.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">
              No wallet verification payments recorded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {verificationTransactions.map((tx: any) => {
                const owner = profilesMap[tx.user_id];
                return (
                  <div
                    key={tx.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border bg-muted/10 gap-2 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-bold text-foreground truncate">{tx.description}</p>
                      <p className="text-muted-foreground text-[11px]">
                        User: <strong>{owner?.display_name || owner?.email || tx.user_id.slice(0, 8)}</strong> · Ref:{" "}
                        <span className="font-mono">{tx.reference_id || tx.id.slice(0, 8)}</span>
                      </p>
                    </div>
                    <div className="text-right sm:text-right shrink-0">
                      <p className="font-bold text-primary text-sm">₦{Number(tx.amount || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Grant Verification Dialog */}
      <Dialog open={grantModalOpen} onOpenChange={setGrantModalOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
              <ShieldCheck className="h-6 w-6" />
              <DialogTitle>Grant Blue Tick Verification</DialogTitle>
            </div>
            <DialogDescription>
              Authorize official Blue Tick status for a registered business or supplier profile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Select Business</Label>
              <Select value={selectedBizId} onValueChange={setSelectedBizId}>
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue placeholder="Choose a business..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {businesses.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.categories?.name || "Commerce"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Verification Duration</Label>
              <Select
                value={String(selectedPlanDays)}
                onValueChange={(v) => setSelectedPlanDays(Number(v))}
              >
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">1 Month (30 Days)</SelectItem>
                  <SelectItem value="90">3 Months (90 Days)</SelectItem>
                  <SelectItem value="180">6 Months (180 Days)</SelectItem>
                  <SelectItem value="365">1 Year (365 Days)</SelectItem>
                  <SelectItem value="3650">10 Years / Lifetime</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Admin Audit Notes</Label>
              <Input
                value={grantNotes}
                onChange={(e) => setGrantNotes(e.target.value)}
                placeholder="e.g. Identity verified, physical storefront confirmed"
                className="rounded-xl text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGrantModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  updateVerificationMutation.mutate({
                    bizId: selectedBizId,
                    verified: true,
                    days: selectedPlanDays,
                  })
                }
                disabled={!selectedBizId || updateVerificationMutation.isPending}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl"
              >
                Grant Blue Tick
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plan Edit Modal */}
      <Dialog open={planEditModalOpen} onOpenChange={setPlanEditModalOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingPlanIndex !== null ? "Edit Verification Plan" : "Create New Verification Plan"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure name, duration, price in ₦, and description for this verification tier.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Plan Name / Label</Label>
              <Input
                value={planForm.label}
                onChange={(e) => setPlanForm({ ...planForm, label: e.target.value })}
                placeholder="e.g. 6 Months Verified"
                className="text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Duration (Days)</Label>
                <Input
                  type="number"
                  value={planForm.durationDays}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, durationDays: Number(e.target.value) })
                  }
                  className="text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Price (₦)</Label>
                <Input
                  type="number"
                  value={planForm.price}
                  onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                  className="text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Description / Value Proposition</Label>
              <Textarea
                rows={2}
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                placeholder="e.g. Highest trust tier with VIP search placement and direct badge."
                className="text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Switch
                checked={!!planForm.popular}
                onCheckedChange={(v) => setPlanForm({ ...planForm, popular: v })}
              />
              <Label className="text-xs font-bold">Mark as &ldquo;Popular / Best Value&rdquo;</Label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPlanEditModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSavePlanForm}
                disabled={plansSaving}
                className="font-bold text-xs rounded-xl"
              >
                Save Plan
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
