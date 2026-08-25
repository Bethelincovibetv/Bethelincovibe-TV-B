import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Terminal, Code2, Globe, Play, Server, Layers, CheckCircle2 } from "lucide-react";
import { VIXORA_API_LIVE_BASE } from "../constants";
import { vixora } from "@/services/vixoraClient";
import { toast } from "sonner";

export function DeveloperApiView() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testTopic, setTestTopic] = useState("3 Secret AI Tools for Nigerian Businesses");
  const [testOutput, setTestOutput] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestScriptEndpoint = async () => {
    setIsTesting(true);
    setTestOutput({ status: "Calling POST /api/public/v1/scripts/generate..." });
    try {
      const res = await vixora.generateScript({
        topic: testTopic,
        duration: "30s",
        niche: "business",
        tone: "energetic",
      });
      setTestOutput(res);
      toast.success("API returned response successfully!");
    } catch (e: any) {
      setTestOutput({ error: e.message || "Request failed" });
      toast.error("Endpoint test error");
    } finally {
      setIsTesting(false);
    }
  };

  const curlExample = `curl -X POST "${VIXORA_API_LIVE_BASE}/api/public/v1/videos/create" \\
  -H "Content-Type: application/json" \\
  -d '{
    "topic": "3 Productivity Hacks for Founders",
    "duration": "30s",
    "aspect_ratio": "vertical",
    "voice": "Kore"
  }'`;

  const tsExample = `import { VixoraClient } from '@/services/vixoraClient';

const vixora = new VixoraClient('${VIXORA_API_LIVE_BASE}');

// 1. Generate Viral Script with Beats
const scriptRes = await vixora.generateScript({
  topic: 'Peak Energy Habits',
  duration: '30s',
});

// 2. Synthesize & Render Full HD Video
const videoResult = await vixora.createAndRenderVideo({
  topic: 'Peak Energy Habits',
  script: scriptRes.script,
  duration: '30s',
  aspectRatio: 'vertical',
  voice: 'Kore',
  onProgress: (p) => console.log(\`\${p.step}: \${p.progress}%\`),
});

console.log('Video ready at:', videoResult.videoUrl);`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <Card className="border-border/80 bg-gradient-to-r from-purple-950/20 via-background to-indigo-950/20 shadow-md">
        <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse inline-block"></span>
                LIVE & ACTIVE
              </Badge>
              <Badge variant="secondary" className="text-xs font-mono">
                v1.0.0
              </Badge>
            </div>
            <h2 className="text-xl font-bold text-foreground">Vixora Universal REST API & Webhooks</h2>
            <p className="text-xs text-muted-foreground max-w-xl">
              Integrate real-time video generation, TTS voiceovers, SFX sound design, and script generators directly into your mobile apps, SaaS, and automation pipelines.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="p-2.5 rounded-xl bg-muted/60 border border-border/80 text-xs font-mono text-foreground flex items-center justify-between gap-3 overflow-x-auto max-w-xs md:max-w-md">
              <Globe className="h-4 w-4 text-purple-500 shrink-0" />
              <span className="truncate">{VIXORA_API_LIVE_BASE}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0"
                onClick={() => copyToClipboard(VIXORA_API_LIVE_BASE, "Base URL")}
              >
                {copiedKey === "Base URL" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code Snippets & Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <Tabs defaultValue="typescript" className="w-full">
            <div className="flex items-center justify-between mb-2">
              <TabsList>
                <TabsTrigger value="typescript" className="text-xs font-semibold gap-1.5">
                  <Code2 className="h-3.5 w-3.5" />
                  TypeScript / React
                </TabsTrigger>
                <TabsTrigger value="curl" className="text-xs font-semibold gap-1.5">
                  <Terminal className="h-3.5 w-3.5" />
                  cURL
                </TabsTrigger>
              </TabsList>

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold gap-1.5"
                onClick={() => copyToClipboard(tsExample, "Code Sample")}
              >
                {copiedKey === "Code Sample" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>Copy Code</span>
              </Button>
            </div>

            <TabsContent value="typescript" className="mt-0">
              <pre className="p-4 rounded-xl bg-muted/70 text-xs font-mono text-foreground overflow-x-auto border border-border/80 leading-relaxed max-h-[380px]">
                {tsExample}
              </pre>
            </TabsContent>

            <TabsContent value="curl" className="mt-0">
              <pre className="p-4 rounded-xl bg-muted/70 text-xs font-mono text-foreground overflow-x-auto border border-border/80 leading-relaxed max-h-[380px]">
                {curlExample}
              </pre>
            </TabsContent>
          </Tabs>

          {/* Endpoints List */}
          <Card className="border-border/80">
            <CardHeader className="py-3 px-4 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Server className="h-4 w-4 text-orange-500" />
                <span>Available REST Endpoints</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/40">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">POST</Badge>
                  <span className="font-semibold text-foreground">/api/public/v1/videos/create</span>
                </div>
                <span className="text-[11px] text-muted-foreground font-sans">Submit video rendering job</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/40">
                <div className="flex items-center gap-2">
                  <Badge className="bg-sky-600 text-white text-[10px] px-1.5 py-0">GET</Badge>
                  <span className="font-semibold text-foreground">/api/public/v1/videos/status?job_id=...</span>
                </div>
                <span className="text-[11px] text-muted-foreground font-sans">Poll rendering progress (0-100%)</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/40">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">POST</Badge>
                  <span className="font-semibold text-foreground">/api/public/v1/scripts/generate</span>
                </div>
                <span className="text-[11px] text-muted-foreground font-sans">AI viral script & scene beats</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/40">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">POST</Badge>
                  <span className="font-semibold text-foreground">/api/public/v1/audio/tts</span>
                </div>
                <span className="text-[11px] text-muted-foreground font-sans">Synthesize voiceover MP3 audio</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/40">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-600 text-white text-[10px] px-1.5 py-0">POST</Badge>
                  <span className="font-semibold text-foreground">/api/public/v1/auth/sync</span>
                </div>
                <span className="text-[11px] text-muted-foreground font-sans">Single Sign-On Session Sync</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Interactive Test Console */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border/80 shadow-md">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Play className="h-4 w-4 text-emerald-500 fill-emerald-500" />
                <span>Live Interactive Test Console</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Test API responses in real-time from your browser.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Test Script Topic:
                </label>
                <div className="flex gap-2">
                  <Input
                    value={testTopic}
                    onChange={(e) => setTestTopic(e.target.value)}
                    className="h-9 text-xs"
                    placeholder="Enter test prompt..."
                  />
                  <Button
                    onClick={handleTestScriptEndpoint}
                    disabled={isTesting || !testTopic.trim()}
                    size="sm"
                    className="h-9 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shrink-0"
                  >
                    {isTesting ? "Executing..." : "Send POST"}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Console Response:
                </label>
                <div className="p-3 rounded-xl bg-black/90 text-emerald-400 font-mono text-[11px] min-h-[220px] max-h-[280px] overflow-y-auto border border-border/40">
                  {testOutput ? (
                    <pre className="whitespace-pre-wrap">{JSON.stringify(testOutput, null, 2)}</pre>
                  ) : (
                    <span className="text-muted-foreground italic">
                      Click "Send POST" above to inspect real-time JSON payloads...
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DeveloperApiView;
