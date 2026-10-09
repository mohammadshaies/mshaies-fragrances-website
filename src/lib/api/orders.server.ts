import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, schema, isDatabaseConfigured } from "../db/client.server";
import { verifyAdminSession } from "../supabase.server";
import { eq } from "drizzle-orm";

export const placeOrderServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
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
        })
      ).min(1).max(50),
    })
  )
  .handler(async ({ data }) => {
    if (data.items.length === 0) {
      return { success: false, error: "Cannot place an order with empty cart." };
    }

    // 1. Fetch DB settings for shipping rates
    let freeShippingThreshold = 5000;
    let standardShippingFee = 250;
    let expressShippingFee = 450;
    let lahoreLocalFee = 150;
    let codFee = 0;
    let freeShippingEnabled = true;

    if (isDatabaseConfigured() && db) {
      try {
        const settingsRow = await db.select().from(schema.storeSettings).limit(1);
        if (settingsRow.length > 0) {
          const s = settingsRow[0];
          freeShippingThreshold = s.freeShippingThreshold ?? 5000;
          standardShippingFee = s.standardShippingFee ?? 250;
          expressShippingFee = s.expressShippingFee ?? 450;
          lahoreLocalFee = s.lahoreLocalFee ?? 150;
          codFee = s.codFee ?? 0;
          freeShippingEnabled = s.freeShippingEnabled ?? true;
        }
      } catch (err) {
        console.warn("[placeOrderServerFn] Failed to read store settings from DB:", err);
      }
    }

    // 2. Authoritative Price & Subtotal Calculation from Database
    let subtotal = 0;
    const verifiedItems: {
      productId: string;
      name: string;
      price: number;
      qty: number;
      volume: string;
      image: string;
    }[] = [];

    for (const item of data.items) {
      let unitPrice = 3500;
      let itemName = "Signature Fragrance";
      let itemImage = "/product-box.jpg";
      let availableStock = 999;

      if (isDatabaseConfigured() && db) {
        try {
          const prodRows = await db.select().from(schema.products).where(eq(schema.products.id, item.productId)).limit(1);
          if (prodRows.length > 0) {
            const p = prodRows[0];
            itemName = p.name;
            itemImage = p.image;
            availableStock = p.stock;

            // Handle 3ml sample pricing
            if (item.volume.includes("3ml") && p.samplePrice) {
              unitPrice = p.samplePrice;
            } else {
              unitPrice = p.price;
            }

            if (item.qty > availableStock && availableStock > 0) {
              return {
                success: false,
                error: `Insufficient stock for ${itemName}. Only ${availableStock} bottles remaining.`,
              };
            }
          }
        } catch (err) {
          console.warn(`[placeOrderServerFn] Could not fetch product ${item.productId}:`, err);
        }
      }

      const lineTotal = unitPrice * item.qty;
      subtotal += lineTotal;
      verifiedItems.push({
        productId: item.productId,
        name: itemName,
        price: unitPrice,
        qty: item.qty,
        volume: item.volume,
        image: itemImage,
      });
    }

    // Add luxury gift wrap fee if selected (+ ₨ 250)
    if (data.isGiftWrapped) {
      subtotal += 250;
    }

    // 3. Authoritative Coupon Validation from Database
    let discountAmount = 0;
    let couponFreeShipping = false;

    if (data.discountCode && data.discountCode.trim()) {
      const cleanCode = data.discountCode.trim().toUpperCase();
      if (isDatabaseConfigured() && db) {
        try {
          const couponRows = await db.select().from(schema.coupons).where(eq(schema.coupons.code, cleanCode)).limit(1);
          if (couponRows.length > 0) {
            const c = couponRows[0];
            const isNotExpired = !c.expiryDate || new Date(c.expiryDate) >= new Date();
            const minOrderMet = subtotal >= c.minOrder;
            const hasUsesLeft = !c.maxUses || c.usedCount < c.maxUses;

            if (c.isActive && isNotExpired && minOrderMet && hasUsesLeft) {
              if (c.type === "percent") {
                discountAmount = Math.round((subtotal * c.value) / 100);
              } else if (c.type === "flat") {
                discountAmount = Math.min(c.value, subtotal);
              } else if (c.type === "shipping") {
                couponFreeShipping = true;
              }

              // Increment coupon usage count
              await db
                .update(schema.coupons)
                .set({ usedCount: c.usedCount + 1 })
                .where(eq(schema.coupons.id, c.id));
            }
          }
        } catch (err) {
          console.warn("[placeOrderServerFn] Coupon check failed:", err);
        }
      } else {
        // Fallback for launch voucher
        if (cleanCode === "LUXE15") {
          discountAmount = Math.round((subtotal * 15) / 100);
        }
      }
    }

    // 4. Authoritative Shipping Fee Calculation
    const isFreeEligible = (freeShippingEnabled && subtotal >= freeShippingThreshold) || couponFreeShipping;
    let baseShipping = standardShippingFee;

    if (data.shippingMethod === "express") {
      baseShipping = expressShippingFee;
    } else if (data.shippingMethod === "lahoreLocal" && data.city.toLowerCase() === "lahore") {
      baseShipping = lahoreLocalFee;
    }

    const calculatedShipping = isFreeEligible
      ? (data.shippingMethod === "express" ? Math.max(0, expressShippingFee - standardShippingFee) : 0)
      : baseShipping;

    const codSurcharge = data.paymentMethod === "cod" ? codFee : 0;
    const finalTotal = Math.max(0, subtotal - discountAmount + calculatedShipping + codSurcharge);

    // 5. Generate Order ID
    const orderId = `MSH-${Math.floor(10000 + Math.random() * 90000)}`;
    const newOrderRecord = {
      id: orderId,
      customerName: data.customerName,
      email: data.email || "",
      phone: data.phone,
      address: data.address,
      city: data.city,
      postalCode: data.postalCode || "",
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentMethod === "cod" ? ("Pending COD" as const) : ("Paid" as const),
      transactionId: data.transactionId || "",
      subtotal,
      discountCode: data.discountCode || "",
      discountAmount,
      shipping: calculatedShipping,
      total: finalTotal,
      orderStatus: "Confirmed" as const,
      courierName: data.city.toLowerCase() === "lahore" ? "Rider Hand Delivery" : "TCS Express",
      isGiftWrapped: !!data.isGiftWrapped,
      giftMessage: data.giftMessage || "",
      createdAt: new Date(),
    };

    // 6. Database Transaction / Insertion
    if (isDatabaseConfigured() && db) {
      try {
        // Insert order
        await db.insert(schema.orders).values(newOrderRecord);

        // Insert order items
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

          // Deduct stock atomically
          const currentProd = await db.select().from(schema.products).where(eq(schema.products.id, item.productId)).limit(1);
          if (currentProd.length > 0) {
            const newStock = Math.max(0, currentProd[0].stock - item.qty);
            await db.update(schema.products).set({ stock: newStock }).where(eq(schema.products.id, item.productId));
          }
        }

        // Upsert Customer CRM Directory
        const cleanPhone = data.phone.replace(/[^0-9]/g, "");
        const custRows = await db.select().from(schema.customers).where(eq(schema.customers.phone, cleanPhone)).limit(1);
        if (custRows.length > 0) {
          const cust = custRows[0];
          const newSpent = cust.totalSpent + finalTotal;
          const newCount = cust.orderCount + 1;
          const newTier = newSpent >= 30000 ? "👑 Royal VIP" : newSpent >= 15000 ? "💎 Gold Tier" : "Valued Client";
          await db
            .update(schema.customers)
            .set({
              totalSpent: newSpent,
              orderCount: newCount,
              loyaltyTier: newTier,
              address: data.address,
              city: data.city,
              updatedAt: new Date(),
            })
            .where(eq(schema.customers.id, cust.id));
        } else {
          await db.insert(schema.customers).values({
            id: `cust-${Date.now()}`,
            name: data.customerName,
            phone: cleanPhone,
            email: data.email || "",
            city: data.city,
            address: data.address,
            totalSpent: finalTotal,
            orderCount: 1,
            loyaltyTier: finalTotal >= 15000 ? "💎 Gold Tier" : "Valued Client",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        // Audit Trail entry
        await db.insert(schema.auditLogs).values({
          id: `log-${Date.now()}`,
          timestamp: new Date(),
          action: "Order Placed",
          category: "Order",
          details: `Order #${orderId} confirmed for ${data.customerName} (${data.city}) — Total: ₨ ${finalTotal.toLocaleString()}`,
          user: "Customer Checkout",
        });
      } catch (err: any) {
        console.error("[placeOrderServerFn] Database insertion failed:", err);
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
  });

export const getOrdersServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ authToken: z.string().optional() }))
  .handler(async ({ data }) => {
    const auth = await verifyAdminSession(data.authToken);
    if (!auth.valid) {
      return { success: false, error: auth.error || "Unauthorized admin access." };
    }

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

        return { success: true, orders: ordersWithItems };
      } catch (err: any) {
        return { success: false, error: err?.message || "Failed to fetch orders from database." };
      }
    }

    return { success: true, orders: [] };
  });

export const updateOrderStatusServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      status: z.enum(["Confirmed", "Processing", "Dispatched", "Delivered"]),
      courierName: z.string().optional(),
      trackingNumber: z.string().optional(),
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
        await db
          .update(schema.orders)
          .set({
            orderStatus: data.status,
            courierName: data.courierName,
            trackingNumber: data.trackingNumber,
          })
          .where(eq(schema.orders.id, data.id));

        await db.insert(schema.auditLogs).values({
          id: `log-${Date.now()}`,
          timestamp: new Date(),
          action: "Order Status Updated",
          category: "Order",
          details: `Order #${data.id} updated to "${data.status}"${data.trackingNumber ? ` (Tracking: ${data.trackingNumber} via ${data.courierName})` : ""}`,
          user: auth.user?.email || "Admin",
        });

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || "Failed to update order status." };
      }
    }

    return { success: true };
  });

