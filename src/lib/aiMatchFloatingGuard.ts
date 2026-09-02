const STORAGE_KEY = "bicv-ai-match-position";
let installed = false;

function isBusinessListing(pathname: string) {
  return (
    /^\/businesses\/(?!list$|category\/)[^/]+$/.test(pathname) ||
    /^\/directory\/(?!category\/)[^/]+$/.test(pathname) ||
    /^\/suppliers\/(?!category\/|submit$)[^/]+$/.test(pathname)
  );
}

function loadPosition(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) return parsed;
  } catch {}
  return null;
}

function savePosition(x: number, y: number) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y })); } catch {}
}

function clampPosition(el: HTMLElement, x: number, y: number) {
  const margin = 8;
  return {
    x: Math.max(margin, Math.min(x, window.innerWidth - el.offsetWidth - margin)),
    y: Math.max(margin, Math.min(y, window.innerHeight - el.offsetHeight - margin)),
  };
}

function resetTransform(el: HTMLElement) {
  el.style.transform = "";
  el.removeAttribute("data-bicv-dragged");
}

function setupDraggable(el: HTMLElement) {
  if (el.dataset.bicvDragReady === "true") return;
  el.dataset.bicvDragReady = "true";
  el.style.touchAction = "none";
  el.style.userSelect = "none";

  const saved = loadPosition();
  if (saved) {
    const p = clampPosition(el, saved.x, saved.y);
    const rect = el.getBoundingClientRect();
    el.style.transform = `translate(${p.x - rect.left}px, ${p.y - rect.top}px)`;
    el.dataset.bicvDragged = "true";
  }

  let startX = 0, startY = 0, baseX = 0, baseY = 0, moved = false;

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || (event.target as HTMLElement)?.closest("button,a,input,textarea,select")) return;
    const rect = el.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    baseX = rect.left;
    baseY = rect.top;
    moved = false;
    try { el.setPointerCapture(event.pointerId); } catch {}
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!el.hasPointerCapture?.(event.pointerId)) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!moved && Math.hypot(dx, dy) < 6) return;
    moved = true;
    const p = clampPosition(el, baseX + dx, baseY + dy);
    const rect = el.getBoundingClientRect();
    const currentLeft = rect.left;
    const currentTop = rect.top;
    el.style.transform = `translate(${p.x - currentLeft}px, ${p.y - currentTop}px)`;
    el.dataset.bicvDragged = "true";
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!el.hasPointerCapture?.(event.pointerId)) return;
    try { el.releasePointerCapture(event.pointerId); } catch {}
    if (moved) {
      const rect = el.getBoundingClientRect();
      const p = clampPosition(el, rect.left, rect.top);
      savePosition(p.x, p.y);
      event.stopPropagation();
    }
  };

  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointercancel", onPointerUp);

  window.addEventListener("resize", () => {
    const rect = el.getBoundingClientRect();
    const p = clampPosition(el, rect.left, rect.top);
    if (rect.left !== p.x || rect.top !== p.y) {
      const current = el.getBoundingClientRect();
      el.style.transform = `translate(${p.x - current.left}px, ${p.y - current.top}px)`;
      savePosition(p.x, p.y);
    }
  });
}

function sync() {
  const assistants = Array.from(document.querySelectorAll<HTMLElement>('aside[aria-label="AI Business Match Assistant"]'));
  for (const el of assistants) {
    if (isBusinessListing(window.location.pathname)) {
      el.style.display = "none";
      el.setAttribute("aria-hidden", "true");
      continue;
    }
    el.style.display = "block";
    el.removeAttribute("aria-hidden");
    setupDraggable(el);
  }
}

export function installAIMatchFloatingGuard() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  sync();
  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("popstate", sync);
  window.addEventListener("resize", sync);
}
