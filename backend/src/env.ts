import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    PORT: z
      .string()
      .transform((x) => parseInt(x))
      .pipe(z.number().positive()),
  },

  runtimeEnv: process.env,
});

