import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Send, Mail, Users, CheckCircle2, AlertCircle, Sparkles, RefreshCw, Eye,
  Check, History, ShieldCheck, UserCheck, Filter, Layers, Server, Zap,
  User, Search, Smartphone, Monitor, LayoutTemplate,
  CheckSquare, Square, Trash2, Sliders, ArrowRight, ExternalLink, Link2, Activity
} from "lucide-react";
import { toast } from "sonner";
import {
  getStoredEmailProviders,
  sendUniversalBroadcastBatch,
  EmailProviderConfig,
} from "@/lib/emailRouter";
import AdminEmailSettings from "@/components/admin/AdminEmailSettings";
import AdminGmailConnectorCard from "@/components/admin/AdminGmailConnectorCard";
import DailyUsageTrackingDashboard from "@/components/admin/DailyUsageTrackingDashboard";
import { getAdminGmailSession, sendEmailViaGmailApi, GmailAccountProfile } from "@/lib/gmail";
import { recordBroadcastEmailMetrics } from "@/lib/dailyUsageTracker";
import EmailTemplateSelectorDialog from "@/components/admin/EmailTemplateSelectorDialog";
import { EMAIL_TEMPLATES, EmailTemplate } from "@/data/emailTemplates";
import { cn } from "@/lib/utils";

interface Recipient {
  id: string;
  email: string;
  name: string;
  source: "subscriber" | "platform_user" | "both";
  createdAt: string;
}

interface BroadcastLog {
  id: string;
  subject: string;
  sentAt: string;
  recipientCount: number;
  successCount: number;
  failCount: number;
  providersUsed?: string;
  targetGroup?: string;
}

const BRAND_ACCENT_COLORS = [
  { name: "Executive Blue", value: "#2563eb", bgClass: "bg-blue-600" },
  { name: "Emerald Growth", value: "#059669", bgClass: "bg-emerald-600" },
  { name: "Royal Purple", value: "#7c3aed", bgClass: "bg-purple-600" },
  { name: "Vibrant Pink", value: "#db2777", bgClass: "bg-pink-600" },
  { name: "Warm Amber", value: "#d97706", bgClass: "bg-amber-600" },
  { name: "Sleek Slate", value: "#1e293b", bgClass: "bg-slate-800" },
];

export default function AdminBroadcast() {
  const [activeTab, setActiveTab] = useState<"broadcast" | "templates" | "history" | "providers" | "tracking">("broadcast");
  const [providers, setProviders] = useState<EmailProviderConfig[]>([]);
  const [gmailSession, setGmailSession] = useState<GmailAccountProfile | null>(() => getAdminGmailSession());
  const [gatewayMode, setGatewayMode] = useState<"gmail_direct" | "universal">("gmail_direct");

  // Selection Mode: single_person | all_subscribers | all_members | all_combined | custom_select
  const [selectionMode, setSelectionMode] = useState<
    "single_person" | "all_subscribers" | "all_members" | "all_combined" | "custom_select"
  >("all_subscribers");

  // Single person custom selection
  const [singlePersonEmail, setSinglePersonEmail] = useState("");
  const [singlePersonName, setSinglePersonName] = useState("");
  const [singlePersonSearch, setSinglePersonSearch] = useState("");

  // Custom multi-selection
  const [customSelectedEmails, setCustomSelectedEmails] = useState<string[]>([]);
  const [customListSearch, setCustomListSearch] = useState("");

  // Campaign Content
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(EMAIL_TEMPLATES[0]?.id || null);
  const [fromName, setFromName] = useState("Bethelincovibe TV");
  const [subject, setSubject] = useState(EMAIL_TEMPLATES[0]?.subject || "");
  const [body, setBody] = useState(EMAIL_TEMPLATES[0]?.body || "");
  const [ctaButtonText, setCtaButtonText] = useState(EMAIL_TEMPLATES[0]?.ctaText || "Explore Opportunities Now");
  const [ctaButtonUrl, setCtaButtonUrl] = useState(EMAIL_TEMPLATES[0]?.ctaLink || "{{site_url}}/businesses");
  const [ctaAccentColor, setCtaAccentColor] = useState(EMAIL_TEMPLATES[0]?.accentColor || "#2563eb");
  const [showCtaCustomizer, setShowCtaCustomizer] = useState(true);

  // Preview & Testing state
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Broadcast dispatching state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({
    current: 0,
    total: 0,
    successCount: 0,
    failCount: 0,
    lastProviderUsed: "",
  });

  // History logs
  const [historyLogs, setHistoryLogs] = useState<BroadcastLog[]>(() => {
    try {
      const saved = localStorage.getItem("admin_broadcast_history_logs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load configured providers
  const refreshProviders = useCallback(() => {
    const list = getStoredEmailProviders();
    setProviders(list);
  }, []);

  useEffect(() => {
    refreshProviders();
  }, [refreshProviders]);

  // Fetch recipients from Supabase
  const { data: recipients = [], isLoading: isLoadingRecipients } = useQuery({
    queryKey: ["admin-broadcast-all-recipients"],
    queryFn: async () => {
      const recipientMap = new Map<string, Recipient>();

      // 1. Fetch from email_subscribers
      try {
        const { data: subs, error: subsErr } = await supabase
          .from("email_subscribers")
          .select("id, email, created_at");
        if (!subsErr && subs) {
          subs.forEach((s) => {
            if (s.email && s.email.includes("@")) {
              const cleanEmail = s.email.trim().toLowerCase();
              recipientMap.set(cleanEmail, {
                id: `sub_${s.id}`,
                email: cleanEmail,
                name: cleanEmail.split("@")[0],
                source: "subscriber",
                createdAt: s.created_at || new Date().toISOString(),
              });
            }
          });
        }
      } catch (err) {
        console.warn("Could not fetch email_subscribers", err);
      }

      // 2. Fetch from profiles
      try {
        const { data: profs, error: profsErr } = await supabase
          .from("profiles")
          .select("id, email, display_name, username, created_at");
        if (!profsErr && profs) {
          profs.forEach((p) => {
            if (p.email && p.email.includes("@")) {
              const cleanEmail = p.email.trim().toLowerCase();
              const existing = recipientMap.get(cleanEmail);
              const displayName = p.display_name || p.username || cleanEmail.split("@")[0];

              if (existing) {
                existing.source = "both";
                existing.name = displayName;
              } else {
                recipientMap.set(cleanEmail, {
                  id: `usr_${p.id}`,
                  email: cleanEmail,
                  name: displayName,
                  source: "platform_user",
                  createdAt: p.created_at || new Date().toISOString(),
                });
              }
            }
          });
        }
      } catch (err) {
        console.warn("Could not fetch profiles", err);
      }

      return Array.from(recipientMap.values());
    },
    staleTime: 60000,
  });

  // Filtered lists for quick badges
  const subscribersList = useMemo(
    () => recipients.filter((r) => r.source === "subscriber" || r.source === "both"),
    [recipients]
  );
  const membersList = useMemo(
    () => recipients.filter((r) => r.source === "platform_user" || r.source === "both"),
    [recipients]
  );

  // Active target recipients calculation
  const activeTargetRecipients = useMemo(() => {
    switch (selectionMode) {
      case "single_person":
        if (!singlePersonEmail.trim()) return [];
        return [
          {
            id: "single_target",
            email: singlePersonEmail.trim().toLowerCase(),
            name: singlePersonName.trim() || singlePersonEmail.split("@")[0],
            source: "subscriber" as const,
            createdAt: new Date().toISOString(),
          },
        ];
      case "all_subscribers":
        return subscribersList;
      case "all_members":
        return membersList;
      case "all_combined":
        return recipients;
      case "custom_select":
        return recipients.filter((r) => customSelectedEmails.includes(r.email));
      default:
        return [];
    }
  }, [
    selectionMode,
    singlePersonEmail,
    singlePersonName,
    subscribersList,
    membersList,
    recipients,
    customSelectedEmails,
  ]);

  // Autocomplete suggestions for single person
  const singlePersonSuggestions = useMemo(() => {
    if (!singlePersonSearch.trim()) return recipients.slice(0, 8);
    const q = singlePersonSearch.toLowerCase();
    return recipients
      .filter((r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q))
      .slice(0, 10);
  }, [recipients, singlePersonSearch]);

  // Filtered list for custom selection
  const customListFiltered = useMemo(() => {
    if (!customListSearch.trim()) return recipients;
    const q = customListSearch.toLowerCase();
    return recipients.filter(
      (r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
    );
  }, [recipients, customListSearch]);

  // Apply template
  const applyTemplate = useCallback((t: EmailTemplate) => {
    setSelectedTemplateId(t.id);
    setSubject(t.subject);
    setBody(t.body);
    if (t.ctaText) setCtaButtonText(t.ctaText);
    if (t.ctaLink) setCtaButtonUrl(t.ctaLink);
    if (t.accentColor) setCtaAccentColor(t.accentColor);
    toast.success(`Loaded template: "${t.title}"`);
  }, []);

  // Tag insertion helper
  const insertTag = (tag: string) => {
    setBody((prev) => prev + " " + tag + " ");
  };

  // Build Sample Replacement
  const sampleRecipient = useMemo(() => {
    return (
      activeTargetRecipients[0] || {
        name: "Adewale",
        email: "adewale@example.com",
      }
    );
  }, [activeTargetRecipients]);

  const sampleReferralLink = `${window.location.origin}/businesses?ref=admin_campaign`;

  const renderedSubject = useMemo(() => {
    return subject
      .replace(/{{name}}/gi, sampleRecipient.name)
      .replace(/{{email}}/gi, sampleRecipient.email)
      .replace(/{{site_url}}/gi, window.location.origin)
      .replace(/{{referral_link}}/gi, sampleReferralLink);
  }, [subject, sampleRecipient, sampleReferralLink]);

  const renderedCtaHtml = useMemo(() => {
    if (!ctaButtonText.trim()) return "";
    const resolvedUrl = ctaButtonUrl
      .replace(/{{site_url}}/gi, window.location.origin)
      .replace(/{{referral_link}}/gi, sampleReferralLink);

    return `
<div style="text-align: center; margin: 28px 0;">
  <a href="${resolvedUrl}" style="background-color: ${ctaAccentColor}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; font-family: sans-serif; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
    ${ctaButtonText} →
  </a>
</div>`;
  }, [ctaButtonText, ctaButtonUrl, ctaAccentColor, sampleReferralLink]);

  const renderedBody = useMemo(() => {
    let text = body
      .replace(/{{name}}/gi, sampleRecipient.name)
      .replace(/{{email}}/gi, sampleRecipient.email)
      .replace(/{{site_url}}/gi, window.location.origin)
      .replace(/{{referral_link}}/gi, sampleReferralLink)
      .replace(
        /{{unsubscribe}}/gi,
        `${window.location.origin}/unsubscribe?email=${encodeURIComponent(sampleRecipient.email)}`
      );

    if (text.includes("{{cta_button}}")) {
      text = text.replace(/{{cta_button}}/gi, renderedCtaHtml);
    }
    return text;
  }, [body, sampleRecipient, sampleReferralLink, renderedCtaHtml]);

  // Send Direct Test Email
  const handleSendTestEmail = async () => {
    if (!testEmailAddress.trim()) {
      return toast.error("Please enter a valid test email address");
    }
    if (!subject.trim() || !body.trim()) {
      return toast.error("Please fill in Subject and Email Body first");
    }

    setIsSendingTest(true);
    try {
      const testRecipient = {
        name: "Admin Previewer",
        email: testEmailAddress.trim().toLowerCase(),
      };

      const customSub = subject
        .replace(/{{name}}/gi, testRecipient.name)
        .replace(/{{email}}/gi, testRecipient.email)
        .replace(/{{site_url}}/gi, window.location.origin)
        .replace(/{{referral_link}}/gi, sampleReferralLink);

      let customBody = body
        .replace(/{{name}}/gi, testRecipient.name)
        .replace(/{{email}}/gi, testRecipient.email)
        .replace(/{{site_url}}/gi, window.location.origin)
        .replace(/{{referral_link}}/gi, sampleReferralLink);

      if (customBody.includes("{{cta_button}}")) {
        customBody = customBody.replace(/{{cta_button}}/gi, renderedCtaHtml);
      }

      // If Gmail direct is active, attempt sending via Gmail API first
      if (gatewayMode === "gmail_direct" && gmailSession?.accessToken) {
        try {
          await sendEmailViaGmailApi({
            to: testEmailAddress.trim(),
            subject: `[TEST PREVIEW] ${customSub}`,
            htmlBody: customBody,
            fromName: fromName || gmailSession.name || "Bethelincovibe TV Admin",
            fromEmail: gmailSession.email,
            accessToken: gmailSession.accessToken,
          });
          recordBroadcastEmailMetrics(1);
          toast.success(`Test email dispatched via connected Gmail to ${testEmailAddress}!`);
          return;
        } catch (gmailErr: any) {
          console.warn("Gmail test send error, trying fallback:", gmailErr);
          toast.info("Gmail API notice: " + gmailErr.message + ". Trying multi-gateway fallback...");
        }
      }

      const res = await sendUniversalBroadcastBatch({
        recipients: [testRecipient],
        subject: `[TEST PREVIEW] ${customSub}`,
        body: customBody,
        fromName: fromName || "Bethelincovibe TV Admin",
      });

      if (res.successCount > 0) {
        recordBroadcastEmailMetrics(1);
        toast.success(`Test email dispatched to ${testEmailAddress}!`);
      } else {
        toast.error(`Test email failed: ${res.errors[0]?.error || "Provider error"}`);
      }
    } catch (err: any) {
      toast.error("Test send error: " + err.message);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Launch Full Campaign Broadcast
  const handleStartBroadcast = async () => {
    if (activeTargetRecipients.length === 0) {
      return toast.error("No recipients selected for this campaign.");
    }
    if (!subject.trim() || !body.trim()) {
      return toast.error("Subject and Body are required.");
    }

    setConfirmModalOpen(false);
    setIsSending(true);
    setSendProgress({
      current: 0,
      total: activeTargetRecipients.length,
      successCount: 0,
      failCount: 0,
      lastProviderUsed: gatewayMode === "gmail_direct" && gmailSession?.accessToken ? "Google Gmail" : "",
    });

    try {
      let finalBody = body;
      if (finalBody.includes("{{cta_button}}")) {
        finalBody = finalBody.replace(/{{cta_button}}/gi, renderedCtaHtml);
      }

      let successCount = 0;
      let failCount = 0;
      let usedProvider = "Universal Multi-Gateway";

      // If Gmail Direct is selected and session is active, send via Gmail API with rate-limiting
      if (gatewayMode === "gmail_direct" && gmailSession?.accessToken) {
        usedProvider = `Google Gmail (${gmailSession.email})`;
        for (let i = 0; i < activeTargetRecipients.length; i++) {
          const r = activeTargetRecipients[i];
          const personalizedSub = subject
            .replace(/{{name}}/gi, r.name)
            .replace(/{{email}}/gi, r.email)
            .replace(/{{site_url}}/gi, window.location.origin)
            .replace(/{{referral_link}}/gi, sampleReferralLink);

          const personalizedBody = finalBody
            .replace(/{{name}}/gi, r.name)
            .replace(/{{email}}/gi, r.email)
            .replace(/{{site_url}}/gi, window.location.origin)
            .replace(/{{referral_link}}/gi, sampleReferralLink);

          try {
            await sendEmailViaGmailApi({
              to: r.email,
              subject: personalizedSub,
              htmlBody: personalizedBody,
              fromName: fromName || gmailSession.name || "Bethelincovibe TV",
              fromEmail: gmailSession.email,
              accessToken: gmailSession.accessToken,
            });
            successCount++;
          } catch (gmailSendErr) {
            console.warn(`Gmail send failed for ${r.email}:`, gmailSendErr);
            failCount++;
          }

          setSendProgress({
            current: i + 1,
            total: activeTargetRecipients.length,
            successCount,
            failCount,
            lastProviderUsed: "Google Gmail API v1",
          });

          // Small 100ms throttle between emails to prevent rate limiting
          if (i < activeTargetRecipients.length - 1) {
            await new Promise((res) => setTimeout(res, 100));
          }
        }
      } else {
        const result = await sendUniversalBroadcastBatch({
          recipients: activeTargetRecipients.map((r) => ({ name: r.name, email: r.email })),
          subject,
          body: finalBody,
          fromName: fromName || "Bethelincovibe TV",
          onProgress: (cur, tot, succ, fail, provider) => {
            setSendProgress({
              current: cur,
              total: tot,
              successCount: succ,
              failCount: fail,
              lastProviderUsed: provider,
            });
          },
        });
        successCount = result.successCount;
        failCount = result.failCount;
        usedProvider = result.providersUsed.join(", ") || "Universal Router";
      }

      recordBroadcastEmailMetrics(successCount);

      const newLog: BroadcastLog = {
        id: `bcast_${Date.now()}`,
        subject: subject.trim(),
        sentAt: new Date().toISOString(),
        recipientCount: activeTargetRecipients.length,
        successCount,
        failCount,
        providersUsed: usedProvider,
        targetGroup: selectionMode,
      };

      const updatedLogs = [newLog, ...historyLogs];
      setHistoryLogs(updatedLogs);
      localStorage.setItem("admin_broadcast_history_logs", JSON.stringify(updatedLogs));

      if (successCount > 0) {
        toast.success(
          `Campaign dispatched! ${successCount} sent successfully (${failCount} failed).`
        );
      } else {
        toast.error(`Broadcast completed with ${failCount} errors.`);
      }
    } catch (err: any) {
      toast.error("Broadcast error: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const enabledCount = providers.filter((p) => p.enabled).length;

  return (
    <div className="space-y-6 max-w-6xl pb-24 md:pb-20">
      {/* 3D HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-blue-600/15 via-indigo-600/10 to-violet-600/15 border border-blue-500/20 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-[0_6px_16px_-2px_rgba(37,99,235,0.5),inset_0_1.5px_0_rgba(255,255,255,0.45)] ring-1 ring-white/30">
            <Send className="h-6 w-6 drop-shadow-sm" strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-none text-foreground">
                Email Campaign & Broadcast Studio
              </h1>
              <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-extrabold">
                Multi-Gateway Engine
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
              Select specific people, all subscribers, or members to dispatch high-converting newsletters and promotional campaigns with pre-built templates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <EmailTemplateSelectorDialog onSelectTemplate={applyTemplate} />
        </div>
      </div>

      {/* TABS CONTROLLER */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <div className="overflow-x-auto pb-1 no-scrollbar">
          <TabsList className="grid grid-cols-5 min-w-[620px] h-11 rounded-2xl bg-muted/60 p-1">
            <TabsTrigger
              value="broadcast"
              className="rounded-xl font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <Mail className="h-3.5 w-3.5" />
              Campaign Studio
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="rounded-xl font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              Templates ({EMAIL_TEMPLATES.length})
            </TabsTrigger>
            <TabsTrigger
              value="tracking"
              className="rounded-xl font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs text-blue-600 dark:text-blue-400"
            >
              <Activity className="h-3.5 w-3.5" />
              Daily Tracking
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-xl font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <History className="h-3.5 w-3.5" />
              History ({historyLogs.length})
            </TabsTrigger>
            <TabsTrigger
              value="providers"
              className="rounded-xl font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <Sliders className="h-3.5 w-3.5" />
              Gateways ({enabledCount})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: CAMPAIGN STUDIO */}
        <TabsContent value="broadcast" className="space-y-6 mt-6">
          {/* GOOGLE GMAIL ADMIN CONNECTOR CARD */}
          <AdminGmailConnectorCard onSessionChange={setGmailSession} />

          {/* STEP 1: AUDIENCE SELECTOR */}
          <Card className="rounded-3xl border-border/80 shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/20 py-4 px-5 sm:px-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black flex items-center gap-2">
                      <span>Step 1: Select Recipient Audience</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Choose whether to send to an individual person, all newsletter subscribers, platform members, or a custom list.
                    </CardDescription>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className="bg-background text-xs font-black px-3 py-1 text-primary border-primary/30 shadow-2xs"
                >
                  {isLoadingRecipients ? (
                    <span className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Loading...
                    </span>
                  ) : (
                    `${activeTargetRecipients.length} Recipient${activeTargetRecipients.length === 1 ? "" : "s"} Selected`
                  )}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* 5 Audience Mode Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* 1. Particular Person */}
                <button
                  type="button"
                  onClick={() => setSelectionMode("single_person")}
                  className={cn(
                    "flex flex-col text-left p-3.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer relative",
                    selectionMode === "single_person"
                      ? "border-blue-600 bg-blue-600/10 shadow-sm ring-1 ring-blue-600/30"
                      : "border-border/70 hover:border-blue-400 bg-card"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <User className="h-4 w-4" />
                    </div>
                    {selectionMode === "single_person" && (
                      <CheckCircle2 className="h-4 w-4 text-blue-600 fill-blue-600/20" />
                    )}
                  </div>
                  <p className="font-extrabold text-xs text-foreground">Particular Person</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Send to 1 specific individual user or custom email.
                  </p>
                </button>

                {/* 2. All Subscribers */}
                <button
                  type="button"
                  onClick={() => setSelectionMode("all_subscribers")}
                  className={cn(
                    "flex flex-col text-left p-3.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer relative",
                    selectionMode === "all_subscribers"
                      ? "border-emerald-600 bg-emerald-600/10 shadow-sm ring-1 ring-emerald-600/30"
                      : "border-border/70 hover:border-emerald-400 bg-card"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Mail className="h-4 w-4" />
                    </div>
                    <Badge className="bg-emerald-500 text-white text-[10px] font-black py-0 px-1.5">
                      {subscribersList.length}
                    </Badge>
                  </div>
                  <p className="font-extrabold text-xs text-foreground">All Subscribers</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Newsletter & blog email subscriber database.
                  </p>
                </button>

                {/* 3. All Members */}
                <button
                  type="button"
                  onClick={() => setSelectionMode("all_members")}
                  className={cn(
                    "flex flex-col text-left p-3.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer relative",
                    selectionMode === "all_members"
                      ? "border-purple-600 bg-purple-600/10 shadow-sm ring-1 ring-purple-600/30"
                      : "border-border/70 hover:border-purple-400 bg-card"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-8 w-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <Badge className="bg-purple-500 text-white text-[10px] font-black py-0 px-1.5">
                      {membersList.length}
                    </Badge>
                  </div>
                  <p className="font-extrabold text-xs text-foreground">All Members</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Registered users & platform account holders.
                  </p>
                </button>

                {/* 4. All Contacts Combined */}
                <button
                  type="button"
                  onClick={() => setSelectionMode("all_combined")}
                  className={cn(
                    "flex flex-col text-left p-3.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer relative",
                    selectionMode === "all_combined"
                      ? "border-amber-600 bg-amber-600/10 shadow-sm ring-1 ring-amber-600/30"
                      : "border-border/70 hover:border-amber-400 bg-card"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-8 w-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                      <Layers className="h-4 w-4" />
                    </div>
                    <Badge className="bg-amber-500 text-white text-[10px] font-black py-0 px-1.5">
                      {recipients.length}
                    </Badge>
                  </div>
                  <p className="font-extrabold text-xs text-foreground">All Contacts</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Complete deduplicated total of users & subscribers.
                  </p>
                </button>

                {/* 5. Custom Multi-Select */}
                <button
                  type="button"
                  onClick={() => setSelectionMode("custom_select")}
                  className={cn(
                    "flex flex-col text-left p-3.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer relative",
                    selectionMode === "custom_select"
                      ? "border-pink-600 bg-pink-600/10 shadow-sm ring-1 ring-pink-600/30"
                      : "border-border/70 hover:border-pink-400 bg-card"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-8 w-8 rounded-xl bg-pink-600 text-white flex items-center justify-center shadow-xs">
                      <Filter className="h-4 w-4" />
                    </div>
                    <Badge className="bg-pink-500 text-white text-[10px] font-black py-0 px-1.5">
                      {customSelectedEmails.length}
                    </Badge>
                  </div>
                  <p className="font-extrabold text-xs text-foreground">Custom Select</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Hand-pick recipients with search and checkboxes.
                  </p>
                </button>
              </div>

              {/* Dynamic Single Person Sub-Panel */}
              {selectionMode === "single_person" && (
                <div className="p-4 rounded-2xl border bg-blue-500/5 border-blue-500/20 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-blue-700 dark:text-blue-300">
                        Target Single Person Selector
                      </h4>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Pick from existing database or type any custom address
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Recipient Email Address *</label>
                      <Input
                        placeholder="e.g. adewale@example.com"
                        value={singlePersonEmail}
                        onChange={(e) => setSinglePersonEmail(e.target.value)}
                        className="h-10 text-xs rounded-xl bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Recipient Name (for {"{{name}}"} tag)</label>
                      <Input
                        placeholder="e.g. Adewale Adebayo"
                        value={singlePersonName}
                        onChange={(e) => setSinglePersonName(e.target.value)}
                        className="h-10 text-xs rounded-xl bg-background"
                      />
                    </div>
                  </div>

                  {/* Autocomplete / Quick Picker from existing contacts */}
                  <div className="space-y-2 pt-2 border-t border-blue-500/15">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                        <Search className="h-3 w-3" /> Quick pick from existing subscribers & members:
                      </label>
                      <Input
                        placeholder="Filter list..."
                        value={singlePersonSearch}
                        onChange={(e) => setSinglePersonSearch(e.target.value)}
                        className="h-7 text-xs rounded-lg max-w-[200px] bg-background"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-background/50 rounded-xl border">
                      {singlePersonSuggestions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSinglePersonEmail(c.email);
                            setSinglePersonName(c.name);
                            toast.success(`Selected ${c.name} (${c.email})`);
                          }}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                            singlePersonEmail.toLowerCase() === c.email.toLowerCase()
                              ? "bg-blue-600 text-white border-blue-600 font-bold"
                              : "bg-background hover:bg-muted text-foreground"
                          )}
                        >
                          <span className="truncate max-w-[120px]">{c.name}</span>
                          <span className="text-[10px] opacity-70 truncate max-w-[140px]">&lt;{c.email}&gt;</span>
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">
                            {c.source === "subscriber" ? "Sub" : c.source === "platform_user" ? "Member" : "Both"}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Custom Multi-Select Sub-Panel */}
              {selectionMode === "custom_select" && (
                <div className="p-4 rounded-2xl border bg-pink-500/5 border-pink-500/20 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-pink-600" />
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-pink-700 dark:text-pink-300">
                        Multi-Select Recipient Table ({customSelectedEmails.length} selected)
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCustomSelectedEmails(recipients.map((r) => r.email))}
                        className="h-7 text-xs font-bold rounded-lg"
                      >
                        Select All ({recipients.length})
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setCustomSelectedEmails([])}
                        className="h-7 text-xs font-bold rounded-lg text-destructive"
                      >
                        Clear All
                      </Button>
                      <Input
                        placeholder="Search list..."
                        value={customListSearch}
                        onChange={(e) => setCustomListSearch(e.target.value)}
                        className="h-7 text-xs rounded-lg w-36 bg-background"
                      />
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto border rounded-xl bg-background divide-y">
                    {customListFiltered.map((r) => {
                      const isChecked = customSelectedEmails.includes(r.email);
                      return (
                        <div
                          key={r.id}
                          onClick={() => {
                            if (isChecked) {
                              setCustomSelectedEmails((prev) => prev.filter((e) => e !== r.email));
                            } else {
                              setCustomSelectedEmails((prev) => [...prev, r.email]);
                            }
                          }}
                          className={cn(
                            "flex items-center justify-between p-2.5 px-3 text-xs cursor-pointer hover:bg-muted/50 transition-colors",
                            isChecked ? "bg-pink-500/10" : ""
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isChecked ? (
                              <CheckSquare className="h-4 w-4 text-pink-600 shrink-0" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate">{r.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{r.email}</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {r.source === "subscriber"
                              ? "Subscriber"
                              : r.source === "platform_user"
                              ? "Member"
                              : "Sub + Member"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* STEP 2: PRE-BUILT TEMPLATES HORIZONTAL PICKER */}
          <Card className="rounded-3xl border-border/80 shadow-sm overflow-hidden">
            <CardHeader className="py-4 px-5 sm:px-6 border-b bg-muted/20">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-xs">
                    <LayoutTemplate className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black flex items-center gap-2">
                      <span>Step 2: Choose a High-Converting Email Template</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Click any ready-made layout below to automatically populate the subject, formatted message body, and CTA button.
                    </CardDescription>
                  </div>
                </div>

                <EmailTemplateSelectorDialog
                  onSelectTemplate={applyTemplate}
                  triggerButton={
                    <Button size="sm" variant="outline" className="text-xs font-bold rounded-xl gap-1.5 h-8">
                      <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                      View All {EMAIL_TEMPLATES.length} Templates
                    </Button>
                  }
                />
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {EMAIL_TEMPLATES.slice(0, 4).map((tmpl) => {
                  const isSelected = selectedTemplateId === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => applyTemplate(tmpl)}
                      className={cn(
                        "flex flex-col justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 group text-left",
                        isSelected
                          ? "border-purple-600 bg-purple-600/10 shadow-sm ring-1 ring-purple-600/30"
                          : "border-border/70 hover:border-purple-400 bg-card"
                      )}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400">
                            {tmpl.categoryLabel}
                          </span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-purple-600" />}
                        </div>
                        <p className="font-extrabold text-xs text-foreground group-hover:text-purple-600 transition-colors line-clamp-1">
                          {tmpl.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {tmpl.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t flex items-center justify-between text-[10px] font-bold text-muted-foreground group-hover:text-foreground">
                        <span>Load Template</span>
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* STEP 3 & 4: COMPOSER + LIVE MOCKUP */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Email Composer Form (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="rounded-3xl border-border/80 shadow-sm">
                <CardHeader className="py-4 px-5 sm:px-6 border-b">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base font-black flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" /> Step 3: Compose Campaign Content
                    </CardTitle>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      Plaintext & HTML Compatible
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 space-y-4">
                  {/* Sender Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Sender Display Name</label>
                      <Input
                        value={fromName}
                        onChange={(e) => setFromName(e.target.value)}
                        placeholder="e.g. Bethelincovibe TV"
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Default Referral Link</label>
                      <Input
                        value={sampleReferralLink}
                        readOnly
                        className="h-10 text-xs rounded-xl bg-muted/40 text-muted-foreground"
                      />
                    </div>
                  </div>

                  {/* Subject Line */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Email Subject Line *</label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. 🚀 Big News for {{name}}: Special Business Update"
                      className="h-10 text-xs rounded-xl font-medium"
                    />
                  </div>

                  {/* Dynamic Tag Injection Bar */}
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/70 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                      <span>Click to Insert Dynamic Merge Tags:</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => insertTag("{{name}}")}
                        className="px-2.5 py-1 rounded-lg bg-background border text-[11px] font-bold text-primary hover:border-primary transition-colors cursor-pointer shadow-2xs"
                      >
                        {"{{name}}"}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTag("{{email}}")}
                        className="px-2.5 py-1 rounded-lg bg-background border text-[11px] font-bold text-primary hover:border-primary transition-colors cursor-pointer shadow-2xs"
                      >
                        {"{{email}}"}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTag("{{site_url}}")}
                        className="px-2.5 py-1 rounded-lg bg-background border text-[11px] font-bold text-primary hover:border-primary transition-colors cursor-pointer shadow-2xs"
                      >
                        {"{{site_url}}"}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTag("{{referral_link}}")}
                        className="px-2.5 py-1 rounded-lg bg-background border text-[11px] font-bold text-indigo-600 hover:border-indigo-600 transition-colors cursor-pointer shadow-2xs"
                      >
                        {"{{referral_link}}"}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTag("{{cta_button}}")}
                        className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-[11px] font-extrabold text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 transition-colors cursor-pointer shadow-2xs"
                      >
                        {"{{cta_button}}"}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTag("{{unsubscribe}}")}
                        className="px-2.5 py-1 rounded-lg bg-background border text-[11px] font-bold text-muted-foreground hover:border-foreground transition-colors cursor-pointer shadow-2xs"
                      >
                        {"{{unsubscribe}}"}
                      </button>
                    </div>
                  </div>

                  {/* Primary CTA Button Customizer */}
                  <div className="p-3.5 rounded-2xl border bg-card/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-primary" />
                        <span className="text-xs font-black text-foreground">
                          Action Button & Theme Accent ({"{{cta_button}}"})
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowCtaCustomizer(!showCtaCustomizer)}
                        className="h-6 text-[10px] font-bold text-muted-foreground"
                      >
                        {showCtaCustomizer ? "Hide Settings" : "Customize Button"}
                      </Button>
                    </div>

                    {showCtaCustomizer && (
                      <div className="space-y-3 pt-2 border-t text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-muted-foreground">Button Text</label>
                            <Input
                              value={ctaButtonText}
                              onChange={(e) => setCtaButtonText(e.target.value)}
                              placeholder="e.g. Read Full Guide Now"
                              className="h-9 text-xs rounded-xl"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-muted-foreground">Destination Link</label>
                            <Input
                              value={ctaButtonUrl}
                              onChange={(e) => setCtaButtonUrl(e.target.value)}
                              placeholder="e.g. {{site_url}}/businesses"
                              className="h-9 text-xs rounded-xl"
                            />
                          </div>
                        </div>

                        {/* Brand Color Palettes */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-muted-foreground">
                            Button Background Theme Color:
                          </label>
                          <div className="flex items-center gap-2 flex-wrap">
                            {BRAND_ACCENT_COLORS.map((c) => (
                              <button
                                key={c.value}
                                type="button"
                                onClick={() => setCtaAccentColor(c.value)}
                                className={cn(
                                  "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer",
                                  ctaAccentColor === c.value
                                    ? "ring-2 ring-primary border-primary bg-primary/10 shadow-xs"
                                    : "border-border hover:bg-muted"
                                )}
                              >
                                <span
                                  className="h-3.5 w-3.5 rounded-full shadow-xs shrink-0"
                                  style={{ backgroundColor: c.value }}
                                />
                                <span>{c.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Email Body Textarea */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground">
                        Email Message Body *
                      </label>
                      <span className="text-[10px] text-muted-foreground">
                        {body.length} characters
                      </span>
                    </div>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Write your email campaign content here..."
                      rows={12}
                      className="text-xs rounded-2xl font-mono leading-relaxed"
                    />
                  </div>

                  {/* Direct Test Dispatch Box */}
                  <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Send className="h-3.5 w-3.5 text-blue-600" />
                        Send 1-Click Instant Test Delivery
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setTestEmailAddress(singlePersonEmail || "test@bethelincovibe.tv")}
                        className="h-6 text-[10px] font-bold text-blue-600"
                      >
                        Use Target Email
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Enter test email address..."
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        className="h-9 text-xs rounded-xl bg-background flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={handleSendTestEmail}
                        disabled={isSendingTest || !testEmailAddress.trim()}
                        className="h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shrink-0 gap-1.5"
                      >
                        {isSendingTest ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        Send Test
                      </Button>
                    </div>
                  </div>

                  {/* Send Action Trigger */}
                  <div className="pt-3 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Ready to broadcast to <strong>{activeTargetRecipients.length}</strong> recipient(s)?
                    </p>

                    <Button
                      type="button"
                      onClick={() => setConfirmModalOpen(true)}
                      disabled={
                        isSending ||
                        activeTargetRecipients.length === 0 ||
                        !subject.trim() ||
                        !body.trim()
                      }
                      className="h-11 px-7 font-extrabold text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl shadow-sm gap-2"
                    >
                      {isSending ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" /> Dispatching Broadcast...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4" /> Review & Dispatch Campaign ({activeTargetRecipients.length})
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Live Responsive Mockup (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="rounded-3xl border-border/80 shadow-sm overflow-hidden sticky top-6">
                <CardHeader className="py-3.5 px-5 border-b bg-muted/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-primary" /> Step 4: Live Client Mockup
                    </CardTitle>
                    <div className="flex items-center gap-1 bg-background p-0.5 rounded-xl border shadow-2xs">
                      <Button
                        size="icon"
                        variant={previewDevice === "desktop" ? "default" : "ghost"}
                        onClick={() => setPreviewDevice("desktop")}
                        className="h-7 w-7 rounded-lg"
                        title="Desktop Preview"
                      >
                        <Monitor className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant={previewDevice === "mobile" ? "default" : "ghost"}
                        onClick={() => setPreviewDevice("mobile")}
                        className="h-7 w-7 rounded-lg"
                        title="Mobile Smartphone Preview"
                      >
                        <Smartphone className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3 bg-muted/10">
                  <div
                    className={cn(
                      "mx-auto transition-all duration-200 border rounded-2xl bg-card shadow-sm p-4 overflow-hidden",
                      previewDevice === "mobile" ? "max-w-[320px] text-[11px]" : "w-full text-xs"
                    )}
                  >
                    {/* Mock Header */}
                    <div className="border-b pb-3 space-y-1 mb-3">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>From: <strong>{fromName}</strong></span>
                        <span>Just now</span>
                      </div>
                      <p className="font-bold text-foreground line-clamp-2">
                        {renderedSubject || "(Enter subject line...)"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        To: {sampleRecipient.name} &lt;{sampleRecipient.email}&gt;
                      </p>
                    </div>

                    {/* Mock Body */}
                    <div className="font-sans text-foreground/90 leading-relaxed min-h-[160px]">
                      {/* Check if HTML or Plaintext */}
                      {renderedBody.includes("<div") || renderedBody.includes("<a ") ? (
                        <div
                          dangerouslySetInnerHTML={{ __html: renderedBody.replace(/\n/g, "<br/>") }}
                          className="prose prose-xs max-w-none dark:prose-invert"
                        />
                      ) : (
                        <div className="whitespace-pre-wrap">
                          {renderedBody || "(Start composing your message or pick a template above to see the live rendering...)"}
                        </div>
                      )}
                    </div>

                    {/* Mock Footer */}
                    <div className="mt-6 pt-3 border-t border-border/50 text-[10px] text-muted-foreground space-y-1 text-center">
                      <p>You received this message because you are registered with Bethelincovibe TV.</p>
                      <p className="underline text-primary cursor-pointer">Unsubscribe from notifications</p>
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5 pt-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Dynamic merge tags render automatically for each recipient</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ACTIVE BROADCAST PROGRESS BAR */}
          {isSending && (
            <Card className="rounded-3xl border-2 border-blue-500/40 bg-blue-500/5 shadow-lg p-5 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Broadcasting in Progress... ({sendProgress.current} / {sendProgress.total})
                </span>
                <span>
                  {Math.round((sendProgress.current / Math.max(1, sendProgress.total)) * 100)}%
                </span>
              </div>

              <Progress
                value={(sendProgress.current / Math.max(1, sendProgress.total)) * 100}
                className="h-2.5"
              />

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="text-emerald-600 font-bold">✓ {sendProgress.successCount} Success</span>
                <span className="text-red-500 font-bold">✕ {sendProgress.failCount} Failed</span>
                <span>Active Gateway: {sendProgress.lastProviderUsed || "Auto-Failover"}</span>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* TAB 2: FULL TEMPLATE GALLERY */}
        <TabsContent value="templates" className="space-y-4 mt-6">
          <Card className="rounded-3xl border-border/80 shadow-sm">
            <CardHeader className="py-4 px-5 sm:px-6 border-b">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-xs">
                    <LayoutTemplate className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black">
                      High-Converting Pre-Built Campaign Templates
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Professionally structured templates tailored for high click-through rates and member engagement.
                    </CardDescription>
                  </div>
                </div>

                <Badge variant="outline" className="text-xs font-bold px-3 py-1">
                  {EMAIL_TEMPLATES.length} Total Templates
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {EMAIL_TEMPLATES.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-col justify-between p-4 rounded-2xl border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-extrabold px-2 py-0.5 rounded-md"
                          style={{ borderLeftColor: t.accentColor, borderLeftWidth: 3 }}
                        >
                          {t.badge}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                          {t.categoryLabel}
                        </span>
                      </div>

                      <h3 className="font-black text-sm text-foreground">{t.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {t.description}
                      </p>

                      <div className="p-2.5 rounded-xl bg-muted/40 border text-[11px]">
                        <p className="font-bold text-muted-foreground text-[10px] uppercase">Subject Line:</p>
                        <p className="font-medium text-foreground truncate">{t.subject}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t flex items-center justify-end">
                      <Button
                        size="sm"
                        onClick={() => {
                          applyTemplate(t);
                          setActiveTab("broadcast");
                        }}
                        className="w-full text-xs font-extrabold rounded-xl bg-primary text-primary-foreground gap-1.5 shadow-xs"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Use This Template
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: CAMPAIGN HISTORY */}
        <TabsContent value="history" className="space-y-4 mt-6">
          <Card className="rounded-3xl border-border/80 shadow-sm">
            <CardHeader className="py-4 px-5 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Past Dispatched Campaigns
                </CardTitle>
                {historyLogs.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Clear all past campaign logs?")) {
                        setHistoryLogs([]);
                        localStorage.removeItem("admin_broadcast_history_logs");
                      }
                    }}
                    className="h-7 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear Logs
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5">
              {historyLogs.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-muted/10">
                  <Mail className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="font-bold text-sm text-foreground">No Campaign Logs Recorded Yet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When you send a campaign, execution logs and provider analytics will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {historyLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 rounded-2xl border bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-extrabold text-sm text-foreground truncate">{log.subject}</p>
                          <Badge variant="outline" className="text-[10px] font-bold capitalize">
                            {log.targetGroup?.replace("_", " ") || "Broadcast"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Sent: {new Date(log.sentAt).toLocaleString()} • Gateways: {log.providersUsed || "Universal SMTP"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right text-xs">
                          <p className="font-black text-emerald-600">{log.successCount} Delivered</p>
                          {log.failCount > 0 && (
                            <p className="text-red-500 font-bold">{log.failCount} Failed</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSubject(log.subject);
                            setActiveTab("broadcast");
                            toast.success("Subject reloaded into composer!");
                          }}
                          className="h-8 text-xs font-bold rounded-xl"
                        >
                          Re-use
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: EMAIL PROVIDER GATEWAYS */}
        <TabsContent value="providers" className="space-y-4 mt-6">
          <AdminEmailSettings onConfigChange={refreshProviders} />
        </TabsContent>

        {/* TAB 5: DAILY USAGE & CAMPAIGN TRACKING */}
        <TabsContent value="tracking" className="space-y-4 mt-6">
          <DailyUsageTrackingDashboard />
        </TabsContent>
      </Tabs>

      {/* CONFIRMATION MODAL BEFORE DISPATCH */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-foreground">
              <Zap className="h-5 w-5 text-blue-600" />
              Confirm Campaign Dispatch
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review your campaign parameters before executing email dispatch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 p-3.5 rounded-2xl bg-muted/40 border text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground font-bold">Target Audience:</span>
              <span className="font-extrabold capitalize text-foreground">
                {selectionMode.replace("_", " ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-bold">Total Recipients:</span>
              <span className="font-extrabold text-blue-600">
                {activeTargetRecipients.length} People
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-bold">Sender Name:</span>
              <span className="font-extrabold text-foreground">{fromName}</span>
            </div>
            <div className="space-y-1 pt-1 border-t">
              <span className="text-muted-foreground font-bold">Subject:</span>
              <p className="font-bold text-foreground break-words">{subject}</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
              className="rounded-xl font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartBroadcast}
              className="rounded-xl font-extrabold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              Confirm & Start Sending
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
