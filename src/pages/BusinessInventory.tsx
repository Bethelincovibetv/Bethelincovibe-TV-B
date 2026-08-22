import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Sparkles, Loader2, Package, ShoppingCart, Receipt, Users } from "lucide-react";
import { toast } from "sonner";

export default function BusinessInventory() {
  const { user, loading } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [insights, setInsights] = useState<string>("");
  const [insightsLoading, setInsightsLoading] = useState(false);

  // forms
  const [pf, setPf] = useState({ name: "", sku: "", stock: 0, cost_price: 0, sell_price: 0, low_stock_threshold: 5 });
  const [sf, setSf] = useState({ product_id: "", customer_id: "", qty: 1, unit_price: 0 });
  const [ef, setEf] = useState({ category: "", amount: 0, note: "" });
  const [cf, setCf] = useState({ name: "", phone: "", whatsapp: "", email: "" });

  useEffect(() => { if (user) reload(); }, [user]);

  async function reload() {
    const [{ data: p }, { data: s }, { data: e }, { data: c }] = await Promise.all([
      supabase.from("inventory_products").select("*").order("created_at", { ascending: false }),
      supabase.from("inventory_sales").select("*, inventory_products(name), inventory_customers(name)").order("sold_at", { ascending: false }).limit(100),
      supabase.from("inventory_expenses").select("*").order("spent_at", { ascending: false }).limit(100),
      supabase.from("inventory_customers").select("*").order("created_at", { ascending: false }),
    ]);
    setProducts(p || []); setSales(s || []); setExpenses(e || []); setCustomers(c || []);
  }

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  async function addProduct() {
    if (!pf.name) return toast.error("Name required");
    const { error } = await supabase.from("inventory_products").insert({ ...pf, user_id: user!.id });
    if (error) return toast.error(error.message);
    setPf({ name: "", sku: "", stock: 0, cost_price: 0, sell_price: 0, low_stock_threshold: 5 });
    reload();
  }
  async function addSale() {
    if (!sf.product_id || !sf.qty) return toast.error("Pick product & qty");
    const total = Number(sf.qty) * Number(sf.unit_price);
    const { error } = await supabase.from("inventory_sales").insert({ ...sf, total, user_id: user!.id, customer_id: sf.customer_id || null });
    if (error) return toast.error(error.message);
    setSf({ product_id: "", customer_id: "", qty: 1, unit_price: 0 });
    reload();
  }
  async function addExpense() {
    if (!ef.amount) return toast.error("Amount required");
    const { error } = await supabase.from("inventory_expenses").insert({ ...ef, user_id: user!.id });
    if (error) return toast.error(error.message);
    setEf({ category: "", amount: 0, note: "" });
    reload();
  }
  async function addCustomer() {
    if (!cf.name) return toast.error("Name required");
    const { error } = await supabase.from("inventory_customers").insert({ ...cf, user_id: user!.id });
    if (error) return toast.error(error.message);
    setCf({ name: "", phone: "", whatsapp: "", email: "" });
    reload();
  }
  async function del(table: string, id: string) {
    await supabase.from(table as any).delete().eq("id", id);
    reload();
  }
  async function getInsights() {
    setInsightsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("inventory-insights", { body: {} });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setInsights(data.insights || "");
    } catch (e: any) { toast.error(e.message); }
    finally { setInsightsLoading(false); }
  }

  const totalSales = sales.reduce((s, r) => s + Number(r.total || 0), 0);
  const totalExp = expenses.reduce((s, r) => s + Number(r.amount || 0), 0);
  const profit = totalSales - totalExp;
  const lowStock = products.filter((p) => Number(p.stock) <= Number(p.low_stock_threshold));

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-12">
      <Helmet><title>Business Inventory | Bethelincovibe TV</title></Helmet>
      <div className="container mx-auto max-w-6xl px-4 py-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
          <h1 className="text-xl font-bold">Business Inventory & Sales</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Sales (recent)" value={`₦${totalSales.toLocaleString()}`} />
          <StatCard label="Expenses" value={`₦${totalExp.toLocaleString()}`} />
          <StatCard label="Profit" value={`₦${profit.toLocaleString()}`} accent={profit >= 0} />
          <StatCard label="Low Stock Alerts" value={String(lowStock.length)} accent={lowStock.length === 0} />
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />AI Insights</CardTitle>
            <Button size="sm" onClick={getInsights} disabled={insightsLoading}>
              {insightsLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
              {insights ? "Refresh" : "Generate"}
            </Button>
          </CardHeader>
          {insights && <CardContent><pre className="whitespace-pre-wrap text-sm font-sans">{insights}</pre></CardContent>}
        </Card>

        <Tabs defaultValue="products">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="products"><Package className="h-3 w-3 mr-1" />Products</TabsTrigger>
            <TabsTrigger value="sales"><ShoppingCart className="h-3 w-3 mr-1" />Sales</TabsTrigger>
            <TabsTrigger value="expenses"><Receipt className="h-3 w-3 mr-1" />Expenses</TabsTrigger>
            <TabsTrigger value="customers"><Users className="h-3 w-3 mr-1" />Customers</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-3">
            <Card><CardContent className="p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Add a new product</p>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                <div><Label className="text-[11px]">Product name</Label><Input placeholder="e.g. Bottled water" value={pf.name} onChange={(e) => setPf({ ...pf, name: e.target.value })} /></div>
                <div><Label className="text-[11px]">SKU / Code</Label><Input placeholder="e.g. BW-001" value={pf.sku} onChange={(e) => setPf({ ...pf, sku: e.target.value })} /></div>
                <div><Label className="text-[11px]">Stock (qty)</Label><Input type="number" placeholder="0" value={pf.stock} onChange={(e) => setPf({ ...pf, stock: Number(e.target.value) })} /></div>
                <div><Label className="text-[11px]">Cost price (₦)</Label><Input type="number" placeholder="0" value={pf.cost_price} onChange={(e) => setPf({ ...pf, cost_price: Number(e.target.value) })} /></div>
                <div><Label className="text-[11px]">Selling price (₦)</Label><Input type="number" placeholder="0" value={pf.sell_price} onChange={(e) => setPf({ ...pf, sell_price: Number(e.target.value) })} /></div>
                <div className="flex items-end"><Button onClick={addProduct} className="w-full"><Plus className="h-4 w-4 mr-1" />Add</Button></div>
              </div>
            </CardContent></Card>
            <div className="grid gap-2">
              {products.map((p) => (
                <Card key={p.id}><CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{p.name} {p.sku && <span className="text-xs text-muted-foreground">· {p.sku}</span>}</p>
                    <p className="text-xs text-muted-foreground">Stock: {p.stock} · Cost ₦{Number(p.cost_price).toLocaleString()} · Sell ₦{Number(p.sell_price).toLocaleString()}</p>
                  </div>
                  {Number(p.stock) <= Number(p.low_stock_threshold) && <Badge variant="destructive" className="text-xs">LOW</Badge>}
                  <Button size="icon" variant="ghost" onClick={() => del("inventory_products", p.id)}><Trash2 className="h-4 w-4" /></Button>
                </CardContent></Card>
              ))}
              {products.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No products yet</p>}
            </div>
          </TabsContent>

          <TabsContent value="sales" className="space-y-3">
            <Card><CardContent className="p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Record a sale</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div>
                  <Label className="text-[11px]">Product</Label>
                  <Select value={sf.product_id} onValueChange={(v) => {
                    const p = products.find((x) => x.id === v);
                    setSf({ ...sf, product_id: v, unit_price: p?.sell_price ?? 0 });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Pick product" /></SelectTrigger>
                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px]">Customer (optional)</Label>
                  <Select value={sf.customer_id} onValueChange={(v) => setSf({ ...sf, customer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pick customer" /></SelectTrigger>
                    <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-[11px]">Quantity sold</Label><Input type="number" placeholder="1" value={sf.qty} onChange={(e) => setSf({ ...sf, qty: Number(e.target.value) })} /></div>
                <div><Label className="text-[11px]">Unit price (₦)</Label><Input type="number" placeholder="0" value={sf.unit_price} onChange={(e) => setSf({ ...sf, unit_price: Number(e.target.value) })} /></div>
                <div className="flex items-end"><Button onClick={addSale} className="w-full"><Plus className="h-4 w-4 mr-1" />Record</Button></div>
              </div>
            </CardContent></Card>
            <div className="grid gap-2">
              {sales.map((s) => (
                <Card key={s.id}><CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{s.inventory_products?.name || "—"} × {s.qty}</p>
                    <p className="text-xs text-muted-foreground">₦{Number(s.total).toLocaleString()} · {new Date(s.sold_at).toLocaleString()} {s.inventory_customers?.name && `· ${s.inventory_customers.name}`}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => del("inventory_sales", s.id)}><Trash2 className="h-4 w-4" /></Button>
                </CardContent></Card>
              ))}
              {sales.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No sales yet</p>}
            </div>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-3">
            <Card><CardContent className="p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Log an expense</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div><Label className="text-[11px]">Category</Label><Input placeholder="e.g. Rent, Fuel, Salary" value={ef.category} onChange={(e) => setEf({ ...ef, category: e.target.value })} /></div>
                <div><Label className="text-[11px]">Amount (₦)</Label><Input type="number" placeholder="0" value={ef.amount} onChange={(e) => setEf({ ...ef, amount: Number(e.target.value) })} /></div>
                <div><Label className="text-[11px]">Note</Label><Input placeholder="What was it for?" value={ef.note} onChange={(e) => setEf({ ...ef, note: e.target.value })} /></div>
                <div className="flex items-end"><Button onClick={addExpense} className="w-full"><Plus className="h-4 w-4 mr-1" />Add</Button></div>
              </div>
            </CardContent></Card>
            <div className="grid gap-2">
              {expenses.map((x) => (
                <Card key={x.id}><CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="flex-1"><p className="font-medium text-sm">{x.category || "Other"} — ₦{Number(x.amount).toLocaleString()}</p><p className="text-xs text-muted-foreground">{x.note} · {new Date(x.spent_at).toLocaleString()}</p></div>
                  <Button size="icon" variant="ghost" onClick={() => del("inventory_expenses", x.id)}><Trash2 className="h-4 w-4" /></Button>
                </CardContent></Card>
              ))}
              {expenses.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No expenses yet</p>}
            </div>
          </TabsContent>

          <TabsContent value="customers" className="space-y-3">
            <Card><CardContent className="p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Add a customer</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div><Label className="text-[11px]">Full name</Label><Input placeholder="Customer name" value={cf.name} onChange={(e) => setCf({ ...cf, name: e.target.value })} /></div>
                <div><Label className="text-[11px]">Phone number</Label><Input placeholder="0801..." value={cf.phone} onChange={(e) => setCf({ ...cf, phone: e.target.value })} /></div>
                <div><Label className="text-[11px]">WhatsApp number</Label><Input placeholder="234801..." value={cf.whatsapp} onChange={(e) => setCf({ ...cf, whatsapp: e.target.value })} /></div>
                <div><Label className="text-[11px]">Email</Label><Input placeholder="name@email.com" value={cf.email} onChange={(e) => setCf({ ...cf, email: e.target.value })} /></div>
                <div className="flex items-end"><Button onClick={addCustomer} className="w-full"><Plus className="h-4 w-4 mr-1" />Add</Button></div>
              </div>
            </CardContent></Card>
            <div className="grid gap-2">
              {customers.map((c) => (
                <Card key={c.id}><CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="flex-1"><p className="font-medium text-sm">{c.name}</p><p className="text-xs text-muted-foreground">{c.phone} {c.whatsapp && `· wa: ${c.whatsapp}`} {c.email && `· ${c.email}`}</p></div>
                  <Button size="icon" variant="ghost" onClick={() => del("inventory_customers", c.id)}><Trash2 className="h-4 w-4" /></Button>
                </CardContent></Card>
              ))}
              {customers.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No customers yet</p>}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card><CardContent className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${accent === false ? "text-destructive" : ""}`}>{value}</p>
    </CardContent></Card>
  );
}
