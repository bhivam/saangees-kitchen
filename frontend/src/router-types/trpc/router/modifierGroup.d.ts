export declare const modifierGroupsRouter: import("@trpc/server").TRPCBuiltRouter<{
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
            isAnonymous?: boolean | null | undefined;
            isAdmin: boolean;
            phoneNumber?: string | null | undefined;
            phoneNumberVerified?: boolean | null | undefined;
        };
        isAdmin: boolean;
    };
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    createModifierGroup: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            minSelect: number;
            maxSelect: number | null;
            newModifierOptionsData: {
                name: string;
                priceDelta: number;
            }[];
        };
        output: {
            options: {
                id: string;
                name: string;
                groupId: string;
                priceDelta: number;
            }[];
            id: string;
            name: string;
            minSelect: number;
            maxSelect: number | null;
        };
        meta: object;
    }>;
    getModifierGroups: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            id: string;
            name: string;
            minSelect: number;
            maxSelect: number | null;
            options: {
                id: string;
                name: string;
                groupId: string;
                priceDelta: number;
            }[];
        }[];
        meta: object;
    }>;
}>>;
//# sourceMappingURL=modifierGroup.d.ts.map