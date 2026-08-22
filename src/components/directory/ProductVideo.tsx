/** Turns a YouTube / Vimeo / Loom / TikTok URL into a responsive embed. */
export function toEmbedUrl(raw?: string | null): string | null {
  const url = (raw || "").trim();
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (host.endsWith("youtube.com")) {
      const id = u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host.endsWith("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (host.endsWith("loom.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://www.loom.com/embed/${id}` : null;
    }
    if (host.endsWith("tiktok.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id && /^\d+$/.test(id) ? `https://www.tiktok.com/embed/v2/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export default function ProductVideo({ url, title = "Product video" }: { url?: string | null; title?: string }) {
  const embed = toEmbedUrl(url);
  if (!embed) return null;
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border bg-black">
      <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
        <iframe
          src={embed}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  );
}
