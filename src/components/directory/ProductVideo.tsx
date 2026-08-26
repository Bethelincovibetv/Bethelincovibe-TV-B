/** Turns a YouTube / Vimeo / Loom / TikTok URL into a responsive embed. */
export function toEmbedUrl(raw?: string | null): string | null {
  const url = (raw || "").trim();
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");

    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
    }
    if (host.endsWith("youtube.com")) {
      // Shorts
      if (u.pathname.includes("/shorts/")) {
        const id = u.pathname.split("/shorts/")[1]?.split("/")[0]?.split("?")[0];
        return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
      }
      // Live
      if (u.pathname.includes("/live/")) {
        const id = u.pathname.split("/live/")[1]?.split("/")[0]?.split("?")[0];
        return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
      }
      // Embed URL already
      if (u.pathname.includes("/embed/")) {
        const id = u.pathname.split("/embed/")[1]?.split("/")[0]?.split("?")[0];
        return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
      }
      // Standard watch?v=
      const id = u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
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
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-black shadow-md">
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
