import { useForm } from "@tanstack/react-form";
import { useTRPC } from "@/trpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import z from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { useUploadImage } from "./use-upload-image";

const itemSchema = z.object({
  name: z.string({ error: "Name cannot be empty" }).min(1, "Name is required"),
  basePrice: z.number({ error: "Price cannot be empty" }).int().positive("Price must be greater than 0"),
  description: z.string({ error: "Description cannot be empty" }).min(1, "Description is required"),
  imageUrl: z.string().url().nullable(),
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
  imageUrl: string | null;
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
  onCreated,
}: {
  setOpen?: (open: boolean) => void;
  editData?: MenuItemResult;
  onCreated?: (item: MenuItemResult) => void;
}) {
  const isEditMode = !!editData;
  const queryClient = useQueryClient();
  const { uploadMutation, isPending: isUploading } = useUploadImage();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const clearFieldErrors = () => setFieldErrors({});

  const form = useForm({
    defaultValues: {
      name: editData?.name ?? "",
      basePrice: editData?.basePrice ?? 0,
      description: editData?.description ?? "",
      imageUrl: editData?.imageUrl ?? null,
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
    validators: {
      onSubmit: itemSchema,
      onChange: itemSchema,
    },
    onSubmitInvalid: ({ formApi }) => {
      const errors: Record<string, string> = {};
      for (const errorObj of formApi.state.errors) {
        if (typeof errorObj === "object" && errorObj !== null) {
          for (const [fieldPath, fieldErrors] of Object.entries(errorObj)) {
            if (!errors[fieldPath] && Array.isArray(fieldErrors)) {
              const firstError = fieldErrors[0];
              if (firstError && typeof firstError === "object" && "message" in firstError) {
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
      const { selectedModifierGroups, imageUrl, ...itemData } = value;
      const modifierGroups = selectedModifierGroups.map((mg, index) => ({
        groupId: mg.groupId,
        sortOrder: index,
      }));

      let finalImageUrl: string | null | undefined = imageUrl;
      if (selectedFile) {
        try {
          finalImageUrl = await uploadMutation.mutateAsync(selectedFile);
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Failed to upload image",
            { position: "bottom-center" },
          );
          return;
        }
      }

      if (isEditMode) {
        await updateMenuItemMutation.mutateAsync({
          id: editData.id,
          ...itemData,
          imageUrl: finalImageUrl,
          modifierGroups,
        });
      } else {
        const result = await createMenuItemMutation.mutateAsync({
          ...itemData,
          imageUrl: finalImageUrl,
          modifierGroups,
        });
        if (result?.[0]) {
          onCreated?.(result[0]);
        }
      }
      setSelectedFile(null);
      formApi.reset();
      setOpen?.(false);
    },
  });

  const mutation = isEditMode ? updateMenuItemMutation : createMenuItemMutation;

  return {
    form,
    createMenuItemMutation: mutation,
    deleteMenuItemMutation,
    isEditMode,
    fieldErrors,
    clearFieldErrors,
    selectedFile,
    setSelectedFile,
    isUploading,
  };
}

