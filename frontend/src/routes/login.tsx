import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginForm } from "@/components/auth/login-form";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  component: Login,
  async beforeLoad() {
    const { data, error } = await authClient.getSession();
    if (error)
      throw new Error(`Failed to get user session data: ${error.message}`);

    if (!data) return;

    const {
      user: { isAnonymous, role },
    } = data;

    if (isAnonymous) return;

    throw redirect({ to: role === "admin" ? "/dashboard" : "/" });
  },
});

function Login() {
  return <LoginForm />;
}

