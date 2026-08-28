import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import Breadcrumbs from "@/components/Breadcrumbs";
import UnifiedProductManager from "@/components/directory/UnifiedProductManager";
import { Loader2 } from "lucide-react";

export default function ListProduct() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login?redirect=/products/list");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <Helmet>
        <title>List &amp; Sell Products | Bethelincovibe Marketplace</title>
        <meta
          name="description"
          content="List your physical merchandise or instant digital download products on Bethelincovibe with AI copywriting assistance and direct buyer checkout."
        />
      </Helmet>

      <div className="container mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        <div className="overflow-x-auto pb-1">
          <Breadcrumbs
            items={[
              { label: "Marketplace", href: "/products" },
              { label: "List a Product" },
            ]}
          />
        </div>

        <UnifiedProductManager
          defaultTab="create"
          title="Create &amp; Manage Marketplace Products"
          description="Use our unified AI product creator for physical goods and instant digital downloads. Automatically connect with buyers across Lagos & Nigeria."
        />
      </div>
    </div>
  );
}
