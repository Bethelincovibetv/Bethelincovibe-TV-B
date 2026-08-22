import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Loader2, Lock, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

/** Buy / unlock control for digital products. Hidden delivery until payment is verified. */
export default function BuyDigitalProduct({ product }: { product: any }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("product_purchases")
      .select("*").eq("product_id", product.id).eq("buyer_id", user.id).eq("status", "paid")
      .maybeSingle().then(({ data }) => setPurchase(data));
  }, [user, product.id]);

  // Auto-verify when returning from Paystack
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("reference");
    if (!ref || !user) return;
    (async () => {
      const { data } = await supabase.functions.invoke("digital-checkout", { body: { action: "verify", reference: ref } });
      if (data?.ok) { toast.success("Payment confirmed — your product is unlocked!"); setPurchase(data.purchase ?? { reference: ref }); }
    })();
  }, [user]);

  if (product.product_type !== "digital") return null;

  const buy = async () => {
    if (!user) return navigate(`/login?redirect=/products/${product.slug || product.id}`);
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("digital-checkout", { body: { action: "init", product_id: product.id } });
    setBusy(false);
    if (error || data?.error) return toast.error(data?.error || "Could not start checkout");
    window.location.href = data.authorization_url;
  };

  const download = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("digital-checkout", { body: { action: "download", reference: purchase.reference } });
    setBusy(false);
    if (error || data?.error) return toast.error(data?.error || "Could not get your link");
    window.open(data.url, "_blank", "noopener");
  };

  if (purchase) {
    return (
      <Button className="mt-4 w-full" onClick={download} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="mr-1.5 h-4 w-4" />Download your product</>}
      </Button>
    );
  }

  return (
    <div className="mt-4">
      <Button className="w-full" size="lg" onClick={buy} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShoppingCart className="mr-1.5 h-4 w-4" />Buy & download instantly</>}
      </Button>
      <p className="mt-1.5 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
        <Lock className="h-3 w-3" />Download link unlocks right after payment is verified.
      </p>
    </div>
  );
}
