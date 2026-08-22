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
import { ArrowLeft, Send, Sparkles, Briefcase, Plus, Check, Loader2, Trash2, Radio } from "lucide-react";
import { toast } from "sonner";
import ListenButton from "@/components/ListenButton";
import LiveVoiceButton from "@/components/coach/LiveVoiceButton";
import GeminiLiveDialog from "@/components/coach/GeminiLiveDialog";

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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    loadConvs();
    loadTasks();
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

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

  async function send() {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput("");
    setSending(true);
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    try {
      const { data, error } = await supabase.functions.invoke("business-coach", {
        body: { conversationId: activeId, message: userMsg, businessContext: ctx },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      if (!activeId) { setActiveId(data.conversationId); loadConvs(); }
    } catch (e: any) {
      toast.error(e.message || "Failed");
      setMessages((m) => m.slice(0, -1));
    } finally { setSending(false); }
  }

  async function saveAsTask(content: string) {
    const title = content.split("\n").find((l) => l.trim())?.replace(/^[#*\-\d.\s]+/, "").slice(0, 120) || "New task";
    await supabase.from("coach_tasks").insert({ user_id: user!.id, conversation_id: activeId, title, notes: content });
    toast.success("Saved as execution task");
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-12">
      <Helmet><title>AI Business Coach | Bethelincovibe TV</title></Helmet>
      <div className="container mx-auto max-w-6xl px-4 py-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
          <h1 className="text-xl font-bold flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" />AI Business Coach</h1>
          <Button size="sm" className="ml-auto bg-gradient-to-r from-primary to-accent" onClick={() => setLiveOpen(true)}>
            <Radio className="h-4 w-4 mr-1 animate-pulse" />Go Live
          </Button>
        </div>

        <GeminiLiveDialog
          open={liveOpen}
          onOpenChange={setLiveOpen}
          systemPrompt={`You are a warm, practical AI business coach for Lagos entrepreneurs. ${ctx.business_name ? `The user runs "${ctx.business_name}"${ctx.industry ? ` in ${ctx.industry}` : ""}.` : ""} ${ctx.goal ? `Their current goal: ${ctx.goal}.` : ""} Be concise, conversational, and Naira-aware.`}
        />

        <div className="grid lg:grid-cols-[260px_1fr_280px] gap-4">
          {/* Conversations */}
          <Card className="lg:max-h-[80vh] overflow-y-auto">
            <CardHeader className="pb-2 flex-row items-center justify-between"><CardTitle className="text-sm">Sessions</CardTitle><Button size="sm" variant="ghost" onClick={newConv}><Plus className="h-3 w-3" /></Button></CardHeader>
            <CardContent className="space-y-1 p-2">
              {conversations.map((c) => (
                <button key={c.id} onClick={() => selectConv(c.id)} className={`w-full text-left p-2 rounded text-sm truncate ${activeId === c.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{c.title}</button>
              ))}
              {conversations.length === 0 && <p className="text-xs text-muted-foreground p-2">No sessions yet</p>}
            </CardContent>
          </Card>

          {/* Chat */}
          <Card className="flex flex-col h-[75vh]">
            {showSetup && (
              <CardContent className="p-4 border-b space-y-2 bg-muted/30">
                <p className="text-xs font-semibold flex items-center gap-1"><Sparkles className="h-3 w-3" />Tell the coach about your business (optional)</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Business name" value={ctx.business_name} onChange={(e) => setCtx({ ...ctx, business_name: e.target.value })} className="h-8 text-xs" />
                  <Input placeholder="Industry" value={ctx.industry} onChange={(e) => setCtx({ ...ctx, industry: e.target.value })} className="h-8 text-xs" />
                </div>
                <Textarea placeholder="Your top goal right now..." value={ctx.goal} onChange={(e) => setCtx({ ...ctx, goal: e.target.value })} rows={2} className="text-xs" />
                <Button size="sm" variant="ghost" onClick={() => setShowSetup(false)}>Done</Button>
              </CardContent>
            )}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p>Ask your coach anything — pricing, marketing, scaling, hiring, finances...</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {m.role === "assistant" ? cleanText(m.content) : m.content}
                    {m.role === "assistant" && (
                      <div className="flex items-center gap-3 mt-1">
                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => saveAsTask(cleanText(m.content))}>
                          <Plus className="h-3 w-3 mr-1" />Save as task
                        </Button>
                        <ListenButton text={cleanText(m.content)} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sending && <div className="flex justify-start"><div className="bg-muted rounded-2xl px-4 py-2 text-sm"><Loader2 className="h-4 w-4 animate-spin inline" /> thinking...</div></div>}
            </div>
            <div className="border-t p-3 flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask your coach..." disabled={sending} />
              <LiveVoiceButton
                conversationId={activeId}
                businessContext={ctx}
                onUserText={(t) => setMessages((m) => [...m, { role: "user", content: t }])}
                onAssistantText={(t, cid) => { setMessages((m) => [...m, { role: "assistant", content: t }]); if (cid && !activeId) { setActiveId(cid); loadConvs(); } }}
              />
              <Button onClick={send} disabled={sending || !input.trim()}><Send className="h-4 w-4" /></Button>
            </div>
          </Card>

          {/* Tasks */}
          <Card className="lg:max-h-[80vh] overflow-y-auto">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Execution Tracker</CardTitle></CardHeader>
            <CardContent className="space-y-2 p-2">
              {tasks.length === 0 && <p className="text-xs text-muted-foreground p-2">Save coach advice as tasks to track progress.</p>}
              {tasks.map((t) => (
                <div key={t.id} className="border rounded p-2 space-y-1">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-xs font-medium flex-1 line-clamp-2">{t.title}</p>
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => deleteTask(t.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {(["todo", "in_progress", "done"] as const).map((s) => (
                      <button key={s} onClick={() => updateTask(t.id, { status: s, progress: s === "done" ? 100 : s === "in_progress" ? 50 : 0 })}
                        className={`text-[10px] px-2 py-0.5 rounded ${t.status === s ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{s}</button>
                    ))}
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
