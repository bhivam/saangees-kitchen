import { useTRPC } from "@/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CentsInput } from "@/components/ui/cents-input";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/utils";

export function PaymentView() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [paymentCents, setPaymentCents] = useState(0);

  const paymentQuery = useQuery(trpc.orders.getPaymentView.queryOptions());

  const updatePaymentMutation = useMutation({
    ...trpc.orders.updatePayment.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.orders.getPaymentView.queryKey(),
      });
      setEditingOrderId(null);
      setPaymentCents(0);
    },
  });

  const markPaidInFullMutation = useMutation({
    ...trpc.orders.markPaidInFull.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.orders.getPaymentView.queryKey(),
      });
    },
  });

  const handleUpdatePayment = (orderId: string, total: number) => {
    if (paymentCents > total) {
      alert(`Amount cannot exceed ${formatCents(total)}`);
      return;
    }
    updatePaymentMutation.mutate({ orderId, centsPaid: paymentCents });
  };

  const handleMarkPaidInFull = (orderId: string) => {
    markPaidInFullMutation.mutate({ orderId });
  };

  const handleClearPayment = (orderId: string) => {
    updatePaymentMutation.mutate({ orderId, centsPaid: 0 });
  };

  if (paymentQuery.isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-200" />
        ))}
      </div>
    );
  }

  const orders = paymentQuery.data || [];
  const filteredOrders = showUnpaidOnly
    ? orders.filter((o) => !o.isPaidInFull)
    : orders;

  // Sort: unpaid first, then by date
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (a.isPaidInFull !== b.isPaidInFull) {
      return a.isPaidInFull ? 1 : -1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showUnpaidOnly}
            onChange={(e) => setShowUnpaidOnly(e.target.checked)}
            className="rounded"
          />
          Show unpaid only
        </label>
        <span className="text-muted-foreground text-sm">
          {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
        </span>
      </div>

      {sortedOrders.length === 0 && (
        <div className="text-muted-foreground">
          {showUnpaidOnly ? "All orders are paid" : "No orders"}
        </div>
      )}

      <div className="space-y-4">
        {sortedOrders.map((order) => (
          <Card
            key={order.orderId}
            className={cn(order.isPaidInFull && "bg-green-50 border-green-200")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {order.isPaidInFull && <Check className="h-5 w-5 text-green-600" />}
                {order.displayName}
              </CardTitle>
              <CardDescription>
                Order #{order.orderId.slice(0, 8)} - {" "}
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </CardDescription>
              {order.isPaidInFull && (
                <CardAction>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleClearPayment(order.orderId)}
                    disabled={updatePaymentMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                    Revert to Unpaid
                  </Button>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <div className="text-muted-foreground text-sm">Total</div>
                  <div className="font-semibold">{formatCents(order.total)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-sm">Paid</div>
                  <div className="font-semibold text-green-600">
                    {formatCents(order.centsPaid)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-sm">Owed</div>
                  <div
                    className={cn(
                      "font-semibold",
                      order.amountOwed > 0 ? "text-red-600" : "text-green-600"
                    )}
                  >
                    {formatCents(order.amountOwed)}
                  </div>
                </div>

                {!order.isPaidInFull && (
                  <div className="ml-auto flex items-center gap-2">
                    {editingOrderId === order.orderId ? (
                      <>
                        <CentsInput
                          value={paymentCents}
                          onChange={setPaymentCents}
                          max={order.total}
                          className="w-24"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUpdatePayment(order.orderId, order.total)}
                          disabled={updatePaymentMutation.isPending}
                        >
                          Update
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingOrderId(null);
                            setPaymentCents(0);
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingOrderId(order.orderId);
                            setPaymentCents(order.centsPaid);
                          }}
                        >
                          Enter Amount
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleMarkPaidInFull(order.orderId)}
                          disabled={markPaidInFullMutation.isPending}
                        >
                          Paid in Full
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
