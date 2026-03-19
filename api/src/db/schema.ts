import {
  pgTable,
  pgEnum,
  integer,
  text,
  timestamp,
  primaryKey,
  uuid,
  unique,
  date,
  boolean,
  index,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const sharedColumns = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date()),
  deletedAt: timestamp("deleted_at"),
};

export const test = pgTable("test", {
  id: uuid("id").defaultRandom().primaryKey(),
  ...sharedColumns,
});

export const menuItems = pgTable("menu_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  basePrice: integer("base_price").notNull(),
  ...sharedColumns,
});

export const menuItemsRelations = relations(menuItems, ({ many }) => ({
  modifierGroups: many(menuItemModifierGroups),
  comboItems: many(comboItems),
}));

export const modifierGroups = pgTable("modifier_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  minSelect: integer("min_select").notNull().default(0),
  maxSelect: integer("max_select"),
  ...sharedColumns,
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
    ...sharedColumns,
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
    ...sharedColumns,
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

export const orderTypeEnum = pgEnum("order_type", ["standard", "delivery"]);

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  status: text("status").notNull(),
  specialInstructions: text("special_instructions"),
  total: integer("total_amount"),
  centsPaid: integer("cents_paid").notNull().default(0),
  isManual: boolean("is_manual").notNull().default(false),
  type: orderTypeEnum("type").notNull().default("standard"),
  date: date("date"),
  ...sharedColumns,
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(user, {
    fields: [orders.userId],
    references: [user.id],
  }),
  items: many(orderItems),
  orderCombos: many(orderCombos),
}));

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  menuEntryId: uuid("menu_entry_id")
    .notNull()
    .references(() => menuEntries.id),
  orderComboId: uuid("order_combo_id").references(() => orderCombos.id),
  quantity: integer("quantity").notNull().default(1),
  specialInstructions: text("special_instructions"),
  itemPrice: integer("item_price").notNull(),
  baggedAt: timestamp("bagged_at"),
  ...sharedColumns,
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
  orderCombo: one(orderCombos, {
    fields: [orderItems.orderComboId],
    references: [orderCombos.id],
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
  ...sharedColumns,
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

// Combos
export const combos = pgTable("combos", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  discountAmount: integer("discount_amount").notNull(),
  ...sharedColumns,
});

export const combosRelations = relations(combos, ({ many }) => ({
  comboItems: many(comboItems),
  comboEntries: many(comboEntries),
}));

export const comboItems = pgTable(
  "combo_items",
  {
    comboId: uuid("combo_id")
      .notNull()
      .references(() => combos.id),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id),
    sortOrder: integer("sort_order").notNull(),
    ...sharedColumns,
  },
  (t) => [
    primaryKey({ columns: [t.comboId, t.menuItemId], name: "combo_items_pk" }),
  ],
);

export const comboItemsRelations = relations(comboItems, ({ one }) => ({
  combo: one(combos, {
    fields: [comboItems.comboId],
    references: [combos.id],
  }),
  menuItem: one(menuItems, {
    fields: [comboItems.menuItemId],
    references: [menuItems.id],
  }),
}));

export const comboEntries = pgTable(
  "combo_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    date: date("date").notNull(),
    comboId: uuid("combo_id")
      .notNull()
      .references(() => combos.id),
    sortOrder: integer("sort_order").notNull(),
    ...sharedColumns,
  },
  (t) => [unique("combo_entry_date_combo").on(t.date, t.comboId)],
);

export const comboEntriesRelations = relations(
  comboEntries,
  ({ one, many }) => ({
    combo: one(combos, {
      fields: [comboEntries.comboId],
      references: [combos.id],
    }),
    orderCombos: many(orderCombos),
  }),
);

export const orderCombos = pgTable("order_combos", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  comboEntryId: uuid("combo_entry_id")
    .notNull()
    .references(() => comboEntries.id),
  discountAmount: integer("discount_amount").notNull(),
  ...sharedColumns,
});

export const orderCombosRelations = relations(orderCombos, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderCombos.orderId],
    references: [orders.id],
  }),
  comboEntry: one(comboEntries, {
    fields: [orderCombos.comboEntryId],
    references: [comboEntries.id],
  }),
  items: many(orderItems),
}));

export const menuEntries = pgTable(
  "menus_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    date: date("date").notNull(),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id),
    sortOrder: integer("sort_order").notNull(),
    // is_custom determines item visibility to customers
    // TODO maybe change this to is_visible
    isCustom: boolean("is_custom").notNull().default(false),
    ...sharedColumns,
  },
  (t) => [unique("menu_entry_date_item").on(t.date, t.menuItemId, t.isCustom)],
);

export const menusRelations = relations(menuEntries, ({ one }) => ({
  menuItem: one(menuItems, {
    fields: [menuEntries.menuItemId],
    references: [menuItems.id],
  }),
}));

export const deliveryDates = pgTable(
  "delivery_dates",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    date: date("date").notNull(),
    addressId: uuid("address_id").references(() => addresses.id),
    ...sharedColumns,
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.date], name: "delivery_dates_pk" }),
  ],
);

export const deliveryDatesRelations = relations(deliveryDates, ({ one }) => ({
  user: one(user, {
    fields: [deliveryDates.userId],
    references: [user.id],
  }),
  address: one(addresses, {
    fields: [deliveryDates.addressId],
    references: [addresses.id],
  }),
}));

export const addresses = pgTable("addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  addressLine1: text("address_line_1").notNull(),
  addressLine2: text("address_line_2"),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  postalCode: varchar("postal_code", { length: 20 }).notNull(),
  country: varchar("country", { length: 2 }).notNull().default("US"),
  label: text("label"),
  ...sharedColumns,
});

export const userAddresses = pgTable(
  "user_addresses",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    addressId: uuid("address_id")
      .notNull()
      .references(() => addresses.id),
    isDefault: boolean("is_default").notNull().default(false),
    addressType: text("address_type").notNull(),
    ...sharedColumns,
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.addressId], name: "user_addresses_pk" }),
  ],
);

export const addressesRelations = relations(addresses, ({ many }) => ({
  userAddresses: many(userAddresses),
}));

export const userAddressesRelations = relations(userAddresses, ({ one }) => ({
  user: one(user, {
    fields: [userAddresses.userId],
    references: [user.id],
  }),
  address: one(addresses, {
    fields: [userAddresses.addressId],
    references: [addresses.id],
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
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  isAnonymous: boolean("is_anonymous"),
  phoneNumber: text("phone_number").unique(),
  phoneNumberVerified: boolean("phone_number_verified"),
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
    impersonatedBy: text("impersonated_by"),
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
  orders: many(orders),
  deliveryDates: many(deliveryDates),
  addresses: many(userAddresses),
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

// END OF GENERATED CODE
// add orders: many(orders), deliveryDates: many(deliveryDates), and addresses: many(userAddresses) to userRelations whenever regenerating

