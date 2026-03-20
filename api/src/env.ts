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
    SURGE_API_KEY: z.string(),
    AWS_ACCESS_KEY_ID: z.string(),
    AWS_SECRET_ACCESS_KEY: z.string(),
    AWS_REGION: z.string(),
    BUCKET_NAME: z.string(),
  },
  runtimeEnv: process.env,
});

