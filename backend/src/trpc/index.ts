import { initTRPC, TRPCError } from "@trpc/server";
import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { auth } from "../lib/auth";
import { isAdminPhoneNumber } from "../lib/admin-phones";
import { fromNodeHeaders } from "better-auth/node";

export async function createContext({ req }: CreateExpressContextOptions) {
  const sessionData = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!sessionData) {
    return { isAdmin: false };
  }

  const { session, user } = sessionData;
  const isAdmin = isAdminPhoneNumber(user.phoneNumber);

  return {
    session,
    user,
    isAdmin,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const createTRPCRouter = t.router;

// Timing middleware
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  if (!result.ok) {
    console.log(`error in route ${path}:`, result.error);
  }

  return result;
});

const authMiddleware = t.middleware(async ({ ctx, next }) => {
  console.log(ctx);
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});

const adminMiddleware = authMiddleware.unstable_pipe(async ({ ctx, next }) => {
  if (!ctx.isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be an admin to perform this action",
    });
  }

  return next({ ctx });
});

export const publicProcedure = t.procedure.use(timingMiddleware);

export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(authMiddleware);

export const adminProcedure = t.procedure
  .use(timingMiddleware)
  .use(adminMiddleware);

