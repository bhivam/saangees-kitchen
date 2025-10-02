export declare const appRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: object;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    alive: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: string;
        meta: object;
    }>;
    menuItems: import("@trpc/server").TRPCBuiltRouter<{
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
                name: string;
                id: string;
                basePrice: number;
                modifierGroups: {
                    menuItemId: string;
                    groupId: string;
                    sortOrder: number | null;
                    modifierGroup: {
                        name: string;
                        minSelect: number;
                        maxSelect: number | null;
                        id: string;
                        options: {
                            name: string;
                            priceDelta: number;
                            id: string;
                            groupId: string;
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
                name: string;
                id: string;
                basePrice: number;
                modifierGroups: {
                    menuItemId: string;
                    groupId: string;
                    sortOrder: number | null;
                    modifierGroup: {
                        name: string;
                        minSelect: number;
                        maxSelect: number | null;
                        id: string;
                        options: {
                            name: string;
                            priceDelta: number;
                            id: string;
                            groupId: string;
                        }[];
                    };
                }[];
            }[];
            meta: object;
        }>;
    }>>;
    modifierGroups: import("@trpc/server").TRPCBuiltRouter<{
        ctx: object;
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
                    name: string;
                    priceDelta: number;
                    id: string;
                    groupId: string;
                }[];
                name: string;
                minSelect: number;
                maxSelect: number | null;
                id: string;
            };
            meta: object;
        }>;
        getModifierGroups: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                name: string;
                minSelect: number;
                maxSelect: number | null;
                id: string;
                options: {
                    name: string;
                    priceDelta: number;
                    id: string;
                    groupId: string;
                }[];
            }[];
            meta: object;
        }>;
    }>>;
}>>;
//# sourceMappingURL=index.d.ts.map