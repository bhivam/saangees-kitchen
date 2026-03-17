import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { ArrowUp, ArrowDown, Trash2, Search } from "lucide-react";

export type SelectedMenuItem = {
  menuItemId: string;
  menuItemName: string;
};

interface MenuItemSelectorProps {
  selectedItems: SelectedMenuItem[];
  onSelectItem: (item: SelectedMenuItem) => void;
  onRemoveItem: (menuItemId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function MenuItemSelector({
  selectedItems,
  onSelectItem,
  onRemoveItem,
  onReorder,
}: MenuItemSelectorProps) {
  const [search, setSearch] = useState("");
  const trpc = useTRPC();

  const menuItemsQuery = useQuery(
    trpc.menuItems.getMenuItems.queryOptions(),
  );

  const availableItems = useMemo(() => {
    if (!menuItemsQuery.data) return [];

    const selectedIds = new Set(selectedItems.map((i) => i.menuItemId));
    const filtered = menuItemsQuery.data.filter(
      (item) => !selectedIds.has(item.id),
    );

    if (!search.trim()) return filtered;

    const searchLower = search.toLowerCase();
    return filtered.filter((item) =>
      item.name.toLowerCase().includes(searchLower),
    );
  }, [menuItemsQuery.data, selectedItems, search]);

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      onReorder(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < selectedItems.length - 1) {
      onReorder(index, index + 1);
    }
  };

  return (
    <div className="grid gap-3">
      <Label className="text-base font-semibold">Menu Items</Label>

      {selectedItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Selected ({selectedItems.length})
          </p>
          {selectedItems.map((item, index) => (
            <div
              key={item.menuItemId}
              className="flex items-center gap-3 p-3 rounded-lg border bg-primary/10 border-primary"
            >
              <div className="flex-1">
                <div className="font-medium">{item.menuItemName}</div>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === selectedItems.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveItem(item.menuItemId)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search menu items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {availableItems.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          <p className="text-sm text-muted-foreground">Available</p>
          {availableItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted cursor-pointer transition-colors"
              onClick={() =>
                onSelectItem({
                  menuItemId: item.id,
                  menuItemName: item.name,
                })
              }
            >
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-muted-foreground">
                  ${(item.basePrice / 100).toFixed(2)}
                </div>
              </div>
              <Button type="button" variant="outline" size="sm">
                Add
              </Button>
            </div>
          ))}
        </div>
      )}

      {availableItems.length === 0 && menuItemsQuery.data && (
        <p className="text-sm text-muted-foreground text-center py-4">
          {search
            ? "No matching menu items found"
            : "All menu items have been added"}
        </p>
      )}

      {menuItemsQuery.isLoading && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Loading menu items...
        </p>
      )}
    </div>
  );
}
