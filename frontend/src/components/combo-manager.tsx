import { useState } from "react";
import { Search } from "lucide-react";
import { InputWithIcon } from "./ui/input-with-icon";
import { ComboManagerTable } from "./combo-manager-table";
import { AddComboDialog } from "./add-combo-dialog";

export function ComboManager() {
  const [search, setSearch] = useState("");

  return (
    <div className="w-full h-full flex flex-col p-10">
      <h1 className="text-4xl font-bold">Combo Manager</h1>
      <div className="flex flex-row justify-between items-center my-3">
        <InputWithIcon
          Icon={Search}
          placeholder="Search for combo"
          className="w-80"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <AddComboDialog />
      </div>

      <ComboManagerTable search={search} />
    </div>
  );
}
