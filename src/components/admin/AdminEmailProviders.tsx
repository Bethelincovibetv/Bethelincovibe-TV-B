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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Server,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
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
} from "lucide-react";
import { toast } from "sonner";

export default function AdminEmailProviders() {
  const [providers, setProviders] = useState<EmailProviderConfig[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<EmailProviderConfig | null>(null);

  // Form State
  const [selectedType, setSelectedType] = useState<EmailProviderType>("brevo");
  const [name, setName] = useState("Brevo (Sendinblue)");
  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("bethelchukwunyere1@gmail.com");
  const [fromName, setFromName] = useState("Bethelincovibe TV");
  const [domainOrRegion, setDomainOrRegion] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingSingle, setIsTestingSingle] = useState<string | null>(null);

  // Load stored providers on mount
  useEffect(() => {
    const list = getStoredEmailProviders();
    setProviders(list);
  }, []);

  const openAddModal = (presetType?: EmailProviderType) => {
    const preset = DEFAULT_PROVIDER_PRESETS.find((p) => p.type === (presetType || "brevo")) || DEFAULT_PROVIDER_PRESETS[0];
    setEditingProvider(null);
    setSelectedType(preset.type);
    setName(preset.name);
    setApiKey("");
    setFromEmail("bethelchukwunyere1@gmail.com");
    setFromName("Bethelincovibe TV");
    setDomainOrRegion("");
    setShowApiKey(false);
    setIsModalOpen(true);
  };

  const openEditModal = (prov: EmailProviderConfig) => {
    setEditingProvider(prov);
    setSelectedType(prov.type);
    setName(prov.name);
    setApiKey(prov.apiKey);
    setFromEmail(prov.fromEmail);
    setFromName(prov.fromName);
    setDomainOrRegion(prov.domainOrRegion || "");
    setShowApiKey(false);
    setIsModalOpen(true);
  };

  const handleSelectPresetType = (type: EmailProviderType) => {
    const preset = DEFAULT_PROVIDER_PRESETS.find((p) => p.type === type);
    if (preset) {
      setSelectedType(type);
      setName(preset.name);
    }
  };

  const handleSaveProvider = () => {
    if (!apiKey.trim()) {
      return toast.error("API Key / Token is required");
    }
    if (!fromEmail.trim() || !fromEmail.includes("@")) {
      return toast.error("Valid From Email address is required");
    }

    let updatedList = [...providers];

    if (editingProvider) {
      updatedList = updatedList.map((p) => {
        if (p.id === editingProvider.id) {
          return {
            ...p,
            name,
            type: selectedType,
            apiKey: apiKey.trim(),
            fromEmail: fromEmail.trim(),
            fromName: fromName.trim(),
            domainOrRegion: domainOrRegion.trim() || undefined,
          };
        }
        return p;
      });
      toast.success(`Updated "${name}" configuration`);
    } else {
      const newProv: EmailProviderConfig = {
        id: "prov_" + Math.random().toString(36).substring(2, 9),
        name,
        type: selectedType,
        apiKey: apiKey.trim(),
        fromEmail: fromEmail.trim(),
        fromName: fromName.trim(),
        domainOrRegion: domainOrRegion.trim() || undefined,
        enabled: true,
        priority: providers.length + 1,
        totalSent: 0,
        totalFailed: 0,
      };
      updatedList.push(newProv);
      toast.success(`Added "${name}" to email failover chain! 🎉`);
    }

    setProviders(updatedList);
    saveEmailProviders(updatedList);
    setIsModalOpen(false);
  };

  const handleDeleteProvider = (id: string, provName: string) => {
    const updated = providers.filter((p) => p.id !== id);
    // Renumber priorities
    const reordered = updated.map((p, idx) => ({ ...p, priority: idx + 1 }));
    setProviders(reordered);
    saveEmailProviders(reordered);
    toast.info(`Removed "${provName}" from provider list.`);
  };

  const handleToggleEnable = (id: string, currentStatus: boolean) => {
    const updated = providers.map((p) => (p.id === id ? { ...p, enabled: !currentStatus } : p));
    setProviders(updated);
    saveEmailProviders(updated);
    toast.info(currentStatus ? "Provider disabled" : "Provider enabled");
  };

  const handleMovePriority = (index: number, direction: "up" | "down") => {
    if ((direction === "up" && index === 0) || (direction === "down" && index === providers.length - 1)) {
      return;
    }
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const list = [...providers];

    // Swap positions
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    // Update priority indices
    const reordered = list.map((p, idx) => ({ ...p, priority: idx + 1 }));
    setProviders(reordered);
    saveEmailProviders(reordered);
    toast.success("Priority order updated!");
  };

  // Test individual provider
  const handleTestProvider = async (prov: EmailProviderConfig) => {
    setIsTestingSingle(prov.id);
    try {
      const testMsgId = await sendViaSpecificProvider(
        prov,
        prov.fromEmail,
        `🧪 ${prov.name} API Key Verification Test`,
        `<div style="font-family:sans-serif; padding:24px; border:1px solid #e2e8f0; border-radius:16px;">
          <h2 style="color:#4f46e5; margin-top:0;">${prov.name} Connected! ✅</h2>
          <p>Your API key and sender configuration for <strong>${prov.name}</strong> are verified and working properly on <strong>Bethelincovibe TV</strong>.</p>
          <p>Priority Rank: #${prov.priority} | Sender: ${prov.fromEmail}</p>
        </div>`
      );

      toast.success(`${prov.name} Test Passed! 🎉`, {
        description: `Delivered test message to ${prov.fromEmail} (ID: ${testMsgId}). Key is active!`,
      });

      // Update success stats
      const updated = providers.map((p) =>
        p.id === prov.id
          ? { ...p, totalSent: p.totalSent + 1, lastUsed: new Date().toISOString() }
          : p
      );
      setProviders(updated);
      saveEmailProviders(updated);
    } catch (err: any) {
      console.error(`Test failed for ${prov.name}:`, err);
      const errMsg = err?.message || String(err);

      toast.error(`${prov.name} Test Failed`, {
        description: errMsg,
      });

      // Update fail stats
      const updated = providers.map((p) =>
        p.id === prov.id
          ? { ...p, totalFailed: p.totalFailed + 1, lastError: errMsg }
          : p
      );
      setProviders(updated);
      saveEmailProviders(updated);
    } finally {
      setIsTestingSingle(null);
    }
  };

  const activeCount = providers.filter((p) => p.enabled).length;
  const currentPresetInfo = DEFAULT_PROVIDER_PRESETS.find((p) => p.type === selectedType);

  return (
    <div className="space-y-6">
      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Active Email Providers
              </p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">
                {activeCount} <span className="text-xs font-normal text-muted-foreground">/ {providers.length} Configured</span>
              </h3>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Failover Redundancy
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                {activeCount > 1 ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs font-extrabold">
                    <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Multi-Layer Redundant
                  </Badge>
                ) : activeCount === 1 ? (
                  <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-xs font-bold">
                    Single Active Provider
                  </Badge>
                ) : (
                  <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs font-bold">
                    No Custom Provider Active
                  </Badge>
                )}
              </div>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Primary Dispatcher (#1)
              </p>
              <p className="text-sm font-extrabold text-foreground truncate max-w-[170px] mt-1">
                {providers.find((p) => p.enabled)?.name || "System Edge Fallback"}
              </p>
            </div>
            <Button
              onClick={() => openAddModal()}
              size="sm"
              className="h-9 px-3 rounded-xl font-black text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" /> Add Provider
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Add Preset Bar */}
      <Card className="border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-card p-4 rounded-3xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" /> Quick Add Free-Tier Email Service
            </h4>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
              Click any provider below to quickly configure API keys and join the failover chain.
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {DEFAULT_PROVIDER_PRESETS.slice(0, 5).map((p) => (
              <button
                key={p.type}
                onClick={() => openAddModal(p.type)}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold border bg-background hover:bg-indigo-600 hover:text-white transition-all shrink-0 flex items-center gap-1 shadow-2xs"
              >
                + {p.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Configured Providers Failover Chain List */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="py-3.5 px-5 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-extrabold flex items-center gap-2">
              <Sliders className="h-4 w-4 text-indigo-600" /> Active Failover Priority Chain
            </CardTitle>
            <CardDescription className="text-xs font-medium">
              Emails are dispatched via Provider #1. If it encounters a rate limit or error, system automatically cascades to #2, #3, etc.
            </CardDescription>
          </div>

          <Button
            onClick={() => openAddModal()}
            size="sm"
            variant="outline"
            className="h-8 text-xs font-extrabold rounded-xl border-primary/30 text-primary hover:bg-primary/10"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Account
          </Button>
        </CardHeader>

        <CardContent className="p-0 divide-y">
          {providers.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 mx-auto">
                <Server className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-foreground">No Custom Email Providers Configured</h4>
                <p className="text-xs text-muted-foreground font-medium max-w-md mx-auto mt-1">
                  Add API keys for free providers like Brevo, Resend, Mailtrap, or SendGrid to ensure zero delivery failures.
                </p>
              </div>
              <Button
                onClick={() => openAddModal()}
                className="h-9 px-5 rounded-xl font-extrabold text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                <Plus className="h-4 w-4" /> Add First Email Provider
              </Button>
            </div>
          ) : (
            providers.map((prov, index) => (
              <div
                key={prov.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  prov.enabled ? "bg-card hover:bg-muted/30" : "bg-muted/20 opacity-70"
                }`}
              >
                {/* Left: Priority Rank + Details */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                    <span className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-black border ${
                      index === 0 && prov.enabled
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-muted text-muted-foreground border-border"
                    }`}>
                      #{prov.priority}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleMovePriority(index, "up")}
                        disabled={index === 0}
                        className="p-1 hover:bg-muted rounded text-muted-foreground disabled:opacity-30"
                        title="Move Up Priority"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleMovePriority(index, "down")}
                        disabled={index === providers.length - 1}
                        className="p-1 hover:bg-muted rounded text-muted-foreground disabled:opacity-30"
                        title="Move Down Priority"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-sm text-foreground">{prov.name}</h4>
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">
                        {prov.type}
                      </Badge>
                      {index === 0 && prov.enabled && (
                        <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 text-[10px] font-extrabold">
                          PRIMARY DISPATCHER
                        </Badge>
                      )}
                      {!prov.enabled && (
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          DISABLED
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground font-medium truncate">
                      Sender: <strong className="text-foreground">{prov.fromName}</strong> &lt;{prov.fromEmail}&gt;
                      {prov.domainOrRegion ? ` • Region/Domain: ${prov.domainOrRegion}` : ""}
                    </p>

                    {/* Stats & Error Display */}
                    <div className="flex items-center gap-3 text-[11px] font-bold text-muted-foreground pt-1">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        ✓ {prov.totalSent} Sent
                      </span>
                      {prov.totalFailed > 0 && (
                        <span className="text-destructive">
                          ✗ {prov.totalFailed} Failed
                        </span>
                      )}
                      {prov.lastUsed && (
                        <span className="text-muted-foreground">
                          Last used {new Date(prov.lastUsed).toLocaleTimeString()}
                        </span>
                      )}
                    </div>

                    {prov.lastError && (
                      <p className="text-[10px] text-destructive font-medium truncate max-w-lg mt-0.5">
                        Notice: {prov.lastError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <div className="flex items-center gap-1.5 mr-2">
                    <span className="text-[11px] font-bold text-muted-foreground">Active</span>
                    <Switch
                      checked={prov.enabled}
                      onCheckedChange={() => handleToggleEnable(prov.id, prov.enabled)}
                    />
                  </div>

                  <Button
                    onClick={() => handleTestProvider(prov)}
                    disabled={isTestingSingle === prov.id}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-bold rounded-xl border-indigo-500/30 text-indigo-600 hover:bg-indigo-50"
                  >
                    {isTestingSingle === prov.id ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 mr-1" /> Test Key
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => openEditModal(prov)}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs font-bold rounded-xl hover:bg-muted"
                  >
                    Edit
                  </Button>

                  <Button
                    onClick={() => handleDeleteProvider(prov.id, prov.name)}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs font-bold rounded-xl text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Modal Form: Add or Edit Provider */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Server className="h-5 w-5 text-indigo-600" />
              {editingProvider ? "Edit Email Provider" : "Add Email Sending Account"}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium">
              Configure your API key and sender details. System automatically uses this provider for failover.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Provider Type Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Select Provider Service</label>
              <div className="grid grid-cols-3 gap-1.5">
                {DEFAULT_PROVIDER_PRESETS.map((preset) => (
                  <button
                    key={preset.type}
                    type="button"
                    onClick={() => handleSelectPresetType(preset.type)}
                    className={`p-2 rounded-xl border text-left text-xs font-extrabold transition-all ${
                      selectedType === preset.type
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-card hover:bg-muted/50 border-border text-foreground"
                    }`}
                  >
                    <p className="truncate">{preset.name.split(" ")[0]}</p>
                    <p className={`text-[9px] font-normal truncate mt-0.5 ${selectedType === preset.type ? "text-indigo-100" : "text-muted-foreground"}`}>
                      {preset.freeTierInfo.split(" ")[0]} {preset.freeTierInfo.split(" ")[1]}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Presets Helper Banner */}
            {currentPresetInfo && (
              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs flex items-center justify-between gap-2">
                <div>
                  <p className="font-extrabold text-indigo-900 dark:text-indigo-200">{currentPresetInfo.name}</p>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                    Free Tier: {currentPresetInfo.freeTierInfo}
                  </p>
                </div>
                <a
                  href={currentPresetInfo.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-extrabold text-[10px] shrink-0 hover:bg-indigo-700 flex items-center gap-1"
                >
                  Get Key <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {/* API Key Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">API Key / Token</label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  placeholder={currentPresetInfo?.placeholderKey || "Enter your API key..."}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="h-10 pr-10 rounded-xl text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Sender From Name & From Email */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Sender From Email</label>
                <Input
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="e.g. info@yourdomain.com"
                  className="h-10 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Sender From Name</label>
                <Input
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="e.g. Bethelincovibe TV"
                  className="h-10 rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            {/* Domain or Region if required */}
            {(selectedType === "mailgun" || selectedType === "amazonses") && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  {selectedType === "mailgun" ? "Mailgun Sending Domain" : "AWS Region"}
                </label>
                <Input
                  type="text"
                  value={domainOrRegion}
                  onChange={(e) => setDomainOrRegion(e.target.value)}
                  placeholder={selectedType === "mailgun" ? "mg.yourdomain.com" : "us-east-1"}
                  className="h-10 rounded-xl text-xs font-medium"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProvider}
              className="rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {editingProvider ? "Save Changes" : "Add to Failover Engine"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
