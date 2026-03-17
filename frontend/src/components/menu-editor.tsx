import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { AddItemDialog } from "./add-item-dialog";
import { ArrowUp, ArrowDown, Plus, Trash } from "lucide-react";
import { useTRPC, type RouterOutputs } from "@/trpc";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "./ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";
import { cn, toLocalDateString } from "@/lib/utils";
import { DateSelector } from "./orders/date-selector";

type MenuEntry = RouterOutputs["menu"]["getByDate"][number];
type MenuItem = MenuEntry["menuItem"];

type ComboEntry = RouterOutputs["combos"]["getComboEntriesByDate"][number];

function isOptimisticEntry(id: string) {
  return id.startsWith("optim-");
}

export function MenuEditor() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [dateString, setDateString] = useState<string>(
    toLocalDateString(new Date()),
  );

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

  const selectedItemIds = useMemo(
    () => new Set(menuEntries.map((e) => e.menuItem.id)),
    [menuEntries],
  );
  const unselectedItems =
    allItems?.filter((item) => !selectedItemIds.has(item.id)) ?? [];

  const getMenuEntries = () =>
    queryClient.getQueryData<MenuEntry[]>(menuQueryOptions.queryKey) ?? [];

  const getNonOptimisticIds = (entries: MenuEntry[]) =>
    entries.filter((e) => !isOptimisticEntry(e.id)).map((e) => e.menuItem.id);

  const addItemMutation = useMutation(
    trpc.menu.save.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({
          queryKey: menuQueryOptions.queryKey,
        });
        const previous = getMenuEntries();

        const existingIds = new Set(previous.map((e) => e.menuItem.id));
        const newItemId = input.itemsToSave.find((id) => !existingIds.has(id));
        const itemToAdd = allItems?.find((i) => i.id === newItemId);
        if (!itemToAdd) return { previous };

        const optimisticEntry: MenuEntry = {
          id: `optim-${crypto.randomUUID()}`,
          date: dateString,
          sortOrder: previous.length,
          menuItem: itemToAdd,
          hasOrders: false,
        };

        queryClient.setQueryData(menuQueryOptions.queryKey, [
          ...previous,
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
    }),
  );

  const removeItemMutation = useMutation(
    trpc.menu.save.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({
          queryKey: menuQueryOptions.queryKey,
        });
        const previous = getMenuEntries();

        const deleteIds = new Set(input.itemsToDelete);
        const filtered = previous.filter((e) => !deleteIds.has(e.id));
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
    }),
  );

  const reorderMutation = useMutation(
    trpc.menu.save.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({
          queryKey: menuQueryOptions.queryKey,
        });
        const previous = getMenuEntries();

        const entryMap = new Map(previous.map((e) => [e.menuItem.id, e]));
        const reordered = input.itemsToSave
          .map((id) => entryMap.get(id))
          .filter((e): e is MenuEntry => !!e)
          .map((e, i) => ({ ...e, sortOrder: i }));

        queryClient.setQueryData(menuQueryOptions.queryKey, reordered);
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
    }),
  );

  // Combo queries and mutations
  const { data: allCombos, isPending: allCombosPending } = useQuery(
    trpc.combos.getCombos.queryOptions(),
  );

  const comboEntriesQueryOptions = trpc.combos.getComboEntriesByDate.queryOptions(
    { date: dateString },
    { enabled: !!dateString },
  );

  const { data: existingComboEntries, isPending: comboEntriesPending } =
    useQuery(comboEntriesQueryOptions);

  const comboEntriesList = existingComboEntries ?? [];

  const comboProtectedItemIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of comboEntriesList) {
      for (const ci of entry.combo.comboItems) {
        ids.add(ci.menuItem.id);
      }
    }
    return ids;
  }, [comboEntriesList]);

  const selectedComboIds = useMemo(
    () => new Set(comboEntriesList.map((e) => e.combo.id)),
    [comboEntriesList],
  );
  const unselectedCombos =
    allCombos?.filter((combo) => !selectedComboIds.has(combo.id)) ?? [];

  const getComboEntries = () =>
    queryClient.getQueryData<ComboEntry[]>(comboEntriesQueryOptions.queryKey) ?? [];

  const getNonOptimisticComboIds = (entries: ComboEntry[]) =>
    entries.filter((e) => !isOptimisticEntry(e.id)).map((e) => e.combo.id);

  const addComboMutation = useMutation(
    trpc.combos.saveComboEntries.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: comboEntriesQueryOptions.queryKey });
        const previous = getComboEntries();

        const existingIds = new Set(previous.map((e) => e.combo.id));
        const newComboId = input.combosToSave.find((id) => !existingIds.has(id));
        const comboToAdd = allCombos?.find((c) => c.id === newComboId);
        if (!comboToAdd) return { previous };

        const optimisticEntry: ComboEntry = {
          id: `optim-${crypto.randomUUID()}`,
          date: dateString,
          comboId: comboToAdd.id,
          sortOrder: previous.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          combo: comboToAdd,
        };

        queryClient.setQueryData(comboEntriesQueryOptions.queryKey, [
          ...previous,
          optimisticEntry,
        ]);
        return { previous };
      },
      onSuccess: (data) => {
        queryClient.setQueryData(comboEntriesQueryOptions.queryKey, data.entries);
        // Combo may have auto-added constituent items to the menu
        queryClient.invalidateQueries({ queryKey: menuQueryOptions.queryKey });
      },
      onError: (err, _, context) => {
        if (context?.previous) {
          queryClient.setQueryData(comboEntriesQueryOptions.queryKey, context.previous);
        }
        toast.error("Failed to add combo", { description: err.message });
      },
    }),
  );

  const removeComboMutation = useMutation(
    trpc.combos.saveComboEntries.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: comboEntriesQueryOptions.queryKey });
        const previous = getComboEntries();

        const deleteIds = new Set(input.combosToDelete);
        const filtered = previous.filter((e) => !deleteIds.has(e.id));
        queryClient.setQueryData(comboEntriesQueryOptions.queryKey, filtered);
        return { previous };
      },
      onSuccess: (data) => {
        queryClient.setQueryData(comboEntriesQueryOptions.queryKey, data.entries);
      },
      onError: (err, _, context) => {
        if (context?.previous) {
          queryClient.setQueryData(comboEntriesQueryOptions.queryKey, context.previous);
        }
        toast.error("Failed to remove combo", { description: err.message });
      },
    }),
  );

  const reorderComboMutation = useMutation(
    trpc.combos.saveComboEntries.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: comboEntriesQueryOptions.queryKey });
        const previous = getComboEntries();

        const entryMap = new Map(previous.map((e) => [e.combo.id, e]));
        const reordered = input.combosToSave
          .map((id) => entryMap.get(id))
          .filter((e): e is ComboEntry => !!e)
          .map((e, i) => ({ ...e, sortOrder: i }));

        queryClient.setQueryData(comboEntriesQueryOptions.queryKey, reordered);
        return { previous };
      },
      onSuccess: (data) => {
        queryClient.setQueryData(comboEntriesQueryOptions.queryKey, data.entries);
      },
      onError: (err, _, context) => {
        if (context?.previous) {
          queryClient.setQueryData(comboEntriesQueryOptions.queryKey, context.previous);
        }
        toast.error("Failed to reorder combos", { description: err.message });
      },
    }),
  );

  const isComboMutating =
    addComboMutation.isPending ||
    removeComboMutation.isPending ||
    reorderComboMutation.isPending;

  const handleAddCombo = (combo: ComboEntry["combo"]) => {
    if (!dateString) {
      toast.error("Please select a date");
      return;
    }
    const currentIds = getNonOptimisticComboIds(getComboEntries());
    addComboMutation.mutate({
      date: dateString,
      combosToSave: [...currentIds, combo.id],
      combosToDelete: [],
    });
  };

  const handleRemoveCombo = (entryId: string) => {
    const remainingIds = getNonOptimisticComboIds(
      getComboEntries().filter((e) => e.id !== entryId),
    );
    removeComboMutation.mutate({
      date: dateString,
      combosToSave: remainingIds,
      combosToDelete: [entryId],
    });
  };

  const handleComboMoveUp = (index: number) => {
    if (index <= 0) return;
    const reordered = [...comboEntriesList];
    [reordered[index], reordered[index - 1]] = [reordered[index - 1], reordered[index]];
    reorderComboMutation.mutate({
      date: dateString,
      combosToSave: getNonOptimisticComboIds(reordered),
      combosToDelete: [],
    });
  };

  const handleComboMoveDown = (index: number) => {
    if (index >= comboEntriesList.length - 1) return;
    const reordered = [...comboEntriesList];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    reorderComboMutation.mutate({
      date: dateString,
      combosToSave: getNonOptimisticComboIds(reordered),
      combosToDelete: [],
    });
  };

  const isMutating =
    addItemMutation.isPending ||
    removeItemMutation.isPending ||
    reorderMutation.isPending ||
    isComboMutating;

  const handleAddItem = (item: MenuItem) => {
    if (!dateString) {
      toast.error("Please select a date");
      return;
    }
    const currentIds = getNonOptimisticIds(getMenuEntries());
    addItemMutation.mutate({
      date: dateString,
      itemsToSave: [...currentIds, item.id],
      itemsToDelete: [],
    });
  };

  const handleRemoveItem = (entryId: string) => {
    const remainingIds = getNonOptimisticIds(
      getMenuEntries().filter((e) => e.id !== entryId),
    );
    removeItemMutation.mutate({
      date: dateString,
      itemsToSave: remainingIds,
      itemsToDelete: [entryId],
    });
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const reordered = [...menuEntries];
    [reordered[index], reordered[index - 1]] = [
      reordered[index - 1],
      reordered[index],
    ];
    reorderMutation.mutate({
      date: dateString,
      itemsToSave: getNonOptimisticIds(reordered),
      itemsToDelete: [],
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= menuEntries.length - 1) return;
    const reordered = [...menuEntries];
    [reordered[index], reordered[index + 1]] = [
      reordered[index + 1],
      reordered[index],
    ];
    reorderMutation.mutate({
      date: dateString,
      itemsToSave: getNonOptimisticIds(reordered),
      itemsToDelete: [],
    });
  };

  const isLoading = allItemsPending || menuPending || allCombosPending || comboEntriesPending;

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">Daily Menu</h2>
            <DateSelector
              selectedDate={dateString}
              onDateSelect={setDateString}
            />
          </div>
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

              {menuEntries.length > 0 && (
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
                              onClick={() => handleMoveUp(index)}
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
                              onClick={() => handleMoveDown(index)}
                              disabled={
                                index === menuEntries.length - 1 ||
                                isMutating ||
                                isOptimistic
                              }
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </div>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleRemoveItem(entry.id)}
                                  disabled={
                                    entry.hasOrders ||
                                    isMutating ||
                                    isOptimistic ||
                                    comboProtectedItemIds.has(entry.menuItem.id)
                                  }
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {comboProtectedItemIds.has(entry.menuItem.id) && (
                              <TooltipContent>
                                Required by an active combo. Remove the combo first.
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            {/* Combos in Today's Menu */}
            {comboEntriesList.length > 0 && (
              <div className="space-y-2 mt-4">
                {comboEntriesList.map((entry, index) => {
                  const isOptimistic = isOptimisticEntry(entry.id);
                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-lg border transition-opacity",
                        isOptimistic
                          ? "border-purple-300/30 bg-purple-50 opacity-60"
                          : "border-purple-300/50 bg-purple-50",
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <h4 className="font-semibold truncate">
                            {entry.combo.name}
                          </h4>
                          <span className="text-sm font-medium text-purple-700 shrink-0">
                            -{" "}${(entry.combo.discountAmount / 100).toFixed(2)} off
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {entry.combo.comboItems
                            .sort((a, b) => a.sortOrder - b.sortOrder)
                            .map((ci) => ci.menuItem.name)
                            .join(", ")}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleComboMoveUp(index)}
                            disabled={index === 0 || isMutating || isOptimistic}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleComboMoveDown(index)}
                            disabled={
                              index === comboEntriesList.length - 1 ||
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
                          onClick={() => handleRemoveCombo(entry.id)}
                          disabled={isMutating || isOptimistic}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

              {menuEntries.length === 0 && comboEntriesList.length === 0 && (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <p className="text-muted-foreground">
                    No items or combos selected for this date.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click items below to add them to the menu.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
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

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Available Combos
                </h3>

                {unselectedCombos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {allCombos && allCombos.length > 0
                      ? "All combos have been added to today's menu."
                      : "No combos available. Create some in the Combo Manager."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {unselectedCombos.map((combo) => (
                      <div
                        key={combo.id}
                        className={cn(
                          "flex items-start gap-4 p-4 rounded-lg border bg-background transition-colors",
                          isMutating
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-muted/50 cursor-pointer",
                        )}
                        onClick={() => !isMutating && handleAddCombo(combo)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <h4 className="font-medium truncate">{combo.name}</h4>
                            <span className="text-sm text-muted-foreground shrink-0">
                              ${(combo.discountAmount / 100).toFixed(2)} off
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {combo.comboItems
                              .sort((a, b) => a.sortOrder - b.sortOrder)
                              .map((ci) => ci.menuItem.name)
                              .join(", ")}
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}

