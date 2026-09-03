import fs from "node:fs";

const flagsPath = "src/contexts/FeatureFlagsContext.tsx";
const assistantPath = "src/components/ai-match/AIBusinessMatchAssistant.tsx";
const adminPath = "src/pages/admin/AdminFeatures.tsx";

function patch(path, replacements) {
  let text = fs.readFileSync(path, "utf8");
  for (const [pattern, replacement] of replacements) {
    if (typeof pattern === "string") {
      if (text.includes(replacement)) continue;
      if (!text.includes(pattern)) continue;
      text = text.replace(pattern, replacement);
    } else {
      if (pattern.test(text)) {
        text = text.replace(pattern, replacement);
      }
    }
  }
  fs.writeFileSync(path, text);
}

patch(flagsPath, [
  [
    '| "graphic_designer" | "logo_creator" | "video_creator" | "coach" | "ai_blogger" | "ai_admin" | "ai_recommender"',
    '| "graphic_designer" | "logo_creator" | "video_creator" | "coach" | "ai_blogger" | "ai_admin" | "ai_recommender" | "ai_recommender_button"'
  ],
  [
    '{ key: "ai_recommender", label: "AI Business Recommender & Match Assistant", category: "ai_creative", description: "Maya smart business-matching assistant, intent pattern detection, dynamic behavioural scoring and curated recommendations" },',
    '{ key: "ai_recommender", label: "AI Matchmaker — Whole System", category: "ai_creative", description: "Master switch for the AI Business Matchmaker. Turn this off to permanently disable the complete matchmaker experience." },\n  { key: "ai_recommender_button", label: "AI Matchmaker Floating Button", category: "ai_creative", description: "Controls only Maya\'s floating trigger button. Turning this off hides the button while the AI matching engine continues working from other entry points." },'
  ]
]);

patch(assistantPath, [
  [
    'import { Button } from "@/components/ui/button";',
    'import { Button } from "@/components/ui/button";\nimport { useFeatureFlags } from "@/contexts/FeatureFlagsContext";'
  ],
  [
    '  const navigate = useNavigate();\n  const location = useLocation();',
    '  const navigate = useNavigate();\n  const location = useLocation();\n  const { flags } = useFeatureFlags();\n  const systemEnabled = flags.ai_recommender !== false;\n  const triggerEnabled = flags.ai_recommender_button !== false;'
  ],
  [
    '  const [hasInteracted, setHasInteracted] = useState(false);',
    '  const [hasInteracted, setHasInteracted] = useState(false);\n  const [triggerVisible, setTriggerVisible] = useState(true);\n  const [triggerPosition, setTriggerPosition] = useState({ top: 68, left: 72 });'
  ],
  [
    '  // Subscribe to real-time recommendation updates\n  useEffect(() => {',
    '  // The floating trigger is intentionally ephemeral and relocates so it never becomes a permanent obstruction.\n  useEffect(() => {\n    if (!triggerEnabled || !systemEnabled) {\n      setTriggerVisible(false);\n      return;\n    }\n    let hideTimer;\n    let nextTimer;\n    const placeRandomly = () => {\n      const top = 18 + Math.random() * 58;\n      const left = 8 + Math.random() * 76;\n      setTriggerPosition({ top, left });\n      setTriggerVisible(true);\n      window.clearTimeout(hideTimer);\n      hideTimer = window.setTimeout(() => setTriggerVisible(false), 60_000);\n      nextTimer = window.setTimeout(placeRandomly, 75_000 + Math.random() * 45_000);\n    };\n    placeRandomly();\n    return () => {\n      window.clearTimeout(hideTimer);\n      window.clearTimeout(nextTimer);\n    };\n  }, [triggerEnabled, systemEnabled, location.pathname]);\n\n  // Subscribe to real-time recommendation updates\n  useEffect(() => {'
  ],
  [
    '  if (!userPrefs.enabled) {\n    return null;\n  }',
    '  if (!systemEnabled || !userPrefs.enabled) {\n    return null;\n  }'
  ],
  [
    '  if (isDismissed || !match) {\n    if (!userPrefs.show_avatar) return null;',
    '  if (isDismissed || !match) {\n    if (!userPrefs.show_avatar || !triggerEnabled || !triggerVisible) return null;'
  ],
  [
    '      <aside aria-label="AI Business Match Assistant" className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 select-none pointer-events-auto">',
    '      <aside aria-label="AI Business Match Assistant" className="fixed z-40 select-none pointer-events-auto" style={{ top: `${triggerPosition.top}%`, left: `${triggerPosition.left}%`, transform: "translate(-50%, -50%)" }}>'
  ],
  [
    '  return (\n    <aside aria-label="AI Business Match Assistant" className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 max-w-[calc(100vw-32px)] sm:max-w-md select-none pointer-events-auto">',
    '  return (\n    <aside aria-label="AI Business Match Assistant" className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 max-w-[calc(100vw-32px)] sm:max-w-md select-none pointer-events-auto">'
  ]
]);

if (!fs.readFileSync(adminPath, "utf8").includes("paidMap")) {
  patch(adminPath, [
    [
      /const \[statusFilter, setStatusFilter\] = useState<"all" \| "enabled" \| "disabled">\("all"\);/,
      'const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");\n  const [paidMap, setPaidMap] = useState<Record<string, boolean>>({});\n  const [pricingSaving, setPricingSaving] = useState<string | null>(null);'
    ],
    [
      /  useEffect\(\(\) => \{\n    setLocal\(flags\);\n  \}, \[flags\]\);/,
      `  useEffect(() => {\n    setLocal(flags);\n  }, [flags]);\n\n  useEffect(() => {\n    const loadPricing = async () => {\n      const keys = FEATURE_META.map((m) => "feature_paid_" + m.key);\n      const { data } = await supabase.from("site_settings").select("key,value").in("key", keys);\n      const next: Record<string, boolean> = {};\n      (data || []).forEach((r: any) => {\n        const key = String(r.key).replace(/^feature_paid_/, "");\n        next[key] = !["off", "false", "0", "free"].includes(String(r.value || "").toLowerCase());\n      });\n      setPaidMap(next);\n    };\n    loadPricing();\n  }, []);\n\n  const togglePaid = async (key: FeatureKey, paid: boolean) => {\n    setPricingSaving(key);\n    setPaidMap((p) => ({ ...p, [key]: paid }));\n    const { error } = await supabase\n      .from("site_settings")\n      .upsert({ key: "feature_paid_" + key, value: paid ? "paid" : "free" }, { onConflict: "key" });\n    setPricingSaving(null);\n    if (error) {\n      toast.error("Could not save pricing mode: " + error.message);\n      setPaidMap((p) => ({ ...p, [key]: !paid }));\n    } else {\n      toast.success(key.replace(/_/g, " ") + " is now " + (paid ? "PAID" : "FREE"));\n    }\n  };`
    ],
    [
      /(<Badge variant="secondary" className="text-\[10px\] py-0 px-1\.5 font-bold gap-1">[\s\S]*?<\/Badge>)/,
      '$1\n                    <Badge variant={paidMap[m.key] ? "default" : "outline"} className="text-[10px] py-0 px-1.5 font-black">{paidMap[m.key] ? "PAID" : "FREE"}</Badge>'
    ],
    [
      /<div className="flex flex-col items-end gap-1 shrink-0 pt-0\.5">\n                  <Switch/,
      `<div className="flex flex-col items-end gap-2 shrink-0 pt-0.5">\n                  <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/40 p-0.5">\n                    <Button type="button" variant={!paidMap[m.key] ? "default" : "ghost"} size="sm" disabled={pricingSaving === m.key} onClick={() => togglePaid(m.key, false)} className="h-7 px-2 text-[10px] font-black rounded-md">FREE</Button>\n                    <Button type="button" variant={paidMap[m.key] ? "default" : "ghost"} size="sm" disabled={pricingSaving === m.key} onClick={() => togglePaid(m.key, true)} className="h-7 px-2 text-[10px] font-black rounded-md">PAID</Button>\n                  </div>\n                  <Switch`
    ]
  ]);
}

console.log("AI Matchmaker runtime + paid/free admin controls patched.");
