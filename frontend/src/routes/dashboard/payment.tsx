import { createFileRoute } from "@tanstack/react-router";
import { PaymentTable } from "@/components/orders/payment-table";

export const Route = createFileRoute("/dashboard/payment")({
  component: PaymentPage,
});

function PaymentPage() {
  return (
    <div className="flex h-full w-full flex-col p-10">
      <h1 className="mb-6 text-4xl font-bold">Payment</h1>
      <div className="flex-1 overflow-auto">
        <PaymentTable />
      </div>
    </div>
  );
}

