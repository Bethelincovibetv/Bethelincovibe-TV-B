import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMyPromoterOrders,
  PromotionOrder,
} from "@/services/promotionOrderService";
import { getPromoterProfileByUserId, PromoterProfile } from "@/services/promoterService";
import { formatNaira } from "@/services/packageService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Megaphone,
  Clock,
  ArrowRight,
  Sparkles,
  Layers,
  AlertCircle,
  FileText,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function PromoterPromotionOrders() {
  const { user } = useAuth();
  const [promoterProfile, setPromoterProfile] = useState<PromoterProfile | null>(null);
  const [orders, setOrders] = useState<PromotionOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPromoterAndOrders() {
      if (!user) return;
      setLoading(true);
      const profile = await getPromoterProfileByUserId(user.id);
      setPromoterProfile(profile);

      if (profile) {
        const data = await getMyPromoterOrders(profile.id, user.id);
        setOrders(data);
      }
      setLoading(false);
    }
    loadPromoterAndOrders();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_payment":
        return (
          <Badge
            variant="outline"
            className="text-[11px] font-bold bg-amber-500/10 text-amber-600 border-amber-500/30"
          >
            Awaiting Payment
          </Badge>
        );
      case "paid_escrow":
        return (
          <Badge
            variant="outline"
            className="text-[11px] font-bold bg-blue-500/10 text-blue-600 border-blue-500/30"
          >
            Payment Verified
          </Badge>
        );
      case "in_progress":
        return (
          <Badge
            variant="outline"
            className="text-[11px] font-bold bg-purple-500/10 text-purple-600 border-purple-500/30"
          >
            In Progress
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
          >
            Completed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[11px] font-semibold">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Header Bar */}
      <div className="border-b border-border/70 bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[11px] font-bold text-primary border-primary/30">
                Promoter Portal
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground mt-0.5">
              Assigned Promotion Orders
            </h1>
          </div>

          <Button asChild variant="outline" className="rounded-xl text-xs font-bold gap-1.5 shadow-xs">
            <Link to="/dashboard/promoter-profile">
              <span>My Promoter Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Notice Banner */}
        <Alert className="bg-primary/5 border-primary/20 text-primary-900 dark:text-primary-100 rounded-2xl">
          <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <AlertTitle className="text-xs font-bold text-primary">
              Promoter Order Queue
            </AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              New booking requests from businesses arrive here. Orders with status <span className="font-semibold text-foreground">pending_payment</span> are awaiting business payment before broadcast commencement.
            </AlertDescription>
          </div>
        </Alert>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <Card key={n} className="p-5 rounded-2xl animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : !promoterProfile ? (
          <Card className="p-8 text-center rounded-3xl max-w-md mx-auto space-y-4">
            <ShieldCheck className="h-10 w-10 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-base font-bold text-foreground">No Promoter Profile Found</h3>
              <p className="text-xs text-muted-foreground mt-1">
                You need a verified promoter profile to receive audience promotion orders.
              </p>
            </div>
            <Button asChild className="rounded-xl text-xs font-bold">
              <Link to="/dashboard/promoter-profile">Create Promoter Profile</Link>
            </Button>
          </Card>
        ) : orders.length === 0 ? (
          <Card className="p-12 text-center rounded-3xl border-dashed border-2 max-w-lg mx-auto space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">No incoming orders yet</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Make sure your WhatsApp communities are verified and promotion packages are published to attract business bookings.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-xl text-xs font-bold">
              <Link to="/dashboard/promoter-profile">
                <span>Manage Packages</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((order) => (
              <Card
                key={order.id}
                className="p-5 rounded-2xl border border-border/70 bg-card hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      {order.order_reference}
                    </span>
                    {getStatusBadge(order.status)}
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-foreground line-clamp-1">
                      {order.package?.title || "Promotion Package"}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      {order.community && (
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                          <Layers className="h-3.5 w-3.5 text-primary" />
                          {order.community.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs space-y-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground block">
                      Client Brief
                    </span>
                    <p className="text-xs text-foreground line-clamp-2 italic">
                      "{order.promotion_brief}"
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-border/50 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Net Earning</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      {formatNaira(order.promoter_net_earning)}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="rounded-xl text-xs font-bold gap-1 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                  >
                    <Link to={`/dashboard/promoter-orders/${order.id}`}>
                      <span>View Brief</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
