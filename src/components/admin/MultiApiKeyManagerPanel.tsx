import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Key,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  Zap,
  Sliders,
  Eye,
  EyeOff,
  Radio,
  Server,
  Activity,
  Layers,
  Sparkles,
  Bot,
  Crown,
  Video,
  FileText,
  GraduationCap,
  Palette,
  MessageSquare,
  Rocket,
  Award,
  Search,
  Check,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  Cpu,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  GeminiApiKeyConfig,
  AiFeatureConnectionConfig,
  ApiKeyStatus,
  getApiKeyPool,
  saveApiKeyPool,
  getAiFeaturesConfig,
  saveAiFeaturesConfig,
  testApiKeyConnection,
  testFeatureConnection,
  PLATFORM_AI_FEATURES,
} from "@/lib/multiApiKeyManager";
import DynamicGeminiModelManagerCard from "@/components/admin/DynamicGeminiModelManagerCard";

export interface FeatureTestStatus {
  testing: boolean;
  success?: boolean;
  latencyMs?: number;
  keyName?: string;
  error?: string;
  testedAt?: string;
}

export default function MultiApiKeyManagerPanel() {
  const [keys, setKeys] = useState<GeminiApiKeyConfig[]>([]);
  const [features, setFeatures] = useState<AiFeatureConnectionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [testingAllKeys, setTestingAllKeys] = useState(false);

  // Feature testing state map
  const [featureStatuses, setFeatureStatuses] = useState<Record<string, FeatureTestStatus>>({});
  const [testingAllFeatures, setTestingAllFeatures] = useState(false);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [expandedFeatureKey, setExpandedFeatureKey] = useState<string | null>(null);

  // New Key Modal / Form State
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [showKeySecret, setShowKeySecret] = useState<Record<string, boolean>>({});
  const [newKeyForm, setNewKeyForm] = useState({
    name: "",
    key: "",
    provider: "google_ai_studio" as "google_ai_studio" | "gemini_paid" | "custom",
    isPrimary: false,
    quotaLimitPerDay: 1500,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [loadedKeys, loadedFeatures] = await Promise.all([
        getApiKeyPool(true),
        getAiFeaturesConfig(true),
      ]);
      setKeys(loadedKeys);
      setFeatures(loadedFeatures);
    } catch (err) {
      toast.error("Failed to load API configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Test single API key
  const handleTestKey = async (keyConfig: GeminiApiKeyConfig) => {
    setTestingKeyId(keyConfig.id);
    const result = await testApiKeyConnection(keyConfig.key);
    setTestingKeyId(null);

    const updatedKeys = keys.map((k) =>
      k.id === keyConfig.id
        ? {
            ...k,
            status: result.status,
            latencyMs: result.latencyMs,
            lastCheckedAt: new Date().toISOString(),
            lastError: result.error,
          }
        : k
    );

    setKeys(updatedKeys);
    await saveApiKeyPool(updatedKeys);

    if (result.success) {
      toast.success(`Key "${keyConfig.name}" is healthy! (Response: ${result.latencyMs}ms)`);
    } else {
      toast.error(`Connection check failed: ${result.error || "Unknown error"}`);
    }
  };

  // Test all API keys
  const handleTestAllKeys = async () => {
    if (keys.length === 0) {
      toast.error("Please add at least one Gemini API key first.");
      return;
    }
    setTestingAllKeys(true);
    toast.info(`Testing all ${keys.length} API keys simultaneously...`);

    const updated = await Promise.all(
      keys.map(async (k) => {
        const res = await testApiKeyConnection(k.key);
        return {
          ...k,
          status: res.status,
          latencyMs: res.latencyMs,
          lastCheckedAt: new Date().toISOString(),
          lastError: res.error,
        };
      })
    );

    setKeys(updated);
    await saveApiKeyPool(updated);
    setTestingAllKeys(false);
    const activeCount = updated.filter((k) => k.status === "active").length;
    toast.success(`Keys verified: ${activeCount}/${keys.length} active and responding.`);
  };

  // Test individual AI feature / Agent connection
  const handleTestSingleFeature = async (featureKey: string) => {
    setFeatureStatuses((prev) => ({
      ...prev,
      [featureKey]: { testing: true },
    }));

    const res = await testFeatureConnection(featureKey);

    setFeatureStatuses((prev) => ({
      ...prev,
      [featureKey]: {
        testing: false,
        success: res.success,
        latencyMs: res.latencyMs,
        keyName: res.keyName,
        error: res.error,
        testedAt: new Date().toLocaleTimeString(),
      },
    }));

    const featObj = features.find((f) => f.featureKey === featureKey);
    const label = featObj?.name || featureKey;

    if (res.success) {
      toast.success(`Agent/Engine "${label}" connected! (${res.latencyMs}ms via ${res.keyName || "Active Key"})`);
    } else {
      toast.error(`"${label}" connection issue: ${res.error || "Failed to reach AI service"}`);
    }
  };

  // Test all AI features and agent connections
  const handleTestAllFeatures = async () => {
    const enabledFeatures = features.filter((f) => f.enabled);
    if (enabledFeatures.length === 0) {
      toast.warning("No AI features or agents are currently enabled.");
      return;
    }

    setTestingAllFeatures(true);
    toast.info(`Running live connection diagnostics for ${enabledFeatures.length} AI features & agents...`);

    let successCount = 0;
    const newStatuses: Record<string, FeatureTestStatus> = { ...featureStatuses };

    for (const feat of enabledFeatures) {
      newStatuses[feat.featureKey] = { testing: true };
      setFeatureStatuses({ ...newStatuses });

      const res = await testFeatureConnection(feat.featureKey);
      if (res.success) successCount++;

      newStatuses[feat.featureKey] = {
        testing: false,
        success: res.success,
        latencyMs: res.latencyMs,
        keyName: res.keyName,
        error: res.error,
        testedAt: new Date().toLocaleTimeString(),
      };
      setFeatureStatuses({ ...newStatuses });
    }

    setTestingAllFeatures(false);
    toast.success(`Agent connection check complete: ${successCount}/${enabledFeatures.length} connected & operational.`);
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = newKeyForm.key.trim();
    if (!cleanKey) {
      toast.error("Please enter a valid Gemini API key");
      return;
    }

    setSaving(true);
    const testRes = await testApiKeyConnection(cleanKey);

    const newEntry: GeminiApiKeyConfig = {
      id: `key_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newKeyForm.name.trim() || `API Key #${keys.length + 1}`,
      key: cleanKey,
      provider: newKeyForm.provider,
      status: testRes.status,
      latencyMs: testRes.latencyMs,
      lastCheckedAt: new Date().toISOString(),
      lastError: testRes.error,
      assignedFeatures: ["all"],
      isPrimary: newKeyForm.isPrimary || keys.length === 0,
      quotaLimitPerDay: newKeyForm.quotaLimitPerDay || 1500,
      createdAt: new Date().toISOString(),
    };

    let updatedList = [...keys];
    if (newEntry.isPrimary) {
      updatedList = updatedList.map((k) => ({ ...k, isPrimary: false }));
    }
    updatedList.push(newEntry);

    setKeys(updatedList);
    await saveApiKeyPool(updatedList);
    setSaving(false);
    setIsAddingKey(false);
    setNewKeyForm({
      name: "",
      key: "",
      provider: "google_ai_studio",
      isPrimary: false,
      quotaLimitPerDay: 1500,
    });

    if (testRes.success) {
      toast.success(`API Key "${newEntry.name}" added and verified live! (${testRes.latencyMs}ms)`);
    } else {
      toast.warning(`Key saved, but status reported: ${testRes.error || "Standby status"}`);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    const target = keys.find((k) => k.id === keyId);
    if (!confirm(`Are you sure you want to remove "${target?.name || "this API key"}"?`)) return;

    const updated = keys.filter((k) => k.id !== keyId);
    if (target?.isPrimary && updated.length > 0) {
      updated[0].isPrimary = true;
    }

    setKeys(updated);
    await saveApiKeyPool(updated);
    toast.success("API key removed from pool");
  };

  const handleSetPrimary = async (keyId: string) => {
    const updated = keys.map((k) => ({
      ...k,
      isPrimary: k.id === keyId,
    }));
    setKeys(updated);
    await saveApiKeyPool(updated);
    const target = keys.find((k) => k.id === keyId);
    toast.success(`"${target?.name}" is now the primary API key`);
  };

  const handleStatusChange = async (keyId: string, status: ApiKeyStatus) => {
    const updated = keys.map((k) => (k.id === keyId ? { ...k, status } : k));
    setKeys(updated);
    await saveApiKeyPool(updated);
    toast.success("API key status updated");
  };

  const handleToggleFeature = async (featureKey: string, enabled: boolean) => {
    const updated = features.map((f) => (f.featureKey === featureKey ? { ...f, enabled } : f));
    setFeatures(updated);
    await saveAiFeaturesConfig(updated);
    const feat = features.find((f) => f.featureKey === featureKey);
    toast.success(`Feature "${feat?.name || featureKey}" is now ${enabled ? "ONLINE" : "OFFLINE"}`);
  };

  const handleFeatureKeyAssignment = async (featureKey: string, assignedKeyId: string) => {
    const updated = features.map((f) =>
      f.featureKey === featureKey ? { ...f, assignedKeyId } : f
    );
    setFeatures(updated);
    await saveAiFeaturesConfig(updated);
    toast.success("Feature API key routing updated");
  };

  const getStatusBadge = (status: ApiKeyStatus) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live &amp; Connected
          </span>
        );
      case "standby":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Standby Failover
          </span>
        );
      case "quota_exceeded":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <XCircle className="h-3 w-3" />
            Quota Exceeded (429)
          </span>
        );
      case "rate_limited":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Clock className="h-3 w-3" />
            Rate Limited
          </span>
        );
      case "invalid":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
            <AlertTriangle className="h-3 w-3" />
            Invalid Key
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-muted text-muted-foreground border">
            Disabled
          </span>
        );
    }
  };

  const getFeatureIcon = (iconName: string) => {
    switch (iconName) {
      case "Crown":
        return <Crown className="h-4 w-4 text-amber-500" />;
      case "Cpu":
        return <Cpu className="h-4 w-4 text-primary" />;
      case "Video":
        return <Video className="h-4 w-4 text-purple-500" />;
      case "FileText":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "GraduationCap":
        return <GraduationCap className="h-4 w-4 text-emerald-500" />;
      case "Palette":
        return <Palette className="h-4 w-4 text-pink-500" />;
      case "Sparkles":
        return <Sparkles className="h-4 w-4 text-amber-400" />;
      case "MessageSquare":
        return <MessageSquare className="h-4 w-4 text-emerald-600" />;
      case "Rocket":
        return <Rocket className="h-4 w-4 text-rose-500" />;
      case "Award":
        return <Award className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bot className="h-4 w-4 text-primary" />;
    }
  };

  // Categories list for tabs
  const categories = useMemo(() => {
    const set = new Set<string>();
    features.forEach((f) => {
      if (f.category) set.add(f.category);
    });
    return ["all", ...Array.from(set)];
  }, [features]);

  // Filtered features
  const filteredFeatures = useMemo(() => {
    return features.filter((feat) => {
      const matchesCategory =
        activeCategory === "all" || feat.category?.toLowerCase() === activeCategory.toLowerCase();
      const matchesSearch =
        !searchQuery.trim() ||
        feat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feat.featureKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feat.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (feat.category && feat.category.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [features, activeCategory, searchQuery]);

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground">Loading Multi-API Keys Engine...</p>
      </div>
    );
  }

  const healthyKeysCount = keys.filter((k) => k.status === "active" || k.status === "standby").length;
  const totalFeatures = features.length;
  const enabledFeatures = features.filter((f) => f.enabled).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full px-1 sm:px-2">
      {/* Overview Metric Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">Configured Keys</span>
            <Key className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-foreground">{keys.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">In failover rotation</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live &amp; Active Keys</span>
            <Wifi className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{healthyKeysCount}</p>
            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Healthy response rate</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-primary uppercase tracking-wider">AI Agents &amp; Engines</span>
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-primary">
              {enabledFeatures}/{totalFeatures}
            </p>
            <p className="text-[11px] text-primary/80 mt-0.5">Active platform features</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">Failover Strategy</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <p className="text-sm font-black text-foreground">Auto Failover Pool</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Instant switch on quota limit</p>
          </div>
        </div>
      </div>

      {/* SECTION 1: API Keys Pool */}
      <Card className="border-2 shadow-md rounded-3xl overflow-hidden">
        <CardHeader className="bg-muted/40 border-b p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" /> Gemini API Keys Pool &amp; Credit Failover
              </CardTitle>
              <CardDescription className="text-xs">
                Add multiple Google AI Studio or Gemini keys. The system automatically cycles requests if a key hits rate limits or credit exhaustion.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestAllKeys}
                disabled={testingAllKeys || keys.length === 0}
                className="h-9 px-3 text-xs font-black rounded-xl gap-1.5 shadow-2xs w-full sm:w-auto justify-center"
              >
                <Activity className={`h-3.5 w-3.5 text-primary ${testingAllKeys ? "animate-spin" : ""}`} />
                {testingAllKeys ? "Testing All Keys..." : "Test All Keys"}
              </Button>
              <Button
                onClick={() => setIsAddingKey(!isAddingKey)}
                size="sm"
                className="h-9 px-3 text-xs font-black rounded-xl gap-1.5 shadow-sm w-full sm:w-auto justify-center"
              >
                <Plus className="h-4 w-4" />
                Add API Key
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Add Key Inline Form */}
          {isAddingKey && (
            <form
              onSubmit={handleAddKey}
              className="p-4 sm:p-5 rounded-2xl border-2 border-primary/30 bg-primary/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-foreground flex items-center gap-1.5">
                  <Key className="h-4 w-4 text-primary" /> Register New Gemini API Key
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddingKey(false)}
                  className="text-xs text-muted-foreground hover:text-foreground font-bold px-2 py-1 rounded-lg hover:bg-muted/40"
                >
                  Cancel
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-bold">Key Label / Nickname</Label>
                  <Input
                    value={newKeyForm.name}
                    onChange={(e) => setNewKeyForm({ ...newKeyForm, name: e.target.value })}
                    placeholder="e.g. Studio Key Alpha, Backup Free Key, Paid Pro Key"
                    className="h-9 text-xs rounded-xl font-medium mt-1"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Provider / Tier</Label>
                  <Select
                    value={newKeyForm.provider}
                    onValueChange={(val: any) => setNewKeyForm({ ...newKeyForm, provider: val })}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl font-medium mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google_ai_studio">Google AI Studio (Standard / Free)</SelectItem>
                      <SelectItem value="gemini_paid">Gemini Pay-As-You-Go (Cloud Project)</SelectItem>
                      <SelectItem value="custom">Custom Commercial AI Key</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold">API Key Secret (Starts with AIzaSy...)</Label>
                <Input
                  type="password"
                  value={newKeyForm.key}
                  onChange={(e) => setNewKeyForm({ ...newKeyForm, key: e.target.value })}
                  placeholder="AIzaSy..."
                  className="h-9 text-xs font-mono rounded-xl mt-1"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={newKeyForm.isPrimary}
                    onChange={(e) => setNewKeyForm({ ...newKeyForm, isPrimary: e.target.checked })}
                    className="h-4 w-4 accent-primary rounded cursor-pointer"
                  />
                  Set as Primary Key for immediate requests
                </label>

                <Button type="submit" disabled={saving} size="sm" className="h-9 text-xs font-black rounded-xl px-5">
                  {saving ? "Testing & Saving..." : "Verify & Save Key"}
                </Button>
              </div>
            </form>
          )}

          {/* Keys List (Responsive Cards) */}
          {keys.length === 0 ? (
            <div className="p-8 text-center bg-muted/20 border rounded-2xl">
              <Key className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
              <p className="text-sm font-bold text-foreground">No API keys in the pool yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Click "Add API Key" above to register one or more Gemini API keys to enable seamless failover and feature routing.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {keys.map((k) => {
                const isTesting = testingKeyId === k.id;
                const isShown = showKeySecret[k.id];
                return (
                  <div
                    key={k.id}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 ${
                      k.isPrimary
                        ? "border-primary/50 bg-primary/[0.03] shadow-xs ring-1 ring-primary/20"
                        : "border-border/80 bg-card hover:border-border"
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Key className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-sm text-foreground truncate" title={k.name}>
                              {k.name}
                            </p>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              {k.provider.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>

                        {k.isPrimary && (
                          <Badge className="bg-primary text-primary-foreground text-[10px] font-black h-5 shrink-0">
                            Primary
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(k.status)}
                        {k.latencyMs !== undefined && k.latencyMs > 0 && (
                          <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            {k.latencyMs}ms
                          </span>
                        )}
                      </div>

                      {/* Obfuscated Key */}
                      <div className="flex items-center justify-between gap-2 bg-muted/40 p-2 rounded-xl border text-xs">
                        <span className="font-mono text-[11px] text-foreground truncate">
                          {isShown
                            ? k.key
                            : `${k.key.slice(0, 8)}••••••••••••${k.key.slice(-4)}`}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setShowKeySecret((prev) => ({ ...prev, [k.id]: !isShown }))
                          }
                          className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted shrink-0"
                          title={isShown ? "Hide Key" : "Show Key"}
                        >
                          {isShown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>

                      {k.lastError && (
                        <div className="text-[11px] font-semibold text-rose-500 bg-rose-500/10 p-2 rounded-xl flex items-start gap-1.5 break-words">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{k.lastError}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div className="pt-3 border-t flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestKey(k)}
                          disabled={isTesting}
                          className="h-8 px-2.5 text-xs font-bold rounded-xl gap-1"
                        >
                          <Activity className={`h-3 w-3 text-primary ${isTesting ? "animate-spin" : ""}`} />
                          {isTesting ? "Testing..." : "Test"}
                        </Button>

                        {!k.isPrimary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetPrimary(k.id)}
                            className="h-8 px-2 text-xs font-bold rounded-xl text-muted-foreground hover:text-foreground"
                          >
                            Set Primary
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Select
                          value={k.status}
                          onValueChange={(val: any) => handleStatusChange(k.id, val)}
                        >
                          <SelectTrigger className="h-8 w-24 text-[11px] rounded-xl font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="standby">Standby</SelectItem>
                            <SelectItem value="quota_exceeded">Quota</SelectItem>
                            <SelectItem value="disabled">Disabled</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteKey(k.id)}
                          className="h-8 w-8 rounded-xl text-rose-500 hover:bg-rose-500/10 shrink-0"
                          title="Delete Key"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 2: Dynamic Gemini Models Engine & Auto-Discovery */}
      <DynamicGeminiModelManagerCard />

      {/* SECTION 3: AI Features Connection & Key Routing Matrix */}
      <Card className="border-2 shadow-md rounded-3xl overflow-hidden">
        <CardHeader className="bg-muted/40 border-b p-4 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" /> AI Features &amp; Workforce Connection Matrix
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time connection switch and routing for all 20+ specialized AI agents and creator engines across Bethelincovibe TV.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestAllFeatures}
                disabled={testingAllFeatures}
                className="h-9 px-3.5 text-xs font-black rounded-xl gap-1.5 shadow-2xs w-full sm:w-auto justify-center"
              >
                <Activity className={`h-3.5 w-3.5 text-primary ${testingAllFeatures ? "animate-spin" : ""}`} />
                {testingAllFeatures ? "Diagnosing All Features..." : "Test All Feature Connections"}
              </Button>
            </div>
          </div>

          {/* Search and Category Filters */}
          <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-black capitalize whitespace-nowrap transition-all ${
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {cat === "all" ? `All Features (${features.length})` : `${cat}`}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agent or feature..."
                className="h-8 pl-8 text-xs rounded-xl font-medium"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {filteredFeatures.length === 0 ? (
            <div className="p-8 text-center bg-muted/20 border rounded-2xl">
              <Bot className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
              <p className="text-sm font-bold text-foreground">No matching features found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting your search query or selected category filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFeatures.map((feat) => {
                const testStatus = featureStatuses[feat.featureKey];
                const isExpanded = expandedFeatureKey === feat.featureKey;

                return (
                  <div
                    key={feat.featureKey}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3.5 ${
                      feat.enabled
                        ? "border-border/80 bg-card hover:border-primary/40 shadow-xs"
                        : "border-muted bg-muted/20 opacity-70"
                    }`}
                  >
                    {/* Header: Icon, Name, Category, Switch */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          {getFeatureIcon(feat.icon)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-black text-sm text-foreground truncate" title={feat.name}>
                              {feat.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider h-4 px-1.5">
                              {feat.category || "General"}
                            </Badge>
                            <span className="font-mono text-[10px] text-muted-foreground truncate">
                              ID: {feat.featureKey}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={feat.enabled}
                          onCheckedChange={(val) => handleToggleFeature(feat.featureKey, val)}
                          className="scale-90"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {feat.description}
                    </p>

                    {/* Real-time Connection Status Pill */}
                    <div className="flex items-center justify-between gap-2 flex-wrap bg-muted/30 p-2 rounded-xl border">
                      <div className="flex items-center gap-2 min-w-0">
                        {feat.enabled ? (
                          testStatus?.testing ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary">
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              Pinging Engine...
                            </span>
                          ) : testStatus?.success ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              Connected ({testStatus.latencyMs}ms)
                            </span>
                          ) : testStatus?.error ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-500">
                              <XCircle className="h-3.5 w-3.5 shrink-0" />
                              Connection Error
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                              Ready &amp; Route Active
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-muted-foreground">
                            <WifiOff className="h-3 w-3" />
                            Offline (Disabled by Switch)
                          </span>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestSingleFeature(feat.featureKey)}
                        disabled={!feat.enabled || testStatus?.testing}
                        className="h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1 hover:bg-muted"
                      >
                        <Activity className={`h-3 w-3 text-primary ${testStatus?.testing ? "animate-spin" : ""}`} />
                        {testStatus?.testing ? "Testing..." : "Test Ping"}
                      </Button>
                    </div>

                    {/* Error diagnostic notice */}
                    {testStatus?.error && (
                      <div className="text-[11px] font-medium text-rose-500 bg-rose-500/10 p-2 rounded-xl break-words">
                        {testStatus.error}
                      </div>
                    )}

                    {/* Key Routing Selector */}
                    <div className="pt-2 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <span className="text-[11px] font-bold text-muted-foreground shrink-0">Assigned API Route:</span>
                      <Select
                        value={feat.assignedKeyId || "auto"}
                        onValueChange={(val) => handleFeatureKeyAssignment(feat.featureKey, val)}
                        disabled={!feat.enabled}
                      >
                        <SelectTrigger className="h-7 text-[11px] rounded-lg font-bold w-full sm:w-52">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">⚡ Auto Failover Pool</SelectItem>
                          {keys.map((k) => (
                            <SelectItem key={k.id} value={k.id}>
                              {k.name} {k.isPrimary ? "(Primary)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
