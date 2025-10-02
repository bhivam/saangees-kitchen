import { createTRPCContext } from "@trpc/tanstack-react-query";
import { appRouter } from "./router-types/trpc/router";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

export type AppRouter = typeof appRouter;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();

