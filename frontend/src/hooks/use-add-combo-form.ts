import { useForm } from "@tanstack/react-form";
import { useTRPC } from "@/trpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import z from "zod";
import { useState } from "react";
import { toast } from "sonner";

const comboSchema = z.object({
  name: z
    .string({ error: "Name cannot be empty" })
    .min(1, "Name is required"),
  description: z
    .string({ error: "Description cannot be empty" })
    .min(1, "Description is required"),
  discountAmount: z
    .number({ error: "Discount cannot be empty" })
    .int()
    .positive("Discount must be greater than 0"),
  selectedMenuItems: z
    .array(
      z.object({
        menuItemId: z.string(),
        menuItemName: z.string(),
      }),
    )
    .min(1, "At least one menu item is required"),
});

export type ComboResult = {
  id: string;
  name: string;
  description: string;
  discountAmount: number;
  comboItems: Array<{
    comboId: string;
    menuItemId: string;
    sortOrder: number;
    menuItem: {
      id: string;
      name: string;
      description: string;
      basePrice: number;
      modifierGroups: Array<{
        menuItemId: string;
        groupId: string;
        sortOrder: number;
        modifierGroup: {
          id: string;
          name: string;
          minSelect: number;
          maxSelect: number | null;
          options: Array<{
            id: string;
            name: string;
            priceDelta: number;
            groupId: string;
          }>;
        };
      }>;
    };
  }>;
};

export function useAddComboForm({
  setOpen,
  editData,
}: {
  setOpen?: (open: boolean) => void;
  editData?: ComboResult;
}) {
  const isEditMode = !!editData;
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const createComboMutation = useMutation(
    trpc.combos.createCombo.mutationOptions({
      onSettled: (result, error) => {
        if (error || !result) {
          toast.error("Failed to create combo.", {
            position: "bottom-center",
          });
          return;
        }

        queryClient.setQueryData(
          trpc.combos.getCombos.queryKey(),
          (prev) => [result, ...(prev ?? [])],
        );
      },
    }),
  );

  const updateComboMutation = useMutation(
    trpc.combos.updateCombo.mutationOptions({
      onSettled: (result, error) => {
        if (error || !result) {
          toast.error("Failed to update combo.", {
            position: "bottom-center",
          });
          return;
        }

        queryClient.setQueryData(
          trpc.combos.getCombos.queryKey(),
          (prev) =>
            prev?.map((c) => (c.id === result.id ? result : c)) ?? [result],
        );
      },
    }),
  );

  const deleteComboMutation = useMutation(
    trpc.combos.deleteCombo.mutationOptions({
      onSettled: (result, error) => {
        if (error || !result) {
          toast.error("Failed to delete combo.", {
            position: "bottom-center",
          });
          return;
        }

        queryClient.setQueryData(
          trpc.combos.getCombos.queryKey(),
          (prev) => prev?.filter((c) => c.id !== result.id) ?? [],
        );

        toast.success("Combo deleted.", { position: "bottom-center" });
      },
    }),
  );

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const clearFieldErrors = () => setFieldErrors({});

  const form = useForm({
    defaultValues: {
      name: editData?.name ?? "",
      description: editData?.description ?? "",
      discountAmount: editData?.discountAmount ?? 0,
      selectedMenuItems:
        editData?.comboItems
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((ci) => ({
            menuItemId: ci.menuItemId,
            menuItemName: ci.menuItem.name,
          })) ??
        ([] as Array<{ menuItemId: string; menuItemName: string }>),
    },
    validators: {
      onSubmit: comboSchema,
      onChange: comboSchema,
    },
    onSubmitInvalid: ({ formApi }) => {
      const errors: Record<string, string> = {};
      for (const errorObj of formApi.state.errors) {
        if (typeof errorObj === "object" && errorObj !== null) {
          for (const [fieldPath, fieldErrors] of Object.entries(errorObj)) {
            if (!errors[fieldPath] && Array.isArray(fieldErrors)) {
              const firstError = fieldErrors[0];
              if (
                firstError &&
                typeof firstError === "object" &&
                "message" in firstError
              ) {
                errors[fieldPath] = String(firstError.message);
              }
            }
          }
        }
      }
      setFieldErrors(errors);
    },
    onSubmit: async ({ value, formApi }) => {
      setFieldErrors({});
      const { selectedMenuItems, ...comboData } = value;
      const menuItems = selectedMenuItems.map((mi, index) => ({
        menuItemId: mi.menuItemId,
        sortOrder: index,
      }));

      if (isEditMode) {
        await updateComboMutation.mutateAsync({
          id: editData.id,
          ...comboData,
          menuItems,
        });
      } else {
        await createComboMutation.mutateAsync({
          ...comboData,
          menuItems,
        });
      }
      formApi.reset();
      setOpen?.(false);
    },
  });

  const mutation = isEditMode ? updateComboMutation : createComboMutation;

  return {
    form,
    createComboMutation: mutation,
    deleteComboMutation,
    isEditMode,
    fieldErrors,
    clearFieldErrors,
  };
}
