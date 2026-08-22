import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  postId: string;
  size?: "sm" | "default";
}

export default function FavoriteButton({ postId, size = "default" }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: isFav } = useQuery({
    queryKey: ["favorite", postId, user?.id],
    enabled: !!user,
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

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Login required");
      if (isFav) {
        await supabase.from("favorites").delete().eq("user_id", user.id).eq("post_id", postId);
      } else {
        await supabase.from("favorites").insert({ user_id: user.id, post_id: postId });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorite", postId] });
      qc.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(isFav ? "Removed from favorites" : "Added to favorites");
    },
    onError: () => toast.error("Please log in to save favorites"),
  });

  if (!user) return null;

  return (
    <Button
      variant="ghost"
      size={size === "sm" ? "icon" : "sm"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle.mutate(); }}
      className="group"
      title={isFav ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={`h-4 w-4 transition-colors ${isFav ? "fill-red-500 text-red-500" : "text-muted-foreground group-hover:text-red-400"}`}
      />
    </Button>
  );
}
