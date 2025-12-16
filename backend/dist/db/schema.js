"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountRelations = exports.sessionRelations = exports.userRelations = exports.verification = exports.account = exports.session = exports.user = exports.menusRelations = exports.menus = exports.orderItemModifiersRelations = exports.orderItemModifiers = exports.orderItemsRelations = exports.orderItems = exports.ordersRelations = exports.orders = exports.menuItemModifierGroupsRelations = exports.menuItemModifierGroups = exports.modifierOptionsRelations = exports.modifierOptions = exports.modifierGroupsRelations = exports.modifierGroups = exports.menuItemsRelations = exports.menuItems = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.menuItems = (0, pg_core_1.pgTable)("menu_items", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description").notNull(),
    basePrice: (0, pg_core_1.integer)("base_price").notNull(),
});
exports.menuItemsRelations = (0, drizzle_orm_1.relations)(exports.menuItems, ({ many }) => ({
    modifierGroups: many(exports.menuItemModifierGroups),
}));
exports.modifierGroups = (0, pg_core_1.pgTable)("modifier_groups", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    minSelect: (0, pg_core_1.integer)("min_select").notNull().default(0),
    maxSelect: (0, pg_core_1.integer)("max_select"),
});
exports.modifierGroupsRelations = (0, drizzle_orm_1.relations)(exports.modifierGroups, ({ many }) => ({
    options: many(exports.modifierOptions),
    assigned: many(exports.menuItemModifierGroups),
}));
exports.modifierOptions = (0, pg_core_1.pgTable)("modifier_options", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    groupId: (0, pg_core_1.uuid)("modifier_group_id")
        .notNull()
        .references(() => exports.modifierGroups.id),
    name: (0, pg_core_1.text)("name").notNull(),
    priceDelta: (0, pg_core_1.integer)("price_delta").notNull().default(0),
}, (t) => [(0, pg_core_1.unique)().on(t.groupId, t.name)]);
exports.modifierOptionsRelations = (0, drizzle_orm_1.relations)(exports.modifierOptions, ({ one, many }) => ({
    group: one(exports.modifierGroups, {
        fields: [exports.modifierOptions.groupId],
        references: [exports.modifierGroups.id],
    }),
    orderChoices: many(exports.orderItemModifiers),
}));
exports.menuItemModifierGroups = (0, pg_core_1.pgTable)("menu_item_modifier_groups", {
    menuItemId: (0, pg_core_1.uuid)("menu_item_id")
        .notNull()
        .references(() => exports.menuItems.id),
    groupId: (0, pg_core_1.uuid)("modifier_group_id")
        .notNull()
        .references(() => exports.modifierGroups.id),
    sortOrder: (0, pg_core_1.integer)("sort_order").default(0),
}, (t) => [(0, pg_core_1.primaryKey)({ columns: [t.menuItemId, t.groupId], name: "pk" })]);
exports.menuItemModifierGroupsRelations = (0, drizzle_orm_1.relations)(exports.menuItemModifierGroups, ({ one }) => ({
    menuItem: one(exports.menuItems, {
        fields: [exports.menuItemModifierGroups.menuItemId],
        references: [exports.menuItems.id],
    }),
    modifierGroup: one(exports.modifierGroups, {
        fields: [exports.menuItemModifierGroups.groupId],
        references: [exports.modifierGroups.id],
    }),
}));
exports.orders = (0, pg_core_1.pgTable)("orders", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
    status: (0, pg_core_1.text)("status").notNull(),
    total: (0, pg_core_1.integer)("total_amount"),
});
exports.ordersRelations = (0, drizzle_orm_1.relations)(exports.orders, ({ many }) => ({
    items: many(exports.orderItems),
}));
exports.orderItems = (0, pg_core_1.pgTable)("order_items", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    orderId: (0, pg_core_1.uuid)("order_id")
        .notNull()
        .references(() => exports.orders.id),
    menuItemId: (0, pg_core_1.uuid)("menu_item_id")
        .notNull()
        .references(() => exports.menuItems.id),
    quantity: (0, pg_core_1.integer)("quantity").notNull().default(1),
    itemPrice: (0, pg_core_1.integer)("item_price").notNull(),
});
exports.orderItemsRelations = (0, drizzle_orm_1.relations)(exports.orderItems, ({ one, many }) => ({
    order: one(exports.orders, {
        fields: [exports.orderItems.orderId],
        references: [exports.orders.id],
    }),
    menuItem: one(exports.menuItems, {
        fields: [exports.orderItems.menuItemId],
        references: [exports.menuItems.id],
    }),
    modifiers: many(exports.orderItemModifiers),
}));
exports.orderItemModifiers = (0, pg_core_1.pgTable)("order_item_modifier_options", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    orderItemId: (0, pg_core_1.uuid)("order_item_id")
        .notNull()
        .references(() => exports.orderItems.id),
    modifierOptionId: (0, pg_core_1.uuid)("modifier_option_id")
        .notNull()
        .references(() => exports.modifierOptions.id),
    optionPrice: (0, pg_core_1.integer)("option_price").notNull(),
});
exports.orderItemModifiersRelations = (0, drizzle_orm_1.relations)(exports.orderItemModifiers, ({ one }) => ({
    orderItem: one(exports.orderItems, {
        fields: [exports.orderItemModifiers.orderItemId],
        references: [exports.orderItems.id],
    }),
    modifierOption: one(exports.modifierOptions, {
        fields: [exports.orderItemModifiers.modifierOptionId],
        references: [exports.modifierOptions.id],
    }),
}));
exports.menus = (0, pg_core_1.pgTable)("menus", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    date: (0, pg_core_1.date)("date"),
    menuItemId: (0, pg_core_1.uuid)("menu_item_id")
        .notNull()
        .references(() => exports.menuItems.id),
    sortOrder: (0, pg_core_1.integer)("sort_order"),
});
exports.menusRelations = (0, drizzle_orm_1.relations)(exports.menus, ({ one }) => ({
    menuItem: one(exports.menuItems, {
        fields: [exports.menus.menuItemId],
        references: [exports.menuItems.id],
    }),
}));
// GENERATED DO NOT MODIFY
exports.user = (0, pg_core_1.pgTable)("user", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    emailVerified: (0, pg_core_1.boolean)("email_verified").default(false).notNull(),
    image: (0, pg_core_1.text)("image"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
    phoneNumber: (0, pg_core_1.text)("phone_number").unique(),
    phoneNumberVerified: (0, pg_core_1.boolean)("phone_number_verified"),
    isAdmin: (0, pg_core_1.boolean)("is_admin").default(false).notNull(),
});
exports.session = (0, pg_core_1.pgTable)("session", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    token: (0, pg_core_1.text)("token").notNull().unique(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at")
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
    ipAddress: (0, pg_core_1.text)("ip_address"),
    userAgent: (0, pg_core_1.text)("user_agent"),
    userId: (0, pg_core_1.text)("user_id")
        .notNull()
        .references(() => exports.user.id, { onDelete: "cascade" }),
}, (table) => [(0, pg_core_1.index)("session_userId_idx").on(table.userId)]);
exports.account = (0, pg_core_1.pgTable)("account", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    accountId: (0, pg_core_1.text)("account_id").notNull(),
    providerId: (0, pg_core_1.text)("provider_id").notNull(),
    userId: (0, pg_core_1.text)("user_id")
        .notNull()
        .references(() => exports.user.id, { onDelete: "cascade" }),
    accessToken: (0, pg_core_1.text)("access_token"),
    refreshToken: (0, pg_core_1.text)("refresh_token"),
    idToken: (0, pg_core_1.text)("id_token"),
    accessTokenExpiresAt: (0, pg_core_1.timestamp)("access_token_expires_at"),
    refreshTokenExpiresAt: (0, pg_core_1.timestamp)("refresh_token_expires_at"),
    scope: (0, pg_core_1.text)("scope"),
    password: (0, pg_core_1.text)("password"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at")
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
}, (table) => [(0, pg_core_1.index)("account_userId_idx").on(table.userId)]);
exports.verification = (0, pg_core_1.pgTable)("verification", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    identifier: (0, pg_core_1.text)("identifier").notNull(),
    value: (0, pg_core_1.text)("value").notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
}, (table) => [(0, pg_core_1.index)("verification_identifier_idx").on(table.identifier)]);
exports.userRelations = (0, drizzle_orm_1.relations)(exports.user, ({ many }) => ({
    sessions: many(exports.session),
    accounts: many(exports.account),
}));
exports.sessionRelations = (0, drizzle_orm_1.relations)(exports.session, ({ one }) => ({
    user: one(exports.user, {
        fields: [exports.session.userId],
        references: [exports.user.id],
    }),
}));
exports.accountRelations = (0, drizzle_orm_1.relations)(exports.account, ({ one }) => ({
    user: one(exports.user, {
        fields: [exports.account.userId],
        references: [exports.user.id],
    }),
}));
