"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const env_core_1 = require("@t3-oss/env-core");
const zod_1 = require("zod");
exports.env = (0, env_core_1.createEnv)({
    server: {
        DATABASE_URL: zod_1.z.url(),
        PORT: zod_1.z
            .string()
            .transform((x) => parseInt(x))
            .pipe(zod_1.z.number().positive()),
    },
    runtimeEnv: process.env,
});
