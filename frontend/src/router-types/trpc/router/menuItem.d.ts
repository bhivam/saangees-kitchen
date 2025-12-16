export declare const menuItemsRouter: import("@trpc/server").TRPCBuiltRouter<{
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
            isAdmin: boolean;
        };
        isAdmin: boolean;
    };
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    createMenuItem: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            description: string;
            basePrice: number;
        };
        output: {
            id: string;
            name: string;
            description: string;
            basePrice: number;
            modifierGroups: {
                menuItemId: string;
                groupId: string;
                sortOrder: number | null;
                modifierGroup: {
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
                };
            }[];
        }[];
        meta: object;
    }>;
    getMenuItems: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            id: string;
            name: string;
            description: string;
            basePrice: number;
            modifierGroups: {
                menuItemId: string;
                groupId: string;
                sortOrder: number | null;
                modifierGroup: {
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
                };
            }[];
        }[];
        meta: object;
    }>;
}>>;
//# sourceMappingURL=menuItem.d.ts.map