import { useState } from "react";
import { Search } from "lucide-react";
import { InputWithIcon } from "../ui/input-with-icon";
import { ManualEntryTable } from "./manual-entry-table";
import { AddManualOrderDialog } from "./add-manual-order-dialog";

export function ManualEntryView() {
  const [search, setSearch] = useState("");

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-row justify-between items-center my-3">
        <InputWithIcon
          Icon={Search}
          placeholder="Search by user name or phone"
          className="w-80"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <AddManualOrderDialog />
      </div>

      <ManualEntryTable search={search} />
    </div>
  );
}
