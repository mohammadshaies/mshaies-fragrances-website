import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, schema, isDatabaseConfigured } from "../db/client.server";
import { getSupabaseAdmin, getSupabaseClient, isSupabaseConfigured, verifyAdminSession } from "../supabase.server";
import { eq } from "drizzle-orm";
import { serverCache } from "../cache.server";

function mapSupabaseCoupon(c: any) {
  return {
    id: c.id,
    code: c.code,
    type: c.type,
    value: Number(c.value),
    minOrder: Number(c.min_order ?? c.minOrder ?? 0),
    maxUses: c.max_uses ?? c.maxUses ?? undefined,
    usedCount: Number(c.used_count ?? c.usedCount ?? 0),
    expiryDate: c.expiry_date ?? c.expiryDate ?? undefined,
    isActive: Boolean(c.is_active ?? c.isActive ?? true),
    description: c.description || "",
  };
}

export const validateCouponServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      code: z.string().min(1),
      subtotal: z.number().nonnegative(),
    })
  )
  .handler(async ({ data }) => {
    const cleanCode = data.code.trim().toUpperCase();

    let coupon: any = null;

    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          const { data: row } = await client.from("coupons").select("*").eq("code", cleanCode).maybeSingle();
          if (row) coupon = mapSupabaseCoupon(row);
        }
      } catch (err) {
        console.warn("[validateCouponServerFn] Supabase check error:", err);
      }
    }

    if (!coupon && isDatabaseConfigured() && db) {
      try {
        const rows = await db.select().from(schema.coupons).where(eq(schema.coupons.code, cleanCode)).limit(1);
        if (rows.length > 0) coupon = rows[0];
      } catch (err) {
        console.warn("[validateCouponServerFn] DB check error:", err);
      }
    }

    if (coupon) {
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
          type: coupon.type,
          value: coupon.value,
          description: coupon.description,
        },
      };
    }

    return {
      valid: false,
      discountAmount: 0,
      freeShipping: false,
      message: "Invalid or unrecognized privilege voucher code.",
    };
  });

export const getCouponsServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ authToken: z.string().optional() }))
  .handler(async ({ data }) => {
    const auth = await verifyAdminSession(data.authToken);
    if (!auth.valid) {
      return { success: false, error: auth.error || "Unauthorized admin access." };
    }

    return serverCache.getOrSet(
      "coupons:admin",
      async () => {
        if (isSupabaseConfigured()) {
          try {
            const client = getSupabaseAdmin() || getSupabaseClient();
            if (client) {
              const { data: rows, error } = await client.from("coupons").select("*");
              if (!error && Array.isArray(rows)) {
                return { success: true, coupons: rows.map(mapSupabaseCoupon), source: "supabase" };
              }
            }
          } catch (err) {
            console.warn("[getCouponsServerFn] Supabase read error:", err);
          }
        }

        if (isDatabaseConfigured() && db) {
          try {
            const rows = await db.select().from(schema.coupons);
            return { success: true, coupons: rows, source: "database" };
          } catch (err: any) {
            return { success: false, error: err?.message || "Failed to fetch coupons from database." };
          }
        }
        return { success: true, coupons: [], source: "none" };
      },
      300,
      ["coupons"]
    );
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
        usedCount: z.number().default(0),
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

    const cleanCode = data.coupon.code.trim().toUpperCase();
    const couponId = data.coupon.id || `coupon-${cleanCode.toLowerCase()}`;
    const couponRecord = {
      ...data.coupon,
      id: couponId,
      code: cleanCode,
      updatedAt: new Date(),
    };

    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          await client.from("coupons").upsert({
            id: couponId,
            code: cleanCode,
            type: couponRecord.type,
            value: couponRecord.value,
            min_order: couponRecord.minOrder,
            max_uses: couponRecord.maxUses || null,
            used_count: couponRecord.usedCount,
            expiry_date: couponRecord.expiryDate || null,
            is_active: couponRecord.isActive,
            description: couponRecord.description,
          });

          await client.from("audit_logs").insert({
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: data.coupon.id ? "Coupon Updated" : "Coupon Created",
            category: "Discount",
            details: `Voucher code "${cleanCode}" (${couponRecord.type}: ${couponRecord.value}) saved.`,
            user: auth.user?.email || "Admin",
          });
        }
      } catch (err) {
        console.warn("[saveCouponServerFn] Supabase save error:", err);
      }
    }

    if (isDatabaseConfigured() && db) {
      try {
        await db
          .insert(schema.coupons)
          .values(couponRecord as any)
          .onConflictDoUpdate({
            target: schema.coupons.id,
            set: couponRecord as any,
          });
      } catch (err: any) {
        console.warn("[saveCouponServerFn] DB save error:", err);
      }
    }

    serverCache.invalidateTags("coupons");
    return { success: true, coupon: couponRecord };
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

    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          await client.from("coupons").delete().eq("id", data.id);
          await client.from("audit_logs").insert({
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: "Coupon Deleted",
            category: "Discount",
            details: `Voucher ID "${data.id}" was deleted.`,
            user: auth.user?.email || "Admin",
          });
        }
      } catch (err) {
        console.warn("[deleteCouponServerFn] Supabase delete error:", err);
      }
    }

    if (isDatabaseConfigured() && db) {
      try {
        await db.delete(schema.coupons).where(eq(schema.coupons.id, data.id));
      } catch (err: any) {
        console.warn("[deleteCouponServerFn] DB delete error:", err);
      }
    }

    serverCache.invalidateTags("coupons");
    return { success: true };
  });
