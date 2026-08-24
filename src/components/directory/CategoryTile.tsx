import { Link } from "react-router-dom";
import { getCategoryIcon, Category3DVisual, getCategoryTheme } from "@/lib/categoryIcons";
import { getCategoryImage } from "@/lib/categoryImages";

/**
 * Modern app-style category tile with 3D AI visual icon, category photo thumbnail and overlay badge.
 */
export default function CategoryTile({
  name,
  slug,
  count,
  imageUrl,
}: {
  name: string;
  slug: string;
  count?: number;
  imageUrl?: string;
}) {
  const imgSrc = imageUrl || getCategoryImage(slug || name);
  const theme = getCategoryTheme(name);

  return (
    <Link
      to={`/businesses?category=${slug}`}
      aria-label={`${name} businesses`}
      className="group relative flex flex-col items-center justify-end overflow-hidden rounded-2xl text-center aspect-square
                 bg-card border border-border shadow-sm hover:shadow-xl
                 transition-all duration-300 active:scale-[0.96] hover:-translate-y-1"
    >
      {/* Category Image */}
      <img
        src={imgSrc}
        alt={name}
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />

      {/* Dark Gradient Overlay for Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 transition-opacity group-hover:from-black/95" />

      {/* Top Gloss Highlight */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center p-3 w-full">
        <div className="mb-1.5 transition-transform group-hover:scale-110 drop-shadow-lg">
          <Category3DVisual name={name} size="sm" className="!w-9 !h-9 !rounded-xl" />
        </div>
        <span className="text-xs font-bold leading-tight text-white drop-shadow-md line-clamp-2">{name}</span>
        {typeof count === "number" && (
          <span className="text-[10px] font-medium text-white/80 mt-0.5">{count} listed</span>
        )}
      </div>
    </Link>
  );
}

