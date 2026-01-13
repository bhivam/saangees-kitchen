import z from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "..";
import { db } from "../../db/db";
import { modifierGroups, modifierOptions } from "../../db/schema";
import { TRPCError } from "@trpc/server";
import { eq, isNull } from "drizzle-orm";

export const modifierGroupsRouter = createTRPCRouter({
  createModifierGroup: adminProcedure
    .input(
      z
        .object({
          name: z.string().min(1),
          minSelect: z.int().nonnegative(),
          maxSelect: z.int().positive().nullable(),
          newModifierOptionsData: z
            .object({
              name: z.string().min(1),
              priceDelta: z.int(),
            })
            .array(),
        })
        .superRefine((data, ctx) => {
          if (data.maxSelect && data.maxSelect < data.minSelect) {
            ctx.addIssue({
              code: "custom",
              message: "Maximum selected values less than minimum.",
              path: ["maxSelect"],
            });
          }
        }),
    )
    .mutation(async ({ input }) => {
      const { newModifierOptionsData, ...newModifierGroupData } = input;

      const [newModifierGroup] = await db
        .insert(modifierGroups)
        .values(newModifierGroupData)
        .returning();

      if (!newModifierGroup)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const newModifierOptions = await db
        .insert(modifierOptions)
        .values(
          newModifierOptionsData.map((newModifierOptionData) => ({
            ...newModifierOptionData,
            groupId: newModifierGroup.id,
          })),
        )
        .returning();

      if (
        !newModifierOptions ||
        newModifierOptions.length !== newModifierOptionsData.length
      )
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return {
        ...newModifierGroup,
        options: newModifierOptions,
      };
    }),

  updateModifierGroup: adminProcedure
    .input(
      z
        .object({
          id: z.string().uuid(),
          name: z.string().min(1),
          minSelect: z.int().nonnegative(),
          maxSelect: z.int().positive().nullable(),
          newModifierOptionsData: z
            .object({
              name: z.string().min(1),
              priceDelta: z.int(),
            })
            .array(),
        })
        .superRefine((data, ctx) => {
          if (data.maxSelect && data.maxSelect < data.minSelect) {
            ctx.addIssue({
              code: "custom",
              message: "Maximum selected values less than minimum.",
              path: ["maxSelect"],
            });
          }
        }),
    )
    .mutation(async ({ input }) => {
      const { id, newModifierOptionsData, ...updateData } = input;

      const [updatedGroup] = await db
        .update(modifierGroups)
        .set(updateData)
        .where(eq(modifierGroups.id, id))
        .returning();

      if (!updatedGroup) throw new TRPCError({ code: "NOT_FOUND" });

      await db.delete(modifierOptions).where(eq(modifierOptions.groupId, id));

      const newOptions = await db
        .insert(modifierOptions)
        .values(
          newModifierOptionsData.map((opt) => ({
            ...opt,
            groupId: id,
          })),
        )
        .returning();

      return {
        ...updatedGroup,
        options: newOptions,
      };
    }),

  getModifierGroups: publicProcedure.query(async () => {
    const result = await db.query.modifierGroups.findMany({
      where: isNull(modifierGroups.deletedAt),
      with: {
        options: {
          where: isNull(modifierOptions.deletedAt),
        },
      },
    });

    return result;
  }),

  deleteModifierGroup: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const deletedAt = new Date();

      // Soft delete all options belonging to this group
      await db
        .update(modifierOptions)
        .set({ deletedAt })
        .where(eq(modifierOptions.groupId, input.id));

      // Soft delete the group itself
      const [deleted] = await db
        .update(modifierGroups)
        .set({ deletedAt })
        .where(eq(modifierGroups.id, input.id))
        .returning();

      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });

      return deleted;
    }),
});

