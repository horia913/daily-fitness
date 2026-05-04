"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { isCoachRole } from "@/lib/roleGuard";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  allowedRoles?: string[];
}

function roleSatisfiesRequired(userRole: string, required: string): boolean {
  if (required === "coach") return isCoachRole(userRole);
  if (required === "client") return userRole === "client";
  return userRole === required;
}

function redirectToRoleHome(router: ReturnType<typeof useRouter>, userRole: string) {
  if (isCoachRole(userRole)) {
    router.replace("/coach");
  } else if (userRole === "client") {
    router.replace("/client");
  } else {
    router.replace("/");
  }
}

export default function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const needsProfileForRole = Boolean(requiredRole) || Boolean(allowedRoles && allowedRoles.length > 0);
  const allowedRolesKey = allowedRoles?.join("|") ?? "";

  const authorized = useMemo(() => {
    if (!needsProfileForRole || !profile) return true;
    const userRole = profile.role;
    if (requiredRole && !roleSatisfiesRequired(userRole, requiredRole)) {
      return false;
    }
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      return false;
    }
    return true;
  }, [needsProfileForRole, profile, requiredRole, allowedRolesKey, allowedRoles]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (needsProfileForRole && !profile) {
      return;
    }
    if (!needsProfileForRole || !profile) {
      return;
    }

    const userRole = profile.role;

    if (requiredRole && !roleSatisfiesRequired(userRole, requiredRole)) {
      redirectToRoleHome(router, userRole);
      return;
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      redirectToRoleHome(router, userRole);
    }
  }, [user, profile, loading, requiredRole, allowedRolesKey, router, needsProfileForRole]);

  if (loading) {
    return (
      <div className="min-h-screen fc-app-bg flex flex-col items-center justify-center">
        <div className="w-8 h-8 rounded-full animate-spin border-2 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (needsProfileForRole && !profile) {
    return (
      <div className="min-h-screen fc-app-bg flex flex-col items-center justify-center">
        <div className="w-8 h-8 rounded-full animate-spin border-2 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  if (needsProfileForRole && profile && !authorized) {
    return null;
  }

  return <>{children}</>;
}
