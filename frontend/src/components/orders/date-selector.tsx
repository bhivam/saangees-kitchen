import { useState } from "react";
import { cn, toLocalDateString } from "@/lib/utils";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";

interface DateSelectorProps {
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  className?: string;
}

function formatDateLabel(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const formatted = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  if (date.getTime() === today.getTime()) {
    return `Today, ${formatted}`;
  } else if (date.getTime() === tomorrow.getTime()) {
    return `Tomorrow, ${formatted}`;
  } else {
    return formatted;
  }
}

export function DateSelector({ selectedDate, onDateSelect, className }: DateSelectorProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("justify-start gap-2", className)}>
          <CalendarDays className="h-4 w-4" />
          {selectedDate ? formatDateLabel(selectedDate) : "Select a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <DayPicker
          mode="single"
          selected={
            selectedDate
              ? new Date(selectedDate + "T00:00:00")
              : undefined
          }
          onSelect={(date) => {
            if (date) {
              onDateSelect(toLocalDateString(date));
              setCalendarOpen(false);
            }
          }}
          className="rounded-lg"
        />
      </PopoverContent>
    </Popover>
  );
}
