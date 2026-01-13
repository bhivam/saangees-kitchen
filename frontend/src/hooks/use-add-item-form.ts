import { useForm } from "@tanstack/react-form";
import { useTRPC } from "@/trpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import z from "zod";
import { toast } from "sonner";

const itemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  basePrice: z.number().int().positive("Price must be greater than 0"),
  description: z.string().min(1, "Description is required"),
  selectedModifierGroups: z.array(
    z.object({
      groupId: z.string(),
      groupName: z.string(),
      minSelect: z.number(),
      maxSelect: z.number().nullable(),
    }),
  ),
});

export type MenuItemResult = {
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

export function useAddItemForm({
  setOpen,
  editData,
}: {
  setOpen?: (open: boolean) => void;
  editData?: MenuItemResult;
}) {
  const isEditMode = !!editData;
  const queryClient = useQueryClient();

  const trpc = useTRPC();

  const createMenuItemMutation = useMutation(
    trpc.menuItems.createMenuItem.mutationOptions({
      onSettled: (result, error) => {
        if (error || !result || !result[0]) {
          toast.error("Failed to create menu item.", {
            position: "bottom-center",
          });

          return;
        }

        queryClient.setQueryData(
          trpc.menuItems.getMenuItems.queryKey(),
          (prev) => {
            return [result[0], ...(prev ?? [])];
          },
        );
      },
    }),
  );

  const updateMenuItemMutation = useMutation(
    trpc.menuItems.updateMenuItem.mutationOptions({
      onSettled: (result, error) => {
        if (error || !result) {
          toast.error("Failed to update menu item.", {
            position: "bottom-center",
          });

          return;
        }

        queryClient.setQueryData(
          trpc.menuItems.getMenuItems.queryKey(),
          (prev) =>
            prev?.map((item) => (item.id === result.id ? result : item)) ?? [
              result,
            ],
        );
      },
    }),
  );

  const deleteMenuItemMutation = useMutation(
    trpc.menuItems.deleteMenuItem.mutationOptions({
      onSettled: (result, error) => {
        if (error || !result) {
          toast.error("Failed to delete menu item.", {
            position: "bottom-center",
          });
          return;
        }

        queryClient.setQueryData(
          trpc.menuItems.getMenuItems.queryKey(),
          (prev) => prev?.filter((item) => item.id !== result.id) ?? [],
        );

        toast.success("Menu item deleted.", { position: "bottom-center" });
      },
    }),
  );

  const form = useForm({
    defaultValues: {
      name: editData?.name ?? "",
      basePrice: editData?.basePrice ?? 0,
      description: editData?.description ?? "",
      selectedModifierGroups:
        editData?.modifierGroups.map((mg) => ({
          groupId: mg.groupId,
          groupName: mg.modifierGroup.name,
          minSelect: mg.modifierGroup.minSelect,
          maxSelect: mg.modifierGroup.maxSelect,
        })) ??
        ([] as Array<{
          groupId: string;
          groupName: string;
          minSelect: number;
          maxSelect: number | null;
        }>),
    },
    onSubmit: async ({ value, formApi }) => {
      // Validate with Zod
      const result = itemSchema.safeParse(value);
      if (!result.success) {
        const messages = result.error.issues.map((issue) => issue.message);
        toast.error(messages.join(". "), { position: "bottom-center" });
        return;
      }

      const { selectedModifierGroups, ...itemData } = result.data;
      const modifierGroups = selectedModifierGroups.map((mg, index) => ({
        groupId: mg.groupId,
        sortOrder: index,
      }));

      if (isEditMode) {
        await updateMenuItemMutation.mutateAsync({
          id: editData.id,
          ...itemData,
          modifierGroups,
        });
      } else {
        await createMenuItemMutation.mutateAsync({
          ...itemData,
          modifierGroups,
        });
      }
      formApi.reset();
      setOpen?.(false);
    },
  });

  const mutation = isEditMode ? updateMenuItemMutation : createMenuItemMutation;

  return { form, createMenuItemMutation: mutation, deleteMenuItemMutation, isEditMode };
}

