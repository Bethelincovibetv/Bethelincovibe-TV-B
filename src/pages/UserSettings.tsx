import { useState, useEffect, useRef } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Settings,
  Music,
  Volume2,
  VolumeX,
  Play,
  Pause,
  User,
  Bell,
  ShieldCheck,
  KeyRound,
  Sliders,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Phone,
  Save,
  Radio,
  Building2,
  Crown,
} from "lucide-react";
import { useJinglePreferences, saveJinglePrefs } from "@/lib/jingleAudio";
import NotificationSettings from "@/components/dashboard/NotificationSettings";
import PhoneInput from "@/components/PhoneInput";
import {
  NOTIFICATION_SOUND_PRESETS,
  previewNotificationSound,
  getCachedSoundPreference,
  setCachedSoundPreference,
  NotificationSoundPreset,
} from "@/lib/notificationSound";

export default function UserSettings() {
  const { user, loading, isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const activeTabParam = params.get("tab") || "audio";

  const { prefs: jinglePrefs, updatePrefs: updateJinglePrefs } = useJinglePreferences();

  // Profile Form State
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Business info for link preview
  const [userBiz, setUserBiz] = useState<any>(null);

  // Music & Jingle State from Supabase
  const [activeJingle, setActiveJingle] = useState<{
    id: string;
    audio_url: string;
    title: string;
    volume: number;
  } | null>(null);
  const [adminMasterVolume, setAdminMasterVolume] = useState<number>(0.5);
  const [adminAllowsMusic, setAdminAllowsMusic] = useState<boolean>(true);
  const [loadingAudioSettings, setLoadingAudioSettings] = useState(true);

  // Audition preview in settings page
  const [auditionPlaying, setAuditionPlaying] = useState(false);
  const auditionAudioRef = useRef<HTMLAudioElement | null>(null);

  // Notification sound preset
  const [soundPreset, setSoundPreset] = useState<NotificationSoundPreset>("bethel_vibe");

  // Load User Data & Platform Audio Settings
  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const loadAllSettings = async () => {
      setLoadingAudioSettings(true);
      try {
        // 1. Load user profile
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (prof && isMounted) {
          setProfile(prof);
          setDisplayName(prof.display_name || "");
          setUsername(prof.username || "");
          setBio(prof.bio || "");
          setPhone(prof.phone || "");
          setAvatarUrl(prof.avatar_url || "");
        }

        // 2. Load business snippet
        const { data: biz } = await supabase
          .from("suppliers")
          .select("id, name, logo_url, verified")
          .eq("submitted_by", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (biz && isMounted) {
          setUserBiz(biz);
        }

        // 3. Load active background jingle
        const { data: jingleData } = await supabase
          .from("site_jingles")
          .select("id, audio_url, title, volume")
          .eq("active", true)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (jingleData && isMounted) {
          setActiveJingle(jingleData as any);
        }

        // 4. Load site_settings for background music allowance & master volume
        const { data: settingsData } = await supabase
          .from("site_settings")
          .select("key, value")
          .in("key", ["allow_background_music", "master_jingle_volume", "notification_sound_preset"]);

        if (settingsData && isMounted) {
          settingsData.forEach((s) => {
            if (s.key === "allow_background_music") {
              setAdminAllowsMusic(s.value !== "false");
            }
            if (s.key === "master_jingle_volume" && s.value) {
              const val = parseFloat(s.value);
              if (!isNaN(val)) setAdminMasterVolume(val);
            }
            if (s.key === "notification_sound_preset" && s.value) {
              setSoundPreset(s.value as NotificationSoundPreset);
            }
          });
        }
      } catch (err) {
        console.warn("Could not load user settings:", err);
      } finally {
        if (isMounted) setLoadingAudioSettings(false);
      }
    };

    loadAllSettings();

    // Cache sound preset preference check
    const cached = getCachedSoundPreference();
    if (cached.preset) {
      setSoundPreset(cached.preset as NotificationSoundPreset);
    }

    return () => {
      isMounted = false;
      if (auditionAudioRef.current) {
        auditionAudioRef.current.pause();
        auditionAudioRef.current = null;
      }
    };
  }, [user]);

  // Tab change handler
  const handleTabChange = (val: string) => {
    setParams({ tab: val }, { replace: true });
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      
      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          username: cleanUsername || null,
          bio: bio.trim(),
          phone: phone.trim(),
          avatar_url: avatarUrl.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Profile preferences saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // Password Reset Trigger
  const [sendingReset, setSendingReset] = useState(false);
  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(`Password reset email sent to ${user.email}. Check your inbox!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send password reset email");
    } finally {
      setSendingReset(false);
    }
  };

  // Audition Active Background Track
  const toggleAudition = () => {
    if (!activeJingle?.audio_url) return;

    if (auditionPlaying) {
      if (auditionAudioRef.current) {
        auditionAudioRef.current.pause();
      }
      setAuditionPlaying(false);
    } else {
      if (!auditionAudioRef.current) {
        auditionAudioRef.current = new Audio(activeJingle.audio_url);
        auditionAudioRef.current.onended = () => setAuditionPlaying(false);
      }
      const trackLimit = activeJingle.volume ?? 0.3;
      const ceiling = Math.min(trackLimit, adminMasterVolume);
      auditionAudioRef.current.volume = Math.max(0, Math.min(jinglePrefs.volume * ceiling, ceiling));
      auditionAudioRef.current.play().catch(() => {
        toast.error("Audio playback blocked by browser. Please tap again.");
      });
      setAuditionPlaying(true);
    }
  };

  // Update audition volume if volume slider changes during audition
  const handleVolumeSliderChange = (newVal: number) => {
    updateJinglePrefs({ volume: newVal, muted: false });
    if (auditionAudioRef.current && auditionPlaying && activeJingle) {
      const trackLimit = activeJingle.volume ?? 0.3;
      const ceiling = Math.min(trackLimit, adminMasterVolume);
      auditionAudioRef.current.volume = Math.max(0, Math.min(newVal * ceiling, ceiling));
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hardCeiling = activeJingle ? Math.min(activeJingle.volume ?? 0.3, adminMasterVolume) : 0.3;
  const effectiveVolumePct = Math.round(jinglePrefs.volume * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-20">
      <Helmet>
        <title>Account & Audio Settings | Bethelincovibe TV</title>
      </Helmet>

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 text-white px-4 py-6 sm:py-8 shadow-lg">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <Button
                asChild
                size="icon"
                variant="ghost"
                className="rounded-xl h-10 w-10 text-white hover:bg-white/20 shrink-0"
              >
                <Link to="/dashboard">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                    <Settings className="h-6 w-6 text-amber-300" />
                    Account & App Settings
                  </h1>
                  {isAdmin && (
                    <Badge className="bg-amber-400 text-amber-950 text-[10px] font-extrabold">
                      Admin
                    </Badge>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-white/80 font-medium mt-0.5">
                  Manage your audio & ambient sound preferences, profile details, push notifications, and security.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {profile?.username && (
                <Button
                  asChild
                  size="sm"
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-white font-bold border-0 text-xs h-9 px-3"
                >
                  <Link to={`/u/${profile.username}`} target="_blank">
                    <ExternalLink className="h-3.5 w-3.5 mr-1 text-emerald-300" />
                    View My Site
                  </Link>
                </Button>
              )}
              <Button
                asChild
                size="sm"
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white font-bold border-0 text-xs h-9 px-3"
              >
                <Link to="/dashboard/profile-edit">
                  <Crown className="h-3.5 w-3.5 mr-1 text-amber-300" />
                  Business Page
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Content */}
      <div className="container mx-auto max-w-5xl px-4 py-6">
        <Tabs value={activeTabParam} onValueChange={handleTabChange} className="space-y-6">
          {/* Responsive Navigation Tab List */}
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto p-1.5 gap-1.5 bg-card/80 border rounded-2xl shadow-xs">
            <TabsTrigger
              value="audio"
              className="flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-bold rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white shadow-xs transition-all"
            >
              <Music className="h-4 w-4" />
              <span>Music & Audio</span>
            </TabsTrigger>

            <TabsTrigger
              value="profile"
              className="flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-bold rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white shadow-xs transition-all"
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>

            <TabsTrigger
              value="notifications"
              className="flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-bold rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white shadow-xs transition-all"
            >
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </TabsTrigger>

            <TabsTrigger
              value="security"
              className="flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-bold rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white shadow-xs transition-all"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Security</span>
            </TabsTrigger>
          </TabsList>

          {/* ================= TAB 1: MUSIC & AUDIO SETTINGS ================= */}
          <TabsContent value="audio" className="space-y-6 animate-fade-in focus:outline-hidden">
            {/* Admin Allowance Status Banner */}
            {adminAllowsMusic && activeJingle ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold flex items-center gap-1.5">
                      Platform Background Audio is Enabled by Admin
                    </p>
                    <p className="text-xs opacity-90">
                      Active track: <span className="font-semibold">"{activeJingle.title}"</span>. Customize your playback volume and muting below.
                    </p>
                  </div>
                </div>
                <Badge className="bg-emerald-500 text-white font-black text-xs px-2.5 py-1 self-start sm:self-auto shrink-0 shadow-2xs">
                  Live & Active
                </Badge>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">
                      Background Music is Currently Disabled by Platform Admin
                    </p>
                    <p className="text-xs opacity-90">
                      {!adminAllowsMusic
                        ? "The site administrator has paused all ambient soundtracks. Playback is temporarily suspended site-wide."
                        : "No active soundtrack is currently selected in the admin sound library."}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <Button asChild size="sm" variant="outline" className="text-xs font-bold border-amber-500/40 shrink-0">
                    <Link to="/admin/jingles">
                      <Settings className="h-3.5 w-3.5 mr-1" />
                      Manage in Admin
                    </Link>
                  </Button>
                )}
              </div>
            )}

            {/* Core Background Music Controls Card */}
            <Card className="border-violet-500/30 shadow-md bg-card/95 overflow-hidden rounded-3xl">
              <CardHeader className="border-b bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent py-4 px-5 sm:px-6">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md ring-1 ring-white/30">
                      <Music className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base sm:text-lg font-black">
                        Ambient Sound & Background Jingle
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Adjust background music preferences. Floating buttons on the homepage are hidden; your settings apply seamlessly.
                      </CardDescription>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`font-black text-xs px-3 py-1 ${
                      jinglePrefs.muted
                        ? "bg-muted text-muted-foreground border-border"
                        : "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30"
                    }`}
                  >
                    {jinglePrefs.muted ? "Audio Muted" : `Volume ${effectiveVolumePct}%`}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 sm:p-6 space-y-6">
                {/* 1. Master Audio Switch */}
                <div className="flex items-center justify-between p-4 rounded-2xl border bg-muted/40 transition-all hover:bg-muted/60">
                  <div className="space-y-0.5 pr-4">
                    <Label htmlFor="master-jingle-toggle" className="text-sm font-bold cursor-pointer flex items-center gap-2">
                      {jinglePrefs.muted ? (
                        <VolumeX className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Volume2 className="h-4 w-4 text-violet-600" />
                      )}
                      Enable Background Music
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Play ambient music softly in the background when browsing the homepage and marketplace.
                    </p>
                  </div>
                  <Switch
                    id="master-jingle-toggle"
                    disabled={!adminAllowsMusic || !activeJingle}
                    checked={!jinglePrefs.muted}
                    onCheckedChange={(checked) => {
                      updateJinglePrefs({ muted: !checked });
                      toast.success(checked ? "Background music unmuted" : "Background music muted");
                    }}
                  />
                </div>

                {/* 2. Active Track Preview & Audition */}
                {activeJingle && (
                  <div className="p-4 rounded-2xl border bg-violet-500/5 border-violet-500/20 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                          Current Platform Track
                        </p>
                        <h4 className="text-base font-extrabold truncate text-foreground flex items-center gap-2 mt-0.5">
                          <Radio className="h-4 w-4 text-violet-600 animate-pulse" />
                          {activeJingle.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Admin Safety Limit: {Math.round(hardCeiling * 100)}% Max Ceiling
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant={auditionPlaying ? "default" : "outline"}
                        size="sm"
                        disabled={!adminAllowsMusic}
                        onClick={toggleAudition}
                        className={`h-9 px-4 rounded-xl font-bold gap-2 shrink-0 ${
                          auditionPlaying
                            ? "bg-violet-600 hover:bg-violet-700 text-white shadow-md"
                            : "border-violet-500/30 text-violet-700 dark:text-violet-300 hover:bg-violet-500/10"
                        }`}
                      >
                        {auditionPlaying ? (
                          <>
                            <Pause className="h-4 w-4 fill-current" />
                            Stop Audition
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 fill-current" />
                            Test Audition
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Sound wave visualizer pulse */}
                    {auditionPlaying && (
                      <div className="flex items-center gap-1 h-4 pt-1">
                        <div className="h-3 w-1 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="h-4 w-1 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="h-2 w-1 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.45s]" />
                        <div className="h-3.5 w-1 bg-violet-500 rounded-full animate-bounce" />
                        <div className="h-2 w-1 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.2s]" />
                        <span className="text-[11px] text-violet-600 font-bold ml-2">Playing live audition preview...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Volume Slider Control */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-violet-600" />
                      Playback Volume Level
                    </Label>
                    <span className="text-sm font-black font-mono text-violet-700 dark:text-violet-300">
                      {effectiveVolumePct}%
                    </span>
                  </div>

                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    disabled={!adminAllowsMusic || !activeJingle || jinglePrefs.muted}
                    value={[jinglePrefs.volume]}
                    onValueChange={(v) => handleVolumeSliderChange(v[0])}
                    className="my-2"
                  />

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                    <span>Silent (0%)</span>
                    <span>Comfortable (30%)</span>
                    <span>Max Ceiling ({Math.round(hardCeiling * 100)}%)</span>
                  </div>
                </div>

                {/* 4. Auto-Play on Visit Toggle */}
                <div className="flex items-center justify-between p-4 rounded-2xl border bg-muted/40 transition-all">
                  <div className="space-y-0.5 pr-4">
                    <Label htmlFor="auto-resume-music" className="text-sm font-bold cursor-pointer">
                      Auto-Resume Ambient Music
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically resume soothing ambient soundtrack on return visits without requiring manual unmuting.
                    </p>
                  </div>
                  <Switch
                    id="auto-resume-music"
                    disabled={!adminAllowsMusic}
                    checked={jinglePrefs.autoplay}
                    onCheckedChange={(checked) => {
                      updateJinglePrefs({ autoplay: checked });
                      toast.success(checked ? "Auto-resume enabled" : "Auto-resume disabled");
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notification Chimes Preset Selector */}
            <Card className="border-border shadow-xs rounded-3xl">
              <CardHeader className="py-4 px-5 sm:px-6 border-b">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-primary" />
                  Notification & Push Sound Preset
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose the audio chime played when you receive business leads, orders, wallet credits, or messages.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {NOTIFICATION_SOUND_PRESETS.map((preset) => {
                    const isSelected = soundPreset === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => {
                          setSoundPreset(preset.id);
                          setCachedSoundPreference(preset.id);
                          previewNotificationSound(preset.id);
                          toast.success(`Selected "${preset.name}"`);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30"
                            : "hover:bg-muted/50 border-border"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold flex items-center gap-1.5">
                            <Music className="h-4 w-4 text-primary shrink-0" />
                            {preset.name}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {preset.description}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className="h-8 px-2.5 shrink-0 rounded-xl font-bold"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSoundPreset(preset.id);
                            setCachedSoundPreference(preset.id);
                            previewNotificationSound(preset.id);
                          }}
                        >
                          <Play className="h-3.5 w-3.5 mr-1 fill-current" />
                          Test
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= TAB 2: PROFILE & IDENTITY ================= */}
          <TabsContent value="profile" className="space-y-6 animate-fade-in focus:outline-hidden">
            <Card className="border-border shadow-md rounded-3xl">
              <CardHeader className="border-b py-4 px-5 sm:px-6">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Personal & Public Identity
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Update your display name, username, bio, and phone number.
                    </CardDescription>
                  </div>
                  {userBiz && (
                    <Button asChild size="sm" variant="outline" className="text-xs font-bold rounded-xl">
                      <Link to="/dashboard/profile-edit">
                        <Building2 className="h-3.5 w-3.5 mr-1 text-primary" />
                        Edit Business Profile
                      </Link>
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-5 sm:p-6">
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="displayName" className="text-xs font-bold">
                        Display Name
                      </Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Bethel Goodgift"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="username" className="text-xs font-bold">
                        Public Username
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">
                          /u/
                        </span>
                        <Input
                          id="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                          placeholder="username"
                          className="pl-8 rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-bold">
                      WhatsApp / Phone Number
                    </Label>
                    <PhoneInput
                      value={phone}
                      onChange={setPhone}
                      placeholder="08012345678"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bio" className="text-xs font-bold">
                      Short Bio / About
                    </Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell customers and fellow entrepreneurs about yourself..."
                      rows={3}
                      className="rounded-xl text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="avatarUrl" className="text-xs font-bold">
                      Avatar / Profile Picture URL
                    </Label>
                    <Input
                      id="avatarUrl"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="rounded-xl font-mono text-xs"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      disabled={savingProfile}
                      className="rounded-xl font-bold bg-primary text-primary-foreground shadow-md px-5"
                    >
                      {savingProfile ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {savingProfile ? "Saving..." : "Save Profile Preferences"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= TAB 3: NOTIFICATIONS ================= */}
          <TabsContent value="notifications" className="space-y-6 animate-fade-in focus:outline-hidden">
            <NotificationSettings />
          </TabsContent>

          {/* ================= TAB 4: SECURITY & AUTHENTICATION ================= */}
          <TabsContent value="security" className="space-y-6 animate-fade-in focus:outline-hidden">
            <Card className="border-border shadow-md rounded-3xl">
              <CardHeader className="border-b py-4 px-5 sm:px-6">
                <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Account Security & Login
                </CardTitle>
                <CardDescription className="text-xs">
                  Manage your credentials, password reset, and verification credentials.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border bg-muted/30">
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground">Account Email</Label>
                    <p className="text-base font-extrabold text-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Used for logging in, transactional receipts, and system alerts.
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold self-start sm:self-auto">
                    Verified Email
                  </Badge>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border bg-muted/30">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-primary" />
                      Password Reset
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Request a secure password reset link sent directly to your registered email address.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={sendingReset}
                    onClick={handleSendPasswordReset}
                    className="rounded-xl font-bold text-xs h-9 px-4 shrink-0 shadow-2xs"
                  >
                    {sendingReset ? "Sending Link..." : "Send Reset Email"}
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border bg-muted/30">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Business & Seller Verification
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Get the verified badge on your listings, profile, and customer search results.
                    </p>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="secondary"
                    className="rounded-xl font-bold text-xs h-9 px-4 shrink-0 shadow-2xs"
                  >
                    <Link to="/dashboard/verification">
                      Verification Center
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
