import { Link } from "react-router-dom";
import { getCategoryIcon } from "@/lib/categoryIcons";

/**
 * 3D app-style category tile — glossy purple pill with a raised icon plate.
 * Sized for thumb-friendly mobile grids.
 */
export default function CategoryTile({
  name,
  slug,
  count,
}: {
  name: string;
  slug: string;
  count?: number;
}) {
  const Icon = getCategoryIcon(name);
  return (
    <Link
      to={`/businesses/category/${slug}`}
      aria-label={`${name} businesses`}
      className="group relative flex flex-col items-center justify-center gap-2 rounded-[22px] p-3 text-center
                 bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground
                 shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.55)]
                 ring-1 ring-inset ring-white/15
                 transition-transform duration-200 active:scale-[0.96] hover:-translate-y-1"
    >
      {/* top gloss */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[22px] bg-gradient-to-b from-white/25 to-transparent"
      />
      <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.45),0_6px_12px_-6px_hsl(0_0%_0%/0.5)] transition-colors group-hover:bg-white/30">
        <Icon className="h-6 w-6" strokeWidth={1.9} />
      </span>
      <span className="relative text-[11px] sm:text-xs font-semibold leading-tight line-clamp-2">{name}</span>
      {typeof count === "number" && (
        <span className="relative text-[10px] font-medium opacity-80">{count} listed</span>
      )}
    </Link>
  );
}
