const STYLE_ID = "bethelincovibe-gallery-lightbox-styles";
const ROOT_ID = "bethelincovibe-gallery-lightbox";

let installed = false;
let items: Array<{ src: string; caption: string }> = [];
let index = 0;

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID}{position:fixed;inset:0;z-index:99999;display:none;background:rgba(5,8,18,.94);backdrop-filter:blur(14px);align-items:center;justify-content:center;padding:18px;touch-action:none}
    #${ROOT_ID}.is-open{display:flex}
    #${ROOT_ID} .bicv-shell{position:relative;width:min(1100px,100%);height:min(92vh,860px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}
    #${ROOT_ID} .bicv-image-wrap{position:relative;width:100%;height:calc(100% - 58px);display:flex;align-items:center;justify-content:center}
    #${ROOT_ID} img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;border-radius:18px;box-shadow:0 25px 80px rgba(0,0,0,.55)}
    #${ROOT_ID} .bicv-top{position:absolute;top:0;left:0;right:0;z-index:20;display:flex;align-items:center;justify-content:space-between;pointer-events:none}
    #${ROOT_ID} .bicv-brand{pointer-events:auto;display:flex;align-items:center;gap:8px;color:#fff;font:700 12px/1 system-ui,sans-serif;background:rgba(15,23,42,.72);border:1px solid rgba(255,255,255,.14);padding:9px 12px;border-radius:999px;box-shadow:0 8px 30px rgba(0,0,0,.2)}
    #${ROOT_ID} .bicv-brand-dot{width:9px;height:9px;border-radius:50%;background:linear-gradient(135deg,#e67e22,#8b5cf6);box-shadow:0 0 14px rgba(230,126,34,.65)}
    #${ROOT_ID} button{border:0;cursor:pointer;color:#fff;background:rgba(15,23,42,.88);border:1px solid rgba(255,255,255,.18);width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font:700 22px/1 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.25);touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    #${ROOT_ID} button:hover{background:rgba(255,255,255,.16)}
    #${ROOT_ID} .bicv-close{pointer-events:auto;position:relative;z-index:21}
    #${ROOT_ID} .bicv-nav{position:absolute;top:50%;transform:translateY(-50%);z-index:2}
    #${ROOT_ID} .bicv-prev{left:10px}.bicv-next{right:10px}
    #${ROOT_ID} .bicv-caption{width:100%;min-height:34px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.9);font:600 13px/1.35 system-ui,sans-serif;text-align:center;padding:0 54px}
    #${ROOT_ID} .bicv-count{color:rgba(255,255,255,.58);font-weight:500;margin-left:8px}
    @media (max-width:640px){#${ROOT_ID}{padding:10px}#${ROOT_ID} .bicv-shell{height:94vh}#${ROOT_ID} .bicv-image-wrap{height:calc(100% - 52px)}#${ROOT_ID} img{border-radius:12px}#${ROOT_ID} .bicv-nav{width:38px;height:38px}.bicv-prev{left:2px}.bicv-next{right:2px}#${ROOT_ID} .bicv-caption{font-size:12px;padding:0 42px}}
  `;
  document.head.appendChild(style);
}

function ensureRoot() {
  let root = document.getElementById(ROOT_ID);
  if (root) return root;
  root = document.createElement("div");
  root.id = ROOT_ID;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Bethelincovibe TV business gallery");
  root.innerHTML = `
    <div class="bicv-shell">
      <div class="bicv-top">
        <div class="bicv-brand"><span class="bicv-brand-dot"></span>Bethelincovibe TV <span style="opacity:.6">· Gallery</span></div>
        <button class="bicv-close" type="button" aria-label="Close photo viewer">×</button>
      </div>
      <div class="bicv-image-wrap">
        <button class="bicv-nav bicv-prev" type="button" aria-label="Previous photo">‹</button>
        <img alt="Business gallery photo" />
        <button class="bicv-nav bicv-next" type="button" aria-label="Next photo">›</button>
      </div>
      <div class="bicv-caption"><span class="bicv-caption-text"></span><span class="bicv-count"></span></div>
    </div>`;
  document.body.appendChild(root);

  root.querySelector(".bicv-close")?.addEventListener("click", closeViewer);
  root.querySelector(".bicv-close")?.addEventListener("pointerup", closeViewer);
  root.querySelector(".bicv-prev")?.addEventListener("click", () => show(index - 1));
  root.querySelector(".bicv-next")?.addEventListener("click", () => show(index + 1));
  root.addEventListener("click", (event) => {
    if (event.target === root) closeViewer();
  });
  return root;
}

function show(nextIndex: number) {
  if (!items.length) return;
  index = (nextIndex + items.length) % items.length;
  const root = ensureRoot();
  const item = items[index];
  const img = root.querySelector("img") as HTMLImageElement | null;
  const caption = root.querySelector(".bicv-caption-text") as HTMLElement | null;
  const count = root.querySelector(".bicv-count") as HTMLElement | null;
  if (img) {
    img.src = item.src;
    img.alt = item.caption || "Business gallery photo";
  }
  if (caption) caption.textContent = item.caption || "Business gallery photo";
  if (count) count.textContent = items.length > 1 ? `${index + 1} / ${items.length}` : "";
  root.classList.add("is-open");
  document.body.style.overflow = "hidden";
}

function closeViewer() {
  const root = document.getElementById(ROOT_ID);
  root?.classList.remove("is-open");
  document.body.style.overflow = "";
}

function isGalleryAnchor(anchor: HTMLAnchorElement) {
  if (!/^\/businesses\/[^/]+$/.test(window.location.pathname)) return false;

  // A gallery trigger must be an actual image link. This deliberately avoids
  // broad ancestor-text matching, which could accidentally classify normal
  // navigation links (Home, Businesses, Back to Directory) as gallery links.
  const image = anchor.querySelector("img") as HTMLImageElement | null;
  if (!image) return false;

  const href = anchor.href?.trim();
  const imageSrc = (image.currentSrc || image.src || "").trim();
  if (!href || !imageSrc || href === window.location.href) return false;
  if (/^(?:#|javascript:|data:|about:|undefined|null)$/i.test(href)) return false;

  return href === imageSrc;
}

function collectGallery(anchor: HTMLAnchorElement) {
  const container = anchor.closest("div.grid") || anchor.parentElement;
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLAnchorElement>("a[href]"))
    .filter(isGalleryAnchor)
    .map((a) => ({
      src: a.href,
      caption: a.querySelector("img")?.getAttribute("alt") || "Business gallery photo",
    }))
    .filter((item, i, all) => item.src && all.findIndex((x) => x.src === item.src) === i);
}

function onDocumentClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
  if (!anchor || !isGalleryAnchor(anchor)) return;
  event.preventDefault();
  event.stopPropagation();
  items = collectGallery(anchor);
  const current = items.findIndex((item) => item.src === anchor.href);
  show(current >= 0 ? current : 0);
}

function onKeyDown(event: KeyboardEvent) {
  const root = document.getElementById(ROOT_ID);
  if (!root?.classList.contains("is-open")) return;
  if (event.key === "Escape") closeViewer();
  if (event.key === "ArrowLeft") show(index - 1);
  if (event.key === "ArrowRight") show(index + 1);
}

export function installBusinessGalleryLightbox() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  installStyles();
  ensureRoot();
  document.addEventListener("click", onDocumentClick, true);
  document.addEventListener("keydown", onKeyDown);
}
