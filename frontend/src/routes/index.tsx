import { createFileRoute } from "@tanstack/react-router";
import { CustomerMenuView } from "@/components/customer-menu-view";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return <CustomerMenuView />;
}
