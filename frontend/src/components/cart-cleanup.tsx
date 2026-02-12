import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { useCart } from "@/hooks/use-cart";
import { parseSkuId } from "@/lib/cart";
import { useRef } from "react";

export function CartCleanup() {
  const { cart, setCart } = useCart();
  const trpc = useTRPC();
  const hasRunRef = useRef(false);

  const { data: menuEntries } = useQuery(
    trpc.menu.getWeekMenu.queryOptions(),
  );

  // Run cleanup once when menu data is available
  if (menuEntries && !hasRunRef.current) {
    hasRunRef.current = true;

    const validSkuIds = new Set<string>();

    // Validate all cart items against menu
    for (const skuId of Object.keys(cart.items)) {
      try {
        const { menuEntryId, itemId, modifierGroups } = parseSkuId(skuId);

        const entry = menuEntries.find((entry) => entry.id === menuEntryId);
        if (!entry || entry.menuItem.id !== itemId) {
          console.warn(`Cart item ${skuId} is no longer available`);
          continue;
        }

        // Validate modifier groups and options
        let isValid = true;
        for (const [groupId, optionIds] of Object.entries(modifierGroups)) {
          const menuGroup = entry.menuItem.modifierGroups.find(
            (mg) => mg.groupId === groupId,
          );

          if (!menuGroup) {
            isValid = false;
            break;
          }

          for (const optionId of optionIds) {
            const option = menuGroup.modifierGroup.options.find(
              (o) => o.id === optionId,
            );
            if (!option) {
              isValid = false;
              break;
            }
          }

          if (!isValid) break;
        }

        if (isValid) {
          validSkuIds.add(skuId);
        }
      } catch {
        console.warn(`Invalid SKU format: ${skuId}`);
      }
    }

    // Update cart if items were filtered out
    const currentSkuIds = Object.keys(cart.items);
    const hasInvalidItems = currentSkuIds.some(
      (skuId) => !validSkuIds.has(skuId),
    );

    if (hasInvalidItems) {
      const filteredCart = {
        items: Object.fromEntries(
          currentSkuIds
            .filter((skuId) => validSkuIds.has(skuId))
            .map((skuId) => [skuId, cart.items[skuId]]),
        ),
      };
      setCart(filteredCart);
    }
  }

  return null;
}
