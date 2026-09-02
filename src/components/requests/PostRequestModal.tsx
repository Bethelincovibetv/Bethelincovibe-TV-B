import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  CheckCircle2,
  Edit3,
  Send,
  Loader2,
  Clock,
  Coins,
  MapPin,
  Bot,
  Zap,
  ArrowRight,
  ShieldCheck,
  Building2,
  HelpCircle,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { parseNaturalRequest } from "@/services/aiRequestParserService";
import { createAndPublishRequest } from "@/services/opportunityMatchingService";
import { ExtractedRequestInfo, POPULAR_REQUEST_CATEGORIES, MatchingBusinessCandidate } from "@/types/opportunityMatching";
import { toast } from "sonner";
import mayaAvatar from "@/assets/images/ai_match_avatar_1788303151852.jpg";

interface PostRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt?: string;
  defaultCategory?: string;
}

const SAMPLE_PROMPTS = [
  "I'm looking for a graphic designer to create a professional flyer for my business. I need it before Friday and my budget is ₦20,000.",
  "Need an e-commerce website with Paystack checkout for my fashion brand in Lekki. Budget ₦150,000.",
  "Urgent catering for 50 guests corporate luncheon in Ikeja tomorrow afternoon. Budget ₦85,000.",
  "Looking for a reliable dispatch rider for same-day deliveries across Lagos mainland. Budget ₦15,000/day.",
  "Need a CAC business registration lawyer to register my Limited Liability Company. Budget ₦50,000.",
];

export default function PostRequestModal({
  open,
  onOpenChange,
  initialPrompt = "",
  defaultCategory,
}: PostRequestModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [prompt, setPrompt] = useState(initialPrompt);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedRequestInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [matchedResults, setMatchedResults] = useState<{ count: number; candidates: MatchingBusinessCandidate[] } | null>(null);
  const [successRequestId, setSuccessRequestId] = useState<string | null>(null);

  // Edit overrides
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editDeadline, setEditDeadline] = useState("");

  useEffect(() => {
    if (initialPrompt && open) {
      setPrompt(initialPrompt);
      handleAnalyze(initialPrompt);
    }
  }, [initialPrompt, open]);

  const handleAnalyze = async (textToParse?: string) => {
    const text = textToParse || prompt;
    if (!text.trim() || text.trim().length < 5) {
      toast.error("Please describe what you need in a few words.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await parseNaturalRequest(text);
      setExtracted(result);
      setEditTitle(result.serviceTitle);
      setEditCategory(result.category);
      setEditBudget(result.budgetFormatted);
      setEditDeadline(result.deadline);
      setIsEditing(false);
    } catch (err) {
      toast.error("Could not parse request. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePublish = async () => {
    if (!extracted) return;

    if (!user) {
      toast.error("Please log in or register to publish your request and receive provider offers.");
      navigate("/login?redirect=/requests/post");
      onOpenChange(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const finalInfo: ExtractedRequestInfo = {
        ...extracted,
        serviceTitle: isEditing ? editTitle : extracted.serviceTitle,
        category: isEditing ? editCategory : extracted.category,
        budgetFormatted: isEditing ? editBudget : extracted.budgetFormatted,
        deadline: isEditing ? editDeadline : extracted.deadline,
      };

      const userDisplayName = user.user_metadata?.display_name || user.user_metadata?.full_name || (user.email ? user.email.split("@")[0] : "Entrepreneur");

      const { request, matchedCandidates } = await createAndPublishRequest({
        userId: user.id,
        userName: userDisplayName,
        userAvatar: user.user_metadata?.avatar_url,
        userPhone: user.user_metadata?.phone,
        userEmail: user.email,
        rawPrompt: prompt,
        extractedInfo: finalInfo,
      });

      setMatchedResults({ count: matchedCandidates.length, candidates: matchedCandidates });
      setSuccessRequestId(request.id);
      toast.success("✅ Request published! Matching providers have been notified.");
    } catch (err: any) {
      toast.error(err.message || "Failed to publish request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setPrompt("");
    setExtracted(null);
    setIsEditing(false);
    setMatchedResults(null);
    setSuccessRequestId(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border border-primary/20 shadow-2xl bg-card">
        {/* Header with Maya AI Branding */}
        <div className="bg-gradient-to-r from-primary via-primary/95 to-accent p-5 text-white relative">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={mayaAvatar}
                alt="Maya AI Match"
                className="w-12 h-12 rounded-full object-cover ring-2 ring-white/50 shadow-md"
              />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-primary rounded-full animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-extrabold text-white tracking-tight">
                  I Need Something
                </DialogTitle>
                <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold px-2">
                  <Sparkles className="w-3 h-3 mr-1" /> Smart AI Match
                </Badge>
              </div>
              <DialogDescription className="text-white/80 text-xs mt-0.5">
                Describe what you need in plain words. We’ll extract the details & connect you with verified providers.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5">
          {/* STATE 1: Success State */}
          {successRequestId && (
            <div className="text-center py-6 px-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-foreground">
                  Your Request is Live! 🎉
                </h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Maya has analyzed your request and matched it with{" "}
                  <span className="font-bold text-primary">
                    {matchedResults?.count || 4} verified businesses
                  </span>
                  . They have received instant notifications and will submit offers shortly.
                </p>
              </div>

              {matchedResults && matchedResults.candidates.length > 0 && (
                <div className="bg-muted/40 rounded-xl p-3 text-left border border-border/50 max-w-md mx-auto space-y-2">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" /> Matched Providers Pool:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {matchedResults.candidates.slice(0, 4).map((c) => (
                      <Badge key={c.businessId} variant="outline" className="bg-card text-xs font-semibold py-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-500 mr-1" />
                        {c.businessName} ({c.matchScore}% match)
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/dashboard/my-requests/${successRequestId}`);
                  }}
                  className="font-bold shadow-md gap-2"
                >
                  View Request & Offers <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    handleReset();
                  }}
                  className="font-semibold"
                >
                  Post Another Request
                </Button>
              </div>
            </div>
          )}

          {/* STATE 2: Prompt Input & Analysis */}
          {!successRequestId && !extracted && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="request-prompt" className="text-sm font-bold flex items-center justify-between">
                  <span>What are you looking for?</span>
                  <span className="text-xs font-normal text-muted-foreground">Type naturally in plain English</span>
                </Label>
                <Textarea
                  id="request-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. I'm looking for a graphic designer to create a professional flyer for my business. I need it before Friday and my budget is ₦20,000."
                  className="min-h-[120px] resize-none text-base p-3.5 rounded-xl border-primary/30 focus-visible:ring-primary shadow-xs"
                />
              </div>

              {/* Sample Quick Prompt Chips */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" /> Quick Examples:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_PROMPTS.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPrompt(sample);
                        handleAnalyze(sample);
                      }}
                      className="text-xs bg-secondary/80 hover:bg-primary/10 hover:text-primary text-foreground/80 px-2.5 py-1.5 rounded-lg border border-border/50 text-left transition-all active:scale-95 truncate max-w-[280px]"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => handleAnalyze()}
                  disabled={isAnalyzing || !prompt.trim()}
                  className="w-full h-11 text-base font-bold shadow-md gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Understanding Request with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Analyze & Find Providers
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STATE 3: AI Confirmation Card */}
          {!successRequestId && extracted && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-1 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-foreground">Your Request Overview</span>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                    {extracted.category}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="h-8 text-xs font-bold text-primary gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" /> {isEditing ? "Done Editing" : "Edit Details"}
                </Button>
              </div>

              {/* Confirmation Preview or Edit Form */}
              {!isEditing ? (
                <div className="bg-muted/40 rounded-xl p-4 border border-border space-y-3.5">
                  <div>
                    <h4 className="text-base font-extrabold text-foreground leading-snug">
                      {extracted.serviceTitle}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Purpose: {extracted.purpose}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="bg-card p-2.5 rounded-lg border border-border/70 flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600">
                        <Coins className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground font-semibold">Budget</div>
                        <div className="font-extrabold text-foreground">{extracted.budgetFormatted}</div>
                      </div>
                    </div>

                    <div className="bg-card p-2.5 rounded-lg border border-border/70 flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground font-semibold">Deadline</div>
                        <div className="font-extrabold text-foreground">{extracted.deadline}</div>
                      </div>
                    </div>

                    <div className="bg-card p-2.5 rounded-lg border border-border/70 flex items-center gap-2 col-span-2 sm:col-span-1">
                      <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground font-semibold">Location</div>
                        <div className="font-extrabold text-foreground truncate">{extracted.locationPreference}</div>
                      </div>
                    </div>
                  </div>

                  {extracted.specificRequirements.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Deliverables & Scope:
                      </div>
                      <ul className="space-y-1 text-xs text-foreground/90">
                        {extracted.specificRequirements.map((req, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-primary font-bold">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {extracted.clarificationQuestion && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Helpful Tip:</span> {extracted.clarificationQuestion}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 bg-muted/40 p-3.5 rounded-xl border border-border">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Request Title</Label>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Budget (₦)</Label>
                      <Input
                        value={editBudget}
                        onChange={(e) => setEditBudget(e.target.value)}
                        placeholder="e.g. ₦20,000"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Deadline</Label>
                      <Input
                        value={editDeadline}
                        onChange={(e) => setEditDeadline(e.target.value)}
                        placeholder="e.g. This Friday"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExtracted(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ← Rewrite Request
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    onClick={handlePublish}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto font-extrabold shadow-md gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Publishing & Matching...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Post Request & Notify Providers
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
