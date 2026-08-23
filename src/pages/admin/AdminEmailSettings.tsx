import AdminEmailSettings from "@/components/admin/AdminEmailSettings";
import { Helmet } from "react-helmet-async";

export default function AdminEmailSettingsPage() {
  return (
    <>
      <Helmet>
        <title>Email Failover Matrix | Admin Dashboard</title>
      </Helmet>
      <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-7xl">
        <AdminEmailSettings />
      </div>
    </>
  );
}
