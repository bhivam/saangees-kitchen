export declare const auth: import("better-auth").Auth<{
    baseURL: string;
    trustedOrigins: string[];
    logger: {
        disabled: false;
        level: "debug";
        log: (level: "error" | "debug" | "info" | "warn", message: string, ...args: any[]) => void;
    };
    plugins: [{
        id: "anonymous";
        endpoints: {
            signInAnonymous: {
                <AsResponse extends boolean = false, ReturnHeaders extends boolean = false>(inputCtx_0?: ({
                    body?: undefined;
                } & {
                    method?: "POST" | undefined;
                } & {
                    query?: Record<string, any> | undefined;
                } & {
                    params?: Record<string, any>;
                } & {
                    request?: Request;
                } & {
                    headers?: HeadersInit;
                } & {
                    asResponse?: boolean;
                    returnHeaders?: boolean;
                    use?: import("better-auth").Middleware[];
                    path?: string;
                } & {
                    asResponse?: AsResponse | undefined;
                    returnHeaders?: ReturnHeaders | undefined;
                }) | undefined): Promise<[AsResponse] extends [true] ? Response : [ReturnHeaders] extends [true] ? {
                    headers: Headers;
                    response: {
                        token: string;
                        user: {
                            id: string;
                            email: string;
                            emailVerified: boolean;
                            name: string;
                            createdAt: Date;
                            updatedAt: Date;
                        };
                    } | null;
                } : {
                    token: string;
                    user: {
                        id: string;
                        email: string;
                        emailVerified: boolean;
                        name: string;
                        createdAt: Date;
                        updatedAt: Date;
                    };
                } | null>;
                options: {
                    method: "POST";
                    metadata: {
                        openapi: {
                            description: string;
                            responses: {
                                200: {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    user: {
                                                        $ref: string;
                                                    };
                                                    session: {
                                                        $ref: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                } & {
                    use: any[];
                };
                path: "/sign-in/anonymous";
            };
        };
        hooks: {
            after: {
                matcher(ctx: import("better-auth").EndpointContext<string, any> & Omit<import("better-auth").InputContext<string, any>, "method"> & {
                    context: import("better-auth").AuthContext & {
                        returned?: unknown;
                        responseHeaders?: Headers;
                    };
                    headers?: Headers;
                }): boolean;
                handler: (inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<void>;
            }[];
        };
        schema: {
            user: {
                fields: {
                    isAnonymous: {
                        type: "boolean";
                        required: false;
                    };
                };
            };
        };
        $ERROR_CODES: {
            readonly FAILED_TO_CREATE_USER: "Failed to create user";
            readonly COULD_NOT_CREATE_SESSION: "Could not create session";
            readonly ANONYMOUS_USERS_CANNOT_SIGN_IN_AGAIN_ANONYMOUSLY: "Anonymous users cannot sign in again anonymously";
        };
    }, {
        id: "phone-number";
        endpoints: {
            signInPhoneNumber: {
                <AsResponse extends boolean = false, ReturnHeaders extends boolean = false>(inputCtx_0: {
                    body: {
                        phoneNumber: string;
                        password: string;
                        rememberMe?: boolean | undefined;
                    };
                } & {
                    method?: "POST" | undefined;
                } & {
                    query?: Record<string, any> | undefined;
                } & {
                    params?: Record<string, any>;
                } & {
                    request?: Request;
                } & {
                    headers?: HeadersInit;
                } & {
                    asResponse?: boolean;
                    returnHeaders?: boolean;
                    use?: import("better-auth").Middleware[];
                    path?: string;
                } & {
                    asResponse?: AsResponse | undefined;
                    returnHeaders?: ReturnHeaders | undefined;
                }): Promise<[AsResponse] extends [true] ? Response : [ReturnHeaders] extends [true] ? {
                    headers: Headers;
                    response: {
                        token: string;
                        user: import("better-auth/plugins").UserWithPhoneNumber;
                    };
                } : {
                    token: string;
                    user: import("better-auth/plugins").UserWithPhoneNumber;
                }>;
                options: {
                    method: "POST";
                    body: import("better-auth").ZodObject<{
                        phoneNumber: import("better-auth").ZodString;
                        password: import("better-auth").ZodString;
                        rememberMe: import("better-auth").ZodOptional<import("better-auth").ZodBoolean>;
                    }, import("better-auth").$strip>;
                    metadata: {
                        openapi: {
                            summary: string;
                            description: string;
                            responses: {
                                200: {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    user: {
                                                        $ref: string;
                                                    };
                                                    session: {
                                                        $ref: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                                400: {
                                    description: string;
                                };
                            };
                        };
                    };
                } & {
                    use: any[];
                };
                path: "/sign-in/phone-number";
            };
            sendPhoneNumberOTP: {
                <AsResponse extends boolean = false, ReturnHeaders extends boolean = false>(inputCtx_0: {
                    body: {
                        phoneNumber: string;
                    };
                } & {
                    method?: "POST" | undefined;
                } & {
                    query?: Record<string, any> | undefined;
                } & {
                    params?: Record<string, any>;
                } & {
                    request?: Request;
                } & {
                    headers?: HeadersInit;
                } & {
                    asResponse?: boolean;
                    returnHeaders?: boolean;
                    use?: import("better-auth").Middleware[];
                    path?: string;
                } & {
                    asResponse?: AsResponse | undefined;
                    returnHeaders?: ReturnHeaders | undefined;
                }): Promise<[AsResponse] extends [true] ? Response : [ReturnHeaders] extends [true] ? {
                    headers: Headers;
                    response: {
                        message: string;
                    };
                } : {
                    message: string;
                }>;
                options: {
                    method: "POST";
                    body: import("better-auth").ZodObject<{
                        phoneNumber: import("better-auth").ZodString;
                    }, import("better-auth").$strip>;
                    metadata: {
                        openapi: {
                            summary: string;
                            description: string;
                            responses: {
                                200: {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    message: {
                                                        type: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                } & {
                    use: any[];
                };
                path: "/phone-number/send-otp";
            };
            verifyPhoneNumber: {
                <AsResponse extends boolean = false, ReturnHeaders extends boolean = false>(inputCtx_0: {
                    body: {
                        phoneNumber: string;
                        code: string;
                        disableSession?: boolean | undefined;
                        updatePhoneNumber?: boolean | undefined;
                    };
                } & {
                    method?: "POST" | undefined;
                } & {
                    query?: Record<string, any> | undefined;
                } & {
                    params?: Record<string, any>;
                } & {
                    request?: Request;
                } & {
                    headers?: HeadersInit;
                } & {
                    asResponse?: boolean;
                    returnHeaders?: boolean;
                    use?: import("better-auth").Middleware[];
                    path?: string;
                } & {
                    asResponse?: AsResponse | undefined;
                    returnHeaders?: ReturnHeaders | undefined;
                }): Promise<[AsResponse] extends [true] ? Response : [ReturnHeaders] extends [true] ? {
                    headers: Headers;
                    response: {
                        status: boolean;
                        token: string;
                        user: import("better-auth/plugins").UserWithPhoneNumber;
                    } | {
                        status: boolean;
                        token: null;
                        user: import("better-auth/plugins").UserWithPhoneNumber;
                    };
                } : {
                    status: boolean;
                    token: string;
                    user: import("better-auth/plugins").UserWithPhoneNumber;
                } | {
                    status: boolean;
                    token: null;
                    user: import("better-auth/plugins").UserWithPhoneNumber;
                }>;
                options: {
                    method: "POST";
                    body: import("better-auth").ZodObject<{
                        phoneNumber: import("better-auth").ZodString;
                        code: import("better-auth").ZodString;
                        disableSession: import("better-auth").ZodOptional<import("better-auth").ZodBoolean>;
                        updatePhoneNumber: import("better-auth").ZodOptional<import("better-auth").ZodBoolean>;
                    }, import("better-auth").$strip>;
                    metadata: {
                        openapi: {
                            summary: string;
                            description: string;
                            responses: {
                                "200": {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    status: {
                                                        type: string;
                                                        description: string;
                                                        enum: boolean[];
                                                    };
                                                    token: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    user: {
                                                        type: string;
                                                        nullable: boolean;
                                                        properties: {
                                                            id: {
                                                                type: string;
                                                                description: string;
                                                            };
                                                            email: {
                                                                type: string;
                                                                format: string;
                                                                nullable: boolean;
                                                                description: string;
                                                            };
                                                            emailVerified: {
                                                                type: string;
                                                                nullable: boolean;
                                                                description: string;
                                                            };
                                                            name: {
                                                                type: string;
                                                                nullable: boolean;
                                                                description: string;
                                                            };
                                                            image: {
                                                                type: string;
                                                                format: string;
                                                                nullable: boolean;
                                                                description: string;
                                                            };
                                                            phoneNumber: {
                                                                type: string;
                                                                description: string;
                                                            };
                                                            phoneNumberVerified: {
                                                                type: string;
                                                                description: string;
                                                            };
                                                            createdAt: {
                                                                type: string;
                                                                format: string;
                                                                description: string;
                                                            };
                                                            updatedAt: {
                                                                type: string;
                                                                format: string;
                                                                description: string;
                                                            };
                                                        };
                                                        required: string[];
                                                        description: string;
                                                    };
                                                };
                                                required: string[];
                                            };
                                        };
                                    };
                                };
                                400: {
                                    description: string;
                                };
                            };
                        };
                    };
                } & {
                    use: any[];
                };
                path: "/phone-number/verify";
            };
            forgetPasswordPhoneNumber: {
                <AsResponse extends boolean = false, ReturnHeaders extends boolean = false>(inputCtx_0: {
                    body: {
                        phoneNumber: string;
                    };
                } & {
                    method?: "POST" | undefined;
                } & {
                    query?: Record<string, any> | undefined;
                } & {
                    params?: Record<string, any>;
                } & {
                    request?: Request;
                } & {
                    headers?: HeadersInit;
                } & {
                    asResponse?: boolean;
                    returnHeaders?: boolean;
                    use?: import("better-auth").Middleware[];
                    path?: string;
                } & {
                    asResponse?: AsResponse | undefined;
                    returnHeaders?: ReturnHeaders | undefined;
                }): Promise<[AsResponse] extends [true] ? Response : [ReturnHeaders] extends [true] ? {
                    headers: Headers;
                    response: {
                        status: boolean;
                    };
                } : {
                    status: boolean;
                }>;
                options: {
                    method: "POST";
                    body: import("better-auth").ZodObject<{
                        phoneNumber: import("better-auth").ZodString;
                    }, import("better-auth").$strip>;
                    metadata: {
                        openapi: {
                            description: string;
                            responses: {
                                "200": {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    status: {
                                                        type: string;
                                                        description: string;
                                                        enum: boolean[];
                                                    };
                                                };
                                                required: string[];
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                } & {
                    use: any[];
                };
                path: "/phone-number/forget-password";
            };
            requestPasswordResetPhoneNumber: {
                <AsResponse extends boolean = false, ReturnHeaders extends boolean = false>(inputCtx_0: {
                    body: {
                        phoneNumber: string;
                    };
                } & {
                    method?: "POST" | undefined;
                } & {
                    query?: Record<string, any> | undefined;
                } & {
                    params?: Record<string, any>;
                } & {
                    request?: Request;
                } & {
                    headers?: HeadersInit;
                } & {
                    asResponse?: boolean;
                    returnHeaders?: boolean;
                    use?: import("better-auth").Middleware[];
                    path?: string;
                } & {
                    asResponse?: AsResponse | undefined;
                    returnHeaders?: ReturnHeaders | undefined;
                }): Promise<[AsResponse] extends [true] ? Response : [ReturnHeaders] extends [true] ? {
                    headers: Headers;
                    response: {
                        status: boolean;
                    };
                } : {
                    status: boolean;
                }>;
                options: {
                    method: "POST";
                    body: import("better-auth").ZodObject<{
                        phoneNumber: import("better-auth").ZodString;
                    }, import("better-auth").$strip>;
                    metadata: {
                        openapi: {
                            description: string;
                            responses: {
                                "200": {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    status: {
                                                        type: string;
                                                        description: string;
                                                        enum: boolean[];
                                                    };
                                                };
                                                required: string[];
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                } & {
                    use: any[];
                };
                path: "/phone-number/request-password-reset";
            };
            resetPasswordPhoneNumber: {
                <AsResponse extends boolean = false, ReturnHeaders extends boolean = false>(inputCtx_0: {
                    body: {
                        otp: string;
                        phoneNumber: string;
                        newPassword: string;
                    };
                } & {
                    method?: "POST" | undefined;
                } & {
                    query?: Record<string, any> | undefined;
                } & {
                    params?: Record<string, any>;
                } & {
                    request?: Request;
                } & {
                    headers?: HeadersInit;
                } & {
                    asResponse?: boolean;
                    returnHeaders?: boolean;
                    use?: import("better-auth").Middleware[];
                    path?: string;
                } & {
                    asResponse?: AsResponse | undefined;
                    returnHeaders?: ReturnHeaders | undefined;
                }): Promise<[AsResponse] extends [true] ? Response : [ReturnHeaders] extends [true] ? {
                    headers: Headers;
                    response: {
                        status: boolean;
                    };
                } : {
                    status: boolean;
                }>;
                options: {
                    method: "POST";
                    body: import("better-auth").ZodObject<{
                        otp: import("better-auth").ZodString;
                        phoneNumber: import("better-auth").ZodString;
                        newPassword: import("better-auth").ZodString;
                    }, import("better-auth").$strip>;
                    metadata: {
                        openapi: {
                            description: string;
                            responses: {
                                "200": {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    status: {
                                                        type: string;
                                                        description: string;
                                                        enum: boolean[];
                                                    };
                                                };
                                                required: string[];
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                } & {
                    use: any[];
                };
                path: "/phone-number/reset-password";
            };
        };
        schema: {
            user: {
                fields: {
                    phoneNumber: {
                        type: "string";
                        required: false;
                        unique: true;
                        sortable: true;
                        returned: true;
                    };
                    phoneNumberVerified: {
                        type: "boolean";
                        required: false;
                        returned: true;
                        input: false;
                    };
                };
            };
        };
        rateLimit: {
            pathMatcher(path: string): boolean;
            window: number;
            max: number;
        }[];
        $ERROR_CODES: {
            readonly INVALID_PHONE_NUMBER: "Invalid phone number";
            readonly PHONE_NUMBER_EXIST: "Phone number already exists";
            readonly INVALID_PHONE_NUMBER_OR_PASSWORD: "Invalid phone number or password";
            readonly UNEXPECTED_ERROR: "Unexpected error";
            readonly OTP_NOT_FOUND: "OTP not found";
            readonly OTP_EXPIRED: "OTP expired";
            readonly INVALID_OTP: "Invalid OTP";
            readonly PHONE_NUMBER_NOT_VERIFIED: "Phone number not verified";
        };
    }];
    user: {
        additionalFields: {
            isAdmin: {
                type: "boolean";
                required: true;
                defaultValue: false;
            };
        };
    };
    database: (options: import("better-auth").BetterAuthOptions) => import("better-auth/adapters/drizzle").DBAdapter<import("better-auth").BetterAuthOptions>;
}>;
export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
//# sourceMappingURL=auth.d.ts.map