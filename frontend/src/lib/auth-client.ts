import { env } from "@/env";
import { createAuthClient } from "better-auth/react";
import {
  anonymousClient,
  inferAdditionalFields,
  phoneNumberClient,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        isAdmin: {
          type: "boolean",
        },
      },
    }),
    phoneNumberClient(),
    anonymousClient(),
  ],
  baseURL: env.VITE_SERVER_URL,
});

