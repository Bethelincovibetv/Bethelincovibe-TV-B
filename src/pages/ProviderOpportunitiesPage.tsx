import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Sliders,
  Search,
  Coins,
  Clock,
  MapPin,
  Building2,
  Send,
  Zap,
  CheckCircle2,
  ChevronRight,
  Filter,
  ShieldCheck,
  Flame,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllRequests,
  getAllOffers,
  getProviderPreferences,
} from "@/services/opportunityMatchingService";
import { BusinessRequest, POPULAR_REQUEST_CATEGORIES, ProviderOpportunityPreferences } from "@/types/opportunityMatching";
import ProviderPreferencesModal from "@/components/requests/ProviderPreferencesModal";

export default function ProviderOpportunitiesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<BusinessRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedUrgency, setSelectedUrgency] = useState<string>("ALL");
  const [prefsModalOpen, setPrefsModalOpen] = useState(false);
  const [preferences, setPreferences] = useState<ProviderOpportunityPreferences | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = () => {
    const all = getAllRequests();
    setRequests(all);

    if (user) {
      setPreferences(getProviderPreferences(user.id));
    }
  };

  const openOpportunities = requests.filter((r) => r.status === "OPEN" || r.status === "RECEIVING_OFFERS");

  const filtered = openOpportunities.filter((req) => {
    // Category filter
    if (selectedCategory !== "ALL" && req.category !== selectedCategory) {
      return false;
    }
    // Urgency filter
    if (selectedUrgency === "URGENT" && req.urgency !== "urgent" && req.urgency !== "high") {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = req.service_title.toLowerCase().includes(q);
      const matchCat = req.category.toLowerCase().includes(q);
      const matchPrompt = req.raw_prompt.toLowerCase().includes(q);
      if (!matchTitle && !matchCat && !matchPrompt) return false;
    }
    return true;
  });

  return (
    <>
      <Helmet>
        <title>Business Opportunities & Leads | Bethelincovibe TV</title>
        <meta name="description" content="Discover active customer requests and submit competitive offers to grow your revenue." />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        {/* Header Hero */}
        <div className="bg-gradient-to-r from-slate-900 via-primary/95 to-slate-950 text-white p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30">
                <Flame className="w-3.5 h-3.5" /> High-Intent Customer Demands
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Live Business Opportunities Hub
              </h1>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                Connect with ready customers across Nigeria. Submit custom proposals, agree on timelines, and win high-paying business jobs.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {preferences && (
                <Button
                  onClick={() => setPrefsModalOpen(true)}
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-extrabold rounded-xl shadow-sm gap-2"
                >
                  <Sliders className="w-4 h-4" /> Alert Settings
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-card p-4 rounded-2xl border border-border space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search opportunities by keyword, category, or service..."
                className="pl-9 text-xs rounded-xl h-10"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <Button
                size="sm"
                variant={selectedUrgency === "URGENT" ? "default" : "outline"}
                onClick={() => setSelectedUrgency(selectedUrgency === "URGENT" ? "ALL" : "URGENT")}
                className="text-xs font-bold rounded-xl gap-1 whitespace-nowrap"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Urgent Leads Only
              </Button>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                selectedCategory === "ALL"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-secondary text-foreground/80 hover:bg-secondary/80"
              }`}
            >
              All Categories ({openOpportunities.length})
            </button>
            {POPULAR_REQUEST_CATEGORIES.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.name
                    ? "bg-primary text-white shadow-xs"
                    : "bg-secondary text-foreground/80 hover:bg-secondary/80"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Opportunities List */}
        {filtered.length === 0 ? (
          <Card className="p-12 text-center rounded-3xl border-dashed border-2 space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-foreground">No matching opportunities found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Try adjusting your category filter or search keywords. New requests are posted continuously.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((req) => (
              <Card
                key={req.id}
                className="rounded-2xl border border-border/80 hover:border-primary/50 transition-all hover:shadow-md bg-card overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5 space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-bold">
                      {req.category}
                    </Badge>
                    {req.urgency === "urgent" ? (
                      <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[11px] font-bold">
                        ⚡ Urgent Turnaround
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-0 text-[11px] font-semibold">
                        🟢 Active Opportunity
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-foreground hover:text-primary transition-colors line-clamp-1">
                      <Link to={`/dashboard/opportunities/${req.id}`}>
                        {req.service_title}
                      </Link>
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      "{req.raw_prompt}"
                    </p>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-muted/50 p-2 rounded-lg">
                      <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Coins className="w-3 h-3 text-emerald-600" /> Budget
                      </div>
                      <div className="font-extrabold text-foreground mt-0.5 truncate">{req.budget_formatted}</div>
                    </div>

                    <div className="bg-muted/50 p-2 rounded-lg">
                      <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-600" /> Deadline
                      </div>
                      <div className="font-extrabold text-foreground mt-0.5 truncate">{req.deadline}</div>
                    </div>

                    <div className="bg-muted/50 p-2 rounded-lg">
                      <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-purple-600" /> Location
                      </div>
                      <div className="font-extrabold text-foreground mt-0.5 truncate">{req.location_preference}</div>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-muted/30 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">
                    <span className="font-bold text-foreground">{req.offers_count || 0}</span> offers placed
                  </span>

                  <Button size="sm" asChild className="font-extrabold text-xs shadow-xs gap-1 rounded-xl">
                    <Link to={`/dashboard/opportunities/${req.id}`}>
                      Submit Offer <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {preferences && (
          <ProviderPreferencesModal
            open={prefsModalOpen}
            onOpenChange={setPrefsModalOpen}
            preferences={preferences}
            onSaved={(p) => setPreferences(p)}
          />
        )}
      </div>
    </>
  );
}
