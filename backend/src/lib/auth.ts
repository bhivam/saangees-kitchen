import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/db.js";
import { admin, anonymous, phoneNumber } from "better-auth/plugins";
import { env } from "../env.js";
import { user } from "../db/schema.js";
import { isAdminPhoneNumber } from "./admin-phones.js";
import { eq } from "drizzle-orm";
import { surgeClient } from "./surge.js";

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
      // TODO come up with rate limiting solution
      // need to test if render forwards ip addresses in x-forwarded-for field
      sendOTP: async ({ phoneNumber, code }) => {
        console.log(`\nOTP for ${phoneNumber}: ${code}`);

        const message = await surgeClient.messages.create(
          "acct_01kfbndhbffe2v1jvyxvmr3kb1",
          {
            conversation: { contact: { phone_number: phoneNumber } },
            body: `Here is your OTP for Saangee's Kitchen: ${code}.`,
          },
        );

        console.log(message);
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

