import { Input } from "./input";
import { cn } from "@/lib/utils";

interface CentsInputProps {
  /** Value in cents */
  value: number;
  /** Called with new value in cents */
  onChange: (cents: number) => void;
  /** Optional className for the input */
  className?: string;
  /** Optional max value in cents */
  max?: number;
  /** Optional callback when user interacts */
  onInteract?: () => void;
}

export function CentsInput({
  value,
  onChange,
  className,
  max,
  onInteract,
}: CentsInputProps) {
  const displayValue = `$${((value ?? 0) / 100).toFixed(2)}`;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = e.key;

    if (key === "Backspace") {
      e.preventDefault();
      onInteract?.();
      onChange(Math.trunc(value / 10));
      return;
    }

    if (/^\d$/.test(key)) {
      e.preventDefault();
      const digit = Number(key);
      const nextValue = value * 10 + digit;

      // Respect max if provided
      if (max !== undefined && nextValue > max) {
        return;
      }

      onInteract?.();
      onChange(nextValue);
      return;
    }

    // Let Tab/Arrows/etc. pass through
  };

  return (
    <Input
      className={cn("text-right", className)}
      value={displayValue}
      onKeyDown={handleKeyDown}
      readOnly
    />
  );
}
