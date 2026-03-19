import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogHeader,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { ComboEntry } from "./customer-menu-view";
import { DialogClose, DialogDescription } from "@radix-ui/react-dialog";
import { formatCents } from "@/lib/utils";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
import { QuantityStepper } from "./quantity-stepper";
import { useCart } from "@/hooks/use-cart";

type ComboItem = ComboEntry["combo"]["comboItems"][number];

export function AddComboCartDialog({
  comboEntry,
  open,
  onOpenChange,
}: {
  comboEntry: ComboEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const combo = comboEntry.combo;
  const sortedItems = [...combo.comboItems].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  const { addComboToCart } = useCart();

  const [expandedIndex, setExpandedIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [itemConfigs, setItemConfigs] = useState<
    Array<{
      modifierSelections: Record<string, string[]>;
      specialInstructions: string;
    }>
  >(
    sortedItems.map((ci) => ({
      modifierSelections: Object.fromEntries(
        ci.menuItem.modifierGroups.map((mg) => [mg.modifierGroup.id, []]),
      ),
      specialInstructions: "",
    })),
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const calculateTotalPrice = () => {
    let total = 0;
    for (let i = 0; i < sortedItems.length; i++) {
      const ci = sortedItems[i];
      let itemPrice = ci.menuItem.basePrice;
      const config = itemConfigs[i];
      for (const [groupId, optionIds] of Object.entries(
        config.modifierSelections,
      )) {
        const group = ci.menuItem.modifierGroups.find(
          (mg) => mg.modifierGroup.id === groupId,
        )?.modifierGroup;
        if (!group) continue;
        for (const optId of optionIds) {
          const opt = group.options.find((o) => o.id === optId);
          if (opt) itemPrice += opt.priceDelta;
        }
      }
      total += itemPrice;
    }
    total -= combo.discountAmount;
    return total * quantity;
  };

  const getModifierSummary = (
    ci: ComboItem,
    config: (typeof itemConfigs)[number],
  ) => {
    const names: string[] = [];
    for (const [groupId, optionIds] of Object.entries(
      config.modifierSelections,
    )) {
      const group = ci.menuItem.modifierGroups.find(
        (mg) => mg.modifierGroup.id === groupId,
      )?.modifierGroup;
      if (!group) continue;
      for (const optId of optionIds) {
        const opt = group.options.find((o) => o.id === optId);
        if (opt) names.push(opt.name);
      }
    }
    return names.length > 0 ? names.join(", ") : "No options selected";
  };

  const validateAndSubmit = () => {
    const newErrors: Record<string, string> = {};

    for (let i = 0; i < sortedItems.length; i++) {
      const ci = sortedItems[i];
      const config = itemConfigs[i];

      for (const { modifierGroup } of ci.menuItem.modifierGroups) {
        const selected = config.modifierSelections[modifierGroup.id] ?? [];
        if (
          modifierGroup.minSelect > 0 &&
          selected.length < modifierGroup.minSelect
        ) {
          newErrors[`${i}-${modifierGroup.id}`] =
            `Select at least ${modifierGroup.minSelect}`;
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Expand first item with error
      const firstErrorKey = Object.keys(newErrors)[0];
      const itemIndex = parseInt(firstErrorKey.split("-")[0]);
      setExpandedIndex(itemIndex);
      return;
    }

    setErrors({});

    addComboToCart({
      comboEntryId: comboEntry.id,
      quantity,
      items: sortedItems.map((ci, i) => ({
        menuItemId: ci.menuItem.id,
        modifierSelections: itemConfigs[i].modifierSelections,
        specialInstructions:
          itemConfigs[i].specialInstructions.trim() || undefined,
      })),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="min-w-full h-full rounded-none px-0 py-2 flex flex-col gap-0"
        showCloseButton={false}
      >
        <DialogHeader className="m-2 text-left">
          <DialogTitle>
            <div className="flex justify-between">
              <h3 className="text-3xl">{combo.name}</h3>
              <DialogClose>
                <X />
              </DialogClose>
            </div>
          </DialogTitle>
          <DialogDescription>{combo.description}</DialogDescription>
        </DialogHeader>

        <div className="px-4 py-2 overflow-y-scroll flex-1 flex flex-col gap-2">
          {sortedItems.map((ci, itemIndex) => {
            const isExpanded = expandedIndex === itemIndex;
            const config = itemConfigs[itemIndex];

            return (
              <div
                key={ci.menuItemId}
                className="border rounded-lg overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                  onClick={() =>
                    setExpandedIndex(isExpanded ? -1 : itemIndex)
                  }
                >
                  <div className="text-left">
                    <p className="font-semibold">{ci.menuItem.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {getModifierSummary(ci, config)}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-3 space-y-4">
                    {ci.menuItem.modifierGroups
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map(({ modifierGroup }) => {
                        const errorKey = `${itemIndex}-${modifierGroup.id}`;
                        const selectedIds =
                          config.modifierSelections[modifierGroup.id] ?? [];

                        return (
                          <div key={modifierGroup.id}>
                            <div>
                              <h4 className="font-semibold text-lg">
                                {modifierGroup.name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {modifierGroup.minSelect === 0
                                  ? "Optional"
                                  : `Select at least ${modifierGroup.minSelect}`}
                                {" · "}
                                {`Select up to ${modifierGroup.maxSelect}`}
                              </p>
                            </div>
                            <div>
                              {modifierGroup.options.map((option) => {
                                const isSelected = selectedIds.includes(
                                  option.id,
                                );
                                const disabled =
                                  !isSelected &&
                                  modifierGroup.maxSelect ===
                                    selectedIds.length;

                                return (
                                  <label
                                    key={option.id}
                                    className="flex items-center gap-3 p-2"
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      disabled={disabled}
                                      onCheckedChange={(checked) => {
                                        if (checked === "indeterminate")
                                          return;

                                        const updated = [...itemConfigs];
                                        const newSelections = {
                                          ...updated[itemIndex]
                                            .modifierSelections,
                                        };

                                        if (checked) {
                                          newSelections[modifierGroup.id] = [
                                            ...selectedIds,
                                            option.id,
                                          ];
                                        } else {
                                          newSelections[modifierGroup.id] =
                                            selectedIds.filter(
                                              (id) => id !== option.id,
                                            );
                                        }

                                        updated[itemIndex] = {
                                          ...updated[itemIndex],
                                          modifierSelections: newSelections,
                                        };
                                        setItemConfigs(updated);
                                        setErrors((prev) => {
                                          const next = { ...prev };
                                          delete next[errorKey];
                                          return next;
                                        });
                                      }}
                                    />
                                    <div className="flex flex-col flex-1 min-w-0">
                                      <span className="font-medium text-base">
                                        {option.name}
                                      </span>
                                      {option.priceDelta !== 0 && (
                                        <span className="text-sm text-muted-foreground">
                                          {option.priceDelta > 0 && "+"}
                                          {formatCents(option.priceDelta)}
                                        </span>
                                      )}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                            {errors[errorKey] && (
                              <p className="text-sm text-red-500 mt-1">
                                {errors[errorKey]}
                              </p>
                            )}
                          </div>
                        );
                      })}

                    <div>
                      <label className="font-semibold text-lg">
                        Special Instructions
                      </label>
                      <Textarea
                        placeholder="Any special requests?"
                        value={config.specialInstructions}
                        onChange={(e) => {
                          const updated = [...itemConfigs];
                          updated[itemIndex] = {
                            ...updated[itemIndex],
                            specialInstructions: e.target.value,
                          };
                          setItemConfigs(updated);
                        }}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex items-center justify-between px-1 py-2 border-t mt-2">
            <span className="text-sm text-muted-foreground">
              Combo discount
            </span>
            <span className="text-sm font-medium text-green-700">
              -{formatCents(combo.discountAmount)}
            </span>
          </div>
        </div>

        <DialogFooter className="px-2 pt-2 mt-auto border-t-1">
          <div className="flex items-center justify-between w-full gap-4">
            <QuantityStepper
              value={quantity}
              onReduce={() => setQuantity(Math.max(1, quantity - 1))}
              onIncrease={() => setQuantity(quantity + 1)}
              reduceDisabled={quantity <= 1}
              increaseDisabled={false}
            />
            <Button className="flex-1" onClick={validateAndSubmit}>
              Add To Cart - {formatCents(calculateTotalPrice())}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
