import { Search } from "lucide-react";
import { InputWithIcon } from "./ui/input-with-icon";
import { MenuManagerTable } from "./menu-manager-table";
import { AddItemDialog } from "./add-item-dialog";

export function ItemManager() {
  return (
    <div className="w-full h-full flex flex-col p-10">
      <h1 className="text-4xl font-bold">Menu Manager</h1>
      <div className="flex flex-row justify-between items-center my-3">
        <InputWithIcon
          Icon={Search}
          placeholder="Search for menu item"
          className="w-80"
        />
        <AddItemDialog />
      </div>

      <MenuManagerTable />
    </div>
  );
}

