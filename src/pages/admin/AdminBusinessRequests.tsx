import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Sliders,
  Coins,
  Clock,
  TrendingUp,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  Search,
  Filter,
  Users,
  RefreshCw,
} from "lucide-react";
import {
  getAllRequests,
  getAllOffers,
  getAdminMatchingConfig,
  saveAdminMatchingConfig,
  getOpportunityAnalyticsMetrics,
  DEFAULT_ADMIN_MATCHING_CONFIG,
} from "@/services/opportunityMatchingRealtimeService";
import { supabase } from "@/integrations/supabase/client";
import {
  BusinessRequest,
  ProviderOffer,
  AdminMatchingConfig,
  RequestAnalyticsMetrics,
} from "@/types/opportunityMatching";
import { toast } from "sonner";

export default function AdminBusinessRequests() {
  const [requests, setRequests] = useState<BusinessRequest[]>([]);
  const [offers, setOffers] = useState<ProviderOffer[]>([]);
  const [metrics, setMetrics] = useState<RequestAnalyticsMetrics | null>(null);
  const [config, setConfig] = useState<AdminMatchingConfig>(DEFAULT_ADMIN_MATCHING_CONFIG);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [inspectRequest, setInspectRequest] = useState<BusinessRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminData();

    const channel = supabase
      .channel("admin_matchmaker_feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "business_requests" }, () => {
        loadAdminData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "provider_offers" }, () => {
        loadAdminData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAdminData = async () => {
    try {
      const [allReqs, allOffs, analytics, admConfig] = await Promise.all([
        getAllRequests(),
        getAllOffers(),
        getOpportunityAnalyticsMetrics(),
        getAdminMatchingConfig(),
      ]);
      setRequests(allReqs);
      setOffers(allOffs);
      setMetrics(analytics);
      setConfig(admConfig);
    } catch (err: any) {
      console.error("Error loading admin matchmaker data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = async (key: keyof AdminMatchingConfig, value: any) => {
    const updated = { ...config, [key]: value };
    setConfig(updated);
    try {
      await saveAdminMatchingConfig(updated);
      toast.success("Matching configuration updated in database");
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration");
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm("Are you sure you want to remove this request from the marketplace?")) return;
    try {
      const { error } = await supabase.from("business_requests").delete().eq("id", id);
      if (error) throw error;
      toast.success("Request removed successfully");
      loadAdminData();
    } catch (err: any) {
      toast.error(err.message || "Could not delete request");
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (selectedStatus !== "ALL" && r.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.service_title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.customer_name.toLowerCase().includes(q) ||
        r.raw_prompt.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getOffersForRequest = (reqId: string) => {
    return offers.filter((o) => o.request_id === reqId);
  };

  return (
    <>
      <Helmet>
        <title>Business Requests & Opportunity Matching Admin | Bethelincovibe TV</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-3xl border border-border shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Opportunity Matching Engine
              </h1>
              <Badge className="bg-primary text-white text-xs font-bold">
                <Sparkles className="w-3 h-3 mr-1" /> Admin Control
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Configure algorithms, monitor customer requests in real-time, and manage provider bidding activity.
            </p>
          </div>

          <Button
            onClick={loadAdminData}
            variant="outline"
            size="sm"
            className="font-bold gap-2 rounded-xl shrink-0"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Data
          </Button>
        </div>

        {/* Analytics KPIs */}
        {metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-2xl p-5 bg-card border border-border shadow-xs">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-muted-foreground uppercase">Total Demands</div>
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-foreground mt-2">{metrics.totalRequests}</div>
              <div className="text-[11px] text-muted-foreground mt-1 font-medium">
                {metrics.openRequests} currently active & matching
              </div>
            </Card>

            <Card className="rounded-2xl p-5 bg-card border border-border shadow-xs">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-muted-foreground uppercase">Offers Submitted</div>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-foreground mt-2">{metrics.totalOffersSubmitted}</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                {metrics.averageOffersPerRequest} avg offers / request
              </div>
            </Card>

            <Card className="rounded-2xl p-5 bg-card border border-border shadow-xs">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-muted-foreground uppercase">Award Rate</div>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-foreground mt-2">{metrics.awardRatePercent}%</div>
              <div className="text-[11px] text-purple-600 font-semibold mt-1">
                {metrics.awardedRequests + metrics.completedRequests} jobs awarded to providers
              </div>
            </Card>

            <Card className="rounded-2xl p-5 bg-card border border-border shadow-xs">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-muted-foreground uppercase">Avg Response Time</div>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-foreground mt-2">~18 mins</div>
              <div className="text-[11px] text-blue-600 font-semibold mt-1">
                From post to first provider offer
              </div>
            </Card>
          </div>
        )}

        {/* Algorithm Configuration Card */}
        <Card className="rounded-3xl border border-border bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg font-extrabold text-foreground">
                Matching Algorithm Controls
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Tweak sensitivity, automated notification dispatches, and provider distribution thresholds.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-4 bg-muted/40 rounded-2xl border border-border/60 flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-foreground">System Enabled</div>
                  <div className="text-muted-foreground text-[11px]">Allow users to post requests</div>
                </div>
                <Switch
                  checked={config.system_enabled}
                  onCheckedChange={(v) => handleConfigChange("system_enabled", v)}
                />
              </div>

              <div className="p-4 bg-muted/40 rounded-2xl border border-border/60 flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-foreground">AI NLP Extraction</div>
                  <div className="text-muted-foreground text-[11px]">Auto parse budget & urgency</div>
                </div>
                <Switch
                  checked={config.ai_understanding_enabled}
                  onCheckedChange={(v) => handleConfigChange("ai_understanding_enabled", v)}
                />
              </div>

              <div className="p-4 bg-muted/40 rounded-2xl border border-border/60 flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-foreground">Provider Alerts</div>
                  <div className="text-muted-foreground text-[11px]">Instant Push & In-app alerts</div>
                </div>
                <Switch
                  checked={config.provider_notifications_enabled}
                  onCheckedChange={(v) => handleConfigChange("provider_notifications_enabled", v)}
                />
              </div>

              <div className="p-4 bg-muted/40 rounded-2xl border border-border/60 flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-foreground">Verified Only</div>
                  <div className="text-muted-foreground text-[11px]">Notify only verified badges</div>
                </div>
                <Switch
                  checked={config.require_verified_providers}
                  onCheckedChange={(v) => handleConfigChange("require_verified_providers", v)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 text-xs">
              <div className="space-y-2 bg-muted/30 p-4 rounded-2xl border border-border/50">
                <div className="flex justify-between font-bold">
                  <span>Minimum Match Score Threshold:</span>
                  <span className="text-primary font-black">{config.min_match_score}%</span>
                </div>
                <Slider
                  value={[config.min_match_score]}
                  min={40}
                  max={95}
                  step={5}
                  onValueChange={([val]) => handleConfigChange("min_match_score", val)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Businesses with a match score equal to or above this threshold receive automated priority leads.
                </p>
              </div>

              <div className="space-y-2 bg-muted/30 p-4 rounded-2xl border border-border/50">
                <div className="flex justify-between font-bold">
                  <span>Max Providers Notified Per Request:</span>
                  <span className="text-primary font-black">{config.max_providers_per_request} businesses</span>
                </div>
                <Slider
                  value={[config.max_providers_per_request]}
                  min={5}
                  max={50}
                  step={5}
                  onValueChange={([val]) => handleConfigChange("max_providers_per_request", val)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Limits the initial notification batch to avoid overwhelming customers with excess bids.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests Management Table */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold text-foreground tracking-tight">
              Live Requests Directory ({filteredRequests.length})
            </h2>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search requests..."
                  className="pl-9 h-9 text-xs rounded-xl"
                />
              </div>

              <div className="flex gap-1 overflow-x-auto">
                {["ALL", "OPEN", "RECEIVING_OFFERS", "AWARDED", "COMPLETED"].map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant={selectedStatus === st ? "default" : "outline"}
                    onClick={() => setSelectedStatus(st)}
                    className="text-[10px] font-bold rounded-xl h-8 whitespace-nowrap"
                  >
                    {st.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-bold border-b border-border">
                  <tr>
                    <th className="p-3.5">Request Title & Customer</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Budget</th>
                    <th className="p-3.5">Deadline</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Offers</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5">
                        <div className="font-extrabold text-foreground max-w-xs truncate">
                          {req.service_title}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          By {req.customer_name} • {new Date(req.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {req.category}
                        </Badge>
                      </td>
                      <td className="p-3.5 font-extrabold text-emerald-600 dark:text-emerald-400">
                        {req.budget_formatted}
                      </td>
                      <td className="p-3.5 text-muted-foreground font-medium">
                        {req.deadline}
                      </td>
                      <td className="p-3.5">
                        <Badge className="text-[10px] font-bold">
                          {req.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 font-bold text-foreground">
                        {req.offers_count || 0}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setInspectRequest(req)}
                            className="h-7 text-xs font-bold gap-1 text-primary"
                          >
                            <Eye className="w-3.5 h-3.5" /> Inspect
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteRequest(req.id)}
                            className="h-7 text-xs font-bold text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal to inspect offers on a request */}
        <Dialog open={Boolean(inspectRequest)} onOpenChange={(v) => { if (!v) setInspectRequest(null); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-6 bg-card border border-border space-y-4">
            {inspectRequest && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold text-foreground">
                    Request Details & Bids: {inspectRequest.service_title}
                  </DialogTitle>
                </DialogHeader>

                <div className="bg-muted/40 p-3.5 rounded-xl border border-border space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer:</span>
                    <span className="font-bold text-foreground">{inspectRequest.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Budget:</span>
                    <span className="font-extrabold text-emerald-600">{inspectRequest.budget_formatted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prompt:</span>
                    <span className="italic text-foreground/90 max-w-sm text-right">"{inspectRequest.raw_prompt}"</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">
                    Submitted Provider Offers ({getOffersForRequest(inspectRequest.id).length})
                  </h4>

                  {getOffersForRequest(inspectRequest.id).length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4 bg-muted/20 rounded-xl">
                      No offers placed yet on this request.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {getOffersForRequest(inspectRequest.id).map((offer) => (
                        <div key={offer.id} className="bg-card p-3 rounded-xl border border-border text-xs space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-foreground">{offer.business_name}</span>
                            <span className="font-black text-emerald-600">₦{offer.proposed_price.toLocaleString()}</span>
                          </div>
                          <div className="text-muted-foreground text-[11px]">
                            Turnaround: {offer.delivery_time} • Status: <span className="font-bold uppercase text-foreground">{offer.status}</span>
                          </div>
                          <p className="text-foreground/90 italic bg-muted/30 p-2 rounded-md">
                            "{offer.proposal}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
