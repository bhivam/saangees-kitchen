import { useMemo } from "react";
import { useTRPC } from "@/trpc";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Button } from "./ui/button";
import { Edit, Trash } from "lucide-react";

export function MenuManagerTable({ search }: { search: string }) {
  const trpc = useTRPC();
  const menuItemsQuery = useQuery(trpc.menuItems.getMenuItems.queryOptions());

  const filteredItems = useMemo(() => {
    if (!menuItemsQuery.data) return [];
    const query = search.toLowerCase().trim();
    if (!query) return menuItemsQuery.data;
    return menuItemsQuery.data.filter((item) =>
      item.name.toLowerCase().includes(query),
    );
  }, [menuItemsQuery.data, search]);

  if (menuItemsQuery.isLoading) return "loading...";

  if (menuItemsQuery.isError || !menuItemsQuery.data) return "Error :(";

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-1/6">Name</TableHead>
          <TableHead className="w-2/3">Price</TableHead>
          <TableHead className="w-1/12" />
          <TableHead className="w-1/12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredItems.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.name}</TableCell>
            <TableCell>${(item.basePrice / 100).toFixed(2)}</TableCell>
            <TableCell>
              <Button variant="ghost" size="icon">
                <Edit />
              </Button>
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="icon">
                <Trash />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

