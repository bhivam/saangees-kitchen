import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { formatCents } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/my-orders")({
  component: MyOrders,
  async beforeLoad() {
    const session = await authClient.getSession();
    if (session.error || !session.data?.user) {
      throw redirect({ to: "/login" });
    }
    if (session.data.user.isAnonymous) {
      throw redirect({ to: "/login" });
    }
  },
});

function MyOrders() {
  const navigate = useNavigate();
  const trpc = useTRPC();

  const { data, isLoading } = useQuery(trpc.orders.getMyOrders.queryOptions());

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  const hasNoOrders =
    !data ||
    (data.thisWeek.ordersByDate.length === 0 &&
      data.pastWeeks.orderCount === 0);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex justify-between px-4 pt-4">
        <h3 className="text-3xl">My Orders</h3>
        <Button variant="ghost" onClick={() => navigate({ to: "/" })}>
          <X className="size-6" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col px-4 py-4">
        {hasNoOrders ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-lg text-muted-foreground mb-4">
              You haven't placed any orders yet
            </p>
            <Button variant="link" onClick={() => navigate({ to: "/" })}>
              Browse the menu
            </Button>
          </div>
        ) : (
          <>
            {/* Balance summary - compact */}
            <div className="mb-6">
              <div className="flex justify-between items-baseline">
                <span className="text-muted-foreground">You owe</span>
                <span className="text-3xl font-bold">
                  {formatCents(data.grandTotalOwed)}
                </span>
              </div>
              <div className="flex justify-end gap-4 text-sm text-muted-foreground mt-1">
                {data.thisWeek.totalPaid > 0 && (
                  <span>Paid: {formatCents(data.thisWeek.totalPaid)}</span>
                )}
                {data.pastWeeks.totalOwed > 0 && (
                  <span>Past weeks: {formatCents(data.pastWeeks.totalOwed)}</span>
                )}
              </div>
            </div>

            {/* This week's orders */}
            {data.thisWeek.ordersByDate.length > 0 ? (
              <div className="space-y-4">
                {data.thisWeek.ordersByDate.map((dayData) => (
                  <div key={dayData.date}>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {dayData.dayLabel}
                    </h4>
                    <div className="space-y-1">
                      {dayData.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-baseline py-1"
                        >
                          <div className="flex-1 min-w-0">
                            <span>
                              {item.quantity}x {item.menuItemName}
                            </span>
                            {item.modifiers.length > 0 && (
                              <span className="text-muted-foreground ml-1">
                                ({item.modifiers.map((m) => m.name).join(", ")})
                              </span>
                            )}
                          </div>
                          <span className="ml-4 tabular-nums">
                            {formatCents(item.lineTotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              data.pastWeeks.orderCount > 0 && (
                <p className="text-muted-foreground">No orders this week</p>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
