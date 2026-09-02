import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { saveProviderPreferences } from "@/services/opportunityMatchingRealtimeService";
import { POPULAR_REQUEST_CATEGORIES, ProviderOpportunityPreferences } from "@/types/opportunityMatching";
import { toast } from "sonner";

export default function ProviderPreferencesModal({ open, onOpenChange, preferences, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; preferences: ProviderOpportunityPreferences; onSaved: (prefs: ProviderOpportunityPreferences) => void }) {
  const [prefs, setPrefs] = useState(preferences);
  const [saving, setSaving] = useState(false);
  useEffect(() => setPrefs(preferences), [preferences]);
  const toggleCategory = (name: string) => setPrefs(p => ({ ...p, subscribed_categories: p.subscribed_categories.includes(name) ? p.subscribed_categories.filter(x => x !== name) : [...p.subscribed_categories, name] }));
  const save = async () => {
    setSaving(true);
    try { await saveProviderPreferences(prefs); onSaved(prefs); toast.success("Opportunity preferences saved."); onOpenChange(false); }
    catch (e: any) { toast.error(e?.message || "Could not save preferences."); }
    finally { setSaving(false); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg rounded-2xl p-6"><DialogHeader><DialogTitle>Opportunity Alerts & Preferences</DialogTitle><DialogDescription>Choose the business requests you want to receive.</DialogDescription></DialogHeader><div className="space-y-5"><div className="flex items-center justify-between border rounded-xl p-3"><div><Label>Receive Opportunity Alerts</Label><p className="text-xs text-muted-foreground">Enable matching for your provider profile.</p></div><Switch checked={prefs.notifications_enabled} onCheckedChange={v => setPrefs({ ...prefs, notifications_enabled: v })} /></div><div><Label>Preferred Budget Range (₦)</Label><div className="grid grid-cols-2 gap-2 mt-2"><Input type="number" value={prefs.min_budget} onChange={e => setPrefs({ ...prefs, min_budget: Number(e.target.value) || 0 })} /><Input type="number" value={prefs.max_budget} onChange={e => setPrefs({ ...prefs, max_budget: Number(e.target.value) || 0 })} /></div></div><div><Label>Subscribed Categories</Label><div className="flex flex-wrap gap-2 mt-2">{POPULAR_REQUEST_CATEGORIES.map(cat => <button key={cat.slug} type="button" onClick={() => toggleCategory(cat.name)} className={`px-2.5 py-1.5 rounded-lg text-xs border ${prefs.subscribed_categories.includes(cat.name) ? "bg-primary text-white border-primary" : "bg-secondary"}`}>{cat.name}</button>)}</div></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving} className="font-bold">{saving ? "Saving…" : "Save Preferences"}</Button></DialogFooter></DialogContent></Dialog>;
}
