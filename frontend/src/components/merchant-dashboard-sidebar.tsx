import { Link } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Home, Menu, Sheet, SlidersHorizontal, Clipboard } from "lucide-react";

const dashboardNavItems = [
  { name: "Home", icon: Home, to: "/dashboard/home" },
  { name: "Item Manager", icon: Clipboard, to: "/dashboard/items" },
  { name: "Modifier Manager", icon: SlidersHorizontal, to: "/dashboard/modifiers" },
  { name: "Menu Editor", icon: Menu, to: "/dashboard/menu" },
  { name: "Orders", icon: Sheet, to: "/dashboard/orders" },
] as const;

export function MerchantDashboardSidebar({ className }: { className?: string }) {
  return (
    <Sidebar className={className}>
      <SidebarHeader>
        <h2 className="text-2xl">Saangee's Kitchen</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {dashboardNavItems.map(({ name, icon: Icon, to }) => (
            <SidebarMenuItem key={name}>
              <SidebarMenuButton asChild>
                <Link
                  to={to}
                  activeProps={{ className: "bg-sidebar-accent" }}
                >
                  <Icon />
                  <p>{name}</p>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
