import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, MapPin, MessageSquare, Send, Sparkles, Phone, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function Contact() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const { error } = await supabase.from("contact_submissions").insert({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
    });

    if (error) {
      toast.error("Failed to send message. Please try again or email us directly.");
    } else {
      toast.success("Message sent! Our support team will get back to you promptly.");
      form.reset();
    }
    setLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>Contact Us - Bethelincovibe TV | Business Growth Ecosystem Support</title>
        <meta
          name="description"
          content="Contact Bethelincovibe TV. Reach our business support, supplier partnership, and entrepreneur assistance team in Lagos, Nigeria."
        />
        <link rel="canonical" href="https://bethelincovibetv.com/contact" />
      </Helmet>

      <div className="container mx-auto px-4 py-12 max-w-3xl space-y-8">
        <div className="text-center space-y-2">
          <Badge variant="outline" className="text-xs font-bold uppercase tracking-wider text-primary border-primary/30 py-1 px-3">
            <Sparkles className="h-3.5 w-3.5 mr-1" /> Get in Touch
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Contact Bethelincovibe TV
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
            Have questions about listing your business, marketplace products, advertising partnerships, or AI tools? We're here to help you grow.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="rounded-2xl border-border/80 bg-card shadow-xs hover:shadow-sm transition-all">
            <CardContent className="flex items-center gap-3.5 p-5">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Mail className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Official Email</p>
                <a
                  href="mailto:bethelincovibetv@gmail.com"
                  className="text-sm font-semibold text-foreground hover:text-primary transition-colors block truncate"
                >
                  bethelincovibetv@gmail.com
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/80 bg-card shadow-xs hover:shadow-sm transition-all">
            <CardContent className="flex items-center gap-3.5 p-5">
              <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Headquarters &amp; Hub</p>
                <p className="text-sm font-semibold text-foreground">Lagos, Nigeria</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border-border/80 shadow-md">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-bold">Send Us a Direct Message</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Fill out the form below and our entrepreneur success team will respond within 24 hours.
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider">Your Full Name</Label>
                  <Input id="name" name="name" required placeholder="e.g. Tunde Balogun" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider">Email Address</Label>
                  <Input id="email" name="email" type="email" required placeholder="you@business.com" className="rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-xs font-bold uppercase tracking-wider">Inquiry Subject</Label>
                <Input id="subject" name="subject" required placeholder="e.g. Business verification, Ad partnership, Marketplace support" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message" className="text-xs font-bold uppercase tracking-wider">Message Details</Label>
                <Textarea id="message" name="message" required placeholder="Tell us how we can assist your business growth..." rows={5} className="rounded-xl resize-y" />
              </div>
              <Button type="submit" size="lg" className="w-full rounded-xl font-bold shadow-md" disabled={loading}>
                {loading ? (
                  "Sending Message..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" /> Send Message
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
