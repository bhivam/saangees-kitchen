import z from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "..";
import { db } from "../../db/db";
import {
  orders,
  orderItems,
  orderItemModifiers,
  menuEntries,
  modifierOptions,
} from "../../db/schema";
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
            menuEntryId: z.string().uuid(),
            quantity: z.number().int().positive(),
            modifierOptionIds: z.array(z.string().uuid()),
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
          existingSku.allBagged = existingSku.allBagged && item.baggedAt !== null;
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
      nameCounts.set(order.user.name, (nameCounts.get(order.user.name) || 0) + 1);
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
        orderId: z.string().uuid(),
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

      return { success: true, orderId: input.orderId, centsPaid: input.centsPaid };
    }),

  markPaidInFull: adminProcedure
    .input(z.object({ orderId: z.string().uuid() }))
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
            menuEntryId: z.string().uuid(),
            quantity: z.number().int().positive(),
            modifierOptionIds: z.array(z.string().uuid()),
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
        orderId: z.string().uuid(),
        items: z.array(
          z.object({
            menuEntryId: z.string().uuid(),
            quantity: z.number().int().positive(),
            modifierOptionIds: z.array(z.string().uuid()),
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

      // Update order within transaction
      return await db.transaction(async (tx) => {
        // Delete existing order item modifiers
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

        // Delete existing order items
        await tx.delete(orderItems).where(eq(orderItems.orderId, input.orderId));

        // Update order total
        await tx
          .update(orders)
          .set({ total, updatedAt: new Date() })
          .where(eq(orders.id, input.orderId));

        // Create new order items
        for (const item of input.items) {
          const entry = entryMap.get(item.menuEntryId)!;
          const [orderItem] = await tx
            .insert(orderItems)
            .values({
              orderId: input.orderId,
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

        return { orderId: input.orderId, total };
      });
    }),

  deleteOrder: adminProcedure
    .input(z.object({ orderId: z.string().uuid() }))
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
        await tx.delete(orderItems).where(eq(orderItems.orderId, input.orderId));

        // Delete the order
        await tx.delete(orders).where(eq(orders.id, input.orderId));

        return { success: true, orderId: input.orderId };
      });
    }),
});

