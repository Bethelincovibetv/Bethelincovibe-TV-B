import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sparkles, Sliders, Search, Coins, Clock, MapPin, Zap, ChevronRight, Flame, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getOpenOpportunities,
  getProviderPreferences,
  subscribeToAllOpenOpportunities,
  subscribeToProviderPreferences,
} from "@/services/opportunityMatchingRealtimeService";
import { BusinessRequest, POPULAR_REQUEST_CATEGORIES, ProviderOpportunityPreferences } from "@/types/opportunityMatching";
import ProviderPreferencesModal from "@/components/requests/ProviderPreferencesModal";

const POPULAR_LOCATION_FILTERS = [
  "ALL",
  "Online / Remote",
  "Lagos",
  "Abuja",
  "Port Harcourt",
  "Nationwide",
];

export default function ProviderOpportunitiesPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<BusinessRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedUrgency, setSelectedUrgency] = useState<string>("ALL");
  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");
  const [prefsModalOpen, setPrefsModalOpen] = useState(false);
  const [preferences, setPreferences] = useState<ProviderOpportunityPreferences | null>(null);

  useEffect(() => {
    if (!user) { setRequests([]); setPreferences(null); return; }
    let mounted = true;

    const loadData = async () => {
      try {
        const [data, prefs] = await Promise.all([
          getOpenOpportunities(user.id),
          getProviderPreferences(user.id),
        ]);
        if (mounted) {
          setRequests(data);
          setPreferences(prefs);
        }
      } catch {
        if (mounted) setRequests([]);
      }
    };
    loadData();

    // Live Firebase Firestore listener: updates instantly when any client creates or updates an opportunity!
    const unsubReqs = subscribeToAllOpenOpportunities((liveList) => {
      if (mounted) {
        setRequests(liveList.filter((r) => r.user_id !== user.id));
      }
    });

    const channelPrefs = subscribeToProviderPreferences(user.id, (newPrefs) => {
      if (newPrefs && mounted) setPreferences(newPrefs);
      else loadData();
    });

    return () => {
      mounted = false;
      unsubReqs();
      void channelPrefs.unsubscribe();
    };
  }, [user]);

  const openOpportunities = requests.filter((r) => r.status === "OPEN" || r.status === "RECEIVING_OFFERS");

  const filtered = openOpportunities.filter((req) => {
    if (selectedCategory !== "ALL" && req.category !== selectedCategory) return false;
    if (selectedUrgency === "URGENT" && req.urgency !== "urgent" && req.urgency !== "high") return false;
    if (selectedLocation !== "ALL") {
      const locMatch = (req.location_preference || "").toLowerCase();
      if (!locMatch.includes(selectedLocation.toLowerCase())) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (
        !req.service_title.toLowerCase().includes(q) &&
        !req.category.toLowerCase().includes(q) &&
        !req.raw_prompt.toLowerCase().includes(q) &&
        !req.location_preference.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <>
      <Helmet>
        <title>Matchmaker Opportunities & Leads | Bethelincovibe TV</title>
        <meta
          name="description"
          content="Discover active customer requests with real-time budget and location matching. Submit competitive offers to grow your business."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-primary/95 to-slate-950 text-white p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30">
                <Flame className="w-3.5 h-3.5" /> High-Intent Customer Demands
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Live Opportunity Matchmaker
              </h1>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                Receive real-time customer opportunities matching your budget range and preferred service locations.
              </p>
            </div>
            {preferences && (
              <Button
                onClick={() => setPrefsModalOpen(true)}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-extrabold rounded-xl shadow-sm gap-2 shrink-0"
              >
                <Sliders className="w-4 h-4" /> Edit Budget & Location (Live)
              </Button>
            )}
          </div>
        </div>

        {/* Live Matchmaker Preference Status Bar */}
        {preferences && (
          <div className="bg-muted/40 border border-border/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Live Preference Sync:
              </span>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 font-bold">
                <Coins className="w-3 h-3 mr-1" />
                ₦{Number(preferences.min_budget || 0).toLocaleString()} – ₦{Number(preferences.max_budget || 0).toLocaleString()}
              </Badge>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 font-bold">
                <MapPin className="w-3 h-3 mr-1" />
                {(preferences.preferred_locations || []).length > 0
                  ? (preferences.preferred_locations || []).slice(0, 3).join(", ") +
                    ((preferences.preferred_locations || []).length > 3 ? ` +${(preferences.preferred_locations || []).length - 3} more` : "")
                  : "All Locations Active"}
              </Badge>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPrefsModalOpen(true)}
              className="text-xs text-primary font-bold hover:bg-primary/10 h-7 rounded-lg px-2.5 self-start md:self-auto"
            >
              Adjust Live Matching Filters →
            </Button>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-card p-4 rounded-2xl border border-border space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search opportunities by keyword, location, or service..."
                className="pl-9 text-xs rounded-xl h-10"
              />
            </div>
            <Button
              size="sm"
              variant={selectedUrgency === "URGENT" ? "default" : "outline"}
              onClick={() => setSelectedUrgency(selectedUrgency === "URGENT" ? "ALL" : "URGENT")}
              className="text-xs font-bold rounded-xl gap-1 whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Urgent Leads Only
            </Button>
          </div>

          {/* Location Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-muted-foreground mr-1 flex items-center gap-1 shrink-0">
              <MapPin className="w-3 h-3 text-primary" /> Location:
            </span>
            {POPULAR_LOCATION_FILTERS.map((loc) => (
              <button
                key={loc}
                onClick={() => setSelectedLocation(loc)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedLocation === loc
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-secondary text-foreground/80 hover:bg-secondary/80"
                }`}
              >
                {loc === "ALL" ? "All Locations" : loc}
              </button>
            ))}
          </div>

          {/* Categories */}
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
              Try adjusting your search keywords, location filters, or target budget preferences to view more requests.
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
                      <Link to={`/dashboard/opportunities/${req.id}`}>{req.service_title}</Link>
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">"{req.raw_prompt}"</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-muted/50 p-2 rounded-xl">
                      <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Coins className="w-3 h-3 text-emerald-600" /> Budget
                      </div>
                      <div className="font-extrabold text-foreground mt-0.5 truncate text-emerald-600">
                        {req.budget_formatted}
                      </div>
                    </div>

                    <div className="bg-muted/50 p-2 rounded-xl">
                      <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-600" /> Deadline
                      </div>
                      <div className="font-extrabold text-foreground mt-0.5 truncate">
                        {req.deadline}
                      </div>
                    </div>

                    <div className="bg-muted/50 p-2 rounded-xl">
                      <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-purple-600" /> Location
                      </div>
                      <div className="font-extrabold text-foreground mt-0.5 truncate">
                        {req.location_preference}
                      </div>
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
