import { createTRPCRouter, publicProcedure, adminProcedure } from "..";
import { z } from "zod";
import { eq, inArray, isNull, and } from "drizzle-orm";
import { db } from "../../db/db";
import { menuItems, menuEntries } from "../../db/schema";
import { TRPCError } from "@trpc/server";

export const menuRouter = createTRPCRouter({
  getByDate: publicProcedure
    .input(
      z.object({
        date: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const menuEntriesResult = await db
        .select({
          id: menuEntries.id,
          date: menuEntries.date,
          sortOrder: menuEntries.sortOrder,
          menuItem: menuItems,
        })
        .from(menuEntries)
        .innerJoin(menuItems, eq(menuEntries.menuItemId, menuItems.id))
        .where(
          and(
            eq(menuEntries.date, input.date),
            isNull(menuItems.deletedAt),
            eq(menuEntries.isCustom, false),
          ),
        )
        .orderBy(menuEntries.sortOrder);

      return menuEntriesResult;
    }),

  getByDateRange: publicProcedure
    .input(
      z.object({
        dates: z.array(z.string()),
        includeCustom: z.boolean().optional().default(false),
      }),
    )
    .query(async ({ input }) => {
      if (input.dates.length === 0) {
        return [];
      }

      const menuEntriesResult = await db.query.menuEntries.findMany({
        where: input.includeCustom
          ? inArray(menuEntries.date, input.dates)
          : and(
              inArray(menuEntries.date, input.dates),
              eq(menuEntries.isCustom, false),
            ),
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

      // Filter out entries where the menu item has been deleted
      // and filter out deleted modifier groups/options from the nested data
      const filteredResult = menuEntriesResult
        .filter((entry) => entry.menuItem.deletedAt === null)
        .map((entry) => ({
          ...entry,
          menuItem: {
            ...entry.menuItem,
            modifierGroups: entry.menuItem.modifierGroups
              .filter((mg) => mg.modifierGroup.deletedAt === null)
              .map((mg) => ({
                ...mg,
                modifierGroup: {
                  ...mg.modifierGroup,
                  options: mg.modifierGroup.options.filter(
                    (opt) => opt.deletedAt === null,
                  ),
                },
              })),
          },
        }));

      return filteredResult;
    }),

  // Unified save mutation - always deletes existing and inserts new entries
  // This prevents duplicates and handles both create and update cases
  save: adminProcedure
    .input(
      z.object({
        date: z.string(),
        items: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      // Deduplicate items (in case frontend sends duplicates)
      const uniqueItems = [...new Set(input.items)];

      return await db.transaction(async (tx) => {
        // Delete existing menu entries for this date
        await tx.delete(menuEntries).where(eq(menuEntries.date, input.date));

        // Insert new entries
        if (uniqueItems.length > 0) {
          const entries = uniqueItems.map((itemId, index) => ({
            date: input.date,
            menuItemId: itemId,
            sortOrder: index,
          }));

          await tx.insert(menuEntries).values(entries);
        }

        // Return the new menu entries with full menu item data
        const newEntries = await tx
          .select({
            id: menuEntries.id,
            date: menuEntries.date,
            sortOrder: menuEntries.sortOrder,
            menuItem: menuItems,
          })
          .from(menuEntries)
          .innerJoin(menuItems, eq(menuEntries.menuItemId, menuItems.id))
          .where(
            and(eq(menuEntries.date, input.date), isNull(menuItems.deletedAt)),
          )
          .orderBy(menuEntries.sortOrder);

        return { date: input.date, entries: newEntries };
      });
    }),

  // Keep create and update as aliases for backwards compatibility
  create: adminProcedure
    .input(
      z.object({
        date: z.string(),
        items: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      const uniqueItems = [...new Set(input.items)];

      return await db.transaction(async (tx) => {
        await tx.delete(menuEntries).where(eq(menuEntries.date, input.date));

        if (uniqueItems.length > 0) {
          const entries = uniqueItems.map((itemId, index) => ({
            date: input.date,
            menuItemId: itemId,
            sortOrder: index,
          }));
          await tx.insert(menuEntries).values(entries);
        }

        const newEntries = await tx
          .select({
            id: menuEntries.id,
            date: menuEntries.date,
            sortOrder: menuEntries.sortOrder,
            menuItem: menuItems,
          })
          .from(menuEntries)
          .innerJoin(menuItems, eq(menuEntries.menuItemId, menuItems.id))
          .where(
            and(eq(menuEntries.date, input.date), isNull(menuItems.deletedAt)),
          )
          .orderBy(menuEntries.sortOrder);

        return { date: input.date, entries: newEntries };
      });
    }),

  update: adminProcedure
    .input(
      z.object({
        date: z.string(),
        items: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      const uniqueItems = [...new Set(input.items)];

      return await db.transaction(async (tx) => {
        await tx.delete(menuEntries).where(eq(menuEntries.date, input.date));

        if (uniqueItems.length > 0) {
          const entries = uniqueItems.map((itemId, index) => ({
            date: input.date,
            menuItemId: itemId,
            sortOrder: index,
          }));
          await tx.insert(menuEntries).values(entries);
        }

        const newEntries = await tx
          .select({
            id: menuEntries.id,
            date: menuEntries.date,
            sortOrder: menuEntries.sortOrder,
            menuItem: menuItems,
          })
          .from(menuEntries)
          .innerJoin(menuItems, eq(menuEntries.menuItemId, menuItems.id))
          .where(
            and(eq(menuEntries.date, input.date), isNull(menuItems.deletedAt)),
          )
          .orderBy(menuEntries.sortOrder);

        return { date: input.date, entries: newEntries };
      });
    }),

  // Create a custom menu entry for manual orders
  createCustomMenuEntry: adminProcedure
    .input(
      z.object({
        date: z.string(),
        menuItemId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input }) => {
      // Verify the menu item exists
      const menuItem = await db.query.menuItems.findFirst({
        where: eq(menuItems.id, input.menuItemId),
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
      });

      if (!menuItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Menu item not found",
        });
      }

      // Create the custom menu entry
      const [entry] = await db
        .insert(menuEntries)
        .values({
          date: input.date,
          menuItemId: input.menuItemId,
          sortOrder: 9999, // Custom entries don't need specific order
          isCustom: true,
        })
        .returning();

      if (!entry) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create custom menu entry",
        });
      }

      return {
        id: entry.id,
        date: entry.date,
        sortOrder: entry.sortOrder,
        isCustom: entry.isCustom,
        menuItem,
      };
    }),
});

