import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

interface PhoneInputProps {
  onOTPSent: (phoneNumber: string) => void;
}

export function PhoneInput({ onOTPSent }: PhoneInputProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      toast.error("Please enter a phone number");
      return;
    }

    // Basic validation - starts with +, followed by digits
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      toast.error(
        "Please enter a valid phone number with country code (e.g., +1234567890)",
      );
      return;
    }

    setIsLoading(true);

    try {
      await authClient.phoneNumber.sendOtp({
        phoneNumber,
      });

      toast.success("OTP sent! Check backend console for code");
      onOTPSent(phoneNumber);
    } catch (error: any) {
      toast.error(error.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+1234567890"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          disabled={isLoading}
          autoFocus
        />
        <p className="text-sm text-muted-foreground">
          Include country code (e.g., +1 for US)
        </p>
        <p className="text-xs text-muted-foreground">
          Test admin numbers: +1234567890, +0987654321, +1111111111
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Sending..." : "Send OTP"}
      </Button>
    </form>
  );
}

