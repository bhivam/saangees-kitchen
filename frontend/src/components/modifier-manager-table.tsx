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
import { AddModifierDialog } from "./add-modifier-dialog";
import type { ModifierGroupResult } from "@/hooks/use-add-modifier-form";
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

export function ModifierManagerTable({ search }: { search: string }) {
  const [editGroup, setEditGroup] = useState<ModifierGroupResult | null>(null);
  const [deleteGroup, setDeleteGroup] = useState<ModifierGroupResult | null>(
    null,
  );

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const modifierGroupsQuery = useQuery(
    trpc.modifierGroups.getModifierGroups.queryOptions(),
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

  const filteredGroups = useMemo(() => {
    if (!modifierGroupsQuery.data) return [];
    const query = search.toLowerCase().trim();
    if (!query) return modifierGroupsQuery.data;
    return modifierGroupsQuery.data.filter(
      (group) =>
        group.name.toLowerCase().includes(query) ||
        group.options.some((opt) => opt.name.toLowerCase().includes(query)),
    );
  }, [modifierGroupsQuery.data, search]);

  if (modifierGroupsQuery.isLoading) return "loading...";

  if (modifierGroupsQuery.isError || !modifierGroupsQuery.data)
    return "Error :(";

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/6">Name</TableHead>
            <TableHead className="w-2/3">Options</TableHead>
            <TableHead className="w-1/12" />
            <TableHead className="w-1/12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredGroups.map((group) => (
            <TableRow key={group.id}>
              <TableCell>{group.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {group.options.map((opt) => opt.name).join(", ")}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditGroup(group)}
                >
                  <Edit />
                </Button>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteGroup(group)}
                >
                  <Trash />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <AddModifierDialog
        open={editGroup !== null}
        onOpenChange={(open) => !open && setEditGroup(null)}
        editData={editGroup ?? undefined}
        onCreated={() => setEditGroup(null)}
      />
      <AlertDialog
        open={deleteGroup !== null}
        onOpenChange={(open) => !open && setDeleteGroup(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Modifier Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteGroup?.name}"? This will
              also delete all options in this group. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteGroup) {
                  deleteModifierGroupMutation.mutate({ id: deleteGroup.id });
                  setDeleteGroup(null);
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

