"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const zod_1 = __importDefault(require("zod"));
const __1 = require("..");
const db_1 = require("../../db/db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
exports.usersRouter = (0, __1.createTRPCRouter)({
    create: __1.publicProcedure
        .input(zod_1.default.object({
        age: zod_1.default.number().min(1).max(150, "too old"),
        name: zod_1.default.string().min(1),
        email: zod_1.default.email(),
    }))
        .mutation(async ({ input }) => {
        const result = await db_1.db.insert(schema_1.usersTable).values(input).returning();
        return result;
    }),
    get: __1.publicProcedure
        .input(zod_1.default.object({ id: zod_1.default.number().int().positive() }))
        .query(async ({ input }) => {
        return await db_1.db
            .select()
            .from(schema_1.usersTable)
            .where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, input.id));
    }),
});
