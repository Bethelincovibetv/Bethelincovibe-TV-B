import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getPromotionOrderById,
  PromotionOrder,
} from "@/services/promotionOrderService";
import { formatNaira } from "@/services/packageService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Users,
  Eye,
  ExternalLink,
  ShieldCheck,
  FileText,
  Calendar,
  Lock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function PromoterPromotionOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<PromotionOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      if (!id) return;
      setLoading(true);
      const result = await getPromotionOrderById(id, user?.id, user?.role);
      if (result.error || !result.order) {
        setError(result.error || "Order not found");
      } else {
        setOrder(result.order);
      }
      setLoading(false);
    }
    loadOrder();
  }, [id, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Loading order brief...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <Card className="p-8 max-w-md w-full text-center rounded-3xl space-y-4">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <div>
            <h2 className="text-lg font-bold text-foreground">Order Access Restricted</h2>
            <p className="text-xs text-muted-foreground mt-1">{error || "Could not retrieve order details."}</p>
          </div>
          <Button asChild variant="outline" className="rounded-xl text-xs">
            <Link to="/dashboard/promoter-orders">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to Assigned Orders
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Top Header Navigation */}
      <div className="border-b border-border/70 bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild className="rounded-xl text-xs gap-1.5">
            <Link to="/dashboard/promoter-orders">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Assigned Orders</span>
            </Link>
          </Button>

          <Badge variant="outline" className="text-xs font-mono font-bold text-primary border-primary/30">
            {order.order_reference}
          </Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Order Status Header Card */}
        <Card className="p-6 rounded-3xl border border-border/70 bg-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-xs font-extrabold bg-amber-500/10 text-amber-600 border-amber-500/30"
                >
                  Awaiting Business Payment
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Requested {new Date(order.created_at).toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-2xl font-black text-foreground mt-1">
                {order.package?.title || "Promotion Order"}
              </h1>
            </div>

            <div className="sm:text-right">
              <span className="text-[11px] text-muted-foreground block font-medium">Your Net Earning</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {formatNaira(order.promoter_net_earning)}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                Total Price: {formatNaira(order.amount)}
              </span>
            </div>
          </div>

          <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100 rounded-2xl">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <AlertTitle className="text-xs font-bold text-amber-700 dark:text-amber-400">
                Awaiting business payment
              </AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Do not post this promotion yet. Once the business completes escrow payment in Step 7, the order status will transition to funded/in-progress and you will receive a notification to broadcast.
              </AlertDescription>
            </div>
          </Alert>
        </Card>

        {/* Campaign Brief & Materials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content (2 cols) */}
          <div className="md:col-span-2 space-y-6">
            {/* Promotion Brief */}
            <Card className="p-5 rounded-2xl border border-border/70 bg-card space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Client Promotion Brief
              </h3>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {order.promotion_brief}
              </p>
            </Card>

            {/* Creative Assets */}
            <Card className="p-5 rounded-2xl border border-border/70 bg-card space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Provided Creative Assets / Links
              </h3>
              {order.creative_assets_urls && order.creative_assets_urls.length > 0 ? (
                <div className="space-y-2">
                  {order.creative_assets_urls.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 text-xs text-primary font-medium transition-colors"
                    >
                      <span className="line-clamp-1 break-all">{url}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 ml-2 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No external asset URLs provided. Use the text brief.
                </p>
              )}
            </Card>

            {/* Special Instructions */}
            {order.special_instructions && (
              <Card className="p-5 rounded-2xl border border-border/70 bg-card space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Client Special Instructions
                </h3>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {order.special_instructions}
                </p>
              </Card>
            )}
          </div>

          {/* Sidebar (1 col) */}
          <div className="space-y-6">
            {/* Target Community Info */}
            {order.community && (
              <Card className="p-5 rounded-2xl border border-border/70 bg-card space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Target Community
                </h3>
                <span className="text-xs font-bold text-foreground block">{order.community.name}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {order.community.member_count.toLocaleString()} members
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {order.community.active_daily_views.toLocaleString()} daily
                  </span>
                </div>
              </Card>
            )}

            {/* Package Deliverables */}
            {order.package && (
              <Card className="p-5 rounded-2xl border border-border/70 bg-card space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Required Deliverables
                </h3>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>Duration: {order.package.duration_hours} hours active status</span>
                </div>

                <ul className="space-y-1.5 pt-2">
                  {order.package.deliverables.map((del, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{del}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
