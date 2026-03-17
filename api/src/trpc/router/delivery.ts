import z from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../index.js";
import { db } from "../../db/db.js";
import {
  deliveryDates,
  addresses,
  userAddresses,
  orders,
} from "../../db/schema.js";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { isDeliveryModifiable } from "../../lib/order-cutoffs.js";

export const DELIVERY_FEE_CENTS = 400;

function normalizeDate(date: string | Date | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === "string") return date;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const deliveryRouter = createTRPCRouter({
  getDeliveryDatesForUser: protectedProcedure
    .input(z.object({ dates: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      if (input.dates.length === 0) return [];

      const rows = await db
        .select({ date: deliveryDates.date, addressId: deliveryDates.addressId })
        .from(deliveryDates)
        .where(
          and(
            eq(deliveryDates.userId, ctx.user.id),
            inArray(deliveryDates.date, input.dates),
            isNull(deliveryDates.deletedAt),
          ),
        );

      return rows
        .map((r) => ({
          date: normalizeDate(r.date),
          addressId: r.addressId,
        }))
        .filter((d): d is { date: string; addressId: string | null } => d.date !== null);
    }),

  setDeliveryForDates: protectedProcedure
    .input(
      z.object({
        enable: z.array(z.string()),
        disable: z.array(z.string()),
        addressId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Enforce cutoff for all dates being modified
      for (const dateStr of input.enable) {
        if (!isDeliveryModifiable(dateStr)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Delivery can no longer be modified for ${dateStr}`,
          });
        }
      }
      for (const dateStr of input.disable) {
        if (!isDeliveryModifiable(dateStr)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Delivery can no longer be modified for ${dateStr}`,
          });
        }
      }

      // Validate the address belongs to the user
      const addrLink = await db
        .select({ addressId: userAddresses.addressId })
        .from(userAddresses)
        .where(
          and(
            eq(userAddresses.userId, ctx.user.id),
            eq(userAddresses.addressId, input.addressId),
            isNull(userAddresses.deletedAt),
          ),
        )
        .limit(1);

      if (addrLink.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Address not found or does not belong to user",
        });
      }

      // Upsert enabled dates (insert or clear deletedAt), writing addressId
      for (const dateStr of input.enable) {
        const existing = await db
          .select()
          .from(deliveryDates)
          .where(
            and(
              eq(deliveryDates.userId, ctx.user.id),
              eq(deliveryDates.date, dateStr),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(deliveryDates)
            .set({ deletedAt: null, updatedAt: new Date(), addressId: input.addressId })
            .where(
              and(
                eq(deliveryDates.userId, ctx.user.id),
                eq(deliveryDates.date, dateStr),
              ),
            );
        } else {
          await db.insert(deliveryDates).values({
            userId: ctx.user.id,
            date: dateStr,
            addressId: input.addressId,
          });
        }

        // Create delivery order if one doesn't already exist
        const existingDeliveryOrder = await db
          .select({ id: orders.id })
          .from(orders)
          .where(
            and(
              eq(orders.userId, ctx.user.id),
              eq(orders.type, "delivery"),
              eq(orders.date, dateStr),
              isNull(orders.deletedAt),
            ),
          )
          .limit(1);

        if (existingDeliveryOrder.length === 0) {
          await db.insert(orders).values({
            userId: ctx.user.id,
            type: "delivery",
            date: dateStr,
            status: "pending",
            total: DELIVERY_FEE_CENTS,
          });
        }
      }

      // Soft-delete disabled dates
      for (const dateStr of input.disable) {
        await db
          .update(deliveryDates)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(deliveryDates.userId, ctx.user.id),
              eq(deliveryDates.date, dateStr),
            ),
          );

        // Soft-delete corresponding delivery order
        await db
          .update(orders)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(orders.userId, ctx.user.id),
              eq(orders.type, "delivery"),
              eq(orders.date, dateStr),
              isNull(orders.deletedAt),
            ),
          );
      }

      return { success: true };
    }),

  getUserAddresses: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({
        addressId: addresses.id,
        addressLine1: addresses.addressLine1,
        addressLine2: addresses.addressLine2,
        city: addresses.city,
        state: addresses.state,
        postalCode: addresses.postalCode,
        label: addresses.label,
        isDefault: userAddresses.isDefault,
      })
      .from(userAddresses)
      .innerJoin(addresses, eq(userAddresses.addressId, addresses.id))
      .where(
        and(
          eq(userAddresses.userId, ctx.user.id),
          eq(userAddresses.addressType, "delivery"),
          isNull(userAddresses.deletedAt),
        ),
      )
      .orderBy(userAddresses.isDefault);

    // isDefault descending — put default first
    return rows.sort((a, b) => (a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1));
  }),

  saveUserAddress: protectedProcedure
    .input(
      z.object({
        addressLine1: z.string().min(1),
        addressLine2: z.string().optional(),
        city: z.string().min(1),
        state: z.string().min(1),
        postalCode: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has any existing addresses
      const existingCount = await db
        .select({ addressId: userAddresses.addressId })
        .from(userAddresses)
        .where(
          and(
            eq(userAddresses.userId, ctx.user.id),
            eq(userAddresses.addressType, "delivery"),
            isNull(userAddresses.deletedAt),
          ),
        )
        .limit(1);

      const isFirst = existingCount.length === 0;

      // Create new address
      const [newAddress] = await db
        .insert(addresses)
        .values({
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2 ?? null,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
        })
        .returning();

      if (!newAddress) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create address",
        });
      }

      // Link to user — isDefault only if first address
      await db.insert(userAddresses).values({
        userId: ctx.user.id,
        addressId: newAddress.id,
        addressType: "delivery",
        isDefault: isFirst,
      });

      return {
        addressId: newAddress.id,
        addressLine1: newAddress.addressLine1,
        addressLine2: newAddress.addressLine2,
        city: newAddress.city,
        state: newAddress.state,
        postalCode: newAddress.postalCode,
        label: newAddress.label,
        isDefault: isFirst,
      };
    }),

  deleteUserAddress: protectedProcedure
    .input(z.object({ addressId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(userAddresses)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(userAddresses.userId, ctx.user.id),
            eq(userAddresses.addressId, input.addressId),
            isNull(userAddresses.deletedAt),
          ),
        );

      return { success: true };
    }),

  adminGetUserAddresses: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const rows = await db
        .select({
          addressId: addresses.id,
          addressLine1: addresses.addressLine1,
          addressLine2: addresses.addressLine2,
          city: addresses.city,
          state: addresses.state,
          postalCode: addresses.postalCode,
          label: addresses.label,
          isDefault: userAddresses.isDefault,
        })
        .from(userAddresses)
        .innerJoin(addresses, eq(userAddresses.addressId, addresses.id))
        .where(
          and(
            eq(userAddresses.userId, input.userId),
            eq(userAddresses.addressType, "delivery"),
            isNull(userAddresses.deletedAt),
          ),
        )
        .orderBy(userAddresses.isDefault);

      return rows.sort((a, b) => (a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1));
    }),

  adminGetDeliveryDatesForUser: adminProcedure
    .input(z.object({ userId: z.string(), dates: z.array(z.string()) }))
    .query(async ({ input }) => {
      if (input.dates.length === 0) return [];

      const rows = await db
        .select({ date: deliveryDates.date, addressId: deliveryDates.addressId })
        .from(deliveryDates)
        .where(
          and(
            eq(deliveryDates.userId, input.userId),
            inArray(deliveryDates.date, input.dates),
            isNull(deliveryDates.deletedAt),
          ),
        );

      return rows
        .map((r) => ({
          date: normalizeDate(r.date),
          addressId: r.addressId,
        }))
        .filter((d): d is { date: string; addressId: string | null } => d.date !== null);
    }),

  adminSetDeliveryForDates: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        enable: z.array(z.string()),
        disable: z.array(z.string()),
        addressId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input }) => {
      // Validate the address belongs to the target user
      const addrLink = await db
        .select({ addressId: userAddresses.addressId })
        .from(userAddresses)
        .where(
          and(
            eq(userAddresses.userId, input.userId),
            eq(userAddresses.addressId, input.addressId),
            isNull(userAddresses.deletedAt),
          ),
        )
        .limit(1);

      if (addrLink.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Address not found or does not belong to user",
        });
      }

      // Upsert enabled dates (no cutoff enforcement for admin)
      for (const dateStr of input.enable) {
        const existing = await db
          .select()
          .from(deliveryDates)
          .where(
            and(
              eq(deliveryDates.userId, input.userId),
              eq(deliveryDates.date, dateStr),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(deliveryDates)
            .set({ deletedAt: null, updatedAt: new Date(), addressId: input.addressId })
            .where(
              and(
                eq(deliveryDates.userId, input.userId),
                eq(deliveryDates.date, dateStr),
              ),
            );
        } else {
          await db.insert(deliveryDates).values({
            userId: input.userId,
            date: dateStr,
            addressId: input.addressId,
          });
        }

        // Create delivery order if one doesn't already exist
        const existingDeliveryOrder = await db
          .select({ id: orders.id })
          .from(orders)
          .where(
            and(
              eq(orders.userId, input.userId),
              eq(orders.type, "delivery"),
              eq(orders.date, dateStr),
              isNull(orders.deletedAt),
            ),
          )
          .limit(1);

        if (existingDeliveryOrder.length === 0) {
          await db.insert(orders).values({
            userId: input.userId,
            type: "delivery",
            date: dateStr,
            status: "pending",
            total: DELIVERY_FEE_CENTS,
          });
        }
      }

      // Soft-delete disabled dates
      for (const dateStr of input.disable) {
        await db
          .update(deliveryDates)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(deliveryDates.userId, input.userId),
              eq(deliveryDates.date, dateStr),
            ),
          );

        await db
          .update(orders)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(orders.userId, input.userId),
              eq(orders.type, "delivery"),
              eq(orders.date, dateStr),
              isNull(orders.deletedAt),
            ),
          );
      }

      return { success: true };
    }),

  adminSaveUserAddress: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        addressLine1: z.string().min(1),
        addressLine2: z.string().optional(),
        city: z.string().min(1),
        state: z.string().min(1),
        postalCode: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const existingCount = await db
        .select({ addressId: userAddresses.addressId })
        .from(userAddresses)
        .where(
          and(
            eq(userAddresses.userId, input.userId),
            eq(userAddresses.addressType, "delivery"),
            isNull(userAddresses.deletedAt),
          ),
        )
        .limit(1);

      const isFirst = existingCount.length === 0;

      const [newAddress] = await db
        .insert(addresses)
        .values({
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2 ?? null,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
        })
        .returning();

      if (!newAddress) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create address",
        });
      }

      await db.insert(userAddresses).values({
        userId: input.userId,
        addressId: newAddress.id,
        addressType: "delivery",
        isDefault: isFirst,
      });

      return {
        addressId: newAddress.id,
        addressLine1: newAddress.addressLine1,
        addressLine2: newAddress.addressLine2,
        city: newAddress.city,
        state: newAddress.state,
        postalCode: newAddress.postalCode,
        label: newAddress.label,
        isDefault: isFirst,
      };
    }),
});
