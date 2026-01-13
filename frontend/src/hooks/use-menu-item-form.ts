import type { MenuItem } from "@/components/customer-menu-view";
import { useForm } from "@tanstack/react-form";
import z from "zod";
import { useCart } from "./use-cart";
import { useState } from "react";

function buildValidationSchema(menuItem: MenuItem) {
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

export type MenuItemSelection = {
  quantity: number;
  itemId: string;
  menuEntryId: string;
  modifierSelections: Record<string, string[]>;
};

export type CartItemEditData = {
  skuId: string;
  quantity: number;
  modifierSelections: Record<string, string[]>;
};

export function useMenuItemForm(
  menuItem: MenuItem,
  menuEntryId: string,
  onSuccess?: () => void,
  editData?: CartItemEditData,
) {
  const validationSchema = buildValidationSchema(menuItem);
  const isEditMode = !!editData;

  const { addCartItem, replaceCartItem } = useCart();
  const [modifierErrors, setModifierErrors] = useState<Record<string, string>>(
    {},
  );

  const clearModifierErrors = () => setModifierErrors({});

  const form = useForm({
    defaultValues: {
      quantity: editData?.quantity ?? 1,
      modifierSelections:
        editData?.modifierSelections ??
        (Object.fromEntries(
          menuItem.modifierGroups.map(({ modifierGroup }) => [
            modifierGroup.id,
            [],
          ]),
        ) as Record<string, string[]>),
    } as Omit<MenuItemSelection, "itemId" | "menuEntryId">,
    validators: {
      onSubmit: validationSchema,
    },
    onSubmitInvalid: ({ formApi }) => {
      const errors: Record<string, string> = {};
      // formApi.state.errors is an array of objects keyed by field path
      for (const errorObj of formApi.state.errors) {
        if (typeof errorObj === "object" && errorObj !== null) {
          for (const [fieldPath, fieldErrors] of Object.entries(errorObj)) {
            // fieldPath is like "modifierSelections.{groupId}"
            if (fieldPath.startsWith("modifierSelections.")) {
              const groupId = fieldPath.replace("modifierSelections.", "");
              if (!errors[groupId] && Array.isArray(fieldErrors)) {
                const firstError = fieldErrors[0];
                if (firstError && typeof firstError === "object" && "message" in firstError) {
                  errors[groupId] = String(firstError.message);
                }
              }
            }
          }
        }
      }
      setModifierErrors(errors);
    },
    onSubmit({ value }) {
      setModifierErrors({});
      const selection = { ...value, itemId: menuItem.id, menuEntryId };

      if (isEditMode) {
        replaceCartItem(editData.skuId, selection);
      } else {
        addCartItem(selection);
      }
      onSuccess?.();
    },
  });

  const getFormOutput = () => {
    const values = form.state.values;
    return {
      quantity: values.quantity,
      itemId: menuItem.id,
      modifierOptionIds: Object.values(values.modifierSelections).flat(),
    };
  };

  const calculateTotalPrice = (): number => {
    const values = form.state.values;
    let itemPrice = menuItem.basePrice;

    Object.entries(values.modifierSelections).forEach(
      ([groupId, optionIds]) => {
        const group = menuItem.modifierGroups.find(
          (mg) => mg.modifierGroup.id === groupId,
        )?.modifierGroup;

        if (!group) return;

        optionIds.forEach((optionId) => {
          const option = group.options.find((o) => o.id === optionId);
          if (option) itemPrice += option.priceDelta;
        });
      },
    );

    return itemPrice * values.quantity;
  };

  return {
    form,
    getFormOutput,
    calculateTotalPrice,
    isEditMode,
    modifierErrors,
    clearModifierErrors,
  };
}

