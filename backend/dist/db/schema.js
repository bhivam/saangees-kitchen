"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderItemModifiersRelations = exports.orderItemModifiers = exports.orderItemsRelations = exports.orderItems = exports.ordersRelations = exports.orders = exports.menuItemModifierGroupsRelations = exports.menuItemModifierGroups = exports.modifierOptionsRelations = exports.modifierOptions = exports.modifierGroupsRelations = exports.modifierGroups = exports.menuItemsRelations = exports.menuItems = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_2 = require("drizzle-orm/pg-core");
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
}, (t) => [(0, pg_core_2.unique)().on(t.groupId, t.name)]);
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
}, (t) => ({
    pk: (0, pg_core_1.primaryKey)(t.menuItemId, t.groupId),
}));
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
