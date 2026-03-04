import type { MenuItem } from "@/components/customer-menu-view";
import { useState, useCallback } from "react";
import z from "zod";

export function buildValidationSchema(menuItem: MenuItem) {
  return z.object({
    quantity: z.number().int().positive().min(1),
    modifierSelections: z
      .record(z.string(), z.array(z.string()))
      .superRefine((selections, ctx) => {
        menuItem.modifierGroups.forEach(({ modifierGroup }) => {
          const groupId = modifierGroup.id;
          const selectedOptions = selections[groupId] ?? [];
          const selectedCount = selectedOptions.length;

          if (selectedCount < modifierGroup.minSelect) {
            ctx.addIssue({
              code: "custom",
              message: `Select at least ${modifierGroup.minSelect}`,
              path: [groupId],
            });
          }

          if (
            modifierGroup.maxSelect !== null &&
            selectedCount > modifierGroup.maxSelect
          ) {
            ctx.addIssue({
              code: "custom",
              message: `Select at most ${modifierGroup.maxSelect}`,
              path: [groupId],
            });
          }
        });
      }),
  });
}

export function useModifierSelection({
  menuItem,
  initialValues,
}: {
  menuItem: MenuItem;
  initialValues?: {
    quantity?: number;
    modifierSelections?: Record<string, string[]>;
    specialInstructions?: string;
  };
}) {
  const [modifierSelections, setModifierSelections] = useState<
    Record<string, string[]>
  >(() => {
    if (initialValues?.modifierSelections) return initialValues.modifierSelections;
    const initial: Record<string, string[]> = {};
    for (const mg of menuItem.modifierGroups) {
      initial[mg.modifierGroup.id] = [];
    }
    return initial;
  });
  const [quantity, setQuantity] = useState(initialValues?.quantity ?? 1);
  const [specialInstructions, setSpecialInstructions] = useState(
    initialValues?.specialInstructions ?? "",
  );
  const [modifierErrors, setModifierErrors] = useState<Record<string, string>>(
    {},
  );

  const clearModifierErrors = useCallback(() => setModifierErrors({}), []);

  const toggleModifierOption = useCallback(
    (groupId: string, optionId: string) => {
      setModifierSelections((prev) => {
        const current = prev[groupId] ?? [];
        const isSelected = current.includes(optionId);

        if (isSelected) {
          clearModifierErrors();
          return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
        }

        // No-op when at maxSelect
        const group = menuItem.modifierGroups.find(
          (mg) => mg.modifierGroup.id === groupId,
        )?.modifierGroup;
        if (
          group?.maxSelect !== null &&
          group?.maxSelect !== undefined &&
          current.length >= group.maxSelect
        ) {
          return prev;
        }

        clearModifierErrors();
        return { ...prev, [groupId]: [...current, optionId] };
      });
    },
    [menuItem.modifierGroups, clearModifierErrors],
  );

  const validate = useCallback((): boolean => {
    const schema = buildValidationSchema(menuItem);
    const result = schema.safeParse({ quantity, modifierSelections });
    if (result.success) {
      setModifierErrors({});
      return true;
    }
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      // Path is ["modifierSelections", groupId]
      if (issue.path[0] === "modifierSelections" && issue.path[1]) {
        const groupId = String(issue.path[1]);
        if (!errors[groupId]) {
          errors[groupId] = issue.message;
        }
      }
    }
    setModifierErrors(errors);
    return false;
  }, [menuItem, quantity, modifierSelections]);

  const calculateUnitPrice = useCallback((): number => {
    let price = menuItem.basePrice;
    for (const [groupId, optionIds] of Object.entries(modifierSelections)) {
      const group = menuItem.modifierGroups.find(
        (mg) => mg.modifierGroup.id === groupId,
      )?.modifierGroup;
      if (!group) continue;
      for (const optionId of optionIds) {
        const option = group.options.find((o) => o.id === optionId);
        if (option) price += option.priceDelta;
      }
    }
    return price;
  }, [menuItem, modifierSelections]);

  const calculateTotalPrice = useCallback((): number => {
    return calculateUnitPrice() * quantity;
  }, [calculateUnitPrice, quantity]);

  const getSelectedModifierNames = useCallback((): string[] => {
    const names: string[] = [];
    for (const [groupId, optionIds] of Object.entries(modifierSelections)) {
      const group = menuItem.modifierGroups.find(
        (mg) => mg.modifierGroup.id === groupId,
      )?.modifierGroup;
      if (!group) continue;
      for (const optionId of optionIds) {
        const option = group.options.find((o) => o.id === optionId);
        if (option) names.push(option.name);
      }
    }
    return names;
  }, [menuItem, modifierSelections]);

  const getAllSelectedOptionIds = useCallback((): string[] => {
    return Object.values(modifierSelections).flat();
  }, [modifierSelections]);

  return {
    modifierSelections,
    quantity,
    specialInstructions,
    toggleModifierOption,
    setQuantity,
    setSpecialInstructions,
    modifierErrors,
    clearModifierErrors,
    validate,
    calculateUnitPrice,
    calculateTotalPrice,
    getSelectedModifierNames,
    getAllSelectedOptionIds,
  };
}
