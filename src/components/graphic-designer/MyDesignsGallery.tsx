import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Copy,
  Trash2,
  Edit,
  Sparkles,
  Layers,
  Search,
  Calendar,
  Image as ImageIcon,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  getSavedDesigns,
  deleteDesign,
  duplicateDesign,
  downloadDesignImage,
  SavedDesign,
} from "@/lib/savedDesignsManager";

interface MyDesignsGalleryProps {
  onOpenInGraphicStudio?: (design: SavedDesign) => void;
  onOpenInLogoStudio?: (design: SavedDesign) => void;
  onNavigateToCreate?: () => void;
}

export default function MyDesignsGallery({
  onOpenInGraphicStudio,
  onOpenInLogoStudio,
  onNavigateToCreate,
}: MyDesignsGalleryProps) {
  const { user } = useAuth();
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [filterType, setFilterType] = useState<"all" | "graphic" | "logo">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadDesigns = () => {
    const list = getSavedDesigns(user?.id);
    setDesigns(list);
  };

  useEffect(() => {
    loadDesigns();
  }, [user]);

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Delete "${title}"? This cannot be undone.`)) {
      deleteDesign(id, user?.id);
      loadDesigns();
      toast.success("Design deleted from gallery.");
    }
  };

  const handleDuplicate = (id: string) => {
    const dup = duplicateDesign(id, user?.id);
    if (dup) {
      loadDesigns();
      toast.success("Design duplicated!");
    }
  };

  const filteredDesigns = designs.filter((d) => {
    if (filterType !== "all" && d.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        (d.businessName && d.businessName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            My Saved Designs & Assets
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage your generated flyers, social media banners, and vector logos.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border self-start sm:self-center">
          {[
            { key: "all", label: "All Items", count: designs.length },
            { key: "graphic", label: "Graphics", count: designs.filter((d) => d.type === "graphic").length },
            { key: "logo", label: "Logos", count: designs.filter((d) => d.type === "logo").length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key as any)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterType === tab.key
                  ? "bg-background text-foreground shadow-xs border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span className="text-[10px] opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Input
          placeholder="Search saved designs by title or business..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10 text-sm"
        />
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      </div>

      {/* Grid of Designs */}
      {filteredDesigns.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredDesigns.map((design) => {
            const isLogo = design.type === "logo";
            const dateFormatted = new Date(design.createdAt).toLocaleDateString([], {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <Card
                key={design.id}
                className="overflow-hidden border shadow-xs hover:shadow-md transition-all group bg-card"
              >
                {/* Thumbnail Preview */}
                <div className="aspect-square bg-neutral-950/80 relative flex items-center justify-center p-3 overflow-hidden">
                  {design.previewDataUrl ? (
                    <img
                      src={design.previewDataUrl}
                      alt={design.title}
                      className="w-full h-full object-contain rounded-lg group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : design.svgMarkup ? (
                    <div
                      className="w-full h-full flex items-center justify-center p-4"
                      dangerouslySetInnerHTML={{ __html: design.svgMarkup }}
                    />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  )}

                  <Badge
                    variant="secondary"
                    className="absolute top-2.5 left-2.5 text-[10px] font-bold uppercase shadow-xs bg-background/90 backdrop-blur-xs"
                  >
                    {isLogo ? "Vector Logo" : design.dimensions?.label || "Flyer"}
                  </Badge>
                </div>

                {/* Card Body */}
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {design.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                      <Calendar className="h-3 w-3" />
                      <span>{dateFormatted}</span>
                      {design.dimensions && (
                        <span>• {design.dimensions.width}×{design.dimensions.height}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-border/60">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadDesignImage(design)}
                      className="flex-1 text-xs font-bold gap-1 h-8"
                    >
                      <Download className="h-3 w-3" />
                      Export
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDuplicate(design.id)}
                      title="Duplicate Design"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(design.id, design.title)}
                      title="Delete Design"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border border-dashed p-12 text-center bg-muted/20">
          <div className="flex flex-col items-center gap-3 max-w-md mx-auto">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <FolderOpen className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              {searchQuery ? "No matching designs found" : "No saved designs yet"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {searchQuery
                ? "Try searching for a different keyword or clear your filters."
                : "Create high-converting promotional flyers, business banners, or vector logos using our AI Design Suite."}
            </p>
            {onNavigateToCreate && (
              <Button
                onClick={onNavigateToCreate}
                className="mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold gap-1.5 shadow-sm"
              >
                <Sparkles className="h-4 w-4" />
                Create New Design
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
