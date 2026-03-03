import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const [roleLoading, setRoleLoading] = useState(!!requiredRole);
  const [hasRole, setHasRole] = useState(false);

  useEffect(() => {
    if (!requiredRole || !user) {
      setRoleLoading(false);
      return;
    }

    const checkRole = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", requiredRole)
        .maybeSingle();

      setHasRole(!!data);
      setRoleLoading(false);
    };

    checkRole();
  }, [user, requiredRole]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && !hasRole) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
