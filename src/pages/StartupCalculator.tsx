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

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            AI-Powered
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Startup Business Calculator</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Test your business idea before you spend a single naira. Get runway, ROI, break-even and a real AI advisor's take.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" />Your Business</CardTitle>
              <CardDescription>Fill in honest numbers for the most accurate read.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="idea">Business idea *</Label>
                  <Textarea id="idea" rows={3} placeholder="e.g. Mobile car wash service for office workers in Lekki" value={form.businessIdea} onChange={(e) => update("businessIdea", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="ind">Industry</Label>
                    <Input id="ind" placeholder="e.g. Food, Tech, Retail" value={form.industry} onChange={(e) => update("industry", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="loc">Location</Label>
                    <Input id="loc" value={form.location} onChange={(e) => update("location", e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cap">Startup capital (₦) *</Label>
                  <Input id="cap" type="number" placeholder="500000" value={form.startupCapital} onChange={(e) => update("startupCapital", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="exp">Monthly expenses (₦)</Label>
                    <Input id="exp" type="number" placeholder="150000" value={form.monthlyExpenses} onChange={(e) => update("monthlyExpenses", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="rev">Expected monthly revenue (₦)</Label>
                    <Input id="rev" type="number" placeholder="300000" value={form.expectedRevenue} onChange={(e) => update("expectedRevenue", e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="team">Team size</Label>
                  <Input id="team" type="number" min="1" value={form.teamSize} onChange={(e) => update("teamSize", e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full" size="lg">
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</> : <><Sparkles className="h-4 w-4 mr-2" />Analyze My Business</>}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {metrics && (
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="pt-6">
                    <Wallet className="h-5 w-5 text-primary mb-2" />
                    <div className="text-2xl font-bold">{metrics.runwayMonths}</div>
                    <div className="text-xs text-muted-foreground">Months of runway</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <TrendingUp className="h-5 w-5 text-primary mb-2" />
                    <div className={`text-2xl font-bold ${metrics.monthlyProfit >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(metrics.monthlyProfit)}</div>
                    <div className="text-xs text-muted-foreground">Monthly profit</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <Target className="h-5 w-5 text-primary mb-2" />
                    <div className="text-2xl font-bold">{metrics.breakEvenMonths}</div>
                    <div className="text-xs text-muted-foreground">Months to break even</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <Sparkles className="h-5 w-5 text-primary mb-2" />
                    <div className="text-2xl font-bold">{metrics.roi}%</div>
                    <div className="text-xs text-muted-foreground">Annual ROI</div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="min-h-[300px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />AI Advisor's Take</CardTitle>
              </CardHeader>
              <CardContent>
                {loading && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-3 text-primary" />
                    <p className="text-sm">Crunching the numbers and thinking it through...</p>
                  </div>
                )}
                {!loading && !analysis && (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Fill in the form and click analyze to get your personalized business breakdown.
                  </div>
                )}
                {analysis && (
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
                    {analysis}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
