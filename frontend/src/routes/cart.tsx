import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useCart } from "@/hooks/use-cart";
import { parseSkuId, type Cart } from "@/lib/cart";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import {
  formatDate,
  getWeekDates,
  type MenuEntry,
} from "@/components/customer-menu-view";
import { formatCents } from "@/lib/utils";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/quantity-stepper";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AddItemDialogContent } from "@/components/add-item-cart-dialog";

export const Route = createFileRoute("/cart")({
  component: Cart,
  async beforeLoad() {
    let session = await authClient.getSession();
    if (session.error || !session.data) {
      const { error } = await authClient.signIn.anonymous();
      if (error) throw new Error("Failed to do create anonymous session");
    }
  },
});

type EditingItem = {
  skuId: string;
  menuEntry: MenuEntry;
  quantity: number;
  modifierSelections: Record<string, string[]>;
};

function Cart() {
  const { cart, setCart, updateCartItemQuantity, removeCartItem } = useCart();
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);

  const trpc = useTRPC();

  const today = new Date();
  const allDates = getWeekDates(today, 7);

  const { data: menuEntries, isLoading } = useQuery(
    trpc.menu.getByDateRange.queryOptions({
      dates: allDates,
    }),
  );

  function hydrateCartFromMenu(cart: Cart, menuEntries: MenuEntry[]) {
    const validSkuIds = new Set<string>();

    const hydratedItems = Object.entries(cart.items).flatMap(
      ([skuId, metadata]) => {
        try {
          const { menuEntryId, itemId, modifierGroups } = parseSkuId(skuId);

          const entry = menuEntries.find((entry) => entry.id === menuEntryId);

          if (!entry) {
            console.warn(
              `Failed to hydrate data for menu entry ${menuEntryId}.`,
            );
            return [];
          }

          // Verify itemId matches (sanity check)
          if (entry.menuItem.id !== itemId) {
            console.warn(`Item ID mismatch in SKU ${skuId}`);
            return [];
          }

          let totalPrice = entry.menuItem.basePrice;

          const prunedModifierGroups: {
            groupId: string;
            modifierGroup: {
              id: string;
              name: string;
              options: {
                id: string;
                name: string;
                priceDelta: number;
              }[];
            };
          }[] = [];

          for (const [groupId, optionIds] of Object.entries(modifierGroups)) {
            const menuGroup = entry.menuItem.modifierGroups.find(
              (mg) => mg.groupId === groupId,
            );

            if (!menuGroup) {
              console.warn(
                `Modifier group ${groupId} not found for item ${itemId}.`,
              );
              return [];
            }

            const selectedOptions: Array<{
              id: string;
              name: string;
              priceDelta: number;
            }> = [];

            for (const optionId of optionIds) {
              const option = menuGroup.modifierGroup.options.find(
                (o) => o.id === optionId,
              );

              if (!option) {
                console.warn(
                  `Modifier option ${optionId} not found in group ${groupId} for item ${itemId}.`,
                );
                return [];
              }

              totalPrice += option.priceDelta;

              selectedOptions.push({
                id: option.id,
                name: option.name,
                priceDelta: option.priceDelta,
              });
            }

            prunedModifierGroups.push({
              groupId: menuGroup.groupId,
              modifierGroup: {
                id: menuGroup.modifierGroup.id,
                name: menuGroup.modifierGroup.name,
                options: selectedOptions,
              },
            });
          }

          validSkuIds.add(skuId);

          return [
            {
              skuId,
              menuEntryId,
              date: entry.date,
              id: entry.menuItem.id,
              totalPrice,
              name: entry.menuItem.name,
              description: entry.menuItem.description,
              basePrice: entry.menuItem.basePrice,
              ...metadata,
              modifierGroups: prunedModifierGroups,
            },
          ];
        } catch (error) {
          console.warn(
            `Invalid or outdated SKU format: ${skuId}. Removing from cart.`,
          );
          return [];
        }
      },
    );

    return { hydratedItems, validSkuIds };
  }

  const navigate = useNavigate();

  if (isLoading || !menuEntries) {
    return <div>loading</div>;
  }

  const { hydratedItems: hydratedSelectedItems, validSkuIds } =
    hydrateCartFromMenu(cart, menuEntries);

  const currentSkuIds = Object.keys(cart.items);
  const hasInvalidItems = currentSkuIds.some(
    (skuId) => !validSkuIds.has(skuId),
  );

  if (hasInvalidItems) {
    const filteredCart: Cart = {
      items: Object.fromEntries(
        currentSkuIds
          .filter((skuId) => validSkuIds.has(skuId))
          .map((skuId) => [skuId, cart.items[skuId]]),
      ),
    };
    setCart(filteredCart);
  }

  const handleEditItem = (item: (typeof hydratedSelectedItems)[0]) => {
    const entry = menuEntries.find((e) => e.id === item.menuEntryId);
    if (!entry) return;

    // Build modifierSelections from the hydrated modifierGroups
    const modifierSelections: Record<string, string[]> = {};
    for (const { modifierGroup } of item.modifierGroups) {
      modifierSelections[modifierGroup.id] = modifierGroup.options.map(
        (o) => o.id,
      );
    }

    setEditingItem({
      skuId: item.skuId,
      menuEntry: entry,
      quantity: item.quantity ?? 1,
      modifierSelections,
    });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex justify-between px-4 pt-4">
        <h3 className="text-3xl">Your Cart</h3>
        <Button variant="ghost" onClick={() => navigate({ to: "/" })}>
          <X className="size-6" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-20">
        {hydratedSelectedItems.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-lg text-muted-foreground mb-4">
              Your cart is empty
            </p>
            <Button variant="link" onClick={() => navigate({ to: "/" })}>
              Click here to add items
            </Button>
          </div>
        ) : (
          <div className="flex flex-col">
            {allDates.map((date) => {
              const itemsForDate = hydratedSelectedItems.filter(
                (item) => item.date! === date,
              );

              if (itemsForDate.length === 0) return null;

              return (
                <div key={date}>
                  <p className="text-xl font-bold">{formatDate(date)}</p>

                  {itemsForDate.map((item) => (
                    <div
                      className="flex items-center justify-between border-t min-h-18"
                      key={item.skuId}
                    >
                      <div
                        className="flex flex-col flex-1 cursor-pointer py-2"
                        onClick={() => handleEditItem(item)}
                      >
                        <p className="text-lg font-semibold">{item.name}</p>
                        <p className="text-sm font-bold text-slate-700">
                          {item.modifierGroups
                            .flatMap(({ modifierGroup }: any) =>
                              modifierGroup.options.map(
                                (option: any) => option.name,
                              ),
                            )
                            .join(", ")}
                        </p>
                        <p>{formatCents(item.totalPrice)}</p>
                      </div>
                      <QuantityStepper
                        value={item.quantity ?? 0}
                        onReduce={() => {
                          const newQty = (item.quantity ?? 0) - 1;
                          if (newQty <= 0) {
                            removeCartItem(item.skuId);
                          } else {
                            updateCartItemQuantity(item.skuId, newQty);
                          }
                        }}
                        onIncrease={() => {
                          updateCartItemQuantity(
                            item.skuId,
                            (item.quantity ?? 0) + 1,
                          );
                        }}
                        reduceDisabled={false}
                        increaseDisabled={false}
                        reduceIcon={
                          (item.quantity ?? 0) <= 1 ? (
                            <Trash2 className="size-4" />
                          ) : undefined
                        }
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <button
            type="button"
            className="w-full rounded-md bg-black px-4 py-3 text-white font-semibold disabled:opacity-50"
            onClick={() => {
              navigate({ to: "/checkout" });
            }}
            disabled={hydratedSelectedItems.length === 0}
          >
            Go To Checkout
          </button>
        </div>
      </div>

      {editingItem && (
        <Dialog
          open={!!editingItem}
          onOpenChange={(open) => {
            if (!open) setEditingItem(null);
          }}
        >
          <DialogContent
            className="min-w-full h-full rounded-none p-0"
            showCloseButton={false}
          >
            <AddItemDialogContent
              menuItem={editingItem.menuEntry.menuItem}
              menuEntryId={editingItem.menuEntry.id}
              setOpen={(open) => {
                if (!open) setEditingItem(null);
              }}
              editData={{
                skuId: editingItem.skuId,
                quantity: editingItem.quantity,
                modifierSelections: editingItem.modifierSelections,
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

