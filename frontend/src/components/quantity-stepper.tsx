import { Minus, Plus } from "lucide-react";
import { Button } from "./ui/button";
import type { ReactNode } from "react";

export function QuantityStepper({
  value,
  onReduce,
  onIncrease,
  reduceDisabled,
  increaseDisabled,
  reduceIcon,
}: {
  value: number;
  onReduce: () => void;
  onIncrease: () => void;
  reduceDisabled: boolean;
  increaseDisabled: boolean;
  reduceIcon?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 border rounded-md">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onReduce}
        disabled={reduceDisabled}
      >
        {reduceIcon ?? <Minus className="size-4" />}
      </Button>
      <span className="w-8 text-center font-medium">{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onIncrease}
        disabled={increaseDisabled}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}

