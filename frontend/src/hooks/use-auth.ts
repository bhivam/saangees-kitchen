import { authClient } from "@/lib/auth-client";

export function useAuth() {
  const { data: betterAuthSession, isPending } = authClient.useSession();

  const user = betterAuthSession?.user || null;
  const session = betterAuthSession?.session || null;

  return {
    user,
    session,
    isLoading: isPending,
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin,
    isCustomer: !user?.isAdmin,
  };
}

