import { ItemManager } from "@/components/item-manager";
import { MerchantDashboardSidebar } from "@/components/merchant-dashboard-sidebar";
import { ModifierManager } from "@/components/modifier-manager";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useMerchantNavigation } from "@/hooks/use-merchant-navigation";
import { match } from "ts-pattern";

export function MerchantDashboard() {
  const merchantNavigation = useMerchantNavigation();
  const { location } = merchantNavigation;

  return (
    <SidebarProvider>
      <MerchantDashboardSidebar {...merchantNavigation} />
      {match(location)
        .with("Home", (name) => <div>{name}</div>)
        .with("Item Manager", () => <ItemManager />)
        .with("Modifier Manager", () => <ModifierManager />)
        .with("Menu Editor", (name) => <div>{name}</div>)
        .with("Orders", (name) => <div>{name}</div>)
        .exhaustive()}
    </SidebarProvider>
  );
}

