import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_PRODUCTS,
  DEFAULT_COUPONS,
  DEFAULT_SETTINGS,
  DEFAULT_REVIEWS,
  DEFAULT_ORDERS,
} from "../src/lib/products-store";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const client = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function seed() {
  console.log("🌟 Seeding Supabase database for M.shaies Haute Parfumerie...");

  // 1. Settings
  console.log("1️⃣ Seeding store settings...");
  const { error: settingsErr } = await client.from("store_settings").upsert({
    id: "default",
    announcement_text: DEFAULT_SETTINGS.announcementText,
    announcement_code: DEFAULT_SETTINGS.announcementCode,
    announcement_active: DEFAULT_SETTINGS.announcementActive,
    free_shipping_threshold: DEFAULT_SETTINGS.freeShippingThreshold,
    standard_shipping_fee: DEFAULT_SETTINGS.standardShippingFee,
    express_shipping_fee: DEFAULT_SETTINGS.expressShippingFee,
    express_shipping_active: DEFAULT_SETTINGS.expressShippingActive,
    lahore_local_fee: DEFAULT_SETTINGS.lahoreLocalFee,
    lahore_local_active: DEFAULT_SETTINGS.lahoreLocalActive,
    cod_fee: DEFAULT_SETTINGS.codFee,
    free_shipping_enabled: DEFAULT_SETTINGS.freeShippingEnabled,
    shipping_estimate_days: DEFAULT_SETTINGS.shippingEstimateDays,
    courier_partners: DEFAULT_SETTINGS.courierPartners,
    whatsapp_number: DEFAULT_SETTINGS.whatsappNumber,
    contact_email: DEFAULT_SETTINGS.contactEmail,
    instagram_url: DEFAULT_SETTINGS.instagramUrl,
    facebook_url: DEFAULT_SETTINGS.facebookUrl,
    tiktok_url: DEFAULT_SETTINGS.tiktokUrl,
    auto_lock_minutes: DEFAULT_SETTINGS.autoLockMinutes,
    admin_pin: DEFAULT_SETTINGS.adminPin,
    updated_at: new Date().toISOString(),
  });
  if (settingsErr) console.error("Error seeding settings:", settingsErr);

  // 2. Products
  console.log(`2️⃣ Seeding ${DEFAULT_PRODUCTS.length} signature fragrances...`);
  for (const p of DEFAULT_PRODUCTS) {
    const { error: prodErr } = await client.from("products").upsert({
      id: p.id,
      name: p.name,
      price: p.price,
      category: p.category,
      volume: p.volume,
      stock: p.stock,
      tagline: p.tagline,
      notes: p.notes,
      top_notes: p.topNotes,
      heart_notes: p.heartNotes,
      base_notes: p.baseNotes,
      image: p.image,
      accent: p.accent,
      description: p.description,
      is_featured: p.isFeatured,
      gender: p.gender || "Unisex",
      longevity_hours: p.longevityHours || 18,
      sillage_rating: p.sillageRating || "Strong",
      season_suitability: p.seasonSuitability || ["All-Season"],
      occasion_suitability: p.occasionSuitability || ["Daily Office", "Evening Gala"],
      inspired_by: p.inspiredBy,
      fragrance_family: p.fragranceFamily || "Woody Oud",
      layering_pair_id: p.layeringPairId,
      sample_price: p.samplePrice || 650,
      batch_number: p.batchNumber || "MSH-2026-B1",
      updated_at: new Date().toISOString(),
    });
    if (prodErr) console.error(`Error seeding product ${p.name}:`, prodErr);

    // Variants
    const samplePrice = p.samplePrice || 650;
    const variants = [
      { id: `${p.id}-3ml`, product_id: p.id, size_label: "3ml Discovery Sample Flacon", concentration: "Pure Oil Flacon", price: samplePrice, stock: 50 },
      { id: `${p.id}-6ml`, product_id: p.id, size_label: "6ml Pocket Attar", concentration: "Pure Concentrated Oil", price: Math.round(p.price * 0.65), stock: 30 },
      { id: `${p.id}-12ml`, product_id: p.id, size_label: "12ml Signature Crystal Flacon", concentration: "Pure Concentrated Oil", price: p.price, stock: p.stock },
      { id: `${p.id}-50ml`, product_id: p.id, size_label: "50ml Extrait De Parfum", concentration: "Extrait De Parfum (35% Conc.)", price: Math.round(p.price * 1.8), stock: 15 },
    ];
    for (const v of variants) {
      await client.from("product_variants").upsert(v);
    }
  }

  // 3. Coupons
  console.log(`3️⃣ Seeding ${DEFAULT_COUPONS.length} privilege vouchers...`);
  for (const c of DEFAULT_COUPONS) {
    const { error: cErr } = await client.from("coupons").upsert({
      id: c.id,
      code: c.code,
      type: c.type,
      value: c.value,
      min_order: c.minOrder,
      max_uses: c.maxUses,
      used_count: c.usedCount,
      expiry_date: c.expiryDate,
      is_active: c.isActive,
      description: c.description,
    });
    if (cErr) console.error(`Error seeding coupon ${c.code}:`, cErr);
  }

  // 4. Reviews
  console.log(`4️⃣ Seeding ${DEFAULT_REVIEWS.length} customer reviews...`);
  for (const r of DEFAULT_REVIEWS) {
    await client.from("product_reviews").upsert({
      id: r.id,
      product_id: r.productId,
      author: r.author,
      city: r.city,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      date: r.date,
      verified: r.verified,
      helpful_count: r.helpfulCount,
    });
  }

  // 5. Orders & Customers
  console.log(`5️⃣ Seeding ${DEFAULT_ORDERS.length} initial CRM orders & customer dossiers...`);
  for (const o of DEFAULT_ORDERS) {
    // Upsert customer
    const customerId = `cust-${o.phone.replace(/[^0-9]/g, "")}`;
    await client.from("customers").upsert({
      id: customerId,
      name: o.customerName,
      phone: o.phone,
      email: o.email || `${o.customerName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      city: o.city,
      address: o.address,
      total_spent: o.total,
      order_count: 1,
      loyalty_tier: o.total > 20000 ? "Royal Connoisseur" : o.total > 10000 ? "Private Reserve" : "Valued Client",
      updated_at: new Date().toISOString(),
    });

    // Upsert order
    await client.from("orders").upsert({
      id: o.id,
      customer_id: customerId,
      customer_name: o.customerName,
      email: o.email,
      phone: o.phone,
      address: o.address,
      city: o.city,
      postal_code: o.postalCode,
      payment_method: o.paymentMethod,
      payment_status: o.paymentStatus,
      transaction_id: o.transactionId,
      subtotal: o.subtotal,
      discount_code: o.discountCode,
      discount_amount: o.discountAmount,
      shipping: o.shipping,
      total: o.total,
      order_status: o.orderStatus,
      courier_name: o.courierName,
      tracking_number: o.trackingNumber,
      is_gift_wrapped: o.isGiftWrapped,
      gift_message: o.giftMessage,
      created_at: o.createdAt || new Date().toISOString(),
    });

    // Order items
    for (const item of o.items) {
      await client.from("order_items").upsert({
        id: `${o.id}-${item.productId}-${item.volume.replace(/\s+/g, "")}`,
        order_id: o.id,
        product_id: item.productId,
        name: item.name,
        price: item.price,
        qty: item.qty,
        volume: item.volume,
        image: item.image,
      });
    }
  }

  // 6. Audit Log
  await client.from("audit_logs").insert({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: "Database Initialized",
    category: "System",
    details: "Supabase cloud database successfully seeded with initial catalog, patrons, vouchers, and settings.",
    user: "System Setup",
  });

  console.log("🎉 SUCCESS: Entire database seeded into Supabase!");
}

seed();
