import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  Filter,
  Users,
  Eye,
  Sparkles,
  ShieldCheck,
  Star,
  Package,
  Layers,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  RefreshCw,
  X,
  SlidersHorizontal,
  Info,
} from "lucide-react";
import {
  getMarketplaceListings,
  MarketplaceCommunityCard,
  MarketplaceFilters,
} from "@/services/marketplaceService";
import {
  getCommunityCategories,
  COMMUNITY_TYPES,
  CommunityType,
} from "@/services/communityService";
import { MarketplaceCard } from "@/components/marketplace/MarketplaceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function BusinessPromotionMarketplace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<MarketplaceCommunityCard[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [selectedType, setSelectedType] = useState<string>(searchParams.get("type") || "all");
  const [minAudience, setMinAudience] = useState<number>(
    Number(searchParams.get("minAudience")) || 0
  );
  const [minViews, setMinViews] = useState<number>(
    Number(searchParams.get("minViews")) || 0
  );
  const [sortBy, setSortBy] = useState<string>(searchParams.get("sort") || "popular");

  // Fetch Categories
  useEffect(() => {
    async function loadCategories() {
      const cats = await getCommunityCategories();
      setCategories(cats);
    }
    loadCategories();
  }, []);

  // Fetch Marketplace Data
  const loadMarketplace = async () => {
    setLoading(true);
    try {
      const filters: MarketplaceFilters = {
        searchQuery,
        categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
        communityType: (selectedType !== "all" ? selectedType : undefined) as CommunityType,
        minAudience: minAudience > 0 ? minAudience : undefined,
        minDailyViews: minViews > 0 ? minViews : undefined,
        sortBy: sortBy as any,
      };

      const data = await getMarketplaceListings(filters);
      setListings(data);
    } catch (err) {
      console.error("Error loading marketplace:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketplace();
  }, [selectedCategory, selectedType, minAudience, minViews, sortBy]);

  // Handle Search Input submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadMarketplace();
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedType("all");
    setMinAudience(0);
    setMinViews(0);
    setSortBy("popular");
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedCategory !== "all" ||
    selectedType !== "all" ||
    minAudience > 0 ||
    minViews > 0 ||
    sortBy !== "popular";

  // Calculate high level stats
  const totalVerifiedCommunities = listings.length;
  const totalAudienceReach = listings.reduce((sum, item) => sum + (item.community.member_count || 0), 0);
  const totalActivePackages = listings.reduce((sum, item) => sum + item.packages.length, 0);

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-linear-to-b from-primary/10 via-background to-background pt-12 pb-8 border-b border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-extrabold tracking-wide uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Bethelincovibe Promotion Network • Nigeria 🇳🇬</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
              Discover Verified Promoters & WhatsApp Audiences
            </h1>

            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Connect your business with vetted Nigerian WhatsApp community owners, channel broadcasters,
              and status promoters to drive direct customer engagement.
            </p>

            {/* Quick Summary Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border/70 text-xs font-bold shadow-2xs">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>100% Verified Audiences</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border/70 text-xs font-bold shadow-2xs">
                <Users className="h-4 w-4 text-primary" />
                <span>{totalAudienceReach.toLocaleString()}+ Combined Reach</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border/70 text-xs font-bold shadow-2xs">
                <Package className="h-4 w-4 text-purple-500" />
                <span>Transparent Naira (₦) Packages</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Notice Banner */}
      <div className="container mx-auto px-4 my-6">
        <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200 rounded-2xl">
          <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <AlertTitle className="text-xs font-bold text-amber-800 dark:text-amber-300">
              Promoter Discovery Mode (Step 5)
            </AlertTitle>
            <AlertDescription className="text-xs text-amber-700/90 dark:text-amber-300/80 mt-0.5 leading-relaxed">
              Browse verified promoters and inspect transparent package pricing in Naira (₦).
              Direct on-platform order booking, verified payment security, and Paystack checkout will unlock in the upcoming booking release.
            </AlertDescription>
          </div>
        </Alert>
      </div>

      {/* Main Content & Filter Bar */}
      <div className="container mx-auto px-4">
        {/* Search & Main Controls */}
        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm mb-6">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by community name, promoter, category or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-xl text-sm font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                className="h-11 px-5 rounded-xl font-bold text-xs sm:text-sm shadow-xs"
              >
                Search
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                className="md:hidden h-11 px-3 rounded-xl font-semibold text-xs flex items-center gap-1.5"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </div>
          </form>

          {/* Expanded Filter Row (Desktop & Mobile Accordion) */}
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4 mt-4 border-t border-border/50 ${
              showFiltersMobile ? "block" : "hidden md:grid"
            }`}
          >
            {/* Category Filter */}
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                Niche / Category
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-10 rounded-xl text-xs font-semibold">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Audience Type */}
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                Audience Type
              </label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-10 rounded-xl text-xs font-semibold">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="group">👥 WhatsApp Group</SelectItem>
                  <SelectItem value="channel">📢 WhatsApp Channel</SelectItem>
                  <SelectItem value="status_audience">📱 Status Audience</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Minimum Audience Size */}
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                Min. Audience Size
              </label>
              <Select
                value={minAudience.toString()}
                onValueChange={(val) => setMinAudience(Number(val))}
              >
                <SelectTrigger className="h-10 rounded-xl text-xs font-semibold">
                  <SelectValue placeholder="Any Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any Size</SelectItem>
                  <SelectItem value="500">500+ Members</SelectItem>
                  <SelectItem value="1000">1,000+ Members</SelectItem>
                  <SelectItem value="2500">2,500+ Members</SelectItem>
                  <SelectItem value="5000">5,000+ Members</SelectItem>
                  <SelectItem value="10000">10,000+ Members</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                Sort By
              </label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 rounded-xl text-xs font-semibold">
                  <SelectValue placeholder="Popular" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Top Rated & Recommended</SelectItem>
                  <SelectItem value="members_desc">Audience Size (High to Low)</SelectItem>
                  <SelectItem value="views_desc">Daily Views (High to Low)</SelectItem>
                  <SelectItem value="price_asc">Lowest Package Price</SelectItem>
                  <SelectItem value="rating_desc">Highest Promoter Rating</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filter Tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-border/40">
              <span className="text-xs text-muted-foreground font-medium">Active filters:</span>

              {searchQuery && (
                <Badge variant="secondary" className="text-xs gap-1 font-semibold">
                  Query: {searchQuery}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery("")} />
                </Badge>
              )}

              {selectedCategory !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1 font-semibold">
                  Category: {categories.find((c) => c.id === selectedCategory)?.name || "Selected"}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSelectedCategory("all")}
                  />
                </Badge>
              )}

              {selectedType !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1 font-semibold">
                  Type: {selectedType.replace("_", " ")}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedType("all")} />
                </Badge>
              )}

              {minAudience > 0 && (
                <Badge variant="secondary" className="text-xs gap-1 font-semibold">
                  Min {minAudience.toLocaleString()} members
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setMinAudience(0)} />
                </Badge>
              )}

              {sortBy !== "popular" && (
                <Badge variant="secondary" className="text-xs gap-1 font-semibold">
                  Sorted
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSortBy("popular")} />
                </Badge>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs h-6 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Results Counter Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">
              Verified Communities & Packages
            </h2>
            <Badge variant="outline" className="font-bold text-xs bg-muted/40">
              {listings.length} {listings.length === 1 ? "result" : "results"}
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadMarketplace}
            disabled={loading}
            className="text-xs font-semibold gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-80 rounded-2xl border border-border/60 bg-muted/30 animate-pulse"
              />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-border/80 bg-card/50 max-w-lg mx-auto">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
              <Users className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">
              No verified communities found
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-6">
              We couldn't find any verified promoter communities matching your search criteria.
              Try adjusting or clearing your filters.
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="font-bold text-xs rounded-xl"
              >
                Reset All Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((item) => (
              <MarketplaceCard key={item.community.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
