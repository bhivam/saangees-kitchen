import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogClose,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Plus, Minus, Trash2 } from "lucide-react";
import {
  useAddModifierForm,
  type ModifierGroupResult,
} from "@/hooks/use-add-modifier-form";
import { Dialog, DialogTrigger } from "@radix-ui/react-dialog";
import { useState } from "react";

interface AddModifierDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: (result: ModifierGroupResult) => void;
  editData?: ModifierGroupResult;
}

export function AddModifierDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onCreated,
  editData,
}: AddModifierDialogProps = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled
    ? controlledOnOpenChange ?? (() => {})
    : setUncontrolledOpen;

  const addModifierForm = useAddModifierForm({
    setOpen,
    onSuccess: onCreated,
    editData,
  });
  const { form } = addModifierForm;

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
            <p>Add New Modifier</p>
            <Plus />
          </Button>
        </DialogTrigger>
      )}
      <AddModifierDialogContent {...addModifierForm} />
    </Dialog>
  );
}

function formatCents(value: number) {
  return `$${((value ?? 0) / 100).toFixed(2)}`;
}

function handleCentsKeyDownMagnitude(
  e: React.KeyboardEvent<HTMLInputElement>,
  currentMagnitude: number,
  onChangeMagnitude: (nextMagnitude: number) => void,
) {
  const key = e.key;

  if (/^\d$/.test(key)) {
    e.preventDefault();
    const digit = Number(key);
    const nextMag = currentMagnitude * 10 + digit;
    onChangeMagnitude(nextMag);
    return;
  }

  if (key === "Backspace") {
    e.preventDefault();
    onChangeMagnitude(Math.trunc(currentMagnitude / 10));
    return;
  }
  // Let Tab/Arrows/etc. pass through
}

type Option = { name: string; priceDelta: number };

// No hooks here: all state lives in the form.
// We use negative zero (Object.is(x, -0)) to remember "decrease" when amount is 0.
function OptionRow({
  opt,
  onChange,
  onRemove,
}: {
  opt: Option;
  onChange: (next: Option) => void;
  onRemove: () => void;
}) {
  const magnitude = Math.abs(opt.priceDelta ?? 0);
  const isDecrease =
    opt.priceDelta < 0 || Object.is(opt.priceDelta, -0 as number);

  const setMagnitude = (nextMag: number) => {
    const signed = isDecrease ? -nextMag : nextMag;
    onChange({ ...opt, priceDelta: signed });
  };

  const setSign = (decrease: boolean) => {
    if (decrease) {
      onChange({
        ...opt,
        priceDelta: magnitude === 0 ? (-0 as number) : -magnitude,
      });
    } else {
      onChange({
        ...opt,
        priceDelta: magnitude === 0 ? 0 : magnitude,
      });
    }
  };

  return (
    <div className="flex flex-row items-end gap-2 rounded-md border p-3">
      <div className="w-1/2 grid gap-2">
        <Label>Name</Label>
        <Input
          value={opt.name}
          onChange={(e) => onChange({ ...opt, name: e.target.value })}
        />
      </div>

      <div className="w-1/3 grid gap-2">
        <Label>Price Adjustment</Label>
        <div className="flex gap-2">
          <div className="flex">
            <Button
              type="button"
              variant={!isDecrease ? "default" : "outline"}
              className="rounded-r-none"
              onClick={() => setSign(false)}
              aria-pressed={!isDecrease}
              title="Increase price"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={isDecrease ? "default" : "outline"}
              className="rounded-l-none"
              onClick={() => setSign(true)}
              aria-pressed={isDecrease}
              title="Decrease price"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
          <Input
            className="text-right"
            value={formatCents(magnitude)}
            onKeyDown={(e) =>
              handleCentsKeyDownMagnitude(e, magnitude, setMagnitude)
            }
            readOnly
          />
        </div>
      </div>

      <div className="w-1/6 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={onRemove}
          aria-label="Remove option"
          title="Remove option"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function AddModifierDialogContent({
  form,
  createModifierGroupMutation,
  isEditMode,
}: ReturnType<typeof useAddModifierForm>) {
  return (
    <DialogContent className="xl:max-w-[700px] sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>
          {isEditMode ? "Edit Modifier" : "Create New Modifier"}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? "Changes will not save unless you click update modifier."
            : "Changes will not save unless you click create modifier."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <div className="flex flex-row gap-2">
          <form.Field name="name">
            {({ handleChange, state: { value } }) => (
              <div className="w-1/2 grid gap-3">
                <Label htmlFor="modifier-name">Name</Label>
                <Input
                  id="modifier-name"
                  value={value ?? ""}
                  onChange={(e) => handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="minSelect">
            {({ handleChange, state }) => (
              <div className="w-1/4 grid gap-3">
                <Label htmlFor="min-select">Min Select</Label>
                <Input
                  id="min-select"
                  min={0}
                  step={1}
                  value={
                    state.value === undefined
                      ? ""
                      : typeof state.value === "number"
                        ? state.value
                        : ""
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      // Temporarily allow empty while typing
                      handleChange(undefined as unknown as number);
                      return;
                    }
                    const n = Number(v);
                    if (Number.isInteger(n) && n >= 0) {
                      handleChange(n);
                    }
                  }}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="maxSelect">
            {({ handleChange, state }) => (
              <div className="w-1/4 grid gap-3">
                <Label htmlFor="max-select">Max Select</Label>
                <Input
                  id="max-select"
                  value={
                    state.value === null || state.value === undefined
                      ? ""
                      : typeof state.value === "number"
                        ? state.value
                        : ""
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      handleChange(null);
                      return;
                    }
                    const n = Number(v);
                    if (Number.isInteger(n) && n > 0) {
                      handleChange(n);
                    }
                  }}
                />
              </div>
            )}
          </form.Field>
        </div>

        {/* Modifier options header + Add */}
        <div className="flex items-center justify-between">
          <Label className="font-medium">Modifier Options</Label>
          <form.Field name="newModifierOptionsData">
            {({ handleChange }) => (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  handleChange((prev) => [
                    ...(prev ?? []),
                    { name: "", priceDelta: 0 },
                  ])
                }
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Option
              </Button>
            )}
          </form.Field>
        </div>

        {/* Modifier options list */}
        <form.Field name="newModifierOptionsData">
          {({ state: { value: items }, handleChange }) => {
            const list = items ?? [];

            const updateAt = (index: number, next: Option) => {
              handleChange((prev) => {
                const base = [...(prev ?? [])];
                base[index] = next;
                return base;
              });
            };

            const removeAt = (index: number) => {
              handleChange((prev) => {
                const base = [...(prev ?? [])];
                base.splice(index, 1);
                return base;
              });
            };

            return (
              <div className="grid gap-2">
                {list.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No options yet. Click “Add Option” to create one.
                  </div>
                ) : null}

                {list.map((opt, i) => (
                  <OptionRow
                    key={i}
                    opt={opt}
                    onChange={(next) => updateAt(i, next)}
                    onRemove={() => removeAt(i)}
                  />
                ))}
              </div>
            );
          }}
        </form.Field>
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button
          disabled={createModifierGroupMutation.isPending}
          onClick={form.handleSubmit}
        >
          {createModifierGroupMutation.isPending
            ? isEditMode
              ? "Updating Modifier..."
              : "Creating Modifier..."
            : isEditMode
              ? "Update Modifier"
              : "Create Modifier"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

