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
import { CentsInput } from "./ui/cents-input";
import { Plus } from "lucide-react";
import { useState } from "react";
import {
  useAddComboForm,
  type ComboResult,
} from "@/hooks/use-add-combo-form";
import { MenuItemSelector } from "./menu-item-selector";

interface AddComboDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editData?: ComboResult;
}

export function AddComboDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  editData,
}: AddComboDialogProps = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled
    ? controlledOnOpenChange ?? (() => {})
    : setUncontrolledOpen;

  const addComboForm = useAddComboForm({ setOpen, editData });
  const { form } = addComboForm;

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
            <p>Add New Combo</p>
            <Plus />
          </Button>
        </DialogTrigger>
      )}
      <AddComboDialogContent {...addComboForm} />
    </Dialog>
  );
}

function AddComboDialogContent({
  form,
  createComboMutation,
  isEditMode,
  fieldErrors,
  clearFieldErrors,
}: ReturnType<typeof useAddComboForm>) {
  return (
    <DialogContent className="xl:max-w-[700px] sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {isEditMode ? "Edit Combo" : "Create New Combo"}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? "Changes will not save unless you click update combo."
            : "Changes will not save unless you click create combo."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <div className="flex flex-row gap-2 items-start">
          <form.Field name="name">
            {({ handleChange, state: { value } }) => (
              <div className="w-3/4 grid gap-2">
                <Label>Name</Label>
                <Input
                  value={value}
                  onChange={(e) => {
                    clearFieldErrors();
                    handleChange(e.target.value);
                  }}
                />
                {fieldErrors.name && (
                  <p className="text-sm text-red-500">{fieldErrors.name}</p>
                )}
              </div>
            )}
          </form.Field>
          <form.Field name="discountAmount">
            {({ handleChange, state: { value } }) => (
              <div className="w-1/4 grid gap-2">
                <Label>Discount</Label>
                <CentsInput
                  value={value ?? 0}
                  onChange={handleChange}
                  onInteract={clearFieldErrors}
                />
                {fieldErrors.discountAmount && (
                  <p className="text-sm text-red-500">
                    {fieldErrors.discountAmount}
                  </p>
                )}
              </div>
            )}
          </form.Field>
        </div>
        <form.Field name="description">
          {({ handleChange, state: { value } }) => (
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={value}
                onChange={(e) => {
                  clearFieldErrors();
                  handleChange(e.target.value);
                }}
              />
              {fieldErrors.description && (
                <p className="text-sm text-red-500">
                  {fieldErrors.description}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="selectedMenuItems">
          {({ state: { value }, handleChange }) => (
            <>
              <MenuItemSelector
                selectedItems={value}
                onSelectItem={(item) => {
                  handleChange([...value, item]);
                }}
                onRemoveItem={(menuItemId) => {
                  handleChange(
                    value.filter((i) => i.menuItemId !== menuItemId),
                  );
                }}
                onReorder={(from, to) => {
                  const result = [...value];
                  const [item] = result.splice(from, 1);
                  result.splice(to, 0, item);
                  handleChange(result);
                }}
              />
              {fieldErrors.selectedMenuItems && (
                <p className="text-sm text-red-500">
                  {fieldErrors.selectedMenuItems}
                </p>
              )}
            </>
          )}
        </form.Field>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button
          disabled={createComboMutation.isPending}
          onClick={form.handleSubmit}
        >
          {createComboMutation.isPending
            ? isEditMode
              ? "Updating Combo..."
              : "Creating Combo..."
            : isEditMode
              ? "Update Combo"
              : "Create Combo"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
