import { env } from "@/env";
import { createAuthClient } from "better-auth/react";
import { phoneNumberClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [phoneNumberClient()],
  baseURL: env.VITE_SERVER_URL,
});

