import { env } from "@/env";
import { createAuthClient } from "better-auth/react";
import {
  anonymousClient,
  inferAdditionalFields,
  phoneNumberClient,
} from "better-auth/client/plugins";
import { auth } from "@/router-types/lib/auth";

export const authClient = createAuthClient({
  plugins: [
    phoneNumberClient(),
    inferAdditionalFields<typeof auth>(),
    anonymousClient(),
  ],
  baseURL: env.VITE_SERVER_URL,
});

