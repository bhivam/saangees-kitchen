import type { MenuItemSelection } from "@/hooks/use-menu-item-form";
import z from "zod";

/** djb2 hash → hex string, up to 8 chars */
function shortHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

const UUID =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}";

// menuEntryId:itemId|groupId(optionId;optionId),groupId(optionId)~instructionsHash
const SKUID_REGEX = new RegExp(
  `^${UUID}:${UUID}\\|(?:${UUID}\\(${UUID}(?:;${UUID})*\\)(?:,${UUID}\\(${UUID}(?:;${UUID})*\\))*)?(?:~[0-9a-f]{1,8})?$`,
);

export function parseSkuId(id: string) {
  if (!SKUID_REGEX.test(id)) {
    throw new Error(`Invalid SKU id: ${id}`);
  }

  const [menuEntryAndItem, rest] = id.split("|");
  const [menuEntryId, itemId] = menuEntryAndItem.split(":");

  // Split off optional ~hash suffix
  const tildeIdx = rest.indexOf("~");
  const modifierPart = tildeIdx >= 0 ? rest.slice(0, tildeIdx) : rest;
  const instructionsHash = tildeIdx >= 0 ? rest.slice(tildeIdx + 1) : undefined;

  if (modifierPart.length === 0) {
    return {
      menuEntryId,
      itemId,
      modifierGroups: {} as Record<string, string[]>,
      instructionsHash,
    };
  }

  const groupChunks = modifierPart.split(",");

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

  return { menuEntryId, itemId, modifierGroups, instructionsHash };
}

const skuidSchema = z
  .string()
  .regex(SKUID_REGEX, "Invalid cart item id format");

export type ComboCartItem = {
  quantity: number;
  comboEntryId: string;
  items: Array<{
    menuItemId: string;
    modifierSelections: Record<string, string[]>;
    specialInstructions?: string;
  }>;
};

const comboCartItemSchema = z.object({
  quantity: z.number().nonnegative(),
  comboEntryId: z.string(),
  items: z.array(
    z.object({
      menuItemId: z.string(),
      modifierSelections: z.record(z.string(), z.array(z.string())),
      specialInstructions: z.string().optional(),
    }),
  ),
});

const cartSchema = z.object({
  items: z.record(
    skuidSchema,
    z
      .object({
        quantity: z.number().nonnegative(),
        specialInstructions: z.string().optional(),
      })
      .optional(),
  ),
  combos: z.record(z.string(), comboCartItemSchema).optional(),
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

  const base = `${itemSelection.menuEntryId}:${itemSelection.itemId}|${groups.join(",")}`;
  const instructions = itemSelection.specialInstructions?.trim();
  if (instructions) {
    return `${base}~${shortHash(instructions)}`;
  }
  return base;
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
  if (itemSelection.specialInstructions?.trim()) {
    currentCartItem.specialInstructions = itemSelection.specialInstructions.trim();
  }

  currentCart.items[cartItemId] = currentCartItem;

  localStorage.setItem(CART_KEY, JSON.stringify(currentCart));
}

export function getCartLS(): Cart {
  const cartString = localStorage.getItem(CART_KEY);

  let currentCart: Cart;

  try {
    if (cartString) {
      const parsed = JSON.parse(cartString);
      // Backward compat: add combos key if missing
      if (!parsed.combos) parsed.combos = {};
      currentCart = cartSchema.parse(parsed);
    } else {
      currentCart = { items: {}, combos: {} };
    }
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
    const existing = currentCart.items[skuId];
    currentCart.items[skuId] = { quantity, specialInstructions: existing?.specialInstructions };
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
  const instructions = itemSelection.specialInstructions?.trim() || undefined;

  if (oldSkuId === newSkuId) {
    // Same SKU, just update quantity
    currentCart.items[newSkuId] = { quantity: itemSelection.quantity, specialInstructions: instructions };
  } else {
    // Different SKU - remove old, add new (merging if exists)
    delete currentCart.items[oldSkuId];
    const existingQuantity = currentCart.items[newSkuId]?.quantity ?? 0;
    currentCart.items[newSkuId] = {
      quantity: existingQuantity + itemSelection.quantity,
      specialInstructions: instructions,
    };
  }

  localStorage.setItem(CART_KEY, JSON.stringify(currentCart));
}

// Combo cart functions

export type ComboSelection = {
  comboEntryId: string;
  quantity: number;
  items: Array<{
    menuItemId: string;
    modifierSelections: Record<string, string[]>;
    specialInstructions?: string;
  }>;
};

function getComboSkuId(selection: ComboSelection): string {
  // Hash based on comboEntryId + all items' modifier selections + instructions
  const itemParts = selection.items.map((item) => {
    const modParts = Object.entries(item.modifierSelections)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([groupId, optionIds]) => {
        const sorted = [...optionIds].sort();
        return `${groupId}(${sorted.join(";")})`;
      })
      .join(",");
    const instrHash = item.specialInstructions?.trim()
      ? shortHash(item.specialInstructions.trim())
      : "";
    return `${item.menuItemId}|${modParts}${instrHash ? `~${instrHash}` : ""}`;
  });
  return `combo:${selection.comboEntryId}:${shortHash(itemParts.join(":"))}`;
}

export function addComboToCartLS(selection: ComboSelection) {
  const currentCart = getCartLS();
  if (!currentCart.combos) currentCart.combos = {};

  const comboSkuId = getComboSkuId(selection);
  const existing = currentCart.combos[comboSkuId];

  if (existing) {
    existing.quantity += selection.quantity;
  } else {
    currentCart.combos[comboSkuId] = {
      quantity: selection.quantity,
      comboEntryId: selection.comboEntryId,
      items: selection.items,
    };
  }

  localStorage.setItem(CART_KEY, JSON.stringify(currentCart));
}

export function removeComboFromCartLS(comboSkuId: string) {
  const currentCart = getCartLS();
  if (currentCart.combos) {
    delete currentCart.combos[comboSkuId];
  }
  localStorage.setItem(CART_KEY, JSON.stringify(currentCart));
}

export function updateComboQuantityLS(comboSkuId: string, quantity: number) {
  const currentCart = getCartLS();
  if (!currentCart.combos) return;

  if (quantity <= 0) {
    delete currentCart.combos[comboSkuId];
  } else {
    const existing = currentCart.combos[comboSkuId];
    if (existing) {
      existing.quantity = quantity;
    }
  }

  localStorage.setItem(CART_KEY, JSON.stringify(currentCart));
}

