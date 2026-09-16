import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Wand2, ShieldCheck, CheckCircle2, RefreshCw, Cpu, Zap,
  Loader2, Play, Sliders, Globe, MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { enhanceBusinessProfileWithAI } from "@/lib/businessProfileAIEngine";

export default function AdminBusinessAISettingsTab() {
  const [enabled, setEnabled] = useState(true);
  const [model, setModel] = useState("gemini-3.8-flash");
  const [dailyQuota, setDailyQuota] = useState(10);
  const [systemContext, setSystemContext] = useState(
    "Focus on high-converting Nigerian and African commerce copy, high trust signals, and direct WhatsApp sales triggers."
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Test Sandbox State
  const [testBizName, setTestBizName] = useState("Lagos Zenith Fabrics");
  const [testCategory, setTestCategory] = useState("Fashion & Textiles");
  const [testTesting, setTestTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "ai_profile_enhancer_settings")
          .maybeSingle();

        if (data?.value) {
          const parsed = JSON.parse(data.value);
          setEnabled(parsed.enabled !== false);
          if (parsed.model) setModel(parsed.model);
          if (parsed.dailyQuota) setDailyQuota(parsed.dailyQuota);
          if (parsed.systemContext) setSystemContext(parsed.systemContext);
        }
      } catch (err) {
        console.error("Failed to load AI settings", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        enabled,
        model,
        dailyQuota,
        systemContext,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("site_settings").upsert(
        {
          key: "ai_profile_enhancer_settings",
          value: JSON.stringify(payload),
        },
        { onConflict: "key" }
      );
      if (error) throw error;
      toast.success("AI Profile Enhancer settings saved live!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRunTest = async () => {
    if (!testBizName.trim()) {
      toast.error("Enter a test business name");
      return;
    }
    setTestTesting(true);
    setTestResult(null);
    try {
      const res = await enhanceBusinessProfileWithAI({
        businessName: testBizName,
        category: testCategory,
        location: "Lagos, Nigeria",
        targetAudience: "Wholesale fabric merchants and fashion designers",
      });
      setTestResult(res);
      toast.success("AI Engine generated test output successfully!");
    } catch (err: any) {
      toast.error(err.message || "Test generation failed");
    } finally {
      setTestTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">AI Engine Status</span>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <div className={`h-2.5 w-2.5 rounded-full ${enabled ? "bg-emerald-500 animate-pulse" : "bg-muted"}`} />
            <p className="text-xl font-black text-foreground">{enabled ? "Active / Online" : "Disabled"}</p>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Gemini GenAI integration</p>
        </Card>

        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Active Model</span>
            <Cpu className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-lg font-black text-foreground mt-2 truncate">{model}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">High-speed reasoning</p>
        </Card>

        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Free Daily Quota</span>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{dailyQuota} runs</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Per registered merchant</p>
        </Card>

        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Regional Tone</span>
            <Globe className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-lg font-black text-foreground mt-2">Nigerian / Global</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Conversion optimized</p>
        </Card>
      </div>

      {/* Main Settings Card */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" />
            AI Profile Enhancer Configuration
          </CardTitle>
          <CardDescription className="text-xs">
            Manage global AI capabilities for business profiles, service structuring, taglines, and marketing hooks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Master Switch */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl border bg-muted/20">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Enable AI Business Profile Enhancer for Merchants
              </p>
              <p className="text-xs text-muted-foreground">
                When turned on, business owners can use the 1-click &ldquo;Enhance with AI&rdquo; tool in their Profile Editor.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">AI Intelligence Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-3.8-flash">Gemini 3.8 Flash (Recommended - Fastest &amp; Ultra Smart)</SelectItem>
                  <SelectItem value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Deep Copywriting Reasoning)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Daily Free Generations Quota</Label>
              <Input
                type="number"
                value={dailyQuota}
                onChange={(e) => setDailyQuota(Number(e.target.value))}
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Global System Directive / Commercial Context</Label>
            <Textarea
              rows={3}
              value={systemContext}
              onChange={(e) => setSystemContext(e.target.value)}
              placeholder="Provide directives for tone, language, and regional market priorities..."
              className="text-xs rounded-xl"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveSettings}
              disabled={saving || loading}
              className="font-bold text-xs rounded-xl h-9 px-4"
            >
              {saving ? "Saving..." : "Save AI Configuration"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Sandbox / Test Generator */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-sky-500" />
            AI Profile Generation Sandbox
          </CardTitle>
          <CardDescription className="text-xs">
            Test live AI profile generation prompt output directly without modifying any database records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Test Business Name</Label>
              <Input
                value={testBizName}
                onChange={(e) => setTestBizName(e.target.value)}
                placeholder="e.g. Abuja Royal Auto Care"
                className="text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Category</Label>
              <Input
                value={testCategory}
                onChange={(e) => setTestCategory(e.target.value)}
                placeholder="e.g. Automotive & Repair"
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <Button
            onClick={handleRunTest}
            disabled={testTesting}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl gap-1.5 h-9"
          >
            {testTesting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating AI Enhancements...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" /> Run Test Generation
              </>
            )}
          </Button>

          {/* Test Results Output */}
          {testResult && (
            <div className="p-4 rounded-2xl border bg-muted/20 space-y-3 pt-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="h-4 w-4" /> AI Output Validated Successfully
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div className="p-3 rounded-xl bg-card border space-y-1">
                  <span className="font-bold text-muted-foreground uppercase text-[10px]">Generated Tagline</span>
                  <p className="font-bold text-foreground text-sm">{testResult.tagline}</p>
                </div>
                <div className="p-3 rounded-xl bg-card border space-y-1">
                  <span className="font-bold text-muted-foreground uppercase text-[10px]">WhatsApp Sales Hook</span>
                  <p className="font-medium text-foreground">{testResult.salesOfferHook}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-card border space-y-1 text-xs">
                <span className="font-bold text-muted-foreground uppercase text-[10px]">Executive Bio</span>
                <p className="text-foreground/90 whitespace-pre-line">{testResult.bio}</p>
              </div>

              {testResult.suggestedServices && (
                <div className="space-y-1.5 text-xs">
                  <span className="font-bold text-muted-foreground uppercase text-[10px]">
                    Structured Services ({testResult.suggestedServices.length})
                  </span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {testResult.suggestedServices.map((s: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-card border">
                        <p className="font-bold text-foreground">{s.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{s.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
