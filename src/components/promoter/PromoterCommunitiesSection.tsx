import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  WhatsAppCommunity,
  getMyCommunities,
  deleteCommunity,
  COMMUNITY_TYPES,
  canEditCommunity,
} from "@/services/communityService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Eye,
  Plus,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileSearch,
  ExternalLink,
  Edit3,
  Trash2,
  Share2,
  Sparkles,
  Smartphone,
  Globe,
  Radio,
  Image as ImageIcon,
  CheckCircle2,
  Lock,
} from "lucide-react";
import CommunitySubmissionModal from "./CommunitySubmissionModal";

interface PromoterCommunitiesSectionProps {
  promoterId: string;
}

export default function PromoterCommunitiesSection({ promoterId }: PromoterCommunitiesSectionProps) {
  const [communities, setCommunities] = useState<WhatsAppCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [communityToEdit, setCommunityToEdit] = useState<WhatsAppCommunity | null>(null);
  const [viewProofUrl, setViewProofUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (promoterId) {
      loadCommunities();
    }
  }, [promoterId]);

  const loadCommunities = async () => {
    try {
      setLoading(true);
      const data = await getMyCommunities(promoterId);
      setCommunities(data);
    } catch (err: any) {
      console.error("Failed to load promoter communities:", err);
      toast.error("Failed to load WhatsApp audiences.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setCommunityToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (community: WhatsAppCommunity) => {
    const editCheck = canEditCommunity(community);
    if (!editCheck.allowed) {
      toast.error(editCheck.reason || "This audience is verified and cannot be edited directly.");
      return;
    }
    setCommunityToEdit(community);
    setIsModalOpen(true);
  };

  const handleDelete = async (community: WhatsAppCommunity) => {
    if (!window.confirm(`Are you sure you want to delete "${community.name}"?`)) {
      return;
    }

    try {
      setDeletingId(community.id);
      await deleteCommunity(community.id);
      setCommunities((prev) => prev.filter((c) => c.id !== community.id));
      toast.success("Community removed successfully.");
    } catch (err: any) {
      console.error("Error deleting community:", err);
      toast.error(err.message || "Failed to delete community.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleModalSuccess = (saved: WhatsAppCommunity) => {
    setCommunities((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  };

  const getStatusBadge = (status: WhatsAppCommunity["verification_status"]) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 flex items-center gap-1 font-semibold text-xs px-2.5 py-0.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Verified
          </Badge>
        );
      case "under_review":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 flex items-center gap-1 font-semibold text-xs px-2.5 py-0.5 animate-pulse">
            <FileSearch className="w-3.5 h-3.5" /> Under Review
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 flex items-center gap-1 font-semibold text-xs px-2.5 py-0.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Rejected
          </Badge>
        );
      case "suspended":
        return (
          <Badge className="bg-zinc-500/20 text-zinc-700 dark:text-zinc-300 border-zinc-500/30 flex items-center gap-1 font-semibold text-xs px-2.5 py-0.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Suspended
          </Badge>
        );
      case "submitted":
      default:
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 flex items-center gap-1 font-semibold text-xs px-2.5 py-0.5">
            <Clock className="w-3.5 h-3.5" /> Not Yet Reviewed
          </Badge>
        );
    }
  };

  const getTypeBadge = (type: WhatsAppCommunity["community_type"]) => {
    const config = COMMUNITY_TYPES.find((t) => t.id === type);
    return (
      <Badge variant="secondary" className="text-xs font-medium gap-1 bg-muted">
        <span>{config?.icon || "💬"}</span>
        <span>{config?.shortLabel || type}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              My Promotion Audiences
            </h2>
            <Badge variant="outline" className="text-xs font-mono">
              {communities.length} {communities.length === 1 ? "Audience" : "Audiences"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submit and manage your verified WhatsApp groups, channels, and status channels for business campaigns.
          </p>
        </div>

        <Button
          onClick={handleOpenAddModal}
          size="sm"
          className="gap-1.5 font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add WhatsApp Audience
        </Button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="p-8 border border-border/60 rounded-2xl bg-card flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-600 animate-spin" />
          <p className="text-xs text-muted-foreground">Loading your WhatsApp audiences...</p>
        </div>
      ) : communities.length === 0 ? (
        /* Empty State */
        <Card className="border-dashed border-2 border-border/80 bg-muted/10">
          <CardContent className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-3xl shadow-sm border border-emerald-500/20">
              💬
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="text-base font-bold text-foreground">
                No WhatsApp Audiences Registered Yet
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect your WhatsApp Group, Channel, or Status contact audience. Upload proof of your active members and start getting paid bookings from Nigerian and international brands.
              </p>
            </div>
            <Button
              onClick={handleOpenAddModal}
              className="gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow"
            >
              <Plus className="w-4 h-4" /> Register Your First Audience
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Communities Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {communities.map((comm) => {
            const typeConfig = COMMUNITY_TYPES.find((t) => t.id === comm.community_type);
            const isEditable = comm.verification_status !== "verified";

            return (
              <Card
                key={comm.id}
                className="border-border/70 bg-card/90 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between overflow-hidden"
              >
                {/* Top status bar accent */}
                <div
                  className={`h-1.5 w-full ${
                    comm.verification_status === "verified"
                      ? "bg-emerald-500"
                      : comm.verification_status === "under_review"
                      ? "bg-blue-500"
                      : comm.verification_status === "rejected"
                      ? "bg-rose-500"
                      : comm.verification_status === "suspended"
                      ? "bg-zinc-500"
                      : "bg-amber-500"
                  }`}
                />

                <CardContent className="p-5 space-y-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getTypeBadge(comm.community_type)}
                        {comm.category && (
                          <Badge variant="outline" className="text-[11px] font-normal">
                            {comm.category.name}
                          </Badge>
                        )}
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                          <Globe className="w-3 h-3" /> {comm.country_primary}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-foreground pt-1">{comm.name}</h3>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {getStatusBadge(comm.verification_status)}
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {comm.is_published ? "🟢 Published" : "⚪ Unpublished"}
                      </span>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/40 border border-border/50">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                        {typeConfig?.sizeLabel || "Audience Size"}
                      </span>
                      <span className="text-base font-bold text-foreground font-mono">
                        {Number(comm.member_count).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                        Daily Views
                      </span>
                      <span className="text-base font-bold text-foreground font-mono">
                        {comm.active_daily_views > 0
                          ? Number(comm.active_daily_views).toLocaleString()
                          : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Demographics if provided */}
                  {comm.demographics_summary && (
                    <div className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/40">
                      <span className="font-semibold text-foreground text-[11px] block mb-0.5">
                        Demographics:
                      </span>
                      <p className="line-clamp-2 leading-relaxed">{comm.demographics_summary}</p>
                    </div>
                  )}

                  {/* Rejection notice if rejected */}
                  {comm.verification_status === "rejected" && comm.rejection_reason && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        <span>Rejection Reason:</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">{comm.rejection_reason}</p>
                    </div>
                  )}

                  {/* Verified & Published Locked notice */}
                  {comm.verification_status === "verified" && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Verified Community</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-emerald-800/90 dark:text-emerald-300/90">
                        This audience is verified and cannot be edited directly. Contact an administrator if important information needs to be changed.
                      </p>
                    </div>
                  )}

                  {/* Suspended notice if suspended */}
                  {comm.verification_status === "suspended" && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>Audience Suspended:</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        This audience has been temporarily suspended from public discovery by administration. Please contact support if you believe this is in error.
                      </p>
                    </div>
                  )}

                  {/* Card Actions & Footer */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] text-muted-foreground">
                      Submitted: {new Date(comm.created_at).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Proof button */}
                      {comm.proof_screenshot_url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setViewProofUrl(comm.proof_screenshot_url)}
                          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                        >
                          <ImageIcon className="w-3.5 h-3.5" /> Proof
                        </Button>
                      )}

                      {/* Edit or Locked status */}
                      {comm.verification_status === "verified" ? (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted/60 text-muted-foreground text-[11px] font-medium border border-border/50 select-none">
                          <Lock className="w-3 h-3 text-muted-foreground" />
                          <span>Locked</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditModal(comm)}
                          className="h-8 px-2.5 text-xs gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </Button>
                      )}

                      {/* Delete button (for non-verified or rejected) */}
                      {comm.verification_status !== "verified" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={deletingId === comm.id}
                          onClick={() => handleDelete(comm)}
                          className="h-8 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Submission / Edit Modal */}
      {promoterId && (
        <CommunitySubmissionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          promoterId={promoterId}
          communityToEdit={communityToEdit}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Proof Lightbox Dialog */}
      <Dialog open={!!viewProofUrl} onOpenChange={() => setViewProofUrl(null)}>
        <DialogContent className="max-w-lg p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" /> Audience Proof Screenshot
            </DialogTitle>
          </DialogHeader>
          {viewProofUrl && (
            <div className="rounded-xl overflow-hidden border bg-black/5 flex items-center justify-center max-h-[70vh]">
              <img
                src={viewProofUrl}
                alt="Audience proof"
                className="max-h-[68vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
