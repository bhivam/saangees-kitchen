import { createFileRoute } from "@tanstack/react-router";
import { ComboManager } from "@/components/combo-manager";

export const Route = createFileRoute("/dashboard/combos")({
  component: ComboManager,
});
