import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const semicolonSeparatedUrlsSchema = z
  .string()
  .transform((val) => val.split(";").map((s) => s.trim()))
  .pipe(z.url().array());

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    PORT: z
      .string()
      .transform((x) => parseInt(x))
      .pipe(z.number().positive()),
    SERVER_URL: z.url().default("http://localhost:3000"),
    FRONTEND_URLS: semicolonSeparatedUrlsSchema,
  },
  runtimeEnv: process.env,
});

