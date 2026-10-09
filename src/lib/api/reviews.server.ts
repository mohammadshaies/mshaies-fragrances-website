import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, schema, isDatabaseConfigured } from "../db/client.server";
import { getSupabaseAdmin, getSupabaseClient, isSupabaseConfigured } from "../supabase.server";
import { eq, sql } from "drizzle-orm";

function mapSupabaseReview(r: any) {
  return {
    id: r.id,
    productId: r.product_id ?? r.productId,
    author: r.author,
    city: r.city,
    rating: Number(r.rating),
    title: r.title,
    comment: r.comment,
    date: r.date,
    verified: Boolean(r.verified),
    helpfulCount: Number(r.helpful_count ?? r.helpfulCount ?? 0),
  };
}

export const getReviewsServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      productId: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          let query = client.from("product_reviews").select("*");
          if (data.productId) {
            query = query.eq("product_id", data.productId);
          }
          const { data: rows, error } = await query;
          if (!error && Array.isArray(rows)) {
            return { success: true, reviews: rows.map(mapSupabaseReview), source: "supabase" };
          }
        }
      } catch (err) {
        console.warn("[getReviewsServerFn] Supabase read error:", err);
      }
    }

    if (isDatabaseConfigured() && db) {
      try {
        if (data.productId) {
          const rows = await db.select().from(schema.productReviews).where(eq(schema.productReviews.productId, data.productId));
          return { success: true, reviews: rows, source: "database" };
        }
        const rows = await db.select().from(schema.productReviews);
        return { success: true, reviews: rows, source: "database" };
      } catch (err: any) {
        return { success: false, error: err?.message };
      }
    }
    return { success: true, reviews: [], source: "none" };
  });

export const addReviewServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      productId: z.string(),
      author: z.string().min(1),
      city: z.string().default("Pakistan"),
      rating: z.number().int().min(1).max(5),
      title: z.string().min(1),
      comment: z.string().min(3),
    })
  )
  .handler(async ({ data }) => {
    const newRecord = {
      id: `rev-${Date.now()}`,
      productId: data.productId,
      author: data.author,
      city: data.city,
      rating: data.rating,
      title: data.title,
      comment: data.comment,
      date: new Date().toISOString().split("T")[0],
      verified: false,
      helpfulCount: 0,
    };

    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          await client.from("product_reviews").insert({
            id: newRecord.id,
            product_id: newRecord.productId,
            author: newRecord.author,
            city: newRecord.city,
            rating: newRecord.rating,
            title: newRecord.title,
            comment: newRecord.comment,
            date: newRecord.date,
            verified: newRecord.verified,
            helpful_count: newRecord.helpfulCount,
          });
        }
      } catch (err) {
        console.warn("[addReviewServerFn] Supabase insert error:", err);
      }
    }

    if (isDatabaseConfigured() && db) {
      try {
        await db.insert(schema.productReviews).values(newRecord as any);
      } catch (err: any) {
        console.warn("[addReviewServerFn] DB insert error:", err);
      }
    }

    return { success: true, review: newRecord };
  });

export const voteHelpfulServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().optional(), reviewId: z.string().optional() }))
  .handler(async ({ data }) => {
    const targetId = data.reviewId || data.id;
    if (!targetId) return { success: false, error: "Missing review ID" };

    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          const { data: current } = await client.from("product_reviews").select("helpful_count").eq("id", targetId).maybeSingle();
          const nextCount = ((current?.helpful_count ?? 0) + 1);
          await client.from("product_reviews").update({ helpful_count: nextCount }).eq("id", targetId);
        }
      } catch (err) {
        console.warn("[voteHelpfulServerFn] Supabase error:", err);
      }
    }

    if (isDatabaseConfigured() && db) {
      try {
        await db
          .update(schema.productReviews)
          .set({ helpfulCount: sql`${schema.productReviews.helpfulCount} + 1` })
          .where(eq(schema.productReviews.id, targetId));
      } catch (err: any) {
        console.warn("[voteHelpfulServerFn] DB error:", err);
      }
    }

    return { success: true };
  });
