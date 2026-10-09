import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, schema, isDatabaseConfigured } from "../db/client.server";
import { verifyAdminSession } from "../supabase.server";

export const exportDatabaseBackupServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ authToken: z.string().optional() }))
  .handler(async ({ data }) => {
    const auth = await verifyAdminSession(data.authToken);
    if (!auth.valid) {
      return { success: false, error: auth.error || "Unauthorized admin action." };
    }

    if (isDatabaseConfigured() && db) {
      try {
        const [productsList, ordersList, couponsList, settingsList, auditLogsList] = await Promise.all([
          db.select().from(schema.products),
          db.select().from(schema.orders),
          db.select().from(schema.coupons),
          db.select().from(schema.storeSettings),
          db.select().from(schema.auditLogs),
        ]);

        const backupData = {
          version: "4.0-supabase",
          exportDate: new Date().toISOString(),
          products: productsList,
          orders: ordersList,
          coupons: couponsList,
          settings: settingsList[0] || null,
          auditLogs: auditLogsList,
        };

        return { success: true, backupJson: JSON.stringify(backupData, null, 2) };
      } catch (err: any) {
        return { success: false, error: err?.message || "Failed to export database backup." };
      }
    }

    return { success: false, error: "Database not configured." };
  });

export const restoreDatabaseBackupServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      authToken: z.string().optional(),
      backupJson: z.string().min(2),
    })
  )
  .handler(async ({ data }) => {
    const auth = await verifyAdminSession(data.authToken);
    if (!auth.valid) {
      return { success: false, error: auth.error || "Unauthorized admin action." };
    }

    if (!isDatabaseConfigured() || !db) {
      return { success: false, error: "Database connection not available." };
    }

    try {
      const parsed = JSON.parse(data.backupJson);

      if (parsed.products && Array.isArray(parsed.products)) {
        for (const p of parsed.products) {
          await db
            .insert(schema.products)
            .values(p)
            .onConflictDoUpdate({
              target: schema.products.id,
              set: p,
            });
        }
      }

      if (parsed.coupons && Array.isArray(parsed.coupons)) {
        for (const c of parsed.coupons) {
          await db
            .insert(schema.coupons)
            .values(c)
            .onConflictDoUpdate({
              target: schema.coupons.id,
              set: c,
            });
        }
      }

      if (parsed.settings) {
        const { geminiApiKey, ...safeSettings } = parsed.settings;
        await db
          .insert(schema.storeSettings)
          .values({ id: "default", ...safeSettings, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: schema.storeSettings.id,
            set: safeSettings,
          });
      }

      await db.insert(schema.auditLogs).values({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        action: "Database Restored",
        category: "System",
        details: "Database successfully restored from JSON backup archive.",
        user: auth.user?.email || "Admin",
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Invalid backup JSON." };
    }
  });

