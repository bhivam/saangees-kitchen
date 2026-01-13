import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogHeader,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import {
  useAddItemForm,
  type MenuItemResult,
} from "@/hooks/use-add-item-form";
import { ModifierGroupSelector } from "./modifier-group-selector";
import { AddModifierDialog } from "./add-modifier-dialog";

interface AddItemDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editData?: MenuItemResult;
}

export function AddItemDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  editData,
}: AddItemDialogProps = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled
    ? controlledOnOpenChange ?? (() => {})
    : setUncontrolledOpen;

  const addItemForm = useAddItemForm({ setOpen, editData });

  const { form } = addItemForm;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) form.reset();
        setOpen(nextOpen);
      }}
    >
      {!isControlled && (
        <DialogTrigger asChild>
          <Button>
            <p>Add New Item</p>
            <Plus />
          </Button>
        </DialogTrigger>
      )}
      <AddItemDialogContent {...addItemForm} />
    </Dialog>
  );
}

function AddItemDialogContent({
  form,
  createMenuItemMutation,
  isEditMode,
}: ReturnType<typeof useAddItemForm>) {
  const [createModifierOpen, setCreateModifierOpen] = useState(false);

  return (
    <DialogContent className="xl:max-w-[700px] sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {isEditMode ? "Edit Item" : "Create New Item"}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? "Changes will not save unless you click update item."
            : "Changes will not save unless you click create item."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <div className="flex flex-row gap-2">
          <form.Field name="name">
            {({ handleChange, state: { value } }) => (
              <div className="w-3/4 grid gap-3">
                <Label htmlFor="name-1">Name</Label>
                <Input
                  value={value}
                  onChange={(e) => handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="basePrice">
            {({ handleChange, state: { value } }) => (
              <div className="w-1/4 grid gap-3">
                <Label htmlFor="name-1">Base Price</Label>
                <Input
                  className="text-right"
                  value={`$${((value ?? 0) / 100).toFixed(2)}`}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace") {
                      e.preventDefault();
                      handleChange((value) => Math.trunc(value / 10));
                    }

                    const parsedValue = parseInt(e.key);

                    if (Number.isNaN(parsedValue)) return;

                    handleChange((value) => {
                      const newValue = value * 10 + parsedValue;

                      return newValue;
                    });
                  }}
                />
              </div>
            )}
          </form.Field>
        </div>
        <form.Field name="description">
          {({ handleChange, state: { value } }) => (
            <div className="grid gap-3">
              <Label htmlFor="name-1">Description</Label>
              <Textarea
                value={value}
                onChange={(e) => handleChange(e.target.value)}
              />
            </div>
          )}
        </form.Field>

        {/* Modifier Groups Section */}
        <form.Field name="selectedModifierGroups">
          {({ state: { value }, handleChange }) => (
            <>
              <ModifierGroupSelector
                selectedGroups={value}
                onSelectGroup={(group) => {
                  handleChange([...value, group]);
                }}
                onRemoveGroup={(groupId) => {
                  handleChange(value.filter((g) => g.groupId !== groupId));
                }}
                onReorder={(from, to) => {
                  const result = [...value];
                  const [item] = result.splice(from, 1);
                  result.splice(to, 0, item);
                  handleChange(result);
                }}
                onCreateNew={() => setCreateModifierOpen(true)}
              />
              <AddModifierDialog
                open={createModifierOpen}
                onOpenChange={setCreateModifierOpen}
                onCreated={(newGroup) => {
                  handleChange([
                    ...value,
                    {
                      groupId: newGroup.id,
                      groupName: newGroup.name,
                      minSelect: newGroup.minSelect,
                      maxSelect: newGroup.maxSelect,
                    },
                  ]);
                  setCreateModifierOpen(false);
                }}
              />
            </>
          )}
        </form.Field>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button
          disabled={createMenuItemMutation.isPending}
          onClick={form.handleSubmit}
        >
          {createMenuItemMutation.isPending
            ? isEditMode
              ? "Updating Item..."
              : "Creating Item..."
            : isEditMode
              ? "Update Item"
              : "Create Item"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

