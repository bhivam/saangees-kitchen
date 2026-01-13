import { useTRPC } from "@/trpc";
import { useQuery } from "@tanstack/react-query";
import { cn, toLocalDateString } from "@/lib/utils";

interface DateSelectorProps {
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
}

function getDateRange() {
  const today = new Date();
  const startDate = toLocalDateString(today);
  const future = new Date(today);
  future.setDate(future.getDate() + 7);
  const endDate = toLocalDateString(future);
  return { startDate, endDate };
}

function formatDateLabel(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) {
    return "Today";
  } else if (date.getTime() === tomorrow.getTime()) {
    return "Tomorrow";
  } else {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
}

export function DateSelector({ selectedDate, onDateSelect }: DateSelectorProps) {
  const trpc = useTRPC();
  const { startDate, endDate } = getDateRange();

  const datesQuery = useQuery(
    trpc.orders.getDatesWithOrders.queryOptions({
      startDate,
      endDate,
    })
  );

  if (datesQuery.isLoading) {
    return (
      <div className="flex gap-2">
        <div className="h-9 w-24 animate-pulse rounded-md bg-gray-200" />
        <div className="h-9 w-24 animate-pulse rounded-md bg-gray-200" />
      </div>
    );
  }

  const dates = datesQuery.data || [];

  if (dates.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">
        No orders in the next 7 days
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {dates.map((date) => (
        <button
          key={date}
          onClick={() => onDateSelect(date)}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            selectedDate === date
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          {formatDateLabel(date)}
        </button>
      ))}
    </div>
  );
}
