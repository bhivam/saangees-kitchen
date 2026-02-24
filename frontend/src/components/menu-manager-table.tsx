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
import { AddItemDialog } from "./add-item-dialog";
import type { MenuItemResult } from "@/hooks/use-add-item-form";
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

export function MenuManagerTable({ search }: { search: string }) {
  const [editItem, setEditItem] = useState<MenuItemResult | null>(null);
  const [deleteItem, setDeleteItem] = useState<MenuItemResult | null>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const menuItemsQuery = useQuery(trpc.menuItems.getMenuItems.queryOptions());

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
          (prev) => prev?.filter((i) => i.id !== result.id) ?? [],
        );

        toast.success("Menu item deleted.", { position: "bottom-center" });
      },
    }),
  );

  const filteredItems = useMemo(() => {
    if (!menuItemsQuery.data) return [];
    const query = search.toLowerCase().trim();
    if (!query) return menuItemsQuery.data;
    return menuItemsQuery.data.filter((item) =>
      item.name.toLowerCase().includes(query),
    );
  }, [menuItemsQuery.data, search]);

  if (menuItemsQuery.isLoading) return "loading...";

  if (menuItemsQuery.isError || !menuItemsQuery.data) return "Error :(";

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/6">Name</TableHead>
            <TableHead className="w-2/3">Price</TableHead>
            <TableHead className="w-1/12" />
            <TableHead className="w-1/12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>${(item.basePrice / 100).toFixed(2)}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditItem(item)}
                >
                  <Edit />
                </Button>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteItem(item)}
                >
                  <Trash />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <AddItemDialog
        open={editItem !== null}
        onOpenChange={(open) => !open && setEditItem(null)}
        editData={editItem ?? undefined}
        onCreated={() => setEditItem(null)}
      />
      <AlertDialog
        open={deleteItem !== null}
        onOpenChange={(open) => !open && setDeleteItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Menu Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteItem?.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteItem) {
                  deleteMenuItemMutation.mutate({ id: deleteItem.id });
                  setDeleteItem(null);
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
