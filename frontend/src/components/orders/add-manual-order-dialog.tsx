import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Plus, Trash, X } from "lucide-react";
import { useState, useMemo } from "react";
import { useTRPC, type RouterOutputs } from "@/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { formatCents } from "@/lib/utils";
import { Checkbox } from "../ui/checkbox";
import { getWeekDates, type MenuEntry, type MenuItem } from "../customer-menu-view";

type Order = RouterOutputs["orders"]["getOrders"][number];

interface OrderItem {
  orderItemId?: string; // Existing order item ID for updates
  menuEntryId: string;
  menuItemName: string;
  quantity: number;
  modifierOptionIds: string[];
  modifierNames: string[];
  unitPrice: number; // Price per item including modifiers
}

interface AddManualOrderDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editData?: Order;
}

export function AddManualOrderDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  editData,
}: AddManualOrderDialogProps = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled
    ? controlledOnOpenChange ?? (() => {})
    : setUncontrolledOpen;

  const isEditMode = !!editData;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
      }}
    >
      {!isControlled && (
        <DialogTrigger asChild>
          <Button>
            <p>Add New Order</p>
            <Plus />
          </Button>
        </DialogTrigger>
      )}
      {open && (
        <AddManualOrderDialogContent
          setOpen={setOpen}
          isEditMode={isEditMode}
          editData={editData}
        />
      )}
    </Dialog>
  );
}

function AddManualOrderDialogContent({
  setOpen,
  isEditMode,
  editData,
}: {
  setOpen: (open: boolean) => void;
  isEditMode: boolean;
  editData?: Order;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    editData?.userId ?? null,
  );
  const [userSearch, setUserSearch] = useState("");
  const [items, setItems] = useState<OrderItem[]>(() => {
    if (!editData) return [];
    // Convert edit data items to our format, including orderItemId for updates
    return editData.items.map((item) => ({
      orderItemId: item.id, // Preserve existing item ID for proper updates
      menuEntryId: item.menuEntryId,
      menuItemName: item.menuEntry.menuItem.name,
      quantity: item.quantity,
      modifierOptionIds: item.modifiers.map((m) => m.modifierOptionId),
      modifierNames: item.modifiers.map((m) => m.modifierOption.name),
      unitPrice:
        item.itemPrice +
        item.modifiers.reduce((sum, m) => sum + m.optionPrice, 0),
    }));
  });
  const [step, setStep] = useState<"user" | "items" | "addItem">(
    editData ? "items" : "user",
  );
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [selectedMenuEntry, setSelectedMenuEntry] = useState<MenuEntry | null>(
    null,
  );
  const [modifierSelections, setModifierSelections] = useState<
    Record<string, string[]>
  >({});
  const [itemQuantity, setItemQuantity] = useState(1);

  // Queries
  const usersQuery = useQuery(
    trpc.users.searchUsers.queryOptions({ query: userSearch, limit: 20 }),
  );
  const selectedUser = usersQuery.data?.find((u) => u.id === selectedUserId);

  // Get menu entries for the next 30 days
  const dates = useMemo(() => getWeekDates(new Date(), 30), []);
  const menuEntriesQuery = useQuery(
    trpc.menu.getByDateRange.queryOptions({ dates, includeCustom: true }),
  );

  const menuItemsQuery = useQuery(trpc.menuItems.getMenuItems.queryOptions());

  // Mutations
  const createOrderMutation = useMutation(
    trpc.orders.createManualOrder.mutationOptions({
      onSettled: (result, error) => {
        if (error || !result) {
          toast.error("Failed to create order.", { position: "bottom-center" });
          return;
        }
        queryClient.invalidateQueries({ queryKey: trpc.orders.getOrders.queryKey() });
        toast.success("Order created.", { position: "bottom-center" });
        setOpen(false);
      },
    }),
  );

  const updateOrderMutation = useMutation(
    trpc.orders.updateManualOrder.mutationOptions({
      onSettled: (result, error) => {
        if (error || !result) {
          toast.error("Failed to update order.", { position: "bottom-center" });
          return;
        }
        queryClient.invalidateQueries({ queryKey: trpc.orders.getOrders.queryKey() });
        toast.success("Order updated.", { position: "bottom-center" });
        setOpen(false);
      },
    }),
  );

  const createCustomEntryMutation = useMutation(
    trpc.menu.createCustomMenuEntry.mutationOptions(),
  );

  // Calculate total
  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [items]);

  // Get menu entries for selected date
  const dateMenuEntries = useMemo(() => {
    if (!menuEntriesQuery.data) return [];
    return menuEntriesQuery.data.filter((e) => e.date === selectedDate);
  }, [menuEntriesQuery.data, selectedDate]);

  // Calculate item price with modifiers
  const calculateItemPrice = (menuItem: MenuItem, selectedOptions: string[]) => {
    let price = menuItem.basePrice;
    for (const optionId of selectedOptions) {
      for (const mg of menuItem.modifierGroups) {
        const option = mg.modifierGroup.options.find((o) => o.id === optionId);
        if (option) {
          price += option.priceDelta;
        }
      }
    }
    return price;
  };

  // Get modifier names
  const getModifierNames = (menuItem: MenuItem, selectedOptions: string[]) => {
    const names: string[] = [];
    for (const optionId of selectedOptions) {
      for (const mg of menuItem.modifierGroups) {
        const option = mg.modifierGroup.options.find((o) => o.id === optionId);
        if (option) {
          names.push(option.name);
        }
      }
    }
    return names;
  };

  // Add item to order
  const addItemToOrder = () => {
    if (!selectedMenuEntry) return;

    const allSelectedOptions = Object.values(modifierSelections).flat();
    const unitPrice = calculateItemPrice(
      selectedMenuEntry.menuItem,
      allSelectedOptions,
    );

    setItems([
      ...items,
      {
        menuEntryId: selectedMenuEntry.id,
        menuItemName: selectedMenuEntry.menuItem.name,
        quantity: itemQuantity,
        modifierOptionIds: allSelectedOptions,
        modifierNames: getModifierNames(
          selectedMenuEntry.menuItem,
          allSelectedOptions,
        ),
        unitPrice,
      },
    ]);

    // Reset for next item
    setSelectedMenuEntry(null);
    setModifierSelections({});
    setItemQuantity(1);
    setStep("items");
  };

  // Remove item from order
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Submit order
  const handleSubmit = () => {
    if (!selectedUserId || items.length === 0) return;

    if (isEditMode && editData) {
      // Include orderItemId for existing items to preserve baggedAt timestamps
      const updateItems = items.map((item) => ({
        orderItemId: item.orderItemId,
        menuEntryId: item.menuEntryId,
        quantity: item.quantity,
        modifierOptionIds: item.modifierOptionIds,
      }));
      updateOrderMutation.mutate({
        orderId: editData.id,
        items: updateItems,
      });
    } else {
      const createItems = items.map((item) => ({
        menuEntryId: item.menuEntryId,
        quantity: item.quantity,
        modifierOptionIds: item.modifierOptionIds,
      }));
      createOrderMutation.mutate({
        userId: selectedUserId,
        items: createItems,
      });
    }
  };

  // Render user selection step
  if (step === "user") {
    return (
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Customer</DialogTitle>
          <DialogDescription>
            Choose the customer for this order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Search Users</Label>
            <Input
              placeholder="Search by name or phone..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>

          <div className="max-h-60 overflow-y-auto border rounded-md">
            {usersQuery.isLoading && (
              <div className="p-4 text-center text-muted-foreground">
                Loading...
              </div>
            )}
            {usersQuery.data?.length === 0 && (
              <div className="p-4 text-center text-muted-foreground">
                No users found
              </div>
            )}
            {usersQuery.data?.map((user) => (
              <button
                key={user.id}
                type="button"
                className={`w-full text-left p-3 hover:bg-muted border-b last:border-b-0 ${
                  selectedUserId === user.id ? "bg-muted" : ""
                }`}
                onClick={() => setSelectedUserId(user.id)}
              >
                <div className="font-medium">{user.name}</div>
                {user.phoneNumber && (
                  <div className="text-sm text-muted-foreground">
                    {user.phoneNumber}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selectedUserId}
            onClick={() => setStep("items")}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  // Render add item step
  if (step === "addItem") {
    return (
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>
          <DialogDescription>
            Select an item from the menu
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date selection */}
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {/* Menu items for date */}
          {!selectedMenuEntry && (
            <div className="space-y-2">
              <Label>Select Item</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md">
                {dateMenuEntries.length === 0 && (
                  <div className="p-4 text-center text-muted-foreground">
                    No items on menu for this date
                  </div>
                )}
                {dateMenuEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="w-full text-left p-3 hover:bg-muted border-b last:border-b-0"
                    onClick={() => {
                      setSelectedMenuEntry(entry);
                      // Initialize modifier selections
                      const initialSelections: Record<string, string[]> = {};
                      for (const mg of entry.menuItem.modifierGroups) {
                        initialSelections[mg.modifierGroup.id] = [];
                      }
                      setModifierSelections(initialSelections);
                    }}
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">{entry.menuItem.name}</span>
                      <span className="text-muted-foreground">
                        {formatCents(entry.menuItem.basePrice)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Or create custom entry from any menu item */}
              <div className="pt-4 border-t mt-4">
                <Label>Or select any menu item (custom entry)</Label>
                <div className="max-h-40 overflow-y-auto border rounded-md mt-2">
                  {menuItemsQuery.data?.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full text-left p-3 hover:bg-muted border-b last:border-b-0"
                      onClick={async () => {
                        // Create custom menu entry
                        try {
                          const entry = await createCustomEntryMutation.mutateAsync({
                            date: selectedDate,
                            menuItemId: item.id,
                          });
                          setSelectedMenuEntry({
                            id: entry.id,
                            date: entry.date,
                            sortOrder: entry.sortOrder,
                            isCustom: entry.isCustom,
                            menuItemId: item.id,
                            menuItem: entry.menuItem,
                          });
                          const initialSelections: Record<string, string[]> = {};
                          for (const mg of entry.menuItem.modifierGroups) {
                            initialSelections[mg.modifierGroup.id] = [];
                          }
                          setModifierSelections(initialSelections);
                        } catch {
                          toast.error("Failed to create custom entry", {
                            position: "bottom-center",
                          });
                        }
                      }}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground">
                          {formatCents(item.basePrice)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Modifier selection */}
          {selectedMenuEntry && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-lg">
                  {selectedMenuEntry.menuItem.name}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMenuEntry(null)}
                >
                  <X className="h-4 w-4" /> Change
                </Button>
              </div>

              {selectedMenuEntry.menuItem.modifierGroups.length > 0 && (
                <div className="space-y-4">
                  {selectedMenuEntry.menuItem.modifierGroups
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map(({ modifierGroup }) => (
                      <div key={modifierGroup.id} className="space-y-2">
                        <div>
                          <h4 className="font-medium">{modifierGroup.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {modifierGroup.minSelect === 0
                              ? "Optional"
                              : `Select at least ${modifierGroup.minSelect}`}
                            {modifierGroup.maxSelect &&
                              ` · Select up to ${modifierGroup.maxSelect}`}
                          </p>
                        </div>
                        <div className="space-y-1">
                          {modifierGroup.options.map((option) => {
                            const isSelected =
                              modifierSelections[modifierGroup.id]?.includes(
                                option.id,
                              ) ?? false;
                            const selectedCount =
                              modifierSelections[modifierGroup.id]?.length ?? 0;
                            const isDisabled =
                              !isSelected &&
                              modifierGroup.maxSelect !== null &&
                              selectedCount >= modifierGroup.maxSelect;

                            return (
                              <label
                                key={option.id}
                                className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                              >
                                <Checkbox
                                  checked={isSelected}
                                  disabled={isDisabled}
                                  onCheckedChange={(checked) => {
                                    setModifierSelections((prev) => {
                                      const current =
                                        prev[modifierGroup.id] ?? [];
                                      if (checked) {
                                        return {
                                          ...prev,
                                          [modifierGroup.id]: [
                                            ...current,
                                            option.id,
                                          ],
                                        };
                                      } else {
                                        return {
                                          ...prev,
                                          [modifierGroup.id]: current.filter(
                                            (id) => id !== option.id,
                                          ),
                                        };
                                      }
                                    });
                                  }}
                                />
                                <span className="flex-1">{option.name}</span>
                                {option.priceDelta !== 0 && (
                                  <span className="text-muted-foreground">
                                    {option.priceDelta > 0 ? "+" : ""}
                                    {formatCents(option.priceDelta)}
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Quantity */}
              <div className="flex items-center gap-4">
                <Label>Quantity</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                    disabled={itemQuantity <= 1}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center">{itemQuantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setItemQuantity(itemQuantity + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Price preview */}
              <div className="flex justify-between font-medium pt-2 border-t">
                <span>Item Total</span>
                <span>
                  {formatCents(
                    calculateItemPrice(
                      selectedMenuEntry.menuItem,
                      Object.values(modifierSelections).flat(),
                    ) * itemQuantity,
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setStep("items")}>
            Cancel
          </Button>
          <Button
            disabled={!selectedMenuEntry}
            onClick={addItemToOrder}
          >
            Add to Order
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  // Render items list step (main view)
  return (
    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {isEditMode ? "Edit Order" : "Create Manual Order"}
        </DialogTitle>
        <DialogDescription>
          {selectedUser
            ? `Order for ${selectedUser.name}`
            : "Configure the order items"}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* User info */}
        {selectedUser && !isEditMode && (
          <div className="flex justify-between items-center p-3 bg-muted rounded-md">
            <div>
              <div className="font-medium">{selectedUser.name}</div>
              {selectedUser.phoneNumber && (
                <div className="text-sm text-muted-foreground">
                  {selectedUser.phoneNumber}
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep("user")}>
              Change
            </Button>
          </div>
        )}

        {/* Items list */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Items</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep("addItem")}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="p-4 border rounded-md text-center text-muted-foreground">
              No items added yet
            </div>
          ) : (
            <div className="border rounded-md divide-y">
              {items.map((item, index) => (
                <div key={index} className="p-3 flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">
                      {item.quantity}x {item.menuItemName}
                    </div>
                    {item.modifierNames.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {item.modifierNames.join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {formatCents(item.unitPrice * item.quantity)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total */}
        {items.length > 0 && (
          <div className="flex justify-between font-medium text-lg pt-2 border-t">
            <span>Total</span>
            <span>{formatCents(total)}</span>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          disabled={
            !selectedUserId ||
            items.length === 0 ||
            createOrderMutation.isPending ||
            updateOrderMutation.isPending
          }
          onClick={handleSubmit}
        >
          {createOrderMutation.isPending || updateOrderMutation.isPending
            ? isEditMode
              ? "Updating..."
              : "Creating..."
            : isEditMode
              ? "Update Order"
              : "Create Order"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
