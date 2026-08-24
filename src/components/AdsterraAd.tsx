/**
 * AdsterraAd - Blocked and disabled
 */
type Slot =
  | "blog_top"
  | "blog_bottom"
  | "home_top"
  | "home_bottom"
  | "directory"
  | "forum"
  | "sales_directory"
  | "learn";

export default function AdsterraAd({
  slot: _slot = "blog_top",
  className: _className = "",
  height: _height = 280,
}: {
  slot?: Slot;
  className?: string;
  height?: number;
}) {
  // Completely blocked as requested
  return null;
}
