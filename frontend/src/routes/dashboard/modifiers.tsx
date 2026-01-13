import { createFileRoute } from "@tanstack/react-router";
import { ModifierManager } from "@/components/modifier-manager";

export const Route = createFileRoute("/dashboard/modifiers")({
  component: ModifierManager,
});
