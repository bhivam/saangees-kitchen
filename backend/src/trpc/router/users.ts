import z from "zod";
import { createTRPCRouter, adminProcedure } from "..";
import { db } from "../../db/db";
import { user } from "../../db/schema";
import { or, eq, and, like } from "drizzle-orm";

export const usersRouter = createTRPCRouter({
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

