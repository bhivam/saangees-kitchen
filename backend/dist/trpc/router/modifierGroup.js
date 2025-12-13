"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.modifierGroupsRouter = void 0;
const zod_1 = __importDefault(require("zod"));
const __1 = require("..");
const db_1 = require("../../db/db");
const schema_1 = require("../../db/schema");
const server_1 = require("@trpc/server");
exports.modifierGroupsRouter = (0, __1.createTRPCRouter)({
    createModifierGroup: __1.adminProcedure
        .input(zod_1.default
        .object({
        name: zod_1.default.string().min(1),
        minSelect: zod_1.default.int().nonnegative(),
        maxSelect: zod_1.default.int().positive().nullable(),
        newModifierOptionsData: zod_1.default
            .object({
            name: zod_1.default.string().min(1),
            priceDelta: zod_1.default.int(),
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
    }))
        .mutation(async ({ input }) => {
        const { newModifierOptionsData, ...newModifierGroupData } = input;
        const [newModifierGroup] = await db_1.db
            .insert(schema_1.modifierGroups)
            .values(newModifierGroupData)
            .returning();
        if (!newModifierGroup)
            throw new server_1.TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const newModifierOptions = await db_1.db
            .insert(schema_1.modifierOptions)
            .values(newModifierOptionsData.map((newModifierOptionData) => ({
            ...newModifierOptionData,
            groupId: newModifierGroup.id,
        })))
            .returning();
        if (!newModifierOptions ||
            newModifierOptions.length !== newModifierOptionsData.length)
            throw new server_1.TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        return {
            ...newModifierGroup,
            options: newModifierOptions,
        };
    }),
    getModifierGroups: __1.publicProcedure.query(async () => {
        const result = await db_1.db.query.modifierGroups.findMany({
            with: {
                options: true,
            },
        });
        if (result.length === 0)
            throw new server_1.TRPCError({ code: "NOT_FOUND" });
        return result;
    }),
});
