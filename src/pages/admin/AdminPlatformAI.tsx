import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, Send, Bot } from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Give me a health check and my top 5 priorities",
  "What content should I publish this week?",
  "How do I grow the business directory faster?",
  "Where am I losing revenue right now?",
];

export default function AdminPlatformAI() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => { inputRef.current?.focus(); }, [busy]);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    const history = messages;
    setMessages([...history, { role: "user", content: question }]);
    setInput("");
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("platform-admin", {
      body: { question, history },
    });
    setBusy(false);
    if (error) { toast.error("The administrator is unavailable right now."); return; }
    if ((data as any)?.error) { toast.error((data as any).message || "Unavailable"); return; }
    setMessages((m) => [...m, { role: "assistant", content: (data as any).answer || "" }]);
  };

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <div className="mb-3 flex items-center gap-3">
        <span className="icon-3d h-11 w-11"><Bot className="h-5 w-5" /></span>
        <div>
          <h1 className="text-lg font-bold leading-tight md:text-2xl">AI General Administrator</h1>
          <p className="text-xs text-muted-foreground">Live platform intelligence and next-step advice</p>
        </div>
      </div>

      <Card className="flex-1 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="space-y-3 py-6 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">Ask anything about your platform — it reads live stats before answering.</p>
            <div className="mx-auto grid max-w-md gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} className="tap rounded-xl border px-3 py-2 text-left text-sm hover:bg-muted">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === "user" ? "bg-gradient-primary text-primary-foreground" : "bg-muted"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading platform data…
            </div>
          )}
          <div ref={endRef} />
        </div>
      </Card>

      <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="mt-3 flex gap-2">
        <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask your administrator…" className="h-11" />
        <Button type="submit" disabled={busy} className="h-11 w-11 shrink-0 p-0">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
