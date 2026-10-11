import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { serverCache } from "../cache.server";
import { verifyAdminSession } from "../supabase.server";

export const getCacheStatsServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      authToken: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const auth = await verifyAdminSession(data.authToken);
    if (!auth.valid) {
      return { success: false, error: auth.error || "Unauthorized admin access." };
    }

    const stats = serverCache.getStats();
    return { success: true, stats };
  });

export const purgeServerCacheFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      authToken: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
  )
  .handler(async ({ data }) => {
    const auth = await verifyAdminSession(data.authToken);
    if (!auth.valid) {
      return { success: false, error: auth.error || "Unauthorized admin action." };
    }

    if (data.tags && data.tags.length > 0) {
      const purgedCount = serverCache.invalidateTags(...data.tags);
      return { success: true, message: `Purged ${purgedCount} entries matching tags: ${data.tags.join(", ")}` };
    }

    serverCache.purgeAll();
    return { success: true, message: "Entire in-memory server cache has been cleared." };
  });
