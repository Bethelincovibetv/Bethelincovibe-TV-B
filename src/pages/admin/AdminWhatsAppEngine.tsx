import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Megaphone,
  Plus,
  Eye,
  Trash2,
  Check,
  X,
  MapPin,
  ExternalLink,
} from "lucide-react";
import {
  INITIAL_VERIFIED_POOL,
  BUSINESS_CATEGORIES,
  LAGOS_LOCATIONS,
  NetworkMember,
  StatusAdBooking,
  getStatusAdBookings,
  updateBookingStatus,
  getConnectionLogs,
} from "@/services/whatsappEngineService";

export default function AdminWhatsAppEngine() {
  const [members, setMembers] = useState<NetworkMember[]>(INITIAL_VERIFIED_POOL);
  const [bookings, setBookings] = useState<StatusAdBooking[]>([]);
  const [newMemberDialog, setNewMemberDialog] = useState(false);
  const [newMember, setNewMember] = useState<Partial<NetworkMember>>({
    name: "",
    businessName: "",
    category: "Tech & Electronics",
    location: "Computer Village, Ikeja",
    phone: "+23480",
    email: "",
    statusViewsEstimate: 1000,
    verified: true,
    openForAds: true,
    ratePerPost: 2500,
    bundlePrice: 6500,
    bio: "",
  });

  useEffect(() => {
    setBookings(getStatusAdBookings());
  }, []);

  const handleAddMember = () => {
    if (!newMember.name || !newMember.businessName || !newMember.phone) {
      toast.error("Please fill in name, business name, and phone number.");
      return;
    }

    const created: NetworkMember = {
      id: `admin-member-${Date.now()}`,
      name: newMember.name!,
      businessName: newMember.businessName!,
      category: newMember.category || "Tech & Electronics",
      location: newMember.location || "Ikeja, Lagos",
      phone: newMember.phone!,
      email: newMember.email || "",
      statusViewsEstimate: Number(newMember.statusViewsEstimate) || 1000,
      verified: true,
      openForAds: !!newMember.openForAds,
      ratePerPost: Number(newMember.ratePerPost) || 2500,
      bundlePrice: Number(newMember.bundlePrice) || 6500,
      bio: newMember.bio || "Verified Lagos Business Contact",
      joinedAt: new Date().toISOString(),
    };

    setMembers([created, ...members]);
    setNewMemberDialog(false);
    toast.success(`Added ${created.name} to the verified exchange pool!`);
  };

  const handleToggleVerify = (id: string) => {
    setMembers(
      members.map((m) => (m.id === id ? { ...m, verified: !m.verified } : m))
    );
    toast.success("Updated member verification status");
  };

  const logs = getConnectionLogs();

  return (
    <div className="space-y-6">
      <Helmet>
        <title>WhatsApp Status Engine Administration | Bethelincovibe TV</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-7 w-7 text-emerald-600" /> WhatsApp Status Engine Admin
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage verified Lagos entrepreneur pool, status ad bookings, and Google Contacts audit logs
          </p>
        </div>

        <Button
          onClick={() => setNewMemberDialog(true)}
          className="rounded-2xl font-extrabold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add Verified Member
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="rounded-3xl p-4 border shadow-xs">
          <span className="text-xs font-bold text-muted-foreground block">Verified Network Pool</span>
          <span className="text-2xl font-black text-foreground">{members.length}</span>
        </Card>
        <Card className="rounded-3xl p-4 border shadow-xs">
          <span className="text-xs font-bold text-muted-foreground block">Total Platform Syncs</span>
          <span className="text-2xl font-black text-emerald-600">{logs.length}</span>
        </Card>
        <Card className="rounded-3xl p-4 border shadow-xs">
          <span className="text-xs font-bold text-muted-foreground block">Active Ad Bookings</span>
          <span className="text-2xl font-black text-indigo-600">{bookings.length}</span>
        </Card>
        <Card className="rounded-3xl p-4 border shadow-xs">
          <span className="text-xs font-bold text-muted-foreground block">NDPR Compliance</span>
          <span className="text-sm font-extrabold text-emerald-600 flex items-center gap-1 mt-1">
            <ShieldCheck className="h-4 w-4" /> 100% Opt-in
          </span>
        </Card>
      </div>

      {/* Bookings Queue */}
      <Card className="rounded-3xl border shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-extrabold text-sm flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-indigo-600" /> Status Ad Verification & Bookings
          </h3>
          <Badge variant="outline" className="text-xs font-bold">
            {bookings.length} Total
          </Badge>
        </div>

        {bookings.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No ad bookings recorded.</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-2xl border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-foreground">{b.campaignTitle}</span>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {b.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5">
                    Creator: <strong className="text-foreground">{b.creatorName}</strong> | Advertiser:{" "}
                    <strong>{b.advertiserName}</strong> ({b.advertiserPhone})
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 italic">
                    "{b.caption}"
                  </p>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  <span className="font-black text-emerald-600">₦{b.totalAmount.toLocaleString()}</span>
                  {b.status === "posted_with_proof" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const updated = updateBookingStatus(b.id, { status: "completed" });
                        setBookings(updated);
                        toast.success("Approved proof and completed payout");
                      }}
                      className="h-8 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                    >
                      <Check className="h-3.5 w-3.5" /> Approve Payout
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Verified Members List */}
      <Card className="rounded-3xl border shadow-xs p-5 space-y-4">
        <h3 className="font-extrabold text-sm border-b pb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-600" /> Exchange Pool Directory
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => (
            <div key={m.id} className="p-4 rounded-2xl border bg-card space-y-2 text-xs">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-extrabold text-foreground">{m.name}</span>
                  <p className="text-primary font-bold">{m.businessName}</p>
                </div>
                <Badge
                  onClick={() => handleToggleVerify(m.id)}
                  className="cursor-pointer text-[9px] font-black"
                  variant={m.verified ? "default" : "secondary"}
                >
                  {m.verified ? "Verified" : "Unverified"}
                </Badge>
              </div>

              <p className="text-muted-foreground text-[11px] line-clamp-2">{m.bio}</p>
              <div className="pt-2 border-t flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{m.location}</span>
                <span className="font-bold text-foreground">
                  {m.statusViewsEstimate.toLocaleString()} Views
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={newMemberDialog} onOpenChange={setNewMemberDialog}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black">Add Verified Lagos Member</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Full Name</Label>
              <Input
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                placeholder="e.g. Babatunde Fashola"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Business Name</Label>
              <Input
                value={newMember.businessName}
                onChange={(e) => setNewMember({ ...newMember, businessName: e.target.value })}
                placeholder="e.g. Lagos Tech Hub"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Phone Number</Label>
                <Input
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  placeholder="+234..."
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Est. Status Views</Label>
                <Input
                  type="number"
                  value={newMember.statusViewsEstimate}
                  onChange={(e) =>
                    setNewMember({ ...newMember, statusViewsEstimate: Number(e.target.value) || 0 })
                  }
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Category</Label>
              <Input
                value={newMember.category}
                onChange={(e) => setNewMember({ ...newMember, category: e.target.value })}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Location</Label>
              <Input
                value={newMember.location}
                onChange={(e) => setNewMember({ ...newMember, location: e.target.value })}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Short Bio</Label>
              <Input
                value={newMember.bio}
                onChange={(e) => setNewMember({ ...newMember, bio: e.target.value })}
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewMemberDialog(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddMember}
              className="rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Save Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
