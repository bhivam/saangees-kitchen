import { useEffect, useMemo, useState } from "react";
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
import { ArrowDown, ArrowUp, ArrowUpDown, Edit, Eye, Trash } from "lucide-react";
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";

type Order = RouterOutputs["orders"]["getOrders"][number];

type SortField = "user" | "date" | "total";
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE = 10;

function getPageNumbers(
  currentPage: number,
  totalPages: number,
): (number | "ellipsis")[] {
  const pages: (number | "ellipsis")[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);

    if (currentPage > 3) {
      pages.push("ellipsis");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("ellipsis");
    }

    pages.push(totalPages);
  }

  return pages;
}

export function ManualEntryTable({ search }: { search: string }) {
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<Order | null>(null);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);

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

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "user":
          cmp = a.user.name.localeCompare(b.user.name);
          break;
        case "date":
          cmp =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "total":
          cmp = (a.total ?? 0) - (b.total ?? 0);
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredOrders, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = sortedOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-4 w-4" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4" />
    );
  };

  if (ordersQuery.isLoading) return <div className="p-4">Loading...</div>;

  if (ordersQuery.isError || !ordersQuery.data)
    return <div className="p-4 text-red-500">Error loading orders</div>;

  if (sortedOrders.length === 0) {
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
            <TableHead className="w-1/5">
              <button
                className="flex items-center hover:text-foreground"
                onClick={() => handleSort("user")}
              >
                User
                <SortIcon field="user" />
              </button>
            </TableHead>
            <TableHead className="w-1/5">
              <button
                className="flex items-center hover:text-foreground"
                onClick={() => handleSort("date")}
              >
                Date Submitted
                <SortIcon field="date" />
              </button>
            </TableHead>
            <TableHead className="w-1/6">
              <button
                className="flex items-center hover:text-foreground"
                onClick={() => handleSort("total")}
              >
                Total
                <SortIcon field="total" />
              </button>
            </TableHead>
            <TableHead className="w-1/6">Type</TableHead>
            <TableHead className="w-1/12" />
            <TableHead className="w-1/12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedOrders.map((order) => (
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
                  onClick={() =>
                    order.isManual ? setEditOrder(order) : setViewOrder(order)
                  }
                >
                  {order.isManual ? <Edit /> : <Eye />}
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
      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={
                  currentPage === 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
            {getPageNumbers(currentPage, totalPages).map((page, idx) =>
              page === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => setCurrentPage(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className={
                  currentPage === totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
      <AddManualOrderDialog
        open={editOrder !== null}
        onOpenChange={(open: boolean) => !open && setEditOrder(null)}
        editData={editOrder ?? undefined}
      />
      <AddManualOrderDialog
        open={viewOrder !== null}
        onOpenChange={(open: boolean) => !open && setViewOrder(null)}
        editData={viewOrder ?? undefined}
        viewOnly
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
