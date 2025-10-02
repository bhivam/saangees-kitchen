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
import { useAddItemForm } from "@/hooks/use-add-item-form";

export function AddItemDialog() {
  const [open, setOpen] = useState(false);

  const addItemForm = useAddItemForm({ setOpen });

  const { form } = addItemForm;

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) form.reset();
        setOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <p>Add New Item</p>
          <Plus />
        </Button>
      </DialogTrigger>
      <AddItemDialogContent {...addItemForm} />
    </Dialog>
  );
}

function AddItemDialogContent({
  form,
  createMenuItemMutation,
}: ReturnType<typeof useAddItemForm>) {
  return (
    <DialogContent className="xl:max-w-[700px] sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Create New Item</DialogTitle>
        <DialogDescription>
          Changes will not save unless you click create item.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <div className="flex flex-row gap-2">
          <form.Field name="name">
            {({ handleChange }) => (
              <div className="w-3/4 grid gap-3">
                <Label htmlFor="name-1">Name</Label>
                <Input onChange={(e) => handleChange(e.target.value)} />
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

                    console.log(parsedValue);

                    handleChange((value) => {
                      const newValue = value * 10 + parsedValue;

                      console.log(value, newValue);

                      return newValue;
                    });
                  }}
                />
              </div>
            )}
          </form.Field>
        </div>
        <form.Field name="description">
          {({ handleChange }) => (
            <div className="grid gap-3">
              <Label htmlFor="name-1">Description</Label>
              <Textarea onChange={(e) => handleChange(e.target.value)} />
            </div>
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
            ? "Creating Item..."
            : "Create Item"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

