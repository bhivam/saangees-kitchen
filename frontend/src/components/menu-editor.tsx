import { useState } from "react";
import { Button } from "./ui/button";
import { AddItemDialog } from "./add-item-dialog";
import { ArrowUp, ArrowDown, Plus, Trash } from "lucide-react";
import { useTRPC, useTRPCClient, type RouterOutputs } from "@/trpc";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DayPicker } from "react-day-picker";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";
import "react-day-picker/style.css";

type MenuEntry = RouterOutputs["menu"]["getByDate"][number];
type MenuItem = MenuEntry["menuItem"];

function isOptimisticEntry(id: string) {
  return id.startsWith("optim-");
}

export function MenuEditor() {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );

  const dateString = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`
    : "";

  const { data: allItems, isPending: allItemsPending } = useQuery(
    trpc.menuItems.getMenuItems.queryOptions(),
  );

  const menuQueryOptions = trpc.menu.getByDate.queryOptions(
    { date: dateString },
    {
      enabled: !!dateString,
    },
  );

  const { data: existingMenu, isPending: menuPending } =
    useQuery(menuQueryOptions);

  const menuEntries = existingMenu ?? [];
  const selectedItemIds = new Set(menuEntries.map((e) => e.menuItem.id));
  const unselectedItems =
    allItems?.filter((item) => !selectedItemIds.has(item.id)) ?? [];

  const addItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const currentEntries =
        queryClient.getQueryData<MenuEntry[]>(menuQueryOptions.queryKey) ?? [];
      const currentIds = currentEntries
        .filter((e) => !isOptimisticEntry(e.id))
        .map((e) => e.menuItem.id);
      return trpcClient.menu.save.mutate({
        date: dateString,
        itemsToSave: [...currentIds, itemId],
        itemsToDelete: [],
      });
    },
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: menuQueryOptions.queryKey });
      const previous = queryClient.getQueryData<MenuEntry[]>(
        menuQueryOptions.queryKey,
      );

      const itemToAdd = allItems?.find((i) => i.id === itemId);
      if (!itemToAdd) return { previous };

      const currentEntries = previous ?? [];
      const optimisticEntry: MenuEntry = {
        id: `optim-${crypto.randomUUID()}`,
        date: dateString,
        sortOrder: currentEntries.length,
        menuItem: itemToAdd,
        hasOrders: false,
      };

      queryClient.setQueryData(menuQueryOptions.queryKey, [
        ...currentEntries,
        optimisticEntry,
      ]);
      return { previous };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(menuQueryOptions.queryKey, data.entries);
    },
    onError: (err, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(menuQueryOptions.queryKey, context.previous);
      }
      toast.error("Failed to add item", { description: err.message });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const currentEntries =
        queryClient.getQueryData<MenuEntry[]>(menuQueryOptions.queryKey) ?? [];
      const remainingIds = currentEntries
        .filter((e) => e.id !== entryId && !isOptimisticEntry(e.id))
        .map((e) => e.menuItem.id);
      return trpcClient.menu.save.mutate({
        date: dateString,
        itemsToSave: remainingIds,
        itemsToDelete: [entryId],
      });
    },
    onMutate: async (entryId) => {
      await queryClient.cancelQueries({ queryKey: menuQueryOptions.queryKey });
      const previous = queryClient.getQueryData<MenuEntry[]>(
        menuQueryOptions.queryKey,
      );

      const filtered = (previous ?? []).filter((e) => e.id !== entryId);
      queryClient.setQueryData(menuQueryOptions.queryKey, filtered);
      return { previous };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(menuQueryOptions.queryKey, data.entries);
    },
    onError: (err, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(menuQueryOptions.queryKey, context.previous);
      }
      toast.error("Failed to remove item", { description: err.message });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({
      entryId,
      direction,
      currentEntries,
    }: {
      entryId: string;
      direction: "up" | "down";
      currentEntries: MenuEntry[];
    }) => {
      const index = currentEntries.findIndex((e) => e.id === entryId);
      const newIndex = direction === "up" ? index - 1 : index + 1;

      const reordered = [...currentEntries];
      [reordered[index], reordered[newIndex]] = [
        reordered[newIndex],
        reordered[index],
      ];

      return trpcClient.menu.save.mutate({
        date: dateString,
        itemsToSave: reordered
          .filter((e) => !isOptimisticEntry(e.id))
          .map((e) => e.menuItem.id),
        itemsToDelete: [],
      });
    },
    onMutate: async ({ entryId, direction }) => {
      await queryClient.cancelQueries({ queryKey: menuQueryOptions.queryKey });
      const previous = queryClient.getQueryData<MenuEntry[]>(
        menuQueryOptions.queryKey,
      );

      const currentEntries = previous ?? [];
      const index = currentEntries.findIndex((e) => e.id === entryId);
      const newIndex = direction === "up" ? index - 1 : index + 1;

      const reordered = [...currentEntries];
      const [item] = reordered.splice(index, 1);
      reordered.splice(newIndex, 0, item);

      const withUpdatedOrder = reordered.map((e, i) => ({
        ...e,
        sortOrder: i,
      }));

      queryClient.setQueryData(menuQueryOptions.queryKey, withUpdatedOrder);
      return { previous };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(menuQueryOptions.queryKey, data.entries);
    },
    onError: (err, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(menuQueryOptions.queryKey, context.previous);
      }
      toast.error("Failed to reorder items", { description: err.message });
    },
  });

  const isMutating =
    addItemMutation.isPending ||
    removeItemMutation.isPending ||
    reorderMutation.isPending;

  const handleAddItem = (item: MenuItem) => {
    if (!dateString) {
      toast.error("Please select a date");
      return;
    }
    addItemMutation.mutate(item.id);
  };

  const handleRemoveItem = (entryId: string) => {
    removeItemMutation.mutate(entryId);
  };

  const handleMoveUp = (entryId: string, index: number) => {
    if (index > 0) {
      reorderMutation.mutate({
        entryId,
        direction: "up",
        currentEntries: [...menuEntries],
      });
    }
  };

  const handleMoveDown = (entryId: string, index: number) => {
    if (index < menuEntries.length - 1) {
      reorderMutation.mutate({
        entryId,
        direction: "down",
        currentEntries: [...menuEntries],
      });
    }
  };

  const isLoading = allItemsPending || menuPending;

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 border-r p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Daily Menu</h2>
          <AddItemDialog />
        </div>

        {isLoading ? (
          <>
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Today's Menu
              </h3>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-full mt-2" />
                    </div>
                    <Skeleton className="h-8 w-20 shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Available Items
              </h3>
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-3/4 mt-2" />
                    </div>
                    <Skeleton className="h-8 w-16 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Today's Menu
              </h3>

              {menuEntries.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <p className="text-muted-foreground">
                    No items selected for this date.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click items below to add them to the menu.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {menuEntries.map((entry, index) => {
                    const isOptimistic = isOptimisticEntry(entry.id);
                    return (
                      <div
                        key={entry.id}
                        className={cn(
                          "flex items-start gap-4 p-4 rounded-lg border transition-opacity",
                          isOptimistic
                            ? "border-primary/30 bg-primary/5 opacity-60"
                            : "border-primary/50 bg-primary/5",
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <h4 className="font-semibold truncate">
                              {entry.menuItem.name}
                            </h4>
                            <span className="text-sm font-medium text-primary shrink-0">
                              ${(entry.menuItem.basePrice / 100).toFixed(2)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {entry.menuItem.description}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <div className="flex flex-col gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleMoveUp(entry.id, index)}
                              disabled={
                                index === 0 || isMutating || isOptimistic
                              }
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleMoveDown(entry.id, index)}
                              disabled={
                                index === menuEntries.length - 1 ||
                                isMutating ||
                                isOptimistic
                              }
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                            onClick={() => handleRemoveItem(entry.id)}
                            disabled={
                              entry.hasOrders || isMutating || isOptimistic
                            }
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Available Items
              </h3>

              {unselectedItems.length === 0 && menuEntries.length > 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  All items have been added to today's menu.
                </p>
              ) : unselectedItems.length === 0 && menuEntries.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>No items available.</p>
                  <p className="text-sm mt-1">Create some items first.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {unselectedItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-lg border bg-background transition-colors",
                        isMutating
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-muted/50 cursor-pointer",
                      )}
                      onClick={() => !isMutating && handleAddItem(item)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <h4 className="font-medium truncate">{item.name}</h4>
                          <span className="text-sm text-muted-foreground shrink-0">
                            ${(item.basePrice / 100).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {item.description}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        disabled={isMutating}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="w-96 p-6 flex flex-col border-l">
        <h2 className="text-lg font-semibold mb-4">Select Date</h2>
        <div className="flex justify-center">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={{ before: new Date() }}
            className="border rounded-lg p-4"
          />
        </div>

        {selectedDate && (
          <div className="mt-auto pt-4 border-t">
            <p className="text-sm text-muted-foreground">Editing menu for:</p>
            <p className="font-medium">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

