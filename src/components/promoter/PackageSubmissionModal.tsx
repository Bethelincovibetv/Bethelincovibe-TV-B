import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Package,
  Sparkles,
  Clock,
  Layers,
  Users,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Trash2,
  Lock,
  Radio,
  HelpCircle,
} from "lucide-react";
import {
  PromotionPackage,
  PackageDeliverables,
  createPackage,
  updatePackage,
  validatePackageInput,
  formatNaira,
} from "@/services/packageService";
import { getMyCommunities, WhatsAppCommunity } from "@/services/communityService";

interface PackageSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  promoterId: string;
  packageToEdit?: PromotionPackage | null;
  onNavigateToAudiences?: () => void;
}

export default function PackageSubmissionModal({
  isOpen,
  onClose,
  onSuccess,
  promoterId,
  packageToEdit,
  onNavigateToAudiences,
}: PackageSubmissionModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingCommunities, setFetchingCommunities] = useState(false);
  const [communities, setCommunities] = useState<WhatsAppCommunity[]>([]);

  // Form State
  const [communityId, setCommunityId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number | string>(5000);
  const [durationHours, setDurationHours] = useState<number | string>(24);
  const [maxActiveOrders, setMaxActiveOrders] = useState<number | string>(5);
  const [isActive, setIsActive] = useState(true);

  // Deliverables State
  const [statusPosts, setStatusPosts] = useState<number>(2);
  const [groupBroadcasts, setGroupBroadcasts] = useState<number>(1);
  const [pinDurationHours, setPinDurationHours] = useState<number>(12);
  const [customDeliverables, setCustomDeliverables] = useState<string[]>([]);
  const [newDeliverableText, setNewDeliverableText] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const isEditing = Boolean(packageToEdit);

  // Load verified communities for this promoter
  useEffect(() => {
    if (isOpen && promoterId) {
      loadVerifiedCommunities();
    }
  }, [isOpen, promoterId]);

  const loadVerifiedCommunities = async () => {
    try {
      setFetchingCommunities(true);
      const allComm = await getMyCommunities(promoterId);
      // ONLY verified + published communities qualify
      const verifiedOnly = allComm.filter(
        (c) => c.verification_status === "verified" && c.is_published === true
      );
      setCommunities(verifiedOnly);

      if (packageToEdit) {
        setCommunityId(packageToEdit.community_id);
        setTitle(packageToEdit.title);
        setDescription(packageToEdit.description);
        setPrice(packageToEdit.price);
        setDurationHours(packageToEdit.duration_hours);
        setMaxActiveOrders(packageToEdit.max_active_orders || 5);
        setIsActive(packageToEdit.is_active);

        const deliv = packageToEdit.deliverables || {};
        setStatusPosts(deliv.status_posts ?? 0);
        setGroupBroadcasts(deliv.group_broadcasts ?? 0);
        setPinDurationHours(deliv.pin_duration_hours ?? 0);
        setCustomDeliverables(deliv.custom_deliverables || []);
        setAdditionalNotes(deliv.additional_notes || "");
      } else {
        // Reset form for fresh creation
        setTitle("");
        setDescription("");
        setPrice(5000);
        setDurationHours(24);
        setMaxActiveOrders(5);
        setIsActive(true);
        setStatusPosts(2);
        setGroupBroadcasts(1);
        setPinDurationHours(12);
        setCustomDeliverables([]);
        setNewDeliverableText("");
        setAdditionalNotes("");

        if (verifiedOnly.length > 0) {
          setCommunityId(verifiedOnly[0].id);
        } else {
          setCommunityId("");
        }
      }
    } catch (err: any) {
      console.error("Error fetching verified communities:", err);
      toast.error("Failed to load your verified communities.");
    } finally {
      setFetchingCommunities(false);
    }
  };

  const handleAddCustomDeliverable = () => {
    const trimmed = newDeliverableText.trim();
    if (!trimmed) return;
    if (customDeliverables.includes(trimmed)) {
      toast.info("Deliverable already added.");
      return;
    }
    setCustomDeliverables([...customDeliverables, trimmed]);
    setNewDeliverableText("");
  };

  const handleRemoveCustomDeliverable = (index: number) => {
    setCustomDeliverables(customDeliverables.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoterId) {
      toast.error("Promoter profile not found.");
      return;
    }

    if (!communityId) {
      toast.error("Please select a verified WhatsApp community.");
      return;
    }

    const numericPrice = Number(price);
    const numericDuration = Number(durationHours);
    const numericMaxOrders = Number(maxActiveOrders);

    const deliverablesObj: PackageDeliverables = {
      status_posts: Number(statusPosts) || 0,
      group_broadcasts: Number(groupBroadcasts) || 0,
      pin_duration_hours: Number(pinDurationHours) || 0,
      custom_deliverables: customDeliverables,
      additional_notes: additionalNotes.trim() || undefined,
    };

    const validation = validatePackageInput({
      title,
      description,
      price: numericPrice,
      durationHours: numericDuration,
      maxActiveOrders: numericMaxOrders,
      deliverables: deliverablesObj,
    });

    if (!validation.isValid) {
      toast.error(validation.error || "Please check your package details.");
      return;
    }

    try {
      setLoading(true);

      if (isEditing && packageToEdit) {
        await updatePackage({
          packageId: packageToEdit.id,
          promoterId,
          title,
          description,
          price: numericPrice,
          durationHours: numericDuration,
          deliverables: deliverablesObj,
          maxActiveOrders: numericMaxOrders,
          isActive,
        });
        toast.success("Promotion package updated successfully!");
      } else {
        await createPackage({
          promoterId,
          communityId,
          title,
          description,
          price: numericPrice,
          durationHours: numericDuration,
          deliverables: deliverablesObj,
          maxActiveOrders: numericMaxOrders,
          isActive,
        });
        toast.success("Promotion package created and ready for marketplace discovery!");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error saving package:", err);
      toast.error(err.message || "Failed to save promotion package.");
    } finally {
      setLoading(false);
    }
  };

  const hasNoVerifiedCommunities = !fetchingCommunities && communities.length === 0 && !isEditing;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <Package className="w-5 h-5" />
            </div>
            <Badge
              variant="outline"
              className="font-semibold text-[10px] uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
            >
              Step 4: Package Architecture
            </Badge>
          </div>
          <DialogTitle className="text-lg sm:text-xl font-bold mt-2">
            {isEditing ? "Edit Promotion Package" : "Create New Promotion Package"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Configure your advertising offer, pricing in Naira (₦), duration, and WhatsApp deliverables.
          </DialogDescription>
        </DialogHeader>

        {/* Empty Verified Community Warning */}
        {hasNoVerifiedCommunities ? (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-3 mt-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Verified Community Required</p>
                <p className="text-[12px] leading-relaxed text-amber-800/90 dark:text-amber-300/90 mt-1">
                  You currently have no verified & published WhatsApp communities. Packages can only be created for communities approved by platform administrators to ensure advertiser protection.
                </p>
              </div>
            </div>
            <div className="pt-1 flex items-center gap-2">
              {onNavigateToAudiences && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onNavigateToAudiences();
                  }}
                  className="h-8 text-xs border-amber-500/40 hover:bg-amber-500/20"
                >
                  <Users className="w-3.5 h-3.5 mr-1" /> View Audiences & Submit for Review
                </Button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {/* Target Community Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="package_community" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Target WhatsApp Community <span className="text-rose-500">*</span>
                </label>
                {isEditing && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Community locked
                  </span>
                )}
              </div>

              {isEditing ? (
                <div className="p-3 rounded-xl bg-muted/60 border border-border flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {packageToEdit?.community?.name || "Linked Community"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {packageToEdit?.community?.member_count?.toLocaleString()} members •{" "}
                      {packageToEdit?.community?.community_type?.replace("_", " ")}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                    Verified
                  </Badge>
                </div>
              ) : (
                <select
                  id="package_community"
                  value={communityId}
                  onChange={(e) => setCommunityId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  required
                >
                  {communities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.member_count.toLocaleString()} members • {c.community_type.replace("_", " ")})
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-muted-foreground">
                Only verified and published audiences can host commercial promotion packages.
              </p>
            </div>

            {/* Package Title */}
            <div className="space-y-2">
              <label htmlFor="package_title" className="text-xs font-semibold text-foreground">
                Package Title <span className="text-rose-500">*</span>
              </label>
              <Input
                id="package_title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 24hr Status + Group Broadcast Deal"
                className="h-10 text-sm font-medium"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="package_description" className="text-xs font-semibold text-foreground">
                Package Description & Guidelines <span className="text-rose-500">*</span>
              </label>
              <Textarea
                id="package_description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what advertisers should expect, prime posting windows, niche relevance, content rules, and expected reach..."
                rows={3}
                className="text-xs sm:text-sm resize-none"
                required
              />
            </div>

            {/* Price & Duration Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Price in Naira */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="package_price" className="text-xs font-semibold text-foreground">
                    Package Price (₦) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {formatNaira(Number(price) || 0)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">₦</span>
                  <Input
                    id="package_price"
                    type="number"
                    min={500}
                    step={100}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="pl-7 h-10 text-sm font-semibold"
                    required
                  />
                </div>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Minimum price is ₦500.
                </p>
              </div>

              {/* Duration Hours */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="package_duration" className="text-xs font-semibold text-foreground">
                    Campaign Duration <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {Number(durationHours) || 0} Hours
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {[12, 24, 48, 72].map((hours) => (
                    <Button
                      key={hours}
                      type="button"
                      size="sm"
                      variant={Number(durationHours) === hours ? "default" : "outline"}
                      className={`h-10 text-xs px-2.5 flex-1 ${
                        Number(durationHours) === hours
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : ""
                      }`}
                      onClick={() => setDurationHours(hours)}
                    >
                      {hours}h
                    </Button>
                  ))}
                  <Input
                    id="package_duration"
                    type="number"
                    min={1}
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    className="w-16 h-10 text-xs text-center font-medium"
                    title="Custom hours"
                  />
                </div>
              </div>
            </div>

            {/* Deliverables Builder */}
            <div className="p-4 rounded-xl bg-card border border-border/80 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Deliverables Breakdown
                </h4>
                <span className="text-[11px] text-muted-foreground font-medium">
                  WhatsApp Ad Inventory
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Status Posts */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1.5">
                  <label htmlFor="deliv_status_posts" className="text-[11px] font-semibold text-foreground block">
                    Status Posts
                  </label>
                  <Input
                    id="deliv_status_posts"
                    type="number"
                    min={0}
                    max={20}
                    value={statusPosts}
                    onChange={(e) => setStatusPosts(Number(e.target.value))}
                    className="h-8 text-xs font-semibold"
                  />
                  <p className="text-[10px] text-muted-foreground">Stories published</p>
                </div>

                {/* Group Broadcasts */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1.5">
                  <label htmlFor="deliv_group_broadcasts" className="text-[11px] font-semibold text-foreground block">
                    Group Broadcasts
                  </label>
                  <Input
                    id="deliv_group_broadcasts"
                    type="number"
                    min={0}
                    max={20}
                    value={groupBroadcasts}
                    onChange={(e) => setGroupBroadcasts(Number(e.target.value))}
                    className="h-8 text-xs font-semibold"
                  />
                  <p className="text-[10px] text-muted-foreground">Messages posted</p>
                </div>

                {/* Pin Duration */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1.5">
                  <label htmlFor="deliv_pin_duration" className="text-[11px] font-semibold text-foreground block">
                    Pin Duration (Hours)
                  </label>
                  <Input
                    id="deliv_pin_duration"
                    type="number"
                    min={0}
                    max={168}
                    value={pinDurationHours}
                    onChange={(e) => setPinDurationHours(Number(e.target.value))}
                    className="h-8 text-xs font-semibold"
                  />
                  <p className="text-[10px] text-muted-foreground">Pinned at chat top</p>
                </div>
              </div>

              {/* Custom Deliverables Tags */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <label className="text-[11px] font-semibold text-foreground block">
                  Additional Included Deliverables
                </label>
                <div className="flex gap-2">
                  <Input
                    value={newDeliverableText}
                    onChange={(e) => setNewDeliverableText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomDeliverable();
                      }
                    }}
                    placeholder="e.g. Clickable website link in status caption"
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddCustomDeliverable}
                    className="h-8 text-xs px-2.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                  </Button>
                </div>

                {customDeliverables.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {customDeliverables.map((item, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-[11px] py-0.5 pl-2 pr-1 gap-1 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomDeliverable(idx)}
                          className="hover:text-rose-500 p-0.5 rounded"
                          title="Remove deliverable"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Max Active Orders & Active Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-center">
              <div className="space-y-1">
                <label htmlFor="package_max_orders" className="text-xs font-semibold text-foreground">
                  Max Active Orders
                </label>
                <Input
                  id="package_max_orders"
                  type="number"
                  min={1}
                  max={50}
                  value={maxActiveOrders}
                  onChange={(e) => setMaxActiveOrders(e.target.value)}
                  className="h-9 text-xs font-medium"
                />
                <p className="text-[10px] text-muted-foreground">
                  Prevents audience fatigue by capping concurrent promotions.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                <div>
                  <p className="text-xs font-semibold text-foreground">Package Status</p>
                  <p className="text-[11px] text-muted-foreground">
                    {isActive ? "Active (Visible on marketplace)" : "Paused (Hidden from booking)"}
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-3 border-t border-border/50">
              <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4"
              >
                {loading ? "Saving Package..." : isEditing ? "Update Package" : "Publish Package Offer"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
