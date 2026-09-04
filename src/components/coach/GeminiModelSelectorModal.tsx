import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Zap,
  Cpu,
  Brain,
  CheckCircle2,
  RefreshCw,
  Clock,
  Radio,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Plus,
  Loader2,
  Sliders,
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

interface GeminiModelSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentModelId: string;
  onSelectModel: (modelId: string) => void;
}

export default function GeminiModelSelectorModal({
  open,
  onOpenChange,
  currentModelId,
  onSelectModel,
}: GeminiModelSelectorModalProps) {
  const [models, setModels] = useState<GeminiModelDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latencyMs: number }>>({});
  const [customModelInput, setCustomModelInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const loadModels = async (refresh = false) => {
    setLoading(true);
    try {
      const list = await getAvailableGeminiModels(refresh);
      setModels(list);
    } catch (err) {
      toast.error("Failed to load Gemini models");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadModels();
    }
  }, [open]);

  const handleSyncFromGoogle = async () => {
    setSyncing(true);
    toast.info("Connecting to Google Generative Language API to discover newest releases...");
    try {
      const res = await syncGoogleModelsFromApi();
      if (res.success) {
        toast.success(res.message);
        await loadModels(true);
      } else {
        toast.warning(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sync Google models");
    } finally {
      setSyncing(false);
    }
  };

  const handleTest = async (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTestingId(modelId);
    try {
      const res = await testGeminiModel(modelId);
      setTestResults((prev) => ({
        ...prev,
        [modelId]: { success: res.success, latencyMs: res.latencyMs },
      }));
      if (res.success) {
        toast.success(`Model "${modelId}" responsive! (${res.latencyMs}ms)`);
      } else {
        toast.error(`Model test failed: ${res.error || "Unknown error"}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Test failed");
    } finally {
      setTestingId(null);
    }
  };

  const handleSelect = (modelId: string) => {
    setActiveGeminiModelId(modelId);
    onSelectModel(modelId);
    toast.success(`Switched active AI engine to ${modelId}`);
    onOpenChange(false);
  };

  const handleAddCustomModel = async () => {
    const trimmed = customModelInput.trim();
    if (!trimmed) return;
    setTestingId("custom_add");
    try {
      const res = await testGeminiModel(trimmed);
      if (res.success) {
        handleSelect(trimmed);
        toast.success(`Custom model "${trimmed}" verified and activated!`);
      } else {
        toast.error(`Could not verify custom model "${trimmed}": ${res.error || "No response"}`);
      }
    } finally {
      setTestingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-border/80 bg-background shadow-2xl rounded-3xl">
        {/* Header */}
        <div className="p-5 border-b border-border/60 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-primary/20 border border-primary/30 text-primary">
                <Cpu className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  Gemini AI Model Engine
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                    Auto-Discover Active
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300 mt-0.5">
                  Select your active strategic intelligence model. Real-time Google releases automatically sync here.
                </DialogDescription>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              disabled={syncing}
              onClick={handleSyncFromGoogle}
              className="shrink-0 bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs font-bold rounded-xl gap-1.5 shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin text-amber-300" : ""}`} />
              {syncing ? "Checking..." : "Sync Google Releases"}
            </Button>
          </div>
        </div>

        {/* Model Cards List */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-medium">Verifying active Gemini models...</p>
            </div>
          ) : (
            models.map((m) => {
              const isSelected = currentModelId === m.id;
              const testResult = testResults[m.id];
              const isTesting = testingId === m.id;

              return (
                <div
                  key={m.id}
                  onClick={() => handleSelect(m.id)}
                  className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-md"
                      : "border-border/80 hover:border-primary/50 hover:bg-muted/40 bg-card"
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                      }`}
                    >
                      {m.category === "reasoning" ? (
                        <Brain className="h-4 w-4" />
                      ) : m.category === "fast" ? (
                        <Zap className="h-4 w-4" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs sm:text-sm text-foreground tracking-tight">
                          {m.name}
                        </span>
                        <code className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60">
                          {m.id}
                        </code>
                        <Badge
                          variant="secondary"
                          className={`text-[9px] font-black border-0 px-2 py-0.2 ${
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

                      <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground/80 flex-wrap">
                        <span className="flex items-center gap-1 font-medium">
                          <Cpu className="h-3 w-3 text-primary/70" /> {m.contextWindow}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          Speed: {"⚡".repeat(m.speedRating)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          Intelligence: {"🧠".repeat(m.intelligenceRating)}
                        </span>
                        {testResult && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              {testResult.latencyMs}ms
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isTesting}
                      onClick={(e) => handleTest(m.id, e)}
                      className="h-7 text-[11px] font-semibold text-muted-foreground hover:text-foreground rounded-lg px-2"
                    >
                      {isTesting ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      Ping
                    </Button>

                    <Button
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      className={`h-8 rounded-xl font-bold text-xs px-3 ${
                        isSelected ? "shadow-sm shadow-primary/20" : ""
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-primary-foreground" /> Active
                        </>
                      ) : (
                        "Select"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })
          )}

          {/* Add Custom / Future Model Section */}
          <div className="pt-2 border-t border-border/60">
            {!showCustomInput ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCustomInput(true)}
                className="w-full text-xs text-muted-foreground hover:text-primary rounded-xl font-bold gap-1.5 h-8"
              >
                <Plus className="h-3.5 w-3.5" /> Enter Custom / Beta Google Model ID
              </Button>
            ) : (
              <div className="p-3.5 rounded-2xl border border-dashed border-border bg-muted/20 space-y-2">
                <p className="text-xs font-bold text-foreground">Custom Model Identifier</p>
                <p className="text-[11px] text-muted-foreground">
                  If Google announced an unindexed preview or internal model, enter the exact ID below:
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. gemini-3.8-pro or gemini-3.9-flash"
                    value={customModelInput}
                    onChange={(e) => setCustomModelInput(e.target.value)}
                    className="h-8 text-xs font-mono rounded-xl bg-background"
                  />
                  <Button
                    size="sm"
                    disabled={testingId === "custom_add" || !customModelInput.trim()}
                    onClick={handleAddCustomModel}
                    className="h-8 text-xs rounded-xl font-bold shrink-0"
                  >
                    {testingId === "custom_add" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    )}
                    Test &amp; Activate
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowCustomInput(false)}
                    className="h-8 text-xs rounded-xl"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-muted/40 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground px-5">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Grounded with Admin Multi-Key Pool &amp; Failover
          </span>
          <span>Zero Code Changes for New Google Releases</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
