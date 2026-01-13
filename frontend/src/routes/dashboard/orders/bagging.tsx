import { createFileRoute } from "@tanstack/react-router";
import { BaggingView } from "@/components/orders/bagging-view";

export const Route = createFileRoute("/dashboard/orders/bagging")({
  component: BaggingPage,
});

function BaggingPage() {
  return (
    <div className="flex h-full w-full flex-col p-10">
      <h1 className="mb-6 text-4xl font-bold">Bagging</h1>
      <div className="flex-1 overflow-auto">
        <BaggingView />
      </div>
    </div>
  );
}
