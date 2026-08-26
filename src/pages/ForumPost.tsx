import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageSquare, ArrowLeft, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { FORUM_CATEGORIES } from "./Forum";
import { ForumFormattedContent } from "@/components/forum/ForumLinkPreview";
import { ForumReactions } from "@/components/forum/ForumReactions";
import { ForumAuthorBadge, AuthorProfileData } from "@/components/forum/ForumAuthorBadge";

const SUCCESS_SOUND = "data:audio/wav;base64,UklGRpYBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YXIBAACAgYKChIWGiIqLjY6QkpOVl5manJ6gpKWmqKqsr7Gys7W3uLm6vL2/wMHCxMXGyMnKy8zNz9DR0tPU1dbX2Nrb3N3e3+Hi4+Tl5ufo6err7O3u7/Hy8/T19vf4+frJxL68t7Krp6KdmZSPi4eDfntyTycRBhEnT3uDh4uPlJmdoqersbq+wcTKzM3O0NHS1NXX2dvc3eHi5OXm6Ojp6+vt7e7v8PHy8/T19vf4+fr7+/z9/v7+///++AYAfHt6eXh3dnZ1c3JxcG9ubWxramppaWhoZ2dnZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZm";

export default function ForumPost() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [authors, setAuthors] = useState<Record<string, AuthorProfileData>>({});
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
    
    const [profsRes, suppsRes] = await Promise.all([
      supabase.from("profiles").select("user_id,display_name,username,avatar_url").in("user_id", ids),
      supabase.from("suppliers").select("id,user_id,name,slug,logo_url,is_verified,website,status").in("user_id", ids),
    ]);

    const map: Record<string, AuthorProfileData> = {};
    (profsRes.data || []).forEach((x: any) => {
      map[x.user_id] = { ...x, business: null };
    });
    (suppsRes.data || []).forEach((supp: any) => {
      if (supp.user_id) {
        if (!map[supp.user_id]) {
          map[supp.user_id] = { user_id: supp.user_id, display_name: supp.name };
        }
        map[supp.user_id].business = supp;
      }
    });
    setAuthors(map);
    if (user) {
      const { data: votes } = await supabase.from("forum_votes" as any).select("target_type,target_id").eq("user_id", user.id);
      const v = (votes as any[]) || [];
      setLikedPost(v.some((x: any) => (x.target_type === "post" || x.target_type?.startsWith("react:")) && x.target_id === id));
      const lr: Record<string, boolean> = {};
      v.filter((x: any) => x.target_type === "reply" || x.target_type?.startsWith("react:")).forEach((x: any) => { lr[x.target_id] = true; });
      setLikedReplies(lr);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id, user?.id]);

  const submitReply = async () => {
    if (!user) { toast.error("Sign in to reply"); navigate("/login"); return; }
    if (!reply.trim()) return;
    setPosting(true);
    const replyContent = reply.trim();
    const { error } = await supabase.from("forum_replies" as any).insert({ post_id: id, user_id: user.id, content: replyContent });
    setPosting(false);
    if (error) { toast.error(error.message); return; }

    // Send activity notification to post author if not replying to own post
    if (post && post.user_id && post.user_id !== user.id) {
      const myAuthor = authors[user.id];
      const commenterName = myAuthor?.display_name || myAuthor?.username || "A community member";
      try {
        await supabase.from("user_notifications").insert({
          user_id: post.user_id,
          title: `💬 New reply on "${post.title.slice(0, 35)}..."`,
          body: `${commenterName} replied: "${replyContent.slice(0, 70)}..."`,
          type: "forum_reply",
          url: `/forum/${post.id}`,
        });
      } catch {}
    }

    setReply("");
    playSuccess();
    toast.success("Reply posted successfully!");
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
    <div className="container max-w-3xl py-4 pb-24 space-y-5">
      <Helmet>
        <title>{post.title} | Community Forum</title>
        <meta name="description" content={post.content.slice(0, 150)} />
      </Helmet>

      <Button variant="ghost" size="sm" onClick={() => navigate("/forum")} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Forum
      </Button>

      {/* Main Post Card */}
      <Card className="rounded-2xl shadow-sm border-border/80 overflow-hidden">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={post.kind === "question" ? "default" : "secondary"} className="rounded-lg">
                {post.kind === "question" ? "❓ Q&A" : "💬 Discussion"}
              </Badge>
              {cat && (
                <Badge variant="outline" className="gap-1.5 py-1 rounded-lg">
                  <img src={cat.icon3d} alt={cat.label} className="h-4 w-4 rounded-xs object-cover" referrerPolicy="no-referrer" />
                  <span>{cat.label}</span>
                </Badge>
              )}
            </div>
            {user?.id === post.user_id && (
              <Button variant="ghost" size="sm" onClick={deletePost} className="text-destructive h-8 px-2">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <h1 className="text-xl md:text-2xl font-bold leading-snug">{post.title}</h1>
          
          <div className="text-xs text-muted-foreground flex items-center justify-between gap-3 pt-1 border-t border-border/40 flex-wrap">
            <ForumAuthorBadge author={author} size="md" />
            <span className="text-[11px] font-medium">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
          </div>

          {/* Formatted Post Content with YouTube, Video & Link Detection */}
          <div className="pt-2">
            <ForumFormattedContent content={post.content} />
          </div>

          {/* 3D Emoji Reactions Bar */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t flex-wrap">
            <ForumReactions
              targetId={post.id}
              targetType="post"
              authorId={post.user_id}
              postTitle={post.title}
              initialLikes={post.likes_count}
              initialLiked={likedPost}
            />

            <span className="text-xs text-muted-foreground flex items-center gap-1.5 ml-auto">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="font-semibold">{replies.length} {replies.length === 1 ? "reply" : "replies"}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Replies Thread */}
      <div className="space-y-4">
        <h2 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
          <span>Replies & Insights</span>
          <Badge variant="secondary" className="rounded-full text-xs">
            {replies.length}
          </Badge>
        </h2>

        <div className="grid gap-3">
          {replies.map((r) => {
            const a = authors[r.user_id];
            return (
              <Card key={r.id} className="rounded-2xl border-border/70 shadow-xs">
                <CardContent className="p-3.5 sm:p-4 space-y-2.5">
                  <div className="text-xs text-muted-foreground flex items-center justify-between gap-2 flex-wrap">
                    <ForumAuthorBadge author={a} size="sm" />
                    <span className="text-[11px] font-medium">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                  </div>

                  <ForumFormattedContent content={r.content} />

                  <div className="pt-2 border-t flex items-center justify-between">
                    <ForumReactions
                      targetId={r.id}
                      targetType="reply"
                      authorId={r.user_id}
                      postTitle={post.title}
                      initialLikes={r.likes_count}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Reply Box */}
        {user ? (
          <Card className="rounded-2xl border-primary/20 shadow-sm bg-card">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Add to the Discussion</span>
                <span className="text-[11px] text-muted-foreground">Supports YouTube & WhatsApp links</span>
              </div>
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Share your experience, answer the question, or paste links/videos..."
                rows={3}
                className="rounded-xl resize-none text-sm"
              />
              <div className="flex justify-end">
                <Button
                  onClick={submitReply}
                  disabled={posting || !reply.trim()}
                  className="rounded-xl h-9 px-4 font-bold text-xs gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {posting ? "Posting..." : "Post Reply"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl p-6 text-center bg-muted/20 border-dashed">
            <p className="text-sm font-semibold text-muted-foreground mb-3">Sign in to join the discussion and share links.</p>
            <Button onClick={() => navigate("/login")} className="rounded-xl font-bold">Sign In</Button>
          </Card>
        )}
      </div>
    </div>
  );
}
