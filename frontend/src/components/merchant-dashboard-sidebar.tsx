import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  merchantDashboardNavData,
  type useMerchantNavigation,
} from "@/hooks/use-merchant-navigation";

export function MerchantDashboardSidebar({
  className,
  location,
  setLocation,
}: { className?: string } & ReturnType<typeof useMerchantNavigation>) {
  return (
    <Sidebar className={className}>
      <SidebarHeader>
        <h2 className="text-2xl">Saangee's Kitchen</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {merchantDashboardNavData.map(({ name, icon: Icon }) => (
            <SidebarMenuItem>
              <SidebarMenuButton
                className={location === name ? "bg-sidebar-accent" : ""}
                onClick={() => setLocation(name)}
              >
                <Icon /> <p>{name}</p>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}

