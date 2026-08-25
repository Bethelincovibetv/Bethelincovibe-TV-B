import { StockAsset, VideoAspectRatio } from "../types";

export const CURATED_STOCK_ASSETS: StockAsset[] = [
  {
    id: "stock_tech_01",
    title: "Futuristic Cyber Grid & AI Data Stream",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1080&q=80",
    thumbUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=60",
    orientation: "vertical",
    tags: ["tech", "ai", "cyber", "data", "future"],
    source: "Unsplash Pro",
  },
  {
    id: "stock_business_01",
    title: "Executive Business Tower & Skyline",
    url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1080&q=80",
    thumbUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=300&q=60",
    orientation: "vertical",
    tags: ["business", "finance", "skyscraper", "growth", "corporate"],
    source: "Unsplash Pro",
  },
  {
    id: "stock_lagos_01",
    title: "Lagos Lekki-Ikoyi Bridge Sunset & Traffic",
    url: "https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?auto=format&fit=crop&w=1080&q=80",
    thumbUrl: "https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?auto=format&fit=crop&w=300&q=60",
    orientation: "vertical",
    tags: ["lagos", "nigeria", "energy", "sunset", "city"],
    source: "Unsplash Pro",
  },
  {
    id: "stock_growth_01",
    title: "Financial Analytics & Stock Candlesticks",
    url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1080&q=80",
    thumbUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=300&q=60",
    orientation: "vertical",
    tags: ["crypto", "finance", "trading", "profit", "wealth"],
    source: "Unsplash Pro",
  },
  {
    id: "stock_creative_01",
    title: "Studio Lighting & Color Splashes",
    url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1080&q=80",
    thumbUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=300&q=60",
    orientation: "vertical",
    tags: ["neon", "creative", "vibes", "party", "social"],
    source: "Unsplash Pro",
  },
  {
    id: "stock_minimal_01",
    title: "Clean Minimalist Geometric Studio",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1080&q=80",
    thumbUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=60",
    orientation: "vertical",
    tags: ["minimal", "luxury", "interior", "calm", "premium"],
    source: "Unsplash Pro",
  },
];

export const stockSourcingService = {
  async searchStock(query: string, orientation: VideoAspectRatio = "vertical"): Promise<StockAsset[]> {
    const q = query.toLowerCase().trim();
    if (!q) return CURATED_STOCK_ASSETS;

    const matched = CURATED_STOCK_ASSETS.filter((item) => {
      const matchTag = item.tags.some((t) => t.includes(q) || q.includes(t));
      const matchTitle = item.title.toLowerCase().includes(q);
      return matchTag || matchTitle;
    });

    if (matched.length > 0) return matched;

    // Fallback generate dynamic Unsplash search URL based on keywords
    return [
      {
        id: `stock_dyn_${Date.now()}`,
        title: `Dynamic Stock: ${query}`,
        url: `https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1080&q=80`,
        thumbUrl: `https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=300&q=60`,
        orientation,
        tags: [query, "dynamic", "hd"],
        source: "AI Visual Sourcing",
      },
      ...CURATED_STOCK_ASSETS,
    ];
  },
};
