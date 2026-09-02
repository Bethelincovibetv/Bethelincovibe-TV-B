import fs from "node:fs";

const adminPath = "src/pages/admin/AdminFeatures.tsx";

let text = fs.readFileSync(adminPath, "utf8");

function replaceOnce(pattern, replacement, label) {
  if (!pattern.test(text)) throw new Error(`Pattern not found: ${label}`);
  text = text.replace(pattern, replacement);
}

replaceOnce(
  /const \[statusFilter, setStatusFilter\] = useState<"all" \| "enabled" \| "disabled">\("all"\);/,
  'const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");\n  const [paidMap, setPaidMap] = useState<Record<string, boolean>>({});\n  const [pricingSaving, setPricingSaving] = useState<string | null>(null);',
  "admin state"
);

replaceOnce(
  /  useEffect\(\(\) => \{\n    setLocal\(flags\);\n  \}, \[flags\]\);/,
  `  useEffect(() => {\n    setLocal(flags);\n  }, [flags]);\n\n  useEffect(() => {\n    const loadPricing = async () => {\n      const keys = FEATURE_META.map((m) => \`feature_paid_\${m.key}\`);\n      const { data } = await supabase.from("site_settings").select("key,value").in("key", keys);\n      const next: Record<string, boolean> = {};\n      (data || []).forEach((r: any) => {\n        const key = String(r.key).replace(/^feature_paid_/, "");\n        next[key] = !["off", "false", "0", "free"].includes(String(r.value || "").toLowerCase());\n      });\n      setPaidMap(next);\n    };\n    loadPricing();\n  }, []);\n\n  const togglePaid = async (key: FeatureKey, paid: boolean) => {\n    setPricingSaving(key);\n    setPaidMap((p) => ({ ...p, [key]: paid }));\n    const { error } = await supabase\n      .from("site_settings")\n      .upsert({ key: \`feature_paid_\${key}\`, value: paid ? "paid" : "free" }, { onConflict: "key" });\n    setPricingSaving(null);\n    if (error) {\n      toast.error("Could not save pricing mode: " + error.message);\n      setPaidMap((p) => ({ ...p, [key]: !paid }));\n    } else {\n      toast.success(\`${key.replace(/_/g, " ")} is now \${paid ? "PAID" : "FREE"}\`);\n    }\n  };`,
  "pricing loader"
);

replaceOnce(
  /<Badge variant="secondary" className="text-\[10px\] py-0 px-1\.5 font-bold gap-1">\n                      <CategoryIcon className=\{`h-2\.5 w-2\.5 \$\{catInfo\.color\}`} \/>\n                      \{catInfo\.label\}\n                    <\/Badge>/,
  `<Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold gap-1">\n                      <CategoryIcon className={\`h-2.5 w-2.5 \${catInfo.color}\`} />\n                      {catInfo.label}\n                    </Badge>\n                    <Badge variant={paidMap[m.key] ? "default" : "outline"} className="text-[10px] py-0 px-1.5 font-black">\n                      {paidMap[m.key] ? "PAID" : "FREE"}\n                    </Badge>`,
  "pricing badge"
);

replaceOnce(
  /<div className="flex flex-col items-end gap-1 shrink-0 pt-0\.5">\n                  <Switch/,
  `<div className="flex flex-col items-end gap-2 shrink-0 pt-0.5">\n                  <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/40 p-0.5">\n                    <Button\n                      type="button"\n                      variant={!paidMap[m.key] ? "default" : "ghost"}\n                      size="sm"\n                      disabled={pricingSaving === m.key}\n                      onClick={() => togglePaid(m.key, false)}\n                      className="h-7 px-2 text-[10px] font-black rounded-md"\n                    >\n                      FREE\n                    </Button>\n                    <Button\n                      type="button"\n                      variant={paidMap[m.key] ? "default" : "ghost"}\n                      size="sm"\n                      disabled={pricingSaving === m.key}\n                      onClick={() => togglePaid(m.key, true)}\n                      className="h-7 px-2 text-[10px] font-black rounded-md"\n                    >\n                      PAID\n                    </Button>\n                  </div>\n                  <Switch`,
  "pricing controls"
);

fs.writeFileSync(adminPath, text);
console.log("AI Matchmaker paid/free admin controls patched.");
