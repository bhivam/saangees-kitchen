import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { useAuthForm } from "@/hooks/use-auth-form";

interface AuthFormNameStepProps {
  form: ReturnType<typeof useAuthForm>["form"];
  isLoading: boolean;
  onSubmit: () => void;
}

export function AuthFormNameStep({
  form,
  isLoading,
  onSubmit,
}: AuthFormNameStepProps) {
  return (
    <form.Subscribe
      selector={(state) => [state.values.firstName, state.values.lastName]}
    >
      {([firstName, lastName]) => {
        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          if (firstName.trim() && lastName.trim()) {
            onSubmit();
          }
        };

        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => form.setFieldValue("firstName", e.target.value)}
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => form.setFieldValue("lastName", e.target.value)}
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !firstName.trim() || !lastName.trim()}
            >
              {isLoading ? "Saving..." : "Complete Signup"}
            </Button>
          </form>
        );
      }}
    </form.Subscribe>
  );
}
