import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import NotificationSettings from "@/components/dashboard/NotificationSettings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function UserNotificationSettingsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 space-y-6">
      <Helmet>
        <title>Push Notification Settings | Bethelincovibe TV</title>
      </Helmet>

      <Button asChild variant="ghost" size="sm">
        <Link to="/dashboard">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
      </Button>

      <NotificationSettings />
    </div>
  );
}
