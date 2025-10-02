import type { ClassValue } from "clsx";
import { cn } from "../utils";
import { useTRPC } from "../trpc";
import { useQuery } from "@tanstack/react-query";

function SmallDot({
  size,
  className,
}: {
  size: number;
  className?: ClassValue;
}) {
  return (
    <div
      className={cn("rounded-full", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function AliveCheck() {
  const trpc = useTRPC();

  const { isLoading, isError } = useQuery(trpc.alive.queryOptions());

  if (isLoading) {
    return <SmallDot size={10} className="bg-yellow-500" />;
  }
  if (isError) {
    return <SmallDot size={10} className="bg-red-500" />;
  }
  return <SmallDot size={10} className="bg-green-500" />;
}

