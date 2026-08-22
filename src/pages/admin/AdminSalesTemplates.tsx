import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LayoutTemplate, Sparkles, Star } from "lucide-react";
import { TEMPLATE_LIST } from "@/components/sales-templates/SalesPageTemplate";

export default function AdminSalesTemplates() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("sales_page_templates").select("*").order("display_order");
    if (error) toast.error(error.message);
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from("sales_page_templates").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const setDefault = async (id: string) => {
    await supabase.from("sales_page_templates").update({ is_default: false }).neq("id", id);
    await supabase.from("sales_page_templates").update({ is_default: true, enabled: true }).eq("id", id);
    toast.success("Default template updated");
    load();
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><LayoutTemplate className="h-5 w-5 text-primary" />Sales Page Templates</h1>
      <p className="text-sm text-muted-foreground">Toggle which templates are available to users when creating their sales page. The default is selected automatically.</p>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : (
          <div className="grid sm:grid-cols-2 gap-3">
            {rows.map((t) => {
              const meta = TEMPLATE_LIST.find((m) => m.key === t.key);
              return (
                <Card key={t.id} className={t.enabled ? "" : "opacity-60"}>
                  <CardHeader className="pb-2">
                    <div className={`h-20 -mt-2 -mx-6 rounded-t-lg bg-gradient-to-br ${meta?.preview || "from-primary to-purple-600"}`} />
                    <CardTitle className="text-base flex items-center gap-2 pt-3">
                      {t.name}
                      {t.is_default && <Badge variant="default" className="text-[10px]"><Star className="h-3 w-3 mr-1" />Default</Badge>}
                      {t.is_premium && <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Premium</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-muted-foreground line-clamp-2">{t.description || meta?.description}</p>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Switch checked={t.enabled} onCheckedChange={(v) => update(t.id, { enabled: v })} />
                        <span className="text-xs">{t.enabled ? "Available to users" : "Hidden"}</span>
                      </div>
                      {!t.is_default && t.enabled && (
                        <Button size="sm" variant="outline" onClick={() => setDefault(t.id)}>Make default</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
    </div>
  );
}
