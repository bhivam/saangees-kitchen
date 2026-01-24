import { createTRPCRouter, publicProcedure, adminProcedure } from "..";
import { z } from "zod";
import { eq, inArray, isNull, and, sql, exists } from "drizzle-orm";
import { db } from "../../db/db";
import { menuItems, menuEntries, orderItems } from "../../db/schema";
import { TRPCError } from "@trpc/server";
import { PgColumn } from "drizzle-orm/pg-core";

// TODO may consider differentiating having a manual order vs a customer order
function hasOrdersQuery(menuEntriesId: PgColumn) {
  return exists(
    db
      .select({})
      .from(orderItems)
      .where(
        and(
          eq(orderItems.menuEntryId, menuEntriesId),
          isNull(orderItems.deletedAt),
        ),
      ),
  )
    .mapWith(Boolean)
    .as("hasOrders");
}

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
          hasOrders: hasOrdersQuery(menuEntries.id),
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
        extras: ({ id }) => ({ hasOrders: hasOrdersQuery(id) }),
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

  save: adminProcedure
    .input(
      z.object({
        date: z.string(),
        itemsToSave: z.array(z.string()),
        itemsToDelete: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      const uniqueItems = [...new Set(input.itemsToSave)];

      return await db.transaction(async (tx) => {
        await tx
          .delete(menuEntries)
          .where(
            and(
              eq(menuEntries.date, input.date),
              inArray(menuEntries.id, input.itemsToDelete),
            ),
          );

        if (uniqueItems.length > 0) {
          const entries = uniqueItems.map((itemId, index) => ({
            date: input.date,
            menuItemId: itemId,
            sortOrder: index,
          }));

          await tx
            .insert(menuEntries)
            .values(entries)
            .onConflictDoUpdate({
              target: [
                menuEntries.date,
                menuEntries.menuItemId,
                menuEntries.isCustom,
              ],
              set: { sortOrder: sql`excluded.sort_order` },
            });
        }

        const newEntries = await tx
          .select({
            id: menuEntries.id,
            date: menuEntries.date,
            sortOrder: menuEntries.sortOrder,
            menuItem: menuItems,
            hasOrders: hasOrdersQuery(menuEntries.id),
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
  // If a custom entry already exists for the same date and menu item, returns the existing one
  createCustomMenuEntry: adminProcedure
    .input(
      z.object({
        date: z.string(),
        menuItemId: z.uuid(),
      }),
    )
    .mutation(async ({ input }) => {
      // Check if a custom entry already exists for this date and menu item
      const existingEntry = await db.query.menuEntries.findFirst({
        where: and(
          eq(menuEntries.date, input.date),
          eq(menuEntries.menuItemId, input.menuItemId),
          eq(menuEntries.isCustom, true),
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

      // If a custom entry already exists, return it
      if (existingEntry) {
        return {
          id: existingEntry.id,
          date: existingEntry.date,
          sortOrder: existingEntry.sortOrder,
          isCustom: existingEntry.isCustom,
          menuItem: existingEntry.menuItem,
        };
      }

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

  // Convert a custom menu entry to a normal entry (when added to Menu Editor)
  convertCustomToNormal: adminProcedure
    .input(
      z.object({
        entryId: z.uuid(),
      }),
    )
    .mutation(async ({ input }) => {
      const entry = await db.query.menuEntries.findFirst({
        where: eq(menuEntries.id, input.entryId),
      });

      if (!entry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Menu entry not found",
        });
      }

      if (!entry.isCustom) {
        // Already a normal entry, nothing to do
        return entry;
      }

      const [updated] = await db
        .update(menuEntries)
        .set({ isCustom: false })
        .where(eq(menuEntries.id, input.entryId))
        .returning();

      return updated;
    }),
});

