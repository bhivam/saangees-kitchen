import type { MenuItemSelection } from "@/hooks/use-menu-item-form";
import z from "zod";

const UUID =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}";

// itemId|groupId(optionId;optionId),groupId(optionId)
const SKUID_REGEX = new RegExp(
  `^${UUID}\\|(?:${UUID}\\(${UUID}(?:;${UUID})*\\)(?:,${UUID}\\(${UUID}(?:;${UUID})*\\))*)?$`,
);

export const skuidSchema = z
  .string()
  .regex(SKUID_REGEX, "Invalid cart item id format");

const cartSchema = z.object({
  items: z.record(
    skuidSchema,
    z.object({ quantity: z.number().nonnegative() }),
  ),
});

export type Cart = z.infer<typeof cartSchema>;

const CART_KEY = "cart";

export function removeCartItemLS(itemSelection: MenuItemSelection) {
  console.log(itemSelection);
  throw new Error("Unimplemented");
}

export function addCartItemLS(itemSelection: MenuItemSelection) {
  const currentCart = getCart();

  const groups = Object.entries(itemSelection.modifierSelections)
    .map(([groupId, optionIds]) => {
      const opts = Array.from(new Set((optionIds ?? []).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b),
      );

      if (opts.length === 0) return null;

      return { groupId, opts };
    })
    .filter((g): g is { groupId: string; opts: string[] } => g !== null)
    .sort((a, b) => a.groupId.localeCompare(b.groupId))
    .map(({ groupId, opts }) => `${groupId}(${opts.join(";")})`);

  const cartItemId = `${itemSelection.itemId}|${groups.join(",")}`;

  const currentCartItem = currentCart.items[cartItemId] ?? { quantity: 0 };

  currentCartItem.quantity += itemSelection.quantity;

  currentCart.items[cartItemId] = currentCartItem;

  localStorage.setItem(CART_KEY, JSON.stringify(currentCart));
}

export function getCartLS(): Cart {
  const cartString = localStorage.getItem(CART_KEY);

  let currentCart: Cart;

  try {
    currentCart = cartString
      ? cartSchema.parse(JSON.parse(cartString))
      : { items: {} };
  } catch (e) {
    throw new Error(`Failed to retrieve cart: ${e}`);
  }

  return currentCart;
}

