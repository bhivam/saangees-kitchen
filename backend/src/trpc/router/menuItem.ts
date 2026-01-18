import z from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "..";
import { db } from "../../db/db";
import { menuItems, menuItemModifierGroups } from "../../db/schema";
import { TRPCError } from "@trpc/server";
import { eq, isNull } from "drizzle-orm";

export const menuItemsRouter = createTRPCRouter({
  createMenuItem: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        basePrice: z.number().int().positive(),
        modifierGroups: z
          .array(
            z.object({
              groupId: z.uuid(),
              sortOrder: z.number().int().nonnegative(),
            }),
          )
          .optional()
          .default([]),
      }),
    )
    .mutation(async ({ input }) => {
      const { modifierGroups, ...itemData } = input;
      const result = await db.insert(menuItems).values(itemData).returning();

      if (result.length === 0)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const menuItemId = result[0]!.id;

      if (modifierGroups.length > 0) {
        await db.insert(menuItemModifierGroups).values(
          modifierGroups.map((mg) => ({
            menuItemId,
            groupId: mg.groupId,
            sortOrder: mg.sortOrder,
          })),
        );
      }

      const toReturn = await db.query.menuItems.findMany({
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
        where: eq(menuItems.id, menuItemId),
      });

      return toReturn;
    }),

  updateMenuItem: adminProcedure
    .input(
      z.object({
        id: z.uuid(),
        name: z.string().min(1),
        description: z.string().min(1),
        basePrice: z.number().int().positive(),
        modifierGroups: z
          .array(
            z.object({
              groupId: z.uuid(),
              sortOrder: z.number().int().nonnegative(),
            }),
          )
          .optional()
          .default([]),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, modifierGroups, ...itemData } = input;

      const [updated] = await db
        .update(menuItems)
        .set(itemData)
        .where(eq(menuItems.id, id))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });

      await db
        .delete(menuItemModifierGroups)
        .where(eq(menuItemModifierGroups.menuItemId, id));

      if (modifierGroups.length > 0) {
        await db.insert(menuItemModifierGroups).values(
          modifierGroups.map((mg) => ({
            menuItemId: id,
            groupId: mg.groupId,
            sortOrder: mg.sortOrder,
          })),
        );
      }

      const toReturn = await db.query.menuItems.findFirst({
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
        where: eq(menuItems.id, id),
      });

      return toReturn;
    }),

  getMenuItems: publicProcedure.query(async () => {
    const result = await db.query.menuItems.findMany({
      where: isNull(menuItems.deletedAt),
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

    if (!result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    return result;
  }),

  deleteMenuItem: adminProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input }) => {
      const [deleted] = await db
        .update(menuItems)
        .set({ deletedAt: new Date() })
        .where(eq(menuItems.id, input.id))
        .returning();

      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });

      return deleted;
    }),
});

