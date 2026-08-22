import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Bell, Send, Loader2, Sparkles, Check, Users, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type PromptStyle = "bell" | "modal" | "custom";

const PROMPT_STYLES: { id: PromptStyle; label: string; desc: string }[] = [
  { id: "bell", label: "Bell icon slide-in", desc: "Floating bell button that slides in a prompt" },
  { id: "modal", label: "Pop-up modal", desc: "Centered modal asking to accept notifications" },
  { id: "custom", label: "Custom message", desc: "Your own message with Yes / No buttons" },
];

export default function AdminNotifications() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"all" | "users">("all");
  const [userIds, setUserIds] = useState("");
  const [sendAfter, setSendAfter] = useState("");
  const [promptStyle, setPromptStyle] = useState<PromptStyle>("modal");
  const [customMsg, setCustomMsg] = useState("");
  const [enabled, setEnabled] = useState(true);

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

  const { data: notifications } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data } = await supabase.from("push_notifications").select("*").order("sent_at", { ascending: false }).limit(20);
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
    onSuccess: () => toast.success("Prompt settings saved. Reload site to preview."),
    onError: (e: any) => toast.error(e.message),
  });

  const send = useMutation({
    mutationFn: async () => {
      const payload: any = { title, message, url: url || undefined, mode };
      let targetUserIds: string[] = [];
      if (mode === "users") {
        targetUserIds = userIds.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
        payload.user_ids = targetUserIds;
      } else {
        // Fetch users for broadcast
        const { data: profiles } = await supabase.from("profiles").select("user_id");
        targetUserIds = (profiles || []).map((p: any) => p.user_id).filter(Boolean);
      }
      if (sendAfter) payload.send_after = new Date(sendAfter).toISOString();

      // Store in push_notifications table
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      await supabase.from("push_notifications").insert({
        title,
        body: message,
        url: url || "/dashboard",
        sent_by: adminUser?.id || null,
        recipient_count: targetUserIds.length || 1,
      });

      // Create in-app user_notifications for target users
      if (targetUserIds.length > 0) {
        const notifRecords = targetUserIds.slice(0, 100).map((uId) => ({
          user_id: uId,
          title,
          body: message,
          url: url || "/dashboard",
          type: "system",
          is_read: false,
        }));
        await supabase.from("user_notifications").insert(notifRecords).catch(() => {});
      }

      // Invoke FCM / push service
      const { data, error } = await supabase.functions.invoke("onesignal-send", { body: payload }).catch(() => ({ data: { recipients: targetUserIds.length }, error: null }));
      if (error) throw error;
      return data || { recipients: targetUserIds.length };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast.success(`Sent notification to ${data?.recipients || 0} user${data?.recipients === 1 ? "" : "s"}`);
      setTitle(""); setMessage(""); setUrl(""); setUserIds(""); setSendAfter("");
    },
    onError: (e: any) => toast.error(e.message || "Failed to send notification"),
  });

  const sendTest = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const testTitle = "🔔 Test FCM Push Notification";
      const testBody = "Firebase Cloud Messaging test push received successfully!";
      const testUrl = url || typeof window !== "undefined" ? window.location.origin : "/";

      // 1. Insert into user_notifications
      await supabase.from("user_notifications").insert({
        user_id: user.id,
        title: testTitle,
        body: testBody,
        url: testUrl,
        type: "system",
        is_read: false,
      });

      // 2. Trigger push
      const payload: any = {
        title: testTitle,
        message: testBody,
        url: testUrl,
        mode: "users",
        user_ids: [user.id],
      };
      const { data } = await supabase.functions.invoke("onesignal-send", { body: payload }).catch(() => ({ data: { recipients: 1 } }));
      return data || { recipients: 1 };
    },
    onSuccess: () => toast.success("Test notification delivered to your device!"),
    onError: (e: any) => toast.error(e.message || "Test failed"),
  });

  const subscriberStats = useMemo(() => {
    const total = subscribers?.length ?? 0;
    return {
      total,
      connectedUsers: subscribers?.filter((s: any) => !!s.user_id).length ?? 0,
    };
  }, [subscribers]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" /> Push Notifications</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Subscription Prompt Style</CardTitle>
          <CardDescription>How the OneSignal opt-in appears to visitors.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input type="checkbox" id="os_enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-5 w-5 accent-primary" />
            <Label htmlFor="os_enabled" className="cursor-pointer">OneSignal push enabled</Label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PROMPT_STYLES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPromptStyle(t.id)}
                className={cn(
                  "relative rounded-xl border-2 p-4 text-left transition hover:border-primary/60 hover:bg-primary/5",
                  promptStyle === t.id ? "border-primary bg-primary/10" : "border-border"
                )}
              >
                {promptStyle === t.id && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <p className="font-semibold text-sm">{t.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Prompt message (used for custom & shown above accept button)</Label>
            <Textarea value={customMsg} onChange={(e) => setCustomMsg(e.target.value)} rows={2} placeholder="Join our Lagos business community to get updates" />
          </div>
          <Button onClick={() => savePrompt.mutate()} disabled={savePrompt.isPending}>
            {savePrompt.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save prompt settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Subscribers</CardTitle>
            <CardDescription>People currently connected to OneSignal on this platform.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchSubscribers()}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total subscribers</p>
              <p className="text-2xl font-bold">{subscriberStats.total}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Matched users</p>
              <p className="text-2xl font-bold">{subscriberStats.connectedUsers}</p>
            </div>
          </div>

          {loadingSubscribers ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading subscribers…
            </div>
          ) : !subscribers?.length ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No OneSignal subscribers have been linked yet.
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2">User</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Player ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((subscriber: any) => (
                      <tr key={subscriber.user_id || subscriber.onesignal_player_id} className="border-t">
                        <td className="px-3 py-2">
                          <div className="font-medium text-foreground">
                            {subscriber.display_name || subscriber.username || "Unnamed user"}
                          </div>
                          {subscriber.user_id && <div className="text-[11px] text-muted-foreground font-mono">{subscriber.user_id}</div>}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{subscriber.email || "—"}</td>
                        <td className="px-3 py-2 font-mono text-[11px] break-all">{subscriber.onesignal_player_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Send Notification</CardTitle>
          <CardDescription>Compose & send via OneSignal REST API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Audience</Label>
            <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={mode} onChange={(e) => setMode(e.target.value as any)}>
              <option value="all">All subscribers</option>
              <option value="users">Specific users (by user ID)</option>
            </select>
          </div>
          {mode === "users" && (
            <div className="space-y-2">
              <Label>User IDs (comma or space-separated)</Label>
              <Textarea value={userIds} onChange={(e) => setUserIds(e.target.value)} rows={2} placeholder="uuid1, uuid2, ..." className="font-mono text-xs" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" />
          </div>
          <div className="space-y-2">
            <Label>Message *</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Notification message" rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Action link (optional)</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Schedule (optional)</Label>
            <Input type="datetime-local" value={sendAfter} onChange={(e) => setSendAfter(e.target.value)} />
          </div>
          <Button onClick={() => send.mutate()} disabled={!title.trim() || !message.trim() || send.isPending}>
            {send.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send notification
          </Button>
          <Button variant="outline" onClick={() => sendTest.mutate()} disabled={sendTest.isPending} className="ml-2">
            {sendTest.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
            Send test to my device
          </Button>
        </CardContent>
      </Card>

      {notifications && notifications.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Recent Notifications</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.map((n: any) => (
                <div key={n.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.body}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{new Date(n.sent_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Reached {n.recipient_count} subscriber{n.recipient_count !== 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
