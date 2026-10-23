import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { useProductsStore } from "@/lib/products-store";
import { initTracking, trackPageView } from "@/lib/pixel-tracking";

export function PixelTracker() {
  const { settings } = useProductsStore();
  const location = useLocation();
  const lastPathRef = useRef<string>("");

  // Initialize scripts whenever settings change
  useEffect(() => {
    if (settings) {
      initTracking({
        metaPixelId: settings.metaPixelId,
        metaPixelEnabled: settings.metaPixelEnabled,
        googleTagId: settings.googleTagId,
        googleTagEnabled: settings.googleTagEnabled,
      });
    }
  }, [
    settings?.metaPixelId,
    settings?.metaPixelEnabled,
    settings?.googleTagId,
    settings?.googleTagEnabled,
  ]);

  // Track route transitions on pathname changes
  useEffect(() => {
    const currentPath = location.pathname;
    if (lastPathRef.current && lastPathRef.current !== currentPath) {
      trackPageView(currentPath);
    }
    lastPathRef.current = currentPath;
  }, [location.pathname]);

  return null;
}
