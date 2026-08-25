import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Check, Search, Eye, ArrowRight, LayoutTemplate, Layers } from "lucide-react";
import { EMAIL_TEMPLATES, EmailTemplate } from "@/data/emailTemplates";
import { cn } from "@/lib/utils";

interface EmailTemplateSelectorDialogProps {
  onSelectTemplate: (template: EmailTemplate) => void;
  triggerButton?: React.ReactNode;
}

export default function EmailTemplateSelectorDialog({
  onSelectTemplate,
  triggerButton,
}: EmailTemplateSelectorDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  const categories = [
    { id: "all", label: "All Templates" },
    { id: "promotion", label: "Promotions & Sales" },
    { id: "newsletter", label: "Newsletters & Digest" },
    { id: "event", label: "Events & Webinars" },
    { id: "onboarding", label: "Welcome & Onboarding" },
    { id: "spotlight", label: "Supplier Spotlights" },
    { id: "announcement", label: "Alerts & Grants" },
  ];

  const filtered = EMAIL_TEMPLATES.filter((t) => {
    const matchesCat = activeCategory === "all" || t.category === activeCategory;
    const matchesSearch =
      search.trim() === "" ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.categoryLabel.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleApply = (template: EmailTemplate) => {
    onSelectTemplate(template);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button
            variant="outline"
            className="rounded-2xl border-primary/40 text-primary hover:bg-primary/10 gap-2 h-10 font-bold text-xs shadow-xs"
          >
            <LayoutTemplate className="h-4 w-4 text-primary" />
            Browse Template Library ({EMAIL_TEMPLATES.length})
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-violet-600/10 border-b shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-black text-foreground">
                  Curated Email Campaign Templates
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Choose from professionally designed, high-converting templates built for newsletters, flash sales, webinars, and onboarding.
                </DialogDescription>
              </div>
            </div>

            <Badge variant="outline" className="hidden sm:inline-flex bg-background font-bold text-xs px-3 py-1">
              {filtered.length} Available
            </Badge>
          </div>

          {/* Search & Category Filter */}
          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates by keyword, theme, or topic..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-background"
              />
            </div>

            <div className="overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-auto">
                <TabsList className="h-9 p-1 bg-background/80 border rounded-xl flex">
                  {categories.map((c) => (
                    <TabsTrigger
                      key={c.id}
                      value={c.id}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {c.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Template Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-muted/20">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Layers className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="font-bold text-sm text-foreground">No templates match your search</p>
              <p className="text-xs text-muted-foreground mt-1">Try searching for a different keyword or resetting filters.</p>
              <Button size="sm" variant="outline" onClick={() => { setSearch(""); setActiveCategory("all"); }} className="mt-3 text-xs rounded-xl">
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((template) => (
                <div
                  key={template.id}
                  className="flex flex-col justify-between p-4 sm:p-5 rounded-2xl border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-extrabold px-2 py-0.5 rounded-md"
                        style={{ borderLeftColor: template.accentColor, borderLeftWidth: 3 }}
                      >
                        {template.badge}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                        {template.categoryLabel}
                      </span>
                    </div>

                    <h3 className="font-black text-sm text-foreground group-hover:text-primary transition-colors">
                      {template.title}
                    </h3>

                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {template.description}
                    </p>

                    <div className="p-2.5 rounded-xl bg-muted/50 border border-border/60 text-[11px] space-y-1">
                      <p className="text-muted-foreground font-bold text-[10px] uppercase">Subject Preview:</p>
                      <p className="font-medium text-foreground truncate">{template.subject}</p>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPreviewTemplate(template)}
                      className="h-8 text-xs font-bold gap-1 rounded-xl text-muted-foreground hover:text-foreground"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleApply(template)}
                      className="h-8 text-xs font-extrabold gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Use This Template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal for full single-template preview */}
        {previewTemplate && (
          <Dialog open={Boolean(previewTemplate)} onOpenChange={(v) => !v && setPreviewTemplate(null)}>
            <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 rounded-3xl overflow-hidden">
              <div className="p-4 sm:p-5 border-b bg-muted/40 shrink-0 flex items-center justify-between">
                <div>
                  <Badge variant="outline" className="text-[10px] font-bold mb-1">
                    {previewTemplate.categoryLabel}
                  </Badge>
                  <DialogTitle className="text-base font-black">
                    {previewTemplate.title}
                  </DialogTitle>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-muted/10 text-xs">
                <div className="p-3 rounded-xl bg-card border space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Subject Line:</p>
                  <p className="font-bold text-foreground">{previewTemplate.subject}</p>
                </div>

                <div className="p-4 rounded-2xl bg-card border shadow-xs space-y-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Email Body Preview:</p>
                  <div className="whitespace-pre-wrap font-sans leading-relaxed text-foreground/90 bg-muted/30 p-3.5 rounded-xl border">
                    {previewTemplate.body}
                  </div>

                  {previewTemplate.ctaText && (
                    <div className="pt-2 flex justify-center">
                      <div
                        className="px-5 py-2.5 rounded-xl font-bold text-white text-xs text-center shadow-sm"
                        style={{ backgroundColor: previewTemplate.accentColor }}
                      >
                        {previewTemplate.ctaText}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t bg-background shrink-0 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPreviewTemplate(null)}
                  className="rounded-xl text-xs font-bold h-9"
                >
                  Back to List
                </Button>
                <Button
                  onClick={() => {
                    handleApply(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                  className="rounded-xl text-xs font-extrabold h-9 bg-primary text-primary-foreground gap-1.5 shadow-sm"
                >
                  <Check className="h-4 w-4" />
                  Load Template into Composer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
