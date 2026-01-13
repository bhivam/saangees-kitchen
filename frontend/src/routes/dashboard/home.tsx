import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/home")({
  component: DashboardHome,
});

function DashboardHome() {
  return (
    <div className="w-full h-full flex flex-col p-10">
      <h1 className="text-4xl font-bold">Home</h1>
    </div>
  );
}
