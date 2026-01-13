import { useTRPC } from "@/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { DateSelector } from "./date-selector";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn, toLocalDateString } from "@/lib/utils";

export function BaggingView() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Get available dates first
  const today = new Date();
  const startDate = toLocalDateString(today);
  const future = new Date(today);
  future.setDate(future.getDate() + 7);
  const endDate = toLocalDateString(future);

  const datesQuery = useQuery(
    trpc.orders.getDatesWithOrders.queryOptions({
      startDate,
      endDate,
    })
  );

  // Auto-select first date when available
  useEffect(() => {
    if (datesQuery.data && datesQuery.data.length > 0 && !selectedDate) {
      setSelectedDate(datesQuery.data[0]);
    }
  }, [datesQuery.data, selectedDate]);

  const baggingQuery = useQuery({
    ...trpc.orders.getBaggingView.queryOptions({
      date: selectedDate || "",
    }),
    enabled: !!selectedDate,
  });

  const markBaggedMutation = useMutation({
    ...trpc.orders.markPersonBagged.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.orders.getBaggingView.queryKey({ date: selectedDate || "" }),
      });
    },
  });

  const unmarkBaggedMutation = useMutation({
    ...trpc.orders.unmarkPersonBagged.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.orders.getBaggingView.queryKey({ date: selectedDate || "" }),
      });
    },
  });

  const handleToggleBagged = (userId: string, allBagged: boolean) => {
    if (!selectedDate) return;

    if (allBagged) {
      unmarkBaggedMutation.mutate({ userId, date: selectedDate });
    } else {
      markBaggedMutation.mutate({ userId, date: selectedDate });
    }
  };

  return (
    <div className="space-y-6">
      <DateSelector selectedDate={selectedDate} onDateSelect={setSelectedDate} />

      {!selectedDate && (
        <div className="text-muted-foreground">Select a date to view bagging list</div>
      )}

      {selectedDate && baggingQuery.isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      )}

      {selectedDate && baggingQuery.data && baggingQuery.data.length === 0 && (
        <div className="text-muted-foreground">No orders for this date</div>
      )}

      {selectedDate && baggingQuery.data && baggingQuery.data.length > 0 && (
        <div className="space-y-4">
          {baggingQuery.data.map((person) => (
            <Card
              key={person.userId}
              className={cn(person.allBagged && "bg-green-50 border-green-200")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {person.allBagged && <Check className="h-5 w-5 text-green-600" />}
                  {person.displayName}
                </CardTitle>
                <CardAction>
                  <Button
                    variant={person.allBagged ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleToggleBagged(person.userId, person.allBagged)}
                    disabled={
                      markBaggedMutation.isPending || unmarkBaggedMutation.isPending
                    }
                  >
                    {person.allBagged ? "Bagged" : "Mark Bagged"}
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {person.items.map((item, idx) => (
                    <li
                      key={`${item.menuItemName}-${item.modifiers}-${idx}`}
                      className={cn(
                        "flex items-center gap-2",
                        item.allBagged && "text-muted-foreground line-through"
                      )}
                    >
                      <span className="font-medium">{item.quantity} x</span>
                      <span>{item.menuItemName}</span>
                      {item.modifiers && (
                        <span className="text-muted-foreground">- {item.modifiers}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
