"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminProcedure = exports.protectedProcedure = exports.publicProcedure = exports.createTRPCRouter = void 0;
exports.createContext = createContext;
const server_1 = require("@trpc/server");
const auth_1 = require("../lib/auth");
const admin_phones_1 = require("../lib/admin-phones");
const node_1 = require("better-auth/node");
async function createContext({ req }) {
    const sessionData = await auth_1.auth.api.getSession({
        headers: (0, node_1.fromNodeHeaders)(req.headers),
    });
    if (!sessionData) {
        return { isAdmin: false };
    }
    const { session, user } = sessionData;
    const isAdmin = (0, admin_phones_1.isAdminPhoneNumber)(user.phoneNumber);
    return {
        session,
        user,
        isAdmin,
    };
}
const t = server_1.initTRPC.context().create();
exports.createTRPCRouter = t.router;
// Timing middleware
const timingMiddleware = t.middleware(async ({ next, path }) => {
    const start = Date.now();
    if (t._config.isDev) {
        const waitMs = Math.floor(Math.random() * 400) + 100;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    const result = await next();
    const end = Date.now();
    console.log(`[TRPC] ${path} took ${end - start}ms to execute`);
    if (!result.ok) {
        console.log(`error in route ${path}:`, result.error);
    }
    return result;
});
// Auth middleware - requires authenticated user
const authMiddleware = t.middleware(async ({ ctx, next }) => {
    if (!ctx.session || !ctx.user) {
        throw new server_1.TRPCError({
            code: "UNAUTHORIZED",
            message: "You must be logged in to perform this action",
        });
    }
    return next({
        ctx: {
            ...ctx,
            session: ctx.session,
            user: ctx.user,
        },
    });
});
// Admin middleware - requires admin role (checks phone number)
const adminMiddleware = authMiddleware.unstable_pipe(async ({ ctx, next }) => {
    if (!ctx.isAdmin) {
        throw new server_1.TRPCError({
            code: "FORBIDDEN",
            message: "You must be an admin to perform this action",
        });
    }
    return next({ ctx });
});
exports.publicProcedure = t.procedure.use(timingMiddleware);
exports.protectedProcedure = t.procedure
    .use(timingMiddleware)
    .use(authMiddleware);
exports.adminProcedure = t.procedure
    .use(timingMiddleware)
    .use(adminMiddleware);
