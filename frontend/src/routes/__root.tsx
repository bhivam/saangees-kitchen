import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useAuth } from "@/hooks/use-auth";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const RootLayout = () => {
  const { isAuthenticated, user } = useAuth();

  const handleLogout = async () => {
    try {
      const response = await authClient.signOut();

      if (response.error) {
        toast.error("Logout failed");
        console.log(response.error);
        return;
      }

      toast.success("Logged out successfully");
      window.location.href = "/";
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  return (
    <>
      {isAuthenticated && (
        <div className="fixed top-4 right-4 z-50 flex gap-2 items-center bg-white px-3 py-2 rounded-lg shadow-md">
          <span className="text-sm text-gray-600">
            {user?.phoneNumber} ({user?.role})
          </span>
          <Button onClick={handleLogout} variant="outline" size="sm">
            Logout
          </Button>
        </div>
      )}
      <Outlet />
      <TanStackRouterDevtools />
    </>
  );
};

export const Route = createRootRoute({ component: RootLayout });

