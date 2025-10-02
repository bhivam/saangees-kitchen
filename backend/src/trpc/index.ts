import { initTRPC } from "@trpc/server";

const t = initTRPC.create();

export const createTRPCRouter = t.router;
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    console.log("is dev");
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

export const publicProcedure = t.procedure.use(timingMiddleware);

