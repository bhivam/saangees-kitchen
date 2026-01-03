import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

interface OTPVerifyProps {
  phoneNumber: string;
  onBack: () => void;
}

export function OTPVerify({ phoneNumber, onBack }: OTPVerifyProps) {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      toast.error("Please enter the OTP code");
      return;
    }

    setIsLoading(true);

    try {
      const result = await authClient.phoneNumber.verify({
        phoneNumber,
        code,
      });

      if (result.data?.token) {
        toast.success("Login successful!");
        window.location.href = "/";
      } else {
        throw new Error("Login failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Invalid OTP code");
      console.error("OTP verify error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Input
          id="otp"
          type="text"
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={isLoading}
          autoFocus
          maxLength={6}
        />
        <p className="text-sm text-muted-foreground">rent to </p>
      </div>

      <div className="space-y-2">
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Verifying..." : "Verify OTP"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onBack}
          disabled={isLoading}
        >
          Use Different Number
        </Button>
      </div>
    </form>
  );
}

