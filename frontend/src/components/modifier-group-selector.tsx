import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { ArrowUp, ArrowDown, Trash2, Plus, Search } from "lucide-react";

export type SelectedModifierGroup = {
  groupId: string;
  groupName: string;
  minSelect: number;
  maxSelect: number | null;
};

interface ModifierGroupSelectorProps {
  selectedGroups: SelectedModifierGroup[];
  onSelectGroup: (group: SelectedModifierGroup) => void;
  onRemoveGroup: (groupId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onCreateNew: () => void;
}

export function ModifierGroupSelector({
  selectedGroups,
  onSelectGroup,
  onRemoveGroup,
  onReorder,
  onCreateNew,
}: ModifierGroupSelectorProps) {
  const [search, setSearch] = useState("");
  const trpc = useTRPC();

  const modifierGroupsQuery = useQuery(
    trpc.modifierGroups.getModifierGroups.queryOptions(),
  );

  const availableGroups = useMemo(() => {
    if (!modifierGroupsQuery.data) return [];

    const selectedIds = new Set(selectedGroups.map((g) => g.groupId));
    const filtered = modifierGroupsQuery.data.filter(
      (group) => !selectedIds.has(group.id),
    );

    if (!search.trim()) return filtered;

    const searchLower = search.toLowerCase();
    return filtered.filter(
      (group) =>
        group.name.toLowerCase().includes(searchLower) ||
        group.options.some((opt) =>
          opt.name.toLowerCase().includes(searchLower),
        ),
    );
  }, [modifierGroupsQuery.data, selectedGroups, search]);

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      onReorder(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < selectedGroups.length - 1) {
      onReorder(index, index + 1);
    }
  };

  return (
    <div className="grid gap-3">
      <Label className="text-base font-semibold">Modifier Groups</Label>

      {/* Selected groups */}
      {selectedGroups.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Selected ({selectedGroups.length})
          </p>
          {selectedGroups.map((group, index) => (
            <div
              key={group.groupId}
              className="flex items-center gap-3 p-3 rounded-lg border bg-primary/10 border-primary"
            >
              <div className="flex-1">
                <div className="font-medium">{group.groupName}</div>
                <div className="text-sm text-muted-foreground">
                  {group.minSelect === 0 ? "Optional" : `Min: ${group.minSelect}`}
                  {group.maxSelect && ` · Max: ${group.maxSelect}`}
                </div>
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
                  disabled={index === selectedGroups.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveGroup(group.groupId)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search and create */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search modifiers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="button" variant="secondary" onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
      </div>

      {/* Available groups */}
      {availableGroups.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          <p className="text-sm text-muted-foreground">Available</p>
          {availableGroups.map((group) => (
            <div
              key={group.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted cursor-pointer transition-colors"
              onClick={() =>
                onSelectGroup({
                  groupId: group.id,
                  groupName: group.name,
                  minSelect: group.minSelect,
                  maxSelect: group.maxSelect,
                })
              }
            >
              <div className="flex-1">
                <div className="font-medium">{group.name}</div>
                <div className="text-sm text-muted-foreground">
                  {group.minSelect === 0 ? "Optional" : `Min: ${group.minSelect}`}
                  {group.maxSelect && ` · Max: ${group.maxSelect}`}
                  {group.options.length > 0 && (
                    <span className="ml-2">
                      · {group.options.map((o) => o.name).join(", ")}
                    </span>
                  )}
                </div>
              </div>
              <Button type="button" variant="outline" size="sm">
                Add
              </Button>
            </div>
          ))}
        </div>
      )}

      {availableGroups.length === 0 && modifierGroupsQuery.data && (
        <p className="text-sm text-muted-foreground text-center py-4">
          {search
            ? "No matching modifier groups found"
            : "All modifier groups have been added"}
        </p>
      )}

      {modifierGroupsQuery.isLoading && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Loading modifier groups...
        </p>
      )}

      {modifierGroupsQuery.isError && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No modifier groups available. Create one to get started.
        </p>
      )}
    </div>
  );
}
