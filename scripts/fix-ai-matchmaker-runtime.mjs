import fs from "node:fs";

const flagsPath = "src/contexts/FeatureFlagsContext.tsx";
const assistantPath = "src/components/ai-match/AIBusinessMatchAssistant.tsx";

function patch(path, replacements) {
  let text = fs.readFileSync(path, "utf8");
  for (const [pattern, replacement] of replacements) {
    if (typeof pattern === "string") {
      if (!text.includes(pattern)) throw new Error(`Pattern not found in ${path}: ${pattern}`);
      text = text.replace(pattern, replacement);
    } else {
      if (!pattern.test(text)) throw new Error(`Pattern not found in ${path}: ${pattern}`);
      text = text.replace(pattern, replacement);
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

console.log("AI Matchmaker runtime controls patched.");
