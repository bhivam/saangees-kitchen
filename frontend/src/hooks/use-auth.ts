import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc";

export function useAuth() {
  const { data: betterAuthSession, isPending } = authClient.useSession();

  // Try to get tRPC session if auth router exists
  // @ts-ignore - auth router may not exist in types yet
  const trpcSessionQuery = useTRPC.auth?.getSession?.useQuery?.();
  const trpcSession = trpcSessionQuery?.data;

  // Prefer tRPC session as it has the role information
  const user = trpcSession?.user || betterAuthSession?.user || null;
  const session = trpcSession?.session || betterAuthSession?.session || null;

  return {
    user,
    session,
    isLoading: isPending,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isCustomer: user?.role === 'customer',
  };
}
