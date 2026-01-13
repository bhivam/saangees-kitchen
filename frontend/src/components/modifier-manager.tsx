import { useState } from "react";
import { Search } from "lucide-react";
import { InputWithIcon } from "./ui/input-with-icon";
import { ModifierManagerTable } from "./modifier-manager-table";
import { AddModifierDialog } from "./add-modifier-dialog";

export function ModifierManager() {
  const [search, setSearch] = useState("");

  return (
    <div className="w-full h-full flex flex-col p-10">
      <h1 className="text-4xl font-bold">Modifier Manager</h1>
      <div className="flex flex-row justify-between items-center my-3">
        <InputWithIcon
          Icon={Search}
          placeholder="Search for modifier group"
          className="w-80"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <AddModifierDialog />
      </div>

      <ModifierManagerTable search={search} />
    </div>
  );
}

