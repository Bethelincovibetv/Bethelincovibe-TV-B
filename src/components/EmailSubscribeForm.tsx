import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function EmailSubscribeForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return toast.error("Enter a valid email");
    setLoading(true);
    const { error } = await supabase.from("email_subscribers").insert({ email: email.toLowerCase().trim() });
    setLoading(false);
    if (error) {
      if (error.code === "23505") toast.success("You're already subscribed!");
      else toast.error("Could not subscribe. Try again.");
      return;
    }
    toast.success("Subscribed! You'll get new posts in your inbox.");
    setEmail("");
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-primary" />
        <p className="font-semibold text-sm">Get new posts in your inbox</p>
      </div>
      <p className="text-xs text-muted-foreground">Subscribe to receive an email whenever we publish a new article.</p>
      <div className="flex gap-2">
        <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-9" />
        <Button type="submit" size="sm" disabled={loading}>{loading ? "..." : "Subscribe"}</Button>
      </div>
    </form>
  );
}
