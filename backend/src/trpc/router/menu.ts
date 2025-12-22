import { createTRPCRouter, publicProcedure, adminProcedure } from "..";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../db/db";
import { menuItems, menuEntries, menuEntries } from "../../db/schema";
import { TRPCError } from "@trpc/server";

export const menuRouter = createTRPCRouter({
  getByDate: publicProcedure
    .input(
      z.object({
        date: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const menuEntries = await db
        .select({
          id: menuEntries.id,
          date: menuEntries.date,
          sortOrder: menuEntries.sortOrder,
          menuItem: menuItems,
        })
        .from(menuEntries)
        .innerJoin(menuItems, eq(menuEntries.menuItemId, menuItems.id))
        .where(eq(menuEntries.date, input.date))
        .orderBy(menuEntries.sortOrder);

      return menuEntries;
    }),

  getByDateRange: publicProcedure
    .input(
      z.object({
        dates: z.array(z.string()),
      }),
    )
    .query(async ({ input }) => {
      if (input.dates.length === 0) {
        return [];
      }

      const menuEntriesResult = await db.query.menuEntries.findMany({
        where: inArray(menuEntries.date, input.dates),
        with: {
          menuItem: {
            with: {
              modifierGroups: {
                with: {
                  modifierGroup: {
                    with: {
                      options: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!menuEntriesResult)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return menuEntriesResult;
    }),

  create: adminProcedure
    .input(
      z.object({
        date: z.string(),
        items: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      const entries = input.items.map((itemId, index) => ({
        date: input.date,
        menuItemId: itemId,
        sortOrder: index,
      }));

      await db.insert(menuEntries).values(entries);

      return { success: true, date: input.date };
    }),

  update: adminProcedure
    .input(
      z.object({
        date: z.string(),
        items: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      // Delete existing menu entries for this date
      await db.delete(menuEntries).where(eq(menuEntries.date, input.date));

      // Insert new entries
      if (input.items.length > 0) {
        const entries = input.items.map((itemId, index) => ({
          date: input.date,
          menuItemId: itemId,
          sortOrder: index,
        }));

        await db.insert(menuEntries).values(entries);
      }

      return { success: true, date: input.date };
    }),
});

