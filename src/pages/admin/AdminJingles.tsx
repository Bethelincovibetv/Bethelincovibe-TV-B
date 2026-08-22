import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Upload, Music } from "lucide-react";

export default function AdminJingles() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: jingles } = useQuery({
    queryKey: ["admin-jingles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_jingles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upload = async () => {
    if (!file || !title) return toast.error("Title and audio file required");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("jingles").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("jingles").getPublicUrl(path);
      const { error } = await supabase.from("site_jingles").insert({ title, audio_url: pub.publicUrl, volume: 0.3, active: false });
      if (error) throw error;
      toast.success("Jingle uploaded");
      setTitle(""); setFile(null);
      qc.invalidateQueries({ queryKey: ["admin-jingles"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally { setUploading(false); }
  };

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("site_jingles").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-jingles"] }); toast.success("Updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_jingles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-jingles"] }); toast.success("Deleted"); },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Music className="h-6 w-6 text-primary" /> Background Jingles</h1>
        <p className="text-sm text-muted-foreground">Only one jingle plays at a time across the site. Visitors can mute or adjust volume.</p>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Upload new jingle</h2>
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Welcome theme" />
        </div>
        <div className="space-y-2">
          <Label>Audio file (mp3, ogg, wav)</Label>
          <Input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <Button onClick={upload} disabled={uploading}><Upload className="h-4 w-4 mr-2" />{uploading ? "Uploading…" : "Upload"}</Button>
      </Card>

      <div className="space-y-2">
        {jingles?.map((j: any) => (
          <Card key={j.id} className="p-4 flex items-center gap-3">
            <Music className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{j.title}</p>
              <audio controls src={j.audio_url} className="mt-1 w-full max-w-xs h-8" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Label className="text-xs">Active</Label>
              <Switch checked={j.active} onCheckedChange={(v) => toggle.mutate({ id: j.id, active: v })} />
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(j.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </Card>
        ))}
        {jingles?.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No jingles yet.</p>}
      </div>
    </div>
  );
}
