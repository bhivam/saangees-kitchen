import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { FullPageSpinner } from "@/components/full-page-spinner";
import { AuthForm } from "@/components/auth/auth-form";
import { useCart } from "@/hooks/use-cart";
import { useTRPC } from "@/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { parseSkuId, type Cart } from "@/lib/cart";
import {
  formatDate,
  type MenuEntry,
} from "@/components/customer-menu-view";
import { formatCents } from "@/lib/utils";
import { useState } from "react";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
  async beforeLoad() {
    const session = await authClient.getSession();
    if (session.error || !session.data) {
      const { error } = await authClient.signIn.anonymous();
      if (error) throw new Error("Failed to do create anonymous session");
    }
  },
});

function hydrateCartFromMenu(cart: Cart, menuEntries: MenuEntry[]) {
  const hydratedItems = Object.entries(cart.items).flatMap(
    ([skuId, metadata]) => {
      try {
        const { menuEntryId, itemId, modifierGroups } = parseSkuId(skuId);

        const entry = menuEntries.find((entry) => entry.id === menuEntryId);

        if (!entry) return [];

        if (entry.menuItem.id !== itemId) return [];

        let totalPrice = entry.menuItem.basePrice;

        const selectedModifierOptionIds: string[] = [];

        for (const [groupId, optionIds] of Object.entries(modifierGroups)) {
          const menuGroup = entry.menuItem.modifierGroups.find(
            (mg) => mg.groupId === groupId,
          );

          if (!menuGroup) return [];

          for (const optionId of optionIds) {
            const option = menuGroup.modifierGroup.options.find(
              (o) => o.id === optionId,
            );

            if (!option) return [];

            totalPrice += option.priceDelta;
            selectedModifierOptionIds.push(optionId);
          }
        }

        return [
          {
            skuId,
            menuEntryId,
            date: entry.date,
            name: entry.menuItem.name,
            totalPrice,
            modifierOptionIds: selectedModifierOptionIds,
            quantity: metadata?.quantity ?? 1,
          },
        ];
      } catch {
        return [];
      }
    },
  );

  return hydratedItems;
}

function Checkout() {
  const { user, isPending, isProfileIncomplete } = useAuth();
  const navigate = useNavigate();
  const { cart, setCart } = useCart();
  const trpc = useTRPC();

  const [orderSuccess, setOrderSuccess] = useState<{
    orderId: string;
    total: number;
  } | null>(null);

  const { data: menuEntries, isLoading: menuLoading } = useQuery(
    trpc.menu.getWeekMenu.queryOptions(),
  );

  const createOrderMutation = useMutation(
    trpc.orders.createOrder.mutationOptions({
      onSuccess: (data) => {
        setCart({ items: {} });
        setOrderSuccess(data);
      },
    }),
  );

  if (isPending || menuLoading) {
    return <FullPageSpinner>Loading Checkout...</FullPageSpinner>;
  }

  if (!user) {
    throw new Error("User must exist at least in anonymous state");
  }

  const showAuthForm = user.isAnonymous || isProfileIncomplete;

  if (showAuthForm) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <AuthForm
          title={{
            phone: "Sign in to checkout",
            otp: "Verify your number",
            name: "Complete your profile",
          }}
          description={{
            phone: "We need your phone number to complete this order",
            otp: "Enter the verification code we sent you",
            name: "Tell us your name to complete your order",
          }}
        />
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <h2 className="mb-4 text-2xl font-bold">Order Placed!</h2>
        <p className="mb-2">Order ID: {orderSuccess.orderId}</p>
        <p className="mb-6">Total: {formatCents(orderSuccess.total)}</p>
        <Button onClick={() => navigate({ to: "/" })}>Back to Menu</Button>
      </div>
    );
  }

  const hydratedItems = menuEntries ? hydrateCartFromMenu(cart, menuEntries) : [];
  const total = hydratedItems.reduce(
    (sum, item) => sum + item.totalPrice * item.quantity,
    0,
  );

  // Get unique sorted dates from hydrated items
  const itemDates = [
    ...new Set(hydratedItems.map((item) => item.date).filter((d): d is string => d !== null)),
  ].sort();

  const handlePlaceOrder = () => {
    const orderItems = hydratedItems.map((item) => ({
      menuEntryId: item.menuEntryId,
      quantity: item.quantity,
      modifierOptionIds: item.modifierOptionIds,
    }));
    createOrderMutation.mutate({ items: orderItems });
  };

  return (
    <div className="flex flex-col px-2">
      <div className="flex justify-between pt-2">
        <h3 className="text-3xl">Checkout</h3>
        <Button variant="ghost" onClick={() => navigate({ to: "/" })}>
          <X className="size-6" />
        </Button>
      </div>

      <div className="py-4">
        {itemDates.map((date) => {
          const itemsForDate = hydratedItems.filter(
            (item) => item.date === date,
          );

          return (
            <div key={date} className="mb-4">
              <p className="text-lg font-bold">{formatDate(date)}</p>
              {itemsForDate.map((item) => (
                <div
                  key={item.skuId}
                  className="flex justify-between border-b py-2"
                >
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                  </div>
                  <p>{formatCents(item.totalPrice * item.quantity)}</p>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between border-t py-4 text-lg font-bold">
        <span>Total</span>
        <span>{formatCents(total)}</span>
      </div>

      <Button
        onClick={handlePlaceOrder}
        disabled={createOrderMutation.isPending || hydratedItems.length === 0}
        className="w-full py-6 text-lg"
      >
        {createOrderMutation.isPending ? "Placing Order..." : "Place Order"}
      </Button>
    </div>
  );
}

