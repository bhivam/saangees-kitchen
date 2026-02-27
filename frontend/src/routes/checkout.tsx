import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { X, Truck, MapPin } from "lucide-react";
import { FullPageSpinner } from "@/components/full-page-spinner";
import { AuthForm } from "@/components/auth/auth-form";
import { useCart } from "@/hooks/use-cart";
import { useTRPC } from "@/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { parseSkuId, type Cart } from "@/lib/cart";
import { formatDate, type MenuEntry } from "@/components/customer-menu-view";
import { formatCents } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { isDeliveryModifiable } from "@/lib/order-cutoffs";
import { AddressPickerDialog } from "@/components/address-picker-dialog";

const DELIVERY_FEE_CENTS = 500;

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
            specialInstructions: metadata?.specialInstructions,
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

  // Delivery state
  const [deliveryByDate, setDeliveryByDate] = useState<Record<string, boolean>>(
    {},
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  const { data: menuEntries, isLoading: menuLoading } = useQuery(
    trpc.menu.getWeekMenu.queryOptions(),
  );

  const hydratedItems = menuEntries
    ? hydrateCartFromMenu(cart, menuEntries)
    : [];

  // Get unique sorted dates from hydrated items
  const itemDates = [
    ...new Set(
      hydratedItems
        .map((item) => item.date)
        .filter((d): d is string => d !== null),
    ),
  ].sort();

  // Delivery queries
  const { data: existingDeliveryDates } = useQuery(
    trpc.delivery.getDeliveryDatesForUser.queryOptions(
      { dates: itemDates },
      { enabled: itemDates.length > 0 },
    ),
  );

  const { data: savedAddresses } = useQuery(
    trpc.delivery.getUserAddresses.queryOptions(),
  );

  // Derive selected address from savedAddresses
  const selectedAddress = savedAddresses?.find(
    (a) => a.addressId === selectedAddressId,
  );

  // Seed deliveryByDate from existing delivery dates once loaded
  useEffect(() => {
    if (existingDeliveryDates && existingDeliveryDates.length > 0) {
      setDeliveryByDate((prev) => {
        const next = { ...prev };
        for (const d of existingDeliveryDates) {
          if (!(d.date in next)) next[d.date] = true;
        }
        return next;
      });
    }
  }, [existingDeliveryDates]);

  // Seed selectedAddressId: existing delivery date's addressId → default → first
  useEffect(() => {
    if (selectedAddressId) return;

    // Try from existing delivery dates
    const fromDelivery = existingDeliveryDates?.find((d) => d.addressId);
    if (fromDelivery?.addressId) {
      setSelectedAddressId(fromDelivery.addressId);
      return;
    }

    // Try default address
    const defaultAddr = savedAddresses?.find((a) => a.isDefault);
    if (defaultAddr) {
      setSelectedAddressId(defaultAddr.addressId);
      return;
    }

    // Try first address
    if (savedAddresses && savedAddresses.length > 0) {
      setSelectedAddressId(savedAddresses[0].addressId);
    }
  }, [existingDeliveryDates, savedAddresses, selectedAddressId]);

  const createOrderMutation = useMutation(
    trpc.orders.createOrder.mutationOptions(),
  );

  const setDeliveryMutation = useMutation(
    trpc.delivery.setDeliveryForDates.mutationOptions(),
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

  const foodTotal = hydratedItems.reduce(
    (sum, item) => sum + item.totalPrice * item.quantity,
    0,
  );

  const alreadyScheduledDates = new Set(
    existingDeliveryDates?.map((d) => d.date) ?? [],
  );

  // Count newly-enabled delivery days (not already scheduled)
  const newDeliveryDates = itemDates.filter(
    (d) => deliveryByDate[d] && !alreadyScheduledDates.has(d),
  );
  const deliveryTotal = newDeliveryDates.length * DELIVERY_FEE_CENTS;
  const grandTotal = foodTotal + deliveryTotal;

  const anyDeliveryOn = itemDates.some((d) => deliveryByDate[d]);

  const isSubmitting =
    createOrderMutation.isPending || setDeliveryMutation.isPending;

  const placeOrderDisabled =
    isSubmitting ||
    hydratedItems.length === 0 ||
    (anyDeliveryOn && !selectedAddressId);

  const handleDeliveryToggle = (date: string, checked: boolean) => {
    setDeliveryByDate((prev) => ({ ...prev, [date]: checked }));
  };

  const handlePlaceOrder = async () => {
    const orderItems = hydratedItems.map((item) => ({
      menuEntryId: item.menuEntryId,
      quantity: item.quantity,
      modifierOptionIds: item.modifierOptionIds,
      specialInstructions: item.specialInstructions,
    }));

    // Create the order
    const orderData = await createOrderMutation.mutateAsync({
      items: orderItems,
    });

    // Set delivery for dates
    const enable = itemDates.filter(
      (d) => deliveryByDate[d] && !alreadyScheduledDates.has(d),
    );
    const disable = itemDates.filter(
      (d) => !deliveryByDate[d] && alreadyScheduledDates.has(d),
    );

    if (enable.length > 0 || disable.length > 0) {
      await setDeliveryMutation.mutateAsync({
        enable,
        disable,
        addressId: selectedAddressId!,
      });
    }

    setCart({ items: {} });
    setOrderSuccess({ orderId: orderData.orderId, total: grandTotal });
  };

  const hasAddresses = savedAddresses && savedAddresses.length > 0;

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
          const isAlreadyScheduled = alreadyScheduledDates.has(date);
          const isChecked = !!deliveryByDate[date];
          const canModify = isDeliveryModifiable(date);

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
                    <p className="text-sm text-gray-600">
                      Qty: {item.quantity}
                    </p>
                    {item.specialInstructions && (
                      <p className="text-sm italic text-gray-500">
                        Note: {item.specialInstructions}
                      </p>
                    )}
                  </div>
                  <p>{formatCents(item.totalPrice * item.quantity)}</p>
                </div>
              ))}

              {/* Delivery toggle */}
              <div className="mt-2 flex items-center gap-2">
                <Checkbox
                  id={`delivery-${date}`}
                  checked={isChecked}
                  disabled={!canModify || (isAlreadyScheduled && isChecked)}
                  onCheckedChange={(checked) =>
                    handleDeliveryToggle(date, checked === true)
                  }
                />
                <label
                  htmlFor={`delivery-${date}`}
                  className="flex items-center gap-1.5 text-sm"
                >
                  <Truck className="size-4" />
                  {isAlreadyScheduled && isChecked ? (
                    <span className="text-muted-foreground">
                      Delivery already scheduled — no charge
                    </span>
                  ) : isChecked ? (
                    <span>Delivery +{formatCents(DELIVERY_FEE_CENTS)}</span>
                  ) : !canModify ? (
                    <span className="text-muted-foreground">
                      Delivery cutoff passed
                    </span>
                  ) : (
                    <span>
                      Add delivery ({formatCents(DELIVERY_FEE_CENTS)})
                    </span>
                  )}
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {/* Address section */}
      {anyDeliveryOn && (
        <div className="mb-4 rounded-lg border p-4">
          <p className="mb-2 font-semibold">Delivery Address</p>
          {selectedAddress ? (
            <div className="flex items-center gap-3">
              <MapPin className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm">{selectedAddress.addressLine1}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedAddress.city}, {selectedAddress.state}{" "}
                  {selectedAddress.postalCode}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => setShowAddressPicker(true)}
              >
                Change
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowAddressPicker(true)}
            >
              <MapPin className="size-4 mr-2" />
              Add delivery address
            </Button>
          )}
        </div>
      )}

      {/* Totals */}
      <div className="border-t py-4">
        <div className="flex justify-between text-sm">
          <span>Food</span>
          <span>{formatCents(foodTotal)}</span>
        </div>
        {deliveryTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span>
              Delivery ({newDeliveryDates.length} day
              {newDeliveryDates.length !== 1 ? "s" : ""})
            </span>
            <span>{formatCents(deliveryTotal)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatCents(grandTotal)}</span>
        </div>
      </div>

      <Button
        onClick={handlePlaceOrder}
        disabled={placeOrderDisabled}
        className="w-full py-6 text-lg"
      >
        {isSubmitting ? "Placing Order..." : "Place Order"}
      </Button>

      <AddressPickerDialog
        open={showAddressPicker}
        onOpenChange={setShowAddressPicker}
        selectedAddressId={selectedAddressId}
        onSelect={setSelectedAddressId}
        startInAddMode={!hasAddresses}
      />
    </div>
  );
}
