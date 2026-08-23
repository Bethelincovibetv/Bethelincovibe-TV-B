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
  Check, History, ShieldCheck, UserCheck, Filter, UserPlus
} from "lucide-react";
import { toast } from "sonner";
import {
  signInWithGoogleGmail, getCachedGmailToken, sendGmailEmail, setCachedGmailToken
} from "@/lib/gmail";

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
  senderEmail?: string;
  targetGroup?: string;
}

const TEMPLATES = [
  {
    id: "weekly-digest",
    title: "📰 Weekly Business Digest",
    subject: "🔥 Weekly Highlights for {{name}}: Top Business & Startup Guides",
    body: `Hello {{name}},

Here are the top business articles and marketplace insights published this week on Bethelincovibe TV:

1. 🚀 How to Start a High-Profit Business in Lagos in 2026
2. 💡 Top 5 Marketing Strategies for Local Entrepreneurs
3. 🛍️ New Verified Supplier Additions in our Business Directory

Explore all guides, supplier listings, and growth tools directly on our portal!

Warm regards,
The Bethelincovibe TV Team`,
  },
  {
    id: "new-article",
    title: "⚡ New Article Announcement",
    subject: "📢 New Article Published: Read the latest insights, {{name}}",
    body: `Hi {{name}}!

We just published a brand new article that you don't want to miss!

📌 Title: Growing Your Enterprise with Digital Marketing
📖 Read the full article now to discover actionable tips and strategies for scaling your revenue.

Click below to read now:
https://bethelincovibe.tv/blog

Happy reading!`,
  },
  {
    id: "marketplace-spotlight",
    title: "🛍️ Marketplace Spotlight",
    subject: "🌟 Featured Products & Verified Businesses of the Week",
    body: `Greetings {{name}}!

Discover top rated products and verified suppliers added to the Bethelincovibe TV Directory this week.

Check out new listings in food retail, logistics, tech, and wholesale products directly on our platform.

Visit Marketplace: https://bethelincovibe.tv/products

Stay empowered!`,
  },
];

import AdminEmailSettings from "@/components/admin/AdminEmailSettings";

export default function AdminBroadcast() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [fromName, setFromName] = useState("Bethelincovibe TV");
  const [userGmail, setUserGmail] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(getCachedGmailToken());
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Recipient Target Group: "all" | "subscribers" | "platform_users"
  const [targetGroup, setTargetGroup] = useState<"all" | "subscribers" | "platform_users">("all");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });

  const [historyLogs, setHistoryLogs] = useState<BroadcastLog[]>(() => {
    try {
      const saved = localStorage.getItem("admin_broadcast_history_logs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Query both email_subscribers AND profiles (platform users)
  const { data: recipients = [], refetch, isLoading: isLoadingRecipients } = useQuery({
    queryKey: ["admin-broadcast-recipients-v2"],
    queryFn: async () => {
      // 1. Fetch email_subscribers from Supabase
      const { data: subData } = await supabase
        .from("email_subscribers")
        .select("id, email, name, created_at, subscribed_at");

      // Read local subscribers fallback
      let localSubs: any[] = [];
      try {
        const saved = localStorage.getItem("bethel_local_subscribers");
        if (saved) localSubs = JSON.parse(saved);
      } catch {}

      // 2. Fetch profiles (Platform User accounts)
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, email, display_name, username, created_at");

      const map = new Map<string, Recipient>();

      // Process DB Subscribers
      (subData || []).forEach((s: any) => {
        if (!s.email) return;
        const cleanEmail = s.email.toLowerCase().trim();
        map.set(cleanEmail, {
          id: s.id || cleanEmail,
          email: cleanEmail,
          name: s.name || "Subscriber",
          source: "subscriber",
          createdAt: s.subscribed_at || s.created_at || new Date().toISOString(),
        });
      });

      // Process Local Subscribers
      localSubs.forEach((s: any) => {
        if (!s.email) return;
        const cleanEmail = s.email.toLowerCase().trim();
        if (!map.has(cleanEmail)) {
          map.set(cleanEmail, {
            id: s.id || cleanEmail,
            email: cleanEmail,
            name: s.name || "Subscriber",
            source: "subscriber",
            createdAt: s.created_at || new Date().toISOString(),
          });
        }
      });

      // Process Profiles (Platform Users)
      (profileData || []).forEach((p: any) => {
        if (!p.email) return;
        const cleanEmail = p.email.toLowerCase().trim();
        const pName = p.display_name || p.username || "Platform Member";
        if (map.has(cleanEmail)) {
          const existing = map.get(cleanEmail)!;
          existing.source = "both";
          if (!existing.name || existing.name === "Subscriber") {
            existing.name = pName;
          }
        } else {
          map.set(cleanEmail, {
            id: p.id || cleanEmail,
            email: cleanEmail,
            name: pName,
            source: "platform_user",
            createdAt: p.created_at || new Date().toISOString(),
          });
        }
      });

      return Array.from(map.values());
    },
  });

  // Auto-initialize selected emails once recipients load
  useEffect(() => {
    if (recipients.length > 0 && selectedEmails.length === 0) {
      setSelectedEmails(recipients.map((r) => r.email));
    }
  }, [recipients, selectedEmails.length]);

  // Counts breakdown
  const subscriberCount = useMemo(
    () => recipients.filter((r) => r.source === "subscriber" || r.source === "both").length,
    [recipients]
  );

  const platformUserCount = useMemo(
    () => recipients.filter((r) => r.source === "platform_user" || r.source === "both").length,
    [recipients]
  );

  // Filtered recipients according to Target Group & Search Query
  const filteredRecipients = useMemo(() => {
    return recipients.filter((r) => {
      // Group Filter
      if (targetGroup === "subscribers" && r.source === "platform_user") return false;
      if (targetGroup === "platform_users" && r.source === "subscriber") return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = r.name?.toLowerCase().includes(q);
        const emailMatch = r.email.toLowerCase().includes(q);
        return nameMatch || emailMatch;
      }

      return true;
    });
  }, [recipients, targetGroup, searchQuery]);

  // Switch Target Group & auto select matching recipients
  const handleSelectTargetGroup = (group: "all" | "subscribers" | "platform_users") => {
    setTargetGroup(group);
    const matching = recipients.filter((r) => {
      if (group === "subscribers") return r.source === "subscriber" || r.source === "both";
      if (group === "platform_users") return r.source === "platform_user" || r.source === "both";
      return true;
    });
    setSelectedEmails(matching.map((r) => r.email));
    toast.info(`Target group set to ${group.replace("_", " ").toUpperCase()}`, {
      description: `${matching.length} recipients selected.`,
    });
  };

  const toggleSelectAll = () => {
    const currentEmails = filteredRecipients.map((r) => r.email);
    const allCurrentSelected = currentEmails.every((e) => selectedEmails.includes(e));

    if (allCurrentSelected) {
      setSelectedEmails(selectedEmails.filter((e) => !currentEmails.includes(e)));
    } else {
      const merged = Array.from(new Set([...selectedEmails, ...currentEmails]));
      setSelectedEmails(merged);
    }
  };

  const toggleRecipient = (email: string) => {
    if (selectedEmails.includes(email)) {
      setSelectedEmails(selectedEmails.filter((e) => e !== email));
    } else {
      setSelectedEmails([...selectedEmails, email]);
    }
  };

  // Connect Google / Gmail Account
  const handleConnectGmail = async () => {
    setIsAuthenticating(true);
    try {
      const res = await signInWithGoogleGmail();
      setToken(res.accessToken);
      setUserGmail(res.user.email || "Connected Account");
      toast.success("Gmail API Connected!", {
        description: `Signed in as ${res.user.email || "Connected Account"}. You can now send broadcast emails.`,
      });
    } catch (err: any) {
      console.error("Gmail connect error:", err);
      toast.error("Failed to connect Gmail API", {
        description: err.message || "Please approve Gmail OAuth scopes to continue.",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnectGmail = () => {
    setCachedGmailToken(null);
    setToken(null);
    setUserGmail(null);
    toast.info("Gmail account disconnected.");
  };

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setSubject(tpl.subject);
    setBody(tpl.body);
    toast.success(`Loaded "${tpl.title}" template`);
  };

  const insertTag = (tag: string) => {
    setBody((prev) => `${prev} ${tag}`);
    toast.info(`Inserted variable ${tag} into email body`);
  };

  // Build Personalized HTML Email for Preview
  const buildFormattedHtml = useCallback((subjectText: string, bodyText: string, recipientName = "Valued Reader", recipientEmail = "reader@example.com") => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://bethelincovibe.tv";
    const nameToDisplay = recipientName && recipientName !== "Subscriber" ? recipientName : "";

    const processedText = bodyText
      .replace(/\{\{name\}\}/gi, nameToDisplay || "Valued Reader")
      .replace(/\{\{email\}\}/gi, recipientEmail);

    const bodyContent = processedText
      .split("\n\n")
      .map((para) => `<p style="margin-bottom: 16px; line-height: 1.6; font-size: 15px; color: #334155;">${para.replace(/\n/g, "<br/>")}</p>`)
      .join("");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
            .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
            .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 32px 24px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
            .header p { margin: 6px 0 0; opacity: 0.9; font-size: 13px; font-weight: 500; }
            .content { padding: 32px 24px; }
            .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 10px; margin-top: 12px; }
            .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${fromName}</h1>
              <p>Official Subscriber & Member Update</p>
            </div>
            <div class="content">
              ${bodyContent || "<p>Your email body message will appear here...</p>"}
              <div style="text-align: center; margin-top: 24px;">
                <a href="${origin}" class="btn">Visit Bethelincovibe TV</a>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${fromName}. All rights reserved.</p>
              <p>You received this email because you are a registered member or subscriber of Bethelincovibe TV.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }, [fromName]);

  const previewHtml = useMemo(
    () => buildFormattedHtml(subject, body, "Bethel", "bethel@example.com"),
    [subject, body, buildFormattedHtml]
  );

  // Execute Batch Personalized Broadcast Send via Gmail API
  const handleExecuteBroadcast = async () => {
    if (!token) {
      toast.error("Gmail Account not connected", {
        description: "Please sign in with Google to authorize sending emails.",
      });
      return;
    }

    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and Body are required");
      return;
    }

    if (selectedEmails.length === 0) {
      toast.error("No recipients selected for this broadcast");
      return;
    }

    setConfirmModalOpen(false);
    setIsSending(true);
    setSendProgress({ current: 0, total: selectedEmails.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedEmails.length; i++) {
      const email = selectedEmails[i];
      const rec = recipients.find((r) => r.email === email);
      const recName = rec?.name && rec.name !== "Subscriber" ? rec.name : "";

      const personalizedSubject = subject
        .replace(/\{\{name\}\}/gi, recName || "Valued Reader")
        .replace(/\{\{email\}\}/gi, email);

      const personalizedHtml = buildFormattedHtml(subject, body, recName || "Valued Reader", email);

      try {
        await sendGmailEmail({
          to: email,
          subject: personalizedSubject,
          htmlBody: personalizedHtml,
          accessToken: token,
          fromName,
        });
        successCount++;
      } catch (err) {
        console.error(`Failed sending to ${email}:`, err);
        failCount++;
      }

      setSendProgress({ current: i + 1, total: selectedEmails.length });
    }

    setIsSending(false);

    // Save Campaign Log
    const newLog: BroadcastLog = {
      id: Math.random().toString(36).substring(2, 9),
      subject: subject.trim(),
      sentAt: new Date().toISOString(),
      recipientCount: selectedEmails.length,
      successCount,
      failCount,
      senderEmail: userGmail || "Connected Gmail",
      targetGroup: targetGroup.toUpperCase(),
    };

    const updatedLogs = [newLog, ...historyLogs];
    setHistoryLogs(updatedLogs);
    try {
      localStorage.setItem("admin_broadcast_history_logs", JSON.stringify(updatedLogs));
    } catch {
      // Ignore
    }

    if (successCount > 0) {
      toast.success("Broadcast Dispatched Successfully! 🎉", {
        description: `Delivered to ${successCount} recipient(s) via Gmail API.${failCount > 0 ? ` (${failCount} failed)` : ""}`,
      });
      setSubject("");
      setBody("");
    } else {
      toast.error("Broadcast Failed", {
        description: "Could not send emails. Check your Gmail API authorization.",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-indigo-600/15 via-purple-600/10 to-primary/15 border border-primary/20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              Gmail Broadcast & Email Automation
              <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 text-[10px] font-bold">
                Connected OAuth
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Broadcast personalized updates to email subscribers, platform users, or all combined members via connected Gmail API.
            </p>
          </div>
        </div>

        {/* Gmail API OAuth Connection Status */}
        <div className="flex items-center gap-3 bg-card/90 border p-2.5 rounded-2xl shadow-xs shrink-0">
          {token ? (
            <div className="flex items-center gap-2.5">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-xs">
                <p className="font-extrabold text-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Gmail API Active
                </p>
                <p className="text-[10px] text-muted-foreground font-medium truncate max-w-[150px]">
                  {userGmail || "Authorized Session"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnectGmail}
                className="h-8 text-[11px] font-bold rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                onClick={handleConnectGmail}
                disabled={isAuthenticating}
                size="sm"
                className="h-9 px-4 rounded-xl font-extrabold text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                {isAuthenticating ? "Connecting..." : "Sign in with Google (Gmail)"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Broadcast Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Email Composer & Live HTML Preview */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="py-3.5 px-5 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <Send className="h-4 w-4 text-indigo-600" /> Broadcast Composer & Personalization
                </CardTitle>
                <CardDescription className="text-xs font-medium">
                  Draft newsletter updates with custom subject, body text, and live HTML preview.
                </CardDescription>
              </div>

              {/* Quick Template Picker */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-muted-foreground mr-1 hidden sm:inline">Templates:</span>
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl)}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold border bg-muted/40 hover:bg-primary/10 hover:text-primary transition-all"
                  >
                    {tpl.title.split(" ")[0]} {tpl.title.split(" ")[1]}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              <Tabs defaultValue="compose" className="w-full">
                <TabsList className="bg-muted/40 border p-1 rounded-2xl h-auto mb-4">
                  <TabsTrigger value="compose" className="rounded-xl text-xs font-bold gap-1.5 py-1.5">
                    <Send className="h-3.5 w-3.5" /> Composer
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="rounded-xl text-xs font-bold gap-1.5 py-1.5">
                    <Eye className="h-3.5 w-3.5" /> Live Personalized Preview
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: Composer Inputs */}
                <TabsContent value="compose" className="space-y-4 m-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Sender Brand Name</label>
                      <Input
                        value={fromName}
                        onChange={(e) => setFromName(e.target.value)}
                        placeholder="e.g., Bethelincovibe TV"
                        className="h-10 rounded-xl text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Target Recipients Selected</label>
                      <div className="h-10 px-3 rounded-xl border bg-muted/20 flex items-center justify-between text-xs font-extrabold">
                        <span className="text-muted-foreground">Target:</span>
                        <Badge className="bg-primary/15 text-primary border-primary/20 text-xs">
                          {selectedEmails.length} of {recipients.length} Selected
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground">Email Subject Line</label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setSubject((s) => s + " {{name}}")}
                          className="text-[10px] font-bold text-primary hover:underline"
                        >
                          + Add {"{{name}}"}
                        </button>
                      </div>
                    </div>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g., 🔥 Latest Business Insights for {{name}} on Bethelincovibe TV"
                      className="h-11 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground">Email Body Message</label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground font-medium">Personalize:</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => insertTag("{{name}}")}
                          className="h-6 px-2 text-[10px] font-bold rounded-lg"
                        >
                          + {"{{name}}"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => insertTag("{{email}}")}
                          className="h-6 px-2 text-[10px] font-bold rounded-lg"
                        >
                          + {"{{email}}"}
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Type your email update here. Use {{name}} to personalize with the recipient's name..."
                      className="min-h-[220px] rounded-2xl text-xs font-medium leading-relaxed p-4"
                    />
                  </div>

                  {/* Send Action Trigger Bar */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t">
                    <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      Dispatched personalized via connected Google Gmail account.
                    </p>

                    <Button
                      onClick={() => {
                        if (!token) {
                          handleConnectGmail();
                        } else {
                          setConfirmModalOpen(true);
                        }
                      }}
                      disabled={isSending}
                      className="w-full sm:w-auto h-11 px-6 rounded-2xl font-black text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-md"
                    >
                      <Send className="h-4 w-4" />
                      {token ? `Broadcast to ${selectedEmails.length} Recipients` : "Connect Gmail & Send"}
                    </Button>
                  </div>
                </TabsContent>

                {/* TAB 2: Live HTML Email Preview */}
                <TabsContent value="preview" className="m-0">
                  <div className="border rounded-2xl p-3 bg-muted/20">
                    <div className="flex items-center justify-between pb-2 border-b mb-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                        <Eye className="h-4 w-4 text-indigo-600" />
                        <span>Subject Preview: <strong className="text-foreground">{subject || "(No Subject Set)"}</strong></span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-extrabold">Personalized Sample</Badge>
                    </div>

                    <div className="bg-background rounded-xl p-2 border shadow-inner max-h-[450px] overflow-y-auto">
                      <iframe
                        srcDoc={previewHtml}
                        title="Email Preview"
                        className="w-full h-[400px] rounded-lg border-0 bg-white"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Broadcast Progress Bar Card */}
          {isSending && (
            <Card className="border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Dispatched via Gmail API...
                </span>
                <span className="text-xs font-black">
                  {sendProgress.current} / {sendProgress.total} Emails Sent
                </span>
              </div>
              <Progress value={(sendProgress.current / Math.max(1, sendProgress.total)) * 100} className="h-2.5 rounded-full" />
            </Card>
          )}

          {/* Broadcast Campaign History Log */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="py-3 px-5 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Past Broadcast Campaigns
              </CardTitle>
              {historyLogs.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setHistoryLogs([]);
                    localStorage.removeItem("admin_broadcast_history_logs");
                    toast.info("Broadcast history cleared");
                  }}
                  className="h-7 text-[10px] font-bold text-muted-foreground hover:text-destructive"
                >
                  Clear History
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-0 divide-y text-xs font-medium">
              {historyLogs.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground font-medium">
                  No previous broadcast campaigns recorded yet.
                </div>
              ) : (
                historyLogs.map((log) => (
                  <div key={log.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground truncate">{log.subject}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Sent on {new Date(log.sentAt).toLocaleString()} • Target: {log.targetGroup || "ALL"} • via {log.senderEmail || "Gmail"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] font-extrabold">
                        <Check className="h-3 w-3 mr-1" /> {log.successCount} Sent
                      </Badge>
                      {log.failCount > 0 && (
                        <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] font-extrabold">
                          {log.failCount} Failed
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Recipient Target Manager */}
        <div className="space-y-4">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="py-3.5 px-5 border-b space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-600" /> Recipients ({recipients.length})
                  </CardTitle>
                  <CardDescription className="text-xs font-medium">
                    Select recipient groups or individual members.
                  </CardDescription>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="h-8 text-[11px] font-extrabold rounded-xl"
                >
                  Select / Deselect
                </Button>
              </div>

              {/* Target Group Selector Buttons */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-muted/40 rounded-xl border text-[11px] font-extrabold">
                <button
                  onClick={() => handleSelectTargetGroup("all")}
                  className={`py-1.5 rounded-lg transition-all ${
                    targetGroup === "all"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({recipients.length})
                </button>

                <button
                  onClick={() => handleSelectTargetGroup("subscribers")}
                  className={`py-1.5 rounded-lg transition-all ${
                    targetGroup === "subscribers"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Subscribers ({subscriberCount})
                </button>

                <button
                  onClick={() => handleSelectTargetGroup("platform_users")}
                  className={`py-1.5 rounded-lg transition-all ${
                    targetGroup === "platform_users"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Users ({platformUserCount})
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-3 space-y-3">
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 rounded-xl text-xs font-medium"
              />

              <div className="max-h-[480px] overflow-y-auto space-y-1.5 pr-1">
                {isLoadingRecipients ? (
                  <div className="py-8 text-center text-xs text-muted-foreground font-medium flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-primary" /> Loading recipients...
                  </div>
                ) : filteredRecipients.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground font-medium">
                    No recipients found matching target group or query.
                  </div>
                ) : (
                  filteredRecipients.map((r) => {
                    const isSelected = selectedEmails.includes(r.email);
                    return (
                      <div
                        key={r.id}
                        onClick={() => toggleRecipient(r.email)}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          isSelected
                            ? "bg-primary/10 border-primary/30 text-foreground font-bold shadow-xs"
                            : "bg-card hover:bg-muted/50 border-border text-muted-foreground font-medium"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-extrabold text-xs text-foreground truncate">{r.name}</p>
                            <Badge className={`text-[9px] px-1.5 py-0 h-4 font-bold border ${
                              r.source === "platform_user"
                                ? "bg-purple-500/15 text-purple-600 border-purple-500/30"
                                : r.source === "subscriber"
                                ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                                : "bg-blue-500/15 text-blue-600 border-blue-500/30"
                            }`}>
                              {r.source === "platform_user" ? "User" : r.source === "subscriber" ? "Subscriber" : "User+Sub"}
                            </Badge>
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground mt-0.5">{r.email}</p>
                        </div>

                        <div className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/40"
                        }`}>
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Failover Engine Settings Section */}
      <div className="pt-6 border-t border-border">
        <AdminEmailSettings />
      </div>

      {/* Confirmation Modal before Dispatching Bulk Email */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-indigo-600" /> Confirm Broadcast Dispatch
            </DialogTitle>
            <DialogDescription className="text-xs font-medium">
              Are you sure you want to send this broadcast email using your connected Gmail API account?
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-2xl bg-muted/40 border space-y-2 text-xs">
            <div className="flex justify-between font-bold">
              <span className="text-muted-foreground">Subject:</span>
              <span className="text-foreground truncate max-w-[200px]">{subject}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-muted-foreground">Target Group:</span>
              <Badge className="bg-indigo-500/15 text-indigo-600 border-indigo-500/30 text-xs font-black">
                {targetGroup.toUpperCase()} ({selectedEmails.length} Recipients)
              </Badge>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-muted-foreground">Sender Account:</span>
              <span className="text-foreground truncate max-w-[200px]">{userGmail || "Gmail API Connected"}</span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExecuteBroadcast}
              className="rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              <Send className="h-4 w-4" /> Dispatch Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
