import type { MenuItem } from "@/components/customer-menu-view";
import { useForm } from "@tanstack/react-form";
import z from "zod";

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
              message: `${modifierGroup.name}: Select at least ${modifierGroup.minSelect}`,
              path: [groupId],
            });
          }

          if (
            modifierGroup.maxSelect !== null &&
            selectedCount > modifierGroup.maxSelect
          ) {
            ctx.addIssue({
              code: "custom",
              message: `${modifierGroup.name}: Select at most ${modifierGroup.maxSelect}`,
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
  modifierSelections: Record<string, string[]>;
};

export function useMenuItemForm(menuItem: MenuItem) {
  const validationSchema = buildValidationSchema(menuItem);

  const form = useForm({
    defaultValues: {
      quantity: 1,
      modifierSelections: Object.fromEntries(
        menuItem.modifierGroups.map(({ modifierGroup }) => [
          modifierGroup.id,
          [],
        ]),
      ) as Record<string, string[]>,
    } as Omit<MenuItemSelection, "itemId">,
    validators: {
      onSubmit: validationSchema,
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
  };
}

