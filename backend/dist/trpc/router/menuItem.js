"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.menuItemsRouter = void 0;
const zod_1 = __importDefault(require("zod"));
const __1 = require("..");
const db_1 = require("../../db/db");
const schema_1 = require("../../db/schema");
const server_1 = require("@trpc/server");
const drizzle_orm_1 = require("drizzle-orm");
exports.menuItemsRouter = (0, __1.createTRPCRouter)({
    createMenuItem: __1.adminProcedure
        .input(zod_1.default.object({
        name: zod_1.default.string().min(1),
        description: zod_1.default.string().min(1),
        basePrice: zod_1.default.number().int().positive(),
    }))
        .mutation(async ({ input }) => {
        const result = await db_1.db.insert(schema_1.menuItems).values(input).returning();
        if (result.length === 0)
            throw new server_1.TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const toReturn = await db_1.db.query.menuItems.findMany({
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
            where: (0, drizzle_orm_1.eq)(schema_1.menuItems.id, result[0].id),
        });
        return toReturn;
    }),
    getMenuItems: __1.publicProcedure.query(async () => {
        const result = await db_1.db.query.menuItems.findMany({
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
        if (!result)
            throw new server_1.TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        return result;
    }),
});
