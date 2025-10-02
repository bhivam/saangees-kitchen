/* Make that cool table with the modifier groups that has button
 * to expand all modifer options within a group.
 *
 * Then do creation stuff. We try to reuse this table component
 * in the seleciton dialog maybe.
 *
 * TODO
 * copy menu manager
 * implement adding modifier group dialog
 * create cool table
 */

import { Search } from "lucide-react";
import { InputWithIcon } from "./ui/input-with-icon";
import { ModifierManagerTable } from "./modifier-manager-table";
import { AddModifierDialog } from "./add-modifier-dialog";

export function ModifierManager() {
  return (
    <div className="w-full h-full flex flex-col p-10">
      <h1 className="text-4xl font-bold">Modifier Manager</h1>
      <div className="flex flex-row justify-between items-center my-3">
        <InputWithIcon
          Icon={Search}
          placeholder="Search for menu item"
          className="w-80"
        />
        <AddModifierDialog />
      </div>

      <ModifierManagerTable />
    </div>
  );
}

