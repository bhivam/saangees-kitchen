import { useForm } from "@tanstack/react-form";
import { type Dispatch, type SetStateAction } from "react";
import { useTRPC } from "@/trpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import z from "zod";
import { toast } from "sonner";

export function useAddItemForm({
  setOpen,
}: {
  setOpen?: Dispatch<SetStateAction<boolean>>;
}) {
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
        setOpen?.(false);
      },
    }),
  );

  const form = useForm({
    defaultValues: {
      name: null! as string,
      basePrice: null! as number,
      description: null! as string,
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(1),
        basePrice: z.number().int().positive(),
        description: z.string().min(1),
      }),
    },
    onSubmit: async ({ value }) => {
      await createMenuItemMutation.mutateAsync(value);
    },
  });

  return { form, createMenuItemMutation };
}

