import { Home, Menu, Sheet, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

export const merchantHomeNavData = [
  { name: "Home", icon: Home },
  { name: "Item Manager", icon: Menu },
  { name: "Modifier Manager", icon: SlidersHorizontal },
  { name: "Orders", icon: Sheet },
] as const;

export type MerchantHomeNavData = typeof merchantHomeNavData;

export function useMerchantNavigation() {
  const [location, setLocation] =
    useState<MerchantHomeNavData[number]["name"]>("Home");

  return {
    location,
    setLocation,
  };
}

