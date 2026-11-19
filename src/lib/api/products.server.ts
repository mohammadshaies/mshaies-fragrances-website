import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, schema, isDatabaseConfigured } from "../db/client.server";
import { getSupabaseAdmin, getSupabaseClient, isSupabaseConfigured, verifyAdminSession } from "../supabase.server";
import { eq } from "drizzle-orm";
import { serverCache } from "../cache.server";
import { sanitizeText, validateImageUpload, redactSensitiveData } from "../security/sanitize";

function parseAccentMetadata(accent: any): { sizes?: string[]; images?: string[]; rawAccent?: string } {
  if (typeof accent === "string" && accent.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(accent);
      if (parsed && typeof parsed === "object") {
        return {
          sizes: Array.isArray(parsed.sizes) ? parsed.sizes : undefined,
          images: Array.isArray(parsed.images) && parsed.images.length > 0 ? parsed.images : undefined,
          rawAccent: typeof parsed.accent === "string" ? parsed.accent : undefined,
        };
      }
    } catch {
      // Fallback to raw accent string
    }
  }
  return { rawAccent: typeof accent === "string" ? accent : undefined };
}

function mapSupabaseProduct(row: any) {
  const accentMeta = parseAccentMetadata(row.accent);
  const primaryImage = row.image || accentMeta.images?.[0] || "/product-box.jpg";
  const resolvedImages = Array.isArray(row.images) && row.images.length > 0
    ? row.images
    : (accentMeta.images && accentMeta.images.length > 0
        ? accentMeta.images
        : [primaryImage]);

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
    image: primaryImage,
    images: resolvedImages,
    accent: accentMeta.rawAccent || undefined,
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
    availableSizes: Array.isArray(row.available_sizes)
      ? row.available_sizes
      : (Array.isArray(row.availableSizes)
          ? row.availableSizes
          : accentMeta.sizes),
  };
}

function productToSupabaseRow(p: any) {
  const accentMeta = parseAccentMetadata(p.accent);
  const resolvedImages = Array.isArray(p.images) && p.images.length > 0
    ? p.images
    : (accentMeta.images || (p.image ? [p.image] : ["/product-box.jpg"]));
  const primaryImage = resolvedImages[0] || p.image || "/product-box.jpg";
  const resolvedSizes = Array.isArray(p.availableSizes) ? p.availableSizes : accentMeta.sizes;

  const accentPayload: Record<string, any> = {};
  if (resolvedSizes !== undefined) accentPayload.sizes = resolvedSizes;
  if (resolvedImages && resolvedImages.length > 0) accentPayload.images = resolvedImages;
  if (accentMeta.rawAccent) accentPayload.accent = accentMeta.rawAccent;

  const accentValue = Object.keys(accentPayload).length > 0
    ? JSON.stringify(accentPayload)
    : (p.accent || null);

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
    image: primaryImage,
    accent: accentValue,
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
    return serverCache.getOrSet(
      "products:all",
      async () => {
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
      },
      300,
      ["products"]
    );
  });

export const saveProductServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      authToken: z.string().optional(),
      product: z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        price: z.number().nonnegative(),
        category: z.string().min(1),
        volume: z.string().min(1),
        stock: z.number().int().nonnegative().default(0),
        tagline: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        topNotes: z.string().nullable().optional(),
        heartNotes: z.string().nullable().optional(),
        baseNotes: z.string().nullable().optional(),
        image: z.string().nullable().optional().default("/product-box.jpg"),
        images: z.array(z.string()).nullable().optional(),
        accent: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        isFeatured: z.boolean().nullable().optional(),
        gender: z.string().nullable().optional(),
        longevityHours: z.number().nullable().optional(),
        sillageRating: z.string().nullable().optional(),
        seasonSuitability: z.array(z.string()).nullable().optional(),
        occasionSuitability: z.array(z.string()).nullable().optional(),
        inspiredBy: z.string().nullable().optional(),
        fragranceFamily: z.string().nullable().optional(),
        layeringPairId: z.string().nullable().optional(),
        samplePrice: z.number().nullable().optional(),
        batchNumber: z.string().nullable().optional(),
        availableSizes: z.array(z.string()).nullable().optional(),
      }),
    })
  )
  .handler(async ({ data }) => {
    const auth = await verifyAdminSession(data.authToken);
    if (!auth.valid) {
      return { success: false, error: auth.error || "Unauthorized admin action." };
    }

    // Validate primary image upload & multi-image gallery uploads against MIME/SVG-XSS/magic-byte rules
    const primaryImgCheck = validateImageUpload(data.product.image);
    if (!primaryImgCheck.valid) {
      return { success: false, error: primaryImgCheck.error || "Invalid primary product image." };
    }

    const sanitizedGallery: string[] = [];
    if (Array.isArray(data.product.images)) {
      for (const rawImg of data.product.images.slice(0, 8)) {
        const imgCheck = validateImageUpload(rawImg);
        if (!imgCheck.valid) {
          return { success: false, error: imgCheck.error || "One of the uploaded gallery images is invalid." };
        }
        sanitizedGallery.push(imgCheck.sanitized);
      }
    }

    const cleanName = sanitizeText(data.product.name, 160);
    if (!cleanName) {
      return { success: false, error: "Product name cannot be empty." };
    }

    const prodId = data.product.id
      ? sanitizeText(data.product.id, 120).replace(/[^a-zA-Z0-9_-]/g, "")
      : cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const productRecord = {
      ...data.product,
      id: prodId,
      name: cleanName,
      category: sanitizeText(data.product.category, 60) || "Attars",
      volume: sanitizeText(data.product.volume, 60) || "12ml Pure Attar",
      tagline: data.product.tagline ? sanitizeText(data.product.tagline, 300) : "",
      notes: data.product.notes ? sanitizeText(data.product.notes, 300) : "",
      topNotes: data.product.topNotes ? sanitizeText(data.product.topNotes, 200) : null,
      heartNotes: data.product.heartNotes ? sanitizeText(data.product.heartNotes, 200) : null,
      baseNotes: data.product.baseNotes ? sanitizeText(data.product.baseNotes, 200) : null,
      description: data.product.description ? sanitizeText(data.product.description, 3000) : "",
      inspiredBy: data.product.inspiredBy ? sanitizeText(data.product.inspiredBy, 160) : null,
      batchNumber: data.product.batchNumber ? sanitizeText(data.product.batchNumber, 60) : "MSH-2026-B1",
      image: primaryImgCheck.sanitized,
      images: sanitizedGallery.length > 0 ? sanitizedGallery : [primaryImgCheck.sanitized],
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
            return { success: false, error: `Supabase database error: ${saveErr.message}` };
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
      } catch (err: any) {
        console.warn("[saveProductServerFn] Supabase save exception:", err);
        return { success: false, error: `Supabase save exception: ${err?.message || "Unknown error"}` };
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

    serverCache.invalidateTags("products");
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
          const { error: delErr } = await client.from("products").delete().eq("id", data.id);
          if (delErr) {
            return { success: false, error: `Supabase delete error: ${delErr.message}` };
          }
          await client.from("audit_logs").insert({
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: "Product Deleted",
            category: "Product",
            details: `Product ID "${data.id}" was deleted from Supabase catalog.`,
            user: auth.user?.email || "Admin",
          });
        }
      } catch (err: any) {
        console.warn("[deleteProductServerFn] Supabase delete exception:", err);
        return { success: false, error: `Supabase delete exception: ${err?.message || "Unknown error"}` };
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

    serverCache.invalidateTags("products");
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

    serverCache.invalidateTags("products");
    return { success: true, count: records.length };
  });
