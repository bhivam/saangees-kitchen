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

export function MenuManagerTable() {
  const trpc = useTRPC();
  const menuItemsQuery = useQuery(trpc.menuItems.getMenuItems.queryOptions());

  if (menuItemsQuery.isLoading) return "loading...";

  if (menuItemsQuery.isError || !menuItemsQuery.data) return "Error :(";

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-5/6">Name</TableHead>
          <TableHead>Price</TableHead>
          <TableHead />
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {menuItemsQuery.data.map((item) => (
          <TableRow>
            <TableCell>{item.name}</TableCell>
            <TableCell>${(item.basePrice / 100).toFixed(2)}</TableCell>
            {/* TODO make these buttons do something */}
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

