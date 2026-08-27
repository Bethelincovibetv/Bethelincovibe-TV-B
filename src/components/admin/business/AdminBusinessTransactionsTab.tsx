import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Wallet, DollarSign, Search, ShieldCheck, Sparkles, ShoppingBag,
  TrendingUp, RefreshCw, ArrowUpRight, ArrowDownRight, Layers
} from "lucide-react";

export default function AdminBusinessTransactionsTab() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Fetch all wallet transactions
  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-all-business-txs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return [];
      return data ?? [];
    },
  });

  // Fetch Owners Map
  const { data: profilesMap = {} } = useQuery({
    queryKey: ["admin-tx-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, email, username");
      const map: Record<string, any> = {};
      (data || []).forEach((p: any) => {
        map[p.user_id] = p;
      });
      return map;
    },
  });

  // Filter business-related transactions
  const filteredTxs = useMemo(() => {
    return transactions.filter((tx: any) => {
      const desc = (tx.description || "").toLowerCase();
      const ref = (tx.reference_id || "").toLowerCase();

      const isVerification = desc.includes("verif") || ref.startsWith("verify-");
      const isBoost = desc.includes("boost") || desc.includes("spotlight") || desc.includes("feature") || ref.startsWith("boost-");
      const isSales = desc.includes("sales") || desc.includes("product") || desc.includes("order");

      if (typeFilter === "verification" && !isVerification) return false;
      if (typeFilter === "boosts" && !isBoost) return false;
      if (typeFilter === "sales" && !isSales) return false;

      if (search.trim()) {
        const user = profilesMap[tx.user_id];
        const text = [
          tx.description,
          tx.reference_id,
          tx.type,
          user?.display_name,
          user?.email,
          user?.username,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.includes(search.toLowerCase())) return false;
      }

      return true;
    });
  }, [transactions, profilesMap, search, typeFilter]);

  // Breakdown calculations
  const verificationTotal = transactions
    .filter((tx: any) => {
      const d = (tx.description || "").toLowerCase();
      const r = (tx.reference_id || "").toLowerCase();
      return d.includes("verif") || r.startsWith("verify-");
    })
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const boostTotal = transactions
    .filter((tx: any) => {
      const d = (tx.description || "").toLowerCase();
      const r = (tx.reference_id || "").toLowerCase();
      return d.includes("boost") || d.includes("spotlight") || d.includes("feature") || r.startsWith("boost-");
    })
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const totalBusinessRevenue = verificationTotal + boostTotal;

  return (
    <div className="space-y-6">
      {/* Top Financial Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Business Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            ₦{totalBusinessRevenue.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Verification + Promotions</p>
        </Card>

        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Verification Earnings</span>
            <ShieldCheck className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-2">
            ₦{verificationTotal.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Blue Tick badges paid</p>
        </Card>

        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Boost &amp; Ads Earnings</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            ₦{boostTotal.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Spotlight promotions paid</p>
        </Card>

        <Card className="p-4 bg-card border-border/70 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Ledger Entries</span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{transactions.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">All wallet activities</p>
        </Card>
      </div>

      {/* Transaction Ledger Table */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Business Ecosystem Financial Ledger ({filteredTxs.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time wallet debits and credit records for business verification, promotions, and marketplace sales.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              className="h-8 w-8 rounded-xl shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search transaction by description, user, reference..."
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 rounded-xl text-xs sm:w-48">
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="verification">Verification Badges</SelectItem>
                <SelectItem value="boosts">Featured Promotions</SelectItem>
                <SelectItem value="sales">Product Sales</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <p className="text-center text-xs text-muted-foreground py-8">Loading financial ledger...</p>
          ) : filteredTxs.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Wallet className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-bold text-foreground">No transactions recorded</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Transactions will appear here automatically when merchants purchase verifications or boosts.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredTxs.map((tx: any) => {
                const user = profilesMap[tx.user_id];
                const isDebit = (tx.type || "").toLowerCase() === "debit";

                return (
                  <div
                    key={tx.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isDebit ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        }`}
                      >
                        {isDebit ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-foreground truncate">{tx.description || "Wallet Transaction"}</span>
                          <Badge variant="outline" className="text-[9px] py-0 capitalize text-muted-foreground">
                            {tx.type || "debit"}
                          </Badge>
                        </div>

                        <p className="text-muted-foreground text-[11px]">
                          User:{" "}
                          <strong className="text-foreground/90">
                            {user?.display_name || user?.username || user?.email || tx.user_id.slice(0, 8)}
                          </strong>{" "}
                          · Ref: <span className="font-mono text-[10px]">{tx.reference_id || tx.id.slice(0, 8)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right sm:text-right shrink-0">
                      <p className={`font-black text-sm ${isDebit ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {isDebit ? "-" : "+"}₦{Number(tx.amount || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
