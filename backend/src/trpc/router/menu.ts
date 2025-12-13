import { createTRPCRouter, publicProcedure, adminProcedure } from "..";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../db/db";
import { menuItems, menus } from "../../db/schema";

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
          id: menus.id,
          date: menus.date,
          sortOrder: menus.sortOrder,
          menuItem: menuItems,
        })
        .from(menus)
        .innerJoin(menuItems, eq(menus.menuItemId, menuItems.id))
        .where(eq(menus.date, input.date))
        .orderBy(menus.sortOrder);

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

      const menuEntries = await db
        .select({
          id: menus.id,
          date: menus.date,
          sortOrder: menus.sortOrder,
          menuItem: menuItems,
        })
        .from(menus)
        .innerJoin(menuItems, eq(menus.menuItemId, menuItems.id))
        .where(inArray(menus.date, input.dates))
        .orderBy(menus.date, menus.sortOrder);

      return menuEntries;
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

      await db.insert(menus).values(entries);

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
      await db.delete(menus).where(eq(menus.date, input.date));

      // Insert new entries
      if (input.items.length > 0) {
        const entries = input.items.map((itemId, index) => ({
          date: input.date,
          menuItemId: itemId,
          sortOrder: index,
        }));

        await db.insert(menus).values(entries);
      }

      return { success: true, date: input.date };
    }),
});

