import React, { useState } from "react";
import { Sparkles, Package, Download, UtensilsCrossed, ChevronRight, Grid3X3, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ProductType,
  ProductCategoryOption,
  PHYSICAL_PRODUCT_CATEGORIES,
  DIGITAL_PRODUCT_CATEGORIES,
  ALL_PRODUCT_CATEGORIES,
} from "@/lib/productAIEngine";
import digitalGoods3D from "@/assets/images/digital_goods_3d_1787915095364.jpg";
import physicalGoods3D from "@/assets/images/physical_goods_3d_1787915108745.jpg";

interface ProductCategoryFilter3DProps {
  productType: "all" | ProductType;
  onSelectProductType: (type: "all" | ProductType) => void;
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
  categoryCounts?: Record<string, number>;
  totalCount?: number;
}

export default function ProductCategoryFilter3D({
  productType,
  onSelectProductType,
  selectedCategory,
  onSelectCategory,
  categoryCounts = {},
  totalCount = 0,
}: ProductCategoryFilter3DProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const currentCategories: ProductCategoryOption[] =
    productType === "physical"
      ? PHYSICAL_PRODUCT_CATEGORIES
      : productType === "digital"
      ? DIGITAL_PRODUCT_CATEGORIES
      : ALL_PRODUCT_CATEGORIES;

  return (
    <div className="space-y-4 rounded-3xl border-2 border-border/80 bg-gradient-to-b from-card to-card/60 p-4 sm:p-6 shadow-xl backdrop-blur-md">
      {/* 1. Header & 3D Product Type Switcher */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-wider">
            <Layers className="h-3.5 w-3.5" />
            <span>Interactive Marketplace Filters</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Browse by Product Type & Category
          </h2>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">
            Explore {totalCount > 0 ? `${totalCount} verified listings` : "thousands of products"} across physical goods and instant digital downloads.
          </p>
        </div>

        {/* 3D Product Type Selectors */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
          {/* All Types */}
          <button
            onClick={() => {
              onSelectProductType("all");
              onSelectCategory("all");
            }}
            className={`group relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border-2 transition-all duration-300 text-center ${
              productType === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02] ring-2 ring-primary/30"
                : "bg-muted/40 text-foreground border-border/80 hover:border-primary/40 hover:bg-muted/80"
            }`}
          >
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-background/20 backdrop-blur-md flex items-center justify-center mb-1.5 shadow-inner">
              <Sparkles className={`h-5 w-5 ${productType === "all" ? "text-primary-foreground" : "text-primary"}`} />
            </div>
            <span className="text-xs sm:text-sm font-black leading-tight">All Market</span>
            <span className={`text-[10px] font-semibold mt-0.5 ${productType === "all" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
              Full Catalog
            </span>
          </button>

          {/* Physical & Food */}
          <button
            onClick={() => {
              onSelectProductType("physical");
              onSelectCategory("all");
            }}
            className={`group relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border-2 transition-all duration-300 text-center overflow-hidden ${
              productType === "physical"
                ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white border-amber-500 shadow-lg shadow-amber-500/25 scale-[1.02] ring-2 ring-amber-500/30"
                : "bg-muted/40 text-foreground border-border/80 hover:border-amber-500/40 hover:bg-muted/80"
            }`}
          >
            <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-xl overflow-hidden mb-1.5 shadow-inner border border-white/20">
              <img
                src={physicalGoods3D}
                alt="Physical"
                className="h-full w-full object-cover transition-transform group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-xs sm:text-sm font-black leading-tight flex items-center gap-1">
              Physical & Food
            </span>
            <span className={`text-[10px] font-semibold mt-0.5 ${productType === "physical" ? "text-white/90" : "text-muted-foreground"}`}>
              Lagos Delivery
            </span>
          </button>

          {/* Digital Products */}
          <button
            onClick={() => {
              onSelectProductType("digital");
              onSelectCategory("all");
            }}
            className={`group relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border-2 transition-all duration-300 text-center overflow-hidden ${
              productType === "digital"
                ? "bg-gradient-to-br from-purple-600 to-indigo-700 text-white border-purple-500 shadow-lg shadow-purple-500/25 scale-[1.02] ring-2 ring-purple-500/30"
                : "bg-muted/40 text-foreground border-border/80 hover:border-purple-500/40 hover:bg-muted/80"
            }`}
          >
            <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-xl overflow-hidden mb-1.5 shadow-inner border border-white/20">
              <img
                src={digitalGoods3D}
                alt="Digital"
                className="h-full w-full object-cover transition-transform group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-xs sm:text-sm font-black leading-tight flex items-center gap-1">
              Digital Assets
            </span>
            <span className={`text-[10px] font-semibold mt-0.5 ${productType === "digital" ? "text-white/90" : "text-muted-foreground"}`}>
              Instant Access
            </span>
          </button>
        </div>
      </div>

      {/* 2. 3D Category Filter Navigation */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              {productType === "digital"
                ? "Digital Category Collections"
                : productType === "physical"
                ? "Physical Goods & Food Categories"
                : "All Category Collections"}
            </span>
            {selectedCategory !== "all" && (
              <Badge variant="outline" className="text-[10px] font-extrabold bg-primary/10 text-primary border-primary/30">
                Filtered
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedCategory !== "all" && (
              <button
                onClick={() => onSelectCategory("all")}
                className="text-xs font-bold text-primary hover:underline"
              >
                Reset Filter
              </button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-bold h-8 px-2 text-muted-foreground hover:text-foreground"
            >
              <Grid3X3 className="h-3.5 w-3.5 mr-1" />
              {isExpanded ? "Collapse" : "Show All"}
            </Button>
          </div>
        </div>

        {/* 3D Category Cards Carousel / Grid */}
        <div
          className={`gap-3 pb-2 transition-all ${
            isExpanded
              ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
              : "flex overflow-x-auto no-scrollbar scroll-smooth snap-x"
          }`}
        >
          {/* "All Categories" Card */}
          <button
            onClick={() => onSelectCategory("all")}
            className={`group relative shrink-0 snap-start rounded-2xl border-2 p-3 text-left transition-all duration-200 flex items-center gap-3 ${
              isExpanded ? "w-full" : "w-[200px] sm:w-[220px]"
            } ${
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/20 scale-[1.02]"
                : "bg-card/80 text-foreground border-border/80 hover:border-primary/40 hover:shadow-sm"
            }`}
          >
            <div
              className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                selectedCategory === "all" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
              }`}
            >
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-black truncate leading-tight">All Categories</p>
              <p className={`text-[10px] font-medium truncate ${selectedCategory === "all" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                Browse everything
              </p>
            </div>
          </button>

          {/* Dynamic 3D Categories */}
          {currentCategories.map((c) => {
            const isSelected = selectedCategory === c.slug;
            return (
              <button
                key={c.id}
                onClick={() => onSelectCategory(c.slug)}
                className={`group relative shrink-0 snap-start rounded-2xl border-2 p-3 text-left transition-all duration-200 flex items-center gap-3 overflow-hidden ${
                  isExpanded ? "w-full" : "w-[210px] sm:w-[240px]"
                } ${
                  isSelected
                    ? "bg-gradient-to-r from-primary to-accent text-primary-foreground border-primary shadow-lg ring-2 ring-primary/30 scale-[1.02]"
                    : "bg-card text-foreground border-border/80 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                {/* 3D Image Thumbnail or Vibrant Gradient Container */}
                <div className="relative h-11 w-11 rounded-xl overflow-hidden shrink-0 border border-border/60 shadow-inner bg-muted">
                  {c.image3D ? (
                    <img
                      src={c.image3D}
                      alt={c.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-115"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={`h-full w-full bg-gradient-to-br ${c.color || "from-primary to-accent"} flex items-center justify-center text-white font-bold text-sm`}>
                      <Package className="h-5 w-5" />
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px]" />
                  )}
                </div>

                {/* Text Labels & Micro Badge */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-xs sm:text-sm font-black truncate leading-tight ${isSelected ? "text-primary-foreground" : "text-foreground group-hover:text-primary"}`}>
                      {c.name}
                    </p>
                  </div>
                  <p className={`text-[10px] font-semibold truncate ${isSelected ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                    {c.badge || (c.type === "digital" ? "Digital File" : "Physical Item")}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
