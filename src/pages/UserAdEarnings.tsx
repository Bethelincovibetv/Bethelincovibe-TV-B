import { Navigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, MousePointerClick } from "lucide-react";

export default function UserAdEarnings() {
  const { user, loading } = useAuth();

  const { data: earnings = [], isLoading } = useQuery({
    queryKey: ["ad-click-earnings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("ad_click_earnings")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  const { data: rewardSetting } = useQuery({
    queryKey: ["ad-click-reward-naira"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "ad_click_reward_naira").maybeSingle();
      return data?.value || "0";
    },
  });

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const total = earnings.reduce((s, e: any) => s + Number(e.amount || 0), 0);

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <Helmet><title>Ad Click Earnings | Bethelincovibe TV</title></Helmet>
      <Button variant="ghost" size="sm" asChild className="mb-3">
        <Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1" />Back to dashboard</Link>
      </Button>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MousePointerClick className="h-5 w-5 text-primary" /> Ad Click Earnings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Earn <span className="font-semibold text-foreground">₦{rewardSetting}</span> every time you click on a Google ad displayed on the site. Rewards are credited automatically to your wallet.
          </p>
          <div className="text-2xl font-bold">Total earned: ₦{total.toLocaleString()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : earnings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ad click earnings yet. Click any Google ad on the site to start earning.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.map((e: any) => {
                  const d = new Date(e.created_at);
                  return (
                    <TableRow key={e.id}>
                      <TableCell>{d.toLocaleDateString()}</TableCell>
                      <TableCell>{d.toLocaleTimeString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[160px]">{e.page_path || "—"}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">+₦{Number(e.amount).toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}