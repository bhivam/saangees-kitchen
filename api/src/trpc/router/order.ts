import z from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "../index.js";
import { db } from "../../db/db.js";
import {
  orders,
  orderItems,
  orderItemModifiers,
  menuEntries,
  modifierOptions,
} from "../../db/schema.js";
import { inArray, eq, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Helper to normalize date values (can be string or Date) to YYYY-MM-DD format
// Uses local timezone to prevent off-by-one day errors in EST/other timezones
function normalizeDate(date: string | Date | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === "string") return date;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const ordersRouter = createTRPCRouter({
  createOrder: protectedProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            menuEntryId: z.uuid(),
            quantity: z.number().int().positive(),
            modifierOptionIds: z.array(z.uuid()),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.items.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Order must have at least one item",
        });
      }

      // Fetch menu entries with their menu items to get base prices
      const menuEntryIds = input.items.map((i) => i.menuEntryId);
      const entriesWithItems = await db.query.menuEntries.findMany({
        where: inArray(menuEntries.id, menuEntryIds),
        with: { menuItem: true },
      });

      const entryMap = new Map(entriesWithItems.map((e) => [e.id, e]));

      // Fetch all modifier options for price lookup
      const allModifierOptionIds = input.items.flatMap(
        (i) => i.modifierOptionIds,
      );
      const modifierOptionsData =
        allModifierOptionIds.length > 0
          ? await db
              .select()
              .from(modifierOptions)
              .where(inArray(modifierOptions.id, allModifierOptionIds))
          : [];
      const optionMap = new Map(modifierOptionsData.map((o) => [o.id, o]));

      // Calculate total and validate
      let total = 0;
      for (const item of input.items) {
        const entry = entryMap.get(item.menuEntryId);
        if (!entry) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Menu entry ${item.menuEntryId} not found`,
          });
        }

        let itemTotal = entry.menuItem.basePrice;
        for (const optId of item.modifierOptionIds) {
          const opt = optionMap.get(optId);
          if (!opt) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Modifier option ${optId} not found`,
            });
          }
          itemTotal += opt.priceDelta;
        }
        total += itemTotal * item.quantity;
      }

      // Create order within transaction
      return await db.transaction(async (tx) => {
        const [order] = await tx
          .insert(orders)
          .values({
            userId: ctx.user.id,
            status: "pending",
            total,
          })
          .returning();

        if (!order) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create order",
          });
        }

        // Create order items
        for (const item of input.items) {
          const entry = entryMap.get(item.menuEntryId)!;
          const [orderItem] = await tx
            .insert(orderItems)
            .values({
              orderId: order.id,
              menuEntryId: item.menuEntryId,
              quantity: item.quantity,
              itemPrice: entry.menuItem.basePrice,
            })
            .returning();

          if (!orderItem) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create order item",
            });
          }

          // Create order item modifiers
          if (item.modifierOptionIds.length > 0) {
            await tx.insert(orderItemModifiers).values(
              item.modifierOptionIds.map((optId) => ({
                orderItemId: orderItem.id,
                modifierOptionId: optId,
                optionPrice: optionMap.get(optId)!.priceDelta,
              })),
            );
          }
        }

        return { orderId: order.id, total };
      });
    }),

  getOrders: adminProcedure.query(async () => {
    return await db.query.orders.findMany({
      with: {
        user: true,
        items: {
          with: {
            menuEntry: {
              with: { menuItem: true },
            },
            modifiers: {
              with: { modifierOption: true },
            },
          },
        },
      },
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
    });
  }),

  // Customer-facing procedure to get their own orders grouped by week
  // Orders can only span one week, so we classify each order entirely as
  // "this week" or "past" based on any of its item dates
  getMyOrders: protectedProcedure.query(async ({ ctx }) => {
    // Calculate week boundaries: most recent Sunday through Saturday
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek);
    sunday.setHours(0, 0, 0, 0);
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);

    const sundayStr = normalizeDate(sunday)!;
    const saturdayStr = normalizeDate(saturday)!;

    // Fetch all orders for current user with items and menu entries
    const userOrders = await db.query.orders.findMany({
      where: eq(orders.userId, ctx.user.id),
      with: {
        items: {
          with: {
            menuEntry: {
              with: { menuItem: true },
            },
            modifiers: {
              with: { modifierOption: true },
            },
          },
        },
      },
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
    });

    // Format day labels helper
    const formatDayLabel = (dateStr: string) => {
      const parts = dateStr.split("-").map(Number);
      const year = parts[0] ?? 0;
      const month = parts[1] ?? 1;
      const day = parts[2] ?? 1;
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    };

    // Classify orders and group this week's items by date
    const thisWeekOrders: typeof userOrders = [];
    const pastWeeksOrders: typeof userOrders = [];

    for (const order of userOrders) {
      // Use the first item's date to classify the order (all items are in same week)
      const firstItemDate = order.items[0]
        ? normalizeDate(order.items[0].menuEntry.date)
        : null;

      if (!firstItemDate) continue;

      if (firstItemDate >= sundayStr && firstItemDate <= saturdayStr) {
        thisWeekOrders.push(order);
      } else if (firstItemDate < sundayStr) {
        pastWeeksOrders.push(order);
      }
    }

    // Calculate totals for each period
    const thisWeekTotal = thisWeekOrders.reduce(
      (sum, order) => sum + (order.total || 0),
      0,
    );
    const thisWeekTotalPaid = thisWeekOrders.reduce(
      (sum, order) => sum + order.centsPaid,
      0,
    );
    const thisWeekTotalOwed = thisWeekTotal - thisWeekTotalPaid;

    const pastWeeksTotalOwed = pastWeeksOrders.reduce(
      (sum, order) => sum + (order.total || 0) - order.centsPaid,
      0,
    );

    // Group this week's items by date, then aggregate by SKU
    // SKU = menuEntryId + menuItemId + sorted modifier option IDs
    const itemsByDate = new Map<
      string,
      Map<
        string,
        {
          menuItemName: string;
          quantity: number;
          unitPrice: number; // itemPrice + modifiers (per unit)
          modifiers: Array<{ name: string; optionPrice: number }>;
        }
      >
    >();

    for (const order of thisWeekOrders) {
      for (const item of order.items) {
        const itemDate = normalizeDate(item.menuEntry.date);
        if (!itemDate) continue;

        // Build SKU key: menuEntryId:menuItemId|sorted modifier option IDs
        const sortedModifierIds = item.modifiers
          .map((m) => m.modifierOptionId)
          .sort()
          .join(",");
        const skuKey = `${item.menuEntryId}:${item.menuEntry.menuItemId}|${sortedModifierIds}`;

        const modifierTotal = item.modifiers.reduce(
          (sum, m) => sum + m.optionPrice,
          0,
        );
        const unitPrice = item.itemPrice + modifierTotal;

        let dateItems = itemsByDate.get(itemDate);
        if (!dateItems) {
          dateItems = new Map();
          itemsByDate.set(itemDate, dateItems);
        }

        const existingItem = dateItems.get(skuKey);
        if (existingItem) {
          // Aggregate: add quantity
          existingItem.quantity += item.quantity;
        } else {
          dateItems.set(skuKey, {
            menuItemName: item.menuEntry.menuItem.name,
            quantity: item.quantity,
            unitPrice,
            modifiers: item.modifiers.map((m) => ({
              name: m.modifierOption.name,
              optionPrice: m.optionPrice,
            })),
          });
        }
      }
    }

    // Build ordersByDate array, sorted by date
    const ordersByDate = Array.from(itemsByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, skuMap]) => ({
        date,
        dayLabel: formatDayLabel(date),
        items: Array.from(skuMap.values()).map((item) => ({
          menuItemName: item.menuItemName,
          quantity: item.quantity,
          modifiers: item.modifiers,
          lineTotal: item.unitPrice * item.quantity,
        })),
      }));

    return {
      thisWeek: {
        startDate: sundayStr,
        endDate: saturdayStr,
        total: thisWeekTotal,
        totalPaid: thisWeekTotalPaid,
        totalOwed: thisWeekTotalOwed,
        ordersByDate,
      },
      pastWeeks: {
        totalOwed: pastWeeksTotalOwed,
        orderCount: pastWeeksOrders.length,
      },
      grandTotalOwed: thisWeekTotalOwed + pastWeeksTotalOwed,
    };
  }),

  getDatesWithOrders: adminProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const result = await db
        .selectDistinct({ date: menuEntries.date })
        .from(orderItems)
        .innerJoin(menuEntries, eq(orderItems.menuEntryId, menuEntries.id))
        .where(
          and(
            sql`${menuEntries.date} >= ${input.startDate}`,
            sql`${menuEntries.date} <= ${input.endDate}`,
          ),
        );

      return result
        .map((r) => normalizeDate(r.date))
        .filter((d): d is string => d !== null)
        .sort();
    }),

  getCookingView: adminProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      // Get all order items for this date with their modifiers
      const items = await db.query.orderItems.findMany({
        with: {
          menuEntry: {
            with: { menuItem: true },
          },
          modifiers: {
            with: { modifierOption: true },
          },
        },
      });

      // Filter to items for this date
      const dateItems = items.filter(
        (item) => normalizeDate(item.menuEntry.date) === input.date,
      );

      // Group by menuItem + modifier combination
      const aggregated = new Map<
        string,
        {
          menuItemId: string;
          menuItemName: string;
          modifierKey: string;
          modifierDisplay: string;
          totalQuantity: number;
        }
      >();

      for (const item of dateItems) {
        // Sort modifier option IDs to create consistent key
        const modifierIds = item.modifiers
          .map((m) => m.modifierOptionId)
          .sort()
          .join(",");

        const modifierDisplay =
          item.modifiers.length > 0
            ? item.modifiers.map((m) => m.modifierOption.name).join(", ")
            : "(no modifiers)";

        const key = `${item.menuEntry.menuItemId}:${modifierIds}`;

        const existing = aggregated.get(key);
        if (existing) {
          existing.totalQuantity += item.quantity;
        } else {
          aggregated.set(key, {
            menuItemId: item.menuEntry.menuItemId,
            menuItemName: item.menuEntry.menuItem.name,
            modifierKey: modifierIds,
            modifierDisplay,
            totalQuantity: item.quantity,
          });
        }
      }

      // Group by menu item for display
      const byMenuItem = new Map<
        string,
        {
          menuItemId: string;
          menuItemName: string;
          variants: Array<{ modifierDisplay: string; totalQuantity: number }>;
        }
      >();

      for (const item of aggregated.values()) {
        const existing = byMenuItem.get(item.menuItemId);
        if (existing) {
          existing.variants.push({
            modifierDisplay: item.modifierDisplay,
            totalQuantity: item.totalQuantity,
          });
        } else {
          byMenuItem.set(item.menuItemId, {
            menuItemId: item.menuItemId,
            menuItemName: item.menuItemName,
            variants: [
              {
                modifierDisplay: item.modifierDisplay,
                totalQuantity: item.totalQuantity,
              },
            ],
          });
        }
      }

      return Array.from(byMenuItem.values());
    }),

  getBaggingView: adminProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      // Get all order items for this date
      const items = await db.query.orderItems.findMany({
        with: {
          order: {
            with: { user: true },
          },
          menuEntry: {
            with: { menuItem: true },
          },
          modifiers: {
            with: { modifierOption: true },
          },
        },
      });

      // Filter to items for this date
      const dateItems = items.filter(
        (item) => normalizeDate(item.menuEntry.date) === input.date,
      );

      // Group by user, then aggregate by SKU (itemId + sorted modifiers)
      const byUser = new Map<
        string,
        {
          userId: string;
          userName: string;
          userPhone: string | null;
          // Map from SKU key to aggregated item data
          itemsBySku: Map<
            string,
            {
              menuItemName: string;
              modifiers: string;
              quantity: number;
              allBagged: boolean;
              orderItemIds: string[];
            }
          >;
        }
      >();

      for (const item of dateItems) {
        const userId = item.order.userId;

        // Create SKU key: itemId + sorted modifier option IDs
        const modifierIds = item.modifiers
          .map((m) => m.modifierOptionId)
          .sort()
          .join(",");
        const skuKey = `${item.menuEntry.menuItemId}:${modifierIds}`;

        const modifiersDisplay =
          item.modifiers.length > 0
            ? item.modifiers.map((m) => m.modifierOption.name).join(", ")
            : "";

        let userData = byUser.get(userId);
        if (!userData) {
          userData = {
            userId,
            userName: item.order.user.name,
            userPhone: item.order.user.phoneNumber,
            itemsBySku: new Map(),
          };
          byUser.set(userId, userData);
        }

        const existingSku = userData.itemsBySku.get(skuKey);
        if (existingSku) {
          existingSku.quantity += item.quantity;
          existingSku.allBagged =
            existingSku.allBagged && item.baggedAt !== null;
          existingSku.orderItemIds.push(item.id);
        } else {
          userData.itemsBySku.set(skuKey, {
            menuItemName: item.menuEntry.menuItem.name,
            modifiers: modifiersDisplay,
            quantity: item.quantity,
            allBagged: item.baggedAt !== null,
            orderItemIds: [item.id],
          });
        }
      }

      // Check for duplicate names and create display names
      const users = Array.from(byUser.values());
      const nameCounts = new Map<string, number>();
      for (const u of users) {
        nameCounts.set(u.userName, (nameCounts.get(u.userName) || 0) + 1);
      }

      return users.map((u) => {
        const isDuplicate = (nameCounts.get(u.userName) || 0) > 1;
        const displayName =
          isDuplicate && u.userPhone
            ? `${u.userName} (${u.userPhone.slice(-4)})`
            : u.userName;

        const items = Array.from(u.itemsBySku.values()).map((sku) => ({
          menuItemName: sku.menuItemName,
          modifiers: sku.modifiers,
          quantity: sku.quantity,
          allBagged: sku.allBagged,
        }));

        return {
          userId: u.userId,
          displayName,
          items,
          allBagged: items.every((i) => i.allBagged),
        };
      });
    }),

  markPersonBagged: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        date: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Find all order item IDs for this user on this date
      const items = await db.query.orderItems.findMany({
        with: {
          order: true,
          menuEntry: true,
        },
      });

      const itemIds = items
        .filter(
          (item) =>
            item.order.userId === input.userId &&
            normalizeDate(item.menuEntry.date) === input.date &&
            item.baggedAt === null,
        )
        .map((item) => item.id);

      if (itemIds.length === 0) {
        return { success: true, itemsUpdated: 0 };
      }

      await db
        .update(orderItems)
        .set({ baggedAt: new Date() })
        .where(inArray(orderItems.id, itemIds));

      return { success: true, itemsUpdated: itemIds.length };
    }),

  unmarkPersonBagged: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        date: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Find all order item IDs for this user on this date
      const items = await db.query.orderItems.findMany({
        with: {
          order: true,
          menuEntry: true,
        },
      });

      const itemIds = items
        .filter(
          (item) =>
            item.order.userId === input.userId &&
            normalizeDate(item.menuEntry.date) === input.date &&
            item.baggedAt !== null,
        )
        .map((item) => item.id);

      if (itemIds.length === 0) {
        return { success: true, itemsUpdated: 0 };
      }

      await db
        .update(orderItems)
        .set({ baggedAt: null })
        .where(inArray(orderItems.id, itemIds));

      return { success: true, itemsUpdated: itemIds.length };
    }),

  getPaymentView: adminProcedure.query(async () => {
    const allOrders = await db.query.orders.findMany({
      with: {
        user: true,
      },
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
    });

    // Check for duplicate names
    const nameCounts = new Map<string, number>();
    for (const order of allOrders) {
      nameCounts.set(
        order.user.name,
        (nameCounts.get(order.user.name) || 0) + 1,
      );
    }

    return allOrders.map((order) => {
      const isDuplicate = (nameCounts.get(order.user.name) || 0) > 1;
      const displayName =
        isDuplicate && order.user.phoneNumber
          ? `${order.user.name} (${order.user.phoneNumber.slice(-4)})`
          : order.user.name;

      const total = order.total || 0;
      const centsPaid = order.centsPaid;

      return {
        orderId: order.id,
        userId: order.userId,
        userName: order.user.name,
        userPhone: order.user.phoneNumber,
        displayName,
        total,
        centsPaid,
        amountOwed: total - centsPaid,
        isPaidInFull: centsPaid >= total,
        createdAt: order.createdAt,
      };
    });
  }),

  updatePayment: adminProcedure
    .input(
      z.object({
        orderId: z.uuid(),
        centsPaid: z.number().int().min(0),
      }),
    )
    .mutation(async ({ input }) => {
      // Get the order to validate
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, input.orderId),
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      const total = order.total || 0;
      if (input.centsPaid > total) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Payment amount (${input.centsPaid}) cannot exceed order total (${total})`,
        });
      }

      await db
        .update(orders)
        .set({ centsPaid: input.centsPaid, updatedAt: new Date() })
        .where(eq(orders.id, input.orderId));

      return {
        success: true,
        orderId: input.orderId,
        centsPaid: input.centsPaid,
      };
    }),

  markPaidInFull: adminProcedure
    .input(z.object({ orderId: z.uuid() }))
    .mutation(async ({ input }) => {
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, input.orderId),
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      const total = order.total || 0;

      await db
        .update(orders)
        .set({ centsPaid: total, updatedAt: new Date() })
        .where(eq(orders.id, input.orderId));

      return { success: true, orderId: input.orderId, centsPaid: total };
    }),

  // Manual Order Entry procedures
  createManualOrder: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        items: z.array(
          z.object({
            menuEntryId: z.uuid(),
            quantity: z.number().int().positive(),
            modifierOptionIds: z.array(z.uuid()),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.items.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Order must have at least one item",
        });
      }

      // Fetch menu entries with their menu items to get base prices
      const menuEntryIds = input.items.map((i) => i.menuEntryId);
      const entriesWithItems = await db.query.menuEntries.findMany({
        where: inArray(menuEntries.id, menuEntryIds),
        with: { menuItem: true },
      });

      const entryMap = new Map(entriesWithItems.map((e) => [e.id, e]));

      // Fetch all modifier options for price lookup
      const allModifierOptionIds = input.items.flatMap(
        (i) => i.modifierOptionIds,
      );
      const modifierOptionsData =
        allModifierOptionIds.length > 0
          ? await db
              .select()
              .from(modifierOptions)
              .where(inArray(modifierOptions.id, allModifierOptionIds))
          : [];
      const optionMap = new Map(modifierOptionsData.map((o) => [o.id, o]));

      // Calculate total and validate
      let total = 0;
      for (const item of input.items) {
        const entry = entryMap.get(item.menuEntryId);
        if (!entry) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Menu entry ${item.menuEntryId} not found`,
          });
        }

        let itemTotal = entry.menuItem.basePrice;
        for (const optId of item.modifierOptionIds) {
          const opt = optionMap.get(optId);
          if (!opt) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Modifier option ${optId} not found`,
            });
          }
          itemTotal += opt.priceDelta;
        }
        total += itemTotal * item.quantity;
      }

      // Create order within transaction
      return await db.transaction(async (tx) => {
        const [order] = await tx
          .insert(orders)
          .values({
            userId: input.userId,
            status: "pending",
            total,
            isManual: true,
          })
          .returning();

        if (!order) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create order",
          });
        }

        // Create order items
        for (const item of input.items) {
          const entry = entryMap.get(item.menuEntryId)!;
          const [orderItem] = await tx
            .insert(orderItems)
            .values({
              orderId: order.id,
              menuEntryId: item.menuEntryId,
              quantity: item.quantity,
              itemPrice: entry.menuItem.basePrice,
            })
            .returning();

          if (!orderItem) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create order item",
            });
          }

          // Create order item modifiers
          if (item.modifierOptionIds.length > 0) {
            await tx.insert(orderItemModifiers).values(
              item.modifierOptionIds.map((optId) => ({
                orderItemId: orderItem.id,
                modifierOptionId: optId,
                optionPrice: optionMap.get(optId)!.priceDelta,
              })),
            );
          }
        }

        return { orderId: order.id, total };
      });
    }),

  updateManualOrder: adminProcedure
    .input(
      z.object({
        orderId: z.uuid(),
        items: z.array(
          z.object({
            orderItemId: z.uuid().optional(), // Existing item ID for updates
            menuEntryId: z.uuid(),
            quantity: z.number().int().positive(),
            modifierOptionIds: z.array(z.uuid()),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.items.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Order must have at least one item",
        });
      }

      // Verify the order exists
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.id, input.orderId),
      });

      if (!existingOrder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      // Fetch existing order items with their menu entries for due date validation
      const existingOrderItems = await db.query.orderItems.findMany({
        where: eq(orderItems.orderId, input.orderId),
        with: {
          menuEntry: true,
          modifiers: true,
        },
      });
      const existingItemMap = new Map(existingOrderItems.map((i) => [i.id, i]));

      // Fetch menu entries with their menu items to get base prices
      const menuEntryIds = input.items.map((i) => i.menuEntryId);
      const entriesWithItems = await db.query.menuEntries.findMany({
        where: inArray(menuEntries.id, menuEntryIds),
        with: { menuItem: true },
      });

      const entryMap = new Map(entriesWithItems.map((e) => [e.id, e]));

      // Fetch all modifier options for price lookup
      const allModifierOptionIds = input.items.flatMap(
        (i) => i.modifierOptionIds,
      );
      const modifierOptionsData =
        allModifierOptionIds.length > 0
          ? await db
              .select()
              .from(modifierOptions)
              .where(inArray(modifierOptions.id, allModifierOptionIds))
          : [];
      const optionMap = new Map(modifierOptionsData.map((o) => [o.id, o]));

      // Get today's date for due date validation
      const today = normalizeDate(new Date());

      // Validate items and check for past-due modifications
      let total = 0;
      for (const item of input.items) {
        const entry = entryMap.get(item.menuEntryId);
        if (!entry) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Menu entry ${item.menuEntryId} not found`,
          });
        }

        // Due date validation: check if item is past due and being modified
        const entryDate = normalizeDate(entry.date);
        if (entryDate && today && entryDate < today && item.orderItemId) {
          // This is an existing item for a past date - check if it's being modified
          const existingItem = existingItemMap.get(item.orderItemId);
          if (existingItem) {
            // Compare quantities
            if (existingItem.quantity !== item.quantity) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Cannot modify item "${entry.menuItem.name}" - due date has passed`,
              });
            }
            // Compare modifier options
            const existingModifierIds = existingItem.modifiers
              .map((m) => m.modifierOptionId)
              .sort();
            const newModifierIds = [...item.modifierOptionIds].sort();
            if (
              existingModifierIds.length !== newModifierIds.length ||
              !existingModifierIds.every(
                (id, idx) => id === newModifierIds[idx],
              )
            ) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Cannot modify item "${entry.menuItem.name}" - due date has passed`,
              });
            }
          }
        }

        let itemTotal = entry.menuItem.basePrice;
        for (const optId of item.modifierOptionIds) {
          const opt = optionMap.get(optId);
          if (!opt) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Modifier option ${optId} not found`,
            });
          }
          itemTotal += opt.priceDelta;
        }
        total += itemTotal * item.quantity;
      }

      // Update order within transaction
      return await db.transaction(async (tx) => {
        // Track which existing items are being kept
        const keptItemIds = new Set(
          input.items
            .filter((i) => i.orderItemId)
            .map((i) => i.orderItemId as string),
        );

        // Find items to delete (items not in the new list)
        const itemsToDelete = existingOrderItems.filter(
          (i) => !keptItemIds.has(i.id),
        );

        // Validate that we're not deleting past-due items
        for (const item of itemsToDelete) {
          const entryDate = normalizeDate(item.menuEntry.date);
          if (entryDate && today && entryDate < today) {
            const entry = entryMap.get(item.menuEntryId) ?? {
              menuItem: { name: "Unknown item" },
            };
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Cannot remove item "${entry.menuItem.name}" - due date has passed`,
            });
          }
        }

        // Delete modifiers and items that are no longer in the list
        if (itemsToDelete.length > 0) {
          const deleteIds = itemsToDelete.map((i) => i.id);
          await tx
            .delete(orderItemModifiers)
            .where(inArray(orderItemModifiers.orderItemId, deleteIds));
          await tx.delete(orderItems).where(inArray(orderItems.id, deleteIds));
        }

        // Update order total
        await tx
          .update(orders)
          .set({ total, updatedAt: new Date() })
          .where(eq(orders.id, input.orderId));

        // Process each item: update existing or insert new
        for (const item of input.items) {
          const entry = entryMap.get(item.menuEntryId)!;

          if (item.orderItemId && existingItemMap.has(item.orderItemId)) {
            // Update existing item (preserves baggedAt and other fields)
            await tx
              .update(orderItems)
              .set({
                menuEntryId: item.menuEntryId,
                quantity: item.quantity,
                itemPrice: entry.menuItem.basePrice,
              })
              .where(eq(orderItems.id, item.orderItemId));

            // Delete existing modifiers and recreate
            await tx
              .delete(orderItemModifiers)
              .where(eq(orderItemModifiers.orderItemId, item.orderItemId));

            if (item.modifierOptionIds.length > 0) {
              await tx.insert(orderItemModifiers).values(
                item.modifierOptionIds.map((optId) => ({
                  orderItemId: item.orderItemId!,
                  modifierOptionId: optId,
                  optionPrice: optionMap.get(optId)!.priceDelta,
                })),
              );
            }
          } else {
            // Insert new item
            const [newOrderItem] = await tx
              .insert(orderItems)
              .values({
                orderId: input.orderId,
                menuEntryId: item.menuEntryId,
                quantity: item.quantity,
                itemPrice: entry.menuItem.basePrice,
              })
              .returning();

            if (!newOrderItem) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to create order item",
              });
            }

            // Create order item modifiers
            if (item.modifierOptionIds.length > 0) {
              await tx.insert(orderItemModifiers).values(
                item.modifierOptionIds.map((optId) => ({
                  orderItemId: newOrderItem.id,
                  modifierOptionId: optId,
                  optionPrice: optionMap.get(optId)!.priceDelta,
                })),
              );
            }
          }
        }

        return { orderId: input.orderId, total };
      });
    }),

  deleteOrder: adminProcedure
    .input(z.object({ orderId: z.uuid() }))
    .mutation(async ({ input }) => {
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.id, input.orderId),
      });

      if (!existingOrder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      return await db.transaction(async (tx) => {
        // Delete order item modifiers first
        const existingItems = await tx
          .select({ id: orderItems.id })
          .from(orderItems)
          .where(eq(orderItems.orderId, input.orderId));

        if (existingItems.length > 0) {
          await tx.delete(orderItemModifiers).where(
            inArray(
              orderItemModifiers.orderItemId,
              existingItems.map((i) => i.id),
            ),
          );
        }

        // Delete order items
        await tx
          .delete(orderItems)
          .where(eq(orderItems.orderId, input.orderId));

        // Delete the order
        await tx.delete(orders).where(eq(orders.id, input.orderId));

        return { success: true, orderId: input.orderId };
      });
    }),
});

