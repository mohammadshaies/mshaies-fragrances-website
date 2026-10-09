import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, schema, isDatabaseConfigured } from "../db/client.server";
import { verifyAdminSession } from "../supabase.server";
import { eq } from "drizzle-orm";

export const getProductsServerFn = createServerFn({ method: "GET" })
  .handler(async () => {
    if (isDatabaseConfigured() && db) {
      try {
        const rows = await db.select().from(schema.products);
        if (rows.length > 0) {
          return { success: true, products: rows };
        }
      } catch (err) {
        console.warn("[getProductsServerFn] DB read failed, falling back to local defaults:", err);
      }
    }
    return { success: true, products: [] };
  });

export const saveProductServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      authToken: z.string().optional(),
      product: z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        price: z.number().positive(),
        category: z.string(),
        volume: z.string(),
        stock: z.number().int().nonnegative().default(0),
        tagline: z.string().optional(),
        notes: z.string().optional(),
        topNotes: z.string().optional(),
        heartNotes: z.string().optional(),
        baseNotes: z.string().optional(),
        image: z.string().default("/product-box.jpg"),
        images: z.array(z.string()).optional(),
        accent: z.string().optional(),
        description: z.string().optional(),
        isFeatured: z.boolean().optional(),
        gender: z.string().optional(),
        longevityHours: z.number().optional(),
        sillageRating: z.string().optional(),
        seasonSuitability: z.array(z.string()).optional(),
        occasionSuitability: z.array(z.string()).optional(),
        inspiredBy: z.string().optional(),
        fragranceFamily: z.string().optional(),
        layeringPairId: z.string().optional(),
        samplePrice: z.number().optional(),
        batchNumber: z.string().optional(),
      }),
    })
  )
  .handler(async ({ data }) => {
    const auth = await verifyAdminSession(data.authToken);
    if (!auth.valid) {
      return { success: false, error: auth.error || "Unauthorized admin action." };
    }

    const prodId = data.product.id || data.product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const productRecord = {
      ...data.product,
      id: prodId,
      updatedAt: new Date(),
    };

    if (isDatabaseConfigured() && db) {
      try {
        await db
          .insert(schema.products)
          .values(productRecord as any)
          .onConflictDoUpdate({
            target: schema.products.id,
            set: productRecord as any,
          });

        await db.insert(schema.auditLogs).values({
          id: `log-${Date.now()}`,
          timestamp: new Date(),
          action: data.product.id ? "Product Updated" : "Product Created",
          category: "Product",
          details: `Fragrance "${data.product.name}" (${data.product.volume}, ₨ ${data.product.price}) saved to catalog.`,
          user: auth.user?.email || "Admin",
        });

        return { success: true, product: productRecord };
      } catch (err: any) {
        return { success: false, error: err?.message || "Failed to save product in database." };
      }
    }

    return { success: true, product: productRecord };
  });

export const deleteProductServerFn = createServerFn({ method: "POST" })
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
        await db.delete(schema.products).where(eq(schema.products.id, data.id));
        await db.insert(schema.auditLogs).values({
          id: `log-${Date.now()}`,
          timestamp: new Date(),
          action: "Product Deleted",
          category: "Product",
          details: `Product ID "${data.id}" was deleted from the catalog.`,
          user: auth.user?.email || "Admin",
        });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || "Failed to delete product." };
      }
    }

    return { success: true };
  });

export const bulkImportProductsServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      authToken: z.string().optional(),
      products: z.array(
        z.object({
          id: z.string().optional(),
          name: z.string().min(1),
          price: z.number().positive(),
          category: z.string().default("Attars"),
          volume: z.string().default("12ml Pure Attar"),
          stock: z.number().default(10),
          tagline: z.string().optional(),
          notes: z.string().optional(),
          image: z.string().default("/product-box.jpg"),
          gender: z.string().optional(),
          longevityHours: z.number().optional(),
          sillageRating: z.string().optional(),
          fragranceFamily: z.string().optional(),
          inspiredBy: z.string().optional(),
          samplePrice: z.number().optional(),
          batchNumber: z.string().optional(),
        })
      ),
    })
  )
  .handler(async ({ data }) => {
    const auth = await verifyAdminSession(data.authToken);
    if (!auth.valid) {
      return { success: false, error: auth.error || "Unauthorized admin action." };
    }

    if (isDatabaseConfigured() && db) {
      try {
        const records = data.products.map((p) => ({
          ...p,
          id: p.id || p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          updatedAt: new Date(),
        }));

        for (const rec of records) {
          await db
            .insert(schema.products)
            .values(rec as any)
            .onConflictDoUpdate({
              target: schema.products.id,
              set: rec as any,
            });
        }

        await db.insert(schema.auditLogs).values({
          id: `log-${Date.now()}`,
          timestamp: new Date(),
          action: "Bulk Product Import",
          category: "Product",
          details: `Imported ${records.length} fragrances via CSV engine.`,
          user: auth.user?.email || "Admin",
        });

        return { success: true, count: records.length };
      } catch (err: any) {
        return { success: false, error: err?.message || "Failed to bulk import products." };
      }
    }

    return { success: true, count: data.products.length };
  });
