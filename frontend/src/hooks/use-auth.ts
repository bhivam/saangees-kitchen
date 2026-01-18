import { authClient } from "@/lib/auth-client";
import { isProfileIncomplete } from "@/lib/auth-utils";

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
    isProfileIncomplete: isProfileIncomplete(user),
  };
}

