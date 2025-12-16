export declare const appRouter: import("@trpc/server").TRPCBuiltRouter<{
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
    alive: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: string;
        meta: object;
    }>;
    menuItems: import("@trpc/server").TRPCBuiltRouter<{
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
    menu: import("@trpc/server").TRPCBuiltRouter<{
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
    modifierGroups: import("@trpc/server").TRPCBuiltRouter<{
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
}>>;
//# sourceMappingURL=index.d.ts.map