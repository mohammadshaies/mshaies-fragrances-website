import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, schema, isDatabaseConfigured } from "../db/client.server";
import { getSupabaseAdmin, getSupabaseClient, isSupabaseConfigured, verifyAdminSession } from "../supabase.server";
import { eq } from "drizzle-orm";

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

export async function processPlaceOrder(data: PlaceOrderInput) {
    if (data.items.length === 0) {
      return { success: false, error: "Cannot place an order with empty cart." };
    }

    // 1. Fetch settings for shipping rates
    let freeShippingThreshold = 5000;
    let standardShippingFee = 250;
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
      const dbProd = productsMap.get(item.productId);
      let unitPrice = 3500;
      let itemName = "Signature Fragrance";
      let itemImage = "/product-box.jpg";

      if (dbProd) {
        itemName = dbProd.name;
        itemImage = dbProd.image || "/product-box.jpg";
        if (item.volume.includes("3ml") && dbProd.sample_price) {
          unitPrice = dbProd.sample_price;
        } else {
          unitPrice = dbProd.price;
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
        productId: item.productId,
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

          // Insert order items
          for (const item of verifiedItems) {
            await client.from("order_items").insert({
              id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              order_id: orderId,
              product_id: item.productId,
              name: item.name,
              price: item.price,
              qty: item.qty,
              volume: item.volume,
              image: item.image,
            });
          }

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
  status: z.enum(["Confirmed", "Processing", "Dispatched", "Delivered"]),
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

    // 1. Supabase REST API
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          await client
            .from("orders")
            .update({
              order_status: data.status,
              courier_name: data.courierName || null,
              tracking_number: data.trackingNumber || null,
            })
            .eq("id", data.id);

          await client.from("audit_logs").insert({
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: "Order Status Updated",
            category: "Order",
            details: `Order #${data.id} updated to "${data.status}"${data.trackingNumber ? ` (Tracking: ${data.trackingNumber} via ${data.courierName})` : ""}`,
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


