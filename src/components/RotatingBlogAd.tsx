import React from "react";
import ProgrammaticAdBanner from "@/components/ProgrammaticAdBanner";

/** Native banner from Bethelincovibe ad server. Shown across blog articles and pages. */
export default function RotatingBlogAd({ placement = "blog" }: { placement?: string }) {
  return <ProgrammaticAdBanner placement={placement} format="banner" className="my-6" />;
}
