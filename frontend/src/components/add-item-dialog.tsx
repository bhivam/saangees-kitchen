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
import { Plus, X, Upload } from "lucide-react";
import { useState, useRef } from "react";
import { useAddItemForm, type MenuItemResult } from "@/hooks/use-add-item-form";
import { ModifierGroupSelector } from "./modifier-group-selector";
import { AddModifierDialog } from "./add-modifier-dialog";

interface AddItemDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editData?: MenuItemResult;
  onCreated?: (item: MenuItemResult) => void;
}

export function AddItemDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  editData,
  onCreated,
}: AddItemDialogProps = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled
    ? (controlledOnOpenChange ?? (() => {}))
    : setUncontrolledOpen;

  const addItemForm = useAddItemForm({ setOpen, editData, onCreated });

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
  fieldErrors,
  clearFieldErrors,
  setSelectedFile,
  isUploading,
}: ReturnType<typeof useAddItemForm>) {
  const [createModifierOpen, setCreateModifierOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    form.setFieldValue("imageUrl", null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <DialogContent className="xl:max-w-175 sm:max-w-106.25 max-h-[90vh] overflow-y-auto">
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
        {/* Image Upload Section */}
        <form.Subscribe selector={(state) => state.values.imageUrl}>
          {(imageUrl) => {
            const previewUrl = blobUrl ?? imageUrl;
            return (
              <div>
                <Label>Image (optional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {previewUrl ? (
                  <div className="relative mt-2">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-md"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="mt-2 w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-md flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-muted-foreground/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-6 w-6" />
                    <span className="text-sm">Click to upload</span>
                  </button>
                )}
              </div>
            );
          }}
        </form.Subscribe>

        <div className="flex flex-row gap-2 items-start">
          <form.Field name="name">
            {({ handleChange, state: { value } }) => (
              <div className="w-3/4 grid gap-2">
                <Label htmlFor="name-1">Name</Label>
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
          <form.Field name="basePrice">
            {({ handleChange, state: { value } }) => (
              <div className="w-1/4 grid gap-2">
                <Label htmlFor="name-1">Base Price</Label>
                <CentsInput
                  value={value ?? 0}
                  onChange={handleChange}
                  onInteract={clearFieldErrors}
                />
                {fieldErrors.basePrice && (
                  <p className="text-sm text-red-500">
                    {fieldErrors.basePrice}
                  </p>
                )}
              </div>
            )}
          </form.Field>
        </div>
        <form.Field name="description">
          {({ handleChange, state: { value } }) => (
            <div className="grid gap-2">
              <Label htmlFor="name-1">Description</Label>
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
          disabled={createMenuItemMutation.isPending || isUploading}
          onClick={form.handleSubmit}
        >
          {isUploading
            ? "Uploading Image..."
            : createMenuItemMutation.isPending
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

