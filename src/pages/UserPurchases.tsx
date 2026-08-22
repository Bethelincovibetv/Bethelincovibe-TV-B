import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Loader2, ShoppingBag } from "lucide-react";

export default function UserPurchases() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("product_purchases")
      .select("*, directory_products(name, slug, cover_image)")
      .eq("buyer_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, [user]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/login?redirect=/dashboard/purchases" replace />;

  const getAccess = async (reference: string) => {
    setBusy(reference);
    const { data, error } = await supabase.functions.invoke("digital-checkout", { body: { action: "download", reference } });
    setBusy(null);
    if (error || data?.error) return toast.error(data?.error || "Could not get your download link");
    window.open(data.url, "_blank", "noopener");
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <Helmet><title>My Purchases — Downloads & Access</title></Helmet>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary"><ShoppingBag className="h-5 w-5" /></span>
        <div>
          <h1 className="text-xl font-bold">My purchases</h1>
          <p className="text-xs text-muted-foreground">Every product you bought, ready to download.</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border p-10 text-center text-sm text-muted-foreground">
          <p>No purchases yet.</p>
          <Button asChild className="mt-3"><Link to="/products">Browse the marketplace</Link></Button>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border p-3">
              {r.directory_products?.cover_image && <img src={r.directory_products.cover_image} alt="" className="h-14 w-14 rounded-xl object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.directory_products?.name || "Product"}</p>
                <p className="text-xs text-muted-foreground">₦{Number(r.amount || 0).toLocaleString()} · {new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <Badge variant={r.status === "paid" ? "default" : "secondary"}>{r.status}</Badge>
              {r.status === "paid" && (
                <Button size="sm" onClick={() => getAccess(r.reference)} disabled={busy === r.reference}>
                  {busy === r.reference ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="mr-1.5 h-4 w-4" />Download</>}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
