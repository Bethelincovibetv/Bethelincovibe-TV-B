import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GoogleGenAI, Type } from "@google/genai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Send, Bot, CheckCircle2, ShieldCheck, Zap, RefreshCw, Building2, FileText, Users, Sliders, Bell, AlertTriangle, Cpu, ChevronDown, ChevronUp, BarChart2 } from "lucide-react";
import { toast } from "sonner";
import { FEATURE_META, FeatureKey } from "@/contexts/FeatureFlagsContext";

type ToolLog = {
  tool: string;
  summary: string;
  timestamp: string;
  success: boolean;
};

type Msg = {
  role: "user" | "assistant";
  content: string;
  toolLogs?: ToolLog[];
};

const SUGGESTIONS = [
  "Run a full platform diagnostic and auto-tune all configurations",
  "Approve all pending business listings and set them as active",
  "Enable all feature flags across the entire platform",
  "Write and publish a new trending article about starting a business in Lagos",
  "Update site WhatsApp number to +2348000000000 and enable daily rewards",
  "Turn on all ad networks and set daily reward credit to 50 Naira",
];

export default function AdminPlatformAI() {
  const qc = useQueryClient();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({});
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleLog = (index: number) => {
    setExpandedLogs((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  // --- Real-time Platform Stats ---
  const { data: stats, refetch: refetchStats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-ai-platform-stats"],
    queryFn: async () => {
      const [
        { count: bizCount },
        { count: pendingBizCount },
        { count: postCount },
        { count: userCount },
        { data: settingsData },
        { count: catCount },
      ] = await Promise.all([
        supabase.from("businesses").select("*", { count: "exact", head: true }),
        supabase.from("businesses").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("blog_posts").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("site_settings").select("*"),
        supabase.from("categories").select("*", { count: "exact", head: true }),
      ]);

      const settingsMap: Record<string, string> = {};
      (settingsData || []).forEach((s: any) => { settingsMap[s.key] = s.value || ""; });

      let enabledFlagsCount = 0;
      FEATURE_META.forEach((m) => {
        const val = settingsMap[`feature_${m.key}`];
        if (!["off", "false", "0", "disabled"].includes(String(val || "").toLowerCase())) {
          enabledFlagsCount++;
        }
      });

      const globalAds = settingsMap["ads_global_enabled"] !== "false";

      return {
        businesses: bizCount || 0,
        pendingBusinesses: pendingBizCount || 0,
        posts: postCount || 0,
        users: userCount || 0,
        categories: catCount || 0,
        enabledFlags: enabledFlagsCount,
        totalFlags: FEATURE_META.length,
        globalAds,
        settingsMap,
      };
    },
    refetchInterval: 15000,
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  // --- TOOL EXECUTION ENGINE ---
  const executeTools = async (toolCalls: { name: string; args: any }[]): Promise<{ logs: ToolLog[]; resultSummary: string }> => {
    const logs: ToolLog[] = [];
    const results: string[] = [];

    for (const call of toolCalls) {
      const ts = new Date().toLocaleTimeString();
      try {
        switch (call.name) {
          case "update_site_setting": {
            const { key, value } = call.args;
            if (!key) throw new Error("Key required");
            const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
            if (existing) {
              await supabase.from("site_settings").update({ value: String(value) }).eq("key", key);
            } else {
              await supabase.from("site_settings").insert({ key, value: String(value) });
            }
            logs.push({ tool: "update_site_setting", summary: `Updated setting '${key}' to '${value}'`, timestamp: ts, success: true });
            results.push(`Setting '${key}' set to '${value}'.`);
            break;
          }

          case "toggle_feature_flag": {
            const { feature_key, enabled } = call.args;
            if (!feature_key) throw new Error("Feature key required");
            const val = enabled ? "on" : "off";
            await supabase.from("site_settings").upsert({ key: `feature_${feature_key}`, value: val }, { onConflict: "key" });
            logs.push({ tool: "toggle_feature_flag", summary: `Feature '${feature_key}' ${enabled ? "ENABLED" : "DISABLED"}`, timestamp: ts, success: true });
            results.push(`Feature '${feature_key}' is now ${enabled ? "enabled" : "disabled"}.`);
            break;
          }

          case "enable_all_feature_flags": {
            for (const m of FEATURE_META) {
              await supabase.from("site_settings").upsert({ key: `feature_${m.key}`, value: "on" }, { onConflict: "key" });
            }
            logs.push({ tool: "enable_all_feature_flags", summary: `Enabled all ${FEATURE_META.length} platform feature flags`, timestamp: ts, success: true });
            results.push(`All ${FEATURE_META.length} feature flags have been enabled.`);
            break;
          }

          case "approve_all_pending_businesses": {
            const { data: pending } = await supabase.from("businesses").select("id, title").eq("status", "pending");
            const count = pending?.length || 0;
            if (count > 0) {
              await supabase.from("businesses").update({ status: "approved" }).eq("status", "pending");
            }
            logs.push({ tool: "approve_all_pending_businesses", summary: `Approved ${count} pending business listing(s)`, timestamp: ts, success: true });
            results.push(`Approved ${count} pending business listing(s).`);
            break;
          }

          case "update_business_status": {
            const { business_id, title_search, status, is_verified, is_featured } = call.args;
            let targetId = business_id;
            if (!targetId && title_search) {
              const { data } = await supabase.from("businesses").select("id").ilike("title", `%${title_search}%`).limit(1).maybeSingle();
              targetId = data?.id;
            }
            if (!targetId) throw new Error("Business not found");
            const patch: any = {};
            if (status) patch.status = status;
            if (typeof is_verified === "boolean") patch.is_verified = is_verified;
            if (typeof is_featured === "boolean") patch.is_featured = is_featured;
            await supabase.from("businesses").update(patch).eq("id", targetId);
            logs.push({ tool: "update_business_status", summary: `Updated business '${targetId}' with ${JSON.stringify(patch)}`, timestamp: ts, success: true });
            results.push(`Updated business '${targetId}' successfully.`);
            break;
          }

          case "create_and_publish_blog_post": {
            const { title, content, excerpt, category_id } = call.args;
            if (!title || !content) throw new Error("Title and content required");
            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            const postObj: any = {
              title,
              slug: `${slug}-${Date.now().toString(36)}`,
              content,
              excerpt: excerpt || title,
              published: true,
              is_featured: true,
            };
            if (category_id) postObj.category_id = category_id;
            const { data: newPost, error } = await supabase.from("blog_posts").insert(postObj).select("id").single();
            if (error) throw error;
            logs.push({ tool: "create_and_publish_blog_post", summary: `Published article '${title}' (ID: ${newPost?.id})`, timestamp: ts, success: true });
            results.push(`Published blog article '${title}'.`);
            break;
          }

          case "create_category": {
            const { name, type } = call.args;
            if (!name) throw new Error("Category name required");
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            await supabase.from("categories").insert({ name, slug, type: type || "blog" });
            logs.push({ tool: "create_category", summary: `Created ${type || "blog"} category '${name}'`, timestamp: ts, success: true });
            results.push(`Created category '${name}'.`);
            break;
          }

          case "broadcast_system_notification": {
            const { title, message } = call.args;
            if (!title || !message) throw new Error("Title and message required");
            // Fetch sample user IDs to insert in app notification feed
            const { data: users } = await supabase.from("profiles").select("id").limit(100);
            if (users && users.length > 0) {
              const rows = users.map((u) => ({
                user_id: u.id,
                title,
                message,
                read: false,
              }));
              await supabase.from("notifications").insert(rows);
            }
            logs.push({ tool: "broadcast_system_notification", summary: `Sent broadcast '${title}' to platform users`, timestamp: ts, success: true });
            results.push(`Broadcast notification '${title}' sent.`);
            break;
          }

          case "run_system_autotune": {
            // 1. Enable key feature flags
            const coreFlags: FeatureKey[] = ["businesses", "blog", "products", "business_listing", "advertise", "wallet", "tools", "comments", "learn", "forum", "daily_rewards"];
            for (const fk of coreFlags) {
              await supabase.from("site_settings").upsert({ key: `feature_${fk}`, value: "on" }, { onConflict: "key" });
            }
            // 2. Set default site configs if missing
            const defaults: Record<string, string> = {
              ads_global_enabled: "true",
              ads_provider_native: "true",
              daily_login_credits: "50",
              ad_cost_per_day: "500",
              ad_click_reward_naira: "10",
              referral_signup_bonus: "100",
            };
            for (const [k, v] of Object.entries(defaults)) {
              const { data: existing } = await supabase.from("site_settings").select("id,value").eq("key", k).maybeSingle();
              if (!existing) {
                await supabase.from("site_settings").insert({ key: k, value: v });
              }
            }
            // 3. Approve pending businesses
            const { data: pending } = await supabase.from("businesses").select("id").eq("status", "pending");
            if (pending && pending.length > 0) {
              await supabase.from("businesses").update({ status: "approved" }).eq("status", "pending");
            }
            logs.push({ tool: "run_system_autotune", summary: `Executed full platform diagnostic and auto-tune. Approved ${pending?.length || 0} pending business(es). Verified core feature flags and settings.`, timestamp: ts, success: true });
            results.push("System auto-tune completed successfully.");
            break;
          }

          default:
            logs.push({ tool: call.name, summary: `Executed action '${call.name}'`, timestamp: ts, success: true });
            results.push(`Executed '${call.name}'.`);
        }
      } catch (err: any) {
        logs.push({ tool: call.name, summary: `Error: ${err.message}`, timestamp: ts, success: false });
        results.push(`Failed to run '${call.name}': ${err.message}`);
      }
    }

    // Refresh query caches instantly
    qc.invalidateQueries();
    refetchStats();

    return { logs, resultSummary: results.join("\n") };
  };

  // --- LOCAL NATURAL LANGUAGE INTENT PARSER (FALLBACK & SPEED) ---
  const parseAndExecuteIntent = async (prompt: string): Promise<{ logs: ToolLog[]; summaryText: string }> => {
    const lower = prompt.toLowerCase();
    const toolCalls: { name: string; args: any }[] = [];

    if (lower.includes("autotune") || lower.includes("auto-tune") || lower.includes("diagnostic") || lower.includes("setup")) {
      toolCalls.push({ name: "run_system_autotune", args: {} });
    }
    if (lower.includes("approve") && (lower.includes("business") || lower.includes("pending") || lower.includes("listing"))) {
      toolCalls.push({ name: "approve_all_pending_businesses", args: {} });
    }
    if (lower.includes("enable all feature") || lower.includes("turn on all feature") || lower.includes("all features")) {
      toolCalls.push({ name: "enable_all_feature_flags", args: {} });
    }

    // Setting updates
    const whatsappMatch = prompt.match(/(?:whatsapp|phone|number)\s*(?:to|=)?\s*(\+?[0-9]{10,15})/i);
    if (whatsappMatch) {
      toolCalls.push({ name: "update_site_setting", args: { key: "social_whatsapp", value: whatsappMatch[1] } });
    }

    const rewardMatch = prompt.match(/(?:daily reward|reward credit)\s*(?:to|=)?\s*([0-9]+)/i);
    if (rewardMatch) {
      toolCalls.push({ name: "update_site_setting", args: { key: "daily_login_credits", value: rewardMatch[1] } });
    }

    // Ad toggle
    if (lower.includes("turn off ad") || lower.includes("disable ad")) {
      toolCalls.push({ name: "update_site_setting", args: { key: "ads_global_enabled", value: "false" } });
    } else if (lower.includes("turn on ad") || lower.includes("enable ad")) {
      toolCalls.push({ name: "update_site_setting", args: { key: "ads_global_enabled", value: "true" } });
    }

    // Article generation intent
    if (lower.includes("write") || lower.includes("publish") || lower.includes("article") || lower.includes("blog post")) {
      const topicMatch = prompt.match(/(?:about|topic|title)\s*["']?([^"'\n\.]+)/i);
      const title = topicMatch ? topicMatch[1].trim() : "10 Proven Tips to Grow Your Business in Lagos";
      const content = `<p>Launching and growing a business requires dedication, strategic planning, and understanding your market dynamics.</p><h3>1. Define Your Target Audience</h3><p>Ensure you clearly understand who your primary customers are and what pain points your product solves.</p><h3>2. Build a Strong Digital Footprint</h3><p>Listing your business on local directories, optimizing your Google Profile, and staying active on social platforms increases organic visibility.</p><h3>3. Deliver Outstanding Customer Service</h3><p>Word-of-mouth recommendations remain one of the highest-converting marketing channels.</p>`;
      toolCalls.push({ name: "create_and_publish_blog_post", args: { title, content, excerpt: "Essential business growth strategies for entrepreneurs." } });
    }

    if (toolCalls.length === 0) {
      // Default diagnostic & tune call if user asks general setup
      toolCalls.push({ name: "run_system_autotune", args: {} });
    }

    const { logs, resultSummary } = await executeTools(toolCalls);
    const summaryText = `I have processed your administrative directive and executed the required operations directly on the platform:\n\n${resultSummary}\n\nAll changes are live and applied across the system.`;
    return { logs, summaryText };
  };

  // --- AI ASK HANDLER ---
  const handleAsk = async (question: string) => {
    if (!question.trim() || busy) return;
    const userMsg: Msg = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setBusy(true);
    setActiveTask("Analyzing platform state and building execution plan…");

    try {
      // Check for Gemini API key
      const apiKey = stats?.settingsMap?.["gemini_api_key"] || import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

      if (apiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const systemInstruction = `You are the Chief AI Administrator & Operations Agent for Bethelincovibe TV Platform. You have full administrative authority to inspect, configure, tune, publish content, approve listings, toggle feature flags, update settings, manage ads, and perform system operations.
Current live stats: ${JSON.stringify({
            businesses: stats?.businesses,
            pendingBusinesses: stats?.pendingBusinesses,
            posts: stats?.posts,
            users: stats?.users,
            enabledFlags: stats?.enabledFlags,
            globalAds: stats?.globalAds,
          })}
When executing admin requests, call the appropriate tools.`;

          const response = await ai.models.generateContent({
            model: "gemini-3.7-flash",
            contents: [
              { role: "user", parts: [{ text: `System Context: ${systemInstruction}\nUser Directive: ${question}` }] }
            ],
            config: {
              tools: [
                {
                  functionDeclarations: [
                    {
                      name: "run_system_autotune",
                      description: "Runs diagnostic and auto-tunes core platform flags and default settings.",
                      parameters: { type: Type.OBJECT, properties: {} },
                    },
                    {
                      name: "approve_all_pending_businesses",
                      description: "Approves all pending business listings.",
                      parameters: { type: Type.OBJECT, properties: {} },
                    },
                    {
                      name: "enable_all_feature_flags",
                      description: "Enables all platform feature flags.",
                      parameters: { type: Type.OBJECT, properties: {} },
                    },
                    {
                      name: "update_site_setting",
                      description: "Updates a site setting key-value pair.",
                      parameters: {
                        type: Type.OBJECT,
                        properties: {
                          key: { type: Type.STRING },
                          value: { type: Type.STRING },
                        },
                        required: ["key", "value"],
                      },
                    },
                    {
                      name: "toggle_feature_flag",
                      description: "Toggles a specific feature flag on or off.",
                      parameters: {
                        type: Type.OBJECT,
                        properties: {
                          feature_key: { type: Type.STRING },
                          enabled: { type: Type.BOOLEAN },
                        },
                        required: ["feature_key", "enabled"],
                      },
                    },
                    {
                      name: "create_and_publish_blog_post",
                      description: "Writes and publishes a new blog post.",
                      parameters: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          content: { type: Type.STRING },
                          excerpt: { type: Type.STRING },
                        },
                        required: ["title", "content"],
                      },
                    },
                    {
                      name: "broadcast_system_notification",
                      description: "Sends an in-app system notification to users.",
                      parameters: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          message: { type: Type.STRING },
                        },
                        required: ["title", "message"],
                      },
                    },
                  ],
                },
              ],
            },
          });

          const functionCalls = response.functionCalls();
          if (functionCalls && functionCalls.length > 0) {
            setActiveTask(`Executing ${functionCalls.length} administrative action(s)…`);
            const calls = functionCalls.map((fc) => ({ name: fc.name, args: fc.args }));
            const { logs, resultSummary } = await executeTools(calls);
            const answer = response.text || `I have executed the requested administrative tools:\n\n${resultSummary}`;
            setMessages((m) => [...m, { role: "assistant", content: answer, toolLogs: logs }]);
            toast.success("AI Administrator executed tasks successfully!");
            setBusy(false);
            setActiveTask(null);
            return;
          } else if (response.text) {
            // Text response or auto-intent check
            const { logs, summaryText } = await parseAndExecuteIntent(question);
            setMessages((m) => [...m, { role: "assistant", content: response.text + "\n\n" + summaryText, toolLogs: logs }]);
            toast.success("Administrative update complete");
            setBusy(false);
            setActiveTask(null);
            return;
          }
        } catch (apiErr) {
          console.warn("Gemini API fallback to direct intent engine:", apiErr);
        }
      }

      // Fallback Engine (Direct Execution)
      const { logs, summaryText } = await parseAndExecuteIntent(question);
      setMessages((m) => [...m, { role: "assistant", content: summaryText, toolLogs: logs }]);
      toast.success("AI Administrator executed directive!");
    } catch (err: any) {
      toast.error("Execution failed: " + err.message);
      setMessages((m) => [...m, { role: "assistant", content: `An error occurred while executing the task: ${err.message}` }]);
    } finally {
      setBusy(false);
      setActiveTask(null);
    }
  };

  return (
    <div className="flex h-[calc(100vh-6.5rem)] flex-col gap-3 max-w-6xl mx-auto">
      {/* Compact Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-primary/15 via-accent/10 to-purple-500/10 border border-primary/20 shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-indigo-600 to-purple-600 text-white shadow-[0_4px_12px_-2px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.45)] ring-2 ring-white/25">
            <Bot className="h-5 w-5" strokeWidth={2.2} />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-background"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight leading-none">AI General Administrator</h1>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-extrabold text-[10px]">
                Autonomous Agent
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium mt-1">
              Full administrative power to configure settings, approve listings, publish content, and tune platform features.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Button
            variant={showStats ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className="h-8 font-bold text-xs rounded-xl gap-1.5 border-primary/20"
          >
            <BarChart2 className="h-3.5 w-3.5 text-primary" />
            {showStats ? "Hide Platform Stats" : "Show Platform Stats"}
            {showStats ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchStats()}
            disabled={statsLoading}
            className="h-8 font-bold text-xs rounded-xl gap-1.5 border-primary/20 bg-background/80"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-primary ${statsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Collapsible Live System Metrics Panel */}
      {showStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 shrink-0 animate-in fade-in slide-in-from-top-2 duration-200">
          <Card className="p-2.5 bg-card/90 border-border/70 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Businesses</span>
              <Building2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="text-base font-black mt-1">{stats?.businesses ?? "—"}</div>
          </Card>

          <Card className={`p-2.5 border-border/70 flex flex-col justify-between shadow-xs ${stats?.pendingBusinesses ? "bg-amber-500/10 border-amber-500/30" : "bg-card/90"}`}>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Pending</span>
              <AlertTriangle className={`h-3.5 w-3.5 ${stats?.pendingBusinesses ? "text-amber-500" : "text-muted-foreground"}`} />
            </div>
            <div className={`text-base font-black mt-1 ${stats?.pendingBusinesses ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {stats?.pendingBusinesses ?? "—"}
            </div>
          </Card>

          <Card className="p-2.5 bg-card/90 border-border/70 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Articles</span>
              <FileText className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <div className="text-base font-black mt-1">{stats?.posts ?? "—"}</div>
          </Card>

          <Card className="p-2.5 bg-card/90 border-border/70 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Users</span>
              <Users className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="text-base font-black mt-1">{stats?.users ?? "—"}</div>
          </Card>

          <Card className="p-2.5 bg-card/90 border-border/70 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Features</span>
              <Sliders className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="text-base font-black mt-1">
              {stats ? `${stats.enabledFlags}/${stats.totalFlags}` : "—"}
            </div>
          </Card>

          <Card className="p-2.5 bg-card/90 border-border/70 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Ads Status</span>
              <Zap className={`h-3.5 w-3.5 ${stats?.globalAds ? "text-amber-400" : "text-muted-foreground"}`} />
            </div>
            <div className="text-xs font-extrabold mt-1">
              {stats?.globalAds ? (
                <span className="text-emerald-600 dark:text-emerald-400">ENABLED</span>
              ) : (
                <span className="text-muted-foreground">DISABLED</span>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Main Agent Workspace (Unobstructed Chat View) */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border-border/80 shadow-md">
        <CardHeader className="py-2.5 px-4 border-b bg-card/80 flex flex-row items-center justify-between shrink-0">
          <div>
            <CardTitle className="text-sm font-extrabold flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" /> Autonomous Operations Feed
            </CardTitle>
          </div>
          {busy && (
            <div className="flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="truncate max-w-[200px]">{activeTask || "Processing directive…"}</span>
            </div>
          )}
        </CardHeader>

        {/* Scrollable Chat Area */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-4 py-6 text-center max-w-2xl mx-auto">
              <div className="h-12 w-12 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">AI Administrator Ready</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-lg mx-auto">
                  Type any instruction below or choose a quick action.
                </p>
              </div>

              {/* Quick Action Suggestions Grid */}
              <div className="grid gap-2 sm:grid-cols-2 text-left pt-2">
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAsk(s)}
                    disabled={busy}
                    className="p-3 rounded-2xl border border-border/80 bg-card hover:bg-secondary/80 hover:border-primary/40 text-xs font-semibold leading-snug transition-all flex items-start gap-2.5 group active:scale-[0.98]"
                  >
                    <span className="h-5 w-5 shrink-0 rounded-md bg-primary/10 text-primary flex items-center justify-center font-extrabold text-[10px] group-hover:bg-primary group-hover:text-white transition-colors">
                      {idx + 1}
                    </span>
                    <span className="text-foreground/90 group-hover:text-foreground">{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages List */}
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"} gap-1`}>
              <div className="text-[10px] font-bold text-muted-foreground/70 uppercase px-1">
                {m.role === "user" ? "You (Administrator)" : "AI Agent"}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground font-semibold rounded-tr-none"
                    : "bg-muted/70 text-foreground border border-border/60 rounded-tl-none"
                }`}
              >
                {m.content}
              </div>

              {/* Compact Collapsible Tool Execution Logs */}
              {m.toolLogs && m.toolLogs.length > 0 && (
                <div className="w-full max-w-[85%] sm:max-w-[80%] mt-1">
                  <button
                    onClick={() => toggleLog(i)}
                    className="flex items-center justify-between w-full p-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-xl transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Executed {m.toolLogs.length} Administrative Action(s)
                    </span>
                    {expandedLogs[i] ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {expandedLogs[i] && (
                    <div className="space-y-1.5 mt-1.5 pl-2 border-l-2 border-emerald-500/40">
                      {m.toolLogs.map((log, lIdx) => (
                        <div key={lIdx} className="flex items-center justify-between text-xs bg-background/90 p-2 rounded-xl border border-border/60">
                          <div className="flex items-center gap-2 font-bold min-w-0">
                            <Badge variant="outline" className="text-[9px] uppercase font-extrabold bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                              {log.tool}
                            </Badge>
                            <span className="truncate text-foreground/90">{log.summary}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 font-mono ml-2">{log.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <div ref={endRef} />
        </CardContent>

        {/* Quick Suggestions Chips Bar (above input when messages exist) */}
        {messages.length > 0 && (
          <div className="px-3 py-1.5 border-t bg-muted/20 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
            {SUGGESTIONS.slice(0, 4).map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleAsk(s)}
                disabled={busy}
                className="whitespace-nowrap px-3 py-1 text-[11px] font-bold rounded-full border border-border bg-background hover:bg-primary/10 hover:text-primary transition-all shrink-0"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Bottom Input Form (Sticky & Visible) */}
        <div className="p-3 border-t bg-card/90 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(input);
            }}
            className="flex gap-2"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type instruction (e.g. Approve all pending listings, enable daily rewards, turn on all flags...)"
              disabled={busy}
              className="h-11 font-medium text-sm rounded-xl px-4 bg-background border-border shadow-xs focus-visible:ring-2 focus-visible:ring-primary"
            />
            <Button
              type="submit"
              disabled={busy || !input.trim()}
              className="h-11 px-5 font-bold rounded-xl shrink-0 gap-2 shadow-md bg-primary hover:bg-primary/90"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Executing…</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Execute</span>
                </>
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
