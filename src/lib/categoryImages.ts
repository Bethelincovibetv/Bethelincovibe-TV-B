import imgFashion from "@/assets/images/cat_fashion_1787472783551.jpg";
import imgFood from "@/assets/images/cat_food_1787472795354.jpg";
import imgRealEstate from "@/assets/images/cat_realestate_1787472809208.jpg";
import imgTech from "@/assets/images/cat_tech_1787472827051.jpg";
import imgBeauty from "@/assets/images/cat_beauty_1787472844524.jpg";
import imgLogistics from "@/assets/images/cat_logistics_1787472858667.jpg";

/**
 * Category image dictionary.
 * Pairs each business category with custom generated photos & Unsplash high-res imagery.
 */
export const CATEGORY_IMAGE_MAP: Record<string, string> = {
  fashion: imgFashion,
  apparel: imgFashion,
  food: imgFood,
  restaurant: imgFood,
  catering: imgFood,
  realestate: imgRealEstate,
  "real-estate": imgRealEstate,
  property: imgRealEstate,
  tech: imgTech,
  technology: imgTech,
  software: imgTech,
  beauty: imgBeauty,
  salon: imgBeauty,
  spa: imgBeauty,
  logistics: imgLogistics,
  delivery: imgLogistics,
  transport: imgLogistics,

  // Fallback high quality imagery for other categories
  agriculture: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=400&q=80",
  automotive: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=400&q=80",
  construction: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=400&q=80",
  digital: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80",
  education: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=400&q=80",
  events: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=400&q=80",
  finance: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80",
  health: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&q=80",
  hospitality: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80",
  professional: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80",
  retail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=400&q=80",
  travel: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=400&q=80",
};

export function getCategoryImage(categoryNameOrSlug?: string | null): string {
  if (!categoryNameOrSlug) {
    return "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80";
  }

  const key = categoryNameOrSlug.toLowerCase().trim();

  for (const [mapKey, imgUrl] of Object.entries(CATEGORY_IMAGE_MAP)) {
    if (key.includes(mapKey)) {
      return imgUrl;
    }
  }

  return "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80";
}
