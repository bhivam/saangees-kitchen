export declare const menuItemsRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: object;
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
            description: string;
            id: string;
            name: string;
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
            description: string;
            id: string;
            name: string;
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