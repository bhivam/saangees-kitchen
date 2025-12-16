"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const env_core_1 = require("@t3-oss/env-core");
const zod_1 = require("zod");
const semicolonSeparatedUrlsSchema = zod_1.z
    .string()
    .transform((val) => val.split(";").map((s) => s.trim()))
    .pipe(zod_1.z.url().array());
exports.env = (0, env_core_1.createEnv)({
    server: {
        DATABASE_URL: zod_1.z.url(),
        PORT: zod_1.z
            .string()
            .transform((x) => parseInt(x))
            .pipe(zod_1.z.number().positive()),
        SERVER_URL: zod_1.z.url().default("http://localhost:3000"),
        FRONTEND_URLS: semicolonSeparatedUrlsSchema,
    },
    runtimeEnv: process.env,
});
