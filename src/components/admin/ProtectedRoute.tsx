import { Navigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock } from "lucide-react";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, adminUser, loading, user } = useAdminAuth();
  const [pendingCheck, setPendingCheck] = useState(true);
  const [isPendingOrganizer, setIsPendingOrganizer] = useState(false);

  useEffect(() => {
    const checkPending = async () => {
      if (!user || adminUser) {
        setPendingCheck(false);
        return;
      }
      // User is authenticated but has no admin_users record — check if they have a pending application
      const { data } = await supabase
        .from("organizer_applications")
        .select("status")
        .eq("auth_id", user.id)
        .eq("status", "pending")
        .limit(1);

      setIsPendingOrganizer(!!data && data.length > 0);
      setPendingCheck(false);
    };
    if (!loading) checkPending();
  }, [user, adminUser, loading]);

  if (loading || pendingCheck) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!adminUser && isPendingOrganizer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <Clock className="h-12 w-12 text-yellow-500 mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">طلبك قيد المراجعة</h2>
          <p className="text-muted-foreground">
            تم استلام طلبك للانضمام كمنظم وهو الآن قيد المراجعة من قبل فريقنا. ستتلقى إشعاراً عند قبول الطلب.
          </p>
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground">You do not have admin access.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;