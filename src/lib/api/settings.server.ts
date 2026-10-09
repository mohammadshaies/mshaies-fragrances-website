import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, schema, isDatabaseConfigured } from "../db/client.server";
import { getSupabaseAdmin, getSupabaseClient, isSupabaseConfigured, verifyAdminSession } from "../supabase.server";
import { eq } from "drizzle-orm";

function mapSupabaseSettings(s: any) {
  return {
    announcementText: s.announcement_text ?? s.announcementText ?? "✨ Grand Inaugural Gift: Complimentary 3ml Pure Attar with orders above ₨ 5,000",
    announcementCode: s.announcement_code ?? s.announcementCode ?? "ROYALTY10",
    announcementActive: s.announcement_active ?? s.announcementActive ?? true,
    freeShippingThreshold: Number(s.free_shipping_threshold ?? s.freeShippingThreshold ?? 5000),
    standardShippingFee: Number(s.standard_shipping_fee ?? s.standardShippingFee ?? 250),
    expressShippingFee: Number(s.express_shipping_fee ?? s.expressShippingFee ?? 450),
    expressShippingActive: Boolean(s.express_shipping_active ?? s.expressShippingActive ?? true),
    lahoreLocalFee: Number(s.lahore_local_fee ?? s.lahoreLocalFee ?? 150),
    lahoreLocalActive: Boolean(s.lahore_local_active ?? s.lahoreLocalActive ?? true),
    codFee: Number(s.cod_fee ?? s.codFee ?? 0),
    freeShippingEnabled: Boolean(s.free_shipping_enabled ?? s.freeShippingEnabled ?? true),
    shippingEstimateDays: s.shipping_estimate_days ?? s.shippingEstimateDays ?? "2-4 Business Days Nationwide",
    courierPartners: s.courier_partners ?? s.courierPartners ?? ["TCS Express", "Leopards Courier", "Trax Logistics"],
    whatsappNumber: s.whatsapp_number ?? s.whatsappNumber ?? "+92 300 1234567",
    contactEmail: s.contact_email ?? s.contactEmail ?? "concierge@mshaies.com",
    instagramUrl: s.instagram_url ?? s.instagramUrl ?? "https://instagram.com/mshaiesfragrances",
    facebookUrl: s.facebook_url ?? s.facebookUrl ?? "https://facebook.com/mshaiesfragrances",
    tiktokUrl: s.tiktok_url ?? s.tiktokUrl ?? "https://tiktok.com/@mshaiesfragrances",
    autoLockMinutes: Number(s.auto_lock_minutes ?? s.autoLockMinutes ?? 15),
    adminPin: s.admin_pin ?? s.adminPin ?? "7860",
    heroBannerActive: s.hero_banner_active ?? s.heroBannerActive ?? true,
    heroBannerImage: s.hero_banner_image ?? s.heroBannerImage ?? "/product-box.jpg",
    heroBannerLink: s.hero_banner_link ?? s.heroBannerLink ?? "/shop",
    heroBannerAlt: s.hero_banner_alt ?? s.heroBannerAlt ?? "Maison Luxury Promotions",
    heroBannerAnimation: s.hero_banner_animation ?? s.heroBannerAnimation ?? "fadeIn",
  };
}

export const getPublicSettingsServerFn = createServerFn({ method: "GET" })
  .handler(async () => {
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          const { data, error } = await client.from("store_settings").select("*").limit(1).maybeSingle();
          if (!error && data) {
            const mapped = mapSupabaseSettings(data);
            const { adminPin, ...publicSettings } = mapped;
            return {
              success: true,
              settings: publicSettings,
              source: "supabase",
            };
          }
        }
      } catch (err) {
        console.warn("[getPublicSettingsServerFn] Supabase settings error:", err);
      }
    }

    if (isDatabaseConfigured() && db) {
      try {
        const rows = await db.select().from(schema.storeSettings).limit(1);
        if (rows.length > 0) {
          const mapped = mapSupabaseSettings(rows[0]);
          const { adminPin, ...publicSettings } = mapped;
          return {
            success: true,
            settings: publicSettings,
            source: "database",
          };
        }
      } catch (err) {
        console.warn("[getPublicSettingsServerFn] DB read failed:", err);
      }
    }

    return {
      success: true,
      settings: null,
      source: "none",
    };
  });

export const getAdminSettingsServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ authToken: z.string().optional() }))
  .handler(async ({ data }) => {
    const auth = await verifyAdminSession(data.authToken);
    if (!auth.valid) {
      return { success: false, error: auth.error || "Unauthorized admin access." };
    }

    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          const { data: s, error } = await client.from("store_settings").select("*").limit(1).maybeSingle();
          if (!error && s) {
            return { success: true, settings: mapSupabaseSettings(s), source: "supabase" };
          }
        }
      } catch (err) {
        console.warn("[getAdminSettingsServerFn] Supabase error:", err);
      }
    }

    if (isDatabaseConfigured() && db) {
      try {
        const rows = await db.select().from(schema.storeSettings).limit(1);
        if (rows.length > 0) {
          return { success: true, settings: mapSupabaseSettings(rows[0]), source: "database" };
        }
      } catch (err: any) {
        return { success: false, error: err?.message || "Failed to fetch settings." };
      }
    }

    return { success: true, settings: null, source: "none" };
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

    const { geminiApiKey, ...safeSettings } = data.settings;

    const supabasePayload: any = {
      id: "default",
      updated_at: new Date().toISOString(),
    };
    if (safeSettings.announcementText !== undefined) supabasePayload.announcement_text = safeSettings.announcementText;
    if (safeSettings.announcementCode !== undefined) supabasePayload.announcement_code = safeSettings.announcementCode;
    if (safeSettings.announcementActive !== undefined) supabasePayload.announcement_active = safeSettings.announcementActive;
    if (safeSettings.freeShippingThreshold !== undefined) supabasePayload.free_shipping_threshold = safeSettings.freeShippingThreshold;
    if (safeSettings.standardShippingFee !== undefined) supabasePayload.standard_shipping_fee = safeSettings.standardShippingFee;
    if (safeSettings.expressShippingFee !== undefined) supabasePayload.express_shipping_fee = safeSettings.expressShippingFee;
    if (safeSettings.expressShippingActive !== undefined) supabasePayload.express_shipping_active = safeSettings.expressShippingActive;
    if (safeSettings.lahoreLocalFee !== undefined) supabasePayload.lahore_local_fee = safeSettings.lahoreLocalFee;
    if (safeSettings.lahoreLocalActive !== undefined) supabasePayload.lahore_local_active = safeSettings.lahoreLocalActive;
    if (safeSettings.codFee !== undefined) supabasePayload.cod_fee = safeSettings.codFee;
    if (safeSettings.freeShippingEnabled !== undefined) supabasePayload.free_shipping_enabled = safeSettings.freeShippingEnabled;
    if (safeSettings.shippingEstimateDays !== undefined) supabasePayload.shipping_estimate_days = safeSettings.shippingEstimateDays;
    if (safeSettings.courierPartners !== undefined) supabasePayload.courier_partners = safeSettings.courierPartners;
    if (safeSettings.whatsappNumber !== undefined) supabasePayload.whatsapp_number = safeSettings.whatsappNumber;
    if (safeSettings.contactEmail !== undefined) supabasePayload.contact_email = safeSettings.contactEmail;
    if (safeSettings.instagramUrl !== undefined) supabasePayload.instagram_url = safeSettings.instagramUrl;
    if (safeSettings.facebookUrl !== undefined) supabasePayload.facebook_url = safeSettings.facebookUrl;
    if (safeSettings.tiktokUrl !== undefined) supabasePayload.tiktok_url = safeSettings.tiktokUrl;
    if (safeSettings.autoLockMinutes !== undefined) supabasePayload.auto_lock_minutes = safeSettings.autoLockMinutes;
    if (safeSettings.adminPin !== undefined) supabasePayload.admin_pin = safeSettings.adminPin;

    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          await client.from("store_settings").upsert(supabasePayload);
          await client.from("audit_logs").insert({
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: "Settings Updated",
            category: "Settings",
            details: "Store parameters, shipping rates, and security rules updated in Supabase.",
            user: auth.user?.email || "Admin",
          });
        }
      } catch (err) {
        console.warn("[updateSettingsServerFn] Supabase settings update error:", err);
      }
    }

    if (isDatabaseConfigured() && db) {
      try {
        await db
          .insert(schema.storeSettings)
          .values({ id: "default", ...safeSettings, updatedAt: new Date() } as any)
          .onConflictDoUpdate({
            target: schema.storeSettings.id,
            set: { ...safeSettings, updatedAt: new Date() } as any,
          });
      } catch (err) {
        console.warn("[updateSettingsServerFn] DB update error:", err);
      }
    }

    return { success: true };
  });
