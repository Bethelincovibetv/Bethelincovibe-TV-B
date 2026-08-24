import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Trash2, Upload, GraduationCap, Pencil, Sparkles, Wand2, Play, BookOpen,
  HelpCircle, Clock, Check, Layers, Image as ImageIcon, Video, Plus
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import VoiceInputButton from "@/components/admin/VoiceInputButton";
import CoursePlayerModal from "@/components/learn/CoursePlayerModal";
import {
  generateAICourse, encodeCourseMetadata, decodeCourseMetadata,
  AICreatedCourse, getPexelsImageForCategory
} from "@/lib/aiCourseCreatorEngine";

type Course = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  youtube_url: string | null;
  instructor_name: string | null;
  category: string | null;
  price_naira: number;
  duration_minutes: number | null;
  published: boolean;
};

const CATEGORIES = [
  "Marketing",
  "Business",
  "Finance & Grants",
  "Tech & Startup",
  "E-Commerce",
  "Real Estate",
];

const empty: Partial<Course> = {
  title: "",
  description: "",
  thumbnail_url: "",
  video_url: "",
  youtube_url: "",
  instructor_name: "",
  category: "Marketing",
  price_naira: 0,
  duration_minutes: 60,
  published: true,
};

export default function AdminCourses() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Course> | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewCourse, setPreviewCourse] = useState<Course | null>(null);

  // AI Course Generator State
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiCategory, setAiCategory] = useState("Marketing");
  const [aiPrice, setAiPrice] = useState<number>(0);
  const [aiLevel, setAiLevel] = useState<"Beginner" | "Intermediate" | "Advanced">("Beginner");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<AICreatedCourse | null>(null);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Course[];
    },
  });

  const uploadFile = async (bucket: string, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) {
      toast.error("Please enter a course topic or prompt");
      return;
    }
    setAiGenerating(true);
    try {
      const res = await generateAICourse({
        topic: aiTopic.trim(),
        category: aiCategory,
        priceNaira: aiPrice,
        level: aiLevel,
      });
      setGeneratedResult(res);
      toast.success("AI Masterclass Curriculum & Flashcards generated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate AI course");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleApplyAICourse = () => {
    if (!generatedResult) return;
    const fullDesc = encodeCourseMetadata(generatedResult);

    setEditing({
      title: generatedResult.title,
      description: fullDesc,
      category: generatedResult.category,
      instructor_name: generatedResult.instructorName,
      price_naira: generatedResult.priceNaira,
      duration_minutes: generatedResult.durationMinutes,
      thumbnail_url: generatedResult.thumbnailUrl,
      youtube_url: generatedResult.youtubeUrl,
      published: true,
    });
    setAiOpen(false);
    setGeneratedResult(null);
    setAiTopic("");
  };

  const save = async () => {
    if (!editing?.title) return toast.error("Title required");
    setSaving(true);
    try {
      const payload: any = { ...editing };
      if (videoFile) payload.video_url = await uploadFile("course-videos", videoFile);
      if (thumbFile) payload.thumbnail_url = await uploadFile("course-thumbnails", thumbFile);
      payload.price_naira = Number(payload.price_naira) || 0;
      payload.duration_minutes = Number(payload.duration_minutes) || null;

      let error;
      if (payload.id) {
        const { id, ...rest } = payload;
        ({ error } = await supabase.from("courses").update(rest).eq("id", id));
      } else {
        ({ error } = await supabase.from("courses").insert(payload));
      }
      if (error) throw error;
      toast.success("Course saved successfully!");
      setEditing(null);
      setVideoFile(null);
      setThumbFile(null);
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      qc.invalidateQueries({ queryKey: ["learn-courses"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      qc.invalidateQueries({ queryKey: ["learn-courses"] });
      toast.success("Deleted course");
    },
  });

  const togglePub = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from("courses").update({ published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      qc.invalidateQueries({ queryKey: ["learn-courses"] });
      toast.success("Visibility updated");
    },
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border rounded-3xl p-6 shadow-xs">
        <div className="space-y-1">
          <h1 className="text-2xl font-black flex items-center gap-2.5 text-foreground">
            <GraduationCap className="h-7 w-7 text-primary" /> Learning Hub Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Create and curate video masterclasses, interactive active-recall flashcards, and knowledge quizzes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => setAiOpen(true)}
            className="h-10 rounded-2xl font-black text-xs bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-700 text-white shadow-md shadow-primary/20 gap-2"
          >
            <Sparkles className="h-4 w-4" /> AI Course Creator Agent
          </Button>

          <Button
            variant="outline"
            onClick={() => setEditing(empty)}
            className="h-10 rounded-2xl font-bold text-xs gap-1.5"
          >
            <Plus className="h-4 w-4" /> Manual Course
          </Button>
        </div>
      </div>

      {/* Courses List */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses?.map((c) => {
          const meta = decodeCourseMetadata(c.description);
          return (
            <Card key={c.id} className="overflow-hidden rounded-3xl border-border/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="relative aspect-video bg-muted overflow-hidden">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <GraduationCap className="h-8 w-8 text-primary/50" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                    <Badge className="bg-slate-900/80 text-white text-[10px] font-black">
                      {c.category || "General"}
                    </Badge>
                    <Badge className={`text-[10px] font-black ${c.price_naira === 0 ? "bg-emerald-600 text-white" : "bg-primary text-white"}`}>
                      {c.price_naira > 0 ? `₦${c.price_naira.toLocaleString()}` : "FREE"}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-sm text-foreground line-clamp-1">{c.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{meta.cleanDescription || c.description}</p>

                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" /> {c.duration_minutes || 60}m
                    </span>
                    <span>•</span>
                    <span className="text-primary font-semibold">{meta.flashcards?.length || 0} Cards</span>
                    <span>•</span>
                    <span className="text-indigo-500 font-semibold">{meta.quiz?.length || 0} Qs</span>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0 border-t border-border/60 mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={c.published}
                    onCheckedChange={(v) => togglePub.mutate({ id: c.id, published: v })}
                  />
                  <span className="text-xs font-semibold">{c.published ? "Live" : "Draft"}</span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setPreviewCourse(c)}
                    className="h-8 w-8 rounded-xl"
                    title="Preview Course Player"
                  >
                    <Play className="h-4 w-4 text-emerald-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditing(c)}
                    className="h-8 w-8 rounded-xl"
                    title="Edit Course"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => remove.mutate(c.id)}
                    className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10"
                    title="Delete Course"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}

        {courses?.length === 0 && !isLoading && (
          <div className="col-span-full p-12 text-center bg-card rounded-3xl border border-dashed space-y-3">
            <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
            <p className="text-sm font-bold text-foreground">No courses created yet.</p>
            <p className="text-xs text-muted-foreground">Click AI Course Creator to generate your first masterclass in seconds!</p>
          </div>
        )}
      </div>

      {/* AI COURSE CREATOR STUDIO MODAL */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-foreground">
                  AI Course Creator Agent
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Automatically craft curriculum, curated video tutorials, active-recall flashcards, and quizzes.
                </p>
              </div>
            </div>
          </DialogHeader>

          {!generatedResult ? (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">Course Topic or Prompt</Label>
                  <span className="text-[10px] text-muted-foreground">Use mic or type</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g. TikTok & Instagram Sales Strategy for Lagos Boutiques"
                    className="h-11 rounded-2xl text-xs"
                  />
                  <VoiceInputButton
                    onTranscript={(text, isFinal) => {
                      if (isFinal) setAiTopic((prev) => (prev ? `${prev} ${text}` : text));
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Track Category</Label>
                  <Select value={aiCategory} onValueChange={setAiCategory}>
                    <SelectTrigger className="h-10 rounded-xl text-xs">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-xs">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Price in Naira (₦)</Label>
                  <Input
                    type="number"
                    value={aiPrice}
                    onChange={(e) => setAiPrice(Number(e.target.value))}
                    placeholder="0 for FREE"
                    className="h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Skill Level</Label>
                  <Select value={aiLevel} onValueChange={(v: any) => setAiLevel(v)}>
                    <SelectTrigger className="h-10 rounded-xl text-xs">
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner" className="text-xs">Beginner</SelectItem>
                      <SelectItem value="Intermediate" className="text-xs">Intermediate</SelectItem>
                      <SelectItem value="Advanced" className="text-xs">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/40 border text-xs space-y-1 text-muted-foreground">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <Wand2 className="h-3.5 w-3.5 text-primary" /> What the AI Course Creator builds:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  <li>Modular lesson breakdown with duration & takeaways</li>
                  <li>5-6 active-recall interactive flashcards with Nigerian market examples</li>
                  <li>4-5 interactive quiz questions with explanations and grading</li>
                  <li>High-resolution Pexels 4K cover image</li>
                  <li>Curated educational video link</li>
                </ul>
              </div>

              <Button
                onClick={handleGenerateAI}
                disabled={aiGenerating}
                className="w-full h-11 rounded-2xl font-black text-xs bg-primary text-primary-foreground gap-2 shadow-md"
              >
                {aiGenerating ? "Architecting Course Curriculum & Flashcards…" : "Generate Complete Masterclass"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2 animate-in fade-in">
              <div className="p-4 rounded-2xl border bg-primary/5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge className="bg-primary text-primary-foreground text-[10px] mb-1">
                      {generatedResult.category} · {generatedResult.level}
                    </Badge>
                    <h3 className="font-black text-base text-foreground">{generatedResult.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{generatedResult.description}</p>
                  </div>
                  <img
                    src={generatedResult.thumbnailUrl}
                    alt="Cover"
                    className="w-24 h-16 object-cover rounded-xl shrink-0 border"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs font-bold border-t border-primary/20">
                  <div>
                    <span className="text-primary block text-sm">{generatedResult.modules.length}</span>
                    <span className="text-[10px] text-muted-foreground">Modules</span>
                  </div>
                  <div>
                    <span className="text-primary block text-sm">{generatedResult.flashcards.length}</span>
                    <span className="text-[10px] text-muted-foreground">Flashcards</span>
                  </div>
                  <div>
                    <span className="text-primary block text-sm">{generatedResult.quiz.length}</span>
                    <span className="text-[10px] text-muted-foreground">Quiz Qs</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => setGeneratedResult(null)}
                  className="rounded-xl text-xs font-bold h-10"
                >
                  Regenerate
                </Button>
                <Button
                  onClick={handleApplyAICourse}
                  className="rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white h-10 gap-1.5 shadow-md"
                >
                  <Check className="h-4 w-4" /> Approve & Load Into Editor
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT / CREATE MODAL */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">
              {editing?.id ? "Edit Masterclass" : "Create Masterclass"}
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Course Title</Label>
                <Input
                  value={editing.title || ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="e.g. Masterclass: TikTok Ads for Lagos SMEs"
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Track Category</Label>
                  <Select
                    value={editing.category || "Marketing"}
                    onValueChange={(cat) => setEditing({ ...editing, category: cat })}
                  >
                    <SelectTrigger className="h-10 rounded-xl text-xs">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Instructor Name</Label>
                  <Input
                    value={editing.instructor_name || ""}
                    onChange={(e) => setEditing({ ...editing, instructor_name: e.target.value })}
                    placeholder="e.g. Coach Adaeze"
                    className="h-10 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Price in Naira (0 = FREE)</Label>
                  <Input
                    type="number"
                    value={editing.price_naira ?? 0}
                    onChange={(e) => setEditing({ ...editing, price_naira: Number(e.target.value) })}
                    className="h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Duration (Minutes)</Label>
                  <Input
                    type="number"
                    value={editing.duration_minutes ?? 60}
                    onChange={(e) => setEditing({ ...editing, duration_minutes: Number(e.target.value) })}
                    className="h-10 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">YouTube Video URL</Label>
                <Input
                  value={editing.youtube_url || ""}
                  onChange={(e) => setEditing({ ...editing, youtube_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">Cover Image URL (Pexels / CDN)</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const img = getPexelsImageForCategory(editing.category || "Marketing", Math.floor(Math.random() * 5));
                      setEditing({ ...editing, thumbnail_url: img });
                    }}
                    className="h-6 text-[10px] text-primary font-bold"
                  >
                    🎲 Pick Random Pexels Image
                  </Button>
                </div>
                <Input
                  value={editing.thumbnail_url || ""}
                  onChange={(e) => setEditing({ ...editing, thumbnail_url: e.target.value })}
                  placeholder="https://images.pexels.com/..."
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Description & Metadata JSON</Label>
                <Textarea
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={4}
                  className="rounded-xl text-xs"
                  placeholder="Course summary and lesson takeaways..."
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Switch
                  checked={!!editing.published}
                  onCheckedChange={(v) => setEditing({ ...editing, published: v })}
                />
                <Label className="text-xs font-bold">Published (Visible in Learning Hub)</Label>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditing(null)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="rounded-xl font-black text-xs bg-primary text-primary-foreground"
            >
              {saving ? "Saving…" : "Save Masterclass"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Course Player Preview Modal */}
      <CoursePlayerModal
        course={previewCourse}
        open={!!previewCourse}
        onOpenChange={(open) => !open && setPreviewCourse(null)}
      />
    </div>
  );
}
