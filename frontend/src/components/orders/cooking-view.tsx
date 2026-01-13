import { useTRPC } from "@/trpc";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { DateSelector } from "./date-selector";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toLocalDateString } from "@/lib/utils";

export function CookingView() {
  const trpc = useTRPC();
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

  const cookingQuery = useQuery({
    ...trpc.orders.getCookingView.queryOptions({
      date: selectedDate || "",
    }),
    enabled: !!selectedDate,
  });

  return (
    <div className="space-y-6">
      <DateSelector selectedDate={selectedDate} onDateSelect={setSelectedDate} />

      {!selectedDate && (
        <div className="text-muted-foreground">Select a date to view cooking requirements</div>
      )}

      {selectedDate && cookingQuery.isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      )}

      {selectedDate && cookingQuery.data && cookingQuery.data.length === 0 && (
        <div className="text-muted-foreground">No orders for this date</div>
      )}

      {selectedDate && cookingQuery.data && cookingQuery.data.length > 0 && (
        <div className="space-y-4">
          {cookingQuery.data.map((item) => (
            <Card key={item.menuItemId}>
              <CardHeader>
                <CardTitle>{item.menuItemName}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {item.variants.map((variant, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="font-medium">{variant.totalQuantity} x</span>
                      <span className="text-muted-foreground">
                        {variant.modifierDisplay}
                      </span>
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
