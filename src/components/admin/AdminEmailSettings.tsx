import { useState, useEffect } from "react";
import {
  EmailProviderConfig,
  EmailProviderType,
  DEFAULT_PROVIDER_PRESETS,
  getStoredEmailProviders,
  saveEmailProviders,
  sendViaSpecificProvider,
} from "@/lib/emailRouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Server,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Zap,
  Send,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  Activity,
  Sliders,
  Layers,
  Save,
  CheckCircle2,
  XCircle,
  Star,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface ProviderHealth {
  status: "idle" | "testing" | "healthy" | "unhealthy" | "no_key" | "disabled";
  message?: string;
  latency?: number;
  testedAt?: string;
}

export default function AdminEmailSettings() {
  const [providers, setProviders] = useState<EmailProviderConfig[]>([]);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [healthState, setHealthState] = useState<Record<string, ProviderHealth>>({});

  // Load stored providers on mount
  useEffect(() => {
    const list = getStoredEmailProviders();
    setProviders(list);
  }, []);

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFieldChange = (
    id: string,
    field: keyof EmailProviderConfig,
    value: any
  ) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleToggleEnable = (id: string) => {
    setProviders((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const newStatus = !p.enabled;
          toast.info(`${p.name} is now ${newStatus ? "ENABLED" : "DISABLED"}`);
          return { ...p, enabled: newStatus };
        }
        return p;
      })
    );
  };

  const handleSetPrimary = (id: string) => {
    setProviders((prev) => {
      const target = prev.find((p) => p.id === id);
      if (!target) return prev;

      // Enable target if disabled
      const updated = prev.map((p) => (p.id === id ? { ...p, enabled: true } : p));
      const targetItem = updated.find((p) => p.id === id)!;
      const rest = updated.filter((p) => p.id !== id);

      // Place target first, rest after
      const reordered = [targetItem, ...rest].map((p, idx) => ({
        ...p,
        priority: idx + 1,
      }));

      toast.success(`⭐ "${target.name}" set as PRIMARY Dispatcher (#1)!`);
      saveEmailProviders(reordered);
      return reordered;
    });
  };

  const handleMovePriority = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === providers.length - 1)
    ) {
      return;
    }
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const list = [...providers];

    // Swap positions
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    // Renumber priority
    const reordered = list.map((p, idx) => ({ ...p, priority: idx + 1 }));
    setProviders(reordered);
    saveEmailProviders(reordered);
    toast.success("Failover priority chain updated!");
  };

  const handleSaveAll = () => {
    setIsSaving(true);
    // Renumber priority
    const reordered = providers.map((p, idx) => ({ ...p, priority: idx + 1 }));
    setProviders(reordered);
    saveEmailProviders(reordered);

    setTimeout(() => {
      setIsSaving(false);
      toast.success("All 9 Email Provider Settings saved successfully! 🎉", {
        description: "Universal Failover Engine now uses these updated credentials and priorities.",
      });
    }, 400);
  };

  const handleTestSingle = async (prov: EmailProviderConfig) => {
    if (!prov.apiKey.trim()) {
      setHealthState((prev) => ({
        ...prev,
        [prov.id]: {
          status: "no_key",
          message: "API Key missing",
          testedAt: new Date().toLocaleTimeString(),
        },
      }));
      return toast.error(`Please enter an API Key for ${prov.name} first.`);
    }

    setIsTesting(prov.id);
    setHealthState((prev) => ({
      ...prev,
      [prov.id]: { status: "testing" },
    }));

    const startTime = performance.now();
    try {
      const msgId = await sendViaSpecificProvider(
        prov,
        prov.fromEmail || "notifications@bethelincovibetv.com.ng",
        `🧪 ${prov.name} Admin API Key Verification`,
        `<div style="font-family:sans-serif; padding:24px; border:1px solid #e2e8f0; border-radius:16px;">
          <h2 style="color:#4f46e5; margin-top:0;">${prov.name} Connected! ✅</h2>
          <p>Your API key and configuration for <strong>${prov.name}</strong> are verified and fully functional.</p>
          <p>Sender: <code>${prov.fromEmail}</code> | Priority Rank: <code>#${prov.priority}</code></p>
        </div>`
      );
      const latency = Math.round(performance.now() - startTime);

      toast.success(`${prov.name} API Verification Passed! 🎉`, {
        description: `Delivered test message ID: ${msgId} in ${latency}ms. Credentials are working!`,
      });

      setHealthState((prev) => ({
        ...prev,
        [prov.id]: {
          status: "healthy",
          message: `Verified (Msg ID: ${msgId})`,
          latency,
          testedAt: new Date().toLocaleTimeString(),
        },
      }));

      // Update provider sent count
      setProviders((prev) => {
        const updated = prev.map((p) =>
          p.id === prov.id
            ? {
                ...p,
                totalSent: p.totalSent + 1,
                lastUsed: new Date().toISOString(),
                lastError: undefined,
              }
            : p
        );
        saveEmailProviders(updated);
        return updated;
      });
    } catch (err: any) {
      console.error(`Test failed for ${prov.name}:`, err);
      const latency = Math.round(performance.now() - startTime);
      const errMsg = err?.message || String(err);

      toast.error(`${prov.name} Test Failed ❌`, {
        description: errMsg,
      });

      setHealthState((prev) => ({
        ...prev,
        [prov.id]: {
          status: "unhealthy",
          message: errMsg,
          latency,
          testedAt: new Date().toLocaleTimeString(),
        },
      }));

      setProviders((prev) => {
        const updated = prev.map((p) =>
          p.id === prov.id
            ? {
                ...p,
                totalFailed: p.totalFailed + 1,
                lastError: errMsg,
              }
            : p
        );
        saveEmailProviders(updated);
        return updated;
      });
    } finally {
      setIsTesting(null);
    }
  };

  const handleTestAllEnabled = async () => {
    const enabledProviders = providers.filter((p) => p.enabled);
    if (enabledProviders.length === 0) {
      return toast.info("No providers are currently enabled to test.", {
        description: "Toggle a provider's switch to Enabled before running a health check.",
      });
    }

    setIsTestingAll(true);
    toast.info(`🚀 Running Batch Health Check across ${enabledProviders.length} enabled provider(s)...`);

    // Set status to testing
    setHealthState((prev) => {
      const next = { ...prev };
      enabledProviders.forEach((p) => {
        next[p.id] = { status: "testing" };
      });
      return next;
    });

    let healthyCount = 0;
    let failedCount = 0;
    let missingKeyCount = 0;

    await Promise.all(
      enabledProviders.map(async (prov) => {
        if (!prov.apiKey.trim()) {
          missingKeyCount++;
          setHealthState((prev) => ({
            ...prev,
            [prov.id]: {
              status: "no_key",
              message: "API Key missing",
              testedAt: new Date().toLocaleTimeString(),
            },
          }));
          return;
        }

        const startTime = performance.now();
        try {
          const msgId = await sendViaSpecificProvider(
            prov,
            prov.fromEmail || "notifications@bethelincovibetv.com.ng",
            `🧪 ${prov.name} Health Check Test`,
            `<div style="font-family:sans-serif; padding:24px; border:1px solid #e2e8f0; border-radius:16px;">
              <h2 style="color:#4f46e5; margin-top:0;">${prov.name} Health Check Passed! ✅</h2>
              <p>Batch Health Check completed successfully at ${new Date().toLocaleTimeString()}.</p>
            </div>`
          );
          const latency = Math.round(performance.now() - startTime);
          healthyCount++;

          setHealthState((prev) => ({
            ...prev,
            [prov.id]: {
              status: "healthy",
              message: `Verified (Msg ID: ${msgId})`,
              latency,
              testedAt: new Date().toLocaleTimeString(),
            },
          }));

          setProviders((prev) =>
            prev.map((p) =>
              p.id === prov.id
                ? {
                    ...p,
                    totalSent: p.totalSent + 1,
                    lastUsed: new Date().toISOString(),
                    lastError: undefined,
                  }
                : p
            )
          );
        } catch (err: any) {
          const latency = Math.round(performance.now() - startTime);
          const errMsg = err?.message || String(err);
          failedCount++;

          setHealthState((prev) => ({
            ...prev,
            [prov.id]: {
              status: "unhealthy",
              message: errMsg,
              latency,
              testedAt: new Date().toLocaleTimeString(),
            },
          }));

          setProviders((prev) =>
            prev.map((p) =>
              p.id === prov.id
                ? {
                    ...p,
                    totalFailed: p.totalFailed + 1,
                    lastError: errMsg,
                  }
                : p
            )
          );
        }
      })
    );

    setIsTestingAll(false);

    setProviders((curr) => {
      saveEmailProviders(curr);
      return curr;
    });

    if (failedCount === 0 && missingKeyCount === 0) {
      toast.success(`Health Check Complete: All ${healthyCount} Enabled Provider(s) are HEALTHY! 🎉`, {
        description: "All enabled API keys are active and responding.",
      });
    } else {
      toast.warning(`Health Check Summary`, {
        description: `✅ ${healthyCount} Healthy | ❌ ${failedCount} Failed | ⚠️ ${missingKeyCount} Missing API Key`,
      });
    }
  };

  const activeCount = providers.filter((p) => p.enabled && p.apiKey.trim()).length;
  const primaryProv = providers.find((p) => p.enabled && p.apiKey.trim());

  return (
    <div className="space-y-6 min-w-0">
      {/* Top Banner & Save Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 text-white p-5 rounded-3xl shadow-md">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <Server className="h-6 w-6 text-amber-300" />
            Universal Email Provider Failover Matrix
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100 font-medium">
            Configure API keys for all 9 supported providers. Emails automatically cascade from Primary (#1) to Fallbacks if rate limits or errors occur.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            onClick={handleTestAllEnabled}
            disabled={isTestingAll || activeCount === 0}
            className="h-11 px-5 rounded-2xl bg-amber-400 text-indigo-950 hover:bg-amber-300 font-black text-sm shrink-0 shadow-lg transition-all gap-2"
          >
            {isTestingAll ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Activity className="h-4 w-4" />
            )}
            Test All Enabled Providers
          </Button>

          <Button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="h-11 px-5 rounded-2xl bg-white text-indigo-900 hover:bg-slate-100 font-black text-sm shrink-0 shadow-lg transition-all gap-2"
          >
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save All Settings
          </Button>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/80 shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Configured Active Providers
              </p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">
                {activeCount} <span className="text-xs font-normal text-muted-foreground">/ 9 Providers Ready</span>
              </h3>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Primary Dispatcher (#1)
              </p>
              <p className="text-sm font-black text-foreground truncate max-w-[180px] mt-1">
                {primaryProv ? primaryProv.name : "System Edge Function"}
              </p>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <Star className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Failover Protection
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                {activeCount > 1 ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs font-extrabold">
                    <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Fully Redundant ({activeCount} Active)
                  </Badge>
                ) : activeCount === 1 ? (
                  <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-xs font-bold">
                    Single Provider Active
                  </Badge>
                ) : (
                  <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs font-bold">
                    System Edge Fallback Only
                  </Badge>
                )}
              </div>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 9 Providers List Matrix */}
      <Card className="border-border/80 shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="py-4 px-6 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <Sliders className="h-5 w-5 text-indigo-600" /> All 9 Email Sending Providers
            </CardTitle>
            <CardDescription className="text-xs font-medium">
              Toggle provider statuses, paste API keys, adjust priority positions, and test credentials live.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <Button
              onClick={handleTestAllEnabled}
              disabled={isTestingAll || activeCount === 0}
              size="sm"
              variant="outline"
              className="h-9 px-4 rounded-xl font-bold text-xs border-indigo-500/40 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 gap-1.5"
            >
              {isTestingAll ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
              ) : (
                <Activity className="h-3.5 w-3.5 text-indigo-600" />
              )}
              Test All Enabled
            </Button>

            <Button
              onClick={handleSaveAll}
              disabled={isSaving}
              size="sm"
              className="h-9 px-4 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              <Save className="h-3.5 w-3.5" /> Save Changes
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y">
          {providers.map((prov, index) => {
            const presetInfo = DEFAULT_PROVIDER_PRESETS.find((p) => p.type === prov.type);
            const isPrimary = index === 0 && prov.enabled && !!prov.apiKey.trim();
            const isShowKey = !!visibleKeys[prov.id];

            return (
              <div
                key={prov.id}
                className={`p-4 sm:p-6 transition-colors min-w-0 ${
                  prov.enabled
                    ? "bg-card hover:bg-muted/30"
                    : "bg-muted/10 opacity-75"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 min-w-0">
                  {/* Left Column: Priority Rank & Name & Status Switch */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Priority Rank Control */}
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                      <span
                        className={`h-7 w-7 rounded-xl flex items-center justify-center text-xs font-black border ${
                          isPrimary
                            ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                            : prov.enabled
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        #{prov.priority}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleMovePriority(index, "up")}
                          disabled={index === 0}
                          className="p-1 hover:bg-muted rounded text-muted-foreground disabled:opacity-20"
                          title="Move Higher Priority"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleMovePriority(index, "down")}
                          disabled={index === providers.length - 1}
                          className="p-1 hover:bg-muted rounded text-muted-foreground disabled:opacity-20"
                          title="Move Lower Priority"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Info and Form Fields */}
                    <div className="space-y-3 min-w-0 flex-1">
                      {/* Header Row */}
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <h4 className="font-black text-base text-foreground break-words">{prov.name}</h4>

                        {/* Health Status Indicator Badge */}
                        {(() => {
                          const health = healthState[prov.id];
                          if (!prov.enabled) {
                            return (
                              <Badge variant="secondary" className="text-[10px] font-bold">
                                DISABLED
                              </Badge>
                            );
                          }
                          if (health?.status === "testing") {
                            return (
                              <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-extrabold animate-pulse flex items-center gap-1">
                                <RefreshCw className="h-3 w-3 animate-spin" /> TESTING HEALTH...
                              </Badge>
                            );
                          }
                          if (health?.status === "healthy") {
                            return (
                              <Badge className="bg-emerald-500 text-white border-emerald-500 text-[10px] font-extrabold flex items-center gap-1 shadow-2xs" title={`Tested at ${health.testedAt}`}>
                                <CheckCircle2 className="h-3 w-3 fill-current" /> HEALTHY ({health.latency}ms)
                              </Badge>
                            );
                          }
                          if (health?.status === "unhealthy") {
                            return (
                              <Badge className="bg-destructive text-white border-destructive text-[10px] font-extrabold flex items-center gap-1 shadow-2xs" title={health.message}>
                                <XCircle className="h-3 w-3 fill-current" /> HEALTH CHECK FAILED
                              </Badge>
                            );
                          }
                          if (health?.status === "no_key" || !prov.apiKey.trim()) {
                            return (
                              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40 font-bold flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> KEY REQUIRED
                              </Badge>
                            );
                          }
                          return (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground/80 font-medium">
                              Untested
                            </Badge>
                          );
                        })()}

                        {isPrimary && (
                          <Badge className="bg-amber-500 text-white border-amber-500 text-[10px] font-extrabold flex items-center gap-1 shadow-2xs">
                            <Star className="h-3 w-3 fill-current" /> #1 PRIMARY DISPATCHER
                          </Badge>
                        )}

                        {prov.enabled && !isPrimary && !!prov.apiKey.trim() && (
                          <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 text-[10px] font-extrabold">
                            ACTIVE FALLBACK (#{prov.priority})
                          </Badge>
                        )}

                        {presetInfo?.freeTierInfo && (
                          <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
                            • {presetInfo.freeTierInfo}
                          </span>
                        )}
                      </div>

                      {/* Inputs Row: API Key, From Email, From Name */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                        {/* API Key */}
                        <div className="space-y-1 min-w-0">
                          <label className="text-[11px] font-extrabold text-foreground flex items-center justify-between">
                            <span>API Key / Token</span>
                            {presetInfo?.docsUrl && (
                              <a
                                href={presetInfo.docsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5"
                              >
                                Get Key <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </label>
                          <div className="relative">
                            <Input
                              type={isShowKey ? "text" : "password"}
                              value={prov.apiKey}
                              onChange={(e) =>
                                handleFieldChange(prov.id, "apiKey", e.target.value)
                              }
                              placeholder={
                                presetInfo?.placeholderKey || "Paste API key..."
                              }
                              className="h-9 pr-9 rounded-xl text-xs font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => toggleKeyVisibility(prov.id)}
                              className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                            >
                              {isShowKey ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* From Email */}
                        <div className="space-y-1 min-w-0">
                          <label className="text-[11px] font-extrabold text-foreground">
                            Sender Email
                          </label>
                          <Input
                            type="email"
                            value={prov.fromEmail}
                            onChange={(e) =>
                              handleFieldChange(prov.id, "fromEmail", e.target.value)
                            }
                            placeholder="e.g. info@yourdomain.com"
                            className="h-9 rounded-xl text-xs font-medium"
                          />
                        </div>

                        {/* From Name */}
                        <div className="space-y-1 min-w-0">
                          <label className="text-[11px] font-extrabold text-foreground">
                            Sender Display Name
                          </label>
                          <Input
                            type="text"
                            value={prov.fromName}
                            onChange={(e) =>
                              handleFieldChange(prov.id, "fromName", e.target.value)
                            }
                            placeholder="e.g. Bethelincovibe TV"
                            className="h-9 rounded-xl text-xs font-medium"
                          />
                        </div>

                        {/* Domain / Region if Mailgun or SES */}
                        {(prov.type === "mailgun" || prov.type === "amazonses") && (
                          <div className="space-y-1 min-w-0 col-span-1 sm:col-span-2 lg:col-span-1">
                            <label className="text-[11px] font-extrabold text-foreground">
                              {prov.type === "mailgun"
                                ? "Mailgun Domain"
                                : "AWS Region"}
                            </label>
                            <Input
                              type="text"
                              value={prov.domainOrRegion || ""}
                              onChange={(e) =>
                                handleFieldChange(
                                  prov.id,
                                  "domainOrRegion",
                                  e.target.value
                                )
                              }
                              placeholder={
                                prov.type === "mailgun"
                                  ? "mg.yourdomain.com"
                                  : "us-east-1"
                              }
                              className="h-9 rounded-xl text-xs font-medium"
                            />
                          </div>
                        )}
                      </div>

                      {/* Delivery Performance Metrics */}
                      <div className="flex items-center gap-4 text-[11px] font-extrabold text-muted-foreground pt-1 flex-wrap">
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {prov.totalSent} Sent
                        </span>
                        {prov.totalFailed > 0 && (
                          <span className="text-destructive flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5" /> {prov.totalFailed} Failed
                          </span>
                        )}
                        {prov.lastUsed && (
                          <span>
                            Last Activity: {new Date(prov.lastUsed).toLocaleTimeString()}
                          </span>
                        )}
                        {prov.lastError && (
                          <span className="text-destructive truncate max-w-md">
                            Error: {prov.lastError}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions (Status Toggle, Set Primary, Test Key) */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-2 pt-2 lg:pt-0 shrink-0 border-t lg:border-t-0 border-border/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-muted-foreground">
                        {prov.enabled ? "Active" : "Off"}
                      </span>
                      <Switch
                        checked={prov.enabled}
                        onCheckedChange={() => handleToggleEnable(prov.id)}
                      />
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {!isPrimary && (
                        <Button
                          onClick={() => handleSetPrimary(prov.id)}
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-bold rounded-xl border-amber-500/30 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                          title="Set as Priority #1 Primary Dispatcher"
                        >
                          <Star className="h-3.5 w-3.5 mr-1" /> Make Primary
                        </Button>
                      )}

                      <Button
                        onClick={() => handleTestSingle(prov)}
                        disabled={isTesting === prov.id}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-bold rounded-xl border-indigo-500/30 text-indigo-600 hover:bg-indigo-50"
                      >
                        {isTesting === prov.id ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5 mr-1" /> Test API Key
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
