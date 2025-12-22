import {
  pgTable,
  integer,
  text,
  timestamp,
  primaryKey,
  uuid,
  unique,
  date,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => [primaryKey({ columns: [t.menuItemId, t.groupId], name: "pk" })],
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
  specialInstructions: text("special_instructions"),
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
  menuEntryId: uuid("menu_entry_id")
    .notNull()
    .references(() => menuItems.id),
  quantity: integer("quantity").notNull().default(1),
  specialInstructions: text("special_instructions"),
  itemPrice: integer("item_price").notNull(),
});

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuEntry: one(menuEntries, {
    fields: [orderItems.menuEntryId],
    references: [menuEntries.id],
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

export const menuEntries = pgTable("menus_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: date("date"),
  menuItemId: uuid("menu_item_id")
    .notNull()
    .references(() => menuItems.id),
  sortOrder: integer("sort_order"),
});

export const menusRelations = relations(menuEntries, ({ one }) => ({
  menuItem: one(menuItems, {
    fields: [menuEntries.menuItemId],
    references: [menuItems.id],
  }),
}));

// GENERATED DO NOT MODIFY

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  isAnonymous: boolean("is_anonymous"),
  phoneNumber: text("phone_number").unique(),
  phoneNumberVerified: boolean("phone_number_verified"),
  isAdmin: boolean("is_admin").default(false).notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

