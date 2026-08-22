import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { FEATURE_META, FeatureKey, useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AdminFeatures() {
  const { flags, loading } = useFeatureFlags();
  const [saving, setSaving] = useState<FeatureKey | null>(null);
  const [local, setLocal] = useState(flags);

  useEffect(() => { setLocal(flags); }, [flags]);

  const toggle = async (key: FeatureKey, next: boolean) => {
    setSaving(key);
    setLocal((p) => ({ ...p, [key]: next }));
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: `feature_${key}`, value: next ? "on" : "off" }, { onConflict: "key" });
    setSaving(null);
    if (error) {
      toast.error("Could not save: " + error.message);
      setLocal((p) => ({ ...p, [key]: !next }));
    } else {
      toast.success(`${key.replace(/_/g, " ")} ${next ? "enabled" : "disabled"}`);
    }
  };

  return (
    <div className="space-y-6">
      <Helmet><title>Feature Toggles · Admin</title></Helmet>
      <div>
        <h1 className="text-2xl font-bold">Feature Toggles</h1>
        <p className="text-sm text-muted-foreground">Switch any platform feature on or off. Changes apply instantly across the site.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURE_META.map((m) => (
            <Card key={m.key} className="p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{m.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>
              </div>
              <Switch
                checked={local[m.key]}
                disabled={saving === m.key}
                onCheckedChange={(v) => toggle(m.key, v)}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
