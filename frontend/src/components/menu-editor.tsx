import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { AddItemDialog } from "./add-item-dialog";
import { ArrowUp, ArrowDown, Save } from "lucide-react";
import { useTRPC } from "@/trpc";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [selectedItems, setSelectedItems] = useState<MenuItem[]>([]);

  const dateString = selectedDate
    ? selectedDate.toISOString().split("T")[0]
    : "";

  const { data: allItems } = useQuery(
    trpc.menuItems.getMenuItems.queryOptions(),
  );

  const { data: existingMenu } = useQuery(
    trpc.menu.getByDate.queryOptions(
      { date: dateString },
      { enabled: !!dateString },
    ),
  );

  const createMenu = useMutation(
    trpc.menu.create.mutationOptions({
      onSuccess: (data) => {
        toast.success("Menu saved", {
          description: `Menu for ${data.date} created successfully`,
        });
      },
    }),
  );

  const updateMenu = useMutation(
    trpc.menu.update.mutationOptions({
      onSuccess: (data) => {
        toast.success("Menu saved", {
          description: `Menu for ${data.date} updated successfully`,
        });
      },
    }),
  );

  // Load existing menu when date changes or menu data is fetched
  useEffect(() => {
    if (existingMenu && existingMenu.length > 0) {
      const items = existingMenu.map((entry) => entry.menuItem);
      setSelectedItems(items);
    } else {
      setSelectedItems([]);
    }
  }, [existingMenu]);

  const handleSave = async () => {
    if (!dateString) {
      toast.error("Please select a date");
      return;
    }

    const itemIds = selectedItems.map((item) => item.id);

    if (existingMenu && existingMenu.length > 0) {
      await updateMenu.mutateAsync({ date: dateString, items: itemIds });
    } else {
      await createMenu.mutateAsync({ date: dateString, items: itemIds });
    }
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

  return (
    <div className="flex h-full">
      {/* Left column: Item selector */}
      <div className="flex-1 border-r p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Menu Items</h2>
          <div className="flex gap-2">
            <AddItemDialog />
            <Button onClick={handleSave} disabled={!dateString}>
              <Save className="mr-2 h-4 w-4" />
              Save Menu
            </Button>
          </div>
        </div>

        {/* Selected items */}
        {selectedItems.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Selected ({selectedItems.length})
            </h3>
            <div className="space-y-2">
              {selectedItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-4 rounded-lg border bg-primary/10 border-primary"
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ${(item.basePrice / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === selectedItems.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unselected items */}
        {unselectedItems.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Available Items
            </h3>
            <div className="space-y-2">
              {unselectedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-4 rounded-lg border bg-background hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => handleAddItem(item)}
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.description}
                    </div>
                    <div className="text-sm font-semibold mt-1">
                      ${(item.basePrice / 100).toFixed(2)}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {unselectedItems.length === 0 && selectedItems.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <p>No items available. Create some items first.</p>
          </div>
        )}
      </div>

      {/* Right column: Calendar */}
      <div className="w-96 p-6 flex flex-col">
        <h2 className="text-2xl font-bold mb-6">Select Date</h2>
        <div className="flex justify-center">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={{ before: new Date() }}
            className="border rounded-lg p-4"
          />
        </div>
        {dateString && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="text-sm font-semibold text-muted-foreground">
              Selected Date
            </div>
            <div className="text-lg font-bold mt-1">{dateString}</div>
          </div>
        )}
      </div>
    </div>
  );
}

