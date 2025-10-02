import { ItemManager } from "@/components/item-manager";
import { MerchantHomeSidebar } from "@/components/merchant-home-sidebar";
import { ModifierManager } from "@/components/modifier-manager";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useMerchantNavigation } from "@/hooks/use-merchant-navigation";
import { match } from "ts-pattern";

export function MerchantHome() {
  const merchantNavigation = useMerchantNavigation();
  const { location } = merchantNavigation;

  return (
    <SidebarProvider>
      <MerchantHomeSidebar {...merchantNavigation} />
      {match(location)
        .with("Home", (name) => <div>{name}</div>)
        .with("Item Manager", () => <ItemManager />)
        .with("Modifier Manager", () => <ModifierManager />)
        .with("Orders", (name) => <div>{name}</div>)
        .exhaustive()}
    </SidebarProvider>
  );
}

