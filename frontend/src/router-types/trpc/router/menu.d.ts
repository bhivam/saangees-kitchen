export declare const menuRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: {
        isAdmin: boolean;
        session?: never;
        user?: never;
    } | {
        session: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            expiresAt: Date;
            token: string;
            ipAddress?: string | null | undefined | undefined;
            userAgent?: string | null | undefined | undefined;
        };
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            emailVerified: boolean;
            name: string;
            image?: string | null | undefined | undefined;
            phoneNumber?: string | null | undefined;
            phoneNumberVerified?: boolean | null | undefined;
        };
        isAdmin: boolean;
    };
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    getByDate: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            date: string;
        };
        output: {
            id: string;
            date: string | null;
            sortOrder: number | null;
            menuItem: {
                id: string;
                name: string;
                description: string;
                basePrice: number;
            };
        }[];
        meta: object;
    }>;
    getByDateRange: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            dates: string[];
        };
        output: {
            id: string;
            date: string | null;
            sortOrder: number | null;
            menuItem: {
                id: string;
                name: string;
                description: string;
                basePrice: number;
            };
        }[];
        meta: object;
    }>;
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            date: string;
            items: string[];
        };
        output: {
            success: boolean;
            date: string;
        };
        meta: object;
    }>;
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            date: string;
            items: string[];
        };
        output: {
            success: boolean;
            date: string;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=menu.d.ts.map