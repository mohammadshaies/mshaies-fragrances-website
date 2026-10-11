import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, schema, isDatabaseConfigured } from "../db/client.server";
import { getSupabaseAdmin, getSupabaseClient, isSupabaseConfigured, verifyAdminSession } from "../supabase.server";
import { eq } from "drizzle-orm";
import { serverCache } from "../cache.server";

function mapSupabaseSettings(s: any) {
  return {
    announcementText: s.announcement_text ?? s.announcementText ?? "✨ Grand Inaugural Gift: Complimentary 3ml Pure Attar with orders above ₨ 5,000",
    announcementCode: s.announcement_code ?? s.announcementCode ?? "ROYALTY10",
    announcementActive: s.announcement_active ?? s.announcementActive ?? true,
    freeShippingThreshold: Number(s.free_shipping_threshold ?? s.freeShippingThreshold ?? 5000),
    standardShippingFee: Number(s.standard_shipping_fee ?? s.standardShippingFee ?? 400),
    expressShippingFee: Number(s.express_shipping_fee ?? s.expressShippingFee ?? 450),
    expressShippingActive: Boolean(s.express_shipping_active ?? s.expressShippingActive ?? true),
    lahoreLocalFee: Number(s.lahore_local_fee ?? s.lahoreLocalFee ?? 150),
    lahoreLocalActive: Boolean(s.lahore_local_active ?? s.lahoreLocalActive ?? true),
    codFee: Number(s.cod_fee ?? s.codFee ?? 0),
    freeShippingEnabled: Boolean(s.free_shipping_enabled ?? s.freeShippingEnabled ?? true),
    shippingEstimateDays: s.shipping_estimate_days ?? s.shippingEstimateDays ?? "2-4 Business Days Nationwide",
    whatsappNumber: s.whatsapp_number ?? s.whatsappNumber ?? "+923390001829",
    contactEmail: s.contact_email ?? s.contactEmail ?? "info@mshaies.com",
    instagramUrl: s.instagram_url ?? s.instagramUrl ?? "https://instagram.com/mshaiesfragrances",
    facebookUrl: s.facebook_url ?? s.facebookUrl ?? "https://facebook.com/mshaiesfragrances",
    tiktokUrl: s.tiktok_url ?? s.tiktokUrl ?? "https://tiktok.com/@mshaiesfragrances",
    autoLockMinutes: Number(s.auto_lock_minutes ?? s.autoLockMinutes ?? 15),
    adminPin: s.admin_pin ?? s.adminPin ?? "7860",
    paymentAccountTitle: s.payment_account_title ?? s.paymentAccountTitle ?? "Muhammad Shees",
    paymentAccountNumber: s.payment_account_number ?? s.paymentAccountNumber ?? "03325568922",
    paymentAccountFormatted: s.payment_account_formatted ?? s.paymentAccountFormatted ?? "0332 5568922",
    paymentWhatsapp: s.payment_whatsapp ?? s.paymentWhatsapp ?? "+923390001829",
    jazzcashActive: Boolean(s.jazzcash_active ?? s.jazzcashActive ?? true),
    easypaisaActive: Boolean(s.easypaisa_active ?? s.easypaisaActive ?? true),
    nayapayActive: Boolean(s.nayapay_active ?? s.nayapayActive ?? true),
    jazzcashTitle: s.jazzcash_title ?? s.jazzcashTitle ?? "Muhammad Shees",
    jazzcashNumber: s.jazzcash_number ?? s.jazzcashNumber ?? "03325568922",
    easypaisaTitle: s.easypaisa_title ?? s.easypaisaTitle ?? "Muhammad Shees",
    easypaisaNumber: s.easypaisa_number ?? s.easypaisaNumber ?? "03325568922",
    nayapayTitle: s.nayapay_title ?? s.nayapayTitle ?? "Muhammad Shees",
    nayapayNumber: s.nayapay_number ?? s.nayapayNumber ?? "03325568922",
    heroBannerActive: s.hero_banner_active ?? s.heroBannerActive ?? true,
    heroBannerImage: s.hero_banner_image ?? s.heroBannerImage ?? "/product-box.jpg",
    heroBannerLink: s.hero_banner_link ?? s.heroBannerLink ?? "/shop",
    heroBannerAlt: s.hero_banner_alt ?? s.heroBannerAlt ?? "Maison Luxury Promotions",
    heroBannerAnimation: s.hero_banner_animation ?? s.heroBannerAnimation ?? "fadeIn",
    heroBannerTag: s.hero_banner_tag ?? s.heroBannerTag,
    heroBannerTitle: s.hero_banner_title ?? s.heroBannerTitle,
    heroBannerSubtitle: s.hero_banner_subtitle ?? s.heroBannerSubtitle,
    heroBannerButtonText: s.hero_banner_button_text ?? s.heroBannerButtonText,
    heroBannerTransitionEffect: s.hero_banner_transition_effect ?? s.heroBannerTransitionEffect,
    heroBannerTransitionSpeed: s.hero_banner_transition_speed ?? s.heroBannerTransitionSpeed,
    heroBannerShimmer: s.hero_banner_shimmer ?? s.heroBannerShimmer,
    flaconSizes: Array.isArray(s.flacon_sizes)
      ? s.flacon_sizes
      : (Array.isArray(s.flaconSizes) ? s.flaconSizes : undefined),
    promotionalSlides: Array.isArray(s.promotional_slides)
      ? s.promotional_slides
      : (Array.isArray(s.promotionalSlides) ? s.promotionalSlides : undefined),
    announcementItems: Array.isArray(s.announcement_items)
      ? s.announcement_items
      : (Array.isArray(s.announcementItems) ? s.announcementItems : undefined),
  };
}

async function enrichBannerConfig(client: any, mapped: any) {
  try {
    const { data: bannerLog } = await client
      .from("audit_logs")
      .select("details")
      .eq("id", "system-config-banners")
      .maybeSingle();
    if (bannerLog?.details) {
      const parsed = JSON.parse(bannerLog.details);
      if (Array.isArray(parsed.promotionalSlides)) mapped.promotionalSlides = parsed.promotionalSlides;
      if (Array.isArray(parsed.announcementItems)) mapped.announcementItems = parsed.announcementItems;
      if (parsed.heroBannerActive !== undefined) mapped.heroBannerActive = parsed.heroBannerActive;
      if (parsed.heroBannerTag !== undefined) mapped.heroBannerTag = parsed.heroBannerTag;
      if (parsed.heroBannerTitle !== undefined) mapped.heroBannerTitle = parsed.heroBannerTitle;
      if (parsed.heroBannerSubtitle !== undefined) mapped.heroBannerSubtitle = parsed.heroBannerSubtitle;
      if (parsed.heroBannerButtonText !== undefined) mapped.heroBannerButtonText = parsed.heroBannerButtonText;
      if (parsed.heroBannerLink !== undefined) mapped.heroBannerLink = parsed.heroBannerLink;
      if (parsed.heroBannerImage !== undefined) mapped.heroBannerImage = parsed.heroBannerImage;
      if (parsed.heroBannerTransitionEffect !== undefined) mapped.heroBannerTransitionEffect = parsed.heroBannerTransitionEffect;
      if (parsed.heroBannerTransitionSpeed !== undefined) mapped.heroBannerTransitionSpeed = parsed.heroBannerTransitionSpeed;
      if (parsed.heroBannerShimmer !== undefined) mapped.heroBannerShimmer = parsed.heroBannerShimmer;
    }
  } catch (err) {
    // Ignore
  }
}

export const getPublicSettingsServerFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return serverCache.getOrSet(
      "settings:public",
      async () => {
        if (isSupabaseConfigured()) {
          try {
            const client = getSupabaseAdmin() || getSupabaseClient();
            if (client) {
              const { data, error } = await client.from("store_settings").select("*").limit(1).maybeSingle();
              if (!error && data) {
                const mapped = mapSupabaseSettings(data);
                await enrichBannerConfig(client, mapped);
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
      },
      600,
      ["settings"]
    );
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
            const mapped = mapSupabaseSettings(s);
            await enrichBannerConfig(client, mapped);
            return { success: true, settings: mapped, source: "supabase" };
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
    if (safeSettings.flaconSizes !== undefined) supabasePayload.flacon_sizes = safeSettings.flaconSizes;

    const bannerPayload = {
      promotionalSlides: safeSettings.promotionalSlides,
      announcementItems: safeSettings.announcementItems,
      heroBannerActive: safeSettings.heroBannerActive,
      heroBannerTag: safeSettings.heroBannerTag,
      heroBannerTitle: safeSettings.heroBannerTitle,
      heroBannerSubtitle: safeSettings.heroBannerSubtitle,
      heroBannerButtonText: safeSettings.heroBannerButtonText,
      heroBannerLink: safeSettings.heroBannerLink,
      heroBannerImage: safeSettings.heroBannerImage,
      heroBannerTransitionEffect: safeSettings.heroBannerTransitionEffect,
      heroBannerTransitionSpeed: safeSettings.heroBannerTransitionSpeed,
      heroBannerShimmer: safeSettings.heroBannerShimmer,
    };

    const hasBannerUpdates = Object.values(bannerPayload).some((v) => v !== undefined);

    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          const { error: upsertErr } = await client.from("store_settings").upsert(supabasePayload);
          if (upsertErr && (upsertErr.message?.includes("flacon_sizes") || (upsertErr as any).code === "42703")) {
            delete supabasePayload.flacon_sizes;
            await client.from("store_settings").upsert(supabasePayload);
          }

          if (hasBannerUpdates) {
            await client.from("audit_logs").upsert({
              id: "system-config-banners",
              timestamp: new Date().toISOString(),
              action: "BANNER_CONFIG_SYNC",
              category: "Settings",
              details: JSON.stringify(bannerPayload),
              user: auth.user?.email || "Admin",
            });
          }

          await client.from("audit_logs").insert({
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: "Settings Updated",
            category: "Settings",
            details: "Store parameters, shipping rates, and banner configurations updated in Supabase.",
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

    serverCache.invalidateTags("settings");
    return { success: true };
  });
