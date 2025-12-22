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

export function AddItemCartDialogTrigger({ menuItem }: { menuItem: MenuItem }) {
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
      <AddItemDialogContent menuItem={menuItem} />
    </Dialog>
  );
}

function AddItemDialogContent({ menuItem }: { menuItem: MenuItem }) {
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
      <div className="p-2 overflow-y-scroll flex flex-col justify-start">
        {menuItem.modifierGroups
          .sort((modiferGroup) => modiferGroup.sortOrder)
          .map(({ modifierGroup }) => {
            if (modifierGroup.minSelect === 0) {
              return (
                <div>
                  <h3 className="font-bold">{modifierGroup.name}</h3>
                  <div>{`optional | select up to ${modifierGroup.maxSelect}`}</div>
                </div>
              );
            } else {
              return (
                <div>
                  <p className="font-bold">{modifierGroup.name}</p>
                  <p className="text-xs">
                    {` select at least ${modifierGroup.minSelect} · select up to ${modifierGroup.maxSelect}`}
                  </p>
                </div>
              );
            }
          })}
      </div>
      <DialogFooter className="px-2 pt-2 mt-auto border-t-1 flex items-end">
        {/* TODO: Quantity Stepper */}
        <Button>{`Add To Cart - ${formatCents(0)}`}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

