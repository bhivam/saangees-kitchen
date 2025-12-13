import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/db";
import { phoneNumber } from "better-auth/plugins";
import { env, origins } from "../env";

export const auth = betterAuth({
  baseURL: env.SERVER_URL,
  trustedOrigins: origins,
  logger: {
    disabled: false,
    level: "debug",
    log: (level, message, ...args) => {
      console.log(`[BetterAuth][${level}] ${message}`, ...args);
    },
  },
  plugins: [
    phoneNumber({
      sendOTP: ({ phoneNumber, code }) => {
        console.log(`\nOTP for ${phoneNumber}: ${code}`);
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

