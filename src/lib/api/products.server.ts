import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, schema, isDatabaseConfigured } from "../db/client.server";
import { getSupabaseAdmin, getSupabaseClient, isSupabaseConfigured, verifyAdminSession } from "../supabase.server";
import { eq } from "drizzle-orm";

function mapSupabaseProduct(row: any) {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    category: row.category,
    volume: row.volume,
    stock: Number(row.stock || 0),
    tagline: row.tagline || "",
    notes: row.notes || "",
    topNotes: row.top_notes || row.topNotes || undefined,
    heartNotes: row.heart_notes || row.heartNotes || undefined,
    baseNotes: row.base_notes || row.baseNotes || undefined,
    image: row.image || "/product-box.jpg",
    images: Array.isArray(row.images) ? row.images : (row.image ? [row.image] : undefined),
    accent: row.accent || undefined,
    description: row.description || "",
    isFeatured: Boolean(row.is_featured ?? row.isFeatured),
    gender: row.gender || "Unisex",
    longevityHours: row.longevity_hours != null ? Number(row.longevity_hours) : (row.longevityHours != null ? Number(row.longevityHours) : 18),
    sillageRating: row.sillage_rating || row.sillageRating || "Strong",
    seasonSuitability: row.season_suitability || row.seasonSuitability || ["All-Season"],
    occasionSuitability: row.occasion_suitability || row.occasionSuitability || ["Daily Office", "Evening Gala"],
    inspiredBy: row.inspired_by || row.inspiredBy || undefined,
    fragranceFamily: row.fragrance_family || row.fragranceFamily || "Woody Oud",
    layeringPairId: row.layering_pair_id || row.layeringPairId || undefined,
    samplePrice: row.sample_price != null ? Number(row.sample_price) : (row.samplePrice != null ? Number(row.samplePrice) : 650),
    batchNumber: row.batch_number || row.batchNumber || "MSH-2026-B1",
  };
}

function productToSupabaseRow(p: any) {
  return {
    id: p.id,
    name: p.name,
    price: Number(p.price),
    category: p.category,
    volume: p.volume,
    stock: Number(p.stock || 0),
    tagline: p.tagline || "",
    notes: p.notes || "",
    top_notes: p.topNotes || null,
    heart_notes: p.heartNotes || null,
    base_notes: p.baseNotes || null,
    image: p.image || "/product-box.jpg",
    accent: p.accent || null,
    description: p.description || "",
    is_featured: Boolean(p.isFeatured),
    gender: p.gender || "Unisex",
    longevity_hours: Number(p.longevityHours || 18),
    sillage_rating: p.sillageRating || "Strong",
    season_suitability: p.seasonSuitability || ["All-Season"],
    occasion_suitability: p.occasionSuitability || ["Daily Office", "Evening Gala"],
    inspired_by: p.inspiredBy || null,
    fragrance_family: p.fragranceFamily || "Woody Oud",
    layering_pair_id: p.layeringPairId || null,
    sample_price: Number(p.samplePrice || 650),
    batch_number: p.batchNumber || "MSH-2026-B1",
    updated_at: new Date().toISOString(),
  };
}

export const getProductsServerFn = createServerFn({ method: "GET" })
  .handler(async () => {
    // 1. Supabase REST API (Primary for Cloud & Vercel)
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          const { data: rows, error } = await client.from("products").select("*").order("name");
          if (!error && Array.isArray(rows)) {
            return {
              success: true,
              products: rows.map(mapSupabaseProduct),
              source: "supabase",
            };
          }
          if (error) {
            console.warn("[getProductsServerFn] Supabase read error:", error);
          }
        }
      } catch (err) {
        console.warn("[getProductsServerFn] Supabase client exception:", err);
      }
    }

    // 2. PostgreSQL Direct DB (Drizzle fallback)
    if (isDatabaseConfigured() && db) {
      try {
        const rows = await db.select().from(schema.products);
        return {
          success: true,
          products: rows.map(mapSupabaseProduct),
          source: "database",
        };
      } catch (err) {
        console.warn("[getProductsServerFn] DB read failed:", err);
      }
    }

    return { success: true, products: [], source: "none" };
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

    // 1. Supabase REST API
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          const supabasePayload = productToSupabaseRow(productRecord);
          const { error: saveErr } = await client.from("products").upsert(supabasePayload);
          if (saveErr) {
            console.error("[saveProductServerFn] Supabase save error:", saveErr);
          }

          await client.from("audit_logs").insert({
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: data.product.id ? "Product Updated" : "Product Created",
            category: "Product",
            details: `Fragrance "${data.product.name}" (${data.product.volume}, ₨ ${data.product.price}) saved to Supabase catalog.`,
            user: auth.user?.email || "Admin",
          });
        }
      } catch (err) {
        console.warn("[saveProductServerFn] Supabase save exception:", err);
      }
    }

    // 2. Direct Drizzle DB
    if (isDatabaseConfigured() && db) {
      try {
        await db
          .insert(schema.products)
          .values(productRecord as any)
          .onConflictDoUpdate({
            target: schema.products.id,
            set: productRecord as any,
          });
      } catch (err) {
        console.warn("[saveProductServerFn] DB save exception:", err);
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

    // 1. Supabase REST API
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          await client.from("products").delete().eq("id", data.id);
          await client.from("audit_logs").insert({
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: "Product Deleted",
            category: "Product",
            details: `Product ID "${data.id}" was deleted from Supabase catalog.`,
            user: auth.user?.email || "Admin",
          });
        }
      } catch (err) {
        console.warn("[deleteProductServerFn] Supabase delete exception:", err);
      }
    }

    // 2. Direct Drizzle DB
    if (isDatabaseConfigured() && db) {
      try {
        await db.delete(schema.products).where(eq(schema.products.id, data.id));
      } catch (err) {
        console.warn("[deleteProductServerFn] DB delete exception:", err);
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

    const records = data.products.map((p) => ({
      ...p,
      id: p.id || p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      updatedAt: new Date(),
    }));

    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          for (const rec of records) {
            await client.from("products").upsert(productToSupabaseRow(rec));
          }
          await client.from("audit_logs").insert({
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: "Bulk Product Import",
            category: "Product",
            details: `Imported ${records.length} fragrances into Supabase.`,
            user: auth.user?.email || "Admin",
          });
        }
      } catch (err) {
        console.warn("[bulkImportProductsServerFn] Supabase bulk error:", err);
      }
    }

    if (isDatabaseConfigured() && db) {
      try {
        for (const rec of records) {
          await db
            .insert(schema.products)
            .values(rec as any)
            .onConflictDoUpdate({
              target: schema.products.id,
              set: rec as any,
            });
        }
      } catch (err) {
        console.warn("[bulkImportProductsServerFn] DB bulk error:", err);
      }
    }

    return { success: true, count: records.length };
  });
