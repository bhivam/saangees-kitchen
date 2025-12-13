import { useAuth } from "@/hooks/use-auth";
import { Navigate } from "@tanstack/react-router";
import { type ReactNode } from "react";

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  requireAuth = true,
  requireAdmin = false,
  redirectTo = "/login"
}: AuthGuardProps) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} />;
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">You need admin privileges to access this page.</p>
          <p className="mt-4 text-sm text-gray-500">
            <a href="/" className="text-blue-600 hover:underline">Go to home</a>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
