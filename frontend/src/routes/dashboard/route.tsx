import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MerchantDashboardSidebar } from "@/components/merchant-dashboard-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <AuthGuard requireAdmin>
      <SidebarProvider>
        <MerchantDashboardSidebar />
        <Outlet />
      </SidebarProvider>
    </AuthGuard>
  );
}
