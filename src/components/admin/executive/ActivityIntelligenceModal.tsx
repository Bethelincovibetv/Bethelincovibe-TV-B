import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Users,
  ShieldCheck,
  TrendingUp,
  Tag,
  CheckCircle2,
  Lock,
  Compass,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { computeFirstPartyInterestProfiles } from "@/lib/executiveOrchestrationEngine";

interface ActivityIntelligenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ActivityIntelligenceModal({
  open,
  onOpenChange,
}: ActivityIntelligenceModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await computeFirstPartyInterestProfiles();
      setData(res);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border border-border/80 shadow-2xl bg-card">
        {/* Header */}
        <div className="p-6 pb-4 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-white border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold">
                <BarChart3 className="h-3.5 w-3.5 text-purple-400" /> First-Party Intelligence
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                User Interest & Activity Intelligence Hub
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300">
                Audience segment mapping derived strictly from non-sensitive, first-party navigation & category engagement.
              </DialogDescription>
            </div>

            <Button
              onClick={loadData}
              disabled={loading}
              size="sm"
              variant="outline"
              className="border-purple-400/40 text-purple-200 hover:bg-purple-500/20 text-xs font-bold gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {data && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Audience</p>
                <p className="text-xl font-black text-white">{data.totalAudienceCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="text-[10px] uppercase font-bold text-emerald-300">Eligible Recipients</p>
                <p className="text-xl font-black text-emerald-400">{data.eligiblePromotionalCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center col-span-2 sm:col-span-1">
                <p className="text-[10px] uppercase font-bold text-purple-300">Interest Clusters</p>
                <p className="text-xl font-black text-purple-400">{data.topInterestClusters?.length || 0}</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Privacy Box */}
          <div className="p-3.5 rounded-2xl bg-muted/60 border border-border/80 flex items-start gap-2.5 text-xs">
            <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-foreground">Privacy Protection & Anti-Spam Safeguards</p>
              <p className="text-muted-foreground leading-relaxed">{data?.privacyStatement}</p>
            </div>
          </div>

          {/* Interest Clusters Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-muted-foreground tracking-wider">
              Top Engagement & Interest Clusters
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data?.topInterestClusters?.map((c: any, i: number) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/40 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{c.category}</span>
                    <Badge className="bg-primary/10 text-primary text-[10px] font-bold">
                      {c.count} Signals
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {c.sampleKeywords?.map((kw: string, ki: number) => (
                      <span
                        key={ki}
                        className="px-2 py-0.5 rounded-lg bg-muted text-muted-foreground text-[10px] font-medium"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
