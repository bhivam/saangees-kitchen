import { authClient } from "@/lib/auth-client";

export function useAuth() {
  const { data: betterAuthSession, isPending } = authClient.useSession();

  const user = betterAuthSession?.user || null;
  const session = betterAuthSession?.session || null;

  return {
    user,
    session,
    isPending,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    isCustomer: user?.role !== "admin",
    isProfileIncomplete: !!user && /^User \d{4}$/.test(user.name),
  };
}

