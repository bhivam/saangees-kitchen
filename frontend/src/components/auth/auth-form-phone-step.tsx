import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { useAuthForm } from "@/hooks/use-auth-form";

interface AuthFormPhoneStepProps {
  form: ReturnType<typeof useAuthForm>["form"];
  isLoading: boolean;
  onSubmit: () => void;
}

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function getDigitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

export function AuthFormPhoneStep({
  form,
  isLoading,
  onSubmit,
}: AuthFormPhoneStepProps) {
  const [displayValue, setDisplayValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const digits = getDigitsOnly(displayValue);
  const isComplete = digits.length === 10;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const digitsOnly = getDigitsOnly(input);
    const formatted = formatPhoneNumber(digitsOnly);
    setDisplayValue(formatted);

    // Update form with full phone number format
    const fullPhoneNumber = digitsOnly.length === 10 ? `+1${digitsOnly}` : "";
    form.setFieldValue("phoneNumber", fullPhoneNumber);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isComplete) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <div
          className={`border-input bg-background flex h-10 w-full items-center rounded-md border ${
            isFocused ? "ring-ring ring-2 ring-offset-1" : ""
          } ${isLoading ? "opacity-50" : ""}`}
        >
          <span className="text-muted-foreground px-2 text-sm font-medium select-none">
            +1
          </span>
          <input
            id="phone"
            type="tel"
            placeholder="(555) 555-5555"
            value={displayValue}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={isLoading}
            autoFocus
            className="placeholder:text-muted-foreground h-full flex-1 bg-transparent px-3 text-sm outline-none disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || !isComplete}
      >
        {isLoading ? "Sending..." : "Send OTP"}
      </Button>
    </form>
  );
}
