import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Briefcase } from "lucide-react";

/** Service card with click-to-zoom full-image preview + optional CTA link. */
export default function ServicePreviewDialog({ service }: { service: any }) {
  const title = typeof service === "string" ? service : (service?.title || "Service");
  const image = typeof service === "object" ? (service?.image_url || service?.flyer_creative_url || service?.photo_url || service?.image) : null;
  const desc = typeof service === "object" ? service?.description : null;
  const link = typeof service === "object" ? (service?.link_url || service?.url) : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="group text-left rounded-xl border bg-card overflow-hidden hover:border-primary hover:shadow-md transition active:scale-95">
          {image ? (
            <div className="aspect-video bg-muted overflow-hidden">
              <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" />
            </div>
          ) : (
            <div className="aspect-video bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center">
              <Briefcase className="h-7 w-7 text-primary/70" />
            </div>
          )}
          <div className="p-2.5">
            <p className="font-semibold text-sm truncate">{title}</p>
            {desc && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{desc}</p>}
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {image && (
          <div className="bg-black flex items-center justify-center max-h-[70vh]">
            <img src={image} alt={title} className="max-h-[70vh] w-full object-contain" />
          </div>
        )}
        <div className="p-5 space-y-2">
          <h3 className="text-lg font-bold">{title}</h3>
          {desc && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{desc}</p>}
          {link && (
            <Button asChild className="w-full mt-3">
              <a href={link} target="_blank" rel="noopener">
                <ExternalLink className="h-4 w-4 mr-2" />Visit / Order
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}