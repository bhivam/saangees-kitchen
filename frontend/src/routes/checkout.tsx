import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/hooks/use-auth";

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
// Add a phone number OTP that shows up if user not logged in
//   disable rest of form until this is completed
// Show current delivery settings and allow customers to edit them
// Payment method (cash/zelle, venmo, credit/debit)
// Cart Summary
// Subtotal
// Delivery Fee
// Payment Processing Fee & Taxes
// Place Order Button

function Checkout() {
  const { user } = useAuth();

  if (!user) {
    throw new Error("Impossible state: Must have at least anonymous user");
  }

  return "checkout";
}

