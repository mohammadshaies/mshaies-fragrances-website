import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/lib/db/schema";
import { 
  DEFAULT_PRODUCTS, 
  DEFAULT_COUPONS, 
  DEFAULT_SETTINGS, 
  DEFAULT_REVIEWS, 
  DEFAULT_AUDIT_LOGS 
} from "../src/lib/products-store";

const connectionString = process.env.DATABASE_URL;

async function runMigration() {
  if (!connectionString || connectionString.includes("your-project-ref")) {
    console.error("❌ DATABASE_URL is not set or contains placeholder values. Please check your .env file.");
    process.exit(1);
  }

  console.log("🔌 Connecting to Supabase PostgreSQL database...");
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql, { schema });

  try {
    console.log("📦 Seeding store settings...");
    const { geminiApiKey, ...safeSettings } = DEFAULT_SETTINGS as any;
    await db
      .insert(schema.storeSettings)
      .values({ id: "default", ...safeSettings, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: schema.storeSettings.id,
        set: safeSettings,
      });

    console.log(`📦 Seeding ${DEFAULT_PRODUCTS.length} signature fragrances...`);
    for (const p of DEFAULT_PRODUCTS) {
      await db
        .insert(schema.products)
        .values({
          id: p.id,
          name: p.name,
          price: p.price,
          category: p.category,
          volume: p.volume,
          stock: p.stock,
          tagline: p.tagline,
          notes: p.notes,
          topNotes: p.topNotes,
          heartNotes: p.heartNotes,
          baseNotes: p.baseNotes,
          image: p.image,
          accent: p.accent,
          description: p.description,
          isFeatured: p.isFeatured,
          gender: p.gender || "Unisex",
          longevityHours: p.longevityHours || 18,
          sillageRating: p.sillageRating || "Strong",
          seasonSuitability: p.seasonSuitability || ["All-Season"],
          occasionSuitability: p.occasionSuitability || ["Daily Office", "Evening Gala"],
          inspiredBy: p.inspiredBy,
          fragranceFamily: p.fragranceFamily || "Woody Oud",
          layeringPairId: p.layeringPairId,
          samplePrice: p.samplePrice || 650,
          batchNumber: p.batchNumber || "MSH-2026-B1",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: schema.products.id,
          set: {
            name: p.name,
            price: p.price,
            stock: p.stock,
            updatedAt: new Date(),
          },
        });

      // Add default 4-size variants
      const samplePrice = p.samplePrice || 650;
      const variants = [
        { id: `${p.id}-3ml`, sizeLabel: "3ml Discovery Sample Flacon", concentration: "Pure Oil Flacon", price: samplePrice, stock: 50 },
        { id: `${p.id}-6ml`, sizeLabel: "6ml Pocket Attar", concentration: "Pure Concentrated Oil", price: Math.round(p.price * 0.65), stock: 30 },
        { id: `${p.id}-12ml`, sizeLabel: "12ml Signature Crystal Flacon", concentration: "Pure Concentrated Oil", price: p.price, stock: p.stock },
        { id: `${p.id}-50ml`, sizeLabel: "50ml Extrait De Parfum", concentration: "Extrait De Parfum (35% Conc.)", price: Math.round(p.price * 1.8), stock: 15 },
      ];

      for (const v of variants) {
        await db
          .insert(schema.productVariants)
          .values({
            ...v,
            productId: p.id,
          })
          .onConflictDoNothing();
      }
    }

    console.log(`📦 Seeding ${DEFAULT_COUPONS.length} privilege voucher codes...`);
    for (const c of DEFAULT_COUPONS) {
      await db
        .insert(schema.coupons)
        .values({
          id: c.id,
          code: c.code,
          type: c.type,
          value: c.value,
          minOrder: c.minOrder,
          maxUses: c.maxUses,
          usedCount: c.usedCount,
          expiryDate: c.expiryDate,
          isActive: c.isActive,
          description: c.description,
        })
        .onConflictDoUpdate({
          target: schema.coupons.id,
          set: {
            value: c.value,
            isActive: c.isActive,
          },
        });
    }

    console.log(`📦 Seeding ${DEFAULT_REVIEWS.length} customer reviews...`);
    for (const r of DEFAULT_REVIEWS) {
      await db
        .insert(schema.productReviews)
        .values({
          id: r.id,
          productId: r.productId,
          author: r.author,
          city: r.city,
          rating: r.rating,
          title: r.title,
          comment: r.comment,
          date: r.date,
          verified: r.verified,
          helpfulCount: r.helpfulCount,
          createdAt: new Date(),
        })
        .onConflictDoNothing();
    }

    console.log("📦 Recording migration in audit trail...");
    await db.insert(schema.auditLogs).values({
      id: `log-${Date.now()}`,
      timestamp: new Date(),
      action: "Database Initialized",
      category: "System",
      details: "Initial migration successfully transferred catalog, coupons, settings, and reviews into Supabase PostgreSQL.",
      user: "Migration Script",
    });

    console.log("✅ Migration completed successfully! All data is now securely stored in Supabase.");
  } catch (err) {
    console.error("❌ Migration failed with error:", err);
  } finally {
    await sql.end();
  }
}

runMigration();
