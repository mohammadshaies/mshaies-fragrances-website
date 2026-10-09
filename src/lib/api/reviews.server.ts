import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, schema, isDatabaseConfigured } from "../db/client.server";
import { eq, sql } from "drizzle-orm";

export const getReviewsServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      productId: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    if (isDatabaseConfigured() && db) {
      try {
        if (data.productId) {
          const rows = await db.select().from(schema.productReviews).where(eq(schema.productReviews.productId, data.productId));
          return { success: true, reviews: rows };
        }
        const rows = await db.select().from(schema.productReviews);
        return { success: true, reviews: rows };
      } catch (err: any) {
        return { success: false, error: err?.message };
      }
    }
    return { success: true, reviews: [] };
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

    if (isDatabaseConfigured() && db) {
      try {
        await db.insert(schema.productReviews).values(newRecord);
        return { success: true, review: newRecord };
      } catch (err: any) {
        return { success: false, error: err?.message };
      }
    }

    return { success: true, review: newRecord };
  });

export const voteHelpfulServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ reviewId: z.string() }))
  .handler(async ({ data }) => {
    if (isDatabaseConfigured() && db) {
      try {
        await db
          .update(schema.productReviews)
          .set({ helpfulCount: sql`${schema.productReviews.helpfulCount} + 1` })
          .where(eq(schema.productReviews.id, data.reviewId));
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message };
      }
    }
    return { success: true };
  });

