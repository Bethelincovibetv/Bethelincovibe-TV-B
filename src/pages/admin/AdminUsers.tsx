import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, ShieldOff, Users, Search, Wallet, Plus, Minus, Eye, Building2, UserCog, Mail, Briefcase, Crown, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { autoCreateAndSetupBusinessForUser, runQueenServiceAIAutomation } from "@/lib/queenBusinessServiceAIEngine";

export default function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [profileForm, setProfileForm] = useState<any>({});
  const [rawOpen, setRawOpen] = useState(false);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: roles } = useQuery({
    queryKey: ["admin-all-roles"],
    queryFn: async () => (await supabase.from("user_roles").select("*")).data ?? [],
  });
  const { data: wallets } = useQuery({
    queryKey: ["admin-all-wallets"],
    queryFn: async () => (await supabase.from("wallets").select("*")).data ?? [],
  });
  const { data: businesses } = useQuery({
    queryKey: ["admin-user-businesses"],
    queryFn: async () => (await supabase.from("suppliers").select("*, categories(name)").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: submissions } = useQuery({
    queryKey: ["admin-user-blog-submissions"],
    queryFn: async () => (await supabase.from("guest_blog_submissions").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: ads } = useQuery({
    queryKey: ["admin-user-ads"],
    queryFn: async () => (await supabase.from("user_ads").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      if (isAdmin) {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-all-roles"] }); toast.success("Role updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("No user selected");
      const username = profileForm.username?.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") || null;
      const { error } = await supabase.from("profiles").update({
        display_name: profileForm.display_name || null,
        email: profileForm.email || null,
        username,
        whatsapp: profileForm.whatsapp || null,
        bio: profileForm.bio || null,
        is_public: profileForm.is_public !== false,
        avatar_url: profileForm.avatar_url || null,
        background_url: profileForm.background_url || null,
        services: parseServices(profileForm.servicesText),
      } as any).eq("user_id", selected.user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success("User profile updated");
      setSelected((p: any) => ({ ...p, ...profileForm, services: parseServices(profileForm.servicesText) }));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [queenRunningForUser, setQueenRunningForUser] = useState<string | null>(null);

  const handleQueenUserSetup = async (p: any) => {
    setQueenRunningForUser(p.user_id);
    const toastId = toast.loading(`👑 Queen AI Agent is setting up business & graphic creatives for ${p.display_name || p.email}...`);
    try {
      const userBizList = businessesFor(p.user_id);
      if (userBizList.length > 0) {
        // Run setup on existing primary business
        await runQueenServiceAIAutomation(userBizList[0], {
          createBannerAdvert: true,
          generateServicesCatalog: true,
          sendOwnerNotification: true,
        });
        toast.success(`👑 Queen Service completed for ${userBizList[0].name}!`, { id: toastId });
      } else {
        // Auto-create brand new business listing with full graphic creatives & advert
        const res = await autoCreateAndSetupBusinessForUser(p);
        toast.success(`👑 Created new business "${res.businessName}" with full AI catalog & banner creatives!`, { id: toastId });
      }

      qc.invalidateQueries({ queryKey: ["admin-user-businesses"] });
      qc.invalidateQueries({ queryKey: ["admin-user-ads"] });
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to execute Queen setup", { id: toastId });
    } finally {
      setQueenRunningForUser(null);
    }
  };

  const isAdmin = (uid: string) => roles?.some((r: any) => r.user_id === uid && r.role === "admin");
  const balanceFor = (uid: string) => Number(wallets?.find((w: any) => w.user_id === uid)?.balance ?? 0);
  const rolesFor = (uid: string) => (roles || []).filter((r: any) => r.user_id === uid).map((r: any) => r.role);
  const businessesFor = (uid: string) => (businesses || []).filter((b: any) => b.submitted_by === uid);
  const submissionsFor = (uid: string) => (submissions || []).filter((b: any) => b.user_id === uid);
  const adsFor = (uid: string) => (ads || []).filter((a: any) => a.user_id === uid);

  const openUser = (p: any) => {
    setSelected(p);
    setProfileForm({
      ...p,
      servicesText: Array.isArray(p.services) ? p.services.join("\n") : "",
      is_public: p.is_public !== false,
    });
  };

  const filtered = profiles?.filter((p: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [p.display_name, p.email, p.username, p.whatsapp, p.user_id].some((v) => String(v || "").toLowerCase().includes(q));
  });

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2"><Users className="h-5 w-5" /> Users</h1>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, email, username, phone, or ID…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="grid gap-2">
          {filtered?.map((p: any) => (
            <Card key={p.id} className="overflow-hidden">
              <CardContent className="py-3 px-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-primary-foreground font-bold overflow-hidden">
                  {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : (p.display_name || p.email || "?")[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{p.display_name || p.email}</p>
                    {isAdmin(p.user_id) && <Badge className="text-[10px] py-0">Admin</Badge>}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{p.email}</p>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1"><Wallet className="h-3 w-3" />₦{balanceFor(p.user_id).toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />{businessesFor(p.user_id).length} businesses</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 items-end">
                  <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => openUser(p)}><Eye className="h-3 w-3 mr-1" />View</Button>
                  <AdjustWalletButton userId={p.user_id} onDone={() => qc.invalidateQueries({ queryKey: ["admin-all-wallets"] })} />
                  <Button variant={isAdmin(p.user_id) ? "destructive" : "outline"} size="sm" className="h-7 text-[11px]"
                    onClick={() => toggleAdmin.mutate({ userId: p.user_id, isAdmin: !!isAdmin(p.user_id) })}
                    disabled={toggleAdmin.isPending}>
                    {isAdmin(p.user_id) ? <><ShieldOff className="h-3 w-3 mr-1" />Demote</> : <><Shield className="h-3 w-3 mr-1" />Make Admin</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered?.length === 0 && <p className="text-center text-muted-foreground py-8">No users found</p>}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><UserCog className="h-5 w-5" />{selected.display_name || selected.email || "User details"}</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid grid-cols-4 h-auto">
                  <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
                  <TabsTrigger value="businesses" className="text-xs">Business</TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
                  <TabsTrigger value="raw" className="text-xs">Raw</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-4 mt-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <InfoCard icon={Mail} label="Email" value={selected.email || "—"} />
                    <InfoCard icon={Wallet} label="Wallet" value={`₦${balanceFor(selected.user_id).toLocaleString()}`} />
                    <InfoCard icon={Shield} label="Roles" value={rolesFor(selected.user_id).join(", ") || "user"} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label>Display name</Label><Input value={profileForm.display_name || ""} onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Email</Label><Input value={profileForm.email || ""} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Username</Label><Input value={profileForm.username || ""} onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })} /></div>
                    <div className="space-y-2"><Label>WhatsApp</Label><Input value={profileForm.whatsapp || ""} onChange={(e) => setProfileForm({ ...profileForm, whatsapp: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Bio</Label><Textarea rows={3} value={profileForm.bio || ""} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} /></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label>Avatar URL</Label><Input value={profileForm.avatar_url || ""} onChange={(e) => setProfileForm({ ...profileForm, avatar_url: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Background URL</Label><Input value={profileForm.background_url || ""} onChange={(e) => setProfileForm({ ...profileForm, background_url: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Services (one per line)</Label><Textarea rows={4} value={profileForm.servicesText || ""} onChange={(e) => setProfileForm({ ...profileForm, servicesText: e.target.value })} /></div>
                  <div className="flex items-center gap-2"><Switch checked={profileForm.is_public !== false} onCheckedChange={(v) => setProfileForm({ ...profileForm, is_public: v })} /><Label>Public profile visible</Label></div>
                  <div className="flex justify-end gap-2">
                    <AdjustWalletButton userId={selected.user_id} onDone={() => qc.invalidateQueries({ queryKey: ["admin-all-wallets"] })} />
                    <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>Save profile</Button>
                  </div>
                </TabsContent>

                <TabsContent value="businesses" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />Listings</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Category</TableHead><TableHead>Featured</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {businessesFor(selected.user_id).map((b: any) => <TableRow key={b.id}><TableCell className="font-medium">{b.name}</TableCell><TableCell>{b.status}</TableCell><TableCell>{b.categories?.name || "—"}</TableCell><TableCell>{b.featured ? "Yes" : "No"}</TableCell></TableRow>)}
                          {businessesFor(selected.user_id).length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No business listings</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="activity" className="space-y-4 mt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ListCard title="Blog submissions" items={submissionsFor(selected.user_id)} render={(s: any) => `${s.business_name} · ${s.status}`} />
                    <ListCard title="Ads" items={adsFor(selected.user_id)} render={(a: any) => `${a.title} · ${a.status} · ₦${Number(a.cost_amount || 0).toLocaleString()}`} />
                  </div>
                </TabsContent>

                <TabsContent value="raw" className="space-y-4 mt-4">
                  <Button variant="outline" size="sm" onClick={() => setRawOpen(!rawOpen)}>{rawOpen ? "Hide" : "Show"} raw data</Button>
                  {rawOpen && <pre className="max-h-[55vh] overflow-auto rounded-lg bg-muted p-3 text-[11px] whitespace-pre-wrap">{JSON.stringify({ profile: selected, roles: rolesFor(selected.user_id), wallet: wallets?.find((w: any) => w.user_id === selected.user_id), businesses: businessesFor(selected.user_id), submissions: submissionsFor(selected.user_id), ads: adsFor(selected.user_id) }, null, 2)}</pre>}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function parseServices(text: string) {
  return String(text || "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 30);
}

function InfoCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground flex items-center gap-1"><Icon className="h-3 w-3" />{label}</p><p className="text-sm font-semibold truncate mt-1">{value}</p></div>;
}

function ListCard({ title, items, render }: { title: string; items: any[]; render: (item: any) => string }) {
  return <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4" />{title}</CardTitle></CardHeader><CardContent className="space-y-2">{items.length ? items.map((item) => <div key={item.id} className="rounded-md border p-2 text-sm">{render(item)}</div>) : <p className="text-sm text-muted-foreground">None found</p>}</CardContent></Card>;
}

function AdjustWalletButton({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const adjust = async (sign: 1 | -1) => {
    const n = Number(amount);
    if (!n || n <= 0) { toast.error("Enter an amount"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_adjust_wallet", {
        _user_id: userId, _amount: sign * n, _description: note || (sign > 0 ? "Admin credit" : "Admin debit"),
      });
      if (error) throw error;
      toast.success(`${sign > 0 ? "Credited" : "Debited"} ₦${n.toLocaleString()}`);
      setOpen(false); setAmount(""); setNote(""); onDone();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="h-7 text-[11px]"><Wallet className="h-3 w-3 mr-1" />Wallet</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Adjust wallet</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Amount (₦)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 1000" /></div>
          <div><Label>Note (optional)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason…" /></div>
        </div>
        <DialogFooter className="grid grid-cols-2 gap-2">
          <Button variant="destructive" disabled={busy} onClick={() => adjust(-1)}><Minus className="h-4 w-4 mr-1" />Debit</Button>
          <Button disabled={busy} onClick={() => adjust(1)}><Plus className="h-4 w-4 mr-1" />Credit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
