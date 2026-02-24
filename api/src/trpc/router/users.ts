import z from "zod";
import { createTRPCRouter, adminProcedure } from "../index.js";
import { db } from "../../db/db.js";
import { user } from "../../db/schema.js";
import { or, eq, and, like } from "drizzle-orm";
import { auth } from "../../lib/auth.js";

export const usersRouter = createTRPCRouter({
  createUser: adminProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const digits = input.phoneNumber.replace(/\D/g, "").slice(0, 10);
      if (digits.length !== 10) {
        throw new Error("Phone number must be 10 digits");
      }
      const phoneNumber = `+1${digits}`;

      // Check if user already exists with this phone number
      const existing = await db
        .select({ id: user.id, name: user.name, phoneNumber: user.phoneNumber })
        .from(user)
        .where(eq(user.phoneNumber, phoneNumber))
        .limit(1);

      if (existing.length > 0) {
        return existing[0]!;
      }

      const name = `${input.firstName} ${input.lastName}`;
      const created = await auth.api.createUser({
        body: {
          name,
          email: `${phoneNumber}@saangees-kitchen.com`,
          password: crypto.randomUUID(),
          role: "user",
          data: {
            phoneNumber,
            isAnonymous: false,
          },
        },
      });

      return {
        id: created.user.id,
        name: created.user.name,
        phoneNumber,
      };
    }),

  searchUsers: adminProcedure
    .input(
      z.object({
        query: z.string().optional(),
        limit: z.number().int().positive().default(20),
      }),
    )
    .query(async ({ input }) => {
      const { query, limit } = input;

      const users = await db
        .select({
          id: user.id,
          name: user.name,
          phoneNumber: user.phoneNumber,
        })
        .from(user)
        .where(
          and(
            eq(user.isAnonymous, false),
            query
              ? or(
                  like(user.name, `%${query}%`),
                  like(user.phoneNumber, `%${query}%`),
                )
              : undefined,
          ),
        )
        .limit(limit);

      return users;
    }),
});

