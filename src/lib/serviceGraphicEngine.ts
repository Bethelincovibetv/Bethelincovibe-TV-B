import { supabase } from "@/integrations/supabase/client";

export interface StockGraphicItem {
  id: string | number;
  url: string;
  thumbnailUrl: string;
  title: string;
  photographer?: string;
  sourceUrl?: string;
  category?: string;
  tags?: string[];
}

// Curated high-aesthetic studio collections categorized for Nigerian & Global businesses
export const CURATED_SERVICE_GRAPHICS: Record<string, StockGraphicItem[]> = {
  technology: [
    {
      id: "cur-tech-1",
      url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
      thumbnailUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80",
      title: "Web & Software Coding Workspace",
      photographer: "Christopher Gower",
      category: "technology",
      tags: ["web design", "coding", "software", "laptop"]
    },
    {
      id: "cur-tech-2",
      url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
      thumbnailUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80",
      title: "Data Analytics & Digital Dashboard",
      photographer: "Luke Chesser",
      category: "technology",
      tags: ["analytics", "cloud", "dashboard", "charts"]
    },
    {
      id: "cur-tech-3",
      url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
      thumbnailUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80",
      title: "Cybersecurity & Code Architecture",
      photographer: "Markus Spiske",
      category: "technology",
      tags: ["security", "developer", "server"]
    },
    {
      id: "cur-tech-4",
      url: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1200&q=80",
      thumbnailUrl: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=400&q=80",
      title: "Mobile App UI Design & Smartphone",
      photographer: "Rob Hampson",
      category: "technology",
      tags: ["mobile app", "ui ux", "smartphone"]
    }
  ],
  fashion: [
    {
      id: "cur-fashion-1",
      url: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=80",
      thumbnailUrl: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=400&q=80",
      title: "Bespoke Fashion & Haute Couture Tailoring",
      photographer: "Marcus Loke",
      category: "fashion",
      tags: ["tailoring", "fashion design", "fabrics", "luxury"]
    },
    {
      id: "cur-fashion-2",
      url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80",
      thumbnailUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=400&q=80",
      title: "Luxury Apparel & Gold Elegance",
      photographer: "Burgess Milner",
      category: "fashion",
      tags: ["luxury", "clothing", "model", "style"]
    },
    {
      id: "cur-fashion-3",
      url: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=80",
      thumbnailUrl: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=400&q=80",
      title: "Modern African Urban Fashion",
      photographer: "Clem Onojeghuo",
      category: "fashion",
      tags: ["african fashion", "native", "styling", "vibrant"]
    }
  ],
  creative: [
    {
      id: "cur-creative-1",
      url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
      thumbnailUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80",
      title: "Creative Studio & Brand Strategy Desk",
      photographer: "Lorenzo Herrera",
      category: "creative",
      tags: ["branding", "graphic design", "creative studio"]
    },
    {
      id: "cur-creative-2",
      url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
      thumbnailUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80",
      title: "Professional Camera & Video Shoot",
      photographer: "Alexander Dummer",
      category: "creative",
      tags: ["photography", "videography", "camera", "media"]
    }
  ],
  food: [
    {
      id: "cur-food-1",
      url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
      thumbnailUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80",
      title: "Gourmet Catering & Dining Experience",
      photographer: "Jay Wennington",
      category: "food",
      tags: ["restaurant", "catering", "gourmet", "chef"]
    },
    {
      id: "cur-food-2",
      url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
      thumbnailUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80",
      title: "Artisanal Cuisine & Fresh Feast",
      photographer: "Lily Banse",
      category: "food",
      tags: ["culinary", "dishes", "party food", "drinks"]
    }
  ],
  corporate: [
    {
      id: "cur-corp-1",
      url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
      thumbnailUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80",
      title: "Modern Architectural Tower & Real Estate",
      photographer: "Sam Valadi",
      category: "corporate",
      tags: ["real estate", "architecture", "corporate", "building"]
    },
    {
      id: "cur-corp-2",
      url: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=80",
      thumbnailUrl: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=400&q=80",
      title: "Executive Business Team Strategy",
      photographer: "LinkedIn Sales Solutions",
      category: "corporate",
      tags: ["consulting", "team", "meeting", "legal", "finance"]
    }
  ],
  solar_energy: [
    {
      id: "cur-solar-1",
      url: "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80",
      thumbnailUrl: "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=400&q=80",
      title: "Solar Panels & Clean Energy Inverter Installation",
      photographer: "American Public Power Association",
      category: "solar_energy",
      tags: ["solar", "inverter", "clean energy", "installation"]
    }
  ],
  logistics: [
    {
      id: "cur-log-1",
      url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
      thumbnailUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80",
      title: "Modern Express Logistics & Warehouse Supply",
      photographer: "Petre Petrov",
      category: "logistics",
      tags: ["logistics", "dispatch", "delivery", "shipping"]
    }
  ]
};

export async function searchPexelsServiceGraphics(query: string, categoryHint: string = "general"): Promise<StockGraphicItem[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return getFallbackGraphicsForCategory(categoryHint);

  // 1. Try Supabase Edge function
  try {
    const { data, error } = await supabase.functions.invoke("sales-page-pexels", {
      body: { query: cleanQuery }
    });

    if (!error && data?.photos && Array.isArray(data.photos) && data.photos.length > 0) {
      return data.photos.map((p: any) => ({
        id: p.id,
        url: p.url,
        thumbnailUrl: p.url,
        title: `${cleanQuery} visual`,
        photographer: p.photographer || "Pexels Contributor",
        sourceUrl: p.source || "https://www.pexels.com",
        tags: [cleanQuery.toLowerCase()]
      }));
    }
  } catch (err) {
    console.warn("Pexels Edge function call error, trying direct Pexels API:", err);
  }

  // 2. Try Direct Pexels API if API Key is available in import.meta.env
  const pexelsKey = (import.meta as any).env?.VITE_PEXELS_API_KEY;
  if (pexelsKey) {
    try {
      const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(cleanQuery)}&per_page=12&orientation=landscape`, {
        headers: { Authorization: pexelsKey }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.photos && json.photos.length > 0) {
          return json.photos.map((p: any) => ({
            id: p.id,
            url: p.src.large2x || p.src.large || p.src.medium,
            thumbnailUrl: p.src.medium || p.src.small,
            title: p.alt || `${cleanQuery} photo`,
            photographer: p.photographer || "Pexels Contributor",
            sourceUrl: p.url,
            tags: [cleanQuery.toLowerCase()]
          }));
        }
      }
    } catch (err) {
      console.warn("Direct Pexels search failed:", err);
    }
  }

  // 3. Smart Keyword Matching in Curated Library
  return getFallbackGraphicsForCategory(categoryHint, cleanQuery);
}

export function getFallbackGraphicsForCategory(categoryHint: string = "general", searchTerm?: string): StockGraphicItem[] {
  const cat = categoryHint.toLowerCase();
  let pool: StockGraphicItem[] = [];

  if (cat.includes("tech") || cat.includes("software") || cat.includes("code") || cat.includes("app") || cat.includes("it")) {
    pool = [...CURATED_SERVICE_GRAPHICS.technology];
  } else if (cat.includes("fashion") || cat.includes("cloth") || cat.includes("tailor") || cat.includes("wear")) {
    pool = [...CURATED_SERVICE_GRAPHICS.fashion];
  } else if (cat.includes("creative") || cat.includes("photo") || cat.includes("video") || cat.includes("design") || cat.includes("media")) {
    pool = [...CURATED_SERVICE_GRAPHICS.creative];
  } else if (cat.includes("food") || cat.includes("cater") || cat.includes("cake") || cat.includes("bakery") || cat.includes("restaurant")) {
    pool = [...CURATED_SERVICE_GRAPHICS.food];
  } else if (cat.includes("solar") || cat.includes("energy") || cat.includes("inverter")) {
    pool = [...CURATED_SERVICE_GRAPHICS.solar_energy];
  } else if (cat.includes("logist") || cat.includes("deliver") || cat.includes("dispatch") || cat.includes("haulage")) {
    pool = [...CURATED_SERVICE_GRAPHICS.logistics];
  } else {
    pool = [
      ...CURATED_SERVICE_GRAPHICS.corporate,
      ...CURATED_SERVICE_GRAPHICS.technology,
      ...CURATED_SERVICE_GRAPHICS.creative
    ];
  }

  // If search term provided, filter or reorder pool
  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    const matched = pool.filter(item => 
      item.title.toLowerCase().includes(term) || 
      item.tags?.some(t => t.toLowerCase().includes(term))
    );
    if (matched.length > 0) return matched;
  }

  return pool;
}
