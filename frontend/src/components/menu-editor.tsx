import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { AddItemDialog } from "./add-item-dialog";
import { ArrowUp, ArrowDown, Save, X, Plus, Loader2 } from "lucide-react";
import { useTRPC } from "@/trpc";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

type MenuItem = {
  id: string;
  name: string;
  description: string;
  basePrice: number;
};

function moveItem<T>(arr: T[], from: number, to: number) {
  const result = arr.slice();
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

export function MenuEditor() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [selectedItems, setSelectedItems] = useState<MenuItem[]>([]);

  const dateString = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`
    : "";

  const { data: allItems } = useQuery(
    trpc.menuItems.getMenuItems.queryOptions(),
  );

  const menuQueryOptions = trpc.menu.getByDate.queryOptions(
    { date: dateString },
    {
      enabled: !!dateString,
      placeholderData: (prev) => prev,
    },
  );

  const { data: existingMenu, isFetching } = useQuery(menuQueryOptions);

  // Single save mutation - backend handles both create and update identically
  const saveMenu = useMutation(
    trpc.menu.save.mutationOptions({
      onSettled: (data, error) => {
        if (error) {
          toast.error("Failed to save menu", {
            description: error.message,
          });
          return;
        }
        if (data) {
          // Update the cache with the response from the server
          // This ensures the UI reflects exactly what's in the database
          queryClient.setQueryData(menuQueryOptions.queryKey, data.entries);

          // Also update local state to match server response
          setSelectedItems(data.entries.map((entry) => entry.menuItem));

          toast.success("Menu saved", {
            description: `Menu for ${data.date} saved successfully`,
          });
        }
      },
    }),
  );

  // Load existing menu when date changes or menu data is fetched
  // Only update when we have fresh data (not stale placeholder data)
  useEffect(() => {
    if (isFetching) return;
    if (existingMenu && existingMenu.length > 0) {
      const items = existingMenu.map((entry) => entry.menuItem);
      setSelectedItems(items);
    } else {
      setSelectedItems([]);
    }
  }, [existingMenu, isFetching]);

  const handleSave = () => {
    if (!dateString) {
      toast.error("Please select a date");
      return;
    }

    // Deduplicate items before sending to backend
    const uniqueItemIds = [...new Set(selectedItems.map((item) => item.id))];
    saveMenu.mutate({ date: dateString, items: uniqueItemIds });
  };

  const handleAddItem = (item: MenuItem) => {
    setSelectedItems((prev) => [...prev, item]);
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      setSelectedItems((prev) => moveItem(prev, index, index - 1));
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < selectedItems.length - 1) {
      setSelectedItems((prev) => moveItem(prev, index, index + 1));
    }
  };

  const unselectedItems =
    allItems?.filter(
      (item) => !selectedItems.some((selected) => selected.id === item.id),
    ) || [];

  const isSaving = saveMenu.isPending;

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 border-r p-6 overflow-y-auto relative">
        {isFetching && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Daily Menu</h2>
          <div className="flex gap-2">
            <AddItemDialog />
            <Button onClick={handleSave} disabled={!dateString || isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isSaving ? "Saving..." : "Save Menu"}
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Today's Menu
          </h3>

          {selectedItems.length === 0 ? (
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
              {selectedItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-primary/50 bg-primary/5"
                >
                  {/* Order number */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                    {index + 1}
                  </div>

                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h4 className="font-semibold truncate">{item.name}</h4>
                      <span className="text-sm font-medium text-primary shrink-0">
                        ${(item.basePrice / 100).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {item.description}
                    </p>
                  </div>

                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === selectedItems.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Remove button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Available Items
          </h3>

          {unselectedItems.length === 0 && selectedItems.length > 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              All items have been added to today's menu.
            </p>
          ) : unselectedItems.length === 0 && selectedItems.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No items available.</p>
              <p className="text-sm mt-1">Create some items first.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {unselectedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-background hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleAddItem(item)}
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
                  <Button variant="outline" size="sm" className="shrink-0">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right column: Date picker */}
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

        {/* Date summary */}
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

