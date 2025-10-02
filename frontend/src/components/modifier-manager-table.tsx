import { useTRPC } from "@/trpc";
import { useQuery } from "@tanstack/react-query";

export function ModifierManagerTable() {
  const trpc = useTRPC();
  const modifierOptionsQuery = useQuery(
    trpc.modifierGroups.getModifierGroups.queryOptions(),
  );

  if (modifierOptionsQuery.isLoading) return "loading...";

  if (modifierOptionsQuery.isError || !modifierOptionsQuery.data)
    return "Error :(";

  return <pre>{JSON.stringify(modifierOptionsQuery.data)}</pre>;
}

