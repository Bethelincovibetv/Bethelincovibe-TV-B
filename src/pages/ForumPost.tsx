import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageSquare, ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { FORUM_CATEGORIES } from "./Forum";

const SUCCESS_SOUND = "data:audio/wav;base64,UklGRpYBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YXIBAACAgYKChIWGiIqLjY6QkpOVl5manJ6gpKWmqKqsr7Gys7W3uLm6vL2/wMHCxMXGyMnKy8zNz9DR0tPU1dbX2Nrb3N3e3+Hi4+Tl5ufo6err7O3u7/Hy8/T19vf4+frJxL68t7Krp6KdmZSPi4eDfntyTycRBhEnT3uDh4uPlJmdoqersbq+wcTKzM3O0NHS1NXX2dvc3eHi5OXm6Ojp6+vt7e7v8PHy8/T19vf4+fr7+/z9/v7+///++AYAfHt6eXh3dnZ1c3JxcG9ubWxramppaWhoZ2dnZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZm";

export default function ForumPost() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [authors, setAuthors] = useState<Record<string, any>>({});
  const [likedPost, setLikedPost] = useState(false);
  const [likedReplies, setLikedReplies] = useState<Record<string, boolean>>({});
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const playSuccess = () => { try { new Audio(SUCCESS_SOUND).play().catch(() => {}); } catch {} };

  const load = async () => {
    setLoading(true);
    const { data: p } = await supabase.from("forum_posts" as any).select("*").eq("id", id).maybeSingle();
    if (!p) { setLoading(false); return; }
    setPost(p);
    const { data: rs } = await supabase.from("forum_replies" as any).select("*").eq("post_id", id).order("created_at", { ascending: true });
    setReplies((rs as any[]) || []);
    const ids = Array.from(new Set([(p as any).user_id, ...((rs as any[]) || []).map((r: any) => r.user_id)]));
    const { data: profs } = await supabase.from("profiles").select("user_id,display_name,username,avatar_url").in("user_id", ids);
    const map: Record<string, any> = {};
    (profs || []).forEach((x: any) => { map[x.user_id] = x; });
    setAuthors(map);
    if (user) {
      const { data: votes } = await supabase.from("forum_votes" as any).select("target_type,target_id").eq("user_id", user.id);
      const v = (votes as any[]) || [];
      setLikedPost(v.some((x: any) => x.target_type === "post" && x.target_id === id));
      const lr: Record<string, boolean> = {};
      v.filter((x: any) => x.target_type === "reply").forEach((x: any) => { lr[x.target_id] = true; });
      setLikedReplies(lr);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id, user?.id]);

  const toggleLike = async (target_type: "post" | "reply", target_id: string, liked: boolean) => {
    if (!user) { toast.error("Sign in to like"); navigate("/login"); return; }
    if (liked) {
      await supabase.from("forum_votes" as any).delete().eq("user_id", user.id).eq("target_type", target_type).eq("target_id", target_id);
    } else {
      await supabase.from("forum_votes" as any).insert({ user_id: user.id, target_type, target_id });
      playSuccess();
    }
    if (target_type === "post") {
      setLikedPost(!liked);
      setPost((p: any) => p ? { ...p, likes_count: p.likes_count + (liked ? -1 : 1) } : p);
    } else {
      setLikedReplies((m) => ({ ...m, [target_id]: !liked }));
      setReplies((rs) => rs.map((r) => r.id === target_id ? { ...r, likes_count: r.likes_count + (liked ? -1 : 1) } : r));
    }
  };

  const submitReply = async () => {
    if (!user) { toast.error("Sign in to reply"); navigate("/login"); return; }
    if (!reply.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("forum_replies" as any).insert({ post_id: id, user_id: user.id, content: reply.trim() });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    setReply("");
    playSuccess();
    toast.success("Reply posted!");
    load();
  };

  const deletePost = async () => {
    if (!confirm("Delete this post?")) return;
    await supabase.from("forum_posts" as any).delete().eq("id", id);
    toast.success("Deleted");
    navigate("/forum");
  };

  if (loading) return <div className="container py-10 text-center text-muted-foreground">Loading...</div>;
  if (!post) return <div className="container py-10 text-center">Post not found. <Link to="/forum" className="text-primary underline">Back to forum</Link></div>;

  const cat = FORUM_CATEGORIES.find((c) => c.key === post.category);
  const author = authors[post.user_id];
  const authorName = author?.display_name || author?.username || "Anonymous";

  return (
    <div className="container max-w-3xl py-4 pb-24">
      <Helmet>
        <title>{post.title} | Forum</title>
        <meta name="description" content={post.content.slice(0, 150)} />
      </Helmet>

      <Button variant="ghost" size="sm" onClick={() => navigate("/forum")} className="mb-3">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Forum
      </Button>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant={post.kind === "question" ? "default" : "secondary"}>{post.kind === "question" ? "Q&A" : "Discussion"}</Badge>
            {cat && <Badge variant="outline">{cat.label}</Badge>}
          </div>
          <h1 className="text-xl md:text-2xl font-bold mb-2">{post.title}</h1>
          <div className="text-xs text-muted-foreground mb-3">
            By <span className="font-medium text-foreground">{authorName}</span> · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </div>
          <p className="whitespace-pre-wrap text-sm md:text-base">{post.content}</p>
          <div className="flex items-center gap-3 mt-4">
            <Button
              variant={likedPost ? "default" : "outline"}
              size="sm"
              onClick={() => toggleLike("post", post.id, likedPost)}
              className="gap-1"
            >
              <Heart className={`h-4 w-4 ${likedPost ? "fill-current" : ""}`} /> {post.likes_count}
            </Button>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-4 w-4" /> {post.replies_count} replies
            </span>
            {user?.id === post.user_id && (
              <Button variant="ghost" size="sm" onClick={deletePost} className="ml-auto text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="font-semibold mb-3">{replies.length} {replies.length === 1 ? "Reply" : "Replies"}</h2>
        <div className="grid gap-2 mb-4">
          {replies.map((r) => {
            const a = authors[r.user_id];
            const liked = !!likedReplies[r.id];
            return (
              <Card key={r.id}>
                <CardContent className="p-3">
                  <div className="text-xs text-muted-foreground mb-1">
                    <span className="font-medium text-foreground">{a?.display_name || a?.username || "Anonymous"}</span> · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{r.content}</p>
                  <Button
                    variant={liked ? "default" : "ghost"}
                    size="sm"
                    onClick={() => toggleLike("reply", r.id, liked)}
                    className="mt-2 h-7 gap-1 text-xs"
                  >
                    <Heart className={`h-3 w-3 ${liked ? "fill-current" : ""}`} /> {r.likes_count}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {user ? (
          <Card>
            <CardContent className="p-3">
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply..." rows={4} />
              <div className="flex justify-end mt-2">
                <Button onClick={submitReply} disabled={posting || !reply.trim()}>
                  {posting ? "Posting..." : "Post reply"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">Sign in to join the conversation.</p>
              <Button onClick={() => navigate("/login")}>Sign in</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
