import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Cpu,
  RefreshCw,
  Sparkles,
  Zap,
  Brain,
  CheckCircle2,
  Clock,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Radio,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  GeminiModelDefinition,
  getAvailableGeminiModels,
  syncGoogleModelsFromApi,
  getActiveGeminiModelId,
  setActiveGeminiModelId,
  testGeminiModel,
} from "@/lib/geminiModelRegistry";

export default function DynamicGeminiModelManagerCard() {
  const [models, setModels] = useState<GeminiModelDefinition[]>([]);
  const [activeModel, setActiveModel] = useState<string>(() => getActiveGeminiModelId());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latencyMs: number }>>({});
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const loadModels = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const list = await getAvailableGeminiModels(forceRefresh);
      setModels(list);
      setActiveModel(getActiveGeminiModelId());
    } catch (err) {
      toast.error("Failed to load Gemini models");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const handleSyncReleases = async () => {
    setSyncing(true);
    toast.info("Querying Google Generative Language API for newest releases...");
    try {
      const res = await syncGoogleModelsFromApi();
      if (res.success) {
        toast.success(res.message);
        await loadModels(true);
      } else {
        toast.warning(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sync releases");
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectActiveModel = (modelId: string) => {
    setActiveGeminiModelId(modelId);
    setActiveModel(modelId);
    toast.success(`Platform default AI engine updated to ${modelId}!`);
  };

  const handlePingModel = async (modelId: string) => {
    setTestingId(modelId);
    try {
      const res = await testGeminiModel(modelId);
      setTestResults((prev) => ({
        ...prev,
        [modelId]: { success: res.success, latencyMs: res.latencyMs },
      }));
      if (res.success) {
        toast.success(`"${modelId}" operational! (${res.latencyMs}ms latency)`);
      } else {
        toast.error(`"${modelId}" ping failed: ${res.error || "No response"}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Test failed");
    } finally {
      setTestingId(null);
    }
  };

  const handleAddCustomModel = async () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;

    setTestingId("custom_new");
    try {
      const res = await testGeminiModel(trimmed);
      if (res.success) {
        handleSelectActiveModel(trimmed);
        toast.success(`Custom model "${trimmed}" activated & responding in ${res.latencyMs}ms!`);
        setShowCustom(false);
        setCustomInput("");
        loadModels(true);
      } else {
        toast.error(`Could not verify custom model "${trimmed}": ${res.error || "Invalid model ID"}`);
      }
    } finally {
      setTestingId(null);
    }
  };

  return (
    <Card className="border-2 shadow-md rounded-3xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-4 sm:p-6 border-b border-border/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2 text-white">
              <Cpu className="h-5 w-5 text-indigo-400" />
              Dynamic Gemini Models &amp; Autonomous Release Discovery
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-black">
                Future-Proof Google Sync
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-300">
              Select or test the active Google Gemini foundation model. When Google releases new models (e.g. Gemini 3.8, 3.9, 4.0), the platform auto-discovers and accepts them with zero code modifications.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              disabled={syncing}
              onClick={handleSyncReleases}
              className="h-9 px-3 text-xs font-black rounded-xl gap-1.5 bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin text-amber-300" : ""}`} />
              {syncing ? "Checking Google API..." : "Sync Google Releases"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Model Cards Grid */}
        {loading ? (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground font-semibold">Loading available Gemini models...</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {models.map((m) => {
              const isSelected = activeModel === m.id;
              const isTesting = testingId === m.id;
              const testResult = testResults[m.id];

              return (
                <div
                  key={m.id}
                  onClick={() => handleSelectActiveModel(m.id)}
                  className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-md"
                      : "border-border/80 hover:border-primary/50 hover:bg-muted/40 bg-card"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-xs sm:text-sm text-foreground">{m.name}</span>
                        <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {m.id}
                        </code>
                      </div>

                      <Badge
                        variant="secondary"
                        className={`text-[9px] font-black border-0 px-2 py-0.2 shrink-0 ${
                          m.category === "reasoning"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : m.category === "dynamic"
                            ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                            : "bg-primary/15 text-primary"
                        }`}
                      >
                        {m.badge}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {m.description}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Cpu className="h-3 w-3 text-primary" /> {m.contextWindow}
                      </span>
                      <span>•</span>
                      <span>Speed: {"⚡".repeat(m.speedRating)}</span>
                      <span>•</span>
                      <span>Reasoning: {"🧠".repeat(m.intelligenceRating)}</span>
                      {testResult && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-black">
                            {testResult.latencyMs}ms
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isTesting}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePingModel(m.id);
                      }}
                      className="h-7 text-[11px] font-bold text-muted-foreground hover:text-foreground rounded-lg px-2"
                    >
                      {isTesting ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      Ping Latency
                    </Button>

                    <Button
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      className="h-7 text-xs rounded-xl font-bold px-3 shadow-xs"
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Active Engine
                        </>
                      ) : (
                        "Set As Default"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Custom or Unindexed Google Model Input */}
        <div className="pt-3 border-t border-border/60">
          {!showCustom ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCustom(true)}
              className="text-xs font-bold rounded-xl gap-1.5 h-8 border-dashed"
            >
              <Plus className="h-3.5 w-3.5" /> Add Unindexed / Preview Google Model ID
            </Button>
          ) : (
            <div className="p-4 rounded-2xl border border-dashed border-primary/40 bg-muted/20 space-y-3">
              <div>
                <p className="text-xs font-black text-foreground">Add Custom Google Model</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Enter any preview identifier (e.g. <code>gemini-3.8-pro</code> or <code>gemini-3.9-flash</code>). The system verifies the model against your Gemini API keys.
                </p>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="e.g. gemini-3.8-pro or gemini-3.9-flash"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="h-9 text-xs font-mono rounded-xl bg-background"
                />
                <Button
                  size="sm"
                  disabled={testingId === "custom_new" || !customInput.trim()}
                  onClick={handleAddCustomModel}
                  className="h-9 text-xs rounded-xl font-black shrink-0 px-4"
                >
                  {testingId === "custom_new" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  )}
                  Verify &amp; Activate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCustom(false)}
                  className="h-9 text-xs rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
