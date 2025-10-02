import express from "express";
import { env } from "./env";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./trpc/router";
import cors from "cors";

const app = express();

app.use(cors());

app.use(
  "/",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
  }),
);

app.listen(env.PORT);

