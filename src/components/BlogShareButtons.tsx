import { useState } from "react";
import { Share2, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";

interface BlogShareButtonsProps {
  url: string;
  title: string;
  description: string;
  image: string;
}

export default function BlogShareButtons({ url, title, description, image }: BlogShareButtonsProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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
      color: "hover:bg-green-500/10 hover:text-green-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encoded.url}`,
      color: "hover:bg-blue-500/10 hover:text-blue-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: "Twitter",
      href: `https://twitter.com/intent/tweet?text=${encoded.title}&url=${encoded.url}`,
      color: "hover:bg-sky-500/10 hover:text-sky-500",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: "Pinterest",
      href: `https://pinterest.com/pin/create/button/?url=${encoded.url}&media=${encoded.image}&description=${encoded.title}`,
      color: "hover:bg-red-500/10 hover:text-red-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z" />
        </svg>
      ),
    },
  ];

  const handleCopy = async () => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.info("Link: " + url);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-2">
      {open && (
        <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-4 fade-in duration-200">
          {links.map((l) => (
            <a
              key={l.name}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              title={`Share on ${l.name}`}
              className={`rounded-full bg-background border shadow-md p-3 transition-colors ${l.color}`}
            >
              {l.icon}
            </a>
          ))}
          <button
            onClick={handleCopy}
            title="Copy link"
            className="rounded-full bg-background border shadow-md p-3 transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>
      )}
      <Button
        size="icon"
        onClick={() => setOpen(!open)}
        className="h-12 w-12 rounded-full shadow-lg"
      >
        {open ? <X className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
      </Button>
    </div>
  );
}
