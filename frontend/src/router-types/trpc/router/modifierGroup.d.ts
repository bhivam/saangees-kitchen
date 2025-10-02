export declare const modifierGroupsRouter: import("@trpc/server").TRPCBuiltRouter<{
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
//# sourceMappingURL=modifierGroup.d.ts.map