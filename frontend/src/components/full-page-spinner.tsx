import type { ReactNode } from "react";
import { Spinner } from "./ui/spinner";

export function FullPageSpinner({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen">
      {children}
      <Spinner />
    </div>
  );
}

