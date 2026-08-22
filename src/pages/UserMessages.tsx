import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Mail, MessageCircle, Phone, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function UserMessages() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<Record<string, string>>({});

  const load = async () => {
    if (!user) return;
    const { data: biz } = await supabase.from("suppliers").select("id, name").eq("submitted_by", user.id);
    const bizMap: Record<string, string> = {};
    (biz || []).forEach((b: any) => { bizMap[b.id] = b.name; });
    setBusinesses(bizMap);

    const ids = (biz || []).map((b: any) => b.id);
    if (ids.length === 0) { setMessages([]); setLoading(false); return; }

    const { data: msgs } = await supabase
      .from("business_messages")
      .select("*")
      .in("business_id", ids)
      .order("created_at", { ascending: false })
      .limit(200);
    setMessages(msgs || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const markRead = async (id: string) => {
    await supabase.from("business_messages").update({ is_read: true }).eq("id", id);
    setMessages((m) => m.map((x) => x.id === id ? { ...x, is_read: true } : x));
  };

  if (authLoading) return <div className="p-12 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  const unread = messages.filter((m) => !m.is_read).length;

  return (
    <>
      <Helmet><title>Messages · Bethelincovibe TV</title></Helmet>
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <Button asChild variant="ghost" size="sm" className="mb-3">
          <Link to="/dashboard"><ChevronLeft className="h-4 w-4 mr-1" />Back</Link>
        </Button>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Customer Messages</h1>
          {unread > 0 && <Badge>{unread} new</Badge>}
        </div>

        {loading ? (
          <div className="text-center py-12"><Loader2 className="h-6 w-6 mx-auto animate-spin" /></div>
        ) : messages.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Mail className="h-10 w-10 mx-auto mb-3 opacity-40" />
            No messages yet. When customers chat with your services they'll appear here.
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <Card key={m.id} className={!m.is_read ? "border-primary/50 shadow-md" : ""}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{m.sender_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {businesses[m.business_id] || "Business"} · {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                      </p>
                      {m.service_title && <Badge variant="secondary" className="text-[10px] mt-1">Re: {m.service_title}</Badge>}
                    </div>
                    {!m.is_read && <Badge>New</Badge>}
                  </div>
                  <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded-lg p-3">{m.message}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {m.sender_phone && (
                      <Button asChild size="sm" variant="outline">
                        <a href={`tel:${m.sender_phone}`}><Phone className="h-3.5 w-3.5 mr-1" />Call</a>
                      </Button>
                    )}
                    {m.sender_phone && (
                      <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <a href={`https://wa.me/${m.sender_phone.replace(/\D/g, "")}`} target="_blank" rel="noopener">
                          <MessageCircle className="h-3.5 w-3.5 mr-1" />WhatsApp
                        </a>
                      </Button>
                    )}
                    {m.sender_email && (
                      <Button asChild size="sm" variant="outline">
                        <a href={`mailto:${m.sender_email}`}><Mail className="h-3.5 w-3.5 mr-1" />Email</a>
                      </Button>
                    )}
                    {!m.is_read && (
                      <Button size="sm" variant="ghost" onClick={() => markRead(m.id)}>Mark read</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
