import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Upload,
  Image as ImageIcon,
  Check,
  Sparkles,
  Loader2,
  FolderOpen,
  Camera,
  Layers,
} from "lucide-react";
import { CURATED_STOCK_CATALOG, StockPhotoAsset } from "@/lib/designPipeline/stockPhotoService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StockPhotoPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPhoto: (url: string) => void;
  currentPhotoUrl?: string;
  defaultCategory?: string;
}

const STOCK_CATEGORY_TABS = [
  { id: "all", label: "All Categories" },
  { id: "tech", label: "Web & Tech" },
  { id: "solar", label: "Solar & Energy" },
  { id: "branding", label: "Branding & Design" },
  { id: "media", label: "Media & Studio" },
  { id: "realestate", label: "Real Estate & Construction" },
  { id: "fashion", label: "Fashion & Style" },
  { id: "beauty", label: "Beauty & Spa" },
  { id: "food", label: "Catering & Food" },
  { id: "logistics", label: "Logistics & Delivery" },
  { id: "education", label: "Education & Consulting" },
];

export default function StockPhotoPickerModal({
  open,
  onOpenChange,
  onSelectPhoto,
  currentPhotoUrl,
  defaultCategory,
}: StockPhotoPickerModalProps) {
  const [activeTab, setActiveTab] = useState<"stock" | "upload">("stock");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [uploading, setUploading] = useState(false);
  const [previewUploadUrl, setPreviewUploadUrl] = useState<string | null>(null);

  // Filter stock photos based on category tab & search query
  const filteredPhotos = useMemo(() => {
    let list = CURATED_STOCK_CATALOG;

    if (selectedCategory !== "all") {
      list = list.filter((p) => {
        if (selectedCategory === "tech") return p.category === "tech";
        if (selectedCategory === "solar") return p.category === "solar" || p.tags.includes("energy");
        if (selectedCategory === "branding") return p.tags.includes("branding") || p.tags.includes("design") || p.category === "tech";
        if (selectedCategory === "media") return p.tags.includes("photo") || p.tags.includes("video") || p.tags.includes("camera") || p.category === "events";
        if (selectedCategory === "realestate") return p.category === "realestate";
        if (selectedCategory === "fashion") return p.category === "fashion";
        if (selectedCategory === "beauty") return p.category === "beauty";
        if (selectedCategory === "food") return p.category === "food";
        if (selectedCategory === "logistics") return p.category === "logistics";
        if (selectedCategory === "education") return p.tags.includes("education") || p.tags.includes("consulting") || p.category === "tech";
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [searchQuery, selectedCategory]);

  // Handle direct file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `service-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = `services/${fileName}`;

      // Try uploading to supabase storage
      const { error: uploadError } = await supabase.storage
        .from("supplier-logos")
        .upload(filePath, file, { upsert: true, contentType: file.type });

      let publicUrl = "";
      if (!uploadError) {
        const { data } = supabase.storage.from("supplier-logos").getPublicUrl(filePath);
        publicUrl = data?.publicUrl || "";
      } else {
        // Fallback to reading file as data URL if storage bucket fails or restricted
        publicUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      setPreviewUploadUrl(publicUrl);
      toast.success("Photo uploaded successfully!");
    } catch (err: any) {
      console.error("Upload failed", err);
      toast.error("Failed to upload image. Please try another file.");
    } finally {
      setUploading(false);
    }
  };

  const applySelectedPhoto = (url: string) => {
    onSelectPhoto(url);
    onOpenChange(false);
    toast.success("Service cover photo updated!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-3xl p-5 sm:p-7 bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5 border-b border-border/60 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
                  Service Photo Library &amp; Upload
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-muted-foreground">
                  Explore curated high-resolution commercial stock photos or upload your own direct image.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full pt-2">
          <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1 bg-muted/60 mb-4">
            <TabsTrigger value="stock" className="rounded-xl text-xs font-bold gap-1.5 py-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Curated Stock Photo Library ({CURATED_STOCK_CATALOG.length})
            </TabsTrigger>
            <TabsTrigger value="upload" className="rounded-xl text-xs font-bold gap-1.5 py-2">
              <Upload className="h-3.5 w-3.5 text-primary" />
              Upload Your Own Photo
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: CURATED STOCK PHOTOS */}
          <TabsContent value="stock" className="space-y-4 m-0">
            {/* Search & Category Tabs */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search photos by keyword (e.g., solar, developer, catering, barber, laptop, salon)..."
                  className="pl-9 rounded-xl text-xs h-10 bg-background"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
                {STOCK_CATEGORY_TABS.map((cat) => (
                  <Button
                    key={cat.id}
                    type="button"
                    size="sm"
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    onClick={() => setSelectedCategory(cat.id)}
                    className="rounded-xl text-[11px] font-bold h-7 px-2.5 shrink-0"
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Photo Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 max-h-[420px] overflow-y-auto pr-1">
              {filteredPhotos.map((photo) => {
                const isSelected = currentPhotoUrl === photo.url;
                return (
                  <div
                    key={photo.id}
                    onClick={() => applySelectedPhoto(photo.url)}
                    className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-200 bg-muted/40 aspect-[4/3] ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/30 shadow-md scale-[0.99]"
                        : "border-border/60 hover:border-primary/60 hover:shadow-md"
                    }`}
                  >
                    <img
                      src={photo.thumbUrl || photo.url}
                      alt={photo.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                    {/* Badge / Selected check */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-md">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}

                    {/* Photo Title & Author */}
                    <div className="absolute bottom-2 left-2 right-2 space-y-0.5">
                      <p className="text-[11px] font-bold text-white line-clamp-1 drop-shadow-xs">
                        {photo.title}
                      </p>
                      <p className="text-[9px] text-white/70 truncate">
                        By {photo.author} • Unsplash Commercial
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredPhotos.length === 0 && (
              <div className="py-12 text-center space-y-2 border-2 border-dashed rounded-2xl">
                <FolderOpen className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                <p className="text-xs font-bold text-foreground">No stock photos match your search</p>
                <p className="text-[11px] text-muted-foreground">Try searching another keyword or choose another category.</p>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: DIRECT UPLOAD */}
          <TabsContent value="upload" className="space-y-4 m-0">
            <div className="border-2 border-dashed border-border/80 rounded-3xl p-8 text-center bg-muted/20 hover:bg-muted/30 transition-colors relative">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleFileUpload}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              <div className="space-y-3 max-w-sm mx-auto">
                <div className="h-14 w-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs">
                  {uploading ? (
                    <Loader2 className="h-7 w-7 animate-spin" />
                  ) : (
                    <Upload className="h-7 w-7" />
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-black text-foreground">
                    {uploading ? "Uploading photo..." : "Click or drag your photo here"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports high-resolution JPG, PNG, or WEBP up to 10MB.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  className="rounded-xl text-xs font-bold pointer-events-none"
                >
                  Choose From Computer / Phone
                </Button>
              </div>
            </div>

            {/* Uploaded Preview */}
            {previewUploadUrl && (
              <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-foreground">Uploaded Photo Preview</span>
                  <Badge className="bg-emerald-600 text-white text-[10px]">Ready to Apply</Badge>
                </div>

                <div className="aspect-[16/9] max-h-48 w-full rounded-xl overflow-hidden bg-black/10 border border-border/60">
                  <img
                    src={previewUploadUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => applySelectedPhoto(previewUploadUrl)}
                    className="rounded-xl text-xs font-black bg-primary text-white shadow-md gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" /> Use This Photo as Cover
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-end pt-3 border-t border-border/60 mt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
