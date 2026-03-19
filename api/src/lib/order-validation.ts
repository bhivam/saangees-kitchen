import { TRPCError } from "@trpc/server";
import { isOrderingOpen } from "./order-cutoffs.js";

// Types matching the enriched drizzle query shapes

type EnrichedMenuEntry = {
  id: string;
  date: string | Date | null;
  isCustom: boolean;
  menuItem: {
    id: string;
    basePrice: number;
    modifierGroups: Array<{
      modifierGroup: {
        id: string;
        name: string;
        minSelect: number;
        maxSelect: number | null;
        options: Array<{ id: string }>;
      };
    }>;
  };
};

type EnrichedComboEntry = {
  id: string;
  date: string | Date | null;
  combo: {
    id: string;
    comboItems: Array<{ menuItemId: string }>;
  };
};

type OrderItem = {
  menuEntryId: string;
  modifierOptionIds: string[];
};

type OrderCombo = {
  comboEntryId: string;
  items: OrderItem[];
};

type OrderInput = {
  items: (OrderItem & { quantity: number })[];
  combos: OrderCombo[];
};

function normalizeDate(date: string | Date | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === "string") return date;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Validates that submitted modifier option IDs belong to the menu item
 * and satisfy min/max selection constraints for each modifier group.
 */
export function validateModifierOptions(
  menuEntry: EnrichedMenuEntry,
  modifierOptionIds: string[],
) {
  const menuItem = menuEntry.menuItem;

  // Build a map: optionId -> groupId for all valid options on this menu item
  const optionToGroup = new Map<string, string>();
  for (const mg of menuItem.modifierGroups) {
    for (const opt of mg.modifierGroup.options) {
      optionToGroup.set(opt.id, mg.modifierGroup.id);
    }
  }

  // Verify each submitted option belongs to this menu item's groups
  for (const optId of modifierOptionIds) {
    if (!optionToGroup.has(optId)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Modifier option ${optId} does not belong to this menu item`,
      });
    }
  }

  // Group submitted options by their modifier group
  const selectedByGroup = new Map<string, string[]>();
  for (const optId of modifierOptionIds) {
    const groupId = optionToGroup.get(optId)!;
    const existing = selectedByGroup.get(groupId) ?? [];
    existing.push(optId);
    selectedByGroup.set(groupId, existing);
  }

  // Check min/max constraints for each modifier group
  for (const mg of menuItem.modifierGroups) {
    const group = mg.modifierGroup;
    const selected = selectedByGroup.get(group.id) ?? [];
    const count = selected.length;

    if (count < group.minSelect) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Modifier group "${group.name}" requires at least ${group.minSelect} selection(s), got ${count}`,
      });
    }

    if (group.maxSelect !== null && count > group.maxSelect) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Modifier group "${group.name}" allows at most ${group.maxSelect} selection(s), got ${count}`,
      });
    }
  }
}

/**
 * Validates that the submitted menu item IDs match the combo definition exactly.
 */
export function validateComboItems(
  comboEntry: EnrichedComboEntry,
  submittedMenuItemIds: string[],
) {
  const expectedIds = comboEntry.combo.comboItems
    .map((ci) => ci.menuItemId)
    .sort();
  const actualIds = [...submittedMenuItemIds].sort();

  if (
    expectedIds.length !== actualIds.length ||
    expectedIds.some((id, i) => id !== actualIds[i])
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Combo items do not match the combo definition`,
    });
  }
}

/**
 * Orchestrator that validates all items and combos in an order.
 * When isCustomerOrder is true, rejects isCustom entries and checks ordering cutoffs on combo dates.
 */
export function validateOrderItems(
  input: OrderInput,
  entryMap: Map<string, EnrichedMenuEntry>,
  comboEntryMap: Map<string, EnrichedComboEntry>,
  opts: { isCustomerOrder: boolean },
) {
  // Validate standalone items
  for (const item of input.items) {
    const entry = entryMap.get(item.menuEntryId);
    if (!entry) continue; // Already validated existence upstream

    if (opts.isCustomerOrder && entry.isCustom) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Menu entry ${item.menuEntryId} is not available for ordering`,
      });
    }

    validateModifierOptions(entry, item.modifierOptionIds);
  }

  // Validate combos
  for (const combo of input.combos) {
    const comboEntry = comboEntryMap.get(combo.comboEntryId);
    if (!comboEntry) continue; // Already validated existence upstream

    if (opts.isCustomerOrder) {
      const dateStr = normalizeDate(comboEntry.date);
      if (dateStr && !isOrderingOpen(dateStr)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Ordering is closed for ${dateStr}`,
        });
      }
    }

    // Resolve submitted menuItemIds from the menu entries
    const submittedMenuItemIds = combo.items.map((item) => {
      const entry = entryMap.get(item.menuEntryId);
      if (!entry) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Menu entry ${item.menuEntryId} not found`,
        });
      }

      if (opts.isCustomerOrder && entry.isCustom) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Menu entry ${item.menuEntryId} is not available for ordering`,
        });
      }

      return entry.menuItem.id;
    });

    validateComboItems(comboEntry, submittedMenuItemIds);

    // Validate modifiers for each combo item
    for (const item of combo.items) {
      const entry = entryMap.get(item.menuEntryId)!;
      validateModifierOptions(entry, item.modifierOptionIds);
    }
  }
}
