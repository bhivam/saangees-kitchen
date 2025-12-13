import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    PORT: z
      .string()
      .transform((x) => parseInt(x))
      .pipe(z.number().positive()),
    SERVER_URL: z.string().url().default("http://localhost:3000"),
    FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  },

  runtimeEnv: process.env,
});

export const origins = [env.FRONTEND_URL];

