import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Clock, Coins, ChevronRight, ShieldCheck, MessageSquare, Filter, MapPin, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getRequestsForUser, subscribeToUserRequests } from "@/services/opportunityMatchingRealtimeService";
import { BusinessRequest, RequestStatus } from "@/types/opportunityMatching";
import PostRequestModal from "@/components/requests/PostRequestModal";
import EditRequestBudgetLocationModal from "@/components/requests/EditRequestBudgetLocationModal";

export default function CustomerMyRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<BusinessRequest[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<BusinessRequest | null>(null);

  useEffect(() => {
    if (!user) { setRequests([]); return; }
    let mounted = true;
    const loadRequests = async () => {
      try {
        const data = await getRequestsForUser(user.id);
        if (mounted) setRequests(data.filter(r => r.user_id === user.id));
      } catch {
        if (mounted) setRequests([]);
      }
    };
    loadRequests();
    const channel = subscribeToUserRequests(user.id, loadRequests);
    return () => { mounted = false; void channel.unsubscribe(); };
  }, [user]);

  const filteredRequests = requests.filter((r) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "OPEN") return r.status === "OPEN" || r.status === "RECEIVING_OFFERS";
    if (activeFilter === "AWARDED") return r.status === "AWARDED" || r.status === "IN_PROGRESS";
    if (activeFilter === "COMPLETED") return r.status === "COMPLETED";
    return true;
  });

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case "RECEIVING_OFFERS": return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">🟢 Receiving Offers</Badge>;
      case "OPEN": return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30">🔵 Open</Badge>;
      case "AWARDED": return <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30">🟣 Awarded</Badge>;
      case "IN_PROGRESS": return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">🟡 In Progress</Badge>;
      case "COMPLETED": return <Badge className="bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30">⚪ Completed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Helmet>
        <title>My Requests & Matchmaker Opportunities | Bethelincovibe TV</title>
        <meta name="description" content="Track your posted requests, compare provider offers, and award jobs to verified Nigerian businesses." />
      </Helmet>
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-6 rounded-3xl border border-border shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">My Requests & Matchmaker</h1>
              <Badge className="bg-primary text-white text-xs"><Sparkles className="w-3 h-3 mr-1" /> Realtime Matching</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              View all services you’ve requested, update budget and location in real time, and award projects.
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)} className="font-extrabold shadow-md gap-2 rounded-xl shrink-0">
            <Plus className="w-4 h-4" /> Post a Request
          </Button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-muted-foreground mr-1 shrink-0" />
          {[
            { key: "ALL", label: `All (${requests.length})` },
            { key: "OPEN", label: "Active & Receiving Offers" },
            { key: "AWARDED", label: "Awarded" },
            { key: "COMPLETED", label: "Completed" }
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={activeFilter === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(tab.key)}
              className="rounded-xl text-xs font-bold whitespace-nowrap"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {filteredRequests.length === 0 ? (
          <Card className="rounded-3xl border-dashed border-2 p-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto"><Sparkles className="w-7 h-7" /></div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-foreground">No requests found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">You haven't posted any business requests under this filter yet.</p>
            </div>
            <Button onClick={() => setModalOpen(true)} className="font-bold gap-2"><Plus className="w-4 h-4" /> Post What You Need</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRequests.map((req) => {
              const canEdit = req.status === "OPEN" || req.status === "RECEIVING_OFFERS";
              return (
                <Card key={req.id} className="rounded-2xl border border-border/80 hover:border-primary/40 transition-all hover:shadow-md bg-card overflow-hidden flex flex-col justify-between">
                  <div className="p-5 space-y-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-bold">
                        {req.category}
                      </Badge>
                      {getStatusBadge(req.status)}
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-foreground hover:text-primary transition-colors line-clamp-1">
                        <Link to={`/dashboard/my-requests/${req.id}`}>{req.service_title}</Link>
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">"{req.raw_prompt}"</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                      <div className="flex flex-col text-foreground/90 font-bold bg-muted/50 p-2 rounded-xl">
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                          <Coins className="w-3 h-3 text-emerald-600" /> Budget
                        </span>
                        <span className="text-emerald-600 font-extrabold truncate mt-0.5">{req.budget_formatted}</span>
                      </div>
                      <div className="flex flex-col text-foreground/90 font-bold bg-muted/50 p-2 rounded-xl">
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-purple-600" /> Location
                        </span>
                        <span className="truncate mt-0.5">{req.location_preference}</span>
                      </div>
                      <div className="flex flex-col text-foreground/90 font-bold bg-muted/50 p-2 rounded-xl">
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-600" /> Timeline
                        </span>
                        <span className="truncate mt-0.5">{req.deadline}</span>
                      </div>
                    </div>

                    {req.selected_business_name && (
                      <div className="bg-purple-500/10 text-purple-900 dark:text-purple-200 border border-purple-500/20 rounded-xl p-2.5 text-xs flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                        <div>
                          Awarded to <span className="font-extrabold">{req.selected_business_name}</span> for <span className="font-extrabold">₦{req.agreed_price?.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-5 py-3 bg-muted/30 border-t border-border flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-primary" />
                      <span className="font-bold text-foreground">{req.offers_count || 0}</span> offers
                    </div>

                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingRequest(req)}
                          className="h-8 text-xs font-bold gap-1 rounded-lg hover:bg-primary/10 text-primary"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          Edit Terms
                        </Button>
                      )}
                      <Button size="sm" asChild className="h-8 text-xs font-bold gap-1 rounded-lg">
                        <Link to={`/dashboard/my-requests/${req.id}`}>
                          View Offers <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <PostRequestModal open={modalOpen} onOpenChange={setModalOpen} />

        {editingRequest && user && (
          <EditRequestBudgetLocationModal
            open={!!editingRequest}
            onOpenChange={(open) => {
              if (!open) setEditingRequest(null);
            }}
            request={editingRequest}
            userId={user.id}
            onUpdated={(updated) => {
              setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            }}
          />
        )}
      </div>
    </>
  );
}
