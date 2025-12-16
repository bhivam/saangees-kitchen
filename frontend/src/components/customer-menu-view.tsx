import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/use-auth";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

type MenuItem = {
  id: string;
  name: string;
  description: string;
  basePrice: number;
};

type MenuEntry = {
  id: string;
  date: string | null;
  sortOrder: number | null;
  menuItem: MenuItem;
};

function getWeekDates(startDate: Date, days: number = 7): string[] {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split("T")[0]);
  }
  return dates;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function groupMenusByDate(menuEntries: MenuEntry[]): Map<string, MenuItem[]> {
  const grouped = new Map<string, MenuItem[]>();

  for (const entry of menuEntries) {
    if (entry.date === null) continue;
    if (!grouped.has(entry.date)) {
      grouped.set(entry.date, []);
    }
    grouped.get(entry.date)!.push(entry.menuItem);
  }

  return grouped;
}

function MenuItemCard({ item }: { item: MenuItem }) {
  return (
    <div
      key={item.id}
      className="border-b pb-4 last:border-b-0 last:pb-0 mb-0 flex items-center justify-between"
    >
      <div className="flex flex-col justify-between items-start">
        <h3 className="text-xl font-bold text-primary">{item.name}</h3>
        <p className="text-md text-muted-foreground">{item.description}</p>
        <span className="font-bold text-muted-foreground text-md">
          ${(item.basePrice / 100).toFixed(2)}
        </span>
      </div>
      <Button variant="outline">
        <Plus />
      </Button>
    </div>
  );
}

function MenuDayCard({
  date,
  items,
}: {
  date: string;
  items: MenuItem[] | undefined;
}) {
  return (
    <div>
      <h3 className="text-2xl font-bold">{formatDate(date)}</h3>
      {items && items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item) => (
            <MenuItemCard item={item} />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          No menu available for this day
        </p>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CustomerMenuView() {
  const trpc = useTRPC();

  const today = new Date();
  const currentWeekDates = getWeekDates(today, 7);

  const allDates = [...currentWeekDates];

  const { data: menuEntries, isLoading } = useQuery(
    trpc.menu.getByDateRange.queryOptions({
      dates: allDates,
    }),
  );

  const { session } = useAuth();

  const handleLogout = async () => {
    try {
      const response = await authClient.signOut();

      if (response.error) {
        toast.error("Logout failed");
        return;
      }

      toast.success("Logged out successfully");
      window.location.href = "/";
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-96" />
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  const groupedMenus = menuEntries
    ? groupMenusByDate(menuEntries)
    : new Map<string, MenuItem[]>();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-4 flex items-start justify-between">
        <h1 className="text-4xl font-bold">Weekly Menu</h1>
        {session ? (
          <Button onClick={handleLogout}>Logout</Button>
        ) : (
          <Link to="/login">
            <Button>Login</Button>
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {currentWeekDates.flatMap((date) => {
          const items = groupedMenus.get(date);

          if (!items || items.length === 0) return [];

          return [<MenuDayCard key={date} date={date} items={items} />];
        })}
      </div>
    </div>
  );
}

