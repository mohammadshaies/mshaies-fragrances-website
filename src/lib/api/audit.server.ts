import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, schema, isDatabaseConfigured } from "../db/client.server";
import { getSupabaseAdmin, getSupabaseClient, isSupabaseConfigured, verifyAdminSession } from "../supabase.server";
import { desc } from "drizzle-orm";

function mapSupabaseAuditLog(row: any) {
  return {
    id: row.id,
    timestamp: row.timestamp,
    action: row.action,
    category: row.category,
    details: row.details,
    user: row.user || "Staff Admin",
  };
}

export const getAuditLogsServerFn = createServerFn({ method: "POST" })
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
          const { data: rows, error } = await client
            .from("audit_logs")
            .select("*")
            .order("timestamp", { ascending: false })
            .limit(100);

          if (!error && Array.isArray(rows)) {
            return { success: true, logs: rows.map(mapSupabaseAuditLog), source: "supabase" };
          }
        }
      } catch (err) {
        console.warn("[getAuditLogsServerFn] Supabase read error:", err);
      }
    }

    if (isDatabaseConfigured() && db) {
      try {
        const rows = await db.select().from(schema.auditLogs).orderBy(desc(schema.auditLogs.timestamp)).limit(100);
        return { success: true, logs: rows, source: "database" };
      } catch (err: any) {
        return { success: false, error: err?.message || "Failed to fetch audit logs." };
      }
    }

    return { success: true, logs: [], source: "none" };
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

    const logRecord = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: data.action,
      category: data.category,
      details: data.details,
      user,
    };

    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          await client.from("audit_logs").insert(logRecord);
        }
      } catch (err) {
        console.warn("[addAuditLogServerFn] Supabase insert error:", err);
      }
    }

    if (isDatabaseConfigured() && db) {
      try {
        await db.insert(schema.auditLogs).values({
          ...logRecord,
          timestamp: new Date(),
        } as any);
      } catch (err: any) {
        console.warn("[addAuditLogServerFn] DB insert error:", err);
      }
    }

    return { success: true };
  });
