"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appRouter = void 0;
const __1 = require("..");
const user_1 = require("./user");
exports.appRouter = (0, __1.createTRPCRouter)({
    alive: __1.publicProcedure.query(() => "I'm alive!"),
    users: user_1.usersRouter,
});
