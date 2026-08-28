import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import Breadcrumbs from "@/components/Breadcrumbs";
import UnifiedProductManager from "@/components/directory/UnifiedProductManager";
import { Loader2 } from "lucide-react";

export default function SellerProducts() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login?redirect=/dashboard/products");
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
        <title>Product Inventory &amp; Sales Management | Bethelincovibe</title>
        <meta
          name="description"
          content="Manage your marketplace inventory, edit product details with AI, boost products, and track real-time sales."
        />
      </Helmet>

      <div className="container mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        <div className="overflow-x-auto pb-1">
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Products & Inventory" },
            ]}
          />
        </div>

        <UnifiedProductManager
          defaultTab="manage"
          title="Product Inventory &amp; Sales"
          description="Manage your inventory, edit listings with AI copywriting, view buyer traffic, and boost visibility across the marketplace."
        />
      </div>
    </div>
  );
}
