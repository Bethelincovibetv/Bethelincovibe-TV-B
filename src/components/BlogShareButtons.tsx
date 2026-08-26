import { useState, useRef, useEffect, useCallback } from "react";
import {
  Share2,
  X,
  Copy,
  Check,
  GripVertical,
  Linkedin,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";

interface BlogShareButtonsProps {
  url: string;
  title: string;
  description: string;
  image: string;
}

export default function BlogShareButtons({
  url,
  title,
  description,
  image,
}: BlogShareButtonsProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);

  // Position state (in pixels from top-left)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const buttonRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startPointerRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  const dragDistanceRef = useRef(0);

  // Set initial floating position (bottom-right with comfortable offset)
  useEffect(() => {
    const updateInitialPosition = () => {
      const saved = sessionStorage.getItem("blog_share_btn_pos");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (
            typeof parsed.x === "number" &&
            typeof parsed.y === "number" &&
            parsed.x < window.innerWidth &&
            parsed.y < window.innerHeight
          ) {
            setPosition(parsed);
            return;
          }
        } catch {
          // ignore error
        }
      }
      const initialX = Math.max(16, window.innerWidth - 76);
      const initialY = Math.max(80, window.innerHeight - 96);
      setPosition({ x: initialX, y: initialY });
    };

    updateInitialPosition();
    window.addEventListener("resize", updateInitialPosition);
    return () => window.removeEventListener("resize", updateInitialPosition);
  }, []);

  const encoded = {
    url: encodeURIComponent(url),
    title: encodeURIComponent(title),
    desc: encodeURIComponent(description),
    image: encodeURIComponent(image),
  };

  const links = [
    {
      name: "WhatsApp",
      href: `https://wa.me/?text=${encoded.title}%20${encoded.url}`,
      color: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border-emerald-500/30",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encoded.url}`,
      color: "bg-blue-500/10 text-blue-600 hover:bg-blue-600 hover:text-white border-blue-500/30",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: "X (Twitter)",
      href: `https://twitter.com/intent/tweet?text=${encoded.title}&url=${encoded.url}`,
      color: "bg-slate-500/10 text-slate-700 dark:text-slate-300 hover:bg-foreground hover:text-background border-slate-500/30",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded.url}`,
      color: "bg-sky-500/10 text-sky-600 hover:bg-sky-600 hover:text-white border-sky-500/30",
      icon: <Linkedin className="h-4 w-4" />,
    },
    {
      name: "Pinterest",
      href: `https://pinterest.com/pin/create/button/?url=${encoded.url}&media=${encoded.image}&description=${encoded.title}`,
      color: "bg-red-500/10 text-red-600 hover:bg-red-600 hover:text-white border-red-500/30",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z" />
        </svg>
      ),
    },
  ];

  const handleCopy = async () => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      toast.success("Post link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.info("Post link: " + url);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url,
        });
        toast.success("Shared successfully!");
      } catch (err) {
        // User cancelled or share failed
      }
    }
  };

  // Pointer drag logic
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!position) return;
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    startPointerRef.current = { x: e.clientX, y: e.clientY };
    startPosRef.current = { x: position.x, y: position.y };

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - startPointerRef.current.x;
    const deltaY = e.clientY - startPointerRef.current.y;
    const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    dragDistanceRef.current = dist;

    if (dist > 4) {
      setHasMoved(true);
    }

    const btnWidth = 56;
    const btnHeight = 56;
    const maxX = Math.max(16, window.innerWidth - btnWidth - 12);
    const maxY = Math.max(70, window.innerHeight - btnHeight - 16);

    const nextX = Math.min(Math.max(12, startPosRef.current.x + deltaX), maxX);
    const nextY = Math.min(Math.max(64, startPosRef.current.y + deltaY), maxY);

    setPosition({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

    // Save user's preferred position
    if (position) {
      try {
        sessionStorage.setItem("blog_share_btn_pos", JSON.stringify(position));
      } catch {
        // ignore error
      }
    }

    // If movement was small, treat as a toggle click
    if (dragDistanceRef.current < 6) {
      setOpen((prev) => !prev);
    }
  };

  if (!position) return null;

  // Determine which quadrant the button is in to position the popup bubble smartly
  const isNearBottom = position.y > window.innerHeight / 2;
  const isNearRight = position.x > window.innerWidth / 2;

  return (
    <div
      ref={buttonRef}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 60,
        touchAction: "none",
      }}
      className="group select-none"
    >
      {/* Floating Share Menu Popout */}
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: isNearBottom ? "64px" : "auto",
            top: !isNearBottom ? "64px" : "auto",
            right: isNearRight ? "0" : "auto",
            left: !isNearRight ? "0" : "auto",
          }}
          className="w-64 p-3.5 bg-card/95 backdrop-blur-md rounded-2xl border border-border/90 shadow-2xl animate-in zoom-in-95 fade-in duration-150 flex flex-col gap-2.5 z-50 text-card-foreground"
        >
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Share2 className="h-3.5 w-3.5 text-primary" />
              <span>Share Article</span>
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">
              Draggable
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {links.map((l) => (
              <a
                key={l.name}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                title={`Share on ${l.name}`}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold gap-1 transition-transform active:scale-95 no-underline ${l.color}`}
              >
                {l.icon}
                <span className="text-[10px] truncate max-w-full">{l.name.split(" ")[0]}</span>
              </a>
            ))}
            <button
              onClick={handleCopy}
              title="Copy Link"
              className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-border bg-muted/50 hover:bg-muted text-foreground text-xs font-bold gap-1 transition-transform active:scale-95"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600 animate-bounce" />
              ) : (
                <Copy className="h-4 w-4 text-foreground" />
              )}
              <span className="text-[10px]">{copied ? "Copied!" : "Copy"}</span>
            </button>
          </div>

          {typeof navigator !== "undefined" && "share" in navigator && (
            <Button
              onClick={handleNativeShare}
              variant="outline"
              size="sm"
              className="w-full text-xs font-bold rounded-xl h-8 gap-1.5"
            >
              <Send className="h-3.5 w-3.5 text-primary" /> More Sharing Options
            </Button>
          )}

          <p className="text-[10px] text-center text-muted-foreground pt-1">
            💡 Hold &amp; drag this button anywhere on screen
          </p>
        </div>
      )}

      {/* Floating Draggable Handle & Trigger Button */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        {/* Glow backdrop ring */}
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 opacity-70 blur-xs animate-pulse pointer-events-none" />

        <button
          type="button"
          aria-label="Share article (Drag to move)"
          className={`relative h-13 w-13 rounded-full flex items-center justify-center shadow-xl text-primary-foreground font-black border-2 border-white/30 transition-all duration-200 ${
            open
              ? "bg-foreground text-background scale-95 ring-4 ring-primary/30"
              : "bg-gradient-to-tr from-purple-700 via-primary to-pink-600 hover:scale-105"
          }`}
        >
          {open ? (
            <X className="h-6 w-6 stroke-[2.5]" />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <Share2 className="h-5 w-5 stroke-[2.5]" />
              <GripVertical className="h-2.5 w-2.5 opacity-60 -mt-0.5" />
            </div>
          )}
        </button>

        {/* Small drag hint badge on hover when not opened */}
        {!open && (
          <span className="pointer-events-none absolute -top-6 whitespace-nowrap rounded-full bg-foreground/90 px-2 py-0.5 text-[9px] font-bold text-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
            Drag to move
          </span>
        )}
      </div>
    </div>
  );
}
