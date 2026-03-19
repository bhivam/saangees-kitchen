import { createTRPCRouter, publicProcedure, adminProcedure } from "../index.js";
import { z } from "zod";
import { eq, inArray, isNull, and, sql, exists, not } from "drizzle-orm";
import { db } from "../../db/db.js";
import {
  menuItems,
  menuEntries,
  orderItems,
  comboEntries,
  comboItems,
  combos,
} from "../../db/schema.js";
import { TRPCError } from "@trpc/server";
import { PgColumn } from "drizzle-orm/pg-core";
import { isMenuVisible, isOrderingOpen } from "../../lib/order-cutoffs.js";
import { queryComboEntriesWithFullData } from "./combo.js";

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
            isNull(menuEntries.deletedAt),
            eq(menuEntries.isCustom, false),
          ),
        )
        .orderBy(menuEntries.sortOrder);

      return menuEntriesResult;
    }),

  getByDateRange: adminProcedure
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
          ? and(inArray(menuEntries.date, input.dates), isNull(menuEntries.deletedAt))
          : and(
              inArray(menuEntries.date, input.dates),
              isNull(menuEntries.deletedAt),
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

  // Public endpoint that returns menu for current week (today through Saturday)
  getWeekMenu: publicProcedure.query(async () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

    // Calculate days until Saturday (Sunday gets full week)
    const daysUntilSaturday = dayOfWeek === 0 ? 7 : 6 - dayOfWeek + 1;

    // Generate date strings for today through Saturday, excluding hidden dates
    const dates: string[] = [];
    for (let i = 0; i < daysUntilSaturday; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      if (isMenuVisible(dateStr)) {
        dates.push(dateStr);
      }
    }

    if (dates.length === 0)
      return { menuEntries: [], comboEntries: [] };

    const menuEntriesResult = await db.query.menuEntries.findMany({
      where: and(
        inArray(menuEntries.date, dates),
        isNull(menuEntries.deletedAt),
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

    // Filter out deleted items/groups/options, add orderingOpen flag
    const filteredMenuEntries = menuEntriesResult
      .filter((entry) => entry.menuItem.deletedAt === null)
      .map((entry) => ({
        ...entry,
        orderingOpen: isOrderingOpen(entry.date),
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

    // Fetch combo entries for the same dates (uses two-step query to avoid PG alias collision)
    const comboEntriesResult = await queryComboEntriesWithFullData(
      and(
        inArray(comboEntries.date, dates),
        isNull(comboEntries.deletedAt),
      )!,
    );

    const filteredComboEntries = (comboEntriesResult ?? [])
      .filter((entry) => entry.combo.deletedAt === null)
      .map((entry) => ({
        ...entry,
        orderingOpen: isOrderingOpen(entry.date),
        combo: {
          ...entry.combo,
          comboItems: entry.combo.comboItems
            .filter((ci) => ci.menuItem.deletedAt === null)
            .map((ci) => ({
              ...ci,
              menuItem: {
                ...ci.menuItem,
                modifierGroups: ci.menuItem.modifierGroups
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
            })),
        },
      }));

    return {
      menuEntries: filteredMenuEntries,
      comboEntries: filteredComboEntries,
    };
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
        if (input.itemsToDelete.length > 0) {
          // Guard: check if any items being deleted are required by active combos
          const entriesToDelete = await tx.query.menuEntries.findMany({
            where: and(
              inArray(menuEntries.id, input.itemsToDelete),
              eq(menuEntries.date, input.date),
            ),
            columns: { menuItemId: true },
          });
          const deletingMenuItemIds = new Set(
            entriesToDelete.map((e) => e.menuItemId),
          );

          if (deletingMenuItemIds.size > 0) {
            // Find active combos on this date
            const activeComboEntries = await tx.query.comboEntries.findMany({
              where: and(
                eq(comboEntries.date, input.date),
                isNull(comboEntries.deletedAt),
              ),
              columns: { comboId: true },
            });
            const activeComboIds = [
              ...new Set(activeComboEntries.map((e) => e.comboId)),
            ];

            if (activeComboIds.length > 0) {
              // Get the required menuItemIds for those combos, with combo names
              const requiredItems = await tx
                .select({
                  menuItemId: comboItems.menuItemId,
                  comboName: combos.name,
                })
                .from(comboItems)
                .innerJoin(combos, eq(comboItems.comboId, combos.id))
                .where(inArray(comboItems.comboId, activeComboIds));

              const blockedBy = requiredItems.filter((ri) =>
                deletingMenuItemIds.has(ri.menuItemId),
              );

              if (blockedBy.length > 0) {
                const comboNames = [
                  ...new Set(blockedBy.map((b) => b.comboName)),
                ];
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `Cannot remove item(s) required by active combo(s): ${comboNames.join(", ")}. Remove the combo first.`,
                });
              }
            }
          }

          await tx
            .update(menuEntries)
            .set({ deletedAt: new Date(), updatedAt: new Date() })
            .where(
              and(
                eq(menuEntries.date, input.date),
                inArray(menuEntries.id, input.itemsToDelete),
              ),
            );
        }

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
              set: { sortOrder: sql`excluded.sort_order`, deletedAt: null },
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
            and(
              eq(menuEntries.date, input.date),
              isNull(menuItems.deletedAt),
              isNull(menuEntries.deletedAt),
              not(menuEntries.isCustom),
            ),
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
          isNull(menuEntries.deletedAt),
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

      // If a custom entry already exists, return it
      if (existingEntry) return existingEntry;

      // Verify the menu item exists
      const menuItem = await db.query.menuItems.findFirst({
        where: and(eq(menuItems.id, input.menuItemId), isNull(menuItems.deletedAt)),
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
        ...entry,
        hasOrders: false,
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
        where: and(eq(menuEntries.id, input.entryId), isNull(menuEntries.deletedAt)),
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

