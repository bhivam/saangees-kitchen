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
} from "../ui/table";
import { Button } from "../ui/button";
import { Edit, Trash } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { toast } from "sonner";
import { formatCents } from "@/lib/utils";
import { AddManualOrderDialog } from "./add-manual-order-dialog";
import type { RouterOutputs } from "@/trpc";

type Order = RouterOutputs["orders"]["getOrders"][number];

export function ManualEntryTable({ search }: { search: string }) {
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<Order | null>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const ordersQuery = useQuery(trpc.orders.getOrders.queryOptions());

  const deleteOrderMutation = useMutation(
    trpc.orders.deleteOrder.mutationOptions({
      onSettled: (result, error) => {
        if (error || !result) {
          toast.error("Failed to delete order.", {
            position: "bottom-center",
          });
          return;
        }

        queryClient.setQueryData(
          trpc.orders.getOrders.queryKey(),
          (prev) => prev?.filter((o) => o.id !== result.orderId) ?? [],
        );

        toast.success("Order deleted.", { position: "bottom-center" });
      },
    }),
  );

  const filteredOrders = useMemo(() => {
    if (!ordersQuery.data) return [];
    const query = search.toLowerCase().trim();
    if (!query) return ordersQuery.data;
    return ordersQuery.data.filter(
      (order) =>
        order.user.name.toLowerCase().includes(query) ||
        order.user.phoneNumber?.toLowerCase().includes(query),
    );
  }, [ordersQuery.data, search]);

  if (ordersQuery.isLoading) return <div className="p-4">Loading...</div>;

  if (ordersQuery.isError || !ordersQuery.data)
    return <div className="p-4 text-red-500">Error loading orders</div>;

  if (filteredOrders.length === 0) {
    return (
      <div className="p-4 text-muted-foreground">
        {search ? "No orders match your search" : "No orders yet"}
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/5">User</TableHead>
            <TableHead className="w-1/5">Date Submitted</TableHead>
            <TableHead className="w-1/6">Total</TableHead>
            <TableHead className="w-1/6">Type</TableHead>
            <TableHead className="w-1/12" />
            <TableHead className="w-1/12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredOrders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{order.user.name}</span>
                  {order.user.phoneNumber && (
                    <span className="text-sm text-muted-foreground">
                      {order.user.phoneNumber}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </TableCell>
              <TableCell>{formatCents(order.total ?? 0)}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    order.isManual
                      ? "bg-blue-100 text-blue-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {order.isManual ? "Manual" : "Customer"}
                </span>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditOrder(order)}
                >
                  <Edit />
                </Button>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteOrder(order)}
                >
                  <Trash />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <AddManualOrderDialog
        open={editOrder !== null}
        onOpenChange={(open: boolean) => !open && setEditOrder(null)}
        editData={editOrder ?? undefined}
      />
      <AlertDialog
        open={deleteOrder !== null}
        onOpenChange={(open) => !open && setDeleteOrder(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this order for{" "}
              {deleteOrder?.user.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteOrder) {
                  deleteOrderMutation.mutate({ orderId: deleteOrder.id });
                  setDeleteOrder(null);
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
