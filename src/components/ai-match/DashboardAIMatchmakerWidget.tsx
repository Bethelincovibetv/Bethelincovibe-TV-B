import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, RefreshCw, CheckCircle2, Building2, MapPin, ExternalLink, Zap, ShieldCheck } from "lucide-react";
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

export default function DashboardAIMatchmakerWidget() {
  const [match, setMatch] = useState<BusinessMatchResult | null>(null);
  const [profile, setProfile] = useState<UserInterestProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

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

  useEffect(() => {
    loadRecommendation();
  }, []);

  const triggerScan = () => {
    loadRecommendation(true);
  };

  const biz = match?.business;
  const dialogue = match?.dialogue;

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
                Live AI Match
              </Badge>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Intelligent, verified Nigerian business & trade recommendations
            </p>
          </div>
        </div>

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
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {loading ? (
          <div className="py-6 text-center space-y-2">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p className="text-xs text-muted-foreground font-medium">
              Maya is analyzing verified businesses matching your intent profile...
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
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                    <span className="font-medium text-primary">
                      {biz.categories?.name || biz.category || "Supplier & Service"}
                    </span>
                    {(biz.city || biz.state) && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {[biz.city, biz.state].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <Button asChild size="sm" className="w-full sm:w-auto rounded-xl text-xs font-bold gap-1 shadow-xs">
                  <Link to={biz.slug ? `/business/${biz.slug}` : `/directory`}>
                    View Profile
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 text-center rounded-2xl bg-muted/20 border border-border/50 space-y-2">
            <Sparkles className="h-7 w-7 text-amber-500 mx-auto" />
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-foreground">Explore Verified Opportunities</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Maya tracks your search trends and requests to deliver tailor-made, verified Nigerian supplier matches without spam.
              </p>
            </div>
            <div className="pt-2">
              <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold gap-1">
                <Link to="/directory">
                  Browse Business Directory
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
