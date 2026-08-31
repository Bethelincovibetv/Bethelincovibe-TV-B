import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  PromotionPackage,
  getMyPackages,
  togglePackageActive,
  deletePackage,
  formatNaira,
} from "@/services/packageService";
import { getMyCommunities, WhatsAppCommunity } from "@/services/communityService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Package,
  Plus,
  Edit3,
  Trash2,
  Clock,
  Layers,
  Users,
  ShieldCheck,
  Radio,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Smartphone,
  Eye,
  Power,
} from "lucide-react";
import PackageSubmissionModal from "./PackageSubmissionModal";

interface PromoterPackagesSectionProps {
  promoterId: string;
  onNavigateToAudiences?: () => void;
}

export default function PromoterPackagesSection({
  promoterId,
  onNavigateToAudiences,
}: PromoterPackagesSectionProps) {
  const [packages, setPackages] = useState<PromotionPackage[]>([]);
  const [verifiedCommunities, setVerifiedCommunities] = useState<WhatsAppCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [packageToEdit, setPackageToEdit] = useState<PromotionPackage | null>(null);

  // Delete confirmation state
  const [packageToDelete, setPackageToDelete] = useState<PromotionPackage | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (promoterId) {
      loadData();
    }
  }, [promoterId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pkgs, comms] = await Promise.all([
        getMyPackages(promoterId),
        getMyCommunities(promoterId),
      ]);
      setPackages(pkgs);
      const verified = comms.filter(
        (c) => c.verification_status === "verified" && c.is_published === true
      );
      setVerifiedCommunities(verified);
    } catch (err: any) {
      console.error("Error loading packages data:", err);
      toast.error("Failed to load promotion packages.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setPackageToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pkg: PromotionPackage) => {
    setPackageToEdit(pkg);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (pkg: PromotionPackage) => {
    const nextState = !pkg.is_active;
    try {
      await togglePackageActive(pkg.id, nextState, promoterId);
      setPackages((prev) =>
        prev.map((p) => (p.id === pkg.id ? { ...p, is_active: nextState } : p))
      );
      toast.success(
        nextState
          ? `"${pkg.title}" is now active and ready for marketplace discovery!`
          : `"${pkg.title}" has been paused.`
      );
    } catch (err: any) {
      console.error("Error toggling package active state:", err);
      toast.error(err.message || "Failed to update package status.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!packageToDelete) return;
    try {
      setDeleting(true);
      await deletePackage(packageToDelete.id, promoterId);
      setPackages((prev) => prev.filter((p) => p.id !== packageToDelete.id));
      toast.success("Promotion package removed successfully.");
      setPackageToDelete(null);
    } catch (err: any) {
      console.error("Error deleting package:", err);
      toast.error(err.message || "Failed to delete package.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredPackages = packages.filter((pkg) => {
    if (filter === "active") return pkg.is_active;
    if (filter === "inactive") return !pkg.is_active;
    return true;
  });

  const hasNoVerifiedCommunities = verifiedCommunities.length === 0;

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              Promotion Packages
            </h2>
            <Badge variant="outline" className="font-semibold text-xs bg-muted/60">
              {packages.length} Total
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Create and manage commercial ad bundles tied to your verified WhatsApp audiences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreateModal}
            className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Package
          </Button>
        </div>
      </div>

      {/* Verified Communities Alert Banner if 0 exist */}
      {hasNoVerifiedCommunities && !loading && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">
                  Verified WhatsApp Community Required
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                  To protect business advertisers, promotion packages can only be attached to verified & published WhatsApp communities. Submit your WhatsApp group, channel, or status audience for review first.
                </p>
              </div>
            </div>
            {onNavigateToAudiences && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onNavigateToAudiences}
                className="shrink-0 text-xs border-amber-500/40 hover:bg-amber-500/10 font-semibold"
              >
                <Users className="w-3.5 h-3.5 mr-1.5" /> Manage Audiences
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      {packages.length > 0 && (
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border w-fit">
          <Button
            type="button"
            size="sm"
            variant={filter === "all" ? "default" : "ghost"}
            className={`h-7 px-3 text-xs font-medium rounded-lg ${
              filter === "all" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
            }`}
            onClick={() => setFilter("all")}
          >
            All ({packages.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "active" ? "default" : "ghost"}
            className={`h-7 px-3 text-xs font-medium rounded-lg ${
              filter === "active" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
            }`}
            onClick={() => setFilter("active")}
          >
            Active ({packages.filter((p) => p.is_active).length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "inactive" ? "default" : "ghost"}
            className={`h-7 px-3 text-xs font-medium rounded-lg ${
              filter === "inactive" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
            }`}
            onClick={() => setFilter("inactive")}
          >
            Paused ({packages.filter((p) => !p.is_active).length})
          </Button>
        </div>
      )}

      {/* Packages Grid / List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse p-6 border-border">
              <div className="h-6 bg-muted rounded w-2/3 mb-4" />
              <div className="h-4 bg-muted rounded w-1/3 mb-6" />
              <div className="h-16 bg-muted/60 rounded mb-4" />
              <div className="h-8 bg-muted rounded w-full" />
            </Card>
          ))}
        </div>
      ) : filteredPackages.length === 0 ? (
        <Card className="border-dashed border-2 border-border/80 bg-card/40">
          <CardContent className="p-8 sm:p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-base font-bold text-foreground">
                {packages.length === 0
                  ? "No Promotion Packages Created Yet"
                  : "No Packages Match Filter"}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {packages.length === 0
                  ? "Packages define the exact WhatsApp promotional services you provide, such as status posts, group broadcast blasts, and pinned messages."
                  : "Try switching your active status filter above."}
              </p>
            </div>
            {packages.length === 0 && (
              <Button
                type="button"
                size="sm"
                onClick={handleOpenCreateModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 gap-1.5"
              >
                <Plus className="w-4 h-4" /> Create Your First Package
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <AnimatePresence>
            {filteredPackages.map((pkg) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={`border transition-all duration-200 h-full flex flex-col justify-between ${
                    pkg.is_active
                      ? "border-border/80 hover:border-emerald-500/40 bg-card shadow-sm"
                      : "border-border/50 bg-muted/20 opacity-80"
                  }`}
                >
                  <CardHeader className="p-5 pb-3">
                    {/* Top Row: Community Pill & Status Badge */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium max-w-[200px] truncate">
                        <Users className="w-3 h-3 shrink-0 text-emerald-600" />
                        <span className="truncate">
                          {pkg.community?.name || "Verified Audience"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            pkg.is_active
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {pkg.is_active ? "Active" : "Paused"}
                        </Badge>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <CardTitle className="text-base font-bold text-foreground leading-snug">
                      {pkg.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {pkg.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 space-y-4 flex-1 flex flex-col justify-between">
                    {/* Price & Duration Strip */}
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Price (NGN)
                        </span>
                        <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                          {formatNaira(pkg.price)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Duration
                        </span>
                        <span className="text-xs font-bold text-foreground flex items-center gap-1 justify-end">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          {pkg.duration_hours} Hours
                        </span>
                      </div>
                    </div>

                    {/* Deliverables Breakdown */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" /> Deliverables Included
                      </span>
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {pkg.deliverables?.status_posts ? (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-medium"
                          >
                            📱 {pkg.deliverables.status_posts} Status Post
                            {pkg.deliverables.status_posts > 1 ? "s" : ""}
                          </Badge>
                        ) : null}

                        {pkg.deliverables?.group_broadcasts ? (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-medium"
                          >
                            📢 {pkg.deliverables.group_broadcasts} Group Broadcast
                            {pkg.deliverables.group_broadcasts > 1 ? "s" : ""}
                          </Badge>
                        ) : null}

                        {pkg.deliverables?.pin_duration_hours ? (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-medium"
                          >
                            📌 {pkg.deliverables.pin_duration_hours}-Hour Pin
                          </Badge>
                        ) : null}

                        {pkg.deliverables?.custom_deliverables?.map((item, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-[11px] font-medium bg-background text-foreground border-border/80"
                          >
                            ✨ {item}
                          </Badge>
                        ))}
                      </div>

                      {pkg.deliverables?.additional_notes && (
                        <p className="text-[11px] text-muted-foreground italic line-clamp-1 pt-1">
                          "{pkg.deliverables.additional_notes}"
                        </p>
                      )}
                    </div>

                    {/* Actions Footer */}
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 mt-auto">
                      {/* Active Toggle */}
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={pkg.is_active}
                          onCheckedChange={() => handleToggleActive(pkg)}
                          aria-label="Toggle active status"
                        />
                        <span className="text-xs text-muted-foreground font-medium select-none">
                          {pkg.is_active ? "Live" : "Paused"}
                        </span>
                      </div>

                      {/* Edit & Delete Buttons */}
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditModal(pkg)}
                          className="h-8 px-2.5 text-xs gap-1 font-medium"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPackageToDelete(pkg)}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                          title="Delete package"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Package Creation / Edit Modal */}
      <PackageSubmissionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        promoterId={promoterId}
        packageToEdit={packageToEdit}
        onNavigateToAudiences={onNavigateToAudiences}
      />

      {/* Delete Confirmation Modal */}
      {packageToDelete && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-border shadow-lg animate-in fade-in zoom-in-95">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-500" />
                Delete Promotion Package?
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Are you sure you want to permanently delete "{packageToDelete.title}"? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-2 flex items-center justify-end gap-2 border-t border-border/50">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setPackageToDelete(null)}
                disabled={deleting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="text-xs font-semibold"
              >
                {deleting ? "Deleting..." : "Delete Package"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
