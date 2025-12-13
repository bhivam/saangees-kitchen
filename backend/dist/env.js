"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.origins = exports.env = void 0;
const env_core_1 = require("@t3-oss/env-core");
const zod_1 = require("zod");
exports.env = (0, env_core_1.createEnv)({
    server: {
        DATABASE_URL: zod_1.z.url(),
        PORT: zod_1.z
            .string()
            .transform((x) => parseInt(x))
            .pipe(zod_1.z.number().positive()),
        SERVER_URL: zod_1.z.string().url().default("http://localhost:3000"),
        FRONTEND_URL: zod_1.z.string().url().default("http://localhost:5173"),
    },
    runtimeEnv: process.env,
});
exports.origins = [exports.env.FRONTEND_URL];
