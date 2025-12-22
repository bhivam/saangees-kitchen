import { createFileRoute } from "@tanstack/react-router";
import { CustomerMenuView } from "@/components/customer-menu-view";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/")({
  component: Index,
  async beforeLoad() {
    let session = await authClient.getSession();
    if (session.error || !session.data) {
      const { error } = await authClient.signIn.anonymous();
      if (error) throw new Error("Failed to do create anonymous session");
    }
  },
});

function Index() {
  return <CustomerMenuView />;
}

