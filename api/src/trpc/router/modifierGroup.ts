import z from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "../index.js";
import { db } from "../../db/db.js";
import { modifierGroups, modifierOptions } from "../../db/schema.js";
import { TRPCError } from "@trpc/server";
import { eq, isNull, sql } from "drizzle-orm";

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
          if (data.maxSelect !== null && data.maxSelect < data.minSelect) {
            ctx.addIssue({
              code: "custom",
              message: "Maximum selected values less than minimum.",
              path: ["maxSelect"],
            });
          }
          const requiredCount = data.maxSelect ?? data.minSelect;
          if (data.newModifierOptionsData.length < requiredCount) {
            ctx.addIssue({
              code: "custom",
              message: `Need at least ${requiredCount} option(s).`,
              path: ["newModifierOptionsData"],
            });
          }
          const names = data.newModifierOptionsData.map((o) =>
            o.name.trim().toLowerCase(),
          );
          const seen = new Set<string>();
          for (let i = 0; i < names.length; i++) {
            if (seen.has(names[i]!)) {
              ctx.addIssue({
                code: "custom",
                message: "Duplicate option name.",
                path: ["newModifierOptionsData", i, "name"],
              });
            }
            seen.add(names[i]!);
          }
        }),
    )
    .mutation(async ({ input }) => {
      const { newModifierOptionsData, ...newModifierGroupData } = input;

      return await db.transaction(async (tx) => {
        const [newModifierGroup] = await tx
          .insert(modifierGroups)
          .values(newModifierGroupData)
          .returning();

        if (!newModifierGroup)
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const newModifierOptions = await tx
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
      });
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
          if (data.maxSelect !== null && data.maxSelect < data.minSelect) {
            ctx.addIssue({
              code: "custom",
              message: "Maximum selected values less than minimum.",
              path: ["maxSelect"],
            });
          }
          const requiredCount = data.maxSelect ?? data.minSelect;
          if (data.newModifierOptionsData.length < requiredCount) {
            ctx.addIssue({
              code: "custom",
              message: `Need at least ${requiredCount} option(s).`,
              path: ["newModifierOptionsData"],
            });
          }
          const names = data.newModifierOptionsData.map((o) =>
            o.name.trim().toLowerCase(),
          );
          const seen = new Set<string>();
          for (let i = 0; i < names.length; i++) {
            if (seen.has(names[i]!)) {
              ctx.addIssue({
                code: "custom",
                message: "Duplicate option name.",
                path: ["newModifierOptionsData", i, "name"],
              });
            }
            seen.add(names[i]!);
          }
        }),
    )
    .mutation(async ({ input }) => {
      const { id, newModifierOptionsData, ...updateData } = input;

      return await db.transaction(async (tx) => {
        const [updatedGroup] = await tx
          .update(modifierGroups)
          .set(updateData)
          .where(eq(modifierGroups.id, id))
          .returning();

        if (!updatedGroup) throw new TRPCError({ code: "NOT_FOUND" });

        // Soft-delete all existing options for this group
        await tx
          .update(modifierOptions)
          .set({ deletedAt: new Date() })
          .where(eq(modifierOptions.groupId, id));

        // Upsert options: resurrect soft-deleted ones with matching name, insert new ones
        const newOptions = await Promise.all(
          newModifierOptionsData.map((opt) =>
            tx
              .insert(modifierOptions)
              .values({ ...opt, groupId: id })
              .onConflictDoUpdate({
                target: [modifierOptions.groupId, modifierOptions.name],
                set: {
                  priceDelta: sql`excluded.price_delta`,
                  deletedAt: null,
                },
              })
              .returning()
              .then((rows) => rows[0]!),
          ),
        );

        return {
          ...updatedGroup,
          options: newOptions,
        };
      });
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

