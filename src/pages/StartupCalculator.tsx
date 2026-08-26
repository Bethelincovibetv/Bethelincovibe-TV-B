import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Calculator, Sparkles, TrendingUp, Wallet, Target, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Metrics {
  runwayMonths: string;
  monthlyProfit: number;
  breakEvenMonths: string;
  annualProfit: number;
  roi: string;
}

export default function StartupCalculator() {
  const [form, setForm] = useState({
    businessIdea: "",
    industry: "",
    location: "Lagos, Nigeria",
    startupCapital: "",
    monthlyExpenses: "",
    expectedRevenue: "",
    teamSize: "1",
  });
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string>("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const update = (k: string, v: string) => setForm({ ...form, [k]: v });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessIdea || !form.startupCapital) {
      toast.error("Please describe your idea and enter startup capital");
      return;
    }
    setLoading(true);
    setAnalysis("");
    setMetrics(null);
    try {
      const { data, error } = await supabase.functions.invoke("startup-calculator", { body: form });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data.analysis);
      setMetrics(data.metrics);
    } catch (err: any) {
      toast.error(err.message || "Could not analyze right now");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => `₦${n.toLocaleString()}`;

  return (
    <>
      <Helmet>
        <title>AI Startup Calculator | Bethelincovibe TV</title>
        <meta name="description" content="Free AI-powered startup business calculator for Nigerian entrepreneurs. Calculate runway, ROI, break-even and get smart business advice." />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-3">
            <Sparkles className="h-4 w-4" />
            Interactive Business Financial Feasibility
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3 text-foreground">
            Startup Business Feasibility Calculator
          </h1>
          <p className="text-base sm:text-lg font-medium text-foreground/85 max-w-2xl mx-auto leading-relaxed">
            Test your business concept before risking capital. Calculate your financial runway, projected breakeven point, return on investment (ROI), and receive step-by-step AI advisory.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="border-border/90 shadow-sm rounded-3xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-black flex items-center gap-2 text-foreground">
                <Calculator className="h-5 w-5 text-primary" /> Enter Your Business Financials
              </CardTitle>
              <CardDescription className="text-xs font-medium text-muted-foreground">
                Provide estimated figures. The calculator projects profitability based on localized Nigerian market dynamics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="idea" className="font-bold text-xs text-foreground">Business Idea &amp; Value Proposition *</Label>
                  <Textarea id="idea" rows={3} placeholder="e.g. Mobile car wash service for corporate workers in Lekki Phase 1" value={form.businessIdea} onChange={(e) => update("businessIdea", e.target.value)} className="mt-1 font-medium text-sm rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="ind" className="font-bold text-xs text-foreground">Industry / Sector</Label>
                    <Input id="ind" placeholder="e.g. Food, Logistics, Retail" value={form.industry} onChange={(e) => update("industry", e.target.value)} className="mt-1 font-medium text-sm rounded-xl" />
                  </div>
                  <div>
                    <Label htmlFor="loc" className="font-bold text-xs text-foreground">Location</Label>
                    <Input id="loc" value={form.location} onChange={(e) => update("location", e.target.value)} className="mt-1 font-medium text-sm rounded-xl" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cap" className="font-bold text-xs text-foreground">Starting Capital (₦) *</Label>
                  <Input id="cap" type="number" placeholder="500000" value={form.startupCapital} onChange={(e) => update("startupCapital", e.target.value)} className="mt-1 font-medium text-sm rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="exp" className="font-bold text-xs text-foreground">Monthly Operating Costs (₦)</Label>
                    <Input id="exp" type="number" placeholder="150000" value={form.monthlyExpenses} onChange={(e) => update("monthlyExpenses", e.target.value)} className="mt-1 font-medium text-sm rounded-xl" />
                  </div>
                  <div>
                    <Label htmlFor="rev" className="font-bold text-xs text-foreground">Target Monthly Revenue (₦)</Label>
                    <Input id="rev" type="number" placeholder="300000" value={form.expectedRevenue} onChange={(e) => update("expectedRevenue", e.target.value)} className="mt-1 font-medium text-sm rounded-xl" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="team" className="font-bold text-xs text-foreground">Team Size (Full-time / Part-time)</Label>
                  <Input id="team" type="number" min="1" value={form.teamSize} onChange={(e) => update("teamSize", e.target.value)} className="mt-1 font-medium text-sm rounded-xl" />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-11 rounded-2xl font-black text-sm shadow-md" size="lg">
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing Market Feasibility...</> : <><Sparkles className="h-4 w-4 mr-2" />Calculate Business Feasibility</>}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {metrics && (
              <div className="grid grid-cols-2 gap-3">
                <Card className="rounded-2xl border-border/80 shadow-xs">
                  <CardContent className="pt-5 pb-5">
                    <Wallet className="h-5 w-5 text-primary mb-1.5" />
                    <div className="text-2xl font-black text-foreground">{metrics.runwayMonths}</div>
                    <div className="text-xs font-bold text-muted-foreground">Months of Runway</div>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-border/80 shadow-xs">
                  <CardContent className="pt-5 pb-5">
                    <TrendingUp className="h-5 w-5 text-primary mb-1.5" />
                    <div className={`text-2xl font-black ${metrics.monthlyProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>{fmt(metrics.monthlyProfit)}</div>
                    <div className="text-xs font-bold text-muted-foreground">Monthly Net Profit</div>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-border/80 shadow-xs">
                  <CardContent className="pt-5 pb-5">
                    <Target className="h-5 w-5 text-primary mb-1.5" />
                    <div className="text-2xl font-black text-foreground">{metrics.breakEvenMonths}</div>
                    <div className="text-xs font-bold text-muted-foreground">Months to Break Even</div>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-border/80 shadow-xs">
                  <CardContent className="pt-5 pb-5">
                    <Sparkles className="h-5 w-5 text-primary mb-1.5" />
                    <div className="text-2xl font-black text-foreground">{metrics.roi}%</div>
                    <div className="text-xs font-bold text-muted-foreground">Annual Return (ROI)</div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="min-h-[300px] rounded-3xl border-border/90 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-black flex items-center gap-2 text-foreground">
                  <Sparkles className="h-5 w-5 text-primary" /> AI Commercial Advisory &amp; Action Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-bold text-foreground">Analyzing revenue streams, operational margins, and localized risks...</p>
                  </div>
                )}
                {!loading && !analysis && (
                  <div className="text-center py-12 space-y-2">
                    <p className="text-sm font-bold text-foreground">Ready to analyze your business model</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Fill in the financial fields and click calculate to receive a breakdown of your cash runway, profit margins, and growth recommendations.
                    </p>
                  </div>
                )}
                {analysis && (
                  <div className="blog-article-content prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed font-medium text-foreground">
                    {analysis}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Educational Knowledge Card: Understanding Your Financial Metrics */}
        <Card className="rounded-3xl border-primary/20 bg-gradient-to-br from-primary/5 via-card to-background p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            <span>Educational Guide: Key Terms Explained for Every Business Owner</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            How to Read &amp; Use Your Financial Projections
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-1.5">
              <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-primary" /> Runway
              </h3>
              <p className="text-xs font-medium text-foreground/80 leading-relaxed">
                The number of months your business can stay afloat on current capital before needing new revenue or external funding.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-1.5">
              <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-600" /> Monthly Profit
              </h3>
              <p className="text-xs font-medium text-foreground/80 leading-relaxed">
                Total monthly revenue minus operating expenses (rent, inventory, wages, marketing, data).
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-1.5">
              <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
                <Target className="h-4 w-4 text-indigo-600" /> Breakeven Point
              </h3>
              <p className="text-xs font-medium text-foreground/80 leading-relaxed">
                The milestone where your cumulative sales cover your initial startup investments and ongoing operational costs.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-1.5">
              <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-fuchsia-600" /> Annual ROI
              </h3>
              <p className="text-xs font-medium text-foreground/80 leading-relaxed">
                Return on Investment: The percentage return generated on every naira of starting capital invested over a 12-month period.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
