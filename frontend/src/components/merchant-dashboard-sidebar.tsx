import { Link } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import {
  Home,
  Menu,
  SlidersHorizontal,
  Clipboard,
  ChevronsLeft,
  ChevronsRight,
  ChefHat,
  ShoppingBag,
  CreditCard,
} from "lucide-react";

const menuManagementItems = [
  { name: "Item Manager", icon: Clipboard, to: "/dashboard/items" },
  { name: "Modifier Manager", icon: SlidersHorizontal, to: "/dashboard/modifiers" },
  { name: "Menu Editor", icon: Menu, to: "/dashboard/menu" },
] as const;

const orderItems = [
  { name: "Cooking", icon: ChefHat, to: "/dashboard/orders/cooking" },
  { name: "Bagging", icon: ShoppingBag, to: "/dashboard/orders/bagging" },
  { name: "Payment", icon: CreditCard, to: "/dashboard/orders/payment" },
] as const;

export function MerchantDashboardSidebar({ className }: { className?: string }) {
  const { toggleSidebar, state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className={className}>
      <SidebarHeader className="px-4 py-5">
        <h2 className="font-semibold text-lg tracking-tight group-data-[collapsible=icon]:group-data-[state=collapsed]:hidden">
          Saangee's Kitchen
        </h2>
      </SidebarHeader>

      <SidebarContent>
        {/* Home - standalone */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Home">
                  <Link
                    to="/dashboard/home"
                    activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
                  >
                    <Home />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Menu Management */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuManagementItems.map(({ name, icon: Icon, to }) => (
                <SidebarMenuItem key={name}>
                  <SidebarMenuButton asChild tooltip={name}>
                    <Link
                      to={to}
                      activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
                    >
                      <Icon />
                      <span>{name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Orders */}
        <SidebarGroup>
          <SidebarGroupLabel>Orders</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {orderItems.map(({ name, icon: Icon, to }) => (
                <SidebarMenuItem key={name}>
                  <SidebarMenuButton asChild tooltip={name}>
                    <Link
                      to={to}
                      activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
                    >
                      <Icon />
                      <span>{name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? <ChevronsRight /> : <ChevronsLeft />}
              <span>{isCollapsed ? "Expand" : "Collapse"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
