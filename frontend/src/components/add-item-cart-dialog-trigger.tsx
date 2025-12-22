import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogHeader,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import type { MenuItem } from "./customer-menu-view";

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
    <DialogContent className="min-w-full h-full rounded-none">
      <DialogHeader>
        <DialogTitle>Create New Item</DialogTitle>
      </DialogHeader>
      <pre>{JSON.stringify(menuItem, null, 2)}</pre>
      <DialogFooter></DialogFooter>
    </DialogContent>
  );
}

