import z from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "../index.js";
import { db } from "../../db/db.js";
import { combos, comboItems, comboEntries, menuEntries } from "../../db/schema.js";
import { TRPCError } from "@trpc/server";
import { eq, isNull, and, inArray, sql, type SQL } from "drizzle-orm";

// Deeply nested queries from comboEntries hit PostgreSQL's 63-char identifier limit,
// causing alias collisions. This helper splits into two queries to avoid it:
// 1. comboEntries with shallow combo data
// 2. combos with full nested data (shorter alias chain)
export async function queryComboEntriesWithFullData(
  whereClause: SQL,
  txDb: Pick<typeof db, "query"> = db,
) {
  const entries = await txDb.query.comboEntries.findMany({
    where: whereClause,
    with: { combo: true },
    orderBy: comboEntries.sortOrder,
  });

  if (entries.length === 0) return [];

  const comboIds = [...new Set(entries.map((e) => e.combo.id))];
  const fullCombos = await txDb.query.combos.findMany({
    where: inArray(combos.id, comboIds),
    with: {
      comboItems: {
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
      },
    },
  });

  const comboMap = new Map(fullCombos.map((c) => [c.id, c]));

  return entries.map((entry) => ({
    ...entry,
    combo: comboMap.get(entry.combo.id)!,
  }));
}

export const combosRouter = createTRPCRouter({
  createCombo: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        discountAmount: z.number().int().positive(),
        menuItems: z
          .array(
            z.object({
              menuItemId: z.uuid(),
              sortOrder: z.number().int().nonnegative(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const { menuItems: items, ...comboData } = input;
      const result = await db.insert(combos).values(comboData).returning();

      if (result.length === 0)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const comboId = result[0]!.id;

      await db.insert(comboItems).values(
        items.map((item) => ({
          comboId,
          menuItemId: item.menuItemId,
          sortOrder: item.sortOrder,
        })),
      );

      const toReturn = await db.query.combos.findFirst({
        where: eq(combos.id, comboId),
        with: {
          comboItems: {
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
          },
        },
      });

      return toReturn;
    }),

  updateCombo: adminProcedure
    .input(
      z.object({
        id: z.uuid(),
        name: z.string().min(1),
        description: z.string().min(1),
        discountAmount: z.number().int().positive(),
        menuItems: z
          .array(
            z.object({
              menuItemId: z.uuid(),
              sortOrder: z.number().int().nonnegative(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, menuItems: items, ...comboData } = input;

      const [updated] = await db
        .update(combos)
        .set(comboData)
        .where(eq(combos.id, id))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });

      await db.delete(comboItems).where(eq(comboItems.comboId, id));

      await db.insert(comboItems).values(
        items.map((item) => ({
          comboId: id,
          menuItemId: item.menuItemId,
          sortOrder: item.sortOrder,
        })),
      );

      const toReturn = await db.query.combos.findFirst({
        where: eq(combos.id, id),
        with: {
          comboItems: {
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
          },
        },
      });

      return toReturn;
    }),

  getCombos: publicProcedure.query(async () => {
    const result = await db.query.combos.findMany({
      where: isNull(combos.deletedAt),
      with: {
        comboItems: {
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
        },
      },
    });

    if (!result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    return result.map((combo) => ({
      ...combo,
      comboItems: combo.comboItems
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
    }));
  }),

  deleteCombo: adminProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input }) => {
      const [deleted] = await db
        .update(combos)
        .set({ deletedAt: new Date() })
        .where(eq(combos.id, input.id))
        .returning();

      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });

      return deleted;
    }),

  // Combo Entry management (daily menu combos)
  saveComboEntries: adminProcedure
    .input(
      z.object({
        date: z.string(),
        combosToSave: z.array(z.string()),
        combosToDelete: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      const uniqueCombos = [...new Set(input.combosToSave)];

      return await db.transaction(async (tx) => {
        if (input.combosToDelete.length > 0) {
          await tx
            .update(comboEntries)
            .set({ deletedAt: new Date(), updatedAt: new Date() })
            .where(
              and(
                eq(comboEntries.date, input.date),
                inArray(comboEntries.id, input.combosToDelete),
              ),
            );
        }

        if (uniqueCombos.length > 0) {
          const entries = uniqueCombos.map((comboId, index) => ({
            date: input.date,
            comboId,
            sortOrder: index,
          }));

          await tx
            .insert(comboEntries)
            .values(entries)
            .onConflictDoUpdate({
              target: [comboEntries.date, comboEntries.comboId],
              set: { sortOrder: sql`excluded.sort_order`, deletedAt: null },
            });
        }

        // Auto-add constituent menu items for all active combos on this date
        if (uniqueCombos.length > 0) {
          // Get all menuItemIds required by the combos being saved
          const requiredItems = await tx.query.comboItems.findMany({
            where: inArray(comboItems.comboId, uniqueCombos),
            columns: { menuItemId: true },
          });
          const requiredMenuItemIds = [
            ...new Set(requiredItems.map((ci) => ci.menuItemId)),
          ];

          if (requiredMenuItemIds.length > 0) {
            // Find which items already exist on this date's menu (non-deleted, non-custom)
            const existingEntries = await tx.query.menuEntries.findMany({
              where: and(
                eq(menuEntries.date, input.date),
                isNull(menuEntries.deletedAt),
                eq(menuEntries.isCustom, false),
              ),
              columns: { menuItemId: true, sortOrder: true },
            });
            const existingItemIds = new Set(
              existingEntries.map((e) => e.menuItemId),
            );
            const currentMaxSort = existingEntries.reduce(
              (m, e) => Math.max(m, e.sortOrder),
              -1,
            );

            const missingItemIds = requiredMenuItemIds.filter(
              (id) => !existingItemIds.has(id),
            );

            if (missingItemIds.length > 0) {
              const newMenuEntries = missingItemIds.map((menuItemId, i) => ({
                date: input.date,
                menuItemId,
                sortOrder: currentMaxSort + 1 + i,
              }));

              await tx
                .insert(menuEntries)
                .values(newMenuEntries)
                .onConflictDoUpdate({
                  target: [
                    menuEntries.date,
                    menuEntries.menuItemId,
                    menuEntries.isCustom,
                  ],
                  set: {
                    sortOrder: sql`excluded.sort_order`,
                    deletedAt: null,
                  },
                });
            }
          }
        }

        const newEntries = await queryComboEntriesWithFullData(
          and(
            eq(comboEntries.date, input.date),
            isNull(comboEntries.deletedAt),
          )!,
          tx,
        );

        return { date: input.date, entries: newEntries };
      });
    }),

  getComboEntriesByDate: publicProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      return await queryComboEntriesWithFullData(
        and(
          eq(comboEntries.date, input.date),
          isNull(comboEntries.deletedAt),
        )!,
      );
    }),
});
