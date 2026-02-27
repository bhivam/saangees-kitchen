import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { ArrowLeft, Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { useTRPC } from "@/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface AddressPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAddressId: string | null;
  onSelect: (addressId: string) => void;
  startInAddMode?: boolean;
}

export function AddressPickerDialog({
  open,
  onOpenChange,
  selectedAddressId,
  onSelect,
  startInAddMode = false,
}: AddressPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <AddressPickerContent
          selectedAddressId={selectedAddressId}
          onSelect={onSelect}
          onClose={() => onOpenChange(false)}
          startInAddMode={startInAddMode}
        />
      )}
    </Dialog>
  );
}

function AddressPickerContent({
  selectedAddressId,
  onSelect,
  onClose,
  startInAddMode,
}: {
  selectedAddressId: string | null;
  onSelect: (addressId: string) => void;
  onClose: () => void;
  startInAddMode: boolean;
}) {
  const [view, setView] = useState<"list" | "add">(
    startInAddMode ? "add" : "list",
  );

  return (
    <DialogContent
      className="min-w-full h-full rounded-none px-0 py-2 flex flex-col gap-0"
      showCloseButton={false}
    >
      {view === "list" ? (
        <AddressListView
          selectedAddressId={selectedAddressId}
          onSelect={(id) => {
            onSelect(id);
            onClose();
          }}
          onAddNew={() => setView("add")}
          onClose={onClose}
        />
      ) : (
        <AddressAddView
          onSaved={(id) => {
            onSelect(id);
            onClose();
          }}
          onBack={startInAddMode ? onClose : () => setView("list")}
          startInAddMode={startInAddMode}
        />
      )}
    </DialogContent>
  );
}

function AddressListView({
  selectedAddressId,
  onSelect,
  onAddNew,
  onClose,
}: {
  selectedAddressId: string | null;
  onSelect: (addressId: string) => void;
  onAddNew: () => void;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const { data: addresses, isLoading } = useQuery(
    trpc.delivery.getUserAddresses.queryOptions(),
  );

  return (
    <>
      <DialogHeader className="m-2 text-left">
        <DialogTitle>
          <div className="flex justify-between items-center">
            <h3 className="text-3xl">Delivery Address</h3>
            <button type="button" onClick={onClose}>
              <X className="size-6" />
            </button>
          </div>
        </DialogTitle>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {isLoading && (
          <p className="text-muted-foreground text-sm">Loading addresses...</p>
        )}

        {addresses?.map((addr) => {
          const isSelected = addr.addressId === selectedAddressId;
          return (
            <button
              key={addr.addressId}
              type="button"
              onClick={() => onSelect(addr.addressId)}
              className={`w-full text-left rounded-lg border p-3 mb-2 flex items-center gap-3 ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <div className="flex-1 min-w-0">
                {addr.label && (
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    {addr.label}
                  </p>
                )}
                <p className="font-medium">{addr.addressLine1}</p>
                {addr.addressLine2 && (
                  <p className="text-sm text-muted-foreground">
                    {addr.addressLine2}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {addr.city}, {addr.state} {addr.postalCode}
                </p>
              </div>
              {isSelected && <Check className="size-5 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>

      <div className="px-4 pb-2 pt-2 border-t">
        <Button
          variant="outline"
          className="w-full"
          onClick={onAddNew}
        >
          <Plus className="size-4 mr-2" />
          Add new address
        </Button>
      </div>
    </>
  );
}

function AddressAddView({
  onSaved,
  onBack,
  startInAddMode,
}: {
  onSaved: (addressId: string) => void;
  onBack: () => void;
  startInAddMode: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
  });

  const saveMutation = useMutation(
    trpc.delivery.saveUserAddress.mutationOptions({
      onSuccess: async (data) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.delivery.getUserAddresses.queryKey(),
        });
        onSaved(data.addressId);
      },
    }),
  );

  const isValid =
    form.addressLine1.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.state.trim().length > 0 &&
    form.postalCode.trim().length > 0;

  const handleSave = () => {
    if (!isValid) return;
    saveMutation.mutate({
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim() || undefined,
      city: form.city.trim(),
      state: form.state.trim(),
      postalCode: form.postalCode.trim(),
    });
  };

  return (
    <>
      <DialogHeader className="m-2 text-left">
        <DialogTitle>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onBack}>
              {startInAddMode ? (
                <X className="size-6" />
              ) : (
                <ArrowLeft className="size-6" />
              )}
            </button>
            <h3 className="text-3xl">New Address</h3>
          </div>
        </DialogTitle>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="grid gap-3">
          <div>
            <Label htmlFor="new-addr-line1">Address Line 1</Label>
            <Input
              id="new-addr-line1"
              value={form.addressLine1}
              onChange={(e) =>
                setForm((f) => ({ ...f, addressLine1: e.target.value }))
              }
              placeholder="123 Main St"
            />
          </div>
          <div>
            <Label htmlFor="new-addr-line2">Address Line 2</Label>
            <Input
              id="new-addr-line2"
              value={form.addressLine2}
              onChange={(e) =>
                setForm((f) => ({ ...f, addressLine2: e.target.value }))
              }
              placeholder="Apt, Suite, etc."
            />
          </div>
          <div>
            <Label htmlFor="new-addr-city">City</Label>
            <Input
              id="new-addr-city"
              value={form.city}
              onChange={(e) =>
                setForm((f) => ({ ...f, city: e.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="new-addr-state">State</Label>
            <Input
              id="new-addr-state"
              value={form.state}
              onChange={(e) =>
                setForm((f) => ({ ...f, state: e.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="new-addr-zip">Zip Code</Label>
            <Input
              id="new-addr-zip"
              value={form.postalCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, postalCode: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      <div className="px-4 pb-2 pt-2 border-t">
        <Button
          className="w-full"
          disabled={!isValid || saveMutation.isPending}
          onClick={handleSave}
        >
          {saveMutation.isPending ? "Saving..." : "Save Address"}
        </Button>
      </div>
    </>
  );
}
