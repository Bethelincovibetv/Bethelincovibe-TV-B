import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, MailOpen, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AdminContacts() {
  const qc = useQueryClient();

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["admin-contacts"],
    queryFn: async () => {
      const { data } = await supabase.from("contact_submissions").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const markRead = useMutation({
    mutationFn: async ({ id, read }: { id: string; read: boolean }) => {
      const { error } = await supabase.from("contact_submissions").update({ read }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-contacts"] });
      qc.invalidateQueries({ queryKey: ["unread-contacts"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_submissions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-contacts"] });
      qc.invalidateQueries({ queryKey: ["unread-contacts"] });
      toast.success("Deleted");
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Mail className="h-6 w-6" /> Contact Messages</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !submissions?.length ? (
        <p className="text-center text-muted-foreground py-8">No messages yet</p>
      ) : (
        <div className="grid gap-3">
          {submissions.map((s: any) => (
            <Card key={s.id} className={!s.read ? "border-primary/30 bg-primary/5" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{s.subject}</CardTitle>
                      {!s.read && <Badge variant="default" className="text-xs">New</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{s.name} · {s.email} · {format(new Date(s.created_at), "MMM d, yyyy h:mm a")}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => markRead.mutate({ id: s.id, read: !s.read })}>
                      {s.read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) remove.mutate(s.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{s.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
