import { useMemo, useState } from "react";
import { useTRPC } from "@/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Button } from "./ui/button";
import { Edit, Trash } from "lucide-react";
import { AddComboDialog } from "./add-combo-dialog";
import type { ComboResult } from "@/hooks/use-add-combo-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { toast } from "sonner";

export function ComboManagerTable({ search }: { search: string }) {
  const [editCombo, setEditCombo] = useState<ComboResult | null>(null);
  const [deleteCombo, setDeleteCombo] = useState<ComboResult | null>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const combosQuery = useQuery(trpc.combos.getCombos.queryOptions());

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

  const filteredCombos = useMemo(() => {
    if (!combosQuery.data) return [];
    const query = search.toLowerCase().trim();
    if (!query) return combosQuery.data;
    return combosQuery.data.filter((combo) =>
      combo.name.toLowerCase().includes(query),
    );
  }, [combosQuery.data, search]);

  if (combosQuery.isLoading) return "loading...";

  if (combosQuery.isError || !combosQuery.data) return "Error :(";

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/4">Name</TableHead>
            <TableHead className="w-1/6">Discount</TableHead>
            <TableHead className="w-1/3">Items</TableHead>
            <TableHead className="w-1/12" />
            <TableHead className="w-1/12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCombos.map((combo) => (
            <TableRow key={combo.id}>
              <TableCell>{combo.name}</TableCell>
              <TableCell>
                ${(combo.discountAmount / 100).toFixed(2)}
              </TableCell>
              <TableCell>
                {combo.comboItems
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((ci) => ci.menuItem.name)
                  .join(", ")}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditCombo(combo)}
                >
                  <Edit />
                </Button>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteCombo(combo)}
                >
                  <Trash />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <AddComboDialog
        open={editCombo !== null}
        onOpenChange={(open) => !open && setEditCombo(null)}
        editData={editCombo ?? undefined}
      />
      <AlertDialog
        open={deleteCombo !== null}
        onOpenChange={(open) => !open && setDeleteCombo(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Combo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteCombo?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteCombo) {
                  deleteComboMutation.mutate({ id: deleteCombo.id });
                  setDeleteCombo(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
