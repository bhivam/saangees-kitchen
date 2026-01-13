import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { FullPageSpinner } from "@/components/full-page-spinner";
import { AuthForm } from "@/components/auth/auth-form";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
  async beforeLoad() {
    let session = await authClient.getSession();
    if (session.error || !session.data) {
      const { error } = await authClient.signIn.anonymous();
      if (error) throw new Error("Failed to do create anonymous session");
    }
  },
});

// TODO
// Cart Summary
// Total
// Place Order Button

function Checkout() {
  const { user, isPending, isProfileIncomplete } = useAuth();
  const navigate = useNavigate();

  if (isPending) {
    return <FullPageSpinner>Loading Checkout...</FullPageSpinner>;
  }

  if (!user) {
    throw new Error("User must exist at least in anonymous state");
  }

  const showAuthForm = user.isAnonymous || isProfileIncomplete;

  if (showAuthForm) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <AuthForm
          title={{
            phone: "Sign in to checkout",
            otp: "Verify your number",
            name: "Complete your profile",
          }}
          description={{
            phone: "We need your phone number to complete this order",
            otp: "Enter the verification code we sent you",
            name: "Tell us your name to complete your order",
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col px-2">
      <div className="flex justify-between pt-2">
        <h3 className="text-3xl">Checkout</h3>
        <Button variant="ghost" onClick={() => navigate({ to: "/" })}>
          <X className="size-6" />
        </Button>
      </div>
    </div>
  );
}

