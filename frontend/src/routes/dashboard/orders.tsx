import { createFileRoute } from "@tanstack/react-router";
import { OrdersList } from "@/components/orders-list";

export const Route = createFileRoute("/dashboard/orders")({
  component: OrdersList,
});
