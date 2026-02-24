import { useQuery } from "@tanstack/react-query";
import { useTRPC, type RouterOutputs } from "@/trpc";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { ShoppingCart, Menu } from "lucide-react";
import { AddItemDialogContent } from "./add-item-cart-dialog";
import { useCart } from "@/hooks/use-cart";
import { Dialog, DialogTrigger } from "./ui/dialog";
import { Sheet, SheetTrigger } from "./ui/sheet";
import { useState } from "react";
import { HomeSheetContent } from "./home-sheet-content";

export type MenuEntry = RouterOutputs["menu"]["getWeekMenu"][number];

export type MenuItem = MenuEntry["menuItem"];

export function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getDayName(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function formatDateWithOrdinal(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  return `${month} ${day}${getOrdinalSuffix(day)}`;
}

function groupMenusByDate(menuEntries: MenuEntry[]): Map<string, MenuEntry[]> {
  const grouped = new Map<string, MenuEntry[]>();

  for (const entry of menuEntries) {
    if (entry.date === null) continue;
    if (!grouped.has(entry.date)) {
      grouped.set(entry.date, []);
    }
    grouped.get(entry.date)!.push(entry);
  }

  return grouped;
}

function MenuItemBullet({ entry }: { entry: MenuEntry }) {
  const [open, setOpen] = useState(false);
  const menuItem = entry.menuItem;
  const price = (menuItem.basePrice / 100).toFixed(2);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-left hover:bg-white/20 rounded px-1 py-0.5 transition-colors cursor-pointer w-full">
          <span className="text-gray-800">
            • {menuItem.name} - ${price}
          </span>
        </button>
      </DialogTrigger>
      <AddItemDialogContent
        menuItem={menuItem}
        menuEntryId={entry.id}
        setOpen={setOpen}
      />
    </Dialog>
  );
}

function DayCard({ date, entries }: { date: string; entries: MenuEntry[] }) {
  return (
    <div className="bg-menu-card py-0.5 px-1.5 shadow-md">
      <h3 className="text-xl font-bold underline">{getDayName(date)}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
        {entries.map((entry) => (
          <MenuItemBullet key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function Header() {
  const [navMenuOpen, setNavMenuOpen] = useState(false);

  const { cart } = useCart();

  const itemCount = Object.values(cart.items).reduce(
    (sum, item) => sum + (item?.quantity || 0),
    0,
  );

  return (
    <header className="sticky top-0 z-50 bg-menu-bg px-4 py-3">
      <div className="flex items-center justify-between">
        <Sheet open={navMenuOpen} onOpenChange={setNavMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <HomeSheetContent
            closeNavMenu={() => {
              console.log("pressed");
              setNavMenuOpen(false);
            }}
          />
        </Sheet>

        <h1 className="text-3xl text-menu-title font-title font-thin whitespace-nowrap">
          Saangee's Kitchen
        </h1>

        <Link to="/cart">
          <Button variant="ghost" size="icon" className="relative">
            <ShoppingCart className="h-6 w-6" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Button>
        </Link>
      </div>
    </header>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-menu-bg">
      <header className="sticky top-0 z-50 bg-menu-bg px-4 py-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-10 rounded-md bg-white/30" />
          <Skeleton className="h-8 w-48 bg-white/30" />
          <Skeleton className="h-10 w-10 rounded-md bg-white/30" />
        </div>
      </header>
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-menu-card rounded-lg p-4 shadow-md">
              <Skeleton className="h-7 w-32 mb-3 bg-gray-300" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                <Skeleton className="h-5 w-full bg-gray-300" />
                <Skeleton className="h-5 w-full bg-gray-300" />
                <Skeleton className="h-5 w-3/4 bg-gray-300" />
                <Skeleton className="h-5 w-3/4 bg-gray-300" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CustomerMenuView() {
  const trpc = useTRPC();

  const { data: menuEntries, isLoading } = useQuery(
    trpc.menu.getWeekMenu.queryOptions(),
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const groupedMenus = menuEntries
    ? groupMenusByDate(menuEntries)
    : new Map<string, MenuEntry[]>();

  // Get sorted list of dates with items
  const daysWithItems = menuEntries
    ? [
        ...new Set(
          menuEntries.map((e) => e.date).filter((d): d is string => d !== null),
        ),
      ].sort()
    : [];

  // Calculate date range text
  const dateRangeText =
    daysWithItems.length > 0
      ? daysWithItems.length === 1
        ? formatDateWithOrdinal(daysWithItems[0])
        : `${formatDateWithOrdinal(daysWithItems[0])} - ${formatDateWithOrdinal(daysWithItems[daysWithItems.length - 1])}`
      : null;

  return (
    <div className="min-h-screen bg-menu-bg font-serif">
      <Header />
      <div className="container max-w-4xl mx-auto px-4">
        {dateRangeText && (
          <p className="text-gray-800 text-center py-4">{dateRangeText}</p>
        )}
        <div className="space-y-4">
          {daysWithItems.map((date) => {
            const entries = groupedMenus.get(date)!;
            return <DayCard key={date} date={date} entries={entries} />;
          })}
        </div>
      </div>
    </div>
  );
}

