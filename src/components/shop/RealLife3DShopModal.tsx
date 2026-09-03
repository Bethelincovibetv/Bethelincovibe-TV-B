import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Shop3DRealLifeMode from "@/components/shop/Shop3DRealLifeMode";

export interface RealLife3DShopModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business: any;
  products?: any[];
  services?: any[];
}

export default function RealLife3DShopModal({
  open,
  onOpenChange,
  business,
  products = [],
  services = [],
}: RealLife3DShopModalProps) {
  if (!business) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[96vw] p-1 sm:p-2 bg-neutral-950 border border-amber-500/30 text-white rounded-[2rem] overflow-hidden shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{business.name} — 3D Real Life Shop</DialogTitle>
          <DialogDescription>
            Interactive 3D walkthrough of verified retail store and catalog.
          </DialogDescription>
        </DialogHeader>

        <Shop3DRealLifeMode
          business={business}
          products={products}
          services={services}
          isModal={true}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
