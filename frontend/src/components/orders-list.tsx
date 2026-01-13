import { useState } from "react";
import { cn } from "@/lib/utils";
import { CookingView } from "./orders/cooking-view";
import { BaggingView } from "./orders/bagging-view";
import { PaymentView } from "./orders/payment-view";

type Tab = "cooking" | "bagging" | "payment";

const tabs: { id: Tab; label: string }[] = [
  { id: "cooking", label: "Cooking" },
  { id: "bagging", label: "Bagging" },
  { id: "payment", label: "Payment" },
];

export function OrdersList() {
  const [activeTab, setActiveTab] = useState<Tab>("cooking");

  return (
    <div className="flex h-full w-full flex-col p-10">
      <h1 className="mb-6 text-4xl font-bold">Orders</h1>

      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === "cooking" && <CookingView />}
        {activeTab === "bagging" && <BaggingView />}
        {activeTab === "payment" && <PaymentView />}
      </div>
    </div>
  );
}
