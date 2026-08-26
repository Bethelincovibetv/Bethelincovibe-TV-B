import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bookmark, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  postId: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "ghost" | "outline" | "default" | "secondary";
  showText?: boolean;
  className?: string;
}

export default function FavoriteButton({
  postId,
  size = "default",
  variant = "outline",
  showText = false,
  className = "",
}: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [localSaved, setLocalSaved] = useState<boolean>(() => {
    try {
      const list = JSON.parse(localStorage.getItem("saved_posts") || "[]");
      return Array.isArray(list) && list.includes(postId);
    } catch {
      return false;
    }
  });

  const { data: dbSaved } = useQuery({
    queryKey: ["favorite", postId, user?.id],
    enabled: !!user && !!postId,
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user!.id)
        .eq("post_id", postId)
        .maybeSingle();
      return !!data;
    },
  });

  // Derived saved state
  const isSaved = user ? (dbSaved ?? localSaved) : localSaved;

  const toggle = useMutation({
    mutationFn: async () => {
      const nextState = !isSaved;

      // 1. Update localStorage
      try {
        const list: string[] = JSON.parse(localStorage.getItem("saved_posts") || "[]");
        let updated: string[];
        if (nextState) {
          updated = Array.from(new Set([...list, postId]));
        } else {
          updated = list.filter((id) => id !== postId);
        }
        localStorage.setItem("saved_posts", JSON.stringify(updated));
        setLocalSaved(nextState);
      } catch (e) {
        console.warn("Error updating localStorage bookmark:", e);
      }

      // 2. If logged in, update Supabase DB
      if (user) {
        if (nextState) {
          const { error } = await supabase
            .from("favorites")
            .insert({ user_id: user.id, post_id: postId });
          if (error && !error.message.includes("duplicate")) {
            console.warn("DB insert error:", error);
          }
        } else {
          const { error } = await supabase
            .from("favorites")
            .delete()
            .eq("user_id", user.id)
            .eq("post_id", postId);
          if (error) {
            console.warn("DB delete error:", error);
          }
        }
      }

      return nextState;
    },
    onSuccess: (savedNow) => {
      qc.invalidateQueries({ queryKey: ["favorite", postId] });
      qc.invalidateQueries({ queryKey: ["favorites"] });
      if (savedNow) {
        toast.success("Article saved to your bookmarks!");
      } else {
        toast.info("Article removed from bookmarks");
      }
    },
    onError: (err) => {
      console.error("Failed to toggle bookmark:", err);
      toast.error("Could not update bookmark");
    },
  });

  const buttonSize = size === "icon" ? "icon" : size === "sm" ? "sm" : "default";

  return (
    <Button
      variant={isSaved ? "default" : variant}
      size={showText ? (size === "sm" ? "sm" : "default") : (size === "sm" ? "icon" : size === "default" ? "sm" : size)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle.mutate();
      }}
      className={`rounded-xl transition-all font-semibold gap-1.5 shadow-xs select-none ${
        isSaved
          ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
          : "hover:text-primary hover:border-primary/50"
      } ${className}`}
      title={isSaved ? "Saved in reading list (click to remove)" : "Save to reading list"}
    >
      <Bookmark
        className={`h-4 w-4 transition-transform duration-200 ${
          isSaved ? "fill-current scale-110" : "group-hover:scale-110"
        }`}
      />
      {showText && (
        <span className="text-xs">{isSaved ? "Saved" : "Save Article"}</span>
      )}
    </Button>
  );
}
