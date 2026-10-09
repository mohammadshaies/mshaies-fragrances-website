import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, schema, isDatabaseConfigured } from "../db/client.server";
import { verifyAdminSession } from "../supabase.server";
import { eq } from "drizzle-orm";

export const getPublicSettingsServerFn = createServerFn({ method: "GET" })
  .handler(async () => {
    if (isDatabaseConfigured() && db) {
      try {
        const rows = await db.select().from(schema.storeSettings).limit(1);
        if (rows.length > 0) {
          const s = rows[0];
          // Strip out adminPin and any internal secrets before sending to client (Amendment 2)
          return {
            success: true,
            settings: {
              announcementText: s.announcementText,
              announcementCode: s.announcementCode,
              announcementActive: s.announcementActive,
              freeShippingThreshold: s.freeShippingThreshold,
              standardShippingFee: s.standardShippingFee,
              expressShippingFee: s.expressShippingFee,
              expressShippingActive: s.expressShippingActive,
              lahoreLocalFee: s.lahoreLocalFee,
              lahoreLocalActive: s.lahoreLocalActive,
              codFee: s.codFee,
              freeShippingEnabled: s.freeShippingEnabled,
              shippingEstimateDays: s.shippingEstimateDays,
              courierPartners: s.courierPartners,
              whatsappNumber: s.whatsappNumber,
              contactEmail: s.contactEmail,
              instagramUrl: s.instagramUrl,
              facebookUrl: s.facebookUrl,
              tiktokUrl: s.tiktokUrl,
              autoLockMinutes: s.autoLockMinutes,
              heroBannerActive: s.heroBannerActive ?? true,
              heroBannerImage: s.heroBannerImage ?? "/product-box.jpg",
              heroBannerLink: s.heroBannerLink ?? "/shop",
              heroBannerAlt: s.heroBannerAlt ?? "Maison Luxury Promotions & Festive Offers",
              heroBannerAnimation: (s.heroBannerAnimation as any) ?? "fadeIn",
            },
          };
        }
      } catch (err) {
        console.warn("[getPublicSettingsServerFn] DB read failed:", err);
      }
    }

    return {
      success: true,
      settings: null,
    };
  });

export const getAdminSettingsServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ authToken: z.string().optional() }))
  .handler(async ({ data }) => {
    const auth = await verifyAdminSession(data.authToken);
    if (!auth.valid) {
      return { success: false, error: auth.error || "Unauthorized admin access." };
    }

    if (isDatabaseConfigured() && db) {
      try {
        const rows = await db.select().from(schema.storeSettings).limit(1);
        if (rows.length > 0) {
          return { success: true, settings: rows[0] };
        }
      } catch (err: any) {
        return { success: false, error: err?.message || "Failed to fetch settings." };
      }
    }

    return { success: true, settings: null };
  });

export const updateSettingsServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      authToken: z.string().optional(),
      settings: z.record(z.any()),
    })
  )
  .handler(async ({ data }) => {
    const auth = await verifyAdminSession(data.authToken);
    if (!auth.valid) {
      return { success: false, error: auth.error || "Unauthorized admin action." };
    }

    // Strictly ensure no geminiApiKey or external secrets can be saved into DB (Amendment 2)
    const { geminiApiKey, ...safeSettings } = data.settings;

    if (isDatabaseConfigured() && db) {
      try {
        await db
          .insert(schema.storeSettings)
          .values({ id: "default", ...safeSettings, updatedAt: new Date() } as any)
          .onConflictDoUpdate({
            target: schema.storeSettings.id,
            set: { ...safeSettings, updatedAt: new Date() } as any,
          });

        await db.insert(schema.auditLogs).values({
          id: `log-${Date.now()}`,
          timestamp: new Date(),
          action: "Settings Updated",
          category: "Settings",
          details: "Store parameters, shipping rates, and banner rules updated in database.",
          user: auth.user?.email || "Admin",
        });

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || "Failed to update store settings." };
      }
    }

    return { success: true };
  });

