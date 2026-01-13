import type { MenuItemSelection } from "@/hooks/use-menu-item-form";
import z from "zod";

const UUID =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}";

// menuEntryId:itemId|groupId(optionId;optionId),groupId(optionId)
const SKUID_REGEX = new RegExp(
  `^${UUID}:${UUID}\\|(?:${UUID}\\(${UUID}(?:;${UUID})*\\)(?:,${UUID}\\(${UUID}(?:;${UUID})*\\))*)?$`,
);

export function parseSkuId(id: string) {
  if (!SKUID_REGEX.test(id)) {
    throw new Error(`Invalid SKU id: ${id}`);
  }

  const [menuEntryAndItem, rest] = id.split("|");
  const [menuEntryId, itemId] = menuEntryAndItem.split(":");

  if (rest.length === 0) {
    return {
      menuEntryId,
      itemId,
      modifierGroups: {} as Record<string, string[]>,
    };
  }

  const groupChunks = rest.split(",");

  const modifierGroups = groupChunks.reduce(
    (result, chunk) => {
      const openParen = chunk.indexOf("(");
      const closeParen = chunk.indexOf(")");

      const groupId = chunk.slice(0, openParen);
      const inside = chunk.slice(openParen + 1, closeParen);

      const optionIds = inside.length === 0 ? [] : inside.split(";");

      result[groupId] = optionIds;

      return result;
    },
    {} as Record<string, string[]>,
  );

  return { menuEntryId, itemId, modifierGroups };
}

const skuidSchema = z
  .string()
  .regex(SKUID_REGEX, "Invalid cart item id format");

const cartSchema = z.object({
  items: z.record(
    skuidSchema,
    z.object({ quantity: z.number().nonnegative() }).optional(),
  ),
});

export type Cart = z.infer<typeof cartSchema>;

const CART_KEY = "cart";

export function getCartItemId(itemSelection: MenuItemSelection) {
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

  return `${itemSelection.menuEntryId}:${itemSelection.itemId}|${groups.join(",")}`;
}

export function removeCartItemLS(itemSelection: MenuItemSelection) {
  const currentCart = getCartLS();

  const cartItemId = getCartItemId(itemSelection);

  const cartItemMetaData = currentCart.items[cartItemId];

  if (!cartItemMetaData) return;

  const newQuantity = Math.max(
    0,
    cartItemMetaData.quantity - itemSelection.quantity,
  );

  if (newQuantity === 0) {
    delete currentCart.items[cartItemId];
  } else {
    currentCart.items[cartItemId] = { quantity: newQuantity };
  }

  localStorage.setItem(CART_KEY, JSON.stringify(currentCart));
}

export function addCartItemLS(itemSelection: MenuItemSelection) {
  const currentCart = getCartLS();

  const cartItemId = getCartItemId(itemSelection);

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

export function setCartLS(cart: Cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function updateCartItemQuantityLS(skuId: string, quantity: number) {
  const currentCart = getCartLS();

  if (quantity <= 0) {
    delete currentCart.items[skuId];
  } else {
    currentCart.items[skuId] = { quantity };
  }

  localStorage.setItem(CART_KEY, JSON.stringify(currentCart));
}

export function removeCartItemBySkuLS(skuId: string) {
  const currentCart = getCartLS();
  delete currentCart.items[skuId];
  localStorage.setItem(CART_KEY, JSON.stringify(currentCart));
}

export function replaceCartItemLS(
  oldSkuId: string,
  itemSelection: MenuItemSelection,
) {
  const currentCart = getCartLS();
  const newSkuId = getCartItemId(itemSelection);

  if (oldSkuId === newSkuId) {
    // Same SKU, just update quantity
    currentCart.items[newSkuId] = { quantity: itemSelection.quantity };
  } else {
    // Different SKU - remove old, add new (merging if exists)
    delete currentCart.items[oldSkuId];
    const existingQuantity = currentCart.items[newSkuId]?.quantity ?? 0;
    currentCart.items[newSkuId] = {
      quantity: existingQuantity + itemSelection.quantity,
    };
  }

  localStorage.setItem(CART_KEY, JSON.stringify(currentCart));
}

