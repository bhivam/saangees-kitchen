import {
  pgTable,
  integer,
  text,
  timestamp,
  primaryKey,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { unique } from "drizzle-orm/pg-core";

export const menuItems = pgTable("menu_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  basePrice: integer("base_price").notNull(),
});

export const menuItemsRelations = relations(menuItems, ({ many }) => ({
  modifierGroups: many(menuItemModifierGroups),
}));

export const modifierGroups = pgTable("modifier_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  minSelect: integer("min_select").notNull().default(0),
  maxSelect: integer("max_select"),
});

export const modifierGroupsRelations = relations(
  modifierGroups,
  ({ many }) => ({
    options: many(modifierOptions),
    assigned: many(menuItemModifierGroups),
  }),
);

export const modifierOptions = pgTable(
  "modifier_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("modifier_group_id")
      .notNull()
      .references(() => modifierGroups.id),
    name: text("name").notNull(),
    priceDelta: integer("price_delta").notNull().default(0),
  },
  (t) => [unique().on(t.groupId, t.name)],
);

export const modifierOptionsRelations = relations(
  modifierOptions,
  ({ one, many }) => ({
    group: one(modifierGroups, {
      fields: [modifierOptions.groupId],
      references: [modifierGroups.id],
    }),
    orderChoices: many(orderItemModifiers),
  }),
);

export const menuItemModifierGroups = pgTable(
  "menu_item_modifier_groups",
  {
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id),
    groupId: uuid("modifier_group_id")
      .notNull()
      .references(() => modifierGroups.id),
    sortOrder: integer("sort_order").default(0),
  },
  (t) => ({
    pk: primaryKey(t.menuItemId, t.groupId),
  }),
);

export const menuItemModifierGroupsRelations = relations(
  menuItemModifierGroups,
  ({ one }) => ({
    menuItem: one(menuItems, {
      fields: [menuItemModifierGroups.menuItemId],
      references: [menuItems.id],
    }),
    modifierGroup: one(modifierGroups, {
      fields: [menuItemModifierGroups.groupId],
      references: [modifierGroups.id],
    }),
  }),
);

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  status: text("status").notNull(),
  total: integer("total_amount"),
});

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  menuItemId: uuid("menu_item_id")
    .notNull()
    .references(() => menuItems.id),
  quantity: integer("quantity").notNull().default(1),
  itemPrice: integer("item_price").notNull(),
});

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
  modifiers: many(orderItemModifiers),
}));

export const orderItemModifiers = pgTable("order_item_modifier_options", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderItemId: uuid("order_item_id")
    .notNull()
    .references(() => orderItems.id),
  modifierOptionId: uuid("modifier_option_id")
    .notNull()
    .references(() => modifierOptions.id),
  optionPrice: integer("option_price").notNull(),
});

export const orderItemModifiersRelations = relations(
  orderItemModifiers,
  ({ one }) => ({
    orderItem: one(orderItems, {
      fields: [orderItemModifiers.orderItemId],
      references: [orderItems.id],
    }),
    modifierOption: one(modifierOptions, {
      fields: [orderItemModifiers.modifierOptionId],
      references: [modifierOptions.id],
    }),
  }),
);

