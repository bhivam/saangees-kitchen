import { ItemManager } from "@/components/item-manager";
import { MerchantDashboardSidebar } from "@/components/merchant-dashboard-sidebar";
import { ModifierManager } from "@/components/modifier-manager";
import { MenuEditor } from "@/components/menu-editor";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useMerchantNavigation } from "@/hooks/use-merchant-navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { match } from "ts-pattern";

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  component: MerchantDashboard,
});

function MerchantDashboard() {
  const merchantNavigation = useMerchantNavigation();
  const { location } = merchantNavigation;

  return (
    <AuthGuard requireAdmin>
      <SidebarProvider>
        <MerchantDashboardSidebar {...merchantNavigation} />
        {match(location)
          .with("Home", (name) => <div>{name}</div>)
          .with("Item Manager", () => <ItemManager />)
          .with("Modifier Manager", () => <ModifierManager />)
          .with("Menu Editor", () => <MenuEditor />)
          .with("Orders", (name) => <div>{name}</div>)
          .exhaustive()}
      </SidebarProvider>
    </AuthGuard>
  );
}

