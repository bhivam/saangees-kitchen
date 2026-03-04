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
import { Plus, Search, Trash2, Truck, UserPlus } from "lucide-react";
import { QuantityStepper } from "../quantity-stepper";
import { useState, useMemo, useEffect, useRef } from "react";
import { useTRPC, type RouterOutputs } from "@/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { formatCents, toLocalDateString } from "@/lib/utils";
import { Checkbox } from "../ui/checkbox";
import { Textarea } from "../ui/textarea";
import { DateSelector } from "./date-selector";
import { formatDate, type MenuEntry, type MenuItem } from "../customer-menu-view";
import { useModifierSelection } from "@/hooks/use-modifier-selection";

type Order = RouterOutputs["orders"]["getOrders"][number];

type DialogMenuEntry = Omit<MenuEntry, "orderingOpen">;

type OrderItem = {
  orderItemId?: string;
  menuEntryId: string;
  menuEntryDate: string;
  menuItemName: string;
  quantity: number;
  modifierOptionIds: string[];
  modifierNames: string[];
  unitPrice: number;
  specialInstructions?: string;
};

function ModifierSelectionDialog({
  entry,
  onClose,
  onAddToOrder,
}: {
  entry: DialogMenuEntry;
  onClose: () => void;
  onAddToOrder: (item: OrderItem) => void;
}) {
  const {
    modifierSelections,
    quantity,
    specialInstructions,
    toggleModifierOption,
    setQuantity,
    setSpecialInstructions,
    modifierErrors,
    validate,
    calculateUnitPrice,
    calculateTotalPrice,
    getSelectedModifierNames,
    getAllSelectedOptionIds,
  } = useModifierSelection({ menuItem: entry.menuItem });

  const handleAdd = () => {
    if (!validate()) return;
    const unitPrice = calculateUnitPrice();
    onAddToOrder({
      menuEntryId: entry.id,
      menuEntryDate: entry.date,
      menuItemName: entry.menuItem.name,
      quantity,
      modifierOptionIds: getAllSelectedOptionIds(),
      modifierNames: getSelectedModifierNames(),
      unitPrice,
      specialInstructions: specialInstructions.trim() || undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-125 max-h-[80vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{entry.menuItem.name}</DialogTitle>
          <DialogDescription>
            {formatDate(entry.date)} &middot;{" "}
            {formatCents(entry.menuItem.basePrice)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {entry.menuItem.modifierGroups.length > 0 && (
            <div className="space-y-4">
              {entry.menuItem.modifierGroups
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
                              onCheckedChange={() => {
                                toggleModifierOption(modifierGroup.id, option.id);
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
                    {modifierErrors[modifierGroup.id] && (
                      <p className="text-sm text-red-500 mt-1">{modifierErrors[modifierGroup.id]}</p>
                    )}
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
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                -
              </Button>
              <span className="w-8 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </Button>
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <Label>Special Instructions</Label>
            <Textarea
              placeholder="Any special requests?"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Price preview */}
          <div className="flex justify-between font-medium pt-2 border-t">
            <span>Item Total</span>
            <span>{formatCents(calculateTotalPrice())}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>Add to Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AddManualOrderDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  dataAndMode,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  dataAndMode:
    | {
        data: null;
        mode: "create";
      }
    | {
        data: Order | null;
        mode: "edit";
      };
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;

  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled
    ? (controlledOnOpenChange ?? (() => {}))
    : setUncontrolledOpen;

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
          dataAndMode={dataAndMode}
        />
      )}
    </Dialog>
  );
}

function AddManualOrderDialogContent({
  setOpen,
  dataAndMode,
}: {
  setOpen: (open: boolean) => void;
  dataAndMode:
    | {
        data: null;
        mode: "create";
      }
    | {
        data: Order | null;
        mode: "edit";
      };
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    dataAndMode.data?.userId ?? null,
  );
  const [userSearch, setUserSearch] = useState("");
  const [items, setItems] = useState<OrderItem[]>(() => {
    if (!dataAndMode.data) return [];
    return dataAndMode.data.items.map((item) => ({
      orderItemId: item.id,
      menuEntryId: item.menuEntryId,
      menuEntryDate: item.menuEntry.date,
      menuItemName: item.menuEntry.menuItem.name,
      quantity: item.quantity,
      modifierOptionIds: item.modifiers.map((m) => m.modifierOptionId),
      modifierNames: item.modifiers.map((m) => m.modifierOption.name),
      unitPrice:
        item.itemPrice +
        item.modifiers.reduce((sum, m) => sum + m.optionPrice, 0),
      specialInstructions: item.specialInstructions ?? undefined,
    }));
  });
  const [step, setStep] = useState<"user" | "items">(
    dataAndMode.mode === "create" ? "user" : "items",
  );
  const [browseDateStr, setBrowseDateStr] = useState<string>(
    toLocalDateString(new Date())
  );
  const [itemSearch, setItemSearch] = useState("");
  const [modifierDialogEntry, setModifierDialogEntry] =
    useState<DialogMenuEntry | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [deliveryByDate, setDeliveryByDate] = useState<Record<string, boolean>>({});
  const [addressByDate, setAddressByDate] = useState<Record<string, string | null>>({});
  const [showAddressFormForDate, setShowAddressFormForDate] = useState<string | null>(null);
  const [newAddrLine1, setNewAddrLine1] = useState("");
  const [newAddrLine2, setNewAddrLine2] = useState("");
  const [newAddrCity, setNewAddrCity] = useState("");
  const [newAddrState, setNewAddrState] = useState("");
  const [newAddrZip, setNewAddrZip] = useState("");

  const usersQuery = useQuery(
    trpc.users.searchUsers.queryOptions({ query: userSearch, limit: 20 }),
  );
  const selectedUser = usersQuery.data?.find((u) => u.id === selectedUserId);

  const menuEntriesQuery = useQuery(
    trpc.menu.getByDateRange.queryOptions({
      dates: [browseDateStr],
      includeCustom: true,
    }),
  );


  const menuItemsQuery = useQuery(trpc.menuItems.getMenuItems.queryOptions());

  const createOrderMutation = useMutation(
    trpc.orders.createManualOrder.mutationOptions(),
  );

  const updateOrderMutation = useMutation(
    trpc.orders.updateManualOrder.mutationOptions(),
  );

  const createUserMutation = useMutation(
    trpc.users.createUser.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: trpc.users.searchUsers.queryKey(),
        });
        setSelectedUserId(data.id);
        setShowCreateUser(false);
        setNewPhone("");
        setNewFirstName("");
        setNewLastName("");
        setStep("items");
        toast.success(`User "${data.name}" ready.`, {
          position: "bottom-center",
        });
      },
      onError: () => {
        toast.error("Failed to create user.", { position: "bottom-center" });
      },
    }),
  );

  const createCustomEntryMutation = useMutation(
    trpc.menu.createCustomMenuEntry.mutationOptions(),
  );

  const DELIVERY_FEE_CENTS = 500;

  const uniqueDates = useMemo(() => {
    const dateSet = new Set(items.map((i) => i.menuEntryDate));
    return [...dateSet].sort();
  }, [items]);

  const addressesQuery = useQuery(
    trpc.delivery.adminGetUserAddresses.queryOptions(
      { userId: selectedUserId! },
      { enabled: !!selectedUserId },
    ),
  );

  const deliveryDatesQuery = useQuery(
    trpc.delivery.adminGetDeliveryDatesForUser.queryOptions(
      { userId: selectedUserId!, dates: uniqueDates },
      { enabled: !!selectedUserId && uniqueDates.length > 0 },
    ),
  );

  const initialAddressByDate = useRef<Record<string, string | null>>({});

  // Sync deliveryByDate and addressByDate from server data
  useEffect(() => {
    if (!deliveryDatesQuery.data) return;
    const serverDelivery: Record<string, boolean> = {};
    const serverAddresses: Record<string, string | null> = {};
    for (const d of deliveryDatesQuery.data) {
      serverDelivery[d.date] = true;
      serverAddresses[d.date] = d.addressId ?? null;
    }
    setDeliveryByDate((prev) => {
      const next = { ...prev };
      // Overwrite with server truth for dates the server knows about
      for (const [date, val] of Object.entries(serverDelivery)) {
        next[date] = val;
      }
      return next;
    });
    setAddressByDate((prev) => {
      const next = { ...prev };
      for (const [date, addr] of Object.entries(serverAddresses)) {
        if (addr) next[date] = addr;
      }
      return next;
    });
    // Always update the baseline for change detection
    initialAddressByDate.current = serverAddresses;
  }, [deliveryDatesQuery.data]);

  const adminSetDeliveryMutation = useMutation(
    trpc.delivery.adminSetDeliveryForDates.mutationOptions(),
  );

  const adminSaveAddressMutation = useMutation(
    trpc.delivery.adminSaveUserAddress.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: trpc.delivery.adminGetUserAddresses.queryKey(),
        });
        if (showAddressFormForDate) {
          setAddressByDate((prev) => ({
            ...prev,
            [showAddressFormForDate]: data.addressId,
          }));
        }
        setShowAddressFormForDate(null);
        setNewAddrLine1("");
        setNewAddrLine2("");
        setNewAddrCity("");
        setNewAddrState("");
        setNewAddrZip("");
      },
    }),
  );

  const alreadyScheduledDates = useMemo(() => {
    const set = new Set<string>();
    if (deliveryDatesQuery.data) {
      for (const d of deliveryDatesQuery.data) set.add(d.date);
    }
    return set;
  }, [deliveryDatesQuery.data]);

  const newDeliveryDates = useMemo(() => {
    return uniqueDates.filter(
      (d) => deliveryByDate[d] && !alreadyScheduledDates.has(d),
    );
  }, [uniqueDates, deliveryByDate, alreadyScheduledDates]);

  const deliveryTotal = newDeliveryDates.length * DELIVERY_FEE_CENTS;

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [items]);

  const grandTotal = total + deliveryTotal;


  const menuEntriesForSelectedDay = useMemo(() => {
    if (!menuEntriesQuery.data) return [];
    return menuEntriesQuery.data.filter((e) => e.date === browseDateStr);
  }, [menuEntriesQuery.data, browseDateStr]);

  const searchedMenuItems = useMemo(() => {
    if (!itemSearch.trim() || !menuItemsQuery.data) return [];
    const query = itemSearch.toLowerCase();
    return menuItemsQuery.data.filter((item) =>
      item.name.toLowerCase().includes(query),
    );
  }, [menuItemsQuery.data, itemSearch]);

  const hasRequiredModifiers = (menuItem: MenuItem) => {
    return menuItem.modifierGroups.some(
      (mg) => mg.modifierGroup.minSelect > 0,
    );
  };

  const quickAddItem = (entry: DialogMenuEntry) => {
    setItems((prev) => {
      const existing = prev.findIndex(
        (i) =>
          i.menuEntryId === entry.id &&
          i.modifierOptionIds.length === 0 &&
          !i.specialInstructions,
      );
      if (existing !== -1) {
        return prev.map((item, i) =>
          i === existing ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        ...prev,
        {
          menuEntryId: entry.id,
          menuEntryDate: entry.date,
          menuItemName: entry.menuItem.name,
          quantity: 1,
          modifierOptionIds: [],
          modifierNames: [],
          unitPrice: entry.menuItem.basePrice,
        },
      ];
    });
  };

  const quickAddArbitraryItem = async (item: MenuItem) => {
    try {
      const entry = await createCustomEntryMutation.mutateAsync({
        date: browseDateStr,
        menuItemId: item.id,
      });
      quickAddItem(entry);
      queryClient.invalidateQueries({
        queryKey: trpc.menu.getByDateRange.queryKey(),
      });
    } catch {
      toast.error("Failed to add item", { position: "bottom-center" });
    }
  };

  const openModifierDialogForEntry = (entry: DialogMenuEntry) => {
    setModifierDialogEntry(entry);
  };

  const openModifierDialogForItem = async (item: MenuItem) => {
    try {
      const entry = await createCustomEntryMutation.mutateAsync({
        date: browseDateStr,
        menuItemId: item.id,
      });
      queryClient.invalidateQueries({
        queryKey: trpc.menu.getByDateRange.queryKey(),
      });
      setModifierDialogEntry(entry);
    } catch {
      toast.error("Failed to create entry", { position: "bottom-center" });
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, newQuantity: number) => {
    setItems(
      items.map((item, i) =>
        i === index ? { ...item, quantity: newQuantity } : item,
      ),
    );
  };

  const isLocked =
    dataAndMode.mode === "edit" && (dataAndMode.data?.centsPaid ?? 0) > 0;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedUserId || items.length === 0) return;
    setIsSubmitting(true);

    try {
      if (dataAndMode.mode === "edit" && dataAndMode.data) {
        const updateItems = items.map((item) => ({
          orderItemId: item.orderItemId,
          menuEntryId: item.menuEntryId,
          quantity: item.quantity,
          modifierOptionIds: item.modifierOptionIds,
          specialInstructions: item.specialInstructions,
        }));
        await updateOrderMutation.mutateAsync({
          orderId: dataAndMode.data.id,
          items: updateItems,
        });
      } else {
        const createItems = items.map((item) => ({
          menuEntryId: item.menuEntryId,
          quantity: item.quantity,
          modifierOptionIds: item.modifierOptionIds,
          specialInstructions: item.specialInstructions,
        }));
        await createOrderMutation.mutateAsync({
          userId: selectedUserId,
          items: createItems,
        });
      }

      // Update delivery dates grouped by address
      const checkedDates = uniqueDates.filter((d) => deliveryByDate[d]);
      const datesToUpdate = checkedDates.filter((d) => {
        const isNew = !alreadyScheduledDates.has(d);
        const addressChanged = initialAddressByDate.current[d] !== undefined &&
          addressByDate[d] !== initialAddressByDate.current[d];
        return isNew || addressChanged;
      });

      // Group dates by address and fire one mutation per unique address
      const byAddress: Record<string, string[]> = {};
      for (const d of datesToUpdate) {
        const addr = addressByDate[d];
        if (!addr) continue;
        (byAddress[addr] ??= []).push(d);
      }
      for (const [addressId, dates] of Object.entries(byAddress)) {
        await adminSetDeliveryMutation.mutateAsync({
          userId: selectedUserId,
          enable: dates,
          disable: [],
          addressId,
        });
      }

      queryClient.invalidateQueries({
        queryKey: trpc.orders.getOrders.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.delivery.adminGetDeliveryDatesForUser.queryKey(),
      });
      toast.success(
        dataAndMode.mode === "edit" ? "Order updated." : "Order created.",
        { position: "bottom-center" },
      );
      setOpen(false);
    } catch {
      toast.error(
        dataAndMode.mode === "edit"
          ? "Failed to update order."
          : "Failed to create order.",
        { position: "bottom-center" },
      );
    } finally {
      setIsSubmitting(false);
    }
  };


  if (step === "user") {
    const phoneDigits = newPhone.replace(/\D/g, "").slice(0, 10);
    const formattedPhone =
      phoneDigits.length === 0
        ? ""
        : phoneDigits.length <= 3
          ? `(${phoneDigits}`
          : phoneDigits.length <= 6
            ? `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3)}`
            : `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6, 10)}`;
    const canSubmitNewUser =
      phoneDigits.length === 10 &&
      newFirstName.trim().length > 0 &&
      newLastName.trim().length > 0;

    return (
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Select Customer</DialogTitle>
          <DialogDescription>
            Choose the customer for this order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!showCreateUser ? (
            <>
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

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowCreateUser(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create New User
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>Phone Number</Label>
                <div className="border-input bg-background flex h-10 w-full items-center rounded-md border">
                  <span className="text-muted-foreground px-2 text-sm font-medium select-none">
                    +1
                  </span>
                  <input
                    type="tel"
                    placeholder="(555) 555-5555"
                    value={formattedPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    autoFocus
                    className="placeholder:text-muted-foreground h-full flex-1 bg-transparent px-3 text-sm outline-none"
                  />
                </div>
              </div>
              <div>
                <Label>First Name</Label>
                <Input
                  placeholder="First name"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  placeholder="Last name"
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateUser(false)}
              >
                Back to search
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          {showCreateUser ? (
            <Button
              disabled={!canSubmitNewUser || createUserMutation.isPending}
              onClick={() =>
                createUserMutation.mutate({
                  phoneNumber: phoneDigits,
                  firstName: newFirstName.trim(),
                  lastName: newLastName.trim(),
                })
              }
            >
              {createUserMutation.isPending
                ? "Creating..."
                : "Create & Continue"}
            </Button>
          ) : (
            <Button disabled={!selectedUserId} onClick={() => setStep("items")}>
              Continue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
      <DialogHeader className="px-6 pt-6 pb-4">
        <DialogTitle>
          {dataAndMode.mode === "edit"
            ? "Edit Order"
            : "Create Manual Order"}
        </DialogTitle>
        <DialogDescription>
          {selectedUser
            ? `Order for ${selectedUser.name}`
            : dataAndMode.data
              ? `Order for ${dataAndMode.data.user.name}`
              : "Configure the order items"}
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-hidden flex">
        {/* Left column: User info + Browse menu + Search */}
        <div className="w-1/2 border-r overflow-y-auto px-6 py-3 space-y-4">
          {/* User info */}
          {selectedUser && dataAndMode.mode === "create" && (
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

          {/* Date selector + menu items + search (hidden in view mode and when locked) */}
          {!isLocked && (
            <>
              <DateSelector
                selectedDate={browseDateStr}
                onDateSelect={setBrowseDateStr}
                className="w-full"
              />

              {/* Menu items for selected day */}
              <div className="border rounded-md">
                <div className="p-3 bg-muted font-medium border-b text-sm">
                  Menu &middot; {formatDate(browseDateStr)}
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {menuEntriesQuery.isLoading && (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      Loading...
                    </div>
                  )}
                  {!menuEntriesQuery.isLoading &&
                    menuEntriesForSelectedDay.length === 0 && (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        No items for this date
                      </div>
                    )}
                  {menuEntriesForSelectedDay.map((entry) => {
                    const canQuickAdd = !hasRequiredModifiers(entry.menuItem);
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 border-b last:border-b-0"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {entry.menuItem.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatCents(entry.menuItem.basePrice)}
                          </div>
                        </div>
                        <div className="flex gap-1.5 ml-2 shrink-0">
                          {canQuickAdd && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => quickAddItem(entry)}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Quick
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openModifierDialogForEntry(entry)}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Search all items */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search all items..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {searchedMenuItems.length > 0 && (
                  <div className="border rounded-md max-h-48 overflow-y-auto">
                    {searchedMenuItems.map((item) => {
                      const canQuickAdd = !hasRequiredModifiers(item);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 border-b last:border-b-0"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {item.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatCents(item.basePrice)}
                            </div>
                          </div>
                          <div className="flex gap-1.5 ml-2 shrink-0">
                            {canQuickAdd && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={createCustomEntryMutation.isPending}
                                onClick={() => quickAddArbitraryItem(item)}
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Quick
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={createCustomEntryMutation.isPending}
                              onClick={() => openModifierDialogForItem(item)}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Add
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right column: Cart + Total */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-3">
            {isLocked && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                This order has payments and cannot be modified.
              </div>
            )}
            {items.length === 0 ? (
              <div className="p-4 border rounded-md text-center text-muted-foreground">
                No items added yet
              </div>
            ) : (
              <div className="border rounded-md divide-y">
                {items.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 flex justify-between items-start"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.menuItemName}</div>
                        {item.modifierNames.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {item.modifierNames.join(", ")}
                          </div>
                        )}
                        {item.specialInstructions && (
                          <div className="text-sm text-muted-foreground italic">
                            Note: {item.specialInstructions}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          {formatCents(item.unitPrice * item.quantity)}
                        </span>
                        {isLocked ? (
                          <span className="text-muted-foreground">
                            ×{item.quantity}
                          </span>
                        ) : (
                          <QuantityStepper
                            value={item.quantity}
                            onReduce={() => {
                              if (item.quantity <= 1) {
                                removeItem(index);
                              } else {
                                updateItemQuantity(index, item.quantity - 1);
                              }
                            }}
                            onIncrease={() =>
                              updateItemQuantity(index, item.quantity + 1)
                            }
                            reduceIcon={
                              item.quantity <= 1 ? (
                                <Trash2 className="size-4" />
                              ) : undefined
                            }
                            reduceDisabled={false}
                            increaseDisabled={false}
                          />
                        )}
                      </div>
                    </div>
                ))}
              </div>
            )}

            {/* Delivery section */}
            {items.length > 0 && selectedUserId && uniqueDates.length > 0 && (
              <div className="mt-4 border rounded-md">
                <div className="p-3 bg-muted font-medium border-b text-sm flex items-center gap-1.5">
                  <Truck className="h-4 w-4" />
                  Delivery
                </div>
                <div className="divide-y">
                  {uniqueDates.map((date) => {
                    const isAlreadyScheduled = alreadyScheduledDates.has(date);
                    const isChecked = !!deliveryByDate[date];
                    const isDisabled = isAlreadyScheduled;

                    return (
                      <div key={date}>
                        <div className="px-3 py-2 flex items-center gap-2">
                          <Checkbox
                            id={`del-${date}`}
                            checked={isChecked}
                            disabled={isDisabled}
                            onCheckedChange={(checked) => {
                              const on = checked === true;
                              setDeliveryByDate((prev) => ({
                                ...prev,
                                [date]: on,
                              }));
                              if (on && !addressByDate[date]) {
                                const firstAddr = addressesQuery.data?.[0]?.addressId ?? null;
                                setAddressByDate((prev) => ({
                                  ...prev,
                                  [date]: firstAddr,
                                }));
                              }
                            }}
                          />
                          <label
                            htmlFor={`del-${date}`}
                            className="flex-1 text-sm flex items-center justify-between"
                          >
                            <span>{formatDate(date)}</span>
                            <span className="text-muted-foreground text-xs">
                              {isAlreadyScheduled && isChecked
                                ? "Already scheduled"
                                : isChecked
                                  ? `Delivery +${formatCents(DELIVERY_FEE_CENTS)}`
                                  : `Add delivery (${formatCents(DELIVERY_FEE_CENTS)})`}
                            </span>
                          </label>
                        </div>

                        {/* Per-date address picker */}
                        {isChecked && (
                          <div className="px-3 pb-2 pl-9 space-y-2">
                            {showAddressFormForDate === date ? (
                              <div className="space-y-2">
                                <Label className="text-xs">New Address</Label>
                                <Input
                                  placeholder="Address line 1"
                                  value={newAddrLine1}
                                  onChange={(e) => setNewAddrLine1(e.target.value)}
                                  className="h-8 text-sm"
                                />
                                <Input
                                  placeholder="Address line 2 (optional)"
                                  value={newAddrLine2}
                                  onChange={(e) => setNewAddrLine2(e.target.value)}
                                  className="h-8 text-sm"
                                />
                                <div className="grid grid-cols-3 gap-2">
                                  <Input
                                    placeholder="City"
                                    value={newAddrCity}
                                    onChange={(e) => setNewAddrCity(e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                  <Input
                                    placeholder="State"
                                    value={newAddrState}
                                    onChange={(e) => setNewAddrState(e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                  <Input
                                    placeholder="ZIP"
                                    value={newAddrZip}
                                    onChange={(e) => setNewAddrZip(e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs"
                                    disabled={
                                      !newAddrLine1.trim() ||
                                      !newAddrCity.trim() ||
                                      !newAddrState.trim() ||
                                      !newAddrZip.trim() ||
                                      adminSaveAddressMutation.isPending
                                    }
                                    onClick={() =>
                                      adminSaveAddressMutation.mutate({
                                        userId: selectedUserId!,
                                        addressLine1: newAddrLine1.trim(),
                                        addressLine2: newAddrLine2.trim() || undefined,
                                        city: newAddrCity.trim(),
                                        state: newAddrState.trim(),
                                        postalCode: newAddrZip.trim(),
                                      })
                                    }
                                  >
                                    {adminSaveAddressMutation.isPending
                                      ? "Saving..."
                                      : "Save"}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => setShowAddressFormForDate(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 min-w-0">
                                {addressesQuery.data && addressesQuery.data.length > 0 ? (
                                  <select
                                    className="flex-1 min-w-0 h-8 rounded-md border border-input bg-background px-2 text-sm truncate"
                                    value={addressByDate[date] ?? ""}
                                    onChange={(e) =>
                                      setAddressByDate((prev) => ({
                                        ...prev,
                                        [date]: e.target.value || null,
                                      }))
                                    }
                                  >
                                    <option value="">Select address...</option>
                                    {addressesQuery.data.map((addr) => (
                                      <option key={addr.addressId} value={addr.addressId}>
                                        {addr.addressLine1}, {addr.city}, {addr.state}{" "}
                                        {addr.postalCode}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="flex-1 text-xs text-muted-foreground">
                                    No saved addresses
                                  </span>
                                )}
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-xs shrink-0"
                                  onClick={() => setShowAddressFormForDate(date)}
                                >
                                  + New
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Total */}
          {items.length > 0 && (
            <div className="px-6 py-3 border-t">
              {deliveryTotal > 0 ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCents(total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>
                      Delivery ({newDeliveryDates.length} &times; {formatCents(DELIVERY_FEE_CENTS)})
                    </span>
                    <span>{formatCents(deliveryTotal)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-lg pt-1 border-t">
                    <span>Total</span>
                    <span>{formatCents(grandTotal)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span>{formatCents(total)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="px-6 py-4 border-t flex justify-end gap-2">
        <>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              isLocked ||
              !selectedUserId ||
              items.length === 0 ||
              isSubmitting ||
              uniqueDates.some((d) => deliveryByDate[d] && !addressByDate[d])
            }
            onClick={handleSubmit}
          >
            {isSubmitting
              ? dataAndMode.mode === "edit"
                ? "Updating..."
                : "Creating..."
              : dataAndMode.mode === "edit"
                ? "Update Order"
                : "Create Order"}
          </Button>
        </>
      </div>

      {/* Modifier sub-dialog */}
      {modifierDialogEntry && (
        <ModifierSelectionDialog
          entry={modifierDialogEntry}
          onClose={() => setModifierDialogEntry(null)}
          onAddToOrder={(item) => {
            setItems((prev) => [...prev, item]);
            setModifierDialogEntry(null);
          }}
        />
      )}
    </DialogContent>
  );
}
