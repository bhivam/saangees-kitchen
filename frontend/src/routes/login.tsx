import { createFileRoute, Navigate } from "@tanstack/react-router";
import { LoginForm } from "@/components/auth/login-form";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  // If already logged in, redirect based on role
  if (!isLoading && isAuthenticated) {
    if (isAdmin) {
      return <Navigate to="/dashboard" />;
    }
    return <Navigate to="/" />;
  }

  return <LoginForm />;
}
