import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { toast } from "sonner";
import z from "zod";
import { useState } from "react";

export type ModifierGroupResult = {
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

export function useAddModifierForm({
  setOpen,
  onSuccess,
  editData,
}: {
  setOpen?: (open: boolean) => void;
  onSuccess?: (result: ModifierGroupResult) => void;
  editData?: ModifierGroupResult;
}) {
  const isEditMode = !!editData;
  const queryClient = useQueryClient();

  const trpc = useTRPC();

  const createModifierGroupMutation = useMutation(
    trpc.modifierGroups.createModifierGroup.mutationOptions({
      onSettled: (result, error) => {
        if (error || !result) {
          toast.error("Failed to create modifier.", {
            position: "bottom-center",
          });

          return;
        }

        queryClient.setQueryData(
          trpc.modifierGroups.getModifierGroups.queryKey(),
          (prev) => {
            return [result, ...(prev ?? [])];
          },
        );
        onSuccess?.(result);
        setOpen?.(false);
      },
    }),
  );

  const updateModifierGroupMutation = useMutation(
    trpc.modifierGroups.updateModifierGroup.mutationOptions({
      onSettled: (result, error) => {
        if (error || !result) {
          toast.error("Failed to update modifier.", {
            position: "bottom-center",
          });

          return;
        }

        queryClient.setQueryData(
          trpc.modifierGroups.getModifierGroups.queryKey(),
          (prev) =>
            prev?.map((g) => (g.id === result.id ? result : g)) ?? [result],
        );
        onSuccess?.(result);
        setOpen?.(false);
      },
    }),
  );

  const deleteModifierGroupMutation = useMutation(
    trpc.modifierGroups.deleteModifierGroup.mutationOptions({
      onSettled: (result, error) => {
        if (error || !result) {
          toast.error("Failed to delete modifier group.", {
            position: "bottom-center",
          });
          return;
        }

        queryClient.setQueryData(
          trpc.modifierGroups.getModifierGroups.queryKey(),
          (prev) => prev?.filter((g) => g.id !== result.id) ?? [],
        );

        toast.success("Modifier group deleted.", { position: "bottom-center" });
      },
    }),
  );

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const clearFieldErrors = () => setFieldErrors({});

  const form = useForm({
    defaultValues: {
      name: editData?.name ?? (null! as string),
      minSelect: editData?.minSelect ?? (null! as number),
      maxSelect: editData?.maxSelect ?? (null! as number | null),
      newModifierOptionsData: editData?.options.map((opt) => ({
        name: opt.name,
        priceDelta: opt.priceDelta,
      })) ?? ([] as { name: string; priceDelta: number }[]),
    },
    validators: {
      onSubmit: z.object({
        name: z.string({ error: "Name cannot be empty" }).min(1, "Name is required"),
        minSelect: z.int({ error: "Min select cannot be empty" }).nonnegative("Min select must be 0 or greater"),
        maxSelect: z.int().positive("Max select must be positive").nullable(),
        newModifierOptionsData: z
          .object({
            name: z.string().min(1, "Option name is required"),
            priceDelta: z.int(),
          })
          .array(),
      }),
    },
    onSubmitInvalid: ({ formApi }) => {
      const errors: Record<string, string> = {};
      for (const errorObj of formApi.state.errors) {
        if (typeof errorObj === "object" && errorObj !== null) {
          for (const [fieldPath, fieldErrs] of Object.entries(errorObj)) {
            if (!errors[fieldPath] && Array.isArray(fieldErrs)) {
              const firstError = fieldErrs[0];
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
      if (isEditMode) {
        await updateModifierGroupMutation.mutateAsync({
          id: editData.id,
          ...value,
        });
      } else {
        await createModifierGroupMutation.mutateAsync(value);
      }
      formApi.reset();
    },
  });

  const mutation = isEditMode
    ? updateModifierGroupMutation
    : createModifierGroupMutation;

  return {
    form,
    createModifierGroupMutation: mutation,
    deleteModifierGroupMutation,
    isEditMode,
    fieldErrors,
    clearFieldErrors,
  };
}

