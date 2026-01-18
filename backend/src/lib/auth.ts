import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/db";
import { admin, anonymous, phoneNumber } from "better-auth/plugins";
import { env } from "../env";
import { user } from "../db/schema";
import { isAdminPhoneNumber } from "./admin-phones";
import { eq } from "drizzle-orm";

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
    admin(),
    anonymous({
      onLinkAccount({}) {
        // if there are ever resources created for anonymous users, they should be transferred over to
        // new users here
      },
    }),
    phoneNumber({
      sendOTP: ({ phoneNumber, code }) => {
        // TODO check when last one was sent and don't send if it was too soon
        console.log(`\nOTP for ${phoneNumber}: ${code}`);
      },
      async callbackOnVerification(data) {
        await db
          .update(user)
          .set({
            isAnonymous: false,
            role: isAdminPhoneNumber(data.phoneNumber) ? "admin" : "user",
          })
          .where(eq(user.phoneNumber, data.phoneNumber));
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
  database: drizzleAdapter(db, { provider: "pg" }),
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;

