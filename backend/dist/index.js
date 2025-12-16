"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const env_1 = require("./env");
const trpcExpress = __importStar(require("@trpc/server/adapters/express"));
const router_1 = require("./trpc/router");
const trpc_1 = require("./trpc");
const cors_1 = __importDefault(require("cors"));
const node_1 = require("better-auth/node");
const auth_1 = require("./lib/auth");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Origin",
        "X-Requested-With",
        "Accept",
        "Cookie",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    origin: env_1.env.FRONTEND_URLS,
}));
app.use((req, res, next) => {
    const startTimestamp = new Date().toISOString();
    console.log(`→ [${startTimestamp}] ${req.method} ${req.path}`);
    const startTime = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - startTime;
        const endTimestamp = new Date().toISOString();
        console.log(`← [${endTimestamp}] ${req.method} ${req.path} :: ${res.statusCode.toString()} (${duration.toString()}ms)`);
    });
    next();
});
app.all("/api/auth/*splat", (0, node_1.toNodeHandler)(auth_1.auth));
app.use("/", trpcExpress.createExpressMiddleware({
    router: router_1.appRouter,
    createContext: trpc_1.createContext,
}));
app.listen(env_1.env.PORT);
