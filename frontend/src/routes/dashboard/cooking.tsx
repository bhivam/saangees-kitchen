import { createFileRoute } from "@tanstack/react-router";
import { CookingView } from "@/components/orders/cooking-view";

export const Route = createFileRoute("/dashboard/cooking")({
  component: CookingPage,
});

function CookingPage() {
  return (
    <div className="flex h-full w-full flex-col p-10">
      <h1 className="mb-6 text-4xl font-bold">Cooking</h1>
      <div className="flex-1 overflow-auto">
        <CookingView />
      </div>
    </div>
  );
}
