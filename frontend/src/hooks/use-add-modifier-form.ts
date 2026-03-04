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

const modifierGroupSchema = z
  .object({
    name: z
      .string({ error: "Name cannot be empty" })
      .min(1, "Name is required"),
    minSelect: z
      .int({ error: "Min select cannot be empty" })
      .nonnegative("Min select must be 0 or greater"),
    maxSelect: z.int().positive("Max select must be positive").nullable(),
    newModifierOptionsData: z
      .object({
        name: z.string().min(1, "Option name is required"),
        priceDelta: z.int(),
      })
      .array()
      .superRefine((options, ctx) => {
        const seen = new Set<string>();
        for (let i = 0; i < options.length; i++) {
          const normalized = options[i]!.name.trim().toLowerCase();
          if (seen.has(normalized)) {
            ctx.addIssue({
              code: "custom",
              message: "Duplicate option name.",
              path: [i, "name"],
            });
          }
          seen.add(normalized);
        }
      }),
  })
  .superRefine((data, ctx) => {
    if (data.maxSelect !== null && data.maxSelect < data.minSelect) {
      ctx.addIssue({
        code: "custom",
        message: "Max select must be greater than or equal to min select.",
        path: ["maxSelect"],
      });
    }
    const requiredCount = data.maxSelect ?? data.minSelect;
    if (data.newModifierOptionsData.length < requiredCount) {
      ctx.addIssue({
        code: "custom",
        message: `Need at least ${requiredCount} option(s).`,
        path: ["newModifierOptionsData"],
      });
    }
  });

function extractFieldErrors(
  formErrors: Array<unknown>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const errorObj of formErrors) {
    if (typeof errorObj === "object" && errorObj !== null) {
      for (const [fieldPath, fieldErrs] of Object.entries(errorObj)) {
        if (!errors[fieldPath] && Array.isArray(fieldErrs)) {
          const firstError = fieldErrs[0];
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
  return errors;
}

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
      onSubmit: modifierGroupSchema,
      onChange: modifierGroupSchema,
    },
    onSubmitInvalid: ({ formApi }) => {
      setFieldErrors(extractFieldErrors(formApi.state.errors));
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

