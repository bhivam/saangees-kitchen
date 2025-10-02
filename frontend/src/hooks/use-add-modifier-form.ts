import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { toast } from "sonner";
import z from "zod";
import type { Dispatch, SetStateAction } from "react";

export function useAddModifierForm({
  setOpen,
}: {
  setOpen?: Dispatch<SetStateAction<boolean>>;
}) {
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
        setOpen?.(false);
      },
    }),
  );

  const form = useForm({
    defaultValues: {
      name: null! as string,
      minSelect: null! as number,
      maxSelect: null! as number | null,
      newModifierOptionsData: [] as {
        name: string;
        priceDelta: number;
      }[],
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(1),
        minSelect: z.int().nonnegative(),
        maxSelect: z.int().positive().nullable(),
        newModifierOptionsData: z
          .object({
            name: z.string().min(1),
            priceDelta: z.int(),
          })
          .array(),
      }),
    },
    onSubmit: async ({ value }) => {
      await createModifierGroupMutation.mutateAsync(value);
    },
  });

  return { form, createModifierGroupMutation };
}

