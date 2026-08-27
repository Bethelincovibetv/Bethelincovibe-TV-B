import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Check,
  Palette,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  searchPexelsServiceGraphics,
  getFallbackGraphicsForCategory,
  StockGraphicItem,
} from "@/lib/serviceGraphicEngine";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function ServiceGraphicPickerModal({
  open,
  onOpenChange,
  serviceTitle,
  categoryHint,
  currentImageUrl,
  onSelectImage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceTitle: string;
  categoryHint?: string;
  currentImageUrl?: string;
  onSelectImage: (imageUrl: string) => void;
}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"stock" | "gradients" | "upload">("stock");
  const [searchQuery, setSearchQuery] = useState(serviceTitle || "business service");
  const [results, setResults] = useState<StockGraphicItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string>(currentImageUrl || "");
  const [uploading, setUploading] = useState(false);

  const GRADIENT_PRESETS = [
    {
      id: "grad-blue",
      name: "Sapphire Tech",
      css: "from-blue-600 via-indigo-600 to-cyan-500",
      url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "grad-emerald",
      name: "Emerald Growth",
      css: "from-emerald-600 via-teal-600 to-cyan-700",
      url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "grad-gold",
      name: "Luxury Gold",
      css: "from-amber-500 via-yellow-600 to-orange-600",
      url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "grad-rose",
      name: "Sunset Magenta",
      css: "from-orange-500 via-rose-500 to-pink-600",
      url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "grad-noir",
      name: "Executive Noir",
      css: "from-zinc-800 via-zinc-900 to-black",
      url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80",
    },
  ];

  const doSearch = async (queryToUse: string) => {
    setLoading(true);
    try {
      const items = await searchPexelsServiceGraphics(queryToUse, categoryHint);
      setResults(items);
    } catch (err) {
      console.warn("Graphic search fallback", err);
      setResults(getFallbackGraphicsForCategory(categoryHint, queryToUse));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSelectedUrl(currentImageUrl || "");
      const initialQuery = serviceTitle || categoryHint || "business";
      setSearchQuery(initialQuery);
      doSearch(initialQuery);
    }
  }, [open, serviceTitle, categoryHint, currentImageUrl]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `service-graphics/${user?.id || "guest"}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("guest-submissions")
        .upload(path, file, { upsert: true });

      if (error) throw error;
      const { data } = supabase.storage.from("guest-submissions").getPublicUrl(path);
      setSelectedUrl(data.publicUrl);
      toast.success("Graphic uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload graphic");
    } finally {
      setUploading(false);
    }
  };

  const handleApply = () => {
    if (!selectedUrl) {
      toast.error("Please select an image first");
      return;
    }
    onSelectImage(selectedUrl);
    toast.success("Service graphic attached!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-3xl border-primary/20">
        <div className="bg-gradient-to-r from-primary via-indigo-900 to-purple-950 text-white p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Badge className="bg-white/20 text-white border-white/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full gap-1">
                <Sparkles className="h-3 w-3" />
                AI SERVICE GRAPHIC DESIGNER
              </Badge>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-white">
                Select Service Visual &amp; Banner
              </DialogTitle>
              <DialogDescription className="text-xs text-white/80">
                Visual for: <span className="font-semibold text-white">"{serviceTitle || "New Service"}"</span>
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Live Preview Card */}
          {selectedUrl && (
            <div className="p-3.5 rounded-2xl bg-muted/40 border flex flex-col sm:flex-row items-center gap-4">
              <div className="h-24 w-36 rounded-xl overflow-hidden bg-black/10 shrink-0 relative border shadow-sm">
                <img src={selectedUrl} alt="Selected" className="w-full h-full object-cover" />
                <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5">
                  <Check className="h-2.5 w-2.5" /> Selected
                </div>
              </div>
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Selected Visual</p>
                <p className="text-sm font-bold truncate mt-0.5">{serviceTitle || "Custom Service"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Ready to apply to your business service listing.</p>
              </div>
              <Button onClick={handleApply} className="w-full sm:w-auto font-bold rounded-xl gap-1.5 shadow-md">
                <Check className="h-4 w-4" /> Use This Graphic
              </Button>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
            <TabsList className="grid grid-cols-3 w-full bg-muted/60 p-1 rounded-2xl">
              <TabsTrigger value="stock" className="rounded-xl text-xs font-bold gap-1.5">
                <Search className="h-3.5 w-3.5" /> Pexels Stock HD
              </TabsTrigger>
              <TabsTrigger value="gradients" className="rounded-xl text-xs font-bold gap-1.5">
                <Palette className="h-3.5 w-3.5" /> 3D Gradients
              </TabsTrigger>
              <TabsTrigger value="upload" className="rounded-xl text-xs font-bold gap-1.5">
                <Upload className="h-3.5 w-3.5" /> Custom Upload
              </TabsTrigger>
            </TabsList>

            {/* Pexels HD Stock Tab */}
            <TabsContent value="stock" className="space-y-3 mt-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && doSearch(searchQuery)}
                    placeholder="Search stock visual (e.g. web developer, tailoring, luxury car)..."
                    className="pl-9 rounded-xl text-xs h-10"
                  />
                </div>
                <Button onClick={() => doSearch(searchQuery)} disabled={loading} className="rounded-xl font-bold px-4 h-10">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
              </div>

              {/* Keyword Quick Tags */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" /> AI Suggested:
                </span>
                {[
                  serviceTitle,
                  categoryHint,
                  "workspace",
                  "professional team",
                  "modern tech",
                  "luxury",
                ]
                  .filter(Boolean)
                  .map((tag: any, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSearchQuery(tag);
                        doSearch(tag);
                      }}
                      className="text-[11px] px-2.5 py-0.5 rounded-full border bg-card hover:bg-primary/10 hover:text-primary transition font-medium"
                    >
                      {tag}
                    </button>
                  ))}
              </div>

              {/* Photo Results Grid */}
              {loading ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-xs text-muted-foreground">Sourcing high-resolution commercial photography...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="py-10 text-center border border-dashed rounded-2xl">
                  <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-1" />
                  <p className="text-sm font-semibold">No stock visuals found for "{searchQuery}"</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Try simpler keywords like "business", "technology", or "office".</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {results.map((item) => {
                    const isCurrent = selectedUrl === item.url;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedUrl(item.url)}
                        className={`group relative aspect-[16/10] rounded-xl overflow-hidden cursor-pointer border-2 transition-all hover:scale-[1.02] shadow-xs ${
                          isCurrent
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border/60 hover:border-primary/50"
                        }`}
                      >
                        <img
                          src={item.thumbnailUrl || item.url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-2 flex flex-col justify-end text-white">
                          <p className="text-[11px] font-bold line-clamp-1">{item.title}</p>
                          {item.photographer && (
                            <p className="text-[9px] text-white/80 truncate">By {item.photographer}</p>
                          )}
                        </div>
                        {isCurrent && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground p-1 rounded-full shadow-md">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* 3D Gradients Tab */}
            <TabsContent value="gradients" className="space-y-3 mt-0">
              <p className="text-xs text-muted-foreground">
                High-end modern gradient themes designed for sleek, abstract brand aesthetics.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {GRADIENT_PRESETS.map((preset) => {
                  const isCurrent = selectedUrl === preset.url;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedUrl(preset.url)}
                      className={`group relative aspect-[16/10] rounded-xl overflow-hidden cursor-pointer border-2 transition-all hover:scale-[1.02] shadow-xs ${
                        isCurrent
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border/60 hover:border-primary/50"
                      }`}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent p-2.5 flex flex-col justify-end text-white">
                        <p className="text-xs font-bold">{preset.name}</p>
                      </div>
                      {isCurrent && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground p-1 rounded-full shadow-md">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Custom Upload Tab */}
            <TabsContent value="upload" className="space-y-4 mt-0">
              <div className="border-2 border-dashed border-border/80 rounded-2xl p-8 text-center bg-muted/20 hover:bg-muted/40 transition">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <h4 className="text-sm font-bold">Upload Custom Service Graphic</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Upload a high quality PNG, JPG, or WebP photo representing your service (1200x800 recommended).
                </p>
                <div className="mt-4">
                  <input
                    type="file"
                    id="service-custom-graphic"
                    accept="image/*"
                    onChange={handleUpload}
                    className="hidden"
                  />
                  <Button
                    asChild
                    disabled={uploading}
                    className="font-bold rounded-xl px-5 shadow-sm cursor-pointer"
                  >
                    <label htmlFor="service-custom-graphic">
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" /> Choose Image File
                        </>
                      )}
                    </label>
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="p-4 bg-muted/40 border-t flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedUrl}
            className="font-bold rounded-xl px-6 shadow-md gap-1.5"
          >
            <Check className="h-4 w-4" /> Apply Selected Visual
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
