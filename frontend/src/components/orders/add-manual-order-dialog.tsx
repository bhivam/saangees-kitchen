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
import { CalendarDays, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { QuantityStepper } from "../quantity-stepper";
import { useState, useMemo } from "react";
import { useTRPC, type RouterOutputs } from "@/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { formatCents, toLocalDateString } from "@/lib/utils";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { Checkbox } from "../ui/checkbox";
import { Textarea } from "../ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { formatDate, type MenuEntry, type MenuItem } from "../customer-menu-view";

type Order = RouterOutputs["orders"]["getOrders"][number];

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
  entry: MenuEntry;
  onClose: () => void;
  onAddToOrder: (item: OrderItem) => void;
}) {
  const [modifierSelections, setModifierSelections] = useState<
    Record<string, string[]>
  >(() => {
    const initial: Record<string, string[]> = {};
    for (const mg of entry.menuItem.modifierGroups) {
      initial[mg.modifierGroup.id] = [];
    }
    return initial;
  });
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");

  const calculateItemPrice = (selectedOptions: string[]) => {
    let price = entry.menuItem.basePrice;
    for (const optionId of selectedOptions) {
      for (const mg of entry.menuItem.modifierGroups) {
        const option = mg.modifierGroup.options.find((o) => o.id === optionId);
        if (option) {
          price += option.priceDelta;
        }
      }
    }
    return price;
  };

  const getModifierNames = (selectedOptions: string[]) => {
    const names: string[] = [];
    for (const optionId of selectedOptions) {
      for (const mg of entry.menuItem.modifierGroups) {
        const option = mg.modifierGroup.options.find((o) => o.id === optionId);
        if (option) {
          names.push(option.name);
        }
      }
    }
    return names;
  };

  const allSelectedOptions = Object.values(modifierSelections).flat();
  const unitPrice = calculateItemPrice(allSelectedOptions);

  const handleAdd = () => {
    onAddToOrder({
      menuEntryId: entry.id,
      menuEntryDate: entry.date,
      menuItemName: entry.menuItem.name,
      quantity,
      modifierOptionIds: allSelectedOptions,
      modifierNames: getModifierNames(allSelectedOptions),
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
            <span>{formatCents(unitPrice * quantity)}</span>
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
      }
    | {
        data: Order | null;
        mode: "view";
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
      }
    | {
        data: Order | null;
        mode: "view";
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
  const [browseDate, setBrowseDate] = useState<Date>(() => new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [modifierDialogEntry, setModifierDialogEntry] =
    useState<MenuEntry | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");

  const usersQuery = useQuery(
    trpc.users.searchUsers.queryOptions({ query: userSearch, limit: 20 }),
  );
  const selectedUser = usersQuery.data?.find((u) => u.id === selectedUserId);

  const dates = useMemo(() => {
    const result: string[] = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      result.push(toLocalDateString(date));
    }
    return result;
  }, []);

  const menuEntriesQuery = useQuery(
    trpc.menu.getByDateRange.queryOptions({ dates, includeCustom: true }),
  );

  const menuItemsQuery = useQuery(trpc.menuItems.getMenuItems.queryOptions());

  const createOrderMutation = useMutation(
    trpc.orders.createManualOrder.mutationOptions({
      onSettled: (result, error) => {
        if (error || !result) {
          toast.error("Failed to create order.", { position: "bottom-center" });
          return;
        }
        queryClient.invalidateQueries({
          queryKey: trpc.orders.getOrders.queryKey(),
        });
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
        queryClient.invalidateQueries({
          queryKey: trpc.orders.getOrders.queryKey(),
        });
        toast.success("Order updated.", { position: "bottom-center" });
        setOpen(false);
      },
    }),
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

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [items]);

  const browseDateStr = toLocalDateString(browseDate);

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

  const quickAddItem = (entry: MenuEntry) => {
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

  const openModifierDialogForEntry = (entry: MenuEntry) => {
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

  const handleSubmit = () => {
    if (!selectedUserId || items.length === 0) return;

    if (dataAndMode.mode === "edit" && dataAndMode.data) {
      const updateItems = items.map((item) => ({
        orderItemId: item.orderItemId,
        menuEntryId: item.menuEntryId,
        quantity: item.quantity,
        modifierOptionIds: item.modifierOptionIds,
        specialInstructions: item.specialInstructions,
      }));
      updateOrderMutation.mutate({
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
      createOrderMutation.mutate({
        userId: selectedUserId,
        items: createItems,
      });
    }
  };

  const formatBrowseDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const isToday = d.getTime() === today.getTime();
    const formatted = d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
    return isToday ? `Today, ${formatted}` : formatted;
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
          {dataAndMode.mode === "view"
            ? "View Order"
            : dataAndMode.mode === "edit"
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
          {selectedUser && dataAndMode.mode !== "edit" && (
            <div className="flex justify-between items-center p-3 bg-muted rounded-md">
              <div>
                <div className="font-medium">{selectedUser.name}</div>
                {selectedUser.phoneNumber && (
                  <div className="text-sm text-muted-foreground">
                    {selectedUser.phoneNumber}
                  </div>
                )}
              </div>
              {dataAndMode.mode !== "view" && (
                <Button variant="ghost" size="sm" onClick={() => setStep("user")}>
                  Change
                </Button>
              )}
            </div>
          )}

          {/* Date selector + menu items + search (hidden in view mode and when locked) */}
          {dataAndMode.mode !== "view" && !isLocked && (
            <>
              {/* Date selector popover */}
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                  >
                    <CalendarDays className="h-4 w-4" />
                    {formatBrowseDate(browseDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <DayPicker
                    mode="single"
                    selected={browseDate}
                    onSelect={(date) => {
                      if (date) {
                        setBrowseDate(date);
                        setDatePickerOpen(false);
                      }
                    }}
                    className="rounded-lg"
                  />
                </PopoverContent>
              </Popover>

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
                        {dataAndMode.mode === "view" || isLocked ? (
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
          </div>
          {/* Total */}
          {items.length > 0 && (
            <div className="px-6 py-3 border-t">
              <div className="flex justify-between font-medium text-lg">
                <span>Total</span>
                <span>{formatCents(total)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="px-6 py-4 border-t flex justify-end gap-2">
        {dataAndMode.mode === "view" ? (
          <Button onClick={() => setOpen(false)}>Close</Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                isLocked ||
                !selectedUserId ||
                items.length === 0 ||
                createOrderMutation.isPending ||
                updateOrderMutation.isPending
              }
              onClick={handleSubmit}
            >
              {createOrderMutation.isPending || updateOrderMutation.isPending
                ? dataAndMode.mode === "edit"
                  ? "Updating..."
                  : "Creating..."
                : dataAndMode.mode === "edit"
                  ? "Update Order"
                  : "Create Order"}
            </Button>
          </>
        )}
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
