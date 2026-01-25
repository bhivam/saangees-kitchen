import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { ChevronRight } from "lucide-react";

type NavItem = {
  label: string;
  callback?: () => void;
  to?: string;
  description?: string;
};

function SheetNavItem({ label, to, callback, description }: NavItem) {
  const content = (
    <div className="w-full flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[15px] font-medium leading-5 truncate">
          {label}
        </div>
        {description ? (
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {description}
          </div>
        ) : null}
      </div>

      <div
        className={[
          "text-xs px-2 py-1 rounded-md",
          to ? "text-muted-foreground" : "text-muted-foreground/60",
        ].join(" ")}
      >
        {to ? <ChevronRight /> : "Soon"}
      </div>
    </div>
  );

  if (!to) {
    return (
      <div
        aria-disabled="true"
        className="w-full rounded-lg px-1 py-1.5 opacity-70"
      >
        {content}
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      asChild
      className="w-full h-auto px-1 py-1.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/40 justify-start text-left"
      onClick={callback}
    >
      <Link to={to}>{content}</Link>
    </Button>
  );
}

function SheetNavSection({
  title,
  items,
}: {
  title?: string;
  items: NavItem[];
}) {
  return (
    <div className="space-y-2">
      {title && (
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {title}
          </h2>
        </div>
      )}

      <div className="flex flex-col">
        {items.map((item) => (
          <SheetNavItem {...item} key={item.label} />
        ))}
      </div>
    </div>
  );
}

export function HomeSheetContent({
  closeNavMenu,
}: {
  closeNavMenu: () => void;
}) {
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      const response = await authClient.signOut();

      if (response.error) {
        toast.error("Logout failed");
        return;
      }

      toast.success("Logged out successfully");
    } catch {
      toast.error("Logout failed");
    }
  };

  const navItems: NavItem[] = [
    {
      label: "Home",
      to: "/",
      callback: closeNavMenu,
      description: "Order food",
    },
    { label: "About", to: undefined, description: "Learn our story" },
    { label: "Gallery", to: undefined, description: "See recent dishes" },
    { label: "Catering", to: undefined, description: "Request an event order" },
    ...(user?.role === "admin"
      ? [
          {
            label: "Dashboard",
            to: "/dashboard",
            description: "Manage content and orders",
          },
        ]
      : []),
  ];

  return (
    <SheetContent
      side="left"
      className="flex flex-col px-4"
      showCloseButton={false}
    >
      <SheetHeader>
        <SheetTitle className="w-full flex justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-title font-thin whitespace-nowrap">
              Saangee's Kitchen
            </h1>
          </div>
        </SheetTitle>
      </SheetHeader>

      <div className="flex-1 flex flex-col gap-6">
        <SheetNavSection items={navItems} />
      </div>

      <div className="pb-4 border-t">
        <div className="py-2">
          <SheetNavSection items={[{ label: "Orders" }]} />
        </div>

        <div className="flex flex-col gap-2">
          {user?.isAnonymous ? (
            <Link to="/login" className="block">
              <Button className="w-full">Login</Button>
            </Link>
          ) : (
            <Button
              onClick={handleLogout}
              className="w-full"
              variant="secondary"
            >
              Logout
            </Button>
          )}
        </div>
      </div>
    </SheetContent>
  );
}

