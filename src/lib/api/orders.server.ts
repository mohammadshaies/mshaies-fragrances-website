import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, schema, isDatabaseConfigured } from "../db/client.server";
import { getSupabaseAdmin, getSupabaseClient, isSupabaseConfigured, verifyAdminSession } from "../supabase.server";
import { eq } from "drizzle-orm";
import { dispatchOrderNotificationEmails } from "./email.server";
import { serverCache } from "../cache.server";
import { sanitizeText, verifyEmailAddress, redactSensitiveData } from "../security/sanitize";

const orderRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkOrderRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = orderRateLimitMap.get(identifier);
  if (!entry || now > entry.resetAt) {
    orderRateLimitMap.set(identifier, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 8) {
    return false;
  }
  entry.count += 1;
  return true;
}

export const placeOrderSchema = z.object({
  orderId: z.string().optional(),
  customerName: z.string().min(1).max(100).trim(),
  email: z.string().max(150).optional(),
  phone: z.string().min(8).max(25).trim(),
  address: z.string().min(3).max(300).trim(),
  city: z.string().min(2).max(100).trim(),
  postalCode: z.string().max(20).optional(),
  shippingMethod: z.enum(["standard", "express", "lahoreLocal"]).default("standard"),
  paymentMethod: z.enum(["cod", "jazzcash", "easypaisa", "nayapay", "card"]).default("cod"),
  transactionId: z.string().max(100).optional(),
  discountCode: z.string().max(50).optional(),
  isGiftWrapped: z.boolean().optional(),
  giftMessage: z.string().max(500).optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1).max(100),
      qty: z.number().int().positive().max(100),
      volume: z.string().max(100),
      name: z.string().max(200).optional(),
      price: z.number().nonnegative().optional(),
      image: z.string().optional(),
    })
  ).min(1).max(50),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export async function processPlaceOrder(rawData: PlaceOrderInput) {
    if (rawData.items.length === 0) {
      return { success: false, error: "Cannot place an order with empty cart." };
    }

    // Validate optional email address when provided
    let verifiedEmail = "";
    if (rawData.email && rawData.email.trim()) {
      const emailCheck = verifyEmailAddress(rawData.email);
      if (!emailCheck.valid) {
        return { success: false, error: emailCheck.error || "Please provide a valid email address." };
      }
      verifiedEmail = emailCheck.normalized;
    }

    // Sanitize all user-supplied text fields against XSS / injection
    const data: PlaceOrderInput = {
      ...rawData,
      customerName: sanitizeText(rawData.customerName, 100),
      email: verifiedEmail || undefined,
      phone: sanitizeText(rawData.phone, 25),
      address: sanitizeText(rawData.address, 300),
      city: sanitizeText(rawData.city, 100),
      postalCode: rawData.postalCode ? sanitizeText(rawData.postalCode, 20) : undefined,
      transactionId: rawData.transactionId ? sanitizeText(rawData.transactionId, 100) : undefined,
      discountCode: rawData.discountCode ? sanitizeText(rawData.discountCode, 50) : undefined,
      giftMessage: rawData.giftMessage ? sanitizeText(rawData.giftMessage, 500) : undefined,
    };

    if (!checkOrderRateLimit(data.phone || verifiedEmail || "anonymous")) {
      return {
        success: false,
        error: "Too many order requests in a short period. Please wait a minute before trying again.",
      };
    }

    // 1. Fetch settings for shipping rates
    let freeShippingThreshold = 5000;
    let standardShippingFee = 400;
    let expressShippingFee = 450;
    let lahoreLocalFee = 150;
    let codFee = 400;
    let freeShippingEnabled = true;

    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          const { data: s } = await client.from("store_settings").select("*").limit(1).maybeSingle();
          if (s) {
            freeShippingThreshold = s.free_shipping_threshold ?? 5000;
            standardShippingFee = s.standard_shipping_fee ?? 250;
            expressShippingFee = s.express_shipping_fee ?? 450;
            lahoreLocalFee = s.lahore_local_fee ?? 150;
            codFee = s.cod_fee ?? 400;
            freeShippingEnabled = s.free_shipping_enabled ?? true;
          }
        }
      } catch (err) {
        console.warn("[placeOrderServerFn] Settings read exception:", err);
      }
    }

    // 2. Verified Items & Subtotal Calculation
    let subtotal = 0;
    const verifiedItems: {
      productId: string;
      dbProductId: string | null;
      name: string;
      price: number;
      qty: number;
      volume: string;
      image: string;
    }[] = [];

    // Query products
    let productsMap = new Map<string, any>();
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          const { data: prods } = await client.from("products").select("*");
          if (prods) {
            for (const p of prods) {
              productsMap.set(p.id, p);
            }
          }
        }
      } catch (err) {
        console.warn("[placeOrderServerFn] Products read error:", err);
      }
    }

    for (const item of data.items) {
      const matchedId = productsMap.has(item.productId)
        ? item.productId
        : (Array.from(productsMap.keys()).find((id) => item.productId.startsWith(id + "-")) || null);
      const dbProd = matchedId ? productsMap.get(matchedId) : undefined;
      let unitPrice = 3500;
      let itemName = "Signature Fragrance";
      let itemImage = "/product-box.jpg";

      if (dbProd) {
        itemName = sanitizeText(dbProd.name || item.name, 200);
        itemImage = dbProd.image || item.image || "/product-box.jpg";
        const dbBasePrice = Number(dbProd.price || 0);
        const dbSamplePrice = Number(dbProd.sample_price || 0);
        if (item.volume.toLowerCase().includes("3ml") && dbSamplePrice > 0) {
          unitPrice = dbSamplePrice;
        } else if (item.price !== undefined && item.price >= dbBasePrice && dbBasePrice > 0) {
          // Allow legitimate higher-volume multiplier price (>= base price), never allow tampered price below dbBasePrice
          unitPrice = item.price;
        } else {
          unitPrice = dbBasePrice > 0 ? dbBasePrice : 3500;
        }
      } else {
        if (item.price !== undefined && item.price >= 0) {
          unitPrice = item.price;
        }
        if (item.name) {
          itemName = item.name;
        }
        if (item.image) {
          itemImage = item.image;
        }
      }

      subtotal += unitPrice * item.qty;
      verifiedItems.push({
        productId: matchedId || item.productId,
        dbProductId: matchedId,
        name: itemName,
        price: unitPrice,
        qty: item.qty,
        volume: item.volume,
        image: itemImage,
      });
    }

    if (data.isGiftWrapped) {
      subtotal += 250;
    }

    // 3. Coupon Validation
    let discountAmount = 0;
    let couponFreeShipping = false;
    let appliedCouponRow: any = null;

    if (data.discountCode && data.discountCode.trim()) {
      const cleanCode = data.discountCode.trim().toUpperCase();
      if (isSupabaseConfigured()) {
        try {
          const client = getSupabaseAdmin() || getSupabaseClient();
          if (client) {
            const { data: c } = await client.from("coupons").select("*").eq("code", cleanCode).maybeSingle();
            if (c) {
              const isNotExpired = !c.expiry_date || new Date(c.expiry_date) >= new Date();
              const minOrderMet = subtotal >= (c.min_order ?? 0);
              const hasUsesLeft = !c.max_uses || (c.used_count ?? 0) < c.max_uses;

              if (c.is_active && isNotExpired && minOrderMet && hasUsesLeft) {
                appliedCouponRow = c;
                if (c.type === "percent") {
                  discountAmount = Math.round((subtotal * c.value) / 100);
                } else if (c.type === "flat") {
                  discountAmount = Math.min(c.value, subtotal);
                } else if (c.type === "shipping") {
                  couponFreeShipping = true;
                }
              }
            }
          }
        } catch (err) {
          console.warn("[placeOrderServerFn] Coupon validation error:", err);
        }
      }
    }

    // 4. Shipping Calculation
    let shippingFee = 0;
    const isFreeByThreshold = freeShippingEnabled && subtotal >= freeShippingThreshold;

    if (!isFreeByThreshold && !couponFreeShipping) {
      if (data.shippingMethod === "lahoreLocal" || data.city.toLowerCase().trim() === "lahore") {
        shippingFee = lahoreLocalFee;
      } else if (data.shippingMethod === "express") {
        shippingFee = expressShippingFee;
      } else {
        shippingFee = standardShippingFee;
      }
    }

    if (data.paymentMethod === "cod" && codFee > 0) {
      shippingFee += codFee;
    }

    const finalTotal = Math.max(0, subtotal - discountAmount + shippingFee);

    // 5. Construct Order Object
    const orderId = data.orderId || `MSH-${Date.now().toString().slice(-5)}`;
    const cleanPhone = data.phone.replace(/[^0-9]/g, "");
    const customerId = `cust-${cleanPhone}`;

    const newOrderRecord = {
      id: orderId,
      customerId,
      customerName: data.customerName,
      email: data.email || null,
      phone: data.phone,
      address: data.address,
      city: data.city,
      postalCode: data.postalCode || null,
      paymentMethod: data.paymentMethod,
      paymentStatus: (data.paymentMethod === "cod" ? "Pending COD" : "Verification Required") as any,
      transactionId: data.transactionId || null,
      subtotal,
      discountCode: data.discountCode || null,
      discountAmount,
      shipping: shippingFee,
      total: finalTotal,
      orderStatus: "Confirmed" as const,
      courierName: data.city.toLowerCase() === "lahore" ? "Rider Hand Delivery" : "TCS Express",
      isGiftWrapped: !!data.isGiftWrapped,
      giftMessage: data.giftMessage || "",
      createdAt: new Date(),
    };

    // 6. Supabase Persistence
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          // Upsert customer
          await client.from("customers").upsert({
            id: customerId,
            name: data.customerName,
            phone: cleanPhone,
            email: data.email || null,
            city: data.city,
            address: data.address,
            total_spent: finalTotal,
            order_count: 1,
            loyalty_tier: finalTotal >= 15000 ? "💎 Gold Tier" : "Valued Client",
            updated_at: new Date().toISOString(),
          });

          // Insert order
          await client.from("orders").insert({
            id: orderId,
            customer_id: customerId,
            customer_name: data.customerName,
            email: data.email || null,
            phone: data.phone,
            address: data.address,
            city: data.city,
            postal_code: data.postalCode || null,
            payment_method: data.paymentMethod,
            payment_status: newOrderRecord.paymentStatus,
            transaction_id: data.transactionId || null,
            subtotal,
            discount_code: data.discountCode || null,
            discount_amount: discountAmount,
            shipping: shippingFee,
            total: finalTotal,
            order_status: "Confirmed",
            courier_name: newOrderRecord.courierName,
            is_gift_wrapped: !!data.isGiftWrapped,
            gift_message: data.giftMessage || null,
            created_at: new Date().toISOString(),
          });

          // Insert order items & update product stock in Supabase
          for (const item of verifiedItems) {
            await client.from("order_items").insert({
              id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              order_id: orderId,
              product_id: item.dbProductId,
              name: item.name,
              price: item.price,
              qty: item.qty,
              volume: item.volume,
              image: item.image,
            });

            if (item.dbProductId) {
              const dbProd = productsMap.get(item.dbProductId);
              if (dbProd && typeof dbProd.stock === "number") {
                const nextStock = Math.max(0, dbProd.stock - item.qty);
                dbProd.stock = nextStock;
                await client
                  .from("products")
                  .update({ stock: nextStock, updated_at: new Date().toISOString() })
                  .eq("id", item.dbProductId);
              }
            }
          }

          // Increment coupon usage count in Supabase if a valid coupon was applied
          if (appliedCouponRow?.id) {
            await client
              .from("coupons")
              .update({ used_count: Number(appliedCouponRow.used_count || 0) + 1 })
              .eq("id", appliedCouponRow.id);
          }

          serverCache.invalidateTags("products", "coupons");

          // Audit log
          await client.from("audit_logs").insert({
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: "Order Placed",
            category: "Order",
            details: `Order #${orderId} confirmed for ${data.customerName} (${data.city}) — Total: ₨ ${finalTotal.toLocaleString()}`,
            user: "Customer Checkout",
          });
        }
      } catch (err) {
        console.warn("[placeOrderServerFn] Supabase insert exception:", err);
      }
    }

    // Direct Drizzle DB as fallback/secondary
    if (isDatabaseConfigured() && db) {
      try {
        await db.insert(schema.orders).values(newOrderRecord as any);
        for (const item of verifiedItems) {
          await db.insert(schema.orderItems).values({
            id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            orderId,
            productId: item.productId,
            name: item.name,
            price: item.price,
            qty: item.qty,
            volume: item.volume,
            image: item.image,
          });
        }
      } catch (err) {
        console.warn("[placeOrderServerFn] DB fallback exception:", err);
      }
    }

    // 7. Dispatch Automated Order Notification & Invoice Emails
    try {
      await dispatchOrderNotificationEmails({
        id: orderId,
        customerName: data.customerName,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode || null,
        paymentMethod: data.paymentMethod,
        paymentStatus: newOrderRecord.paymentStatus,
        transactionId: data.transactionId || null,
        subtotal,
        discountCode: data.discountCode || null,
        discountAmount,
        shipping: shippingFee,
        total: finalTotal,
        courierName: newOrderRecord.courierName,
        date: new Date().toISOString().split("T")[0],
        items: verifiedItems,
      });
    } catch (emailErr) {
      console.warn("[processPlaceOrder] Email dispatch non-blocking error:", emailErr);
    }

    return {
      success: true,
      order: {
        ...newOrderRecord,
        date: new Date().toISOString().split("T")[0],
        items: verifiedItems,
      },
    };
}

export const placeOrderServerFn = createServerFn({ method: "POST" })
  .validator(placeOrderSchema)
  .handler(async ({ data }) => processPlaceOrder(data));

export const getOrdersSchema = z.object({ authToken: z.string().optional() });
export type GetOrdersInput = z.infer<typeof getOrdersSchema>;

export async function processGetOrders(data: GetOrdersInput) {
    const auth = await verifyAdminSession(data.authToken);
    if (!auth.valid) {
      return { success: false, error: auth.error || "Unauthorized admin access." };
    }

    // 1. Supabase REST API (Authoritative)
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          const { data: orderRows, error: orderErr } = await client
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false });

          const { data: itemRows, error: itemErr } = await client
            .from("order_items")
            .select("*");

          if (!orderErr && Array.isArray(orderRows)) {
            const formattedOrders = orderRows.map((o: any) => ({
              id: o.id,
              customerId: o.customer_id,
              customerName: o.customer_name,
              email: o.email || "",
              phone: o.phone,
              address: o.address,
              city: o.city,
              postalCode: o.postal_code || undefined,
              paymentMethod: o.payment_method,
              paymentStatus: o.payment_status,
              transactionId: o.transaction_id || undefined,
              subtotal: Number(o.subtotal),
              discountCode: o.discount_code || undefined,
              discountAmount: Number(o.discount_amount || 0),
              shipping: Number(o.shipping || 0),
              total: Number(o.total),
              orderStatus: o.order_status,
              courierName: o.courier_name || undefined,
              trackingNumber: o.tracking_number || undefined,
              isGiftWrapped: Boolean(o.is_gift_wrapped),
              giftMessage: o.gift_message || undefined,
              date: o.created_at ? o.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
              items: (itemRows || [])
                .filter((i: any) => i.order_id === o.id)
                .map((i: any) => ({
                  productId: i.product_id || "",
                  name: i.name,
                  price: Number(i.price),
                  qty: Number(i.qty),
                  volume: i.volume,
                  image: i.image || "/product-box.jpg",
                })),
            }));

            return { success: true, orders: formattedOrders, source: "supabase" };
          }
          if (orderErr) console.warn("[getOrdersServerFn] Supabase orders read error:", orderErr);
        }
      } catch (err) {
        console.warn("[getOrdersServerFn] Supabase orders exception:", err);
      }
    }

    // 2. Direct Drizzle DB
    if (isDatabaseConfigured() && db) {
      try {
        const orderRows = await db.select().from(schema.orders);
        const itemRows = await db.select().from(schema.orderItems);

        const ordersWithItems = orderRows.map((o) => ({
          ...o,
          date: o.createdAt ? o.createdAt.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          items: itemRows
            .filter((i) => i.orderId === o.id)
            .map((i) => ({
              productId: i.productId || "",
              name: i.name,
              price: i.price,
              qty: i.qty,
              volume: i.volume,
              image: i.image || "/product-box.jpg",
            })),
        }));

        return { success: true, orders: ordersWithItems, source: "database" };
      } catch (err: any) {
        return { success: false, error: err?.message || "Failed to fetch orders from database." };
      }
    }

    return { success: true, orders: [], source: "none" };
}

export const getOrdersServerFn = createServerFn({ method: "POST" })
  .validator(getOrdersSchema)
  .handler(async ({ data }) => processGetOrders(data));

export const updateOrderStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["Confirmed", "Processing", "Dispatched", "Delivered", "Cancelled", "Returned"]),
  courierName: z.string().optional(),
  trackingNumber: z.string().optional(),
  authToken: z.string().optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export async function processUpdateOrderStatus(data: UpdateOrderStatusInput) {
    const auth = await verifyAdminSession(data.authToken);
    if (!auth.valid) {
      return { success: false, error: auth.error || "Unauthorized admin action." };
    }

    const isInactiveStatus = (s?: string | null) => s === "Cancelled" || s === "Returned";
    let stockNote = "";

    // 1. Supabase REST API
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          // Fetch previous status so we can automatically restore/adjust product stock
          const { data: existingOrder } = await client
            .from("orders")
            .select("order_status")
            .eq("id", data.id)
            .maybeSingle();

          const prevStatus = existingOrder?.order_status || "Confirmed";
          const wasInactive = isInactiveStatus(prevStatus);
          const nowInactive = isInactiveStatus(data.status);

          const updatePayload: Record<string, any> = {
            order_status: data.status,
          };
          if (data.courierName !== undefined) updatePayload.courier_name = data.courierName || null;
          if (data.trackingNumber !== undefined) updatePayload.tracking_number = data.trackingNumber || null;

          await client
            .from("orders")
            .update(updatePayload)
            .eq("id", data.id);

          // Automatic inventory stock restoration when Cancelled/Returned (or re-deduction if reactivated)
          if (wasInactive !== nowInactive) {
            const { data: orderItems } = await client
              .from("order_items")
              .select("product_id, qty")
              .eq("order_id", data.id);

            if (Array.isArray(orderItems) && orderItems.length > 0) {
              for (const item of orderItems) {
                if (!item.product_id) continue;
                const { data: prod } = await client
                  .from("products")
                  .select("stock")
                  .eq("id", item.product_id)
                  .maybeSingle();
                if (prod && typeof prod.stock === "number") {
                  const qty = Number(item.qty) || 1;
                  const nextStock = nowInactive
                    ? prod.stock + qty
                    : Math.max(0, prod.stock - qty);
                  await client
                    .from("products")
                    .update({ stock: nextStock, updated_at: new Date().toISOString() })
                    .eq("id", item.product_id);
                }
              }
              serverCache.invalidateTags("products");
              stockNote = nowInactive ? " · Inventory stock automatically restored" : " · Inventory stock deducted";
            }
          }

          await client.from("audit_logs").insert({
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: data.status === "Cancelled" ? "Order Cancelled" : data.status === "Returned" ? "Order Returned" : "Order Status Updated",
            category: "Order",
            details: `Order #${data.id} updated from "${prevStatus}" to "${data.status}"${data.trackingNumber ? ` (Tracking: ${data.trackingNumber} via ${data.courierName})` : ""}${stockNote}`,
            user: auth.user?.email || "Admin",
          });
        }
      } catch (err) {
        console.warn("[updateOrderStatusServerFn] Supabase update exception:", err);
      }
    }

    // 2. Direct Drizzle DB
    if (isDatabaseConfigured() && db) {
      try {
        await db
          .update(schema.orders)
          .set({
            orderStatus: data.status,
            courierName: data.courierName,
            trackingNumber: data.trackingNumber,
          })
          .where(eq(schema.orders.id, data.id));
      } catch (err: any) {
        console.warn("[updateOrderStatusServerFn] DB update error:", err);
      }
    }

    return { success: true };
}

export const updateOrderStatusServerFn = createServerFn({ method: "POST" })
  .validator(updateOrderStatusSchema)
  .handler(async ({ data }) => processUpdateOrderStatus(data));

export const updatePaymentStatusSchema = z.object({
  id: z.string().min(1),
  paymentStatus: z.enum(["Paid", "Pending COD", "Verification Required"]),
  authToken: z.string().optional(),
});
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;

export async function processUpdatePaymentStatus(data: UpdatePaymentStatusInput) {
    const auth = await verifyAdminSession(data.authToken);
    if (!auth.valid) {
      return { success: false, error: auth.error || "Unauthorized admin action." };
    }

    // 1. Supabase REST API
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          await client
            .from("orders")
            .update({
              payment_status: data.paymentStatus,
            })
            .eq("id", data.id);

          await client.from("audit_logs").insert({
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: "Payment Verified",
            category: "Order",
            details: `Order #${data.id} payment status marked as "${data.paymentStatus}".`,
            user: auth.user?.email || "Admin",
          });
        }
      } catch (err) {
        console.warn("[updatePaymentStatusServerFn] Supabase update exception:", err);
      }
    }

    // 2. Direct Drizzle DB
    if (isDatabaseConfigured() && db) {
      try {
        await db
          .update(schema.orders)
          .set({
            paymentStatus: data.paymentStatus,
          })
          .where(eq(schema.orders.id, data.id));
      } catch (err: any) {
        console.warn("[updatePaymentStatusServerFn] DB update error:", err);
      }
    }

    return { success: true };
}

export const updatePaymentStatusServerFn = createServerFn({ method: "POST" })
  .validator(updatePaymentStatusSchema)
  .handler(async ({ data }) => processUpdatePaymentStatus(data));

export const getOrderByIdSchema = z.object({ orderId: z.string().min(1) });
export type GetOrderByIdInput = z.infer<typeof getOrderByIdSchema>;

export async function processGetOrderById(data: GetOrderByIdInput) {
    // 1. Supabase REST API
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          const { data: o, error: orderErr } = await client
            .from("orders")
            .select("*")
            .eq("id", data.orderId)
            .maybeSingle();

          if (!orderErr && o) {
            const { data: itemRows } = await client
              .from("order_items")
              .select("*")
              .eq("order_id", data.orderId);

            return {
              success: true,
              order: {
                id: o.id,
                customerId: o.customer_id,
                customerName: o.customer_name,
                email: o.email || "",
                phone: o.phone,
                address: o.address,
                city: o.city,
                postalCode: o.postal_code || undefined,
                paymentMethod: o.payment_method,
                paymentStatus: o.payment_status,
                transactionId: o.transaction_id || undefined,
                subtotal: Number(o.subtotal),
                discountCode: o.discount_code || undefined,
                discountAmount: Number(o.discount_amount || 0),
                shipping: Number(o.shipping || 0),
                total: Number(o.total),
                orderStatus: o.order_status,
                courierName: o.courier_name || undefined,
                trackingNumber: o.tracking_number || undefined,
                isGiftWrapped: Boolean(o.is_gift_wrapped),
                giftMessage: o.gift_message || undefined,
                date: o.created_at ? o.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
                items: (itemRows || []).map((i: any) => ({
                  productId: i.product_id || "",
                  name: i.name,
                  price: Number(i.price),
                  qty: Number(i.qty),
                  volume: i.volume,
                  image: i.image || "/product-box.jpg",
                })),
              },
            };
          }
        }
      } catch (err) {
        console.warn("[getOrderByIdServerFn] Supabase order exception:", err);
      }
    }

    // 2. Direct Drizzle DB
    if (isDatabaseConfigured() && db) {
      try {
        const rows = await db.select().from(schema.orders).where(eq(schema.orders.id, data.orderId)).limit(1);
        if (rows.length > 0) {
          const o = rows[0];
          const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, data.orderId));
          return {
            success: true,
            order: {
              ...o,
              date: o.createdAt ? o.createdAt.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
              items: items.map((i) => ({
                productId: i.productId || "",
                name: i.name,
                price: i.price,
                qty: i.qty,
                volume: i.volume,
                image: i.image || "/product-box.jpg",
              })),
            },
          };
        }
      } catch (err: any) {
        console.warn("[getOrderByIdServerFn] DB order lookup error:", err);
      }
    }

    return { success: false, error: "Order not found." };
}

export const getOrderByIdServerFn = createServerFn({ method: "POST" })
  .validator(getOrderByIdSchema)
  .handler(async ({ data }) => processGetOrderById(data));

export const resendOrderEmailSchema = z.object({
  authToken: z.string().optional(),
  orderId: z.string().min(1),
});

export const resendOrderNotificationServerFn = createServerFn({ method: "POST" })
  .validator(resendOrderEmailSchema)
  .handler(async ({ data }) => {
    const sessionCheck = await verifyAdminSession(data.authToken);
    if (!sessionCheck.valid) {
      return { success: false, error: sessionCheck.error || "Unauthorized" };
    }

    const orderRes = await processGetOrderById({ orderId: data.orderId });
    if (!orderRes.success || !orderRes.order) {
      return { success: false, error: orderRes.error || "Order not found." };
    }

    const order = orderRes.order;
    const result = await dispatchOrderNotificationEmails({
      id: order.id,
      customerName: order.customerName,
      email: order.email || null,
      phone: order.phone,
      address: order.address,
      city: order.city,
      postalCode: order.postalCode || null,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      transactionId: order.transactionId || null,
      subtotal: order.subtotal,
      discountCode: order.discountCode || null,
      discountAmount: order.discountAmount || 0,
      shipping: order.shipping,
      total: order.total,
      courierName: order.courierName || null,
      date: order.date || new Date().toISOString().split("T")[0],
      items: order.items || [],
    });

    const isDelivered = result.adminEmail.sent || (result.customerEmail ? result.customerEmail.sent : false);
    if (isDelivered) {
      return {
        success: true,
        adminResult: result.adminEmail,
        customerResult: result.customerEmail,
        message: `Order #${order.id} notifications dispatched! Admin: ${result.adminEmail.sent ? "Sent via " + result.adminEmail.method : "Queued"} · Customer: ${order.email ? (result.customerEmail?.sent ? "Sent via " + result.customerEmail.method : "Failed: " + (result.customerEmail?.error || "Error")) : "No customer email"}`,
      };
    }

    return {
      success: false,
      adminResult: result.adminEmail,
      customerResult: result.customerEmail,
      error:
        result.adminEmail.error ||
        result.customerEmail?.error ||
        "Failed to dispatch email. Please check your Email Settings in the Admin Portal.",
    };
  });

export const updateOrderContactDetailsSchema = z.object({
  orderId: z.string().min(1).max(60),
  customerName: z.string().min(1).max(100).trim(),
  phone: z.string().min(8).max(25).trim(),
  email: z.string().max(150).optional(),
  address: z.string().min(3).max(300).trim(),
  city: z.string().min(2).max(120).trim(),
  postalCode: z.string().max(20).optional(),
});

export const updateOrderContactDetailsServerFn = createServerFn({ method: "POST" })
  .validator(updateOrderContactDetailsSchema)
  .handler(async ({ data }) => {
    let verifiedEmail = "";
    if (data.email && data.email.trim()) {
      const emailCheck = verifyEmailAddress(data.email);
      if (!emailCheck.valid) {
        return { success: false, error: emailCheck.error || "Please enter a valid email address." };
      }
      verifiedEmail = emailCheck.normalized;
    }

    const cleanName = sanitizeText(data.customerName, 100);
    const cleanPhone = sanitizeText(data.phone, 25);
    const cleanAddress = sanitizeText(data.address, 300);
    const cleanCity = sanitizeText(data.city, 120);
    const cleanPostal = data.postalCode ? sanitizeText(data.postalCode, 20) : "";

    if (!cleanName || !cleanPhone || !cleanAddress || !cleanCity) {
      return { success: false, error: "Name, phone number, street address, and city/state are required." };
    }

    const existingRes = await processGetOrderById({ orderId: data.orderId });
    if (!existingRes.success || !existingRes.order) {
      return { success: false, error: "Order not found." };
    }

    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          const updatePayload: Record<string, any> = {
            customer_name: cleanName,
            phone: cleanPhone,
            email: verifiedEmail || null,
            address: cleanAddress,
            city: cleanCity,
          };
          if (cleanPostal !== undefined) {
            updatePayload.postal_code = cleanPostal || null;
          }

          const { error: upErr } = await client
            .from("orders")
            .update(updatePayload)
            .eq("id", data.orderId);

          if (upErr) {
            // Fallback without postal_code if column is absent
            const { postal_code, ...fallbackPayload } = updatePayload;
            await client.from("orders").update(fallbackPayload).eq("id", data.orderId);
          }

          await client.from("audit_logs").insert({
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: "Customer Contact Corrected",
            category: "Order",
            details: `Order #${data.orderId} contact details updated (${cleanName}, ${cleanPhone}, ${verifiedEmail || "no-email"}, ${cleanCity}).`,
            user: cleanName,
          });
        }
      } catch (err) {
        console.warn("[updateOrderContactDetailsServerFn] Supabase update error:", redactSensitiveData(err));
      }
    }

    if (isDatabaseConfigured() && db) {
      try {
        await db
          .update(schema.orders)
          .set({
            customerName: cleanName,
            phone: cleanPhone,
            email: verifiedEmail || null,
            address: cleanAddress,
            city: cleanCity,
            postalCode: cleanPostal || null,
          })
          .where(eq(schema.orders.id, data.orderId));
      } catch (err) {
        console.warn("[updateOrderContactDetailsServerFn] DB update error:", redactSensitiveData(err));
      }
    }

    // If a valid email is present, dispatch the updated confirmation invoice to the corrected email
    if (verifiedEmail) {
      const ord = existingRes.order;
      dispatchOrderNotificationEmails({
        id: ord.id,
        customerName: cleanName,
        email: verifiedEmail,
        phone: cleanPhone,
        address: cleanAddress,
        city: cleanCity,
        postalCode: cleanPostal || null,
        paymentMethod: ord.paymentMethod,
        paymentStatus: ord.paymentStatus,
        transactionId: ord.transactionId || null,
        subtotal: ord.subtotal,
        discountCode: ord.discountCode || null,
        discountAmount: ord.discountAmount || 0,
        shipping: ord.shipping,
        total: ord.total,
        courierName: ord.courierName || null,
        date: ord.date || new Date().toISOString().split("T")[0],
        items: ord.items || [],
      }).catch(() => {});
    }

    return {
      success: true,
      updated: {
        customerName: cleanName,
        phone: cleanPhone,
        email: verifiedEmail,
        address: cleanAddress,
        city: cleanCity,
        postalCode: cleanPostal || undefined,
      },
    };
  });

export const submitOrderPaymentReceiptSchema = z.object({
  orderId: z.string().min(1).max(60),
  transactionId: z.string().min(1).max(120),
  detectedSummary: z.string().max(400).optional(),
  receiptImageDataUrl: z.string().max(6_000_000).optional(),
});

export const submitOrderPaymentReceiptServerFn = createServerFn({ method: "POST" })
  .validator(submitOrderPaymentReceiptSchema)
  .handler(async ({ data }) => {
    const cleanTid = sanitizeText(data.transactionId, 120);
    const cleanSummary = data.detectedSummary ? sanitizeText(data.detectedSummary, 400) : "";

    if (!cleanTid) {
      return { success: false, error: "Transaction ID is required." };
    }

    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          await client
            .from("orders")
            .update({
              transaction_id: cleanTid,
            })
            .eq("id", data.orderId);

          await client.from("audit_logs").upsert({
            id: `payment-proof-${data.orderId}`,
            timestamp: new Date().toISOString(),
            action: "Online Payment Receipt Uploaded",
            category: "Order",
            details: JSON.stringify({
              orderId: data.orderId,
              transactionId: cleanTid,
              summary: cleanSummary,
              hasImage: Boolean(data.receiptImageDataUrl),
              receiptImage: data.receiptImageDataUrl ? data.receiptImageDataUrl.slice(0, 350_000) : undefined,
            }),
            user: "Customer Receipt Auto-Scanner",
          });
        }
      } catch (err) {
        console.warn("[submitOrderPaymentReceiptServerFn] Supabase error:", redactSensitiveData(err));
      }
    }

    if (isDatabaseConfigured() && db) {
      try {
        await db
          .update(schema.orders)
          .set({ transactionId: cleanTid })
          .where(eq(schema.orders.id, data.orderId));
      } catch (err) {
        console.warn("[submitOrderPaymentReceiptServerFn] DB error:", redactSensitiveData(err));
      }
    }

    return {
      success: true,
      transactionId: cleanTid,
    };
  });



