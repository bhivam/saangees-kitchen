import { Home, Menu, Sheet, SlidersHorizontal, Clipboard } from "lucide-react";
import { useState } from "react";

export const merchantDashboardNavData = [
  { name: "Home", icon: Home },
  { name: "Item Manager", icon: Clipboard },
  { name: "Modifier Manager", icon: SlidersHorizontal },
  { name: "Menu Editor", icon: Menu },
  { name: "Orders", icon: Sheet },
] as const;

export type MerchantDashboardNavData = typeof merchantDashboardNavData;

export function useMerchantNavigation() {
  const [location, setLocation] =
    useState<MerchantDashboardNavData[number]["name"]>("Home");

  return {
    location,
    setLocation,
  };
}

