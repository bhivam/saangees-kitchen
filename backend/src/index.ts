import express from "express";
import { env } from "./env";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./trpc/router";
import { createContext } from "./trpc";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";

const app = express();

app.use(
  cors({
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Origin",
      "X-Requested-With",
      "Accept",
      "Cookie",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    origin: env.FRONTEND_URLS,
  }),
);

app.use((req, res, next) => {
  const startTimestamp = new Date().toISOString();
  console.log(`→ [${startTimestamp}] ${req.method} ${req.path}`);

  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const endTimestamp = new Date().toISOString();
    console.log(
      `← [${endTimestamp}] ${req.method} ${req.path} :: ${res.statusCode.toString()} (${duration.toString()}ms)`,
    );
  });

  next();
});

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(
  "/",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

app.listen(env.PORT);

