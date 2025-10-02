import type { ComponentProps } from "react";
import { Input } from "./input";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function InputWithIcon({
  Icon,
  ...inputProps
}: { Icon: LucideIcon } & ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <Input {...inputProps} className={cn("ps-7", inputProps.className)} />
      <div className="text-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2">
        <Icon className="size-4" />
      </div>
    </div>
  );
}

