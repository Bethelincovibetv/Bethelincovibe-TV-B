import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Building2,
  MapPin,
  ExternalLink,
  Zap,
  ShieldCheck,
  Coins,
  Sliders,
  Briefcase,
  Play,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import mayaAvatar from "@/assets/images/ai_match_avatar_1788303151852.jpg";
import {
  findBestBusinessMatch,
  BusinessMatchResult,
  getUserInterestProfile,
  UserInterestProfile,
} from "@/lib/aiBusinessRecommenderEngine";
import { useAuth } from "@/contexts/AuthContext";
import {
  getProviderPreferences,
  subscribeToProviderPreferences,
  saveProviderPreferences,
} from "@/services/opportunityMatchingRealtimeService";
import { ProviderOpportunityPreferences } from "@/types/opportunityMatching";
import ProviderPreferencesModal from "@/components/requests/ProviderPreferencesModal";

export default function DashboardAIMatchmakerWidget() {
  const { user } = useAuth();
  const [match, setMatch] = useState<BusinessMatchResult | null>(null);
  const [profile, setProfile] = useState<UserInterestProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  // Real-time Database Table Preferences State
  const [prefs, setPrefs] = useState<ProviderOpportunityPreferences | null>(null);
  const [prefsModalOpen, setPrefsModalOpen] = useState(false);

  const loadRecommendation = async (isManualScan = false) => {
    if (isManualScan) setScanning(true);
    else setLoading(true);

    try {
      const userProfile = getUserInterestProfile();
      setProfile(userProfile);

      const res = await findBestBusinessMatch();
      setMatch(res);
    } catch (err) {
      console.warn("Dashboard AI Matchmaker widget error:", err);
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  const loadPreferences = async () => {
    if (!user) return;
    try {
      const p = await getProviderPreferences(user.id);
      setPrefs(p);
    } catch (err) {
      console.warn("Could not load matchmaker preferences:", err);
    }
  };

  useEffect(() => {
    loadRecommendation();
  }, []);

  useEffect(() => {
    if (!user) return;
    loadPreferences();

    // Subscribe to real-time changes on provider_opportunity_preferences table
    const subscription = subscribeToProviderPreferences(user.id, (newPrefs) => {
      if (newPrefs) {
        setPrefs(newPrefs);
      } else {
        loadPreferences();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const triggerScan = () => {
    loadRecommendation(true);
  };

  const biz = match?.business;
  const dialogue = match?.dialogue;

  const minBudgetFormatted = prefs?.min_budget ? `₦${prefs.min_budget.toLocaleString()}` : "₦0";
  const maxBudgetFormatted = prefs?.max_budget ? `₦${prefs.max_budget.toLocaleString()}` : "Unlimited";
  const locationsDisplay =
    prefs?.preferred_locations && prefs.preferred_locations.length > 0
      ? prefs.preferred_locations.slice(0, 3).join(", ") + (prefs.preferred_locations.length > 3 ? "..." : "")
      : "Nationwide / Remote";

  return (
    <Card className="border-border/80 glass-card shadow-md rounded-3xl overflow-hidden relative">
      {/* Subtle glowing accent */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-gradient-to-bl from-primary/10 via-amber-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

      <CardHeader className="flex-row items-center justify-between bg-muted/20 pb-3 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={mayaAvatar}
              alt="Maya AI Match Specialist"
              className="w-10 h-10 rounded-2xl object-cover ring-2 ring-primary/30 shadow-xs"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base font-extrabold flex items-center gap-1.5 text-foreground">
              Maya AI Matchmaker
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold">
                <Sparkles className="h-2.5 w-2.5 mr-0.5 fill-amber-500 text-amber-500" />
                Real-Time Database Connected
              </Badge>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Smart client matchmaking &amp; verified opportunity routing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPrefsModalOpen(true)}
              className="h-8 text-xs font-bold rounded-xl gap-1 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit Budget &amp; Location</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={triggerScan}
            disabled={scanning}
            className="h-8 text-xs font-bold rounded-xl gap-1 border-border/70 hover:border-primary/50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${scanning ? "animate-spin text-primary" : ""}`} />
            <span className="hidden sm:inline">{scanning ? "Matching..." : "Refresh Match"}</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Real-time Budget & Location Preferences Status Banner */}
        {user && prefs && (
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-foreground font-bold">
                <Coins className="h-3.5 w-3.5 text-emerald-500" />
                <span>Budget:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {minBudgetFormatted} – {maxBudgetFormatted}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-foreground font-bold">
                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                <span>Target Locations:</span>
                <span className="text-muted-foreground truncate max-w-[200px]">{locationsDisplay}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setPrefsModalOpen(true)}
                className="text-[11px] font-black text-primary hover:underline flex items-center gap-1"
              >
                Change Preferences <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-6 text-center space-y-2">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p className="text-xs text-muted-foreground font-medium">
              Maya is analyzing verified businesses matching your real-time budget &amp; location...
            </p>
          </div>
        ) : match && biz ? (
          <div className="space-y-3.5">
            {/* Maya's Intelligent Dialogue Observation */}
            <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/15 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Maya's Recommendation</span>
                {match.confidence && (
                  <span className="ml-auto text-[10px] font-semibold text-muted-foreground">
                    {match.confidence}% match confidence
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-foreground leading-relaxed">
                "{dialogue?.hook || dialogue?.body || `Based on your recent activity, I found a strong match for ${biz.name}.`}"
              </p>
              {dialogue?.whyExplanation && (
                <p className="text-[11px] text-muted-foreground italic">
                  💡 {dialogue.whyExplanation}
                </p>
              )}
            </div>

            {/* Matched Business Summary Box */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-2xl bg-card border border-border/70 gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                {biz.logo_url || biz.image_url ? (
                  <img
                    src={biz.logo_url || biz.image_url}
                    alt={biz.name}
                    className="w-12 h-12 rounded-xl object-cover border border-border/60 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Building2 className="h-6 w-6" />
                  </div>
                )}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-bold text-foreground">{biz.name}</span>
                    {(biz.is_verified || biz.verified) && (
                      <Badge className="h-4 px-1.5 text-[9px] bg-emerald-600 text-white gap-0.5">
                        <ShieldCheck className="h-2.5 w-2.5" /> Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {biz.category_name || "Commercial Enterprise"}
                    {biz.city || biz.state ? ` • ${biz.city || biz.state}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-center justify-end">
                <Button asChild size="sm" className="h-8 rounded-xl text-xs font-black shadow-xs">
                  <Link to={`/biz/${biz.slug || biz.id}`}>
                    Connect Now <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-muted-foreground">
            No instant match yet. Click "Refresh Match" or configure your real-time budget and location preferences above.
          </div>
        )}

        {/* Quick Link to Services & Bookings Management with Video and Samples */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Offering professional services or creative packages?
          </span>
          <Button asChild variant="link" size="sm" className="h-7 text-xs font-black text-primary p-0">
            <Link to="/dashboard/services" className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              Manage Services &amp; Video Showcases <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>

      {/* Modal to edit real-time Matchmaker Opportunity Preferences */}
      {user && prefs && (
        <ProviderPreferencesModal
          open={prefsModalOpen}
          onOpenChange={setPrefsModalOpen}
          preferences={prefs}
          onSaved={(newPrefs) => {
            setPrefs(newPrefs);
            loadRecommendation(true);
          }}
        />
      )}
    </Card>
  );
}
