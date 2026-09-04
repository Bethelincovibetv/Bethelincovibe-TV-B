import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  Sparkles,
  RefreshCw,
  Building2,
  CheckCircle2,
  Star,
  MapPin,
  ExternalLink,
  Briefcase,
  Clock,
  Phone,
  MessageCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

const naira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0,
  );

function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card className="card-premium my-6 overflow-hidden p-0">
      <div className="bg-gradient-primary px-4 py-3 text-primary-foreground">
        <p className="text-sm font-bold leading-tight">{title}</p>
        {subtitle && <p className="text-xs opacity-90">{subtitle}</p>}
      </div>
      <div className="space-y-3 p-4 not-prose">{children}</div>
    </Card>
  );
}

function Field({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      <div className="flex items-center gap-2">
        <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className="h-10" />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

/* ------------------------------- ROI ------------------------------- */
function RoiCalculator({ title }: { title: string }) {
  const [cost, setCost] = useState("100000");
  const [revenue, setRevenue] = useState("160000");
  const c = parseFloat(cost) || 0;
  const r = parseFloat(revenue) || 0;
  const profit = r - c;
  const roi = c > 0 ? (profit / c) * 100 : 0;
  return (
    <Shell title={title} subtitle="See if the numbers actually work before you spend">
      <Field label="Total investment / cost" value={cost} onChange={setCost} suffix="₦" />
      <Field label="Expected revenue" value={revenue} onChange={setRevenue} suffix="₦" />
      <div className="rounded-xl bg-secondary p-3">
        <p className="text-sm">Profit: <strong>{naira(profit)}</strong></p>
        <p className="text-sm">Return on investment: <strong className={roi >= 0 ? "text-success" : "text-destructive"}>{roi.toFixed(1)}%</strong></p>
      </div>
    </Shell>
  );
}

/* ------------------------------- Loan ------------------------------ */
function LoanCalculator({ title }: { title: string }) {
  const [amount, setAmount] = useState("500000");
  const [rate, setRate] = useState("24");
  const [months, setMonths] = useState("12");
  const p = parseFloat(amount) || 0;
  const annual = parseFloat(rate) || 0;
  const n = parseInt(months) || 1;
  const i = annual / 100 / 12;
  const monthly = i > 0 ? (p * i) / (1 - Math.pow(1 + i, -n)) : p / n;
  const total = monthly * n;
  return (
    <Shell title={title} subtitle="Monthly repayment and true cost of borrowing">
      <Field label="Loan amount" value={amount} onChange={setAmount} suffix="₦" />
      <Field label="Annual interest rate" value={rate} onChange={setRate} suffix="%" />
      <Field label="Tenure" value={months} onChange={setMonths} suffix="months" />
      <div className="rounded-xl bg-secondary p-3 text-sm">
        <p>Monthly repayment: <strong>{naira(monthly)}</strong></p>
        <p>Total repaid: <strong>{naira(total)}</strong></p>
        <p>Total interest: <strong>{naira(total - p)}</strong></p>
      </div>
    </Shell>
  );
}

/* ------------------------- Currency converter ---------------------- */
const CURRENCIES = ["NGN", "USD", "GBP", "EUR", "GHS", "ZAR", "CAD", "CNY"];
function CurrencyConverter({ title }: { title: string }) {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("NGN");
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (base: string) => {
    setLoading(true);
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      const json = await res.json();
      setRates(json?.rates || null);
    } catch {
      setRates(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(from); }, [from]);

  const rate = rates?.[to];
  const converted = rate ? (parseFloat(amount) || 0) * rate : null;
  return (
    <Shell title={title} subtitle="Live mid-market rates">
      <Field label="Amount" value={amount} onChange={setAmount} />
      <div className="grid grid-cols-2 gap-3">
        {[["From", from, setFrom], ["To", to, setTo]].map(([label, val, set]: any) => (
          <div key={label} className="space-y-1.5">
            <Label className="text-xs font-semibold">{label}</Label>
            <select value={val} onChange={(e) => set(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-xl bg-secondary p-3 text-sm">
        <span>{loading ? "Fetching rates…" : converted !== null ? <strong>{converted.toLocaleString(undefined, { maximumFractionDigits: 2 })} {to}</strong> : "Rate unavailable"}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => load(from)} aria-label="Refresh rates"><RefreshCw className="h-4 w-4" /></Button>
      </div>
    </Shell>
  );
}

/* ---------------------- Break-even / startup cost ------------------ */
function BreakEvenCalculator({ title }: { title: string }) {
  const [fixed, setFixed] = useState("200000");
  const [price, setPrice] = useState("5000");
  const [unitCost, setUnitCost] = useState("3000");
  const f = parseFloat(fixed) || 0;
  const p = parseFloat(price) || 0;
  const u = parseFloat(unitCost) || 0;
  const margin = p - u;
  const units = margin > 0 ? Math.ceil(f / margin) : null;
  return (
    <Shell title={title} subtitle="How many sales before you start making profit">
      <Field label="Monthly fixed costs (rent, staff, data)" value={fixed} onChange={setFixed} suffix="₦" />
      <Field label="Selling price per unit" value={price} onChange={setPrice} suffix="₦" />
      <Field label="Cost per unit" value={unitCost} onChange={setUnitCost} suffix="₦" />
      <div className="rounded-xl bg-secondary p-3 text-sm">
        <p>Margin per unit: <strong>{naira(margin)}</strong></p>
        <p>Break-even: <strong>{units !== null ? `${units.toLocaleString()} units/month` : "Not possible — price is below cost"}</strong></p>
      </div>
    </Shell>
  );
}

/* ------------------------------- Poll ------------------------------ */
function Poll({ title, options, storageKey }: { title: string; options: string[]; storageKey: string }) {
  const [votes, setVotes] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem(`${storageKey}:v`) || "null") || options.map(() => 0); }
    catch { return options.map(() => 0); }
  });
  const [choice, setChoice] = useState<number | null>(() => {
    const s = localStorage.getItem(`${storageKey}:c`);
    return s === null ? null : Number(s);
  });
  const total = votes.reduce((a, b) => a + b, 0) || 1;

  const vote = (i: number) => {
    if (choice !== null) return;
    const next = votes.map((v, idx) => (idx === i ? v + 1 : v));
    setVotes(next); setChoice(i);
    localStorage.setItem(`${storageKey}:v`, JSON.stringify(next));
    localStorage.setItem(`${storageKey}:c`, String(i));
  };

  return (
    <Shell title={title} subtitle="Tap to vote">
      {options.map((o, i) => (
        <button key={o} onClick={() => vote(i)} disabled={choice !== null} className="tap w-full text-left">
          <div className={`relative overflow-hidden rounded-xl border p-3 text-sm ${choice === i ? "border-primary" : ""}`}>
            <div className="absolute inset-y-0 left-0 bg-primary/15 transition-all duration-500" style={{ width: choice !== null ? `${(votes[i] / total) * 100}%` : "0%" }} />
            <div className="relative flex justify-between font-medium">
              <span>{o}</span>
              {choice !== null && <span>{Math.round((votes[i] / total) * 100)}%</span>}
            </div>
          </div>
        </button>
      ))}
    </Shell>
  );
}

/* ------------------------------- Quiz ------------------------------ */
type QuizQ = { q: string; options: string[]; answer: number };
function Quiz({ title, questions }: { title: string; questions: QuizQ[] }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [done, setDone] = useState(false);
  const score = questions.reduce((s, q, i) => (picked[i] === q.answer ? s + 1 : s), 0);
  return (
    <Shell title={title} subtitle={`${questions.length} quick questions`}>
      {questions.map((q, qi) => (
        <div key={qi} className="space-y-2">
          <p className="text-sm font-semibold">{qi + 1}. {q.q}</p>
          <div className="grid gap-1.5">
            {q.options.map((o, oi) => {
              const isPicked = picked[qi] === oi;
              const correct = done && oi === q.answer;
              const wrong = done && isPicked && oi !== q.answer;
              return (
                <button key={oi} onClick={() => !done && setPicked({ ...picked, [qi]: oi })}
                  className={`tap rounded-xl border px-3 py-2 text-left text-sm ${correct ? "border-success bg-success/10" : wrong ? "border-destructive bg-destructive/10" : isPicked ? "border-primary bg-primary/5" : ""}`}>
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {!done ? (
        <Button className="w-full" onClick={() => setDone(true)} disabled={Object.keys(picked).length < questions.length}>See my score</Button>
      ) : (
        <div className="rounded-xl bg-secondary p-3 text-center text-sm font-semibold">
          You scored {score} / {questions.length}
        </div>
      )}
    </Shell>
  );
}

/* ---------------------------- Checklist ---------------------------- */
function ChecklistApp({ title, items, storageKey }: { title: string; items: string[]; storageKey: string }) {
  const [checked, setChecked] = useState<boolean[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "null") || items.map(() => false); }
    catch { return items.map(() => false); }
  });
  const toggle = (i: number) => {
    const next = checked.map((c, idx) => (idx === i ? !c : c));
    setChecked(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };
  const done = checked.filter(Boolean).length;
  return (
    <Shell title={title} subtitle={`${done} of ${items.length} completed — saved on this device`}>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-gradient-primary transition-all duration-500" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      {items.map((it, i) => (
        <label key={i} className="tap flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm">
          <Checkbox checked={checked[i]} onCheckedChange={() => toggle(i)} className="mt-0.5" />
          <span className={checked[i] ? "line-through opacity-60" : ""}>{it}</span>
        </label>
      ))}
    </Shell>
  );
}

/* ------------------------------- Form ------------------------------ */
function LeadForm({ title, subject }: { title: string; subject: string }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("contact_submissions").insert({
      name: form.name, email: form.email, subject, message: form.message,
    });
    setBusy(false);
    if (!error) setSent(true);
  };
  if (sent) return <Shell title={title}><p className="text-sm">Thank you — we have received your message and will reply by email.</p></Shell>;
  return (
    <Shell title={title} subtitle="We reply within 24 hours">
      <form onSubmit={submit} className="space-y-3">
        <Input placeholder="Your name" value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input type="email" placeholder="Email address" value={form.email} required onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <textarea className="min-h-24 w-full rounded-md border bg-background p-3 text-sm" placeholder="What do you need help with?" value={form.message} required onChange={(e) => setForm({ ...form, message: e.target.value })} />
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Sending…" : "Send"}</Button>
      </form>
    </Shell>
  );
}

/* --------------------------- AI assistant -------------------------- */
function AiAssistant({ title, topic }: { title: string; topic: string }) {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const ask = async (question: string) => {
    if (!question.trim()) return;
    setBusy(true); setErr(""); setAnswer("");
    const { data, error } = await supabase.functions.invoke("blog-assistant", {
      body: { question, topic },
    });
    setBusy(false);
    if (error) { setErr("The assistant is unavailable right now. Please try again shortly."); return; }
    if ((data as any)?.error) { setErr((data as any).message || "Assistant unavailable."); return; }
    setAnswer((data as any)?.answer || "");
  };

  return (
    <Shell title={title} subtitle={`Ask anything about ${topic}`}>
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask a question…" className="h-10" />
        <Button type="submit" disabled={busy} className="h-10 shrink-0">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        </Button>
      </form>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {answer && <div className="whitespace-pre-wrap rounded-xl bg-secondary p-3 text-sm leading-relaxed">{answer}</div>}
    </Shell>
  );
}

/* --------------------------- Comparison Table ------------------------- */
function ComparisonTableApp({ title, props, contextTitle }: { title?: string; props: MiniAppProps; contextTitle: string }) {
  const headers = useMemo(() => {
    const raw = props.headers || props.columns || "Feature | Standard | Premium / Best Choice";
    return raw.split("|").map((s) => s.trim()).filter(Boolean);
  }, [props.headers, props.columns]);

  const rows = useMemo(() => {
    if (props.rows || props.data) {
      const rawRows = (props.rows || props.data || "").split("\n").map((r) => r.trim()).filter(Boolean);
      return rawRows.map((r) => r.split("|").map((cell) => cell.trim()));
    }
    // Default contextual comparison fallback rows
    return [
      ["Ease of Setup", "Manual / Slow", "Instant & Automated"],
      ["Pricing & Cost", "Pay-as-you-go", "Flexible / High Value"],
      ["Customer Support", "Standard Email", "24/7 Priority Support"],
      ["Growth Scalability", "Limited", "Unlimited"],
    ];
  }, [props.rows, props.data]);

  return (
    <Card className="card-premium my-6 overflow-hidden p-0 border border-border shadow-md">
      <div className="bg-gradient-primary px-4 py-3 text-primary-foreground flex items-center justify-between">
        <div>
          <p className="text-sm font-bold leading-tight">{title || "Feature Comparison & Overview"}</p>
          <p className="text-xs opacity-90">{props.subtitle || `Detailed breakdown for ${contextTitle || "your decision"}`}</p>
        </div>
        <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full font-semibold">
          Swipe to view →
        </span>
      </div>
      <div className="p-0 overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse text-xs md:text-sm">
          <thead>
            <tr className="bg-muted/80 text-foreground border-b border-border">
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-3 font-bold whitespace-nowrap first:sticky first:left-0 first:bg-muted first:z-10 shadow-sm">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-muted/40 transition-colors">
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    className={`px-4 py-3 align-middle ${
                      colIndex === 0
                        ? "font-semibold text-foreground whitespace-nowrap sticky left-0 bg-card z-10 border-r border-border/50 shadow-sm"
                        : "text-muted-foreground whitespace-normal min-w-[130px]"
                    }`}
                  >
                    {cell === "Yes" || cell === "✓" || cell === "true" ? (
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                        ✓ {cell}
                      </span>
                    ) : cell === "No" || cell === "✗" || cell === "false" ? (
                      <span className="inline-flex items-center gap-1 font-medium text-rose-500">
                        ✗ {cell}
                      </span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-muted/30 px-4 py-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
        <span>💡 Mobile Tip: Scroll horizontally to compare all features</span>
        <span className="font-semibold text-primary">Verified Data</span>
      </div>
    </Card>
  );
}

/* ------------------------ Business & Services ----------------------- */
function BusinessShowcaseMiniApp({
  slug,
  id,
  title,
  category,
}: {
  slug?: string;
  id?: string;
  title?: string;
  category?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchBiz() {
      setLoading(true);
      try {
        let query = supabase
          .from("suppliers")
          .select("id, name, slug, description, logo_url, address, phone, whatsapp, website, services, rating, reviews_count, verified, categories(name)");
        if (slug) {
          query = query.eq("slug", slug);
        } else if (id) {
          query = query.eq("id", id);
        } else {
          query = query.eq("active", true).order("rating", { ascending: false }).limit(1);
        }
        const { data, error } = await query.maybeSingle();
        if (!error && data && active) {
          setBusiness(data);
        }
      } catch (e) {
        console.warn("Failed to load featured business for blog:", e);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchBiz();
    return () => {
      active = false;
    };
  }, [slug, id]);

  if (loading) {
    return (
      <Card className="my-6 p-5 rounded-2xl border border-primary/20 bg-card/60 animate-pulse flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-muted" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-3 w-28 rounded bg-muted" />
        </div>
      </Card>
    );
  }

  if (!business) return null;

  const profileUrl = `/business/${business.slug || business.id}`;
  const rawServices = Array.isArray(business.services) ? business.services : [];
  const catName = (business.categories as any)?.name || category || "Verified Partner";

  return (
    <Card className="my-8 overflow-hidden rounded-3xl border-2 border-primary/25 bg-gradient-to-br from-card via-card to-primary/5 shadow-md not-prose">
      <div className="bg-gradient-to-r from-primary/15 via-primary/10 to-transparent px-5 py-3 border-b border-primary/15 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>{title || "Featured Business & Services Spotlight"}</span>
        </div>
        <Badge variant="outline" className="bg-background/80 text-[11px] font-bold border-primary/30">
          {catName}
        </Badge>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Business Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center">
              {business.logo_url ? (
                <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-7 h-7 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-lg sm:text-xl font-black text-foreground m-0">{business.name}</h4>
                {business.verified && (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px] font-extrabold">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                {business.rating && (
                  <span className="flex items-center gap-1 font-bold text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    {Number(business.rating).toFixed(1)}
                  </span>
                )}
                {business.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    {business.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          <a
            href={profileUrl}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs shadow hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 no-underline"
          >
            <span>View Public Site Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Business Pitch */}
        {business.description && (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed m-0 border-l-2 border-primary/40 pl-3 italic">
            "{business.description.length > 200 ? business.description.slice(0, 200) + "…" : business.description}"
          </p>
        )}

        {/* Services List */}
        {rawServices.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-foreground">
                <Briefcase className="w-3.5 h-3.5 text-primary" />
                <span>Service Offerings ({rawServices.length})</span>
              </div>
              <a href={`${profileUrl}#services`} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                <span>View all</span> <ArrowRight className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rawServices.slice(0, 3).map((svc: any, idx: number) => (
                <div key={idx} className="rounded-2xl border border-border/80 bg-background/80 p-3.5 space-y-2 flex flex-col justify-between">
                  <div>
                    <h5 className="font-extrabold text-xs sm:text-sm text-foreground m-0 line-clamp-1">
                      {svc.title || "Service"}
                    </h5>
                    {svc.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                        {svc.description}
                      </p>
                    )}
                  </div>
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                      {svc.price || "Contact for Quote"}
                    </span>
                    <a
                      href={`${profileUrl}?service=${encodeURIComponent(svc.title || "")}`}
                      className="text-xs font-extrabold text-primary hover:underline inline-flex items-center gap-0.5"
                    >
                      Book <ArrowRight className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Links */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {business.phone && (
              <a href={`tel:${business.phone}`} className="flex items-center gap-1 hover:text-foreground font-semibold">
                <Phone className="w-3 h-3 text-primary" /> {business.phone}
              </a>
            )}
            {business.whatsapp && (
              <a
                href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-emerald-600 font-semibold hover:underline"
              >
                <MessageCircle className="w-3 h-3" /> WhatsApp
              </a>
            )}
          </div>
          <a href={profileUrl} className="text-primary font-black text-xs hover:underline flex items-center gap-1">
            Browse Full Profile & Catalog <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </Card>
  );
}

/* --------------------------- Dispatcher ---------------------------- */
export type MiniAppProps = Record<string, string>;

export default function MiniApp({ type, props, contextTitle }: { type: string; props: MiniAppProps; contextTitle: string }) {
  const key = (type || "").toLowerCase().trim();
  const title = props.title || undefined;
  const list = useMemo(
    () => (props.items || props.options || "").split("|").map((s) => s.trim()).filter(Boolean),
    [props.items, props.options],
  );
  const storageKey = `miniapp:${key}:${(props.id || title || contextTitle || "default").slice(0, 60)}`;

  switch (key) {
    case "table":
    case "comparison":
    case "comparison-table":
      return <ComparisonTableApp title={title} props={props} contextTitle={contextTitle} />;
    case "roi":
    case "roi-calculator":
      return <RoiCalculator title={title || "ROI Calculator"} />;

    case "loan":
    case "loan-calculator":
      return <LoanCalculator title={title || "Loan Repayment Calculator"} />;
    case "currency":
    case "converter":
      return <CurrencyConverter title={title || "Currency Converter"} />;
    case "breakeven":
    case "break-even":
    case "startup-cost":
      return <BreakEvenCalculator title={title || "Break-even Calculator"} />;
    case "poll":
      return <Poll title={title || "Quick poll"} options={list.length ? list : ["Yes", "No"]} storageKey={storageKey} />;
    case "checklist":
      return <ChecklistApp title={title || "Action checklist"} items={list.length ? list : ["Define your offer", "Set your price", "Get your first customer"]} storageKey={storageKey} />;
    case "form":
    case "lead-form":
      return <LeadForm title={title || "Talk to our team"} subject={props.subject || contextTitle || "Blog enquiry"} />;
    case "quiz": {
      let questions: QuizQ[] = [];
      try { questions = JSON.parse(props.data || "[]"); } catch { questions = []; }
      if (!questions.length) return null;
      return <Quiz title={title || "Test yourself"} questions={questions} />;
    }
    case "ai":
    case "assistant":
    case "ai-assistant":
      return <AiAssistant title={title || "Ask the AI business assistant"} topic={props.topic || contextTitle} />;
    case "business":
    case "business-profile":
    case "business-showcase":
    case "services":
    case "service-listing":
      return (
        <BusinessShowcaseMiniApp
          slug={props.slug}
          id={props.id || props.business_id}
          title={title}
          category={props.category}
        />
      );
    default:
      return null;
  }
}
