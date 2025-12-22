import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/db";
import { anonymous, phoneNumber } from "better-auth/plugins";
import { env } from "../env";
import { user } from "../db/schema";
import { isAdminPhoneNumber } from "./admin-phones";

export const auth = betterAuth({
  baseURL: env.SERVER_URL,
  trustedOrigins: env.FRONTEND_URLS,
  logger: {
    disabled: false,
    level: "debug",
    log: (level, message, ...args) => {
      console.log(`[BetterAuth][${level}] ${message}`, ...args);
    },
  },
  plugins: [
    anonymous({
      onLinkAccount({ anonymousUser, newUser }) {},
    }),
    phoneNumber({
      sendOTP: ({ phoneNumber, code }) => {
        console.log(`\nOTP for ${phoneNumber}: ${code}`);
      },
      async callbackOnVerification(data) {
        await db
          .update(user)
          .set({ isAdmin: isAdminPhoneNumber(data.phoneNumber) });
      },
      signUpOnVerification: {
        getTempEmail: (phoneNumber) => {
          return `${phoneNumber}@saangees-kitchen.com`;
        },
        getTempName: (phoneNumber) => {
          return `User ${phoneNumber.slice(-4)}`;
        },
      },
    }),
  ],
  user: {
    additionalFields: {
      isAdmin: {
        type: "boolean",
        required: true,
        defaultValue: false,
      },
    },
  },
  database: drizzleAdapter(db, { provider: "pg" }),
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;

