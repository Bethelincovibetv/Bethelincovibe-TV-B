import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserFcmDevices,
  removeFcmDevice,
  requestAndSaveFcmToken,
  getUserNotificationPreferences,
  saveUserNotificationPreferences,
  sendFcmNotificationToUser,
  FcmDevice,
  FcmNotificationPreferences,
  DEFAULT_PREFERENCES,
} from "@/lib/fcm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bell,
  Smartphone,
  Laptop,
  Trash2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ShoppingBag,
  DollarSign,
  FileText,
  Users,
  ShieldAlert,
  Send,
  Loader2,
  RefreshCw,
  Volume2,
  Play,
  Music,
} from "lucide-react";
import {
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
  getCachedSoundPreference,
  setCachedSoundPreference,
  previewNotificationSound,
  NOTIFICATION_SOUND_PRESETS,
  NotificationSoundPreset,
} from "@/lib/notificationSound";
import { formatDistanceToNow } from "date-fns";

function safeFormatLastActive(dateVal?: string): string {
  if (!dateVal) return "recently";
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return "recently";
  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "recently";
  }
}

export default function NotificationSettings() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<FcmDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [prefs, setPrefs] = useState<FcmNotificationPreferences>(DEFAULT_PREFERENCES);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const permissionStatus = typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";

  const loadData = async () => {
    if (!user) return;
    setLoadingDevices(true);
    try {
      const devList = await getUserFcmDevices(user.id);
      setDevices(devList);
      const userPrefs = await getUserNotificationPreferences(user.id);
      setPrefs(userPrefs);
    } catch (err) {
      console.warn("Failed loading notification settings:", err);
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const handleTogglePush = async (enabled: boolean) => {
    if (!user) return;
    if (enabled && permissionStatus !== "granted") {
      setEnablingPush(true);
      const res = await requestAndSaveFcmToken(user.id);
      setEnablingPush(false);
      if (res.token) {
        toast.success("Push notifications enabled!");
        loadData();
      } else {
        toast.error(res.error || "Permission denied or failed to enable");
        return;
      }
    }

    const newPrefs = { ...prefs, enabled };
    setPrefs(newPrefs);
    await saveUserNotificationPreferences(user.id, newPrefs);
    toast.success(enabled ? "Push notifications turned ON" : "Push notifications turned OFF");
  };

  const handlePrefChange = async (key: keyof FcmNotificationPreferences, val: boolean) => {
    if (!user) return;
    const updated = { ...prefs, [key]: val };
    setPrefs(updated);
    setSavingPrefs(true);
    await saveUserNotificationPreferences(user.id, updated);
    setSavingPrefs(false);
    toast.success("Preferences updated");
  };

  const handleRemoveDevice = async (device: FcmDevice) => {
    try {
      await removeFcmDevice(device.id, device.token);
      toast.success("Device removed");
      setDevices((prev) => prev.filter((d) => d.id !== device.id));
    } catch (e: any) {
      toast.error("Failed to remove device");
    }
  };

  const handleSendTest = async () => {
    if (!user) return;
    setSendingTest(true);
    try {
      await sendFcmNotificationToUser({
        userId: user.id,
        title: "🔔 Test Push Notification",
        body: "Your FCM push notifications are working perfectly on Bethelincovibe TV!",
        url: "/dashboard",
        type: "system",
      });
      toast.success("Test notification triggered! Check your device or notification bell.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send test push notification");
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" /> Notification Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage how and when you receive push notifications across your devices.
        </p>
      </div>

      {/* Main Push Toggle Card */}
      <Card className="border-primary/20 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Push Notifications
              {prefs.enabled && permissionStatus === "granted" ? (
                <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 text-xs">
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Disabled
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Receive real-time updates directly on your mobile device or browser desktop.
            </CardDescription>
          </div>
          <Switch
            checked={prefs.enabled && permissionStatus === "granted"}
            onCheckedChange={handleTogglePush}
            disabled={enablingPush}
          />
        </CardHeader>
        <CardContent className="pt-2">
          {permissionStatus === "denied" && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2 mt-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>
                Notifications are blocked in browser settings. Click the lock icon in your browser address bar to allow notifications for Bethelincovibe TV.
              </span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendTest}
              disabled={sendingTest || !prefs.enabled}
              className="text-xs"
            >
              {sendingTest ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1.5 text-primary" />
              )}
              Send Test Push to My Device
            </Button>
            <Button variant="ghost" size="sm" onClick={loadData} className="text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connected Devices Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" /> Registered Devices
          </CardTitle>
          <CardDescription>
            Devices linked to your account for receiving push notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingDevices ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2 py-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading devices…
            </div>
          ) : devices.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              <Laptop className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
              No push devices registered yet. Enable push notifications above to link this browser.
            </div>
          ) : (
            <div className="space-y-2">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border bg-card hover:bg-accent/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      {device.userAgent.toLowerCase().includes("android") ||
                      device.userAgent.toLowerCase().includes("ios") ? (
                        <Smartphone className="h-5 w-5" />
                      ) : (
                        <Laptop className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">{device.userAgent}</span>
                        {device.isCurrentDevice && (
                          <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0">
                            This Device
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Active {safeFormatLastActive(device.lastActive)}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveDevice(device)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Preferences Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notification Categories</CardTitle>
          <CardDescription>
            Choose which types of activity trigger push notifications on your devices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 divide-y divide-border/60">
          <div className="flex items-center justify-between pt-3 first:pt-0">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <div>
                <Label className="text-sm font-medium cursor-pointer">Messages & Enquiries</Label>
                <p className="text-xs text-muted-foreground">New buyer chats, WhatsApp leads & business messages</p>
              </div>
            </div>
            <Switch
              checked={prefs.messages}
              onCheckedChange={(val) => handlePrefChange("messages", val)}
              disabled={!prefs.enabled}
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-4 w-4 text-emerald-500" />
              <div>
                <Label className="text-sm font-medium cursor-pointer">Marketplace & Products</Label>
                <p className="text-xs text-muted-foreground">Product sales, downloads & buyer order updates</p>
              </div>
            </div>
            <Switch
              checked={prefs.marketplace}
              onCheckedChange={(val) => handlePrefChange("marketplace", val)}
              disabled={!prefs.enabled}
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-amber-500" />
              <div>
                <Label className="text-sm font-medium cursor-pointer">Sales & Payments</Label>
                <p className="text-xs text-muted-foreground">Wallet credit alerts, payouts & ad earnings</p>
              </div>
            </div>
            <Switch
              checked={prefs.sales}
              onCheckedChange={(val) => handlePrefChange("sales", val)}
              disabled={!prefs.enabled}
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-purple-500" />
              <div>
                <Label className="text-sm font-medium cursor-pointer">Blog & Community</Label>
                <p className="text-xs text-muted-foreground">New blog articles, comments, forum replies & mentions</p>
              </div>
            </div>
            <Switch
              checked={prefs.blog}
              onCheckedChange={(val) => handlePrefChange("blog", val)}
              disabled={!prefs.enabled}
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-indigo-500" />
              <div>
                <Label className="text-sm font-medium cursor-pointer">Business Listings & Boosts</Label>
                <p className="text-xs text-muted-foreground">Business profile approvals, reviews & boost status</p>
              </div>
            </div>
            <Switch
              checked={prefs.business}
              onCheckedChange={(val) => handlePrefChange("business", val)}
              disabled={!prefs.enabled}
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              <div>
                <Label className="text-sm font-medium cursor-pointer">System & Security</Label>
                <p className="text-xs text-muted-foreground">Account security alerts & important platform announcements</p>
              </div>
            </div>
            <Switch
              checked={prefs.system}
              onCheckedChange={(val) => handlePrefChange("system", val)}
              disabled={!prefs.enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sound & Chimes Card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-primary" /> Audio Alerts & Chimes
            </CardTitle>
            <CardDescription className="mt-0.5">
              Choose your personal notification sound style when active on the platform.
            </CardDescription>
          </div>
          <Switch
            checked={isNotificationSoundEnabled()}
            onCheckedChange={(val) => {
              setNotificationSoundEnabled(val);
              toast.success(val ? "Sound alerts enabled" : "Sound alerts muted");
              if (val) previewNotificationSound();
            }}
          />
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {NOTIFICATION_SOUND_PRESETS.map((preset) => {
              const { preset: currentPreset, customUrl } = getCachedSoundPreference();
              const isSelected = currentPreset === preset.id && !customUrl;
              return (
                <div
                  key={preset.id}
                  onClick={() => {
                    setCachedSoundPreference(preset.id, "");
                    previewNotificationSound(preset.id);
                    toast.success(`Sound set to ${preset.name}`);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "hover:bg-muted/40 border-border"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      <Music className="h-3.5 w-3.5 text-primary" />
                      {preset.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      {preset.description}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-full shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      previewNotificationSound(preset.id);
                    }}
                  >
                    <Play className="h-3.5 w-3.5 fill-current text-primary" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
