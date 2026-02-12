import express from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter, createContext, auth, env } from "api";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { loggingMiddleware } from "./middleware/logging.js";

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

app.use(loggingMiddleware);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(
  "/",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

app.listen(env.PORT);

