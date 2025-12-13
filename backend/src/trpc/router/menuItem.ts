import z from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "..";
import { db } from "../../db/db";
import { menuItems } from "../../db/schema";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

export const menuItemsRouter = createTRPCRouter({
  createMenuItem: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        basePrice: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await db.insert(menuItems).values(input).returning();

      if (result.length === 0)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

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
        where: eq(menuItems.id, result[0]!.id),
      });

      return toReturn;
    }),

  getMenuItems: publicProcedure.query(async () => {
    const result = await db.query.menuItems.findMany({
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
});

