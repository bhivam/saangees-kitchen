import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";

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
    year: "numeric",
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

function MenuDayCard({
  date,
  items,
}: {
  date: string;
  items: MenuItem[] | undefined;
}) {
  const today = new Date().toISOString().split("T")[0];
  const isToday = date === today;

  return (
    <Card className={isToday ? "border-primary border-2" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {formatDate(date)}
          {isToday && (
            <span className="text-sm font-normal bg-primary text-primary-foreground px-3 py-1 rounded-full">
              Today
            </span>
          )}
        </CardTitle>
        <CardDescription>
          {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "long",
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items && items.length > 0 ? (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="border-b pb-4 last:border-b-0 last:pb-0"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  <span className="text-lg font-bold text-primary">
                    ${(item.basePrice / 100).toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No menu available for this day
          </p>
        )}
      </CardContent>
    </Card>
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

  // Get current week dates (starting from today)
  const today = new Date();
  const currentWeekDates = getWeekDates(today, 7);

  // Get next week dates (starting from 7 days from now)
  const nextWeekStart = new Date(today);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const nextWeekDates = getWeekDates(nextWeekStart, 7);

  // Combine all dates
  const allDates = [...currentWeekDates, ...nextWeekDates];

  // Fetch menus for all dates
  const { data: menuEntries, isLoading } = useQuery(
    trpc.menu.getByDateRange.queryOptions({
      dates: allDates,
    }),
  );

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

  const groupedMenus = menuEntries ? groupMenusByDate(menuEntries) : new Map();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Weekly Menu</h1>
          <p className="text-muted-foreground text-lg">
            View our menu for this week and next week
          </p>
        </div>
        <Link to="/login">
          <Button>Login</Button>
        </Link>
      </div>

      {/* Current Week */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span>This Week</span>
          <span className="text-sm font-normal text-muted-foreground">
            {formatDate(currentWeekDates[0])} -{" "}
            {formatDate(currentWeekDates[6])}
          </span>
        </h2>
        <div className="space-y-6">
          {currentWeekDates.map((date) => (
            <MenuDayCard
              key={date}
              date={date}
              items={groupedMenus.get(date)}
            />
          ))}
        </div>
      </section>

      {/* Next Week */}
      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span>Next Week</span>
          <span className="text-sm font-normal text-muted-foreground">
            {formatDate(nextWeekDates[0])} - {formatDate(nextWeekDates[6])}
          </span>
        </h2>
        <div className="space-y-6">
          {nextWeekDates.map((date) => (
            <MenuDayCard
              key={date}
              date={date}
              items={groupedMenus.get(date)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

