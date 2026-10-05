import React, { useState } from "react";
import { Sparkles, Package, Download, ChevronRight, Grid3X3, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ProductType,
  ProductCategoryOption,
  PHYSICAL_PRODUCT_CATEGORIES,
  DIGITAL_PRODUCT_CATEGORIES,
  ALL_PRODUCT_CATEGORIES,
} from "@/lib/productAIEngine";
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
    <div className="space-y-2.5 rounded-2xl border border-border/80 bg-card p-2.5 sm:p-3.5 shadow-xs">
      {/* 1. Header & Jiji-style Sleek Product Type Switcher */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight flex items-center gap-1.5">
              Categories &amp; Market Filters
              {totalCount > 0 && (
                <span className="text-[11px] font-semibold text-muted-foreground">
                  ({totalCount} items)
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* Compact Product Type Selectors (Jiji style) */}
        <div className="inline-flex p-1 rounded-xl bg-muted/60 border border-border/60 self-start sm:self-auto">
          <button
            onClick={() => {
              onSelectProductType("all");
              onSelectCategory("all");
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              productType === "all"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Market
          </button>

          <button
            onClick={() => {
              onSelectProductType("physical");
              onSelectCategory("all");
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              productType === "physical"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Physical &amp; Food
          </button>

          <button
            onClick={() => {
              onSelectProductType("digital");
              onSelectCategory("all");
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              productType === "digital"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Digital Toolkits
          </button>
        </div>
      </div>

      {/* 2. Compact Jiji-style Category Filter Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {productType === "digital"
              ? "Digital Collections"
              : productType === "physical"
              ? "Physical Goods"
              : "Popular Categories"}
          </span>

          <div className="flex items-center gap-2">
            {selectedCategory !== "all" && (
              <button
                onClick={() => onSelectCategory("all")}
                className="text-[11px] font-bold text-emerald-600 hover:underline"
              >
                Clear Filter
              </button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[11px] font-bold h-6 px-1.5 text-muted-foreground hover:text-foreground"
            >
              <Grid3X3 className="h-3 w-3 mr-1" />
              {isExpanded ? "Collapse" : "All Categories"}
            </Button>
          </div>
        </div>

        {/* Category Cards Carousel / Grid: Space-efficient, lean padding */}
        <div
          className={`gap-2 transition-all ${
            isExpanded
              ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
              : "flex overflow-x-auto no-scrollbar scroll-smooth snap-x pb-1"
          }`}
        >
          {/* "All Categories" Pill */}
          <button
            onClick={() => onSelectCategory("all")}
            className={`group relative shrink-0 snap-start rounded-xl border p-2 text-left transition-all flex items-center gap-2 ${
              isExpanded ? "w-full" : "w-[150px] sm:w-[170px]"
            } ${
              selectedCategory === "all"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                : "bg-muted/40 text-foreground border-border/70 hover:border-emerald-500/50 hover:bg-muted/80"
            }`}
          >
            <div
              className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                selectedCategory === "all" ? "bg-white/20 text-white" : "bg-emerald-500/15 text-emerald-600"
              }`}
            >
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate leading-tight">All Items</p>
              <p className={`text-[10px] truncate ${selectedCategory === "all" ? "text-white/80" : "text-muted-foreground"}`}>
                Browse all
              </p>
            </div>
          </button>

          {/* Dynamic Categories */}
          {currentCategories.map((c) => {
            const isSelected = selectedCategory === c.slug;
            const count = categoryCounts[c.slug];
            return (
              <button
                key={c.id}
                onClick={() => onSelectCategory(c.slug)}
                className={`group relative shrink-0 snap-start rounded-xl border p-2 text-left transition-all flex items-center gap-2 overflow-hidden ${
                  isExpanded ? "w-full" : "w-[160px] sm:w-[180px]"
                } ${
                  isSelected
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-muted/30 text-foreground border-border/70 hover:border-emerald-500/50 hover:bg-muted/70"
                }`}
              >
                <div className="relative h-7 w-7 rounded-lg overflow-hidden shrink-0 border border-border/40 bg-muted">
                  {c.image3D ? (
                    <img
                      src={c.image3D}
                      alt={c.name}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-full w-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center text-xs font-bold">
                      <Package className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold truncate leading-tight ${isSelected ? "text-white" : "text-foreground group-hover:text-emerald-600"}`}>
                    {c.name}
                  </p>
                  <p className={`text-[10px] truncate ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>
                    {count !== undefined ? `${count} items` : c.badge || "Verified"}
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
