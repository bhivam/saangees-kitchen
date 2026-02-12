import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { appRouter } from "api";

export type AppRouter = typeof appRouter;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();

