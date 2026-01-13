import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogHeader,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import type { MenuItem } from "./customer-menu-view";
import { DialogClose, DialogDescription } from "@radix-ui/react-dialog";
import { formatCents } from "@/lib/utils";
import { useMenuItemForm } from "@/hooks/use-menu-item-form";
import { Checkbox } from "./ui/checkbox";
import { QuantityStepper } from "./quantity-stepper";

export function AddItemCartDialog({
  menuItem,
  menuEntryId,
}: {
  menuItem: MenuItem;
  menuEntryId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus />
        </Button>
      </DialogTrigger>
      <AddItemDialogContent
        menuItem={menuItem}
        menuEntryId={menuEntryId}
        setOpen={setOpen}
      />
    </Dialog>
  );
}

function AddItemDialogContent({
  menuItem,
  menuEntryId,
  setOpen,
}: {
  menuItem: MenuItem;
  menuEntryId: string;
  setOpen: (open: boolean) => void;
}) {
  const { form, calculateTotalPrice } = useMenuItemForm(
    menuItem,
    menuEntryId,
    () => setOpen(false),
  );

  return (
    <DialogContent
      className="min-w-full h-full rounded-none px-0 py-2 flex flex-col gap-0"
      showCloseButton={false}
    >
      <DialogHeader className="m-2 text-left">
        <DialogTitle>
          <div className="flex justify-between">
            <h3 className="text-3xl">{menuItem.name}</h3>
            <DialogClose>
              <X />
            </DialogClose>
          </div>
        </DialogTitle>
        <DialogDescription>{menuItem.description}</DialogDescription>
      </DialogHeader>
      <form.Field name="modifierSelections">
        {(field) => {
          return (
            <div className="px-4 py-2 overflow-y-scroll flex flex-col gap-6">
              {menuItem.modifierGroups
                .sort((modiferGroup) => modiferGroup.sortOrder)
                .map(({ modifierGroup }) => {
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
                          const selectedModifierOptions =
                            field.state.value[modifierGroup.id];

                          const selected = selectedModifierOptions.find(
                            (selectedModifierOptionId) =>
                              selectedModifierOptionId === option.id,
                          );

                          const disabled =
                            !selected &&
                            modifierGroup.maxSelect ===
                              selectedModifierOptions.length;

                          return (
                            <label
                              key={option.id}
                              className="flex items-center gap-3 p-2"
                            >
                              <Checkbox
                                disabled={disabled}
                                onCheckedChange={(checked) => {
                                  if (checked === "indeterminate")
                                    throw new Error(
                                      "checked state indeterminate",
                                    );

                                  if (checked) {
                                    selectedModifierOptions.push(option.id);
                                  } else {
                                    selectedModifierOptions.splice(
                                      0,
                                      selectedModifierOptions.length,
                                      ...selectedModifierOptions.filter(
                                        (selectedOptionId) =>
                                          selectedOptionId !== option.id,
                                      ),
                                    );
                                  }
                                  field.handleChange((prev) => ({
                                    ...prev,
                                    [modifierGroup.id]: [
                                      ...selectedModifierOptions,
                                    ],
                                  }));
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
                    </div>
                  );
                })}
            </div>
          );
        }}
      </form.Field>
      <DialogFooter className="px-2 pt-2 mt-auto border-t-1">
        <form.Field name="quantity">
          {(field) => (
            <div className="flex items-center justify-between w-full gap-4">
              <QuantityStepper
                value={field.state.value}
                onReduce={() =>
                  field.handleChange(Math.max(1, field.state.value - 1))
                }
                onIncrease={() => field.handleChange(field.state.value + 1)}
                reduceDisabled={field.state.value <= 1}
                increaseDisabled={false}
              />
              <Button className="flex-1" onClick={form.handleSubmit}>
                {`Add To Cart - ${formatCents(calculateTotalPrice())}`}
              </Button>
            </div>
          )}
        </form.Field>
      </DialogFooter>
    </DialogContent>
  );
}

