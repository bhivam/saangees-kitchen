import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { useAuthForm } from "@/hooks/use-auth-form";

interface AuthFormOTPStepProps {
  form: ReturnType<typeof useAuthForm>["form"];
  phoneNumber: string;
  isLoading: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

export function AuthFormOTPStep({
  form,
  phoneNumber,
  isLoading,
  onSubmit,
  onBack,
}: AuthFormOTPStepProps) {
  return (
    <form.Subscribe selector={(state) => [state.values.otp]}>
      {([otp]) => {
        const handleOTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const value = e.target.value.replace(/\D/g, "").slice(0, 6);
          form.setFieldValue("otp", value);
        };

        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          if (otp.length === 6) {
            onSubmit();
          }
        };

        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="123456"
                value={otp}
                onChange={handleOTPChange}
                disabled={isLoading}
                autoFocus
                maxLength={6}
              />
              <p className="text-sm text-muted-foreground">
                Sent to {phoneNumber}
              </p>
            </div>

            <div className="space-y-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || otp.length !== 6}
              >
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
      }}
    </form.Subscribe>
  );
}
