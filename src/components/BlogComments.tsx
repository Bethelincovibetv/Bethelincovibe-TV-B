import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export default function BlogComments({ postId }: { postId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(0);

  const { data: comments } = useQuery({
    queryKey: ["blog-comments", postId],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_comments")
        .select("*, profiles:user_id(display_name)")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("blog_comments").insert({
        post_id: postId,
        user_id: user!.id,
        content,
        rating: rating || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blog-comments", postId] });
      setContent("");
      setRating(0);
      toast.success("Comment added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blog-comments", postId] });
      toast.success("Comment deleted");
    },
  });

  const avgRating = comments?.length
    ? comments.filter((c: any) => c.rating).reduce((sum: number, c: any) => sum + (c.rating || 0), 0) /
      comments.filter((c: any) => c.rating).length
    : 0;

  return (
    <div className="mt-10 border-t pt-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <MessageCircle className="h-5 w-5" /> Comments ({comments?.length ?? 0})
        </h3>
        {avgRating > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            {avgRating.toFixed(1)} avg rating
          </div>
        )}
      </div>

      {user ? (
        <Card className="mb-6">
          <CardContent className="pt-4 space-y-3">
            <Textarea
              placeholder="Write a comment..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground mr-1">Rate:</span>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} type="button" onClick={() => setRating(s === rating ? 0 : s)}>
                    <Star className={`h-5 w-5 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                  </button>
                ))}
              </div>
              <Button size="sm" onClick={() => addComment.mutate()} disabled={!content.trim() || addComment.isPending}>
                Post Comment
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardContent className="pt-4 text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">Sign in</Link> to leave a comment
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {comments?.map((c: any) => (
          <Card key={c.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-medium text-sm">{c.profiles?.display_name || "User"}</span>
                  <span className="text-xs text-muted-foreground ml-2">{format(new Date(c.created_at), "MMM d, yyyy")}</span>
                  {c.rating && (
                    <span className="ml-2 inline-flex items-center gap-0.5">
                      {Array.from({ length: c.rating }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      ))}
                    </span>
                  )}
                </div>
                {user?.id === c.user_id && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteComment.mutate(c.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
              <p className="text-sm break-words [overflow-wrap:anywhere] min-w-0 max-w-full leading-relaxed">{c.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
