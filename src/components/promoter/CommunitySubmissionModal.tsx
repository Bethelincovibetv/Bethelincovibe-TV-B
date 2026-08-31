import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Users,
  Eye,
  Globe,
  Sparkles,
  Info,
} from "lucide-react";
import {
  CommunityType,
  COMMUNITY_TYPES,
  WhatsAppCommunity,
  createCommunity,
  updateCommunity,
  uploadCommunityProofScreenshot,
  getCommunityCategories,
} from "@/services/communityService";

interface CommunitySubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  promoterId: string;
  communityToEdit?: WhatsAppCommunity | null;
  onSuccess: (community: WhatsAppCommunity) => void;
}

export default function CommunitySubmissionModal({
  isOpen,
  onClose,
  promoterId,
  communityToEdit,
  onSuccess,
}: CommunitySubmissionModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [communityType, setCommunityType] = useState<CommunityType>("group");
  const [categoryId, setCategoryId] = useState<string>("");
  const [memberCount, setMemberCount] = useState<string>("");
  const [activeDailyViews, setActiveDailyViews] = useState<string>("");
  const [countryPrimary, setCountryPrimary] = useState("Nigeria");
  const [demographicsSummary, setDemographicsSummary] = useState("");

  // Proof screenshot state
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string>("");
  const [existingProofUrl, setExistingProofUrl] = useState<string>("");

  // Categories & UI loading
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (communityToEdit) {
        setName(communityToEdit.name);
        setCommunityType(communityToEdit.community_type);
        setCategoryId(communityToEdit.category_id || "");
        setMemberCount(String(communityToEdit.member_count));
        setActiveDailyViews(String(communityToEdit.active_daily_views || 0));
        setCountryPrimary(communityToEdit.country_primary || "Nigeria");
        setDemographicsSummary(communityToEdit.demographics_summary || "");
        setExistingProofUrl(communityToEdit.proof_screenshot_url);
        setProofPreviewUrl(communityToEdit.proof_screenshot_url);
        setProofFile(null);
      } else {
        // Reset defaults
        setName("");
        setCommunityType("group");
        setCategoryId("");
        setMemberCount("");
        setActiveDailyViews("");
        setCountryPrimary("Nigeria");
        setDemographicsSummary("");
        setProofFile(null);
        setProofPreviewUrl("");
        setExistingProofUrl("");
      }
    }
  }, [isOpen, communityToEdit]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await getCommunityCategories();
      setCategories(data);
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const selectedTypeConfig =
    COMMUNITY_TYPES.find((t) => t.id === communityType) || COMMUNITY_TYPES[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Screenshot file size must be less than 10MB.");
      return;
    }

    setProofFile(file);
    const objectUrl = URL.createObjectURL(file);
    setProofPreviewUrl(objectUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please provide a name for your WhatsApp audience or community.");
      return;
    }

    const parsedCount = parseInt(memberCount, 10);
    if (isNaN(parsedCount) || parsedCount <= 0) {
      toast.error(
        `${selectedTypeConfig.sizeLabel} must be a positive number greater than 0.`
      );
      return;
    }

    const parsedViews = activeDailyViews.trim() ? parseInt(activeDailyViews, 10) : 0;
    if (isNaN(parsedViews) || parsedViews < 0) {
      toast.error("Active daily views cannot be negative.");
      return;
    }

    if (!proofFile && !existingProofUrl) {
      toast.error("Audience proof screenshot is required for verification.");
      return;
    }

    try {
      setIsSubmitting(true);
      let finalProofUrl = existingProofUrl;

      if (proofFile) {
        setUploadProgress(true);
        finalProofUrl = await uploadCommunityProofScreenshot(proofFile, promoterId);
        setUploadProgress(false);
      }

      if (communityToEdit) {
        const updated = await updateCommunity({
          communityId: communityToEdit.id,
          name,
          categoryId: categoryId || null,
          communityType,
          memberCount: parsedCount,
          activeDailyViews: parsedViews,
          countryPrimary,
          demographicsSummary,
          proofScreenshotUrl: finalProofUrl,
        });

        toast.success("Audience details updated successfully!");
        onSuccess(updated);
      } else {
        const created = await createCommunity({
          promoterId,
          name,
          categoryId: categoryId || null,
          communityType,
          memberCount: parsedCount,
          activeDailyViews: parsedViews,
          countryPrimary,
          demographicsSummary,
          proofScreenshotUrl: finalProofUrl,
        });

        toast.success(
          "Submitted! Your WhatsApp audience is pending verification and will be reviewed by admin."
        );
        onSuccess(created);
      }

      onClose();
    } catch (err: any) {
      console.error("Error submitting community:", err);
      toast.error(err.message || "Failed to submit community. Please try again.");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        <DialogHeader className="pb-3 border-b border-border/50">
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-sm">
              💬
            </span>
            {communityToEdit ? "Edit WhatsApp Audience" : "Add WhatsApp Audience / Community"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            List your WhatsApp Group, Channel, or Status audience to receive paid promotion bookings from businesses.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Community Type Selection Cards */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Community Type <span className="text-rose-500">*</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {COMMUNITY_TYPES.map((type) => {
                const isSelected = communityType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setCommunityType(type.id)}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/40"
                        : "bg-card hover:bg-muted/50 border-border/80"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xl">{type.icon}</span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-foreground">{type.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                      {type.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name Field */}
          <div className="space-y-1.5">
            <Label htmlFor="comm_name" className="text-xs font-semibold text-foreground">
              Audience / Community Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="comm_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lagos Fashion Vendors Hub or Tech Enthusiasts NG"
              className="h-10 text-sm font-medium"
              required
            />
          </div>

          {/* Category & Primary Country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="comm_category" className="text-xs font-semibold text-foreground">
                Primary Category
              </Label>
              <select
                id="comm_category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select category (optional)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Primary Country */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="comm_country" className="text-xs font-semibold text-foreground">
                  Primary Country
                </Label>
                <span className="text-[10px] text-muted-foreground font-medium">
                  🇳🇬 Nigeria default
                </span>
              </div>
              <Input
                id="comm_country"
                value={countryPrimary}
                onChange={(e) => setCountryPrimary(e.target.value)}
                placeholder="Nigeria"
                className="h-10 text-sm font-medium"
              />
            </div>
          </div>

          {/* Member Count & Active Daily Views */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Size / Member Count */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="comm_members" className="text-xs font-semibold text-foreground">
                  {selectedTypeConfig.sizeLabel} <span className="text-rose-500">*</span>
                </Label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Must be &gt; 0
                </span>
              </div>
              <div className="relative">
                <Input
                  id="comm_members"
                  type="number"
                  min="1"
                  step="1"
                  value={memberCount}
                  onChange={(e) => setMemberCount(e.target.value)}
                  placeholder={selectedTypeConfig.sizePlaceholder}
                  className="h-10 text-sm font-mono pl-3"
                  required
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Total authentic members or status contact list size.
              </p>
            </div>

            {/* Daily Views */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="comm_views" className="text-xs font-semibold text-foreground">
                  Active Daily Views
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  Min 0
                </span>
              </div>
              <Input
                id="comm_views"
                type="number"
                min="0"
                step="1"
                value={activeDailyViews}
                onChange={(e) => setActiveDailyViews(e.target.value)}
                placeholder="e.g. 850"
                className="h-10 text-sm font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Average views per story/broadcast (optional, helpful for advertisers).
              </p>
            </div>
          </div>

          {/* Demographics Summary */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="comm_demographics" className="text-xs font-semibold text-foreground">
                Audience Demographics Summary (Optional)
              </Label>
              <span className="text-[10px] text-muted-foreground">
                {demographicsSummary.length}/300
              </span>
            </div>
            <Textarea
              id="comm_demographics"
              value={demographicsSummary}
              onChange={(e) => setDemographicsSummary(e.target.value.slice(0, 300))}
              placeholder="e.g. Mostly Lagos & Abuja entrepreneurs, 65% female, ages 20–45 interested in fashion & tech..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          {/* Proof Screenshot Upload */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-primary" />
                Proof Screenshot <span className="text-rose-500">*</span>
              </Label>
              <Badge variant="outline" className="text-[10px] font-medium border-emerald-500/30 text-emerald-600">
                Audience Verification
              </Badge>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                proofPreviewUrl
                  ? "border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10"
                  : "border-border/80 hover:border-primary/60 bg-muted/20"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />

              {proofPreviewUrl ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 text-left">
                  <img
                    src={proofPreviewUrl}
                    alt="Proof preview"
                    className="w-24 h-24 object-cover rounded-lg border shadow-sm"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" /> Screenshot Selected
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Click anywhere on this box to choose a different screenshot.
                    </p>
                    <p className="text-[10px] text-foreground font-mono">
                      {proofFile ? proofFile.name : "Current verified proof file"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-3 flex flex-col items-center justify-center gap-2">
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Click to upload proof screenshot
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Upload a clear screenshot showing group member count, channel subscribers, or WhatsApp status view counts (Max 10MB).
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submission Info Notice */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <p className="text-[11px] leading-relaxed">
              Upon submission, your audience status will be set to <strong>Submitted</strong>. Our verification team reviews member authenticity before publishing it to the Business Promotion Marketplace.
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || uploadProgress || !name.trim() || (!proofFile && !existingProofUrl)}
              className="text-xs font-semibold h-9 px-5 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {uploadProgress ? "Uploading Proof..." : "Submitting..."}
                </>
              ) : communityToEdit ? (
                "Save Audience Changes"
              ) : (
                "Submit For Verification"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
