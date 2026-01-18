import { ManualEntryView } from "@/components/orders/manual-entry-view";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/manual-entry")({
  component: PaymentPage,
});

function PaymentPage() {
  return (
    <div className="flex h-full w-full flex-col p-10">
      <h1 className="mb-6 text-4xl font-bold">Manual Entry</h1>
      <div className="flex-1 overflow-auto">
        <ManualEntryView />
      </div>
    </div>
  );
}

