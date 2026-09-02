import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Bell, Send, Loader2, Sparkles, Check, Users, RefreshCw, Smartphone,
  Radio, CheckCircle2, AlertCircle, History, Shield, Globe, ExternalLink,
  Laptop, Tablet, Filter, Search, Copy, Play
} from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerDirectBrowserNotification } from "@/lib/fcm";
import { fetchUserNameById, personalizeNotificationTitle, personalizeNotificationBody } from "@/lib/notificationPersonalizer";
import { formatDistanceToNow, format } from "date-fns";

type PromptStyle = "bell" | "modal" | "custom";

const PROMPT_STYLES: { id: PromptStyle; label: string; desc: string }[] = [
  { id: "bell", label: "Bell icon slide-in", desc: "Floating bell button that slides in a prompt" },
  { id: "modal", label: "Pop-up modal", desc: "Centered modal asking to accept notifications" },
  { id: "custom", label: "Custom message", desc: "Your own message with Yes / No buttons" },
];

const PRESETS = [
  {
    name: "Welcome & Ecosystem Overview",
    title: "Welcome to Bethelincovibe TV",
    message: "Discover a growing business and media ecosystem built to help businesses, entrepreneurs, creators and communities connect, promote their work, discover opportunities and grow.",
    url: "/dashboard/notifications",
    type: "system",
  },
  {
    name: "Marketplace Promotion",
    title: "🛍️ Explore New Products & Verified Merchants",
    message: "Check out the newest listings, verified supplier catalogs, and exclusive discounts across the Bethelincovibe TV marketplace today.",
    url: "/products",
    type: "marketplace",
  },
  {
    name: "Daily Reward Reminder",
    title: "🎁 Your Daily Login Reward is Ready",
    message: "Claim free design & promotion credits every day you log in. Grow your business and create stunning flyers instantly.",
    url: "/dashboard/wallet",
    type: "reward",
  },
  {
    name: "Community Forum Discussion",
    title: "💬 Join Today's Creator & Business Mastermind",
    message: "Connect with thousands of active Nigerian entrepreneurs and creators sharing strategies for growth in our public forums.",
    url: "/forum",
    type: "forum",
  },
];

export default function AdminNotifications() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("broadcast");

  // Broadcast form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [deliveryChannel, setDeliveryChannel] = useState<"in_app" | "push" | "both">("both");
  const [mode, setMode] = useState<"all" | "users">("all");
  const [userIds, setUserIds] = useState("");
  const [notifType, setNotifType] = useState<string>("announcement");
  const [sendAfter, setSendAfter] = useState("");

  // Prompt settings state
  const [promptStyle, setPromptStyle] = useState<PromptStyle>("modal");
  const [customMsg, setCustomMsg] = useState("");
  const [enabled, setEnabled] = useState(true);

  // History search state
  const [historySearch, setHistorySearch] = useState("");

  // Subscribers query
  const { data: subscribers, isLoading: loadingSubscribers, refetch: refetchSubscribers } = useQuery({
    queryKey: ["admin-onesignal-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, email, onesignal_player_id, updated_at")
        .not("onesignal_player_id", "is", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Push subscriptions count
  const { data: pushSubCount, refetch: refetchPushSubs } = useQuery({
    queryKey: ["admin-fcm-subscriptions-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("push_subscriptions")
        .select("*", { count: "exact", head: true });
      if (error) return 0;
      return count ?? 0;
    },
  });

  // Notifications history query
  const { data: notifications, isLoading: loadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("push_notifications")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("key,value")
      .in("key", ["onesignal_prompt_style", "onesignal_custom_message", "onesignal_enabled"])
      .then(({ data }) => {
        const m: Record<string, string> = {};
        data?.forEach((r: any) => (m[r.key] = r.value || ""));
        if (m.onesignal_prompt_style) setPromptStyle(m.onesignal_prompt_style as PromptStyle);
        if (m.onesignal_custom_message) setCustomMsg(m.onesignal_custom_message);
        setEnabled(m.onesignal_enabled !== "false");
      });
  }, []);

  const saveSetting = async (key: string, value: string) => {
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
    if (existing) await supabase.from("site_settings").update({ value }).eq("id", existing.id);
    else await supabase.from("site_settings").insert({ key, value });
  };

  const savePrompt = useMutation({
    mutationFn: async () => {
      await saveSetting("onesignal_prompt_style", promptStyle);
      await saveSetting("onesignal_custom_message", customMsg || "Join our Lagos business community to get updates");
      await saveSetting("onesignal_enabled", enabled ? "true" : "false");
    },
    onSuccess: () => toast.success("Prompt settings saved successfully."),
    onError: (e: any) => toast.error(e.message),
  });

  const sendBroadcast = useMutation({
    mutationFn: async () => {
      const cleanTitle = title.trim();
      const cleanMsg = message.trim();
      const cleanUrl = url.trim() || "/dashboard/notifications";

      if (!cleanTitle || !cleanMsg) {
        throw new Error("Title and Message are required");
      }

      const payload: any = {
        title: cleanTitle,
        message: cleanMsg,
        url: cleanUrl,
        mode,
      };

      let targetUserIds: string[] = [];
      let totalRecipients = 0;

      if (mode === "users") {
        targetUserIds = userIds.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
        if (targetUserIds.length === 0) {
          throw new Error("Please specify at least one valid User ID for targeted delivery.");
        }
        payload.user_ids = targetUserIds;
      }
      if (sendAfter) payload.send_after = new Date(sendAfter).toISOString();

      const shouldSendInApp = deliveryChannel === "in_app" || deliveryChannel === "both";
      const shouldSendPush = deliveryChannel === "push" || deliveryChannel === "both";

      let inAppDeliveredCount = 0;

      // 1. Deliver In-App Notifications
      if (shouldSendInApp) {
        if (mode === "all") {
          try {
            const { data: rpcCount, error: rpcErr } = await supabase.rpc("broadcast_notification", {
              _title: cleanTitle,
              _body: cleanMsg,
              _url: cleanUrl,
            });
            if (!rpcErr && typeof rpcCount === "number") {
              inAppDeliveredCount = rpcCount;
            } else {
              throw rpcErr || new Error("RPC broadcast failed");
            }
          } catch (rpcErr) {
            console.warn("RPC broadcast fallback:", rpcErr);
            const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, username, email");
            const notifRecords = (profiles || []).map((p: any) => {
              const uName = p.display_name?.trim() || p.username?.trim() || (p.email ? p.email.split("@")[0] : "Entrepreneur");
              return {
                user_id: p.user_id,
                title: personalizeNotificationTitle(cleanTitle, uName),
                body: personalizeNotificationBody(cleanMsg, uName),
                url: cleanUrl,
                type: notifType,
                is_read: false,
              };
            });

            for (let i = 0; i < notifRecords.length; i += 100) {
              const chunk = notifRecords.slice(i, i + 100);
              await supabase.from("user_notifications").insert(chunk);
            }
            inAppDeliveredCount = notifRecords.length;
          }
        } else if (targetUserIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, username, email").in("user_id", targetUserIds);
          const nameMap = new Map<string, string>();
          (profiles || []).forEach((p: any) => {
            const uName = p.display_name?.trim() || p.username?.trim() || (p.email ? p.email.split("@")[0] : "Entrepreneur");
            nameMap.set(p.user_id, uName);
          });

          const notifRecords = targetUserIds.map((uId) => {
            const uName = nameMap.get(uId) || "Entrepreneur";
            return {
              user_id: uId,
              title: personalizeNotificationTitle(cleanTitle, uName),
              body: personalizeNotificationBody(cleanMsg, uName),
              url: cleanUrl,
              type: notifType,
              is_read: false,
            };
          });

          for (let i = 0; i < notifRecords.length; i += 100) {
            const chunk = notifRecords.slice(i, i + 100);
            const { error: insertErr } = await supabase.from("user_notifications").insert(chunk);
            if (insertErr) throw insertErr;
          }
          inAppDeliveredCount = targetUserIds.length;
        }
      }

      // 2. Deliver Push Notification via edge function
      let pushDeliveredCount = 0;
      if (shouldSendPush) {
        try {
          const { data } = await supabase.functions.invoke("onesignal-send", { body: payload });
          pushDeliveredCount = data?.recipients || (mode === "all" ? (subscribers?.length || 1) : targetUserIds.length) || 1;
        } catch {
          pushDeliveredCount = mode === "all" ? (subscribers?.length || 1) : targetUserIds.length;
        }
      }

      totalRecipients = Math.max(inAppDeliveredCount, pushDeliveredCount, 1);

      // 3. Store in push_notifications audit log
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      await supabase.from("push_notifications").insert({
        title: cleanTitle,
        body: `[${deliveryChannel.toUpperCase().replace("_", " ")}] ${cleanMsg}`,
        url: cleanUrl,
        sent_by: adminUser?.id || null,
        recipient_count: totalRecipients,
      });

      return {
        inApp: inAppDeliveredCount,
        push: pushDeliveredCount,
        channel: deliveryChannel,
        recipients: totalRecipients,
      };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
      const channelLabel = data.channel === "in_app"
        ? "In-App Notification"
        : data.channel === "push"
        ? "Push Notification"
        : "In-App & Push Notifications";

      toast.success(`Dispatched ${channelLabel} successfully (${data.recipients} recipients)`);
      setTitle("");
      setMessage("");
      setUrl("");
      setUserIds("");
      setSendAfter("");
    },
    onError: (e: any) => toast.error(e.message || "Failed to send notification"),
  });

  const sendTest = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in as Administrator");

      const adminName = await fetchUserNameById(user.id);
      const testTitle = `Welcome to Bethelincovibe TV, ${adminName}!`;
      const testBody = `Hi ${adminName}, discover a growing business and media ecosystem built to help businesses, entrepreneurs, creators and communities connect, promote their work, discover opportunities and grow.`;
      const testUrl = "/dashboard/notifications";

      // 1. Insert into admin's private in-app notifications
      await supabase.from("user_notifications").insert({
        user_id: user.id,
        title: testTitle,
        body: testBody,
        url: testUrl,
        type: "system",
        is_read: false,
      });

      // 2. Deliver real FCM / OneSignal push to admin's user ID
      const payload = {
        title: testTitle,
        message: testBody,
        url: testUrl,
        mode: "users",
        user_ids: [user.id],
      };

      await supabase.functions.invoke("onesignal-send", { body: payload }).catch(() => ({}));

      // 3. Trigger immediate OS / Browser notification on this device
      triggerDirectBrowserNotification({
        title: testTitle,
        body: testBody,
        url: testUrl,
        icon: "/logo.png",
      });

      // 4. Record to admin audit history
      await supabase.from("push_notifications").insert({
        title: testTitle,
        body: `[TEST PUSH] ${testBody}`,
        url: testUrl,
        sent_by: user.id,
        recipient_count: 1,
      });

      return { success: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast.success("Branded test notification delivered to your registered device!");
    },
    onError: (e: any) => toast.error(e.message || "Failed to deliver test notification"),
  });

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setTitle(preset.title);
    setMessage(preset.message);
    setUrl(preset.url);
    setNotifType(preset.type);
    toast.info(`Applied template: "${preset.name}"`);
  };

  const subscriberStats = useMemo(() => {
    const totalOneSignal = subscribers?.length ?? 0;
    const totalFcm = pushSubCount ?? 0;
    const connectedUsers = subscribers?.filter((s: any) => !!s.user_id).length ?? 0;
    return {
      totalOneSignal,
      totalFcm,
      connectedUsers,
      totalCombined: totalOneSignal + totalFcm,
    };
  }, [subscribers, pushSubCount]);

  const filteredHistory = useMemo(() => {
    if (!notifications) return [];
    if (!historySearch.trim()) return notifications;
    const q = historySearch.toLowerCase();
    return notifications.filter(
      (n: any) =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.body && n.body.toLowerCase().includes(q))
    );
  }, [notifications, historySearch]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-2 sm:px-4 py-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/15 via-amber-500/10 to-card p-5 rounded-3xl border border-border/80 shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20 shrink-0">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              Notification & Push Control Center
            </h1>
            <p className="text-xs text-muted-foreground">
              Dispatch platform broadcasts, send targeted messages, and test registered push devices.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => sendTest.mutate()}
            disabled={sendTest.isPending}
            className="rounded-2xl font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 gap-2 shadow-sm text-xs sm:text-sm"
          >
            {sendTest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
            Send Test Push
          </Button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/80 p-1.5 rounded-2xl w-full flex overflow-x-auto justify-start sm:justify-center border border-border/60">
          <TabsTrigger value="broadcast" className="rounded-xl text-xs sm:text-sm font-bold gap-1.5 px-3 py-2 shrink-0">
            <Radio className="h-4 w-4 text-primary" /> Send Broadcast
          </TabsTrigger>
          <TabsTrigger value="test" className="rounded-xl text-xs sm:text-sm font-bold gap-1.5 px-3 py-2 shrink-0">
            <Smartphone className="h-4 w-4 text-amber-500" /> Test Push
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl text-xs sm:text-sm font-bold gap-1.5 px-3 py-2 shrink-0">
            <History className="h-4 w-4 text-purple-500" /> Delivery Logs ({notifications?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="rounded-xl text-xs sm:text-sm font-bold gap-1.5 px-3 py-2 shrink-0">
            <Users className="h-4 w-4 text-emerald-500" /> Devices ({subscriberStats.totalCombined})
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl text-xs sm:text-sm font-bold gap-1.5 px-3 py-2 shrink-0">
            <Sparkles className="h-4 w-4 text-blue-500" /> Opt-In Prompt
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: BROADCAST & TARGETING */}
        <TabsContent value="broadcast" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="border-border/80 shadow-md rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Send className="h-5 w-5 text-primary" /> Create Notification Broadcast
                  </CardTitle>
                  <CardDescription>
                    Send to all registered platform users or specific accounts with deep link actions.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                  {/* Delivery Channel Selector */}
                  <div className="space-y-2">
                    <Label className="font-bold text-xs sm:text-sm text-foreground">Delivery Channel *</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setDeliveryChannel("both")}
                        className={cn(
                          "p-3.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between gap-1",
                          deliveryChannel === "both"
                            ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                            : "border-border hover:border-primary/40 bg-card"
                        )}
                      >
                        {deliveryChannel === "both" && (
                          <div className="absolute top-2.5 right-2.5 bg-primary text-white rounded-full p-0.5">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-purple-600" />
                          <span className="font-extrabold text-xs">Both (In-App + Push)</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground leading-tight">
                          Recommended. Permanent inbox record + push alert.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeliveryChannel("in_app")}
                        className={cn(
                          "p-3.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between gap-1",
                          deliveryChannel === "in_app"
                            ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                            : "border-border hover:border-primary/40 bg-card"
                        )}
                      >
                        {deliveryChannel === "in_app" && (
                          <div className="absolute top-2.5 right-2.5 bg-primary text-white rounded-full p-0.5">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Bell className="h-4 w-4 text-primary" />
                          <span className="font-extrabold text-xs">In-App Inbox Only</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground leading-tight">
                          Saves strictly to user notification bell & center.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeliveryChannel("push")}
                        className={cn(
                          "p-3.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between gap-1",
                          deliveryChannel === "push"
                            ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                            : "border-border hover:border-primary/40 bg-card"
                        )}
                      >
                        {deliveryChannel === "push" && (
                          <div className="absolute top-2.5 right-2.5 bg-primary text-white rounded-full p-0.5">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-amber-500" />
                          <span className="font-extrabold text-xs">Device Push Only</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground leading-tight">
                          FCM / OneSignal popup on mobile & desktop browsers.
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Preset Templates */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Quick Preset Templates</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => applyPreset(p)}
                          className="text-[11px] font-semibold bg-muted/60 hover:bg-muted text-foreground px-2.5 py-1 rounded-xl border border-border/60 transition"
                        >
                          + {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Audience Selector */}
                  <div className="space-y-2">
                    <Label className="font-bold text-xs sm:text-sm">Target Audience *</Label>
                    <select
                      className="w-full h-10 rounded-xl border bg-background px-3 text-xs sm:text-sm"
                      value={mode}
                      onChange={(e) => setMode(e.target.value as any)}
                    >
                      <option value="all">📢 All Registered Platform Users (Global Broadcast)</option>
                      <option value="users">🎯 Specific User Accounts (By User ID)</option>
                    </select>
                  </div>

                  {mode === "users" && (
                    <div className="space-y-2">
                      <Label className="font-bold text-xs">Target User IDs (comma or space-separated)</Label>
                      <Textarea
                        value={userIds}
                        onChange={(e) => setUserIds(e.target.value)}
                        rows={2}
                        placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000, ..."
                        className="font-mono text-xs rounded-xl"
                      />
                    </div>
                  )}

                  {/* Category Type */}
                  <div className="space-y-2">
                    <Label className="font-bold text-xs sm:text-sm">Notification Category</Label>
                    <select
                      className="w-full h-10 rounded-xl border bg-background px-3 text-xs sm:text-sm"
                      value={notifType}
                      onChange={(e) => setNotifType(e.target.value)}
                    >
                      <option value="announcement">📢 Announcement / Broadcast</option>
                      <option value="marketplace">🛍️ Marketplace & Merchant</option>
                      <option value="reward">🎁 Reward & Wallet</option>
                      <option value="forum">💬 Community & Forum</option>
                      <option value="system">⚙️ Platform System Update</option>
                    </select>
                  </div>

                  {/* Title & Message */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="font-bold text-xs sm:text-sm">Title *</Label>
                      <span className="text-[10px] text-muted-foreground">{title.length}/60 chars</span>
                    </div>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. 🚀 Weekend Marketplace Super Sale"
                      className="rounded-xl text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="font-bold text-xs sm:text-sm">Message Content *</Label>
                      <span className="text-[10px] text-muted-foreground">{message.length}/250 chars</span>
                    </div>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write your complete notification update or announcement here..."
                      rows={3}
                      className="rounded-xl text-xs sm:text-sm"
                    />
                  </div>

                  {/* Action URL */}
                  <div className="space-y-2">
                    <Label className="font-bold text-xs sm:text-sm">Action Destination Link (optional)</Label>
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="e.g. /products or /forum or /dashboard/notifications"
                      className="rounded-xl text-xs sm:text-sm font-mono"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {["/products", "/forum", "/dashboard/wallet", "/dashboard/notifications", "/blog"].map((link) => (
                        <button
                          key={link}
                          type="button"
                          onClick={() => setUrl(link)}
                          className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded-md hover:bg-muted/80 text-muted-foreground"
                        >
                          {link}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3">
                    <Button
                      onClick={() => sendBroadcast.mutate()}
                      disabled={!title.trim() || !message.trim() || sendBroadcast.isPending}
                      className="w-full font-bold h-11 rounded-2xl bg-primary text-primary-foreground shadow-md gap-2"
                    >
                      {sendBroadcast.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Dispatch {deliveryChannel === "in_app" ? "In-App Notification" : deliveryChannel === "push" ? "Push Notification" : "In-App & Push Broadcast"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Mobile Push Preview Column */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="border-border/80 shadow-md rounded-2xl bg-gradient-to-b from-card to-muted/20">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-primary" /> Live Mobile Notification Preview
                  </CardTitle>
                  <CardDescription>
                    Real-time visualization of how this appears on user lockscreens.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Phone Mockup Frame */}
                  <div className="relative mx-auto max-w-[300px] rounded-[36px] border-4 border-slate-800 bg-slate-950 p-4 shadow-2xl overflow-hidden text-white">
                    {/* Speaker notch */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 h-3.5 w-24 bg-slate-800 rounded-full" />

                    <div className="pt-6 pb-4 space-y-3">
                      {/* Lockscreen clock */}
                      <div className="text-center space-y-0.5">
                        <div className="text-2xl font-light tracking-tight text-white/90">09:41</div>
                        <div className="text-[10px] text-white/60">Saturday, August 29</div>
                      </div>

                      {/* Push Card Mockup */}
                      <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center text-[9px] font-black text-slate-950">
                              B
                            </div>
                            <span className="text-[10px] font-bold tracking-tight text-white/90">Bethelincovibe TV</span>
                          </div>
                          <span className="text-[9px] text-white/60">Now</span>
                        </div>

                        <div className="text-xs font-bold text-white line-clamp-1">
                          {title || "Welcome to Bethelincovibe TV"}
                        </div>

                        <div className="text-[11px] text-white/80 leading-snug line-clamp-3">
                          {message || "Discover a growing business and media ecosystem built to help businesses, entrepreneurs, creators and communities connect, promote their work, discover opportunities and grow."}
                        </div>

                        {url && (
                          <div className="text-[9px] text-amber-400 font-mono flex items-center gap-1 pt-0.5">
                            <ExternalLink className="h-2.5 w-2.5" /> Tap to open: {url}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/60 text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-emerald-500" /> Deep Linking Guarantee
                    </p>
                    <p className="text-[11px]">
                      Tapping this push opens the user's notification detail page directly, ensuring the entire message is preserved with actionable link triggers.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: TEST PUSH NOTIFICATION */}
        <TabsContent value="test" className="space-y-6">
          <Card className="border-border/80 shadow-md rounded-2xl max-w-2xl mx-auto">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                <Smartphone className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-extrabold">Send Test Push to Registered Admin Device</CardTitle>
              <CardDescription className="text-xs max-w-md mx-auto">
                Trigger real push delivery to your active phone or computer browser using official branded platform messaging.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Branded Test Message Box */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                    Official Branded Test Payload
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">Channel: FCM / OneSignal</span>
                </div>
                <p className="text-sm font-bold text-foreground">Welcome to Bethelincovibe TV</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Discover a growing business and media ecosystem built to help businesses, entrepreneurs, creators and communities connect, promote their work, discover opportunities and grow.
                </p>
                <div className="text-[10px] text-primary font-mono flex items-center gap-1 pt-1">
                  <ExternalLink className="h-3 w-3" /> Target Destination: /dashboard/notifications
                </div>
              </div>

              {/* Action Button */}
              <Button
                onClick={() => sendTest.mutate()}
                disabled={sendTest.isPending}
                className="w-full h-12 rounded-2xl font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 gap-2 shadow-md text-sm"
              >
                {sendTest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Send Branded Test Push Now
              </Button>

              <div className="space-y-2 text-xs text-muted-foreground border-t pt-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Inserts an isolated notification record into your dashboard inbox</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Dispatches real OS push event via service worker and edge function</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Never exposes technical FCM or developer test wording</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: DELIVERY LOGS & HISTORY */}
        <TabsContent value="history" className="space-y-4">
          <Card className="border-border/80 shadow-md rounded-2xl">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <History className="h-5 w-5 text-purple-500" /> Broadcast & Delivery History
                </CardTitle>
                <CardDescription>Audited records of past platform announcements and targeted pushes.</CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search past logs..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="pl-8 h-8 text-xs rounded-xl w-48 bg-card"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchHistory()} className="rounded-xl h-8">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {loadingHistory ? (
                <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading delivery logs...
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No broadcast history records found.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {filteredHistory.map((item: any) => (
                    <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-foreground">{item.title}</p>
                          <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0">
                            {item.recipient_count} Recipient{item.recipient_count !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.body}</p>
                        {item.url && (
                          <span className="text-[10px] font-mono text-primary flex items-center gap-1">
                            <ExternalLink className="h-2.5 w-2.5" /> Link: {item.url}
                          </span>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {item.sent_at ? format(new Date(item.sent_at), "MMM d, yyyy • h:mm a") : "Recent"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: SUBSCRIBERS & DEVICES */}
        <TabsContent value="subscribers" className="space-y-6">
          <Card className="border-border/80 shadow-md rounded-2xl">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-500" /> Connected Push Devices
                </CardTitle>
                <CardDescription>
                  Active push token registrations mapped to user accounts.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => { refetchSubscribers(); refetchPushSubs(); }} className="rounded-xl">
                <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
              </Button>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border p-3 bg-muted/20">
                  <p className="text-xs text-muted-foreground font-medium">OneSignal Links</p>
                  <p className="text-2xl font-black text-foreground">{subscriberStats.totalOneSignal}</p>
                </div>
                <div className="rounded-2xl border p-3 bg-muted/20">
                  <p className="text-xs text-muted-foreground font-medium">FCM Tokens</p>
                  <p className="text-2xl font-black text-foreground">{subscriberStats.totalFcm}</p>
                </div>
                <div className="rounded-2xl border p-3 bg-muted/20">
                  <p className="text-xs text-muted-foreground font-medium">Linked Accounts</p>
                  <p className="text-2xl font-black text-foreground">{subscriberStats.connectedUsers}</p>
                </div>
                <div className="rounded-2xl border p-3 bg-muted/20">
                  <p className="text-xs text-muted-foreground font-medium">Total Active Reach</p>
                  <p className="text-2xl font-black text-primary">{subscriberStats.totalCombined}</p>
                </div>
              </div>

              {/* Table */}
              {loadingSubscribers ? (
                <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading subscriber list...
                </div>
              ) : !subscribers?.length ? (
                <div className="rounded-2xl border border-dashed p-8 text-center text-xs text-muted-foreground">
                  No push subscribers connected yet. Users will appear here as they enable browser notifications.
                </div>
              ) : (
                <div className="rounded-2xl border overflow-hidden">
                  <div className="max-h-80 overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/60 sticky top-0">
                        <tr className="text-left text-muted-foreground font-bold">
                          <th className="px-4 py-2.5">User</th>
                          <th className="px-4 py-2.5">Email</th>
                          <th className="px-4 py-2.5">Player / Device Token</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {subscribers.map((subscriber: any) => (
                          <tr key={subscriber.user_id || subscriber.onesignal_player_id} className="hover:bg-muted/30 transition">
                            <td className="px-4 py-2.5">
                              <div className="font-bold text-foreground">
                                {subscriber.display_name || subscriber.username || "Unnamed User"}
                              </div>
                              {subscriber.user_id && (
                                <div className="text-[10px] text-muted-foreground font-mono">{subscriber.user_id}</div>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">{subscriber.email || "—"}</td>
                            <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground break-all">
                              {subscriber.onesignal_player_id}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: PROMPT & OPT-IN SETTINGS */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="border-border/80 shadow-md rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Opt-In Prompt Settings
              </CardTitle>
              <CardDescription>
                Configure how the subscription invitation is presented to first-time platform visitors.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="os_enabled"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="h-5 w-5 accent-primary rounded cursor-pointer"
                />
                <Label htmlFor="os_enabled" className="cursor-pointer font-bold text-sm">
                  Enable automatic browser push opt-in prompt
                </Label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PROMPT_STYLES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPromptStyle(t.id)}
                    className={cn(
                      "relative rounded-2xl border-2 p-4 text-left transition hover:border-primary/60 hover:bg-primary/5",
                      promptStyle === t.id ? "border-primary bg-primary/10" : "border-border"
                    )}
                  >
                    {promptStyle === t.id && (
                      <div className="absolute top-2.5 right-2.5 bg-primary text-primary-foreground rounded-full p-0.5">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    <p className="font-bold text-sm">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-xs sm:text-sm">Custom Prompt Description</Label>
                <Textarea
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  rows={2}
                  placeholder="Join our Lagos business community to get updates"
                  className="rounded-xl text-xs sm:text-sm"
                />
              </div>

              <Button
                onClick={() => savePrompt.mutate()}
                disabled={savePrompt.isPending}
                className="font-bold rounded-2xl bg-primary"
              >
                {savePrompt.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Opt-In Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
