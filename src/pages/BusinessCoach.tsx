import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
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
  ArrowLeft, Send, Sparkles, Briefcase, Plus, Check, Loader2, Trash2, Radio, Copy, CheckCircle2,
  TrendingUp, DollarSign, Lightbulb, Target, Settings2, Bot, MessageSquare, ListTodo, Volume2
} from "lucide-react";
import { toast } from "sonner";
import { GoogleGenAI } from "@google/genai";
import { getGeminiClient } from "@/lib/aiCollaborationEngine";
import ListenButton from "@/components/ListenButton";
import LiveVoiceButton from "@/components/coach/LiveVoiceButton";
import VixoraCoachLiveDialog from "@/components/coach/VixoraCoachLiveDialog";
import VixoraAICoachToday from "@/components/coach/VixoraAICoachToday";

import coachAvatarImg from "@/assets/images/ai_business_coach_1787551806148.jpg";
import { copyToClipboard } from "@/lib/clipboard";

/** Remove markdown asterisks/underscores/heading markers so chat reads cleanly. */
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

type Msg = { id?: string; role: "user" | "assistant"; content: string };

const QUICK_PROMPTS = [
  { icon: DollarSign, label: "Calculate product markup & profit margin" },
  { icon: Target, label: "Write a 30-second elevator pitch for my business" },
  { icon: TrendingUp, label: "5 ways to increase my monthly revenue in Naira" },
  { icon: Lightbulb, label: "Generate 5 high-converting Instagram & WhatsApp post ideas" },
  { icon: Briefcase, label: "Draft a professional business proposal template" }
];

export default function BusinessCoach() {
  const { user, loading } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [showSetup, setShowSetup] = useState(false);
  const [ctx, setCtx] = useState({ business_name: "", industry: "", stage: "starting", goal: "" });
  const [liveOpen, setLiveOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [taskFilter, setTaskFilter] = useState<"all" | "todo" | "in_progress" | "done">("all");
  const [interimText, setInterimText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    loadConvs();
    loadTasks();
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, interimText]);

  async function loadConvs() {
    const { data } = await supabase.from("coach_conversations").select("*").order("updated_at", { ascending: false });
    setConversations(data || []);
    if (data && data.length > 0 && !activeId) selectConv(data[0].id);
    else if (!data || data.length === 0) setShowSetup(true);
  }
  async function loadTasks() {
    const { data } = await supabase.from("coach_tasks").select("*").order("created_at", { ascending: false });
    setTasks(data || []);
  }
  async function selectConv(id: string) {
    setActiveId(id);
    const { data } = await supabase.from("coach_messages").select("*").eq("conversation_id", id).order("created_at");
    setMessages((data || []).map((m: any) => ({ id: m.id, role: m.role, content: m.content })));
    const conv = conversations.find((c) => c.id === id);
    if (conv?.business_context) setCtx({ ...ctx, ...conv.business_context });
  }
  async function newConv() {
    setActiveId(null);
    setMessages([]);
    setShowSetup(true);
  }

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  async function send(textToSend?: string) {
    const query = (textToSend || input).trim();
    if (!query || sending) return;
    if (!textToSend) setInput("");
    setSending(true);
    setMessages((m) => [...m, { role: "user", content: query }]);

    try {
      // 1. Try Supabase Edge Function
      const { data, error } = await supabase.functions.invoke("business-coach", {
        body: { conversationId: activeId, message: query, businessContext: ctx },
      });

      if (!error && data?.reply) {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
        if (!activeId && data.conversationId) {
          setActiveId(data.conversationId);
          loadConvs();
        }
        return;
      }
    } catch (e) {
      console.warn("Supabase business-coach edge function notice, using direct AI engine:", e);
    }

    // 2. Direct Gemini AI Fallback Engine with Multi-Key Pool Failover
    try {
      const ai = await getGeminiClient("coach_ai");
      if (!ai) {
        throw new Error("Coach AI service is currently unavailable or disabled by admin switch.");
      }

      const systemInstruction = `You are Coach Bethel Goodgift, the Chief AI Business Strategist at BTV & Bethelincovibe.
You provide tactical, high-converting business advice, pricing models, marketing strategies, Nigerian & Global market insights, and step-by-step action plans.
Business Name: ${ctx.business_name || "Enterprise"}
Industry: ${ctx.industry || "General Commerce"}
Stage: ${ctx.stage || "Growth"}
Monthly Revenue: ${ctx.monthly_revenue || "N/A"}
Goals: ${ctx.goals || "Scale Revenue & Customer Acquisition"}
Tone: Authoritative, motivating, practical, and clear.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: `${systemInstruction}\n\nUser Question: ${query}` }] },
        ],
      });

      const replyText = response.text?.trim() || "Let's structure your strategy for maximum growth and market impact.";
      setMessages((m) => [...m, { role: "assistant", content: replyText }]);

      // Persist locally or in DB if possible
      if (user && activeId) {
        await supabase.from("coach_messages").insert([
          { conversation_id: activeId, role: "user", content: query },
          { conversation_id: activeId, role: "assistant", content: replyText },
        ]).catch(() => {});
      }
    } catch (err: any) {
      console.error("Direct AI error:", err);
      toast.error("Could not reach AI coach. Please try again.");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setSending(false);
    }
  }

  async function saveAsTask(content: string) {
    const title = content.split("\n").find((l) => l.trim())?.replace(/^[#*\-\d.\s]+/, "").slice(0, 120) || "New task";
    await supabase.from("coach_tasks").insert({ user_id: user!.id, conversation_id: activeId, title, notes: content });
    toast.success("Saved to execution tracker!");
    loadTasks();
  }
  async function updateTask(id: string, patch: any) {
    await supabase.from("coach_tasks").update(patch).eq("id", id);
    loadTasks();
  }
  async function deleteTask(id: string) {
    await supabase.from("coach_tasks").delete().eq("id", id);
    loadTasks();
  }

  const copyMessage = async (text: string, idx: number) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedIndex(idx);
      toast.success("Message copied to clipboard!");
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const taskProgress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;
  const filteredTasks = tasks.filter((t) => taskFilter === "all" ? true : t.status === taskFilter);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-12">
      <Helmet><title>AI Business Coach | Bethelincovibe TV</title></Helmet>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white border-b border-border/40 shadow-xl px-4 py-5 mb-6">
        <div className="container mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10 rounded-xl">
              <Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
            </Button>
            <div className="relative shrink-0">
              <img src={coachAvatarImg} alt="AI Business Coach" className="h-14 w-14 rounded-2xl object-cover ring-2 ring-primary/40 shadow-lg" />
              <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  Coach Bethel Goodgift
                </h1>
                <Badge className="bg-gradient-to-r from-primary to-accent text-white border-0 font-extrabold text-[10px] shadow-xs">
                  BTV AI LIVE
                </Badge>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                <span>Personalized strategy, growth hacks & finance advisor</span>
                {ctx.business_name && (
                  <span className="hidden md:inline-block px-2 py-0.5 rounded-md bg-white/10 text-white font-semibold text-[10px]">
                    {ctx.business_name}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => setShowSetup(!showSetup)} className="rounded-xl border-white/20 text-white hover:bg-white/10 text-xs font-bold">
              <Settings2 className="h-3.5 w-3.5 mr-1" /> Context
            </Button>
            <Button
              size="sm"
              className="rounded-xl font-extrabold text-xs bg-gradient-to-r from-primary via-accent to-amber-500 hover:opacity-90 shadow-md shadow-primary/25 gap-1.5"
              onClick={() => setLiveOpen(true)}
            >
              <Radio className="h-4 w-4 animate-pulse text-amber-200" /> BTV Live Call
            </Button>
          </div>
        </div>
      </div>

      <VixoraCoachLiveDialog
        open={liveOpen}
        onOpenChange={setLiveOpen}
        coachName="Coach Bethel Goodgift (Chief AI Strategist)"
        businessContext={ctx}
        systemPrompt={`You are Coach Bethel Goodgift, the Executive AI Business Strategist at BTV for entrepreneurs and SME owners. ${ctx.business_name ? `The user runs "${ctx.business_name}"${ctx.industry ? ` in ${ctx.industry}` : ""}.` : ""} ${ctx.goal ? `Their current goal: ${ctx.goal}.` : ""} Be concise, conversational, motivating, and conversion-focused.`}
      />

      <div className="container mx-auto max-w-7xl px-4 space-y-4">
        {/* Today's AI Business Coach Strategic Insight & Action Sprint */}
        <VixoraAICoachToday onAskQuestion={(q) => send(q)} />

        {/* Context Setup Drawer / Banner */}
        {showSetup && (
          <Card className="border-primary/30 bg-primary/5 shadow-md rounded-2xl p-4 transition-all">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" /> Personalize Your Business Context
              </p>
              <Button size="sm" variant="ghost" onClick={() => setShowSetup(false)} className="h-7 text-xs">Close</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px] font-bold">Business Name</Label>
                <Input placeholder="e.g. Lagos Luxury Fashion" value={ctx.business_name} onChange={(e) => setCtx({ ...ctx, business_name: e.target.value })} className="h-9 text-xs rounded-xl bg-background" />
              </div>
              <div>
                <Label className="text-[11px] font-bold">Industry / Category</Label>
                <Input placeholder="e.g. E-Commerce, Retail, Tech" value={ctx.industry} onChange={(e) => setCtx({ ...ctx, industry: e.target.value })} className="h-9 text-xs rounded-xl bg-background" />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <Label className="text-[11px] font-bold">Primary Growth Goal</Label>
                <Input placeholder="e.g. Hit ₦1,000,000 monthly profit" value={ctx.goal} onChange={(e) => setCtx({ ...ctx, goal: e.target.value })} className="h-9 text-xs rounded-xl bg-background" />
              </div>
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-[280px_1fr_300px] gap-4">
          {/* Sessions Drawer */}
          <Card className="border-border/80 shadow-sm rounded-3xl overflow-hidden flex flex-col max-h-[75vh]">
            <CardHeader className="pb-2 pt-4 px-4 flex-row items-center justify-between border-b bg-muted/20">
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-primary" /> Strategy Sessions
              </CardTitle>
              <Button size="icon" variant="ghost" onClick={newConv} className="h-7 w-7 rounded-xl hover:bg-primary/10 hover:text-primary">
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-1 p-2 overflow-y-auto flex-1">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectConv(c.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between gap-2 ${
                    activeId === c.id ? "bg-primary text-primary-foreground font-bold shadow-xs" : "hover:bg-muted/60 text-foreground"
                  }`}
                >
                  <span className="truncate">{c.title || "Untitled Session"}</span>
                  <span className="text-[10px] opacity-70 shrink-0">
                    {new Date(c.updated_at).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
                  </span>
                </button>
              ))}
              {conversations.length === 0 && (
                <div className="text-center py-8 px-2 text-muted-foreground space-y-1">
                  <Bot className="h-6 w-6 mx-auto opacity-40 text-primary" />
                  <p className="text-xs font-semibold">No sessions yet</p>
                  <p className="text-[11px]">Start a conversation below!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Main Chat Interface */}
          <Card className="border-border/80 shadow-md rounded-3xl overflow-hidden flex flex-col h-[75vh] bg-card">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8 px-4 space-y-5 max-w-md mx-auto">
                  <div className="relative inline-block">
                    <img src={coachAvatarImg} alt="" className="h-20 w-20 rounded-3xl object-cover shadow-2xl mx-auto ring-4 ring-primary/20" />
                    <span className="absolute -bottom-1 -right-1 p-1 bg-primary text-white rounded-full">
                      <Sparkles className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-foreground">Welcome to your AI Business Coach</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Ask strategic questions on pricing, sales pitches, WhatsApp marketing, supplier negotiations, or scaling revenue.
                    </p>
                  </div>

                  {/* Quick Prompts */}
                  <div className="space-y-2 pt-2 text-left">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">Suggested Topics</p>
                    <div className="space-y-1.5">
                      {QUICK_PROMPTS.map((qp, i) => {
                        const Icon = qp.icon;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => send(qp.label)}
                            className="w-full text-left p-2.5 rounded-2xl border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-2.5 text-xs font-semibold text-foreground group"
                          >
                            <div className="p-1.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <span className="truncate flex-1">{qp.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] sm:max-w-[80%] rounded-3xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed font-medium ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground font-semibold rounded-tr-xs shadow-sm"
                      : "bg-muted/50 border border-border/80 text-foreground rounded-tl-xs space-y-3 shadow-xs"
                  }`}>
                    {m.role === "assistant" && (
                      <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2">
                        <div className="flex items-center gap-2">
                          <img src={coachAvatarImg} alt="" className="h-5 w-5 rounded-lg object-cover" />
                          <span className="font-black text-xs text-primary">Strategic Advisory</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ListenButton text={cleanText(m.content)} />
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => copyMessage(cleanText(m.content), i)}>
                            {copiedIndex === i ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="whitespace-pre-wrap font-medium leading-relaxed">{m.role === "assistant" ? cleanText(m.content) : m.content}</div>

                    {m.role === "assistant" && (
                      <div className="pt-2 flex items-center gap-2 border-t border-border/50">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="rounded-xl h-8 text-xs font-black px-3 bg-primary/10 hover:bg-primary/20 text-primary border-0"
                          onClick={() => saveAsTask(cleanText(m.content))}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add Action Item to Tracker
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {interimText && (
                <div className="flex justify-end animate-pulse">
                  <div className="max-w-[88%] sm:max-w-[80%] rounded-3xl p-4 text-xs bg-primary/90 text-primary-foreground font-medium rounded-tr-xs shadow-md border border-primary-foreground/20 flex items-start gap-2.5">
                    <Radio className="h-4 w-4 text-amber-300 animate-pulse shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider opacity-80 mb-0.5">Listening to your voice…</div>
                      <div className="italic font-normal">{interimText}</div>
                    </div>
                  </div>
                </div>
              )}

              {sending && (
                <div className="flex justify-start">
                  <div className="bg-muted/40 border border-border/60 rounded-3xl rounded-tl-xs px-4 py-3 text-xs flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="font-semibold">Analyzing market metrics & crafting strategy...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <div className="border-t p-3 bg-card flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Ask your coach anything about marketing, sales or business..."
                disabled={sending}
                className="rounded-2xl text-xs h-11 bg-muted/30 focus-visible:ring-primary"
              />
              <LiveVoiceButton
                conversationId={activeId}
                businessContext={ctx}
                onInterimText={(t) => setInterimText(t)}
                onUserText={(t) => {
                  setInterimText("");
                  setMessages((m) => [...m, { role: "user", content: t }]);
                }}
                onAssistantText={(t, cid) => {
                  setMessages((m) => [...m, { role: "assistant", content: t }]);
                  if (cid && !activeId) {
                    setActiveId(cid);
                    loadConvs();
                  }
                }}
              />
              <Button onClick={() => send()} disabled={sending || !input.trim()} className="rounded-2xl h-11 px-4 font-bold shadow-md shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          {/* Execution Tracker Sidebar */}
          <Card className="border-border/80 shadow-sm rounded-3xl overflow-hidden flex flex-col max-h-[75vh]">
            <CardHeader className="pb-3 pt-4 px-4 border-b bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ListTodo className="h-3.5 w-3.5 text-primary" /> Execution Tracker
                </CardTitle>
                <Badge variant="secondary" className="font-extrabold text-[10px] rounded-lg">
                  {doneCount}/{tasks.length} Done
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                  <span>Goal Progress</span>
                  <span>{taskProgress}%</span>
                </div>
                <Progress value={taskProgress} className="h-1.5 rounded-full" />
              </div>

              {/* Status Filter Tabs */}
              <div className="grid grid-cols-4 gap-1 pt-1">
                {(["all", "todo", "in_progress", "done"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setTaskFilter(st)}
                    className={`text-[9px] font-extrabold py-1 rounded-lg capitalize transition-all ${
                      taskFilter === st ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {st === "in_progress" ? "doing" : st}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="space-y-2 p-3 overflow-y-auto flex-1">
              {filteredTasks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground space-y-1">
                  <ListTodo className="h-6 w-6 mx-auto opacity-30 text-primary" />
                  <p className="text-xs font-bold">No tasks in this list</p>
                  <p className="text-[11px]">Save action advice from the AI Coach above!</p>
                </div>
              )}

              {filteredTasks.map((t) => (
                <div key={t.id} className="border border-border/60 rounded-2xl p-2.5 space-y-2 bg-card hover:border-primary/40 transition-colors shadow-2xs">
                  <div className="flex items-start justify-between gap-1.5">
                    <p className={`text-xs font-bold leading-tight flex-1 ${t.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {t.title}
                    </p>
                    <Button size="icon" variant="ghost" className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0" onClick={() => deleteTask(t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/30">
                    <div className="flex items-center gap-1">
                      {(["todo", "in_progress", "done"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => updateTask(t.id, { status: s, progress: s === "done" ? 100 : s === "in_progress" ? 50 : 0 })}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-lg capitalize transition-all ${
                            t.status === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {s === "in_progress" ? "doing" : s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

