import express from "express";
import { env } from "./env";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./trpc/router";
import { createContext } from "./trpc";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";

// Format timestamp in local timezone for logging
// Returns format like: 2025-01-12 15:30:45.123 EST
function formatLocalTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");

  // Get timezone string (e.g., "EST" or "EDT")
  const tzString = date.toLocaleTimeString("en-US", { timeZoneName: "short" }).split(" ")[2];

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms} ${tzString}`;
}

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
  const startTimestamp = formatLocalTimestamp(new Date());
  console.log(`→ [${startTimestamp}] ${req.method} ${req.path}`);

  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const endTimestamp = formatLocalTimestamp(new Date());
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

