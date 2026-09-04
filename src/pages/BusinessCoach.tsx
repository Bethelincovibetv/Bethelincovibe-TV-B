import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Send,
  Sparkles,
  Briefcase,
  Plus,
  Check,
  Loader2,
  Trash2,
  Radio,
  Copy,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Lightbulb,
  Target,
  Settings2,
  Bot,
  MessageSquare,
  ListTodo,
  Volume2,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  Layers,
  Brain,
  Zap,
  RefreshCw,
  Clock,
  RotateCcw,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { GoogleGenAI } from "@google/genai";
import { getHealthyGeminiClient, reportKeyFailure } from "@/lib/multiApiKeyManager";
import { getGeminiClient } from "@/lib/aiCollaborationEngine";
import {
  getActiveGeminiModelId,
  setActiveGeminiModelId,
} from "@/lib/geminiModelRegistry";
import {
  fetchUserBusinessIntelligence,
  ComprehensiveBusinessContext,
} from "@/lib/userBusinessIntelligence";
import GeminiModelSelectorPill from "@/components/coach/GeminiModelSelectorPill";
import CoachNavigationSidebar, {
  CoachConversationSummary,
} from "@/components/coach/CoachNavigationSidebar";
import ListenButton from "@/components/ListenButton";
import LiveVoiceButton from "@/components/coach/LiveVoiceButton";
import VixoraCoachLiveDialog from "@/components/coach/VixoraCoachLiveDialog";
import VixoraAICoachToday from "@/components/coach/VixoraAICoachToday";
import SEO from "@/components/SEO";
import { PAGE_OG_IMAGES, SITE_NAME } from "@/lib/seo";
import coachAvatarImg from "@/assets/images/ai_business_coach_1787551806148.jpg";
import { copyToClipboard } from "@/lib/clipboard";

/** Clean raw markdown symbols for clean display and text-to-speech */
function cleanText(s: string): string {
  return (s || "")
    .replace(/\*\*\*(.*?)\*\*\*/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/(^|\s)\*(\S[^*\n]*?\S)\*(?=\s|$)/g, "$1$2")
    .replace(/(^|\s)_(\S[^_\n]*?\S)_(?=\s|$)/g, "$1$2")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[\*\-]\s+/gm, "• ")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1");
}

type Msg = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  modelUsed?: string;
  timestamp?: string;
};

export default function BusinessCoach() {
  const { user, loading } = useAuth();
  const [conversations, setConversations] = useState<CoachConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);

  // Navigation & layout states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Dynamic Model Selection state
  const [selectedModel, setSelectedModel] = useState<string>(() => getActiveGeminiModelId());

  // Ground-Truth User Business Intelligence
  const [bizIntelligence, setBizIntelligence] = useState<ComprehensiveBusinessContext | null>(null);
  const [loadingBizData, setLoadingBizData] = useState(false);
  const [selectedBizId, setSelectedBizId] = useState<string>("all");

  const [liveOpen, setLiveOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [taskFilter, setTaskFilter] = useState<"all" | "todo" | "in_progress" | "done">("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load ground-truth business ecosystem intelligence
  const loadBusinessData = async (targetBizId?: string) => {
    if (!user) return;
    setLoadingBizData(true);
    try {
      const data = await fetchUserBusinessIntelligence(user.id, targetBizId || selectedBizId);
      setBizIntelligence(data);
    } catch (err) {
      console.warn("Could not load user business data:", err);
    } finally {
      setLoadingBizData(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadConvs();
    loadTasks();
    loadBusinessData();
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function loadConvs() {
    const { data } = await supabase
      .from("coach_conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    const list = (data || []).map((c: any) => ({
      id: c.id,
      title: c.title || "Strategy Session",
      updated_at: c.updated_at,
      created_at: c.created_at,
      business_context: c.business_context,
    }));

    setConversations(list);
    if (list.length > 0 && !activeId) {
      selectConv(list[0].id);
    }
  }

  async function loadTasks() {
    const { data } = await supabase
      .from("coach_tasks")
      .select("*")
      .order("created_at", { ascending: false });
    setTasks(data || []);
  }

  async function selectConv(id: string) {
    setActiveId(id);
    const { data } = await supabase
      .from("coach_messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at");

    setMessages(
      (data || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.created_at,
      }))
    );
    setMobileDrawerOpen(false);
  }

  async function newConv() {
    setActiveId(null);
    setMessages([]);
    setMobileDrawerOpen(false);
  }

  async function deleteConv(id: string) {
    await supabase.from("coach_messages").delete().eq("conversation_id", id);
    await supabase.from("coach_conversations").delete().eq("id", id);
    toast.success("Strategy session deleted");
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
    loadConvs();
  }

  async function renameConv(id: string, newTitle: string) {
    await supabase.from("coach_conversations").update({ title: newTitle }).eq("id", id);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    );
    toast.success("Session renamed");
  }

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    setActiveGeminiModelId(modelId);
  };

  const handleSelectBusinessId = (bizId: string) => {
    setSelectedBizId(bizId);
    loadBusinessData(bizId);
    toast.success("Updated focus business context");
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  async function send(textToSend?: string, overrideModel?: string) {
    const query = (textToSend || input).trim();
    if (!query || sending) return;
    if (!textToSend) setInput("");

    const modelToUse = overrideModel || selectedModel || "gemini-3.8-flash";
    setSending(true);

    const userMsg: Msg = {
      role: "user",
      content: query,
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);

    let conversationId = activeId;

    // Ensure conversation row exists in DB
    if (!conversationId) {
      try {
        const { data: newConvData, error: convErr } = await supabase
          .from("coach_conversations")
          .insert({
            user_id: user!.id,
            title: query.slice(0, 48),
            business_context: {
              business_id: bizIntelligence?.selectedBusinessId,
              business_name: bizIntelligence?.selectedBusiness?.name,
              model_used: modelToUse,
            },
          })
          .select()
          .single();

        if (!convErr && newConvData) {
          conversationId = newConvData.id;
          setActiveId(conversationId);
          loadConvs();
        }
      } catch (err) {
        console.warn("Could not create coach_conversation row:", err);
      }
    }

    // Attempt 1: Try Edge Function if deployed
    let aiSuccess = false;
    let replyText = "";

    try {
      const { data, error } = await supabase.functions.invoke("business-coach", {
        body: {
          conversationId,
          message: query,
          model: modelToUse,
          businessIntelligence: bizIntelligence,
        },
      });

      if (!error && data?.reply) {
        replyText = data.reply;
        aiSuccess = true;
      }
    } catch {
      // Graceful fallback to client-side multi-key engine
    }

    // Attempt 2: Direct Gemini Multi-Key Failover Engine with ground-truth business context
    if (!aiSuccess) {
      try {
        const handle = await getHealthyGeminiClient("coach_ai");
        if (!handle) {
          throw new Error(
            "Coach AI engine is offline or all configured Gemini API keys are exhausted. Please verify API keys in Admin Settings."
          );
        }

        const systemInstructions =
          bizIntelligence?.formattedContextPrompt ||
          "You are Coach Bethel Goodgift, the Chief Strategy Director at Bethelincovibe. Provide sharp, serious, high-converting SME advice.";

        // Format conversational history
        const contextHistory = messages.slice(-6).map((m) => `${m.role === "user" ? "Founder" : "Coach"}: ${m.content}`).join("\n\n");

        const promptContent = `
${systemInstructions}

### RECENT DISCUSSION HISTORY:
${contextHistory || "First interaction in this session."}

Founder's Query: "${query}"

Provide your authoritative strategic answer, formatted with clear headings, exact Naira figures, unit economics, immediate action steps, and copyable WhatsApp/outreach scripts where relevant.
`.trim();

        try {
          const response = await handle.client.models.generateContent({
            model: modelToUse,
            contents: promptContent,
            config: {
              temperature: 0.35,
            },
          });

          replyText =
            response.text?.trim() ||
            "Let's structure your business economics for maximum profit and customer velocity.";
          aiSuccess = true;
        } catch (callErr: any) {
          // If this key failed (e.g. 429 quota), report failure to multiApiKeyManager and retry once with backup
          console.warn(`Key "${handle.keyConfig.name}" failed, cycling pool failover:`, callErr);
          await reportKeyFailure(handle.keyConfig.id, callErr);

          // Retry with fresh fallback client
          const fallbackHandle = await getHealthyGeminiClient("coach_ai");
          if (fallbackHandle) {
            const retryResp = await fallbackHandle.client.models.generateContent({
              model: modelToUse,
              contents: promptContent,
              config: { temperature: 0.35 },
            });
            replyText =
              retryResp.text?.trim() ||
              "I have analyzed your business metrics and structured this growth roadmap.";
            aiSuccess = true;
          } else {
            throw callErr;
          }
        }
      } catch (err: any) {
        console.error("Direct AI Engine error:", err);
        toast.error(`Could not reach Coach Bethel: ${err.message || "Please check connection"}`);
        setMessages((m) => m.slice(0, -1));
        setSending(false);
        return;
      }
    }

    // Persist assistant message
    const assistantMsg: Msg = {
      role: "assistant",
      content: replyText,
      modelUsed: modelToUse,
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, assistantMsg]);

    // Save to coach_messages in DB
    if (user && conversationId) {
      await supabase
        .from("coach_messages")
        .insert([
          { conversation_id: conversationId, role: "user", content: query },
          { conversation_id: conversationId, role: "assistant", content: replyText },
        ])
        .catch(() => {});
    }

    setSending(false);
  }

  // Save task to execution tracker
  async function saveAsTask(content: string) {
    const title =
      content
        .split("\n")
        .find((l) => l.trim())
        ?.replace(/^[#*\-\d.\s•]+/, "")
        .slice(0, 120) || "Strategic Execution Milestone";

    await supabase.from("coach_tasks").insert({
      user_id: user!.id,
      conversation_id: activeId,
      title,
      notes: content,
      status: "todo",
    });
    toast.success("Saved to Execution Tracker!");
    loadTasks();
    setTasksOpen(true);
  }

  async function updateTaskStatus(id: string, newStatus: string) {
    await supabase.from("coach_tasks").update({ status: newStatus }).eq("id", id);
    loadTasks();
  }

  async function deleteTask(id: string) {
    await supabase.from("coach_tasks").delete().eq("id", id);
    loadTasks();
    toast.success("Milestone removed");
  }

  const copyMessage = async (text: string, idx: number) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedIndex(idx);
      toast.success("Strategic brief copied to clipboard!");
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const taskProgress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;
  const filteredTasks = tasks.filter((t) => (taskFilter === "all" ? true : t.status === taskFilter));

  const selectedBiz = bizIntelligence?.selectedBusiness;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO
        title={`AI Business Coach & Executive Strategy Advisory | ${SITE_NAME}`}
        description="Authoritative, data-grounded business coaching powered by Google Gemini. Profit margins, wholesale imports, and high-converting WhatsApp sales scripts."
        url="/dashboard/coach"
        type="website"
        image={PAGE_OG_IMAGES.coach()}
      />

      {/* Top Executive App Bar */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white shadow-lg">
        <div className="px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          {/* Left: Identity & Back */}
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-xl h-8 px-2 shrink-0"
            >
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </Button>

            {/* Sidebar toggle for desktop & mobile */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setSidebarOpen(!sidebarOpen);
                setMobileDrawerOpen(!mobileDrawerOpen);
              }}
              className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10 rounded-xl shrink-0"
              title="Toggle Navigation Sidebar"
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>

            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={coachAvatarImg}
                  alt="Coach Bethel Goodgift"
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl object-cover ring-2 ring-primary/40 shadow-md"
                />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xs sm:text-sm font-black text-white truncate tracking-tight">
                    Coach Bethel Goodgift
                  </h1>
                  <Badge className="bg-primary/30 text-indigo-200 border-primary/40 font-black text-[9px] px-1.5 py-0.2 hidden md:inline-flex">
                    CHIEF STRATEGY DIRECTOR
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-300 truncate flex items-center gap-1.5">
                  <span className="truncate">
                    {selectedBiz?.name ? `Grounding: ${selectedBiz.name}` : "Executive SME Advisory"}
                  </span>
                  {selectedBiz?.verified && (
                    <ShieldCheck className="h-3 w-3 text-emerald-400 shrink-0 inline" />
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Model Selector Pill & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Model Selector Pill */}
            <GeminiModelSelectorPill
              currentModelId={selectedModel}
              onModelChange={handleModelChange}
              variant="luxury"
              className="bg-white/10 border-white/20 text-white hover:bg-white/15"
            />

            {/* Execution tracker button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTasksOpen(!tasksOpen)}
              className={`rounded-xl border-white/20 text-white hover:bg-white/10 text-xs font-bold h-8 gap-1.5 hidden md:inline-flex ${
                tasksOpen ? "bg-white/20" : ""
              }`}
            >
              <ListTodo className="h-3.5 w-3.5 text-amber-300" />
              <span>Milestones</span>
              {tasks.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-primary text-[10px]">
                  {doneCount}/{tasks.length}
                </span>
              )}
            </Button>

            {/* BTV Live Voice Call Dialog */}
            <Button
              size="sm"
              onClick={() => setLiveOpen(true)}
              className="rounded-xl font-black text-xs bg-gradient-to-r from-primary via-indigo-600 to-amber-500 hover:opacity-90 shadow-md gap-1.5 h-8 px-3"
            >
              <Radio className="h-3.5 w-3.5 animate-pulse text-amber-200" />
              <span className="hidden sm:inline">Voice Call</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Live Voice Audio Modal */}
      <VixoraCoachLiveDialog
        open={liveOpen}
        onOpenChange={setLiveOpen}
        coachName="Coach Bethel Goodgift (Chief AI Strategist)"
        businessContext={selectedBiz || {}}
        systemPrompt={bizIntelligence?.formattedContextPrompt || ""}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Navigation Sidebar (Desktop collapsible & Mobile overlay) */}
        <div
          className={`${
            sidebarOpen ? "w-[280px] sm:w-[310px]" : "w-0 -translate-x-full"
          } transition-all duration-300 ease-in-out shrink-0 hidden lg:block overflow-hidden`}
        >
          <CoachNavigationSidebar
            conversations={conversations}
            activeId={activeId}
            onSelectConversation={selectConv}
            onNewConversation={newConv}
            onDeleteConversation={deleteConv}
            onRenameConversation={renameConv}
            onSelectStrategicTopic={(p) => send(p)}
            businessIntelligence={bizIntelligence}
            onSelectBusinessId={handleSelectBusinessId}
            onRefreshBusinessData={() => loadBusinessData()}
            className="h-[calc(100vh-53px)]"
          />
        </div>

        {/* Mobile Slide-over Drawer for Navigation Sidebar */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <div className="relative w-[300px] max-w-[85vw] h-full bg-background shadow-2xl z-50">
              <CoachNavigationSidebar
                conversations={conversations}
                activeId={activeId}
                onSelectConversation={selectConv}
                onNewConversation={newConv}
                onDeleteConversation={deleteConv}
                onRenameConversation={renameConv}
                onSelectStrategicTopic={(p) => {
                  setMobileDrawerOpen(false);
                  send(p);
                }}
                businessIntelligence={bizIntelligence}
                onSelectBusinessId={handleSelectBusinessId}
                onRefreshBusinessData={() => loadBusinessData()}
                className="h-full"
              />
            </div>
          </div>
        )}

        {/* Center: Executive Chat Stream */}
        <main className="flex-1 flex flex-col min-w-0 h-[calc(100vh-53px)] bg-muted/10 relative overflow-hidden">
          {/* Ground-Truth Intelligence Context Pill Bar */}
          <div className="px-4 py-2 bg-card/80 backdrop-blur-xs border-b border-border/60 flex items-center justify-between text-xs gap-3">
            <div className="flex items-center gap-2 truncate">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-extrabold text-[11px] text-foreground uppercase tracking-wider">
                  Ground-Truth Active:
                </span>
              </div>
              <span className="font-semibold text-primary truncate max-w-[200px] sm:max-w-md">
                {selectedBiz?.name || "Business Profile Connected"}
              </span>
              <span className="text-muted-foreground hidden sm:inline">•</span>
              <span className="text-muted-foreground hidden sm:inline text-[11px]">
                {bizIntelligence?.metrics.totalProducts || 0} products,{" "}
                {bizIntelligence?.metrics.totalServices || 0} services
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => loadBusinessData()}
                disabled={loadingBizData}
                className="h-6 text-[11px] px-2 rounded-lg text-muted-foreground hover:text-foreground font-semibold gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${loadingBizData ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Sync Data</span>
              </Button>
            </div>
          </div>

          {/* Messages Stream */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-5">
            {messages.length === 0 && (
              <div className="max-w-2xl mx-auto py-6 space-y-6">
                {/* Daily Sprint Card */}
                <VixoraAICoachToday onAskQuestion={(q) => send(q)} />

                {/* Executive Welcome Card */}
                <div className="p-6 rounded-3xl border border-border/80 bg-card shadow-md text-center space-y-4">
                  <div className="relative inline-block">
                    <img
                      src={coachAvatarImg}
                      alt="Coach Bethel"
                      className="h-20 w-20 rounded-3xl object-cover shadow-xl mx-auto ring-4 ring-primary/20"
                    />
                    <span className="absolute -bottom-1 -right-1 p-1 bg-primary text-white rounded-full">
                      <Sparkles className="h-4 w-4" />
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="text-lg sm:text-xl font-black text-foreground">
                      Executive Business Advisory Active
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                      I have analyzed your live business profile{" "}
                      <strong className="text-foreground">{selectedBiz?.name || "your business"}</strong>.
                      Ask me tactical questions on pricing, margin optimization, wholesale sourcing from
                      China &amp; Turkey, or WhatsApp closing funnels.
                    </p>
                  </div>

                  {/* Connected Ecosystem Summary */}
                  {selectedBiz && (
                    <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 text-left text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-foreground flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-primary" /> {selectedBiz.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {selectedBiz.category}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Location: {selectedBiz.city || selectedBiz.state || "Lagos, Nigeria"} • Listed Products:{" "}
                        {bizIntelligence?.metrics.totalProducts || 0} • Directory Views:{" "}
                        {selectedBiz.viewsCount || 0}
                      </p>
                    </div>
                  )}

                  {/* Quick Starter Prompts */}
                  <div className="pt-2 text-left space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      Recommended Strategic Sprints
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          send(
                            `Analyze my product prices for "${selectedBiz?.name || "my business"}" and tell me the optimal profit margin formula in Naira.`
                          )
                        }
                        className="p-3 rounded-2xl border border-border/70 hover:border-primary/60 hover:bg-primary/5 text-left text-xs font-semibold text-foreground transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-1 text-primary">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span className="font-black">Profit Margin Audit</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-normal line-clamp-2">
                          Audit product prices &amp; calculate exact target gross margin.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          send(
                            `Give me a 3-step high-converting WhatsApp script to sell my top products on status and direct broadcasts.`
                          )
                        }
                        className="p-3 rounded-2xl border border-border/70 hover:border-primary/60 hover:bg-primary/5 text-left text-xs font-semibold text-foreground transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-1 text-primary">
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span className="font-black">WhatsApp Sales Script</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-normal line-clamp-2">
                          Copy-paste closing broadcast for daily status updates.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          send(
                            `How can I directly import inventory for my category from China 1688 and Istanbul Turkey with low landed cargo fees?`
                          )
                        }
                        className="p-3 rounded-2xl border border-border/70 hover:border-primary/60 hover:bg-primary/5 text-left text-xs font-semibold text-foreground transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-1 text-primary">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span className="font-black">China &amp; Turkey Imports</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-normal line-clamp-2">
                          Factory-direct wholesale sourcing guide &amp; air cargo tips.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          send(
                            `Outline an executive 5-slide pitch deck proposal to attract investors or bank funding for my business.`
                          )
                        }
                        className="p-3 rounded-2xl border border-border/70 hover:border-primary/60 hover:bg-primary/5 text-left text-xs font-semibold text-foreground transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-1 text-primary">
                          <Briefcase className="h-3.5 w-3.5" />
                          <span className="font-black">Investor Pitch Deck</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-normal line-clamp-2">
                          Proposal narrative for grants, angels, and capital.
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} max-w-4xl mx-auto`}
              >
                <div
                  className={`max-w-[92%] sm:max-w-[85%] rounded-3xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground font-semibold rounded-tr-xs shadow-md shadow-primary/10"
                      : "bg-card border border-border/80 text-foreground rounded-tl-xs shadow-md space-y-3"
                  }`}
                >
                  {m.role === "assistant" && (
                    <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={coachAvatarImg}
                          alt="Coach Bethel"
                          className="h-6 w-6 rounded-xl object-cover shadow-xs"
                        />
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-xs text-foreground">
                            Coach Bethel Goodgift
                          </span>
                          {m.modelUsed && (
                            <code className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                              {m.modelUsed}
                            </code>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <ListenButton text={cleanText(m.content)} />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                          onClick={() => copyMessage(cleanText(m.content), i)}
                          title="Copy message"
                        >
                          {copiedIndex === i ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Formatted Content */}
                  <div className="whitespace-pre-wrap font-medium leading-relaxed">
                    {m.role === "assistant" ? cleanText(m.content) : m.content}
                  </div>

                  {/* Assistant Action Bar */}
                  {m.role === "assistant" && (
                    <div className="pt-2.5 flex items-center justify-between border-t border-border/60 text-xs flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] font-bold rounded-xl border-border/80 hover:bg-primary/10 hover:text-primary gap-1"
                          onClick={() => saveAsTask(m.content)}
                        >
                          <Plus className="h-3 w-3" /> Save to Execution Tracker
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] font-bold rounded-xl text-muted-foreground hover:text-foreground gap-1"
                          onClick={() => send(`Deepen this analysis with step-by-step numbers and risk mitigation.`, "gemini-3.1-pro-preview")}
                          title="Query Gemini Pro for deep mathematical reasoning"
                        >
                          <Brain className="h-3 w-3 text-amber-500" /> Deep Think (Pro)
                        </Button>
                      </div>

                      {m.timestamp && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Active Thinking Loader */}
            {sending && (
              <div className="flex justify-start max-w-4xl mx-auto">
                <div className="bg-card border border-border/80 rounded-3xl rounded-tl-xs p-4 shadow-sm flex items-center gap-3">
                  <img
                    src={coachAvatarImg}
                    alt="Coach"
                    className="h-6 w-6 rounded-xl object-cover animate-pulse"
                  />
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span>Coach Bethel is analyzing your business data with {selectedModel}...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Chat Input Bar */}
          <div className="p-3 sm:p-4 bg-card/90 backdrop-blur-md border-t border-border/70">
            <div className="max-w-4xl mx-auto space-y-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="relative rounded-2xl border border-border/80 bg-background shadow-md focus-within:border-primary/80 focus-within:ring-2 focus-within:ring-primary/20 transition-all p-2 flex flex-col gap-2"
              >
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={`Ask Coach Bethel anything about pricing, sales scripts, wholesale imports, or operations...`}
                  rows={2}
                  className="w-full resize-none border-0 shadow-none focus-visible:ring-0 p-1.5 text-xs sm:text-sm font-medium bg-transparent"
                />

                <div className="flex items-center justify-between border-t border-border/50 pt-2 px-1">
                  <div className="flex items-center gap-2">
                    {/* Model Selector Trigger Pill */}
                    <GeminiModelSelectorPill
                      currentModelId={selectedModel}
                      onModelChange={handleModelChange}
                      variant="compact"
                    />

                    {/* Live Voice Input Button */}
                    <LiveVoiceButton
                      onSpeechResult={(txt) => setInput((p) => (p ? `${p} ${txt}` : txt))}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
                      Press ↵ Enter to send
                    </span>
                    <Button
                      type="submit"
                      disabled={!input.trim() || sending}
                      size="sm"
                      className="h-8 px-3.5 rounded-xl font-black text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/20 gap-1.5"
                    >
                      {sending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      <span>Advise</span>
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </main>

        {/* Right: Strategic Execution Tracker Sidebar */}
        <aside
          className={`${
            tasksOpen ? "w-[300px] sm:w-[330px]" : "w-0 -translate-x-full lg:translate-x-0 lg:w-0"
          } transition-all duration-300 ease-in-out shrink-0 bg-card border-l border-border/80 overflow-hidden flex flex-col h-[calc(100vh-53px)]`}
        >
          {tasksOpen && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-3.5 border-b border-border/70 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-amber-500" />
                  <span className="font-black text-xs uppercase tracking-wider text-foreground">
                    Execution Milestones
                  </span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setTasksOpen(false)}
                  className="h-7 w-7 rounded-lg"
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Progress Summary */}
              <div className="p-3.5 border-b border-border/60 bg-muted/10 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-muted-foreground">Sprint Completion</span>
                  <span className="text-primary font-mono">{taskProgress}%</span>
                </div>
                <Progress value={taskProgress} className="h-2 rounded-full" />

                {/* Filter Pills */}
                <div className="grid grid-cols-4 gap-1 pt-1 text-[10px] font-bold">
                  {(["all", "todo", "in_progress", "done"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setTaskFilter(f)}
                      className={`py-1 rounded-lg capitalize transition-all text-center ${
                        taskFilter === f
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f === "in_progress" ? "Active" : f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tasks List */}
              <div className="p-2 flex-1 overflow-y-auto space-y-2">
                {filteredTasks.map((t) => {
                  const isDone = t.status === "done";
                  return (
                    <div
                      key={t.id}
                      className={`p-3 rounded-2xl border transition-all text-xs space-y-2 ${
                        isDone
                          ? "border-emerald-500/30 bg-emerald-500/5 opacity-70"
                          : "border-border/80 bg-background shadow-xs hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`font-extrabold flex-1 leading-snug ${
                            isDone ? "line-through text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {t.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteTask(t.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      {t.notes && t.notes !== t.title && (
                        <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed">
                          {cleanText(t.notes)}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10px]">
                        <select
                          value={t.status}
                          onChange={(e) => updateTaskStatus(t.id, e.target.value)}
                          className="font-bold bg-muted border border-border/60 rounded-lg px-2 py-0.5"
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="done">Completed</option>
                        </select>

                        {isDone && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="h-3 w-3" /> Done
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredTasks.length === 0 && (
                  <div className="text-center py-12 px-3 text-muted-foreground space-y-1">
                    <ListTodo className="h-6 w-6 mx-auto opacity-30 text-amber-500" />
                    <p className="text-xs font-bold">No milestones yet</p>
                    <p className="text-[11px]">
                      Click "Save to Execution Tracker" on any coach advice to populate tasks!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
