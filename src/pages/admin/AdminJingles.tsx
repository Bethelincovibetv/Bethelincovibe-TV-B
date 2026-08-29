import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Trash2, Upload, Music, Volume2, VolumeX, Play, Pause,
  Sliders, ShieldCheck, Sparkles, CheckCircle2, Search, RefreshCw, X, Radio
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminJingles() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [defaultVolume, setDefaultVolume] = useState(0.3);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "active" | "inactive">("all");

  // Master Volume Limit (Global site ceiling)
  const [masterVolumeLimit, setMasterVolumeLimit] = useState<number>(0.5);
  const [savingMasterVolume, setSavingMasterVolume] = useState(false);
  const [allowBackgroundMusic, setAllowBackgroundMusic] = useState<boolean>(true);
  const [savingAllowMusic, setSavingAllowMusic] = useState(false);

  // Live Audition State
  const [playingJingleId, setPlayingJingleId] = useState<string | null>(null);
  const [auditionVolume, setAuditionVolume] = useState<number>(0.3);
  const [auditionTrackTitle, setAuditionTrackTitle] = useState<string>("");
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Fetch site jingles
  const { data: jingles = [], isLoading } = useQuery({
    queryKey: ["admin-jingles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_jingles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch master volume ceiling & allow_background_music from site_settings
  const { data: masterSetting, refetch: refetchMasterSetting } = useQuery({
    queryKey: ["site-setting-jingle-master-volume"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["master_jingle_volume", "allow_background_music"]);
      
      const res = { masterVolume: 0.5, allowMusic: true };
      data?.forEach((s) => {
        if (s.key === "master_jingle_volume" && s.value) {
          res.masterVolume = parseFloat(s.value);
        }
        if (s.key === "allow_background_music") {
          res.allowMusic = s.value !== "false";
        }
      });
      return res;
    },
  });

  useEffect(() => {
    if (masterSetting) {
      if (typeof masterSetting.masterVolume === "number" && !isNaN(masterSetting.masterVolume)) {
        setMasterVolumeLimit(masterSetting.masterVolume);
      }
      setAllowBackgroundMusic(masterSetting.allowMusic);
    }
  }, [masterSetting]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current = null;
      }
    };
  }, []);

  // Toggle Global Allow Background Music
  const handleToggleAllowMusic = async (enabled: boolean) => {
    setAllowBackgroundMusic(enabled);
    setSavingAllowMusic(true);
    try {
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", "allow_background_music")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("site_settings")
          .update({ value: enabled ? "true" : "false" })
          .eq("key", "allow_background_music");
      } else {
        await supabase
          .from("site_settings")
          .insert({ key: "allow_background_music", value: enabled ? "true" : "false" });
      }
      toast.success(enabled ? "Background music enabled site-wide" : "Background music paused site-wide");
      refetchMasterSetting();
    } catch (e: any) {
      toast.error("Failed to update music setting: " + e.message);
    } finally {
      setSavingAllowMusic(false);
    }
  };

  // Save Master Volume Limit
  const handleSaveMasterVolume = async (newVal: number) => {
    setMasterVolumeLimit(newVal);
    setSavingMasterVolume(true);
    try {
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", "master_jingle_volume")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("site_settings")
          .update({ value: newVal.toString() })
          .eq("key", "master_jingle_volume");
      } else {
        await supabase
          .from("site_settings")
          .insert({ key: "master_jingle_volume", value: newVal.toString() });
      }
      toast.success(`Global Master Volume Ceiling set to ${Math.round(newVal * 100)}%`);
      refetchMasterSetting();
    } catch (e: any) {
      toast.error("Failed to update master volume: " + e.message);
    } finally {
      setSavingMasterVolume(false);
    }
  };

  // Upload New Jingle
  const upload = async () => {
    if (!file || !title.trim()) return toast.error("Title and audio file are required");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "mp3";
      const path = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("jingles").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("jingles").getPublicUrl(path);

      const cappedVolume = Math.min(defaultVolume, masterVolumeLimit);
      const { error } = await supabase.from("site_jingles").insert({
        title: title.trim(),
        audio_url: pub.publicUrl,
        volume: cappedVolume,
        active: false,
      });
      if (error) throw error;

      toast.success("New background jingle uploaded successfully!");
      setTitle("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["admin-jingles"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to upload jingle");
    } finally {
      setUploading(false);
    }
  };

  // Toggle Active State
  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (active) {
        // Deactivate all others first
        await supabase.from("site_jingles").update({ active: false }).neq("id", id);
      }
      const { error } = await supabase.from("site_jingles").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-jingles"] });
      toast.success("Jingle active status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Update Individual Jingle Volume Limit
  const updateVolume = useMutation({
    mutationFn: async ({ id, volume }: { id: string; volume: number }) => {
      const { error } = await supabase
        .from("site_jingles")
        .update({ volume: Number(volume.toFixed(2)) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-jingles"] });
    },
    onError: (e: any) => toast.error("Could not save volume: " + e.message),
  });

  // Remove Jingle
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_jingles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (playingJingleId) {
        stopAudition();
      }
      qc.invalidateQueries({ queryKey: ["admin-jingles"] });
      toast.success("Jingle deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Audition Controls
  const startAudition = (jingle: any) => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }
    const currentVol = jingle.volume ?? 0.3;
    setAuditionVolume(currentVol);
    setAuditionTrackTitle(jingle.title);
    setPlayingJingleId(jingle.id);

    const audio = new Audio(jingle.audio_url);
    audio.volume = Math.min(currentVol, masterVolumeLimit);
    audio.onended = () => {
      setPlayingJingleId(null);
      setAuditionTrackTitle("");
    };
    audio.play().catch(() => toast.error("Audio playback blocked by browser"));
    audioPreviewRef.current = audio;
  };

  const stopAudition = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }
    setPlayingJingleId(null);
    setAuditionTrackTitle("");
  };

  const changeAuditionVolume = (newVol: number) => {
    setAuditionVolume(newVol);
    if (audioPreviewRef.current) {
      audioPreviewRef.current.volume = Math.min(newVol, masterVolumeLimit);
    }
  };

  // Filtered Jingles
  const filteredJingles = useMemo(() => {
    return jingles.filter((j: any) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.audio_url.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        filterMode === "all" ||
        (filterMode === "active" && j.active) ||
        (filterMode === "inactive" && !j.active);

      return matchesSearch && matchesFilter;
    });
  }, [jingles, searchQuery, filterMode]);

  const activeJingle = jingles.find((j: any) => j.active);

  return (
    <div className="space-y-6 max-w-5xl pb-24 md:pb-16">
      {/* Top Header with 3D Elevated Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-violet-600/15 via-pink-600/10 to-amber-500/15 border border-violet-500/20 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600 text-white shadow-[0_6px_16px_-2px_rgba(124,58,237,0.5),inset_0_1.5px_0_rgba(255,255,255,0.45)] ring-1 ring-white/30">
            <Music className="h-6 w-6 drop-shadow-sm" strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-none text-foreground">
                Background Jingles & Soundscapes
              </h1>
              <Badge className="bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30 text-[10px] font-extrabold">
                Safe Volume Engine
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
              Upload ambient soundtrack audio, set per-track volume limits, and configure the global master playback ceiling for visitors.
            </p>
          </div>
        </div>

        {activeJingle && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-2xl text-emerald-700 dark:text-emerald-300 text-xs font-bold self-start sm:self-auto shrink-0 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Active Track: <span className="truncate max-w-[140px]">{activeJingle.title}</span>
          </div>
        )}
      </div>

      {/* Global Master Volume Ceiling Control */}
      <Card className="border-violet-500/25 bg-gradient-to-br from-card via-violet-500/5 to-purple-500/5 shadow-md overflow-hidden rounded-3xl">
        <CardHeader className="border-b bg-violet-500/10 py-4 px-5 sm:px-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-xs">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-extrabold">
                  Global Master Volume Safety Ceiling
                </CardTitle>
                <CardDescription className="text-xs">
                  Hard ceiling limit for all background audio tracks across mobile and desktop.
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="bg-background text-xs sm:text-sm font-black px-3 py-1 text-violet-600 border-violet-500/30 shadow-2xs"
            >
              {Math.round(masterVolumeLimit * 100)}% Max Limit
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-5">
          {/* Master Enable/Disable Switch for Users */}
          <div className="flex items-center justify-between p-4 rounded-2xl border bg-background/80 shadow-2xs">
            <div className="space-y-0.5 pr-3">
              <Label htmlFor="admin_allow_music" className="text-sm font-bold cursor-pointer flex items-center gap-2">
                <Music className="h-4 w-4 text-violet-600" />
                Allow Background Music for Users
              </Label>
              <p className="text-xs text-muted-foreground">
                When enabled, visitors and users can play ambient background tracks (controlled via their User Settings). When turned off, background music is disabled site-wide.
              </p>
            </div>
            <Switch
              id="admin_allow_music"
              disabled={savingAllowMusic}
              checked={allowBackgroundMusic}
              onCheckedChange={handleToggleAllowMusic}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Safety Volume Ceiling
            </Label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 bg-background/80 p-3 rounded-2xl border">
                <VolumeX className="h-4 w-4 text-muted-foreground shrink-0" />
                <Slider
                  min={0.05}
                  max={1.0}
                  step={0.05}
                  value={[masterVolumeLimit]}
                  onValueChange={(val) => handleSaveMasterVolume(val[0])}
                  className="flex-1"
                />
                <Volume2 className="h-4 w-4 text-violet-600 shrink-0" />
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-5 gap-1.5 sm:flex sm:items-center shrink-0">
                {[0.2, 0.4, 0.6, 0.8, 1.0].map((preset) => (
                  <Button
                    key={preset}
                    size="sm"
                    variant={masterVolumeLimit === preset ? "default" : "outline"}
                    className={cn(
                      "h-9 sm:h-8 text-xs font-bold rounded-xl",
                      masterVolumeLimit === preset
                        ? "bg-violet-600 hover:bg-violet-700 text-white shadow-xs"
                        : ""
                    )}
                    onClick={() => handleSaveMasterVolume(preset)}
                  >
                    {Math.round(preset * 100)}%
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            Visitors' audio players will strictly respect this limit to ensure a smooth, unobtrusive browsing experience.
          </p>
        </CardContent>
      </Card>

      {/* Upload New Jingle Card */}
      <Card className="p-4 sm:p-6 space-y-4 shadow-sm border-border/80 rounded-3xl">
        <div className="flex items-center gap-2.5 border-b pb-3">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Upload className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold">Upload New Background Audio Track</h2>
            <p className="text-xs text-muted-foreground">MP3, WAV, OGG, or M4A audio files</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Track Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lagos City Morning Lounge"
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Audio File</Label>
            <Input
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="h-10 text-xs rounded-xl cursor-pointer"
            />
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <Label className="font-bold text-muted-foreground">Default Track Volume</Label>
            <span className="font-extrabold text-primary">{Math.round(defaultVolume * 100)}%</span>
          </div>
          <Slider
            min={0.05}
            max={1.0}
            step={0.05}
            value={[defaultVolume]}
            onValueChange={(val) => setDefaultVolume(val[0])}
          />
        </div>

        <Button
          onClick={upload}
          disabled={uploading || !file || !title.trim()}
          className="w-full sm:w-auto h-11 px-7 rounded-2xl font-extrabold text-xs shadow-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white gap-2"
        >
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading & Processing Track..." : "Upload & Save Track"}
        </Button>
      </Card>

      {/* Jingles List with Search & Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Music className="h-4 w-4" />
              Configured Jingles ({filteredJingles.length})
            </h3>
          </div>

          {/* Search & Filter bar */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search tracks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs rounded-xl bg-background"
              />
            </div>

            <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border text-xs">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors",
                  filterMode === "all" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("active")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors",
                  filterMode === "active" ? "bg-background text-emerald-600 shadow-2xs" : "text-muted-foreground"
                )}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("inactive")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors",
                  filterMode === "inactive" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                )}
              >
                Inactive
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => qc.invalidateQueries({ queryKey: ["admin-jingles"] })}
              className="h-8 text-xs text-muted-foreground gap-1 rounded-xl"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading tracks...</div>
        ) : (
          <div className="grid gap-3">
            {filteredJingles.map((j: any) => {
              const isAuditioning = playingJingleId === j.id;
              const jingleVol = j.volume ?? 0.3;

              return (
                <Card
                  key={j.id}
                  className={cn(
                    "p-4 rounded-3xl border transition-all duration-200 shadow-xs",
                    j.active
                      ? "border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                      : "hover:bg-muted/30"
                  )}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Info & Audition Button */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Button
                        size="icon"
                        variant={isAuditioning ? "default" : "secondary"}
                        className={cn(
                          "h-12 w-12 rounded-2xl shrink-0 transition-transform active:scale-95",
                          isAuditioning
                            ? "bg-violet-600 text-white shadow-md animate-pulse"
                            : "hover:bg-violet-100 dark:hover:bg-violet-900/40"
                        )}
                        onClick={() => (isAuditioning ? stopAudition() : startAudition(j))}
                        title={isAuditioning ? "Pause Track" : "Audition Track"}
                      >
                        {isAuditioning ? (
                          <Pause className="h-5 w-5 fill-current" />
                        ) : (
                          <Play className="h-5 w-5 ml-0.5 fill-current" />
                        )}
                      </Button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-extrabold text-sm sm:text-base text-foreground truncate">
                            {j.title}
                          </p>
                          {j.active && (
                            <Badge className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0">
                              Active Site Jingle
                            </Badge>
                          )}
                          {j.volume > masterVolumeLimit && (
                            <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-500/30">
                              Capped by Master ({Math.round(masterVolumeLimit * 100)}%)
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono text-[10px]">
                          {j.audio_url}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Volume Slider for this Track */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-background/80 p-2.5 rounded-2xl border border-border/60 w-full lg:w-auto lg:min-w-[280px]">
                      <div className="flex items-center justify-between sm:justify-start gap-2 text-xs font-extrabold text-muted-foreground shrink-0">
                        <div className="flex items-center gap-1.5">
                          <Volume2 className="h-4 w-4 text-violet-600" />
                          <span>Track Vol:</span>
                        </div>
                        <span className="text-foreground font-black">
                          {Math.round(jingleVol * 100)}%
                        </span>
                      </div>

                      <Slider
                        min={0.05}
                        max={1.0}
                        step={0.05}
                        value={[jingleVol]}
                        onValueChange={(val) => {
                          updateVolume.mutate({ id: j.id, volume: val[0] });
                          if (isAuditioning) changeAuditionVolume(val[0]);
                        }}
                        className="flex-1 min-w-[120px]"
                      />
                    </div>

                    {/* Right: Active Switch & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`active-${j.id}`} className="text-xs font-extrabold cursor-pointer">
                          {j.active ? "Enabled" : "Enable"}
                        </Label>
                        <Switch
                          id={`active-${j.id}`}
                          checked={j.active}
                          onCheckedChange={(v) => toggleActive.mutate({ id: j.id, active: v })}
                        />
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm(`Delete jingle "${j.title}"?`)) {
                            remove.mutate(j.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}

            {filteredJingles.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed rounded-3xl bg-muted/20 p-6">
                <Music className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                <p className="font-bold text-foreground">No Jingles Found</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {searchQuery ? "No audio tracks match your search filter." : "Upload an audio track to get started."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Audition Bar when playing audio */}
      {playingJingleId && (
        <div className="fixed bottom-20 md:bottom-6 inset-x-3 md:left-72 md:right-6 z-40 animate-in slide-in-from-bottom duration-300">
          <div className="mx-auto max-w-2xl bg-background/95 backdrop-blur-xl border border-violet-500/30 p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                <Radio className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase text-violet-600">Auditioning Track</p>
                <p className="text-xs font-bold text-foreground truncate">{auditionTrackTitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-2 w-32">
                <Volume2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Slider
                  min={0.05}
                  max={1.0}
                  step={0.05}
                  value={[auditionVolume]}
                  onValueChange={(val) => changeAuditionVolume(val[0])}
                />
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={stopAudition}
                className="h-8 text-xs font-bold rounded-xl gap-1"
              >
                <Pause className="h-3.5 w-3.5" /> Stop
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
