export declare const usersRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: object;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            age: number;
            name: string;
            email: string;
        };
        output: {
            id: number;
            name: string;
            age: number;
            email: string;
        }[];
        meta: object;
    }>;
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            id: number;
        };
        output: {
            id: number;
            name: string;
            age: number;
            email: string;
        }[];
        meta: object;
    }>;
}>>;
//# sourceMappingURL=user.d.ts.map