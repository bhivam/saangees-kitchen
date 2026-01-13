import { createFileRoute } from "@tanstack/react-router";
import { ItemManager } from "@/components/item-manager";

export const Route = createFileRoute("/dashboard/items")({
  component: ItemManager,
});
