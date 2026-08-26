import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SmilePlus, Heart, Sparkles } from "lucide-react";
import { toast } from "sonner";

export interface EmojiReactionDef {
  key: string;
  emoji: string;
  label: string;
  gradient: string;
}

export const FORUM_3D_REACTIONS: EmojiReactionDef[] = [
  { key: "fire", emoji: "🔥", label: "Hot Topic", gradient: "from-orange-500/20 to-red-500/20 text-orange-600 border-orange-500/40" },
  { key: "rocket", emoji: "🚀", label: "To The Moon", gradient: "from-blue-500/20 to-indigo-500/20 text-blue-600 border-blue-500/40" },
  { key: "bulb", emoji: "💡", label: "Smart Idea", gradient: "from-amber-500/20 to-yellow-500/20 text-amber-600 border-amber-500/40" },
  { key: "clap", emoji: "👏", label: "Respect", gradient: "from-emerald-500/20 to-teal-500/20 text-emerald-600 border-emerald-500/40" },
  { key: "money", emoji: "💰", label: "High Profit", gradient: "from-green-500/20 to-emerald-500/20 text-green-600 border-green-500/40" },
  { key: "heart", emoji: "❤️", label: "Love It", gradient: "from-pink-500/20 to-rose-500/20 text-rose-600 border-rose-500/40" },
  { key: "target", emoji: "🎯", label: "Spot On", gradient: "from-purple-500/20 to-fuchsia-500/20 text-purple-600 border-purple-500/40" },
  { key: "wow", emoji: "🤩", label: "Mindblown", gradient: "from-yellow-500/20 to-amber-500/20 text-yellow-600 border-yellow-500/40" },
];

const SUCCESS_SOUND = "data:audio/wav;base64,UklGRpYBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YXIBAACAgYKChIWGiIqLjY6QkpOVl5manJ6gpKWmqKqsr7Gys7W3uLm6vL2/wMHCxMXGyMnKy8zNz9DR0tPU1dbX2Nrb3N3e3+Hi4+Tl5ufo6err7O3u7/Hy8/T19vf4+frJxL68t7Krp6KdmZSPi4eDfntyTycRBhEnT3uDh4uPlJmdoqersbq+wcTKzM3O0NHS1NXX2dvc3eHi5OXm6Ojp6+vt7e7v8PHy8/T19vf4+fr7+/z9/v7+///++AYAfHt6eXh3dnZ1c3JxcG9ubWxramppaWhoZ2dnZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZm";

interface ForumReactionsProps {
  targetId: string;
  targetType: "post" | "reply";
  authorId?: string;
  postTitle?: string;
  initialLikes?: number;
  initialLiked?: boolean;
}

export function ForumReactions({
  targetId,
  targetType,
  authorId,
  postTitle = "Community Discussion",
  initialLikes = 0,
  initialLiked = false,
}: ForumReactionsProps) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [userReactions, setUserReactions] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);

  const playSound = () => {
    try {
      new Audio(SUCCESS_SOUND).play().catch(() => {});
    } catch {}
  };

  // Load reactions from forum_votes
  useEffect(() => {
    let isMounted = true;
    const loadReactions = async () => {
      try {
        const { data: votes } = await supabase
          .from("forum_votes" as any)
          .select("target_type, user_id")
          .eq("target_id", targetId);

        if (!isMounted || !votes) return;

        const counts: Record<string, number> = {};
        const myMap: Record<string, boolean> = {};

        (votes as any[]).forEach((v) => {
          const typeStr = v.target_type as string;
          let rKey = "heart";
          if (typeStr.startsWith("react:")) {
            rKey = typeStr.replace("react:", "");
          } else if (typeStr === "post" || typeStr === "reply") {
            rKey = "heart";
          }

          counts[rKey] = (counts[rKey] || 0) + 1;
          if (user && v.user_id === user.id) {
            myMap[rKey] = true;
          }
        });

        // Ensure default likes are accounted for
        if (initialLikes > 0 && !counts.heart) {
          counts.heart = initialLikes;
        }
        if (initialLiked && user) {
          myMap.heart = true;
        }

        setReactions(counts);
        setUserReactions(myMap);
      } catch {}
    };

    loadReactions();
    return () => { isMounted = false; };
  }, [targetId, user?.id, initialLikes, initialLiked]);

  const toggleReaction = async (key: string) => {
    if (!user) {
      toast.error("Please sign in to react to posts");
      return;
    }

    const isCurrentlyActive = !!userReactions[key];
    const targetTypeKey = key === "heart" && targetType === "post" ? "post" : `react:${key}`;

    // Optimistic update
    setUserReactions((prev) => ({ ...prev, [key]: !isCurrentlyActive }));
    setReactions((prev) => {
      const nextVal = (prev[key] || 0) + (isCurrentlyActive ? -1 : 1);
      return { ...prev, [key]: Math.max(0, nextVal) };
    });

    if (!isCurrentlyActive) {
      playSound();
      setOpen(false);
    }

    try {
      if (isCurrentlyActive) {
        await supabase
          .from("forum_votes" as any)
          .delete()
          .eq("user_id", user.id)
          .eq("target_id", targetId)
          .or(`target_type.eq.${targetTypeKey},target_type.eq.react:${key}`);
      } else {
        await supabase.from("forum_votes" as any).insert({
          user_id: user.id,
          target_type: targetTypeKey,
          target_id: targetId,
        });

        // Send activity notification to post author if not self
        if (authorId && authorId !== user.id) {
          const emojiDef = FORUM_3D_REACTIONS.find((r) => r.key === key);
          const emojiSymbol = emojiDef?.emoji || "❤️";
          
          await supabase.from("user_notifications").insert({
            user_id: authorId,
            title: `New reaction on your discussion`,
            body: `Someone reacted with ${emojiSymbol} ${emojiDef?.label || ""} on "${postTitle.slice(0, 40)}..."`,
            type: "forum_reaction",
            url: `/forum/${targetId}`,
          });
        }
      }
    } catch (err: any) {
      console.warn("Reaction update error:", err);
    }
  };

  const activeReactionEntries = Object.entries(reactions).filter(([_, count]) => count > 0);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Popover Reaction Picker */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-xl px-2.5 gap-1.5 text-xs font-bold bg-background hover:bg-primary/10 border-border/80 shadow-xs"
          >
            <SmilePlus className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">React</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          className="p-1.5 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-xl w-auto z-50"
        >
          <div className="flex items-center gap-1">
            {FORUM_3D_REACTIONS.map((r) => {
              const isActive = !!userReactions[r.key];
              return (
                <button
                  key={r.key}
                  onClick={() => toggleReaction(r.key)}
                  title={r.label}
                  className={`p-2 rounded-xl text-xl hover:scale-125 hover:bg-muted/80 transition-all duration-150 relative ${
                    isActive ? "bg-primary/20 scale-110 shadow-xs" : ""
                  }`}
                >
                  <span className="inline-block transform active:scale-95">{r.emoji}</span>
                  {isActive && (
                    <span className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Render Active Reaction Pills */}
      {activeReactionEntries.map(([key, count]) => {
        const def = FORUM_3D_REACTIONS.find((r) => r.key === key) || {
          key,
          emoji: "❤️",
          label: "Like",
          gradient: "from-pink-500/20 to-rose-500/20 text-rose-600 border-rose-500/40",
        };
        const isActive = !!userReactions[key];

        return (
          <button
            key={key}
            onClick={() => toggleReaction(key)}
            className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-xl text-xs font-bold transition-all duration-150 border ${
              isActive
                ? `bg-gradient-to-r ${def.gradient} shadow-xs font-extrabold scale-105`
                : "bg-muted/30 hover:bg-muted/60 text-muted-foreground border-border/70"
            }`}
            title={`${def.label} (${count})`}
          >
            <span className="text-sm">{def.emoji}</span>
            <span className="text-[11px]">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
