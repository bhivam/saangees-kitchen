import { ManualEntry } from "@/components/orders/manual-entry";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/manual-entry")({
  component: ManualEntry,
});

