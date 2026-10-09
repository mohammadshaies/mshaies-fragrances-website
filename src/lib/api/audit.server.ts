import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, schema, isDatabaseConfigured } from "../db/client.server";
import { verifyAdminSession } from "../supabase.server";
import { desc } from "drizzle-orm";

export const getAuditLogsServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ authToken: z.string().optional() }))
  .handler(async ({ data }) => {
    const auth = await verifyAdminSession(data.authToken);
    if (!auth.valid) {
      return { success: false, error: auth.error || "Unauthorized admin access." };
    }

    if (isDatabaseConfigured() && db) {
      try {
        const rows = await db.select().from(schema.auditLogs).orderBy(desc(schema.auditLogs.timestamp)).limit(100);
        return { success: true, logs: rows };
      } catch (err: any) {
        return { success: false, error: err?.message || "Failed to fetch audit logs." };
      }
    }

    return { success: true, logs: [] };
  });

export const addAuditLogServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      authToken: z.string().optional(),
      action: z.string(),
      category: z.enum(["Product", "Stock", "Order", "Discount", "Settings", "System"]),
      details: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const auth = await verifyAdminSession(data.authToken);
    const user = auth.user?.email || "Staff Admin";

    if (isDatabaseConfigured() && db) {
      try {
        await db.insert(schema.auditLogs).values({
          id: `log-${Date.now()}`,
          timestamp: new Date(),
          action: data.action,
          category: data.category,
          details: data.details,
          user,
        });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message };
      }
    }

    return { success: true };
  });

