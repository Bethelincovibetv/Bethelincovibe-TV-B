import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendSubscriberWelcomeEmail, getCachedGmailToken } from "@/lib/gmail";

export default function EmailSubscribeForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.includes("@")) return toast.error("Enter a valid email address");

    setLoading(true);

    // 1. Insert into email_subscribers database
    const { error } = await supabase.from("email_subscribers").insert({ email: cleanEmail });

    if (error) {
      setLoading(false);
      if (error.code === "23505") {
        toast.info("You're already subscribed to Bethelincovibe TV updates!");
      } else {
        toast.error("Could not complete subscription. Please try again.");
      }
      return;
    }

    // 2. Trigger automated welcome email via Gmail API
    const token = getCachedGmailToken();
    let emailSent = false;

    if (token) {
      try {
        emailSent = await sendSubscriberWelcomeEmail(cleanEmail, token);
      } catch (err) {
        console.warn("Welcome email trigger note:", err);
      }
    } else {
      // Fire-and-forget attempt
      sendSubscriberWelcomeEmail(cleanEmail).catch(() => {});
    }

    setLoading(false);

    if (emailSent) {
      toast.success("Subscribed! Confirmation email sent via Gmail.", {
        description: `A welcome message was dispatched to ${cleanEmail}.`,
      });
    } else {
      toast.success("Subscribed successfully!", {
        description: `You will now receive new blog posts and updates at ${cleanEmail}.`,
      });
    }

    setEmail("");
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-card/90 p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Mail className="h-4 w-4" />
        </div>
        <p className="font-extrabold text-sm">Get new posts in your inbox</p>
      </div>
      <p className="text-xs text-muted-foreground">Subscribe to receive automated email updates whenever we publish new business articles.</p>
      <div className="flex gap-2">
        <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-9 rounded-xl text-xs" />
        <Button type="submit" size="sm" disabled={loading} className="h-9 rounded-xl font-bold text-xs shrink-0">
          {loading ? "Subscribing..." : "Subscribe"}
        </Button>
      </div>
    </form>
  );
}
