import z from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "..";
import { db } from "../../db/db";
import { modifierGroups, modifierOptions } from "../../db/schema";
import { TRPCError } from "@trpc/server";

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

  getModifierGroups: publicProcedure.query(async () => {
    const result = await db.query.modifierGroups.findMany({
      with: {
        options: true,
      },
    });

    if (result.length === 0) throw new TRPCError({ code: "NOT_FOUND" });

    return result;
  }),
});

