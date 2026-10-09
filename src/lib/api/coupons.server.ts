import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, schema, isDatabaseConfigured } from "../db/client.server";
import { verifyAdminSession } from "../supabase.server";
import { eq } from "drizzle-orm";

export const validateCouponServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      code: z.string().min(1),
      subtotal: z.number().nonnegative(),
    })
  )
  .handler(async ({ data }) => {
    const cleanCode = data.code.trim().toUpperCase();

    if (isDatabaseConfigured() && db) {
      try {
        const rows = await db.select().from(schema.coupons).where(eq(schema.coupons.code, cleanCode)).limit(1);
        if (rows.length > 0) {
          const coupon = rows[0];

          if (!coupon.isActive) {
            return { valid: false, discountAmount: 0, freeShipping: false, message: "This voucher code is currently inactive." };
          }

          if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
            return { valid: false, discountAmount: 0, freeShipping: false, message: "This privilege code has expired." };
          }

          if (data.subtotal < coupon.minOrder) {
            return {
              valid: false,
              discountAmount: 0,
              freeShipping: false,
              message: `Minimum order of ₨ ${coupon.minOrder.toLocaleString()} required for this voucher.`,
            };
          }

          if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
            return { valid: false, discountAmount: 0, freeShipping: false, message: "This voucher has reached its redemption limit." };
          }

          let discountAmount = 0;
          let freeShipping = false;

          if (coupon.type === "percent") {
            discountAmount = Math.round((data.subtotal * coupon.value) / 100);
          } else if (coupon.type === "flat") {
            discountAmount = Math.min(coupon.value, data.subtotal);
          } else if (coupon.type === "shipping") {
            freeShipping = true;
          }

          return {
            valid: true,
            discountAmount,
            freeShipping,
            message: `Privilege voucher "${coupon.code}" applied successfully!`,
            coupon: {
              code: coupon.code,
              description: coupon.description || "",
              type: coupon.type,
              value: coupon.value,
            },
          };
        }
      } catch (err) {
        console.warn("[validateCouponServerFn] Database query failed:", err);
      }
    }

    // Default Fallback
    if (cleanCode === "LUXE15") {
      const discount = Math.round((data.subtotal * 15) / 100);
      return {
        valid: true,
        discountAmount: discount,
        freeShipping: false,
        message: "Grand Launch Offer: 15% OFF applied!",
        coupon: {
          code: "LUXE15",
          description: "15% OFF on all Pure Attars",
          type: "percent",
          value: 15,
        },
      };
    }

    if (cleanCode === "MAISON1000") {
      if (data.subtotal < 8000) {
        return { valid: false, discountAmount: 0, freeShipping: false, message: "Minimum cart order of ₨ 8,000 required for MAISON1000." };
      }
      return {
        valid: true,
        discountAmount: 1000,
        freeShipping: false,
        message: "Flat ₨ 1,000 VIP discount applied!",
        coupon: {
          code: "MAISON1000",
          description: "Flat ₨ 1,000 OFF on orders above ₨ 8,000",
          type: "flat",
          value: 1000,
        },
      };
    }

    return { valid: false, discountAmount: 0, freeShipping: false, message: "Invalid or unrecognized privilege voucher code." };
  });

export const getCouponsServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ authToken: z.string().optional() }))
  .handler(async ({ data }) => {
    const auth = await verifyAdminSession(data.authToken);
    if (!auth.valid) {
      return { success: false, error: auth.error || "Unauthorized admin access." };
    }

    if (isDatabaseConfigured() && db) {
      try {
        const rows = await db.select().from(schema.coupons);
        return { success: true, coupons: rows };
      } catch (err: any) {
        return { success: false, error: err?.message || "Failed to fetch coupons from database." };
      }
    }
    return { success: true, coupons: [] };
  });

export const saveCouponServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      authToken: z.string().optional(),
      coupon: z.object({
        id: z.string().optional(),
        code: z.string().min(2),
        type: z.enum(["percent", "flat", "shipping"]),
        value: z.number().positive(),
        minOrder: z.number().default(0),
        maxUses: z.number().optional(),
        expiryDate: z.string().optional(),
        isActive: z.boolean().default(true),
        description: z.string().default(""),
      }),
    })
  )
  .handler(async ({ data }) => {
    const auth = await verifyAdminSession(data.authToken);
    if (!auth.valid) {
      return { success: false, error: auth.error || "Unauthorized admin action." };
    }

    const couponId = data.coupon.id || `cpn-${Date.now()}`;
    const record = {
      ...data.coupon,
      id: couponId,
      code: data.coupon.code.trim().toUpperCase(),
    };

    if (isDatabaseConfigured() && db) {
      try {
        await db
          .insert(schema.coupons)
          .values(record as any)
          .onConflictDoUpdate({
            target: schema.coupons.id,
            set: record as any,
          });

        await db.insert(schema.auditLogs).values({
          id: `log-${Date.now()}`,
          timestamp: new Date(),
          action: "Coupon Saved",
          category: "Discount",
          details: `Voucher code "${record.code}" (${record.type === "percent" ? `${record.value}%` : `₨ ${record.value}`}) saved.`,
          user: auth.user?.email || "Admin",
        });

        return { success: true, coupon: record };
      } catch (err: any) {
        return { success: false, error: err?.message || "Failed to save coupon." };
      }
    }

    return { success: true, coupon: record };
  });

export const deleteCouponServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      authToken: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const auth = await verifyAdminSession(data.authToken);
    if (!auth.valid) {
      return { success: false, error: auth.error || "Unauthorized admin action." };
    }

    if (isDatabaseConfigured() && db) {
      try {
        await db.delete(schema.coupons).where(eq(schema.coupons.id, data.id));
        await db.insert(schema.auditLogs).values({
          id: `log-${Date.now()}`,
          timestamp: new Date(),
          action: "Coupon Deleted",
          category: "Discount",
          details: `Coupon ID "${data.id}" was deleted.`,
          user: auth.user?.email || "Admin",
        });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || "Failed to delete coupon." };
      }
    }

    return { success: true };
  });

