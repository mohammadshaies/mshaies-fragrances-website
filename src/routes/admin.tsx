import { createFileRoute, Link } from "@tanstack/react-router";
import { useProductsStore, type Product, type Coupon, type Order, DEFAULT_FLACON_SIZES, type FlaconSizeOption } from "@/lib/products-store";
import { formatPKR } from "@/lib/cart-context";
import { useState, useEffect, useMemo } from "react";
import { 
  Package, 
  Tag, 
  Layers, 
  Receipt, 
  Plus, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw,
  Sparkles,
  TrendingUp,
  DollarSign,
  Boxes,
  Eye,
  Lock,
  Unlock,
  KeyRound,
  ArrowLeft,
  Percent,
  Download,
  Upload,
  MessageCircle,
  Truck,
  Smartphone,
  Calendar,
  Gift,
  Check,
  Power,
  Sliders,
  Megaphone,
  Shield,
  Copy,
  Globe,
  Share2,
  Users,
  UserCheck,
  Search,
  MapPin,
  CreditCard,
  X,
  FileSpreadsheet,
  Settings as SettingsIcon,
  History,
  UploadCloud,
  ShieldAlert,
  Award,
  Mail,
  Briefcase,
  Clock,
  UserPlus,
  ExternalLink,
  Image as ImageIcon,
  BarChart3,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Zap,
  Target,
  Flame,
  Droplets,
  Box,
  ShoppingBag,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { adminLoginServerFn, adminVerifyPinServerFn, verifyAdminStatusServerFn } from "@/lib/api/auth.server";
import type { JobPosting } from "@/lib/products-store";
import { PromotionalBanner } from "@/components/PromotionalBanner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Staff & Business Management Console — M.shaies" },
      { name: "robots", content: "noindex, nofollow" }
    ]
  }),
  component: AdminDashboard,
});

type TabType = "analytics" | "inventory" | "products" | "categories" | "orders" | "customers" | "shipping" | "coupons" | "banner" | "marketing" | "jobs" | "settings" | "audit";

const AUTH_SESSION_KEY = "mshaies_staff_auth_v2";

/**
 * Optimizes an uploaded image client-side to responsive web dimensions (max 1000px)
 * and exports as crisp WebP/JPEG data URL for storage and instant rendering.
 */
function compressImageFile(file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window is not available"));
      return;
    }
    if (file.type === "image/svg+xml") {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        try {
          const dataUrl = canvas.toDataURL("image/webp", quality);
          resolve(dataUrl);
        } catch {
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUrl);
        }
      };
      img.onerror = () => reject(new Error("Unable to decode selected image file."));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Unable to read selected image file."));
    reader.readAsDataURL(file);
  });
}

interface ProductGalleryManagerProps {
  images: string[];
  onChange: (images: string[]) => void;
  urlInput: string;
  setUrlInput: (val: string) => void;
}

function ProductGalleryManager({ images, onChange, urlInput, setUrlInput }: ProductGalleryManagerProps) {
  const currentImages = (images && images.length > 0) ? images : ["/product-box.jpg"];

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 5 - currentImages.length;
    if (remainingSlots <= 0) {
      toast.error("Maximum 5 photos reached for this product.");
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    toast.loading(`Processing ${filesToProcess.length} image(s)...`, { id: "gallery-upload" });

    try {
      const processedUrls: string[] = [];
      for (const file of filesToProcess) {
        const compressed = await compressImageFile(file);
        processedUrls.push(compressed);
      }
      onChange([...currentImages, ...processedUrls]);
      toast.success(`Added ${processedUrls.length} photo(s) to gallery!`, { id: "gallery-upload" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to process image file.", { id: "gallery-upload" });
    }
  };

  const handleAddUrl = () => {
    if (!urlInput.trim()) {
      toast.error("Please enter a valid image URL or path.");
      return;
    }
    if (currentImages.length >= 5) {
      toast.error("Maximum 5 photos reached.");
      return;
    }
    onChange([...currentImages, urlInput.trim()]);
    setUrlInput("");
    toast.success("Added image to gallery!");
  };

  const handleAddPreset = (url: string) => {
    if (currentImages.length >= 5) {
      toast.error("Maximum 5 photos reached.");
      return;
    }
    onChange([...currentImages, url]);
    toast.success("Added preset photo to gallery!");
  };

  const handleRemove = (index: number) => {
    if (currentImages.length <= 1) {
      toast.error("At least 1 product display image is required.");
      return;
    }
    const updated = currentImages.filter((_, idx) => idx !== index);
    onChange(updated);
    toast.success("Removed photo from gallery.");
  };

  const handleMakePrimary = (index: number) => {
    if (index === 0) return;
    const target = currentImages[index];
    const rest = currentImages.filter((_, idx) => idx !== index);
    onChange([target, ...rest]);
    toast.success("Set as Primary Display Image!");
  };

  return (
    <div className="sm:col-span-2 p-5 rounded-3xl border border-gold/40 bg-pearl/40 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <ImageIcon className="size-4 text-gold-deep" />
          <h4 className="font-serif text-base font-bold text-ink">
            Product Multi-Image Gallery
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gold/20 text-gold-deep border border-gold/30">
            {currentImages.length} / 5 Photos
          </span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            (Slot #1 is Primary Store Thumbnail)
          </span>
        </div>
      </div>

      {/* Recommended Image Specifications & Guidelines Banner */}
      <div className="p-3.5 rounded-2xl bg-card border border-border/80 text-xs space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
          <Sparkles className="size-3.5 text-gold-deep" />
          <span>Recommended Image Specifications:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-muted-foreground">
          <div className="p-2 rounded-xl bg-pearl/50 border border-border/50">
            <strong className="text-ink block mb-0.5">📐 Resolution</strong>
            1000 × 1000 px (1:1 Square) or 1200 × 1500 px (Portrait). Min 800px.
          </div>
          <div className="p-2 rounded-xl bg-pearl/50 border border-border/50">
            <strong className="text-ink block mb-0.5">🎨 Formats</strong>
            .WebP, .PNG (transparent background recommended for flacons), .JPG
          </div>
          <div className="p-2 rounded-xl bg-pearl/50 border border-border/50">
            <strong className="text-ink block mb-0.5">⚡ File Size</strong>
            Max 5 MB each (auto-compressed client-side to fast WebP)
          </div>
        </div>
        <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="font-bold text-ink">Suggested 5 Angles:</span>
          <span className="bg-pearl px-2 py-0.5 rounded-md border border-border/60">1. Bottle Front Hero</span>
          <span className="bg-pearl px-2 py-0.5 rounded-md border border-border/60">2. Luxury Rigid Box</span>
          <span className="bg-pearl px-2 py-0.5 rounded-md border border-border/60">3. Crystal Cap / Atomizer</span>
          <span className="bg-pearl px-2 py-0.5 rounded-md border border-border/60">4. Raw Oud & Notes</span>
          <span className="bg-pearl px-2 py-0.5 rounded-md border border-border/60">5. Lifestyle Display</span>
        </div>
      </div>

      {/* Gallery Cards Grid (5 Slots) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {currentImages.map((imgUrl, idx) => (
          <div
            key={idx}
            className={`relative rounded-2xl border-2 p-2 bg-card flex flex-col items-center justify-between group shadow-xs transition-all ${
              idx === 0 ? "border-gold ring-2 ring-gold/30 bg-gradient-to-b from-card to-pearl/60" : "border-border/80 hover:border-gold/50"
            }`}
          >
            <div className="relative w-full h-24 rounded-xl overflow-hidden bg-pearl/50 grid place-items-center">
              <img src={imgUrl} alt={`Product view ${idx + 1}`} className="w-full h-full object-contain p-1" />
              <span className={`absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                idx === 0 ? "bg-gold text-ink font-bold shadow-xs" : "bg-ink/80 text-pearl"
              }`}>
                {idx === 0 ? "★ Primary" : `#${idx + 1}`}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="absolute top-1 right-1 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-85 hover:opacity-100 hover:scale-110 transition-all cursor-pointer text-xs"
                title="Remove photo"
              >
                ✕
              </button>
            </div>

            <div className="w-full pt-2 flex items-center justify-between text-[10px]">
              {idx === 0 ? (
                <span className="text-gold-deep font-bold mx-auto">Default Card</span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleMakePrimary(idx)}
                  className="text-gold-deep hover:underline font-bold mx-auto cursor-pointer"
                >
                  Make Primary
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Upload New Slot Card (if under 5) */}
        {currentImages.length < 5 && (
          <label className="border-2 border-dashed border-gold/60 hover:border-gold rounded-2xl h-32 flex flex-col items-center justify-center gap-1.5 p-3 text-center bg-pearl/30 hover:bg-pearl/60 transition-colors cursor-pointer group shadow-xs">
            <Upload className="size-5 text-gold-deep group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold text-ink uppercase tracking-wider">
              + Add Photo
            </span>
            <span className="text-[9px] text-muted-foreground">
              ({5 - currentImages.length} slot{5 - currentImages.length > 1 ? "s" : ""} left)
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUploadFiles}
            />
          </label>
        )}
      </div>

      {/* Manual URL or Preset Quick Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 border-t border-border/50">
        <div className="flex-1 w-full flex items-center gap-2">
          <input
            type="text"
            placeholder="Or paste image URL (https://... or /product-box.jpg)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-mono text-ink focus:border-gold focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddUrl}
            disabled={currentImages.length >= 5}
            className="px-4 py-2 rounded-xl bg-gold text-ink font-bold text-xs uppercase tracking-wider hover:scale-[1.02] transition-transform disabled:opacity-50 cursor-pointer shrink-0 shadow-xs"
          >
            + Add URL
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Presets:</span>
          {[
            { label: "Box", url: "/product-box.jpg" },
            { label: "Rose", url: "/product-midnight-rose.png" },
            { label: "Gold", url: "/product-desert-gold.png" },
            { label: "Dark", url: "/product-dark.jpg" },
          ].map((preset) => (
            <button
              key={preset.url}
              type="button"
              disabled={currentImages.length >= 5}
              onClick={() => handleAddPreset(preset.url)}
              className="text-[10px] px-2.5 py-1 rounded-full border border-border bg-card text-muted-foreground hover:text-ink hover:border-gold/50 cursor-pointer disabled:opacity-50 transition-colors"
            >
              +{preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// INVENTORY ASSET HELPERS (Milliliters, Bottles, Watches, Packaging Boxes)
// ============================================================================
export function extractVolumeInMl(volumeStr?: string): number {
  if (!volumeStr) return 0;
  const str = volumeStr.toLowerCase();

  // If it's a timepiece case, return 0 ml
  if (str.includes("mm") || str.includes("watch") || str.includes("dial") || str.includes("case")) {
    return 0;
  }

  // Multi-unit match e.g. "5 x 3ml"
  const multiMatch = str.match(/(\d+)\s*x\s*(\d+)\s*ml/);
  if (multiMatch) {
    return parseInt(multiMatch[1], 10) * parseInt(multiMatch[2], 10);
  }

  // Standard ml match e.g. "12ml", "50 ml", "6 ml"
  const mlMatch = str.match(/(\d+(?:\.\d+)?)\s*ml/);
  if (mlMatch) {
    return parseFloat(mlMatch[1]);
  }

  return 0;
}

export function isWatchProduct(p: Product): boolean {
  const cat = (p.category || "").toLowerCase();
  const name = (p.name || "").toLowerCase();
  const vol = (p.volume || "").toLowerCase();
  return (
    cat.includes("watch") ||
    cat.includes("horology") ||
    name.includes("chrono") ||
    name.includes("watch") ||
    name.includes("automatic") ||
    vol.includes("mm")
  );
}

export type PackagingBox = {
  id: string;
  name: string;
  category: "attar" | "spray" | "watch" | "discovery" | "shipping";
  stock: number;
  suitableFor: string;
  material: string;
  minThreshold: number;
  image: string;
};

export const DEFAULT_PACKAGING_BOXES: PackagingBox[] = [
  {
    id: "box-attar-12ml",
    name: "Imperial Velvet 12ml Attar Coffret",
    category: "attar",
    stock: 145,
    suitableFor: "12ml Crystal Flacons (Oud Al-Jamil, Midnight Rose, etc.)",
    material: "Gold-embossed royal navy velvet with satin pull ribbon",
    minThreshold: 30,
    image: "/product-box.jpg",
  },
  {
    id: "box-attar-6ml",
    name: "Pocket Attar 6ml Rigid Gift Box",
    category: "attar",
    stock: 95,
    suitableFor: "6ml Pure Concentrated Attars & Pocket Oils",
    material: "Textured ivory hardbox with hot-stamped gold foil crest",
    minThreshold: 25,
    image: "/product-box.jpg",
  },
  {
    id: "box-spray-50ml",
    name: "Extrait De Parfum 50ml Magnetic Box",
    category: "spray",
    stock: 160,
    suitableFor: "50ml Luxury Extrait Spray Bottles (Desert Gold, etc.)",
    material: "Heavyweight black matte hardbox with magnetic clasp & high-density foam",
    minThreshold: 35,
    image: "/product-dark.jpg",
  },
  {
    id: "box-watch-leather",
    name: "Horology Piano-Lacquer Wood & Leather Case",
    category: "watch",
    stock: 40,
    suitableFor: "Luxury Chronographs & Horology Timepieces",
    material: "Handcrafted polished mahogany wood & cream leather pillow",
    minThreshold: 15,
    image: "/product-desert-gold.png",
  },
  {
    id: "box-discovery-slide",
    name: "Maison Discovery Set 3ml Slide Box",
    category: "discovery",
    stock: 85,
    suitableFor: "3ml Sample Flacons & 5-Vial Discovery Sets",
    material: "Drawer pull-out slide box with gold foil divider",
    minThreshold: 20,
    image: "/product-box.jpg",
  },
  {
    id: "box-shipping-outer",
    name: "M.shaies Tamper-Proof Outer Shipping Carton",
    category: "shipping",
    stock: 420,
    suitableFor: "All Customer Nationwide Shipments (TCS / Leopards / Riders)",
    material: "Corrugated 3-ply kraft with branded tape & wax seal verification sticker",
    minThreshold: 60,
    image: "/product-box.jpg",
  },
];

// ============================================================================
// EXECUTIVE SMART & ADVANCED ANALYTICS DASHBOARD COMPONENT
// ============================================================================
function AnalyticsDashboardView({
  orders,
  products,
  coupons,
  uniqueCustomers,
  setActiveTab,
}: {
  orders: Order[];
  products: Product[];
  coupons: Coupon[];
  uniqueCustomers: any[];
  setActiveTab: (tab: TabType) => void;
}) {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "ytd" | "all">("30d");
  const [hoveredPoint, setHoveredPoint] = useState<{
    displayDate: string;
    revenue: number;
    orders: number;
    x: number;
    y: number;
  } | null>(null);

  // 1. Time Filtering Logic
  const { currentOrders, previousOrders, label } = useMemo(() => {
    const now = new Date();
    let cutoff = new Date();
    let prevCutoff = new Date();

    if (timeRange === "7d") {
      cutoff.setDate(now.getDate() - 7);
      prevCutoff.setDate(now.getDate() - 14);
    } else if (timeRange === "30d") {
      cutoff.setDate(now.getDate() - 30);
      prevCutoff.setDate(now.getDate() - 60);
    } else if (timeRange === "90d") {
      cutoff.setDate(now.getDate() - 90);
      prevCutoff.setDate(now.getDate() - 180);
    } else if (timeRange === "ytd") {
      cutoff = new Date(now.getFullYear(), 0, 1);
      prevCutoff = new Date(now.getFullYear() - 1, 0, 1);
    } else {
      cutoff = new Date(2020, 0, 1);
      prevCutoff = new Date(2019, 0, 1);
    }

    const current = orders.filter((o) => {
      const d = new Date(o.date);
      return !isNaN(d.getTime()) ? d >= cutoff : true;
    });

    const previous = orders.filter((o) => {
      const d = new Date(o.date);
      return !isNaN(d.getTime()) ? d >= prevCutoff && d < cutoff : false;
    });

    return {
      currentOrders: current,
      previousOrders: previous,
      label:
        timeRange === "7d"
          ? "Last 7 Days"
          : timeRange === "30d"
          ? "Last 30 Days"
          : timeRange === "90d"
          ? "Last 90 Days"
          : timeRange === "ytd"
          ? "Year to Date"
          : "All Time",
    };
  }, [orders, timeRange]);

  // 2. Executive KPIs Calculation
  const totalRevenue = (currentOrders || []).reduce((acc, o) => acc + (o.total || 0), 0);
  const prevRevenue = (previousOrders || []).reduce((acc, o) => acc + (o.total || 0), 0);
  const revenueGrowth =
    prevRevenue > 0
      ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
      : totalRevenue > 0
      ? 100
      : 0;

  const totalOrders = (currentOrders || []).length;
  const prevOrdersCount = (previousOrders || []).length;
  const ordersGrowth =
    prevOrdersCount > 0
      ? Math.round(((totalOrders - prevOrdersCount) / prevOrdersCount) * 100)
      : totalOrders > 0
      ? 100
      : 0;

  const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const estimatedProfit = Math.round(totalRevenue * 0.65); // ~65% luxury fragrance gross margin

  const completedOrders = (currentOrders || []).filter(
    (o) => o.orderStatus === "Dispatched" || o.orderStatus === "Delivered"
  ).length;
  const fulfillmentRate =
    totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

  const repeatCount = (uniqueCustomers || []).filter((c) => (c.orderCount || 0) >= 2).length;
  const repeatRate =
    (uniqueCustomers || []).length > 0
      ? Math.round((repeatCount / uniqueCustomers.length) * 100)
      : 0;

  const giftWrappedCount = (currentOrders || []).filter((o) => o.isGiftWrapped).length;
  const giftWrapRate =
    totalOrders > 0 ? Math.round((giftWrappedCount / totalOrders) * 100) : 0;

  const totalUnitsSold = (currentOrders || []).reduce(
    (acc, o) => acc + (Array.isArray(o.items) ? o.items.reduce((s, i) => s + (i.qty || 1), 0) : 0),
    0
  );
  const avgItemsPerOrder =
    totalOrders > 0 ? (totalUnitsSold / totalOrders).toFixed(1) : "0";

  // 3. Daily Sales Velocity for SVG Chart
  const chartData = useMemo(() => {
    const daysCount = timeRange === "7d" ? 7 : 14;
    const points: { dateStr: string; displayDate: string; revenue: number; orders: number }[] = [];
    const dateMap = new Map<string, { revenue: number; orders: number }>();

    (currentOrders || []).forEach((o) => {
      const d = new Date(o.date);
      const key = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : (o.date || "").slice(0, 10);
      const existing = dateMap.get(key) || { revenue: 0, orders: 0 };
      existing.revenue += (o.total || 0);
      existing.orders += 1;
      dateMap.set(key, existing);
    });

    const today = new Date();
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const displayDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const val = dateMap.get(key) || { revenue: 0, orders: 0 };
      points.push({
        dateStr: key,
        displayDate,
        revenue: val.revenue,
        orders: val.orders,
      });
    }

    // Chart correctly shows zero when no data exists for the selected period

    return points;
  }, [currentOrders, timeRange]);

  // SVG Chart Geometry
  const maxChartRevenue = Math.max(...chartData.map((d) => d.revenue), 10000);
  const svgWidth = 720;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;
  const usableWidth = svgWidth - paddingX * 2;
  const usableHeight = svgHeight - paddingY * 2;

  const pointsCoordinates = chartData.map((d, index) => {
    const divisor = Math.max(1, chartData.length - 1);
    const x = paddingX + (index / divisor) * usableWidth;
    const y = paddingY + usableHeight - (d.revenue / maxChartRevenue) * usableHeight;
    return { ...d, x, y };
  });

  const pathD = pointsCoordinates.reduce((acc, pt, index) => {
    if (index === 0) return `M ${pt.x} ${pt.y}`;
    const prev = pointsCoordinates[index - 1];
    const cp1x = prev.x + (pt.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (pt.x - prev.x) / 2;
    const cp2y = pt.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pt.x} ${pt.y}`;
  }, "");

  const firstPt = pointsCoordinates[0] || { x: paddingX, y: svgHeight - paddingY };
  const lastPt = pointsCoordinates[pointsCoordinates.length - 1] || { x: svgWidth - paddingX, y: svgHeight - paddingY };
  const areaD = pointsCoordinates.length > 0
    ? `${pathD} L ${lastPt.x} ${svgHeight - paddingY} L ${firstPt.x} ${svgHeight - paddingY} Z`
    : "";

  // 4. Product Sales Breakdown & Leaderboard
  const productPerformance = useMemo(() => {
    const map = new Map<
      string,
      {
        product: Product;
        unitsSold: number;
        revenue: number;
      }
    >();

    (currentOrders || []).forEach((o) => {
      (Array.isArray(o.items) ? o.items : []).forEach((item) => {
        const prod = (products || []).find((p) => p.id === item.productId) || ({
          id: item.productId,
          name: item.name,
          price: item.price,
          category: "Attars",
          volume: item.volume || "12ml",
          stock: 12,
          image: item.image || "/product-box.jpg",
          notes: "Amber, Oud, Rose",
        } as Product);

        const existing = map.get(item.productId) || {
          product: prod,
          unitsSold: 0,
          revenue: 0,
        };
        existing.unitsSold += (item.qty || 1);
        existing.revenue += (item.price * (item.qty || 1));
        map.set(item.productId, existing);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [currentOrders, products]);

  // 5. Volume Breakdown (3ml, 6ml, 12ml, 50ml)
  const volumeBreakdown = useMemo(() => {
    const counts = {
      "3ml Discovery": { units: 0, revenue: 0 },
      "6ml Pocket": { units: 0, revenue: 0 },
      "12ml Crystal": { units: 0, revenue: 0 },
      "50ml Extrait": { units: 0, revenue: 0 },
      "Other": { units: 0, revenue: 0 },
    };

    (currentOrders || []).forEach((o) => {
      (Array.isArray(o.items) ? o.items : []).forEach((item) => {
        const vol = (item.volume || item.name || "").toLowerCase();
        let key: keyof typeof counts = "Other";
        if (vol.includes("3ml") || vol.includes("sample")) key = "3ml Discovery";
        else if (vol.includes("6ml")) key = "6ml Pocket";
        else if (vol.includes("12ml")) key = "12ml Crystal";
        else if (vol.includes("50ml")) key = "50ml Extrait";

        counts[key].units += (item.qty || 1);
        counts[key].revenue += (item.price * (item.qty || 1));
      });
    });

    return Object.entries(counts).map(([volLabel, data]) => ({
      label: volLabel,
      units: data.units,
      revenue: data.revenue,
      percentage: totalUnitsSold > 0 ? Math.round((data.units / totalUnitsSold) * 100) : 0,
    }));
  }, [currentOrders, totalUnitsSold]);

  // 6. Regional Pakistan Performance
  const cityMatrix = useMemo(() => {
    const map: Record<string, { orders: number; revenue: number; topCourier: string }> = {};
    (currentOrders || []).forEach((o) => {
      const city = o.city || "Other";
      if (!map[city]) map[city] = { orders: 0, revenue: 0, topCourier: o.courierName || "TCS Express" };
      map[city].orders += 1;
      map[city].revenue += (o.total || 0);
    });

    return Object.entries(map)
      .map(([city, data]) => ({
        city,
        orders: data.orders,
        revenue: data.revenue,
        aov: Math.round(data.revenue / Math.max(1, data.orders)),
        topCourier: data.topCourier,
        share: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [currentOrders, totalRevenue]);

  // 7. Payment Method & COD Settlement
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {
      cod: { count: 0, revenue: 0 },
      jazzcash: { count: 0, revenue: 0 },
      easypaisa: { count: 0, revenue: 0 },
      nayapay: { count: 0, revenue: 0 },
      card: { count: 0, revenue: 0 },
    };

    (currentOrders || []).forEach((o) => {
      const method = (o.paymentMethod || "cod").toLowerCase();
      if (map[method]) {
        map[method].count += 1;
        map[method].revenue += (o.total || 0);
      } else {
        map.cod.count += 1;
        map.cod.revenue += (o.total || 0);
      }
    });

    const codTotal = map.cod.revenue;
    const digitalTotal = Math.max(0, totalRevenue - codTotal);

    return {
      methods: map,
      codTotal,
      digitalTotal,
      codPercent: totalRevenue > 0 ? Math.round((codTotal / totalRevenue) * 100) : 0,
      digitalPercent: totalRevenue > 0 ? Math.round((digitalTotal / totalRevenue) * 100) : 0,
    };
  }, [currentOrders, totalRevenue]);

  // 8. Sentry AI Predictive Stock Radar
  const stockForecast = useMemo(() => {
    return (products || []).map((p) => {
      const soldItem = productPerformance.find((item) => item.product.id === p.id);
      const unitsSold = soldItem ? soldItem.unitsSold : 0;
      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 60;
      const dailyVelocity = Math.max(0.1, unitsSold / days);
      const stockVal = p.stock || 0;
      const daysRemaining = stockVal > 0 ? Math.round(stockVal / dailyVelocity) : 0;

      let urgency: "critical" | "warning" | "healthy" | "out" = "healthy";
      if (stockVal <= 0) urgency = "out";
      else if (daysRemaining <= 14) urgency = "critical";
      else if (daysRemaining <= 30) urgency = "warning";

      return {
        product: p,
        stock: stockVal,
        unitsSold,
        dailyVelocity: dailyVelocity.toFixed(1),
        daysRemaining,
        urgency,
      };
    }).sort((a, b) => {
      const weight = { out: 0, critical: 1, warning: 2, healthy: 3 };
      return weight[a.urgency] - weight[b.urgency];
    });
  }, [products, productPerformance, timeRange]);

  // 9. Export Analytics CSV
  const handleExportAnalyticsCSV = () => {
    const headers = ["Metric / Fragrance", "Units Sold / Value", "Revenue (PKR)", "Category / City"];
    const rows = [
      ["Gross Revenue", "", totalRevenue.toString(), label],
      ["Total Orders", totalOrders.toString(), "", label],
      ["Average Order Value", "", aov.toString(), label],
      ["Estimated Gross Profit (~65%)", "", estimatedProfit.toString(), label],
      ["Repeat Customer Rate", `${repeatRate}%`, "", ""],
      ["Gift Wrap Attach Rate", `${giftWrapRate}%`, "", ""],
      ["--- TOP BESTSELLING FRAGRANCES ---", "", "", ""],
      ...productPerformance.slice(0, 10).map((item) => [
        `"${item.product.name}"`,
        item.unitsSold.toString(),
        item.revenue.toString(),
        item.product.category,
      ]),
      ["--- REGIONAL PAKISTAN SALES ---", "", "", ""],
      ...cityMatrix.map((c) => [
        `"${c.city}"`,
        c.orders.toString(),
        c.revenue.toString(),
        `AOV: ${c.aov}`,
      ]),
    ];

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `mshaies-analytics-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("M.shaies Executive Analytics CSV exported successfully!");
  };

  return (
    <div className="space-y-8">
      {/* 1. Header Toolbar with Time Filter & Report Export */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-card border border-border/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-2xl bg-gold/15 border border-gold/40 grid place-items-center text-gold-deep">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <h2 className="font-serif text-2xl text-ink font-bold flex items-center gap-2">
                Executive Intelligence & Analytics Hub
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time sales velocity curves, flacon demand matrix, and predictive stock depletion.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time Filter Pills */}
          <div className="flex items-center p-1 rounded-2xl bg-pearl border border-border/80 text-xs">
            {(
              [
                { id: "7d", label: "7 Days" },
                { id: "30d", label: "30 Days" },
                { id: "90d", label: "90 Days" },
                { id: "ytd", label: "YTD" },
                { id: "all", label: "All Time" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id)}
                className={`px-3 py-1.5 rounded-xl uppercase tracking-wider font-bold text-[11px] transition-all cursor-pointer ${
                  timeRange === t.id
                    ? "bg-ink text-gold shadow-xs scale-102"
                    : "text-muted-foreground hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Export Report CSV Button */}
          <button
            onClick={handleExportAnalyticsCSV}
            className="px-4 py-2 rounded-2xl border border-gold/40 bg-card hover:bg-pearl text-ink font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Download className="size-3.5 text-gold-deep" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Executive Financial KPI Cards (6 Pillars) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1: Gross Sales (GMV) */}
        <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Gross Sales (GMV)
            </span>
            <div className="size-8 rounded-xl bg-emerald-500/10 grid place-items-center text-emerald-600">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-serif text-2xl font-bold text-ink leading-tight">
              {formatPKR(totalRevenue)}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs">
              <span
                className={`inline-flex items-center font-bold text-[11px] ${
                  revenueGrowth >= 0 ? "text-emerald-600" : "text-destructive"
                }`}
              >
                {revenueGrowth >= 0 ? (
                  <ArrowUpRight className="size-3.5 mr-0.5" />
                ) : (
                  <ArrowDownRight className="size-3.5 mr-0.5" />
                )}
                {Math.abs(revenueGrowth)}%
              </span>
              <span className="text-[10px] text-muted-foreground">vs prev window</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Orders & Fulfillment */}
        <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Net Orders Placed
            </span>
            <div className="size-8 rounded-xl bg-gold/15 grid place-items-center text-gold-deep">
              <Receipt className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-serif text-2xl font-bold text-ink leading-tight">
              {totalOrders} <span className="text-xs font-sans text-muted-foreground font-normal">orders</span>
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700">
                {fulfillmentRate}% Fulfilled
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Average Order Value (AOV) */}
        <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Average Basket (AOV)
            </span>
            <div className="size-8 rounded-xl bg-pearl border border-gold/30 grid place-items-center text-gold-deep">
              <Target className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-serif text-2xl font-bold text-ink leading-tight">
              {formatPKR(aov)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">
              {avgItemsPerOrder} bottles / order average
            </p>
          </div>
        </div>

        {/* KPI 4: Estimated Gross Profit (~65%) */}
        <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Est. Gross Profit
            </span>
            <div className="size-8 rounded-xl bg-emerald-500/10 grid place-items-center text-emerald-600">
              <Zap className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-serif text-2xl font-bold text-emerald-700 leading-tight">
              {formatPKR(estimatedProfit)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">
              ~65% Maison margin model
            </p>
          </div>
        </div>

        {/* KPI 5: Client Retention Rate */}
        <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Repeat Buyer Rate
            </span>
            <div className="size-8 rounded-xl bg-purple-500/10 grid place-items-center text-purple-600">
              <Users className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-serif text-2xl font-bold text-ink leading-tight">
              {repeatRate}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">
              {repeatCount} repeat of {uniqueCustomers.length} clients
            </p>
          </div>
        </div>

        {/* KPI 6: Wax-Sealed Gift Wrap Attach */}
        <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Gift Wrap Attach
            </span>
            <div className="size-8 rounded-xl bg-amber-500/10 grid place-items-center text-amber-600">
              <Gift className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-serif text-2xl font-bold text-ink leading-tight">
              {giftWrapRate}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">
              {giftWrappedCount} gift boxes (+{formatPKR(giftWrappedCount * 250)})
            </p>
          </div>
        </div>
      </div>

      {/* 3. Interactive Sales & Revenue Velocity Trendline (SVG Chart) */}
      <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
          <div>
            <h3 className="font-serif text-lg text-ink font-bold flex items-center gap-2">
              <span>Sales & Revenue Velocity Curve</span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold/15 text-gold-deep font-sans font-bold">
                {label}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Hover over data points to inspect daily revenue spikes and transaction volume.
            </p>
            {totalOrders === 0 && (
              <p className="text-[11px] text-gold-deep font-medium mt-1">
                Zero baseline active — Real-time velocity curve will chart daily revenue as orders are placed.
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-gold" />
              <span>Gross Sales (PKR)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-ink/40" />
              <span>Order Volumes</span>
            </div>
          </div>
        </div>

        {/* SVG Curve Container */}
        <div className="relative w-full overflow-hidden pt-2">
          {hoveredPoint && (
            <div
              className="absolute pointer-events-none z-20 px-3 py-2 rounded-xl bg-ink/95 text-pearl text-xs shadow-xl border border-gold/40 transform -translate-x-1/2 -translate-y-full select-none"
              style={{
                left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                top: `${(hoveredPoint.y / svgHeight) * 100 - 8}%`,
              }}
            >
              <p className="font-serif font-bold text-gold">{hoveredPoint.displayDate}</p>
              <p className="font-mono text-sm font-semibold">{formatPKR(hoveredPoint.revenue)}</p>
              <p className="text-[10px] text-pearl/70">{hoveredPoint.orders} order{hoveredPoint.orders !== 1 ? "s" : ""}</p>
            </div>
          )}

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-48 sm:h-64 overflow-visible"
          >
            <defs>
              <linearGradient id="goldGradientArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.45" />
                <stop offset="85%" stopColor="#D4AF37" stopOpacity="0.02" />
                <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines */}
            {[0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const yVal = paddingY + usableHeight * (1 - ratio);
              return (
                <g key={i}>
                  <line
                    x1={paddingX}
                    y1={yVal}
                    x2={svgWidth - paddingX}
                    y2={yVal}
                    stroke="currentColor"
                    className="text-border/60"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingX - 6}
                    y={yVal + 3}
                    textAnchor="end"
                    className="fill-muted-foreground text-[9px] font-mono"
                  >
                    {Math.round((maxChartRevenue * ratio) / 1000)}k
                  </text>
                </g>
              );
            })}

            {/* Soft Area under curve */}
            <path d={areaD} fill="url(#goldGradientArea)" />

            {/* Crisp Gold Velocity Path */}
            <path
              d={pathD}
              fill="none"
              stroke="#D4AF37"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Interactive Points with Stable Invisible Hit Targets */}
            {pointsCoordinates.map((pt, i) => {
              const isHovered = hoveredPoint?.displayDate === pt.displayDate;
              return (
                <g
                  key={i}
                  onMouseEnter={() =>
                    setHoveredPoint({
                      displayDate: pt.displayDate,
                      revenue: pt.revenue,
                      orders: pt.orders,
                      x: pt.x,
                      y: pt.y,
                    })
                  }
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="cursor-pointer"
                >
                  {/* Stable Wide Transparent Hit Area */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="16"
                    fill="transparent"
                  />

                  {/* Vertical Guide */}
                  <line
                    x1={pt.x}
                    y1={pt.y}
                    x2={pt.x}
                    y2={svgHeight - paddingY}
                    stroke="#D4AF37"
                    strokeWidth="1.5"
                    opacity={isHovered ? 0.75 : 0}
                    strokeDasharray="2 2"
                  />

                  {/* Point Node (Rock-solid, no CSS scale jitter) */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6 : 4}
                    fill={isHovered ? "#D4AF37" : "#ffffff"}
                    stroke="#D4AF37"
                    strokeWidth="2.5"
                  />

                  {/* X-axis Date Labels */}
                  <text
                    x={pt.x}
                    y={svgHeight - 8}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[9px] font-sans font-medium select-none pointer-events-none"
                  >
                    {pt.displayDate}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 4. Two-Column Analytics Matrix: Bestsellers & Geographic Pakistan Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT: Bestselling Fragrance Leaderboard & Flacon Volumes (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Bestseller Leaderboard */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Award className="size-5 text-gold-deep" />
                <h3 className="font-serif text-lg font-bold text-ink">Bestselling Fragrances Leaderboard</h3>
              </div>
              <span className="text-xs text-muted-foreground font-medium">Ranked by Revenue</span>
            </div>

            <div className="space-y-4">
              {productPerformance.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-border/80 bg-pearl/20">
                  <Award className="size-8 text-gold-deep/50 mx-auto mb-2" />
                  <p className="font-serif text-sm font-bold text-ink">No product sales recorded yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bestselling fragrance rankings will automatically populate as customer orders arrive.
                  </p>
                </div>
              ) : (
                productPerformance.slice(0, 5).map((item, index) => {
                const sharePercent = totalRevenue > 0 ? Math.round((item.revenue / totalRevenue) * 100) : 0;
                const isTop1 = index === 0;

                return (
                  <div
                    key={item.product.id}
                    className="p-3.5 rounded-2xl border border-border/70 bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-gold/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`size-7 rounded-full grid place-items-center font-serif text-xs font-bold shrink-0 ${
                          isTop1
                            ? "bg-gold text-ink shadow-xs"
                            : index === 1
                            ? "bg-muted text-ink"
                            : "border border-border text-muted-foreground"
                        }`}
                      >
                        #{index + 1}
                      </div>
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="size-11 rounded-xl object-contain bg-pearl border border-gold/30 shrink-0 p-0.5"
                      />
                      <div className="min-w-0">
                        <p className="font-serif text-sm font-bold text-ink truncate leading-tight">
                          {item.product.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span className="uppercase font-semibold">{item.product.category}</span>
                          <span>·</span>
                          <span>Stock: <strong>{item.product.stock} units</strong></span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                      <div className="text-left sm:text-right">
                        <p className="font-mono text-sm font-bold text-ink">{formatPKR(item.revenue)}</p>
                        <p className="text-[10px] text-gold-deep font-semibold">
                          {item.unitsSold} bottle{item.unitsSold !== 1 ? "s" : ""} sold
                        </p>
                      </div>

                      <div className="w-16">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                          <span>{sharePercent}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-gold rounded-full transition-all"
                            style={{ width: `${sharePercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }))}
            </div>
          </div>

          {/* Flacon Volume Size Preference */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-serif text-base font-bold text-ink">Flacon Size & Volume Distribution</h3>
              <span className="text-xs text-muted-foreground font-medium">{totalUnitsSold} Total Bottles</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {volumeBreakdown.slice(0, 4).map((vol) => (
                <div key={vol.label} className="p-3.5 rounded-2xl bg-background border border-border/80 space-y-2">
                  <span className="text-xs font-serif font-bold text-ink block">{vol.label}</span>
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-base font-bold text-gold-deep">{vol.units}</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">{vol.percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gold rounded-full" style={{ width: `${vol.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Regional Pakistan Matrix & Payment Method Breakdown (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Pakistan Regional Matrix */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-gold-deep" />
                <h3 className="font-serif text-lg font-bold text-ink">Regional Pakistan Sales</h3>
              </div>
              <span className="text-xs text-muted-foreground font-medium">Top Hubs</span>
            </div>

            <div className="space-y-3">
              {cityMatrix.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-border/80 bg-pearl/20">
                  <MapPin className="size-8 text-gold-deep/50 mx-auto mb-2" />
                  <p className="font-serif text-sm font-bold text-ink">No regional orders recorded yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Provincial sales and city distribution will track nationwide customer orders.
                  </p>
                </div>
              ) : (
                cityMatrix.slice(0, 5).map((city, idx) => (
                  <div
                    key={city.city}
                    className="flex items-center justify-between p-3 rounded-2xl bg-background border border-border/70 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="size-5 rounded-full bg-pearl border border-gold/40 grid place-items-center text-[10px] font-bold text-gold-deep shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink truncate">{city.city}</p>
                        <p className="text-[10px] text-muted-foreground">{city.topCourier}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold text-ink">{formatPKR(city.revenue)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {city.orders} order{city.orders !== 1 ? "s" : ""} · AOV {formatPKR(city.aov)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Payment Gateways & COD Liquidity */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CreditCard className="size-4 text-gold-deep" />
                <h3 className="font-serif text-base font-bold text-ink">Payment Liquidity & Gateways</h3>
              </div>
              <span className="text-xs text-muted-foreground">COD vs Digital</span>
            </div>

            {/* Split Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-emerald-700">Digital Pre-Paid ({paymentBreakdown.digitalPercent}%)</span>
                <span className="text-amber-700">Cash on Delivery ({paymentBreakdown.codPercent}%)</span>
              </div>
              <div className="h-3 w-full rounded-full bg-amber-500/20 flex overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all"
                  style={{ width: `${paymentBreakdown.digitalPercent}%` }}
                />
                <div
                  className="h-full bg-amber-500 transition-all"
                  style={{ width: `${paymentBreakdown.codPercent}%` }}
                />
              </div>
            </div>

            {/* Methods Breakdown List */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <div className="p-3 rounded-2xl bg-background border border-border/70 text-xs">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">COD Balance</p>
                <p className="font-mono font-bold text-ink mt-0.5">{formatPKR(paymentBreakdown.codTotal)}</p>
                <span className="text-[10px] text-amber-600 font-medium">Pending Courier Remittance</span>
              </div>
              <div className="p-3 rounded-2xl bg-background border border-border/70 text-xs">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Digital Receipts</p>
                <p className="font-mono font-bold text-emerald-700 mt-0.5">{formatPKR(paymentBreakdown.digitalTotal)}</p>
                <span className="text-[10px] text-emerald-600 font-medium">JazzCash / Cards Cleared</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Sentry AI Predictive Stock Radar & Depletion Velocity */}
      <div className="p-6 sm:p-7 rounded-3xl bg-card border border-gold/40 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-amber-500/20 border border-amber-500/40 grid place-items-center text-amber-700">
              <Flame className="size-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                <span>Sentry AI Predictive Stock Depletion Radar</span>
                <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold text-ink font-sans font-bold">
                  Automated Forecasting
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Monitors daily burn rates and forecasts when flacon inventory will be exhausted.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab("inventory")}
            className="text-xs uppercase tracking-wider font-bold text-gold-deep hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Open Smart Inventory Manager</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>

        {stockForecast.filter((f) => f.urgency === "out" || f.urgency === "critical" || f.urgency === "warning").length === 0 ? (
          <div className="text-center py-6 px-4 rounded-2xl bg-pearl/20 border border-dashed border-border/80">
            <p className="text-xs text-muted-foreground font-medium">All stock levels are clear and healthy. No depletion warnings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stockForecast
              .filter((f) => f.urgency === "out" || f.urgency === "critical" || f.urgency === "warning")
              .slice(0, 6)
              .map((item) => {
              const isOut = item.urgency === "out";
              const isCritical = item.urgency === "critical";

              return (
                <div
                  key={item.product.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isOut
                      ? "border-destructive/40 bg-destructive/5"
                      : isCritical
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-border/80 bg-background"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-serif text-sm font-bold text-ink truncate">
                        {item.product.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{item.product.category}</p>
                    </div>

                    <span
                      className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        isOut
                          ? "bg-destructive text-white"
                          : isCritical
                          ? "bg-amber-500 text-ink"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isOut
                        ? "Sold Out"
                        : isCritical
                        ? `Depletion ~${item.daysRemaining}d`
                        : `~${item.daysRemaining}d left`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Current Stock</span>
                      <span className="font-bold text-ink font-mono">{item.stock} bottles</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted-foreground block">Daily Burn</span>
                      <span className="font-bold text-gold-deep font-mono">{item.dailyVelocity} / day</span>
                    </div>

                    <button
                      onClick={() => {
                        setActiveTab("inventory");
                        toast.info(`Switched to Inventory. Restock ${item.product.name}.`);
                      }}
                      className="px-2.5 py-1 rounded-full bg-gold hover:bg-gold-deep hover:text-white text-ink text-[10px] uppercase tracking-wider font-bold transition-colors cursor-pointer"
                    >
                      Restock
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const {
    products,
    categories,
    coupons,
    orders,
    settings,
    auditLogs,
    jobs,
    addAuditLog,
    bulkImportProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    addCategory,
    deleteCategory,
    addCoupon,
    toggleCoupon,
    deleteCoupon,
    updateOrderStatus,
    updatePaymentStatus,
    updateSettings,
    exportAllStoreData,
    importStoreData,
    resetToDefaults,
    addJob,
    updateJob,
    deleteJob,
    toggleJobStatus,
    refreshDataFromServer,
  } = useProductsStore();

  // Authentication State
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [currentAdminEmail, setCurrentAdminEmail] = useState<string>(() => {
    if (typeof window === "undefined") return "admin@mshaies.com";
    return sessionStorage.getItem("mshaies_admin_email") || localStorage.getItem("mshaies_admin_email") || "admin@mshaies.com";
  });

  useEffect(() => {
    setMounted(true);
    const storedToken =
      sessionStorage.getItem("mshaies_admin_token") ||
      localStorage.getItem("mshaies_admin_token");

    const authed =
      sessionStorage.getItem(AUTH_SESSION_KEY) === "true" ||
      localStorage.getItem(AUTH_SESSION_KEY) === "true" ||
      Boolean(storedToken);

    if (authed) {
      setIsAuthenticated(true);
      refreshDataFromServer();
      if (storedToken) {
        verifyAdminStatusServerFn({ data: { authToken: storedToken } })
          .then((res) => {
            if (res.valid && res.user?.email) {
              setCurrentAdminEmail(res.user.email);
              sessionStorage.setItem("mshaies_admin_email", res.user.email);
              localStorage.setItem("mshaies_admin_email", res.user.email);
            }
          })
          .catch(() => {});
      }
    }

    // Check if browser was refreshed during an active PIN lockout
    const until = sessionStorage.getItem("mshaies_lockout_until");
    if (until) {
      const remaining = parseInt(until, 10) - Date.now();
      if (remaining > 0) {
        setIsLockedOut(true);
        const timer = setTimeout(() => {
          setIsLockedOut(false);
          setFailedAttempts(0);
          sessionStorage.removeItem("mshaies_lockout_until");
          sessionStorage.removeItem("mshaies_failed_pin_attempts");
        }, remaining);
        return () => clearTimeout(timer);
      } else {
        sessionStorage.removeItem("mshaies_lockout_until");
        sessionStorage.removeItem("mshaies_failed_pin_attempts");
      }
    }
  }, []);
  const [authMode, setAuthMode] = useState<"supabase" | "pin">("supabase");
  const [adminEmail, setAdminEmail] = useState("admin@mshaies.com");
  const [adminPassword, setAdminPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [showEmergencyPin, setShowEmergencyPin] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(() => {
    if (typeof window === "undefined") return 0;
    const attempts = sessionStorage.getItem("mshaies_failed_pin_attempts");
    return attempts ? parseInt(attempts, 10) || 0 : 0;
  });
  const [isLockedOut, setIsLockedOut] = useState(() => {
    if (typeof window === "undefined") return false;
    const until = sessionStorage.getItem("mshaies_lockout_until");
    return until ? Date.now() < parseInt(until, 10) : false;
  });

  const [activeTab, setActiveTab] = useState<TabType>("analytics");
  const [bannerPreviewKey, setBannerPreviewKey] = useState(0);

  // Packaging Boxes State with LocalStorage Persistence
  const [packagingBoxes, setPackagingBoxes] = useState<PackagingBox[]>(() => {
    if (typeof window === "undefined") return DEFAULT_PACKAGING_BOXES;
    try {
      const saved = localStorage.getItem("mshaies_packaging_boxes_v1");
      return saved ? JSON.parse(saved) : DEFAULT_PACKAGING_BOXES;
    } catch {
      return DEFAULT_PACKAGING_BOXES;
    }
  });

  const updatePackagingStock = (id: string, deltaOrExact: number, isExact = false) => {
    setPackagingBoxes((prev) => {
      const next = prev.map((box) => {
        if (box.id !== id) return box;
        const newStock = isExact ? Math.max(0, deltaOrExact) : Math.max(0, box.stock + deltaOrExact);
        return { ...box, stock: newStock };
      });
      try {
        localStorage.setItem("mshaies_packaging_boxes_v1", JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Inventory Filter & Search State
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState<"all" | "fragrances" | "watches" | "boxes">("all");
  const [inventorySearchQuery, setInventorySearchQuery] = useState("");

  // Add Product Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: 12000,
    category: "Attars",
    volume: "12ml Pure Attar",
    stock: 20,
    tagline: "",
    notes: "",
    topNotes: "",
    heartNotes: "",
    baseNotes: "",
    image: "/product-box.jpg",
    images: ["/product-box.jpg"] as string[],
    description: "",
    isFeatured: true,
    gender: "Unisex" as const,
    longevityHours: 18,
    sillageRating: "Strong" as const,
    fragranceFamily: "Woody Oud",
    inspiredBy: "",
    samplePrice: 650,
    batchNumber: "MSH-2026-B1",
    availableSizes: ["6ml", "12ml", "50ml"] as string[],
  });

  // Gallery URL Inputs
  const [newGalleryUrlInput, setNewGalleryUrlInput] = useState("");
  const [editGalleryUrlInput, setEditGalleryUrlInput] = useState("");

  // Bulk CSV Upload State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCsvInput, setBulkCsvInput] = useState("");

  // Audit Logs Filter State
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [auditCategoryFilter, setAuditCategoryFilter] = useState("All");

  // Customer Segmentation Filter
  const [customerSegment, setCustomerSegment] = useState<"all" | "whales" | "repeat" | "new">("all");

  // Category State
  const [newCategoryName, setNewCategoryName] = useState("");

  // Inline Price & Volume Editing State
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<number>(0);
  const [editingVolumeId, setEditingVolumeId] = useState<string | null>(null);
  const [tempVolume, setTempVolume] = useState<string>("");

  // Full Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Discount / Coupon Form State
  const [newCoupon, setNewCoupon] = useState<{
    code: string;
    type: "percent" | "flat" | "shipping";
    value: number;
    minOrder: number;
    maxUses: number;
    expiryDate: string;
    description: string;
  }>({
    code: "",
    type: "percent",
    value: 15,
    minOrder: 0,
    maxUses: 100,
    expiryDate: "2026-12-31",
    description: "",
  });

  // Settings State Form
  const [settingsForm, setSettingsForm] = useState(settings);

  // Flacon Sizes State Helpers for Store Settings
  const flaconSizesList: FlaconSizeOption[] = (settingsForm.flaconSizes && settingsForm.flaconSizes.length > 0)
    ? settingsForm.flaconSizes
    : DEFAULT_FLACON_SIZES;

  const handleUpdateFlaconSize = (index: number, updates: Partial<FlaconSizeOption>) => {
    const updated = flaconSizesList.map((item, i) => i === index ? { ...item, ...updates } : item);
    setSettingsForm({ ...settingsForm, flaconSizes: updated });
  };

  const handleAddFlaconSize = () => {
    const newSize: FlaconSizeOption = {
      id: `custom-${Date.now().toString().slice(-4)}`,
      ml: "100ml",
      label: "100ml",
      sub: "Grand Extrait",
      multiplier: 2.0,
      isEnabled: true,
    };
    setSettingsForm({ ...settingsForm, flaconSizes: [...flaconSizesList, newSize] });
    toast.success("Added new size option! Configure its label and price multiplier below.");
  };

  const handleRemoveFlaconSize = (index: number) => {
    if (flaconSizesList.length <= 1) {
      toast.error("You must have at least one flacon size option.");
      return;
    }
    const updated = flaconSizesList.filter((_, i) => i !== index);
    setSettingsForm({ ...settingsForm, flaconSizes: updated });
    toast.info("Flacon size removed.");
  };

  const handleResetFlaconSizes = () => {
    setSettingsForm({ ...settingsForm, flaconSizes: DEFAULT_FLACON_SIZES });
    toast.success("Reset flacon sizes to default Maison standards!");
  };

  const [currentPinInput, setCurrentPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");

  // Backup Import State
  const [backupJsonInput, setBackupJsonInput] = useState("");

  // Orders Filter & Search State
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("All");

  // Courier Dispatch Modal State
  const [dispatchOrder, setDispatchOrder] = useState<Order | null>(null);
  const [courierNameInput, setCourierNameInput] = useState("TCS Express");
  const [trackingNumberInput, setTrackingNumberInput] = useState("");

  // Customer Directory Search & CRM Dossier State
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<{
    key: string;
    phone: string;
    name: string;
    email: string;
    city: string;
    address: string;
    totalSpent: number;
    orderCount: number;
    lastOrderDate: string;
    orders: Order[];
  } | null>(null);
  const [customerNotes, setCustomerNotes] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem("mshaies_crm_notes");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [crmNoteDraft, setCrmNoteDraft] = useState("");

  // Job Vacancies State & Handlers
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  const [jobDepartmentFilter, setJobDepartmentFilter] = useState("All");
  const [jobForm, setJobForm] = useState<{
    title: string;
    department: string;
    location: string;
    type: "Full-Time" | "Part-Time" | "Contract" | "Internship";
    experience: string;
    salaryRange: string;
    description: string;
    requirementsText: string;
    benefitsText: string;
    status: "Open" | "Closed";
  }>({
    title: "",
    department: "Perfumery Studio",
    location: "Pakistan Studio / Nationwide",
    type: "Full-Time",
    experience: "1-3 Years",
    salaryRange: "PKR 85,000 - 140,000 / Month",
    description: "",
    requirementsText: "",
    benefitsText: "",
    status: "Open",
  });

  const handleSaveJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobForm.title.trim() || !jobForm.description.trim()) {
      toast.error("Please provide both Job Title and Description.");
      return;
    }

    const requirements = jobForm.requirementsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const benefits = jobForm.benefitsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingJob) {
      updateJob(editingJob.id, {
        title: jobForm.title.trim(),
        department: jobForm.department.trim(),
        location: jobForm.location.trim(),
        type: jobForm.type,
        experience: jobForm.experience.trim(),
        salaryRange: jobForm.salaryRange.trim() || undefined,
        description: jobForm.description.trim(),
        requirements,
        benefits,
        status: jobForm.status,
      });
      toast.success("Job vacancy updated successfully!");
    } else {
      addJob({
        title: jobForm.title.trim(),
        department: jobForm.department.trim(),
        location: jobForm.location.trim(),
        type: jobForm.type,
        experience: jobForm.experience.trim(),
        salaryRange: jobForm.salaryRange.trim() || undefined,
        description: jobForm.description.trim(),
        requirements,
        benefits,
        status: jobForm.status,
      });
      toast.success("New artisanal vacancy published to Careers page!");
    }

    setShowAddJobModal(false);
    setEditingJob(null);
    setJobForm({
      title: "",
      department: "Perfumery Studio",
      location: "Pakistan Studio / Nationwide",
      type: "Full-Time",
      experience: "1-3 Years",
      salaryRange: "PKR 85,000 - 140,000 / Month",
      description: "",
      requirementsText: "",
      benefitsText: "",
      status: "Open",
    });
  };

  const openEditJobModal = (job: JobPosting) => {
    setEditingJob(job);
    setJobForm({
      title: job.title,
      department: job.department,
      location: job.location,
      type: job.type,
      experience: job.experience,
      salaryRange: job.salaryRange || "",
      description: job.description,
      requirementsText: job.requirements?.join("\n") || "",
      benefitsText: job.benefits?.join("\n") || "",
      status: job.status,
    });
    setShowAddJobModal(true);
  };

  // Keep settings form in sync
  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  // Supabase Auth Login (Authoritative & Secure)
  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword) {
      toast.error("Please enter your staff email and password.");
      return;
    }
    setIsAuthenticating(true);
    try {
      const res = await adminLoginServerFn({
        data: {
          email: adminEmail.trim(),
          password: adminPassword,
        },
      });

      if (res.success && res.token) {
        sessionStorage.setItem("mshaies_admin_token", res.token);
        sessionStorage.setItem(AUTH_SESSION_KEY, "true");
        localStorage.setItem("mshaies_admin_token", res.token);
        localStorage.setItem(AUTH_SESSION_KEY, "true");
        const authedEmail = res.user?.email || adminEmail.trim();
        sessionStorage.setItem("mshaies_admin_email", authedEmail);
        localStorage.setItem("mshaies_admin_email", authedEmail);
        setCurrentAdminEmail(authedEmail);
        setIsAuthenticated(true);
        refreshDataFromServer();
        setFailedAttempts(0);
        setAdminPassword("");
        toast.success(`Authenticated as ${authedEmail}`);
      } else {
        toast.error(res.error || "Authentication failed. Check your Supabase credentials.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Login request failed. Check server connection.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Secondary PIN Screen-Lock Handler (Server-Verified with Signed Session Token)
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) {
      toast.error("Too many failed attempts. Security console locked.");
      return;
    }

    if (!pinInput.trim()) {
      toast.error("Please enter the Master PIN.");
      return;
    }

    setIsAuthenticating(true);
    try {
      const res = await adminVerifyPinServerFn({
        data: { pin: pinInput.trim() },
      });

      if (res.success && res.token) {
        sessionStorage.setItem("mshaies_admin_token", res.token);
        sessionStorage.setItem(AUTH_SESSION_KEY, "true");
        localStorage.setItem("mshaies_admin_token", res.token);
        localStorage.setItem(AUTH_SESSION_KEY, "true");
        const authedEmail = res.user?.email || "admin@mshaies.com";
        sessionStorage.setItem("mshaies_admin_email", authedEmail);
        localStorage.setItem("mshaies_admin_email", authedEmail);
        setCurrentAdminEmail(authedEmail);
        setIsAuthenticated(true);
        refreshDataFromServer();
        setFailedAttempts(0);
        sessionStorage.removeItem("mshaies_failed_pin_attempts");
        sessionStorage.removeItem("mshaies_lockout_until");
        toast.success("Welcome back, Maison Administrator.");
      } else {
        const attempts = failedAttempts + 1;
        setFailedAttempts(attempts);
        sessionStorage.setItem("mshaies_failed_pin_attempts", attempts.toString());
        if (attempts >= 5 || res.error?.includes("locked")) {
          setIsLockedOut(true);
          const lockUntil = Date.now() + 60000;
          sessionStorage.setItem("mshaies_lockout_until", lockUntil.toString());
          setTimeout(() => {
            setIsLockedOut(false);
            setFailedAttempts(0);
            sessionStorage.removeItem("mshaies_lockout_until");
            sessionStorage.removeItem("mshaies_failed_pin_attempts");
          }, 60000);
        }
        toast.error(res.error || "Incorrect PIN.");
      }
    } catch (err: any) {
      toast.error(err?.message || "PIN verification failed.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem("mshaies_admin_token");
    sessionStorage.removeItem("mshaies_admin_email");
    localStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem("mshaies_admin_token");
    localStorage.removeItem("mshaies_admin_email");
    setPinInput("");
    setAdminPassword("");
    toast.info("Admin console securely locked.");
  };

  // Change PIN Handler
  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPinInput !== settings.adminPin) {
      toast.error("Current Master PIN is incorrect.");
      return;
    }
    if (newPinInput.length < 4) {
      toast.error("New PIN must be at least 4 digits.");
      return;
    }
    if (newPinInput !== confirmPinInput) {
      toast.error("New PIN confirmation does not match.");
      return;
    }

    updateSettings({ adminPin: newPinInput });
    setCurrentPinInput("");
    setNewPinInput("");
    setConfirmPinInput("");
    toast.success("Master PIN updated successfully! Remember your new PIN.");
  };

  // Save Store Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(settingsForm);
    toast.success("Store settings & shipping rules updated!");
  };

  // Stats Calculations
  const totalRevenue = orders.reduce((a, b) => a + b.total, 0);
  const totalDiscountsGiven = orders.reduce((a, b) => a + (b.discountAmount || 0), 0);

  const handleSaveNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) {
      toast.error("Please provide a product title and price.");
      return;
    }

    addProduct({
      name: newProduct.name,
      price: Number(newProduct.price),
      category: newProduct.category,
      volume: newProduct.volume,
      stock: Number(newProduct.stock),
      tagline: newProduct.tagline || "Hand-poured luxury signature perfume.",
      notes: newProduct.notes || "Oud · Amber · Rose",
      topNotes: newProduct.topNotes,
      heartNotes: newProduct.heartNotes,
      baseNotes: newProduct.baseNotes,
      image: newProduct.images?.[0] || newProduct.image || "/product-box.jpg",
      images: (newProduct.images && newProduct.images.length > 0)
        ? newProduct.images
        : [newProduct.image || "/product-box.jpg"],
      description: newProduct.description,
      isFeatured: newProduct.isFeatured,
      gender: newProduct.gender,
      longevityHours: Number(newProduct.longevityHours || 18),
      sillageRating: newProduct.sillageRating,
      fragranceFamily: newProduct.fragranceFamily as any,
      inspiredBy: newProduct.inspiredBy,
      samplePrice: Number(newProduct.samplePrice || 650),
      batchNumber: newProduct.batchNumber || "MSH-2026-B1",
      availableSizes: newProduct.availableSizes,
    });

    toast.success(`Successfully added ${newProduct.name} to the catalog!`);
    setShowAddModal(false);
  };

  // Download CSV Template for Bulk Upload
  const handleDownloadCsvTemplate = () => {
    const headers = "Name,Price,Category,Volume,Stock,Tagline,Notes,TopNotes,HeartNotes,BaseNotes,Gender,LongevityHours,SillageRating,FragranceFamily,InspiredBy,SamplePrice,BatchNumber\n";
    const sample1 = 'Amber Al-Miraj,14500,Attars,12ml Pure Attar,25,"A majestic royal amber accord","Amber · Taif Rose · Sandalwood","Bergamot, Taif Rose","Dry Amber, Frankincense","Mysore Sandalwood, Musk",Unisex,20,Strong,Floral Amber,"Inspired by Amouage & Roja Amber",650,MSH-2026-B1\n';
    const sample2 = 'Bleu Sultan Extrait,16500,Perfumes,50ml Extrait,15,"Cool crystalline aquatic ozone","Ozone · Grapefruit · Cedarwood","Grapefruit, Mint, Pink Pepper","Nutmeg, Jasmine, Ginger","Incense, Cedarwood, Patchouli",Men,16,Enormous,Fresh Citrus,"Inspired by Bleu de Chanel Parfum",750,MSH-2026-B2\n';
    const csvContent = headers + sample1 + sample2;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "mshaies_fragrance_bulk_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded CSV bulk import template!");
  };

  // Process Bulk CSV Input
  const handleProcessBulkCsv = () => {
    if (!bulkCsvInput.trim()) {
      toast.error("Please paste or upload CSV text.");
      return;
    }

    try {
      const lines = bulkCsvInput.trim().split("\n");
      if (lines.length < 2) {
        toast.error("CSV must have a header row and at least 1 product row.");
        return;
      }

      // Simple CSV parser supporting quotes
      const parseCsvLine = (line: string) => {
        const result = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
      const imported: Partial<Product>[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const row = parseCsvLine(lines[i]);
        const getVal = (key: string) => {
          const idx = header.findIndex((h) => h.includes(key));
          return idx >= 0 ? row[idx] : "";
        };

        const name = getVal("name");
        const price = Number(getVal("price"));
        if (!name || isNaN(price) || price <= 0) continue;

        imported.push({
          name,
          price,
          category: getVal("category") || "Attars",
          volume: getVal("volume") || "12ml Pure Attar",
          stock: Number(getVal("stock") || 15),
          tagline: getVal("tagline") || "Hand-poured signature fragrance.",
          notes: getVal("notes") || "Oud · Amber · Rose",
          topNotes: getVal("top") || "Bergamot, Fresh Saffron",
          heartNotes: getVal("heart") || "Damask Rose, Frankincense",
          baseNotes: getVal("base") || "Aged Cambodian Oud, Amber",
          gender: (getVal("gender") as any) || "Unisex",
          longevityHours: Number(getVal("longevity") || 18),
          sillageRating: (getVal("sillage") as any) || "Strong",
          fragranceFamily: (getVal("family") as any) || "Woody Oud",
          inspiredBy: getVal("inspired"),
          samplePrice: Number(getVal("sample") || 650),
          batchNumber: getVal("batch") || `MSH-2026-IMP${i}`,
          image: "/product-box.jpg",
          description: "Artisan hand-poured pure luxury flacon.",
          isFeatured: true,
        });
      }

      if (imported.length === 0) {
        toast.error("No valid products detected. Please check CSV formatting.");
        return;
      }

      const count = bulkImportProducts(imported);
      toast.success(`Successfully imported ${count} fragrances into inventory!`);
      setBulkCsvInput("");
      setShowBulkModal(false);
    } catch (err: any) {
      toast.error(`CSV Parsing error: ${err.message || "Invalid CSV"}`);
    }
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code.trim()) {
      toast.error("Please enter a coupon code.");
      return;
    }

    addCoupon({
      code: newCoupon.code,
      type: newCoupon.type,
      value: Number(newCoupon.value),
      minOrder: Number(newCoupon.minOrder) || 0,
      maxUses: Number(newCoupon.maxUses) || undefined,
      expiryDate: newCoupon.expiryDate || undefined,
      description: newCoupon.description || `${newCoupon.type === "percent" ? `${newCoupon.value}% OFF` : `₨ ${newCoupon.value} OFF`}`,
      isActive: true,
    });

    toast.success(`Promo code ${newCoupon.code.toUpperCase()} generated and live!`);
    setNewCoupon({
      code: "",
      type: "percent",
      value: 15,
      minOrder: 0,
      maxUses: 100,
      expiryDate: "2026-12-31",
      description: "",
    });
  };

  const handleGenerateVIPBatch = () => {
    const prefixes = ["VIP", "EID", "LUXE", "MAISON"];
    for (let i = 0; i < 5; i++) {
      const code = `${prefixes[Math.floor(Math.random() * prefixes.length)]}-${Math.floor(1000 + Math.random() * 9000)}`;
      addCoupon({
        code,
        type: "percent",
        value: 20,
        minOrder: 5000,
        maxUses: 1,
        expiryDate: "2026-12-31",
        description: "Single-Use 20% OFF VIP Voucher",
        isActive: true,
      });
    }
    toast.success("Generated 5 unique single-use VIP vouchers!");
  };

  // Export Orders as CSV
  const handleExportCSV = () => {
    if (orders.length === 0) {
      toast.error("No orders to export.");
      return;
    }

    const headers = ["Order ID", "Date", "Customer Name", "Phone", "City", "Address", "Payment Method", "Items", "Subtotal", "Discount", "Total", "Status", "Courier", "Tracking"];
    const rows = orders.map((o) => [
      o.id,
      o.date,
      `"${o.customerName}"`,
      `"${o.phone}"`,
      `"${o.city}"`,
      `"${o.address.replace(/"/g, '""')}"`,
      o.paymentMethod,
      `"${o.items.map((i) => `${i.name} (x${i.qty})`).join(", ")}"`,
      o.subtotal,
      o.discountAmount || 0,
      o.total,
      o.orderStatus,
      o.courierName || "",
      o.trackingNumber || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `mshaies-orders-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Orders CSV exported successfully!");
  };

  // Specialized Bulk Courier Booking CSV (TCS Connect / Leopards CMS / Trax Format)
  const handleExportCourierCSV = () => {
    if (orders.length === 0) {
      toast.error("No orders to export for courier booking.");
      return;
    }

    const headers = [
      "Order_Ref_No",
      "Consignee_Name",
      "Consignee_Phone",
      "Destination_City",
      "Delivery_Address",
      "COD_Amount_PKR",
      "Total_Pieces",
      "Weight_Kg",
      "Fragrance_Summary",
      "Courier_Instructions"
    ];

    const rows = orders.map((o) => [
      o.id,
      `"${o.customerName.replace(/"/g, '""')}"`,
      `"${o.phone}"`,
      `"${o.city}"`,
      `"${o.address.replace(/"/g, '""')}"`,
      o.paymentMethod === "cod" ? o.total : 0,
      o.items.reduce((sum, item) => sum + item.qty, 0),
      "0.5",
      `"${o.items.map((i) => `${i.name} (${i.volume})`).join(" + ").replace(/"/g, '""')}"`,
      `"Handle with Care - Luxury Glass Bottle. Fragile item. Contact customer before delivery."`
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `mshaies-courier-booking-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("TCS & Leopards courier bulk booking CSV downloaded!");
  };

  // Dispatch Confirmation & Auto WhatsApp Notification Trigger
  const handleConfirmDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchOrder) return;

    updateOrderStatus(
      dispatchOrder.id,
      "Dispatched",
      courierNameInput,
      trackingNumberInput.trim()
    );

    toast.success(`Order #${dispatchOrder.id} dispatched via ${courierNameInput}!`);

    const cleanPhone = dispatchOrder.phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? "92" + cleanPhone.slice(1) : cleanPhone;
    const trackingMsg = trackingNumberInput.trim() 
      ? `\n\n🚚 *Courier Service:* ${courierNameInput}\n🔢 *Tracking Number:* ${trackingNumberInput.trim()}\n📦 Your parcel is in transit and will arrive in 2-3 business days.`
      : `\n\n🚚 Your parcel is currently in transit via ${courierNameInput}.`;
    const message = `Assalam-o-Alaikum ${dispatchOrder.customerName},\n\nGreat news! Your luxury parcel *#${dispatchOrder.id}* from *M.shaies Fragrances* has been *DISPATCHED*!${trackingMsg}\n\n📄 View your official invoice: ${typeof window !== "undefined" ? window.location.origin : ""}/invoice/${dispatchOrder.id}\n\nThank you for choosing M.shaies Haute Parfumerie.\nWarm regards,\nMaison Concierge`;
    
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, "_blank");

    setDispatchOrder(null);
    setTrackingNumberInput("");
  };

  // Duplicate Fragrance Product
  const handleDuplicateProduct = (p: Product) => {
    addProduct({
      name: `${p.name} (Special Edition)`,
      price: p.price,
      category: p.category,
      volume: p.volume,
      stock: 12,
      tagline: p.tagline,
      notes: p.notes,
      topNotes: p.topNotes,
      heartNotes: p.heartNotes,
      baseNotes: p.baseNotes,
      image: p.image,
      images: p.images ? [...p.images] : [p.image],
      accent: p.accent,
      description: p.description,
      isFeatured: false,
      gender: p.gender,
      longevityHours: p.longevityHours,
      sillageRating: p.sillageRating,
      seasonSuitability: p.seasonSuitability ? [...p.seasonSuitability] : undefined,
      occasionSuitability: p.occasionSuitability ? [...p.occasionSuitability] : undefined,
      inspiredBy: p.inspiredBy,
      fragranceFamily: p.fragranceFamily,
      layeringPairId: p.layeringPairId,
      samplePrice: p.samplePrice,
      batchNumber: `${p.batchNumber || "MSH-2026"}-SE`,
    });
    toast.success(`Cloned ${p.name} as a new product edition!`);
  };

  // Customer Directory Aggregation
  const customerMap = new Map<string, {
    key: string;
    phone: string;
    name: string;
    email: string;
    city: string;
    address: string;
    totalSpent: number;
    orderCount: number;
    lastOrderDate: string;
    orders: Order[];
  }>();

  orders.forEach((o) => {
    const key = o.phone.replace(/[^0-9]/g, "") || o.customerName.toLowerCase().trim();
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        key,
        phone: o.phone,
        name: o.customerName,
        email: o.email,
        city: o.city,
        address: o.address,
        totalSpent: o.total,
        orderCount: 1,
        lastOrderDate: o.date,
        orders: [o],
      });
    } else {
      const existing = customerMap.get(key)!;
      existing.totalSpent += o.total;
      existing.orderCount += 1;
      existing.orders.push(o);
    }
  });

  const uniqueCustomers = Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);

  const filteredCustomers = uniqueCustomers.filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      c.phone.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      c.city.toLowerCase().includes(customerSearchQuery.toLowerCase());

    const matchesSegment = 
      customerSegment === "all" ? true :
      customerSegment === "whales" ? c.totalSpent >= 15000 :
      customerSegment === "repeat" ? c.orderCount >= 2 :
      customerSegment === "new" ? c.orderCount === 1 : true;

    return matchesSearch && matchesSegment;
  });

  // Client LTV metrics
  const totalCustomerLTV = uniqueCustomers.reduce((acc, c) => acc + c.totalSpent, 0);
  const avgCustomerLTV = uniqueCustomers.length > 0 ? Math.round(totalCustomerLTV / uniqueCustomers.length) : 0;
  const repeatCustomerCount = uniqueCustomers.filter((c) => c.orderCount >= 2).length;
  const repeatRatePercent = uniqueCustomers.length > 0 ? Math.round((repeatCustomerCount / uniqueCustomers.length) * 100) : 0;

  // Regional Sales by City Breakdown
  const citySales = orders.reduce((acc, o) => {
    const city = (o.city || "Other").trim();
    if (!acc[city]) acc[city] = { count: 0, revenue: 0 };
    acc[city].count += 1;
    acc[city].revenue += o.total;
    return acc;
  }, {} as Record<string, { count: number; revenue: number }>);

  const sortedCities = Object.entries(citySales).sort((a, b) => b[1].revenue - a[1].revenue);

  // --- Enhanced CRM Chart & Analytics Data ---
  // 1. Loyalty Tier Distribution (Pie / Donut Chart)
  const crmTierChartData = useMemo(() => {
    let royalVipCount = 0;
    let royalVipRev = 0;
    let goldCount = 0;
    let goldRev = 0;
    let silverCount = 0;
    let silverRev = 0;
    let newCount = 0;
    let newRev = 0;

    uniqueCustomers.forEach((c) => {
      if (c.totalSpent >= 30000) {
        royalVipCount++;
        royalVipRev += c.totalSpent;
      } else if (c.totalSpent >= 15000) {
        goldCount++;
        goldRev += c.totalSpent;
      } else if (c.totalSpent >= 7000) {
        silverCount++;
        silverRev += c.totalSpent;
      } else {
        newCount++;
        newRev += c.totalSpent;
      }
    });

    return [
      { name: "Royal VIP (₨ 30k+)", count: royalVipCount, revenue: royalVipRev, color: "#D4AF37" },
      { name: "Gold Tier (₨ 15k-30k)", count: goldCount, revenue: goldRev, color: "#F59E0B" },
      { name: "Silver Tier (₨ 7k-15k)", count: silverCount, revenue: silverRev, color: "#10B981" },
      { name: "Discovery (< ₨ 7k)", count: newCount, revenue: newRev, color: "#6366F1" },
    ].filter((t) => t.count > 0);
  }, [uniqueCustomers]);

  // 2. City Distribution Bar Chart
  const crmCityChartData = useMemo(() => {
    return sortedCities.slice(0, 6).map(([city, data]) => ({
      city,
      revenue: data.revenue,
      orders: data.count,
    }));
  }, [sortedCities]);

  // 3. Purchase Frequency & Lifecycle Retention
  const crmFrequencyChartData = useMemo(() => {
    const freqMap: Record<string, number> = {
      "1 Order": 0,
      "2 Orders": 0,
      "3 Orders": 0,
      "4+ Orders": 0,
    };
    uniqueCustomers.forEach((c) => {
      if (c.orderCount === 1) freqMap["1 Order"]++;
      else if (c.orderCount === 2) freqMap["2 Orders"]++;
      else if (c.orderCount === 3) freqMap["3 Orders"]++;
      else freqMap["4+ Orders"]++;
    });
    return Object.entries(freqMap).map(([tier, patrons]) => ({
      tier,
      patrons,
    }));
  }, [uniqueCustomers]);

  // 4. LTV Curve / Cohort Area Chart
  const crmLtvCurveData = useMemo(() => {
    const sortedByDate = [...orders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let runningTotal = 0;
    const dateMap = new Map<string, number>();

    sortedByDate.forEach((o) => {
      runningTotal += o.total;
      dateMap.set(o.date, runningTotal);
    });

    return Array.from(dateMap.entries()).map(([date, cumulative]) => ({
      date: date.length > 5 ? date.slice(5) : date,
      cumulativeLTV: cumulative,
    }));
  }, [orders]);

  const topCity = sortedCities.length > 0 ? sortedCities[0] : null;

  // CRM CSV Exporter
  const handleExportCrmCsv = () => {
    if (uniqueCustomers.length === 0) {
      toast.info("No customer profiles available to export.");
      return;
    }
    const headers = "Name,Phone,Email,City,Address,Total Spent (PKR),Orders Count,Loyalty Tier,Last Order Date\n";
    const rows = uniqueCustomers.map((c) => {
      const tier = c.totalSpent >= 30000 ? "Royal VIP" : c.totalSpent >= 15000 ? "Gold Tier" : c.totalSpent >= 7000 ? "Silver Tier" : "Discovery";
      return `"${c.name}","${c.phone}","${c.email || ""}","${c.city}","${(c.address || "").replace(/"/g, '""')}",${c.totalSpent},${c.orderCount},"${tier}","${c.lastOrderDate}"`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `mshaies-crm-patrons-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${uniqueCustomers.length} luxury patron profiles to CSV!`);
  };

  // Filtered Orders Calculation
  const filteredOrders = orders.filter((o) => {
    const matchesSearch = 
      o.id.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.phone.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.city.toLowerCase().includes(orderSearchQuery.toLowerCase());
    const matchesStatus = orderStatusFilter === "All" || o.orderStatus === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Full Store JSON Backup
  const handleDownloadBackup = () => {
    const jsonStr = exportAllStoreData();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mshaies-store-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Full Store JSON backup downloaded!");
  };

  const handleRestoreBackup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupJsonInput.trim()) return;
    const success = importStoreData(backupJsonInput);
    if (success) {
      toast.success("Store database restored successfully!");
      setBackupJsonInput("");
    } else {
      toast.error("Invalid backup JSON format. Please verify the file.");
    }
  };

  // WhatsApp 1-Click Customer Alert
  const handleSendWhatsAppNotification = (order: Order) => {
    const cleanPhone = order.phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? "92" + cleanPhone.slice(1) : cleanPhone;
    const trackingMsg = order.trackingNumber ? `\nTracking Number: *${order.trackingNumber}* via *${order.courierName || "Express Courier"}*.` : "";
    const paymentText = order.paymentMethod !== "cod"
      ? `\nPayment: *${order.paymentMethod.toUpperCase()}* (${order.paymentStatus === "Paid" ? "✅ Verified & Paid" : "⏳ " + order.paymentStatus})${order.transactionId ? `\nTransaction ID: *${order.transactionId}*` : ""}`
      : `\nPayment: *Cash on Delivery (COD)*`;
    const message = `Assalam-o-Alaikum ${order.customerName},\n\nThank you for choosing *M.shaies Fragrances*! Your order *#${order.id}* for *${formatPKR(order.total)}* has been *${order.orderStatus}*.${paymentText}${trackingMsg}\n\nView your official invoice here: ${typeof window !== "undefined" ? window.location.origin : "https://mshaies.com"}/invoice/${order.id}\n\nWarm regards,\nMuhammad Shees — M.shaies Maison Concierge`;

    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  // Pre-formatted Marketing Broadcast Templates
  const MARKETING_TEMPLATES = [
    {
      title: "🌙 Ramadan & Eid Festive Campaign",
      text: `✨ *M.shaies Fragrances — Grand Eid Maison Privilege* ✨\n\nCelebrate the blessings of Eid with hand-poured pure attars & extrait perfumes. Enjoy *15% OFF* across our entire collection with code *${settings.announcementCode}*.\n\n👑 *Signature Highlights:*\n• Oud Al-Jamil (Aged Cambodian Oud)\n• Desert Gold (35% Extrait EDP)\n• Maison Royal Chronograph Watch\n\n🚚 *Free Express Nationwide Shipping over ${formatPKR(settings.freeShippingThreshold)}*\n👉 Order Online: ${typeof window !== "undefined" ? window.location.origin : "https://mshaies.com"}/shop`,
    },
    {
      title: "👑 VIP Shaadi / Wedding Gift Offer",
      text: `⚜️ *M.shaies Fragrances — Luxury Wedding Edition* ⚜️\n\nLooking for an unforgettable signature fragrance for upcoming wedding festivities? Enjoy express delivery across Pakistan with every handcrafted bottle.\n\n💎 100% Alcohol-Free Pure Attars & 18K Gold Watches\n📦 Arrives in gold-embossed presentation boxes\n\n👉 Discover the Collection: ${typeof window !== "undefined" ? window.location.origin : "https://mshaies.com"}/shop`,
    },
    {
      title: "⚡ 48-Hour Weekend Flash Deal",
      text: `⚡ *48-HOUR FLASH OFFER — M.SHAIES FRAGRANCES* ⚡\n\nUnlock flat discounts on our best-selling fragrances. Use code *${settings.announcementCode}* at checkout.\n\n💵 Cash on Delivery (COD) + JazzCash / Easypaisa accepted nationwide.\n👉 Grab yours before stock runs out: ${typeof window !== "undefined" ? window.location.origin : "https://mshaies.com"}/shop`,
    }
  ];

  // --- MOUNTED LOADER (Prevents SSR Hydration Mismatch) ---
  if (!mounted) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center px-4 bg-background">
        <div className="max-w-md w-full rounded-3xl border border-gold/40 bg-card p-8 sm:p-10 shadow-[var(--shadow-luxe)] text-center space-y-6">
          <div className="size-20 rounded-full bg-pearl border-2 border-gold/50 flex items-center justify-center mx-auto shadow-md p-2">
            <img src="/logo-icon.png" alt="M.shaies" className="size-full object-contain" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-gold-deep font-semibold">
              M.shaies Haute Parfumerie
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl text-ink mt-1">
              Staff Management Portal
            </h1>
            <p className="text-xs text-muted-foreground mt-2">
              Loading security console...
            </p>
          </div>
          <div className="size-6 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // --- PASSWORD / AUTH SECURITY GATE ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center px-4 bg-background">
        <div className="max-w-md w-full rounded-3xl border border-gold/40 bg-card p-8 sm:p-10 shadow-[var(--shadow-luxe)] text-center space-y-6">
          <div className="size-20 rounded-full bg-pearl border-2 border-gold/50 flex items-center justify-center mx-auto shadow-md p-2">
            <img src="/logo-icon.png" alt="M.shaies" className="size-full object-contain" />
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-gold-deep font-semibold">
              M.shaies Haute Parfumerie
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl text-ink mt-1">
              Staff Management Portal
            </h1>
            <p className="text-xs text-muted-foreground mt-2">
              Sign in with your verified Supabase staff account.
            </p>
          </div>

          {/* Primary Supabase Authentication Form */}
          <form onSubmit={handleSupabaseLogin} className="space-y-4 pt-1 text-left">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gold-deep" />
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@mshaies.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gold-deep" />
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full btn-gold btn-gold-hover py-3.5 rounded-full text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isAuthenticating ? (
                <>
                  <div className="size-3.5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                  Verifying Supabase Credentials...
                </>
              ) : (
                <>
                  <Unlock className="size-3.5" />
                  Sign In with Supabase
                </>
              )}
            </button>
          </form>

          {/* Security Assurance Card */}
          <div className="p-3 rounded-xl bg-pearl border border-gold/25 text-[11px] text-muted-foreground flex items-center gap-2.5 text-left">
            <ShieldCheck className="size-4 text-gold-deep shrink-0" />
            <span>Secured via Supabase Auth & PostgreSQL Row-Level Security. Every staff session is verified & logged.</span>
          </div>

          {/* Discrete Emergency Recovery PIN Toggle */}
          <div className="pt-1">
            {!showEmergencyPin ? (
              <button
                type="button"
                onClick={() => setShowEmergencyPin(true)}
                className="text-[11px] text-muted-foreground/80 hover:text-gold-deep underline transition-colors"
              >
                Emergency Console Recovery PIN
              </button>
            ) : (
              <form onSubmit={handlePinSubmit} className="space-y-3 pt-2 text-left bg-pearl/60 p-3.5 rounded-2xl border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Emergency PIN</span>
                  <button
                    type="button"
                    onClick={() => setShowEmergencyPin(false)}
                    className="text-[10px] text-muted-foreground hover:text-ink"
                  >
                    Close
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gold-deep" />
                  <input
                    type="password"
                    maxLength={12}
                    disabled={isLockedOut || isAuthenticating}
                    placeholder="Enter custom recovery PIN"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-sm font-mono focus:border-gold focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLockedOut || isAuthenticating}
                  className="w-full py-2 rounded-full border border-gold/50 bg-background text-xs font-semibold hover:bg-gold/10 transition-colors"
                >
                  {isAuthenticating ? "Verifying..." : "Unlock with Emergency PIN"}
                </button>
              </form>
            )}
          </div>

          <div className="pt-1">
            <Link
              to="/"
              className="text-xs uppercase tracking-wider text-muted-foreground hover:text-ink inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="size-3" />
              Return to Public Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- AUTHENTICATED BUSINESS DASHBOARD ---
  return (
    <div className="pt-28 pb-20 bg-background min-h-screen">
      <div className="mx-auto max-w-[1650px] w-full px-4 sm:px-6 lg:px-8">
        
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3.5">
            <img src="/logo-icon.png" alt="M.shaies" className="size-12 rounded-2xl bg-pearl border border-gold/40 p-1.5 object-contain shadow-xs shrink-0" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-[0.25em] text-gold-deep font-semibold px-2.5 py-0.5 rounded-full bg-pearl border border-gold/30">
                  M.shaies Commercial Suite
                </span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 font-semibold">
                  Console Active
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-gold/15 text-gold-deep border border-gold/40 font-mono font-medium flex items-center gap-1">
                  <ShieldCheck className="size-3" />
                  {currentAdminEmail}
                </span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-ink mt-0.5 tracking-tight">
                Business & Store Management
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-full border border-border text-xs uppercase tracking-wider text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors flex items-center gap-1.5"
            >
              <Lock className="size-3.5" />
              Sign Out
            </button>
            <button
              onClick={handleDownloadBackup}
              className="px-4 py-2 rounded-full border border-border text-xs uppercase tracking-wider text-ink bg-card hover:border-gold transition-colors flex items-center gap-1.5 shadow-xs"
              title="Download full store backup JSON"
            >
              <Download className="size-3.5 text-gold-deep" />
              Backup Store (.JSON)
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-gold btn-gold-hover px-5 py-2.5 rounded-full text-xs uppercase tracking-wider font-semibold flex items-center gap-2 shadow-md"
            >
              <Plus className="size-4" />
              Add Product
            </button>
          </div>
        </div>

        {/* Commercial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Gross Sales Revenue</p>
              <p className="font-serif text-2xl sm:text-3xl text-ink font-bold mt-1">{formatPKR(totalRevenue)}</p>
            </div>
            <div className="size-11 rounded-full bg-emerald-500/10 border border-emerald-500/30 grid place-items-center">
              <DollarSign className="size-5 text-emerald-600" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Customer Orders</p>
              <p className="font-serif text-3xl text-ink font-bold mt-1">{orders.length} <span className="text-xs font-sans text-muted-foreground font-normal">orders</span></p>
            </div>
            <div className="size-11 rounded-full bg-pearl border border-gold/30 grid place-items-center">
              <Receipt className="size-5 text-gold-deep" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Promo Codes</p>
              <p className="font-serif text-3xl text-ink font-bold mt-1">{coupons.filter((c) => c.isActive).length} <span className="text-xs font-sans text-muted-foreground font-normal">active</span></p>
            </div>
            <div className="size-11 rounded-full bg-pearl border border-gold/30 grid place-items-center">
              <Percent className="size-5 text-gold-deep" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Discounts Saved</p>
              <p className="font-serif text-2xl text-ink font-bold mt-1">{formatPKR(totalDiscountsGiven)}</p>
            </div>
            <div className="size-11 rounded-full bg-amber-500/10 border border-amber-500/30 grid place-items-center">
              <Tag className="size-5 text-amber-600" />
            </div>
          </div>
        </div>

        {/* =============================================================== */}
        {/* LUXURY DEPARTMENTAL NAVIGATION — Zero Horizontal Scrolling      */}
        {/* =============================================================== */}
        {(() => {
          const TAB_DEPARTMENTS = [
            {
              id: "intelligence",
              label: "Executive Analytics",
              icon: TrendingUp,
              tabs: [
                { id: "analytics" as TabType, label: "Smart Analytics Hub", icon: BarChart3 },
              ],
            },
            {
              id: "catalog",
              label: "Catalog & Stock",
              icon: Boxes,
              tabs: [
                { id: "inventory" as TabType, label: "Smart Inventory", icon: Boxes },
                { id: "products" as TabType, label: "Products & Pricing", icon: Tag },
                { id: "categories" as TabType, label: "Categories", icon: Layers },
              ],
            },
            {
              id: "sales",
              label: "Sales & Fulfillment",
              icon: Receipt,
              tabs: [
                { id: "orders" as TabType, label: `Orders (${orders.length})`, icon: Receipt, count: orders.length },
                { id: "customers" as TabType, label: `VIP Clients (${uniqueCustomers.length})`, icon: Users, count: uniqueCustomers.length },
                { id: "shipping" as TabType, label: "Shipping Rates", icon: Truck },
              ],
            },
            {
              id: "marketing",
              label: "Marketing & Growth",
              icon: Megaphone,
              tabs: [
                { id: "coupons" as TabType, label: `Discount Codes (${coupons.length})`, icon: Percent, count: coupons.length },
                { id: "banner" as TabType, label: "Promotional Banners", icon: Megaphone },
                { id: "marketing" as TabType, label: "WhatsApp Broadcasts", icon: MessageCircle },
              ],
            },
            {
              id: "careers",
              label: "Careers & Hiring",
              icon: Briefcase,
              tabs: [
                { id: "jobs" as TabType, label: `Job Postings (${jobs.length})`, icon: Briefcase, count: jobs.length },
              ],
            },
            {
              id: "operations",
              label: "Security & Ops",
              icon: SettingsIcon,
              tabs: [
                { id: "settings" as TabType, label: "Security & Settings", icon: SettingsIcon },
                { id: "audit" as TabType, label: `Audit Trail (${auditLogs.length})`, icon: History, count: auditLogs.length },
              ],
            },
          ];

          const currentDept =
            TAB_DEPARTMENTS.find((d) => d.tabs.some((t) => t.id === activeTab)) || TAB_DEPARTMENTS[0];

          return (
            <div className="space-y-4 mb-8">
              {/* Tier 1: Department Pillars (Clean Grid, Zero Side Scroll) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-1.5 rounded-2xl bg-card border border-border/80 shadow-xs">
                {TAB_DEPARTMENTS.map((dept) => {
                  const DeptIcon = dept.icon;
                  const isDeptActive = dept.tabs.some((t) => t.id === activeTab);
                  return (
                    <button
                      key={dept.id}
                      onClick={() => {
                        if (!isDeptActive) {
                          setActiveTab(dept.tabs[0].id);
                        }
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isDeptActive
                          ? "bg-ink text-gold shadow-sm scale-[1.01]"
                          : "text-muted-foreground hover:text-ink hover:bg-pearl/60"
                      }`}
                    >
                      <DeptIcon className="size-4 text-gold-deep shrink-0" />
                      <span className="truncate">{dept.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tier 2: Sub-Tabs for the Selected Department */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  {currentDept.tabs.map((tab) => {
                    const TabIcon = tab.icon;
                    const isSelected = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                          isSelected
                            ? "bg-gold text-ink font-bold shadow-sm shadow-gold/20 scale-[1.02]"
                            : "bg-card border border-border/70 text-muted-foreground hover:text-ink hover:border-gold/40"
                        }`}
                      >
                        <TabIcon className="size-3.5" />
                        <span>{tab.label}</span>
                        {typeof tab.count === "number" && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                              isSelected ? "bg-ink/20 text-ink" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Quick Switch Dropdown for Instant Access to All Tabs */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold hidden sm:inline-block">
                    Quick Jump:
                  </span>
                  <select
                    value={activeTab}
                    onChange={(e) => setActiveTab(e.target.value as TabType)}
                    className="px-3 py-1.5 rounded-xl border border-border/80 bg-card text-ink text-xs uppercase tracking-wider font-semibold focus:border-gold focus:outline-none cursor-pointer"
                  >
                    <optgroup label="Executive Intelligence">
                      <option value="analytics">Smart Analytics Hub</option>
                    </optgroup>
                    <optgroup label="Catalog & Stock">
                      <option value="inventory">Smart Inventory</option>
                      <option value="products">Products & Pricing</option>
                      <option value="categories">Categories</option>
                    </optgroup>
                    <optgroup label="Sales & Fulfillment">
                      <option value="orders">Orders & Dispatch ({orders.length})</option>
                      <option value="customers">VIP Clients ({uniqueCustomers.length})</option>
                      <option value="shipping">Shipping Rates</option>
                    </optgroup>
                    <optgroup label="Marketing & Growth">
                      <option value="coupons">Discount Generator ({coupons.length})</option>
                      <option value="banner">Promotional Banners (Home, Shop & Catalogs)</option>
                      <option value="marketing">WhatsApp Broadcasts</option>
                    </optgroup>
                    <optgroup label="Careers & Hiring">
                      <option value="jobs">Artisanal Job Postings ({jobs.length})</option>
                    </optgroup>
                    <optgroup label="Store Operations">
                      <option value="settings">Security & Store Settings</option>
                      <option value="audit">Audit Trail ({auditLogs.length})</option>
                    </optgroup>
                  </select>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 0: Smart & Advanced Analytics Hub */}
        {activeTab === "analytics" && (
          <AnalyticsDashboardView
            orders={orders}
            products={products}
            coupons={coupons}
            uniqueCustomers={uniqueCustomers}
            setActiveTab={setActiveTab}
          />
        )}

        {/* TAB 1: Smart Inventory & Olfactory Vault */}
        {activeTab === "inventory" && (() => {
          const fragranceProducts = (products || []).filter((p) => !isWatchProduct(p));
          const watchProducts = (products || []).filter((p) => isWatchProduct(p));

          const totalLiquidMl = fragranceProducts.reduce((acc, p) => {
            const ml = extractVolumeInMl(p.volume);
            return acc + (ml * (p.stock || 0));
          }, 0);

          const attarLiquidMl = fragranceProducts
            .filter((p) => (p.category || "").toLowerCase().includes("attar"))
            .reduce((acc, p) => acc + (extractVolumeInMl(p.volume) * (p.stock || 0)), 0);

          const extraitLiquidMl = fragranceProducts
            .filter((p) => !(p.category || "").toLowerCase().includes("attar"))
            .reduce((acc, p) => acc + (extractVolumeInMl(p.volume) * (p.stock || 0)), 0);

          const totalBottles = fragranceProducts.reduce((acc, p) => acc + (p.stock || 0), 0);
          const totalWatches = watchProducts.reduce((acc, p) => acc + (p.stock || 0), 0);

          const bottles3ml = fragranceProducts
            .filter((p) => (p.volume || "").toLowerCase().includes("3ml"))
            .reduce((acc, p) => acc + (p.stock || 0), 0);
          const bottles6ml = fragranceProducts
            .filter((p) => (p.volume || "").toLowerCase().includes("6ml"))
            .reduce((acc, p) => acc + (p.stock || 0), 0);
          const bottles12ml = fragranceProducts
            .filter((p) => (p.volume || "").toLowerCase().includes("12ml"))
            .reduce((acc, p) => acc + (p.stock || 0), 0);
          const bottles50ml = fragranceProducts
            .filter((p) => (p.volume || "").toLowerCase().includes("50ml"))
            .reduce((acc, p) => acc + (p.stock || 0), 0);

          const totalBoxes = (packagingBoxes || []).reduce((acc, b) => acc + (b.stock || 0), 0);
          const presentationBoxes = (packagingBoxes || [])
            .filter((b) => b.category !== "shipping")
            .reduce((acc, b) => acc + (b.stock || 0), 0);
          const shippingBoxes = (packagingBoxes || [])
            .filter((b) => b.category === "shipping")
            .reduce((acc, b) => acc + (b.stock || 0), 0);
          const totalUnitsToBox = totalBottles + totalWatches;
          const boxCoverageRatio = totalUnitsToBox > 0 ? Math.round((presentationBoxes / totalUnitsToBox) * 100) : 100;

          // Filter products based on category tab & search query
          const filteredItems = (products || []).filter((p) => {
            const isW = isWatchProduct(p);
            if (inventoryCategoryFilter === "fragrances" && isW) return false;
            if (inventoryCategoryFilter === "watches" && !isW) return false;
            if (inventoryCategoryFilter === "boxes") return false;

            if (!inventorySearchQuery.trim()) return true;
            const q = inventorySearchQuery.toLowerCase();
            return (
              p.name.toLowerCase().includes(q) ||
              (p.category || "").toLowerCase().includes(q) ||
              (p.notes || "").toLowerCase().includes(q) ||
              (p.volume || "").toLowerCase().includes(q)
            );
          });

          const filteredBoxes = (packagingBoxes || []).filter((b) => {
            if (inventoryCategoryFilter === "fragrances" || inventoryCategoryFilter === "watches") return false;
            if (!inventorySearchQuery.trim()) return true;
            const q = inventorySearchQuery.toLowerCase();
            return (
              b.name.toLowerCase().includes(q) ||
              b.suitableFor.toLowerCase().includes(q) ||
              b.material.toLowerCase().includes(q)
            );
          });

          const getBoxMatch = (p: Product) => {
            if (isWatchProduct(p)) return packagingBoxes.find((b) => b.category === "watch");
            const vol = (p.volume || "").toLowerCase();
            if (vol.includes("12ml")) return packagingBoxes.find((b) => b.id === "box-attar-12ml");
            if (vol.includes("6ml")) return packagingBoxes.find((b) => b.id === "box-attar-6ml");
            if (vol.includes("50ml")) return packagingBoxes.find((b) => b.id === "box-spray-50ml");
            if (vol.includes("3ml") || vol.includes("sample")) return packagingBoxes.find((b) => b.id === "box-discovery-slide");
            return packagingBoxes.find((b) => b.category === "attar") || packagingBoxes[0];
          };

          return (
            <div className="space-y-8">
              {/* 1. Header Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-card border border-border/80 shadow-sm">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="size-10 rounded-2xl bg-gold/15 border border-gold/40 grid place-items-center text-gold-deep">
                      <Boxes className="size-5" />
                    </div>
                    <div>
                      <h2 className="font-serif text-2xl text-ink font-bold">
                        Smart Stock & Olfactory Vault
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Track pure fragrance liquid volume (ml), finished flacon bottles, luxury timepieces, and presentation packaging boxes.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={inventorySearchQuery}
                      onChange={(e) => setInventorySearchQuery(e.target.value)}
                      placeholder="Search perfume, ml, watch, box..."
                      className="pl-8 pr-3 py-1.5 rounded-full border border-border/80 bg-background text-xs text-ink focus:border-gold focus:outline-none w-56 sm:w-64"
                    />
                    {inventorySearchQuery && (
                      <button
                        onClick={() => setInventorySearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink text-xs"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-gold btn-gold-hover px-4 py-2 rounded-full text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              {/* 2. Four Luxury Metric Pillar Cards: ml, Bottles, Watches, Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Pillar 1: Pure Fragrance Liquid (ml) */}
                <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Fragrance Liquid (ml)
                    </span>
                    <div className="size-9 rounded-xl bg-sky-500/10 border border-sky-500/20 grid place-items-center text-sky-600">
                      <Droplets className="size-4.5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="font-serif text-3xl font-bold text-ink leading-tight">
                      {totalLiquidMl.toLocaleString()} <span className="text-sm font-sans font-medium text-gold-deep">ml</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                      Attars: {attarLiquidMl.toLocaleString()} ml · Extraits: {extraitLiquidMl.toLocaleString()} ml
                    </p>
                    <div className="h-1.5 w-full rounded-full bg-muted mt-2 overflow-hidden">
                      <div className="h-full bg-sky-500 rounded-full" style={{ width: "85%" }} />
                    </div>
                  </div>
                </div>

                {/* Pillar 2: Finished Flacons & Bottles */}
                <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Finished Bottled Flacons
                    </span>
                    <div className="size-9 rounded-xl bg-gold/15 border border-gold/30 grid place-items-center text-gold-deep">
                      <Package className="size-4.5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="font-serif text-3xl font-bold text-ink leading-tight">
                      {totalBottles} <span className="text-sm font-sans font-medium text-muted-foreground">bottles</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                      12ml: {bottles12ml} · 6ml: {bottles6ml} · 50ml: {bottles50ml} · 3ml: {bottles3ml}
                    </p>
                    <div className="h-1.5 w-full rounded-full bg-muted mt-2 overflow-hidden">
                      <div className="h-full bg-gold rounded-full" style={{ width: `${Math.min(100, (totalBottles / 200) * 100)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Pillar 3: Horology Timepieces */}
                <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Horology Timepieces
                    </span>
                    <div className="size-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-600">
                      <Clock className="size-4.5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="font-serif text-3xl font-bold text-ink leading-tight">
                      {totalWatches} <span className="text-sm font-sans font-medium text-muted-foreground">watches</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                      {watchProducts.length} Editions · 18K Gold, Steel & Leather
                    </p>
                    <div className="h-1.5 w-full rounded-full bg-muted mt-2 overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${Math.min(100, (totalWatches / 40) * 100)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Pillar 4: Presentation & Shipping Boxes */}
                <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Packaging & Gift Boxes
                    </span>
                    <div className="size-9 rounded-xl bg-amber-500/10 border border-amber-500/20 grid place-items-center text-amber-600">
                      <Gift className="size-4.5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="font-serif text-3xl font-bold text-ink leading-tight">
                      {totalBoxes} <span className="text-sm font-sans font-medium text-muted-foreground">boxes</span>
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[10px]">
                      <span className="text-muted-foreground">{presentationBoxes} Gift · {shippingBoxes} Courier</span>
                      <span className={`font-bold ${boxCoverageRatio >= 100 ? "text-emerald-600" : "text-amber-600"}`}>
                        {boxCoverageRatio}% Coverage
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${boxCoverageRatio >= 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                        style={{ width: `${Math.min(100, boxCoverageRatio)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Category Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-card border border-border/80 shadow-xs">
                {(
                  [
                    { id: "all", label: `All Assets (${products.length + packagingBoxes.length})`, icon: Boxes },
                    { id: "fragrances", label: `🧴 Fragrances by ml & Bottles (${fragranceProducts.length})`, icon: Droplets },
                    { id: "watches", label: `⌚ Luxury Watches (${watchProducts.length})`, icon: Clock },
                    { id: "boxes", label: `🎁 Presentation & Courier Boxes (${packagingBoxes.length})`, icon: Gift },
                  ] as const
                ).map((tab) => {
                  const isSelected = inventoryCategoryFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setInventoryCategoryFilter(tab.id)}
                      className={`px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-ink text-gold shadow-sm scale-102"
                          : "text-muted-foreground hover:text-ink hover:bg-pearl/60"
                      }`}
                    >
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 4. Fragrance & Watches Stock Table (when not only boxes) */}
              {inventoryCategoryFilter !== "boxes" && (
                <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-serif text-xl text-ink font-bold flex items-center gap-2">
                        <span>Fragrances & Timepieces Vault</span>
                        <span className="text-xs font-sans font-semibold text-muted-foreground">
                          ({filteredItems.length} items)
                        </span>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Specific liquid volume in milliliters (ml), unit flacon count, and assigned presentation coffret.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-sky-700">
                        <span className="size-2 rounded-full bg-sky-500" />
                        Liquid Volume (ml)
                      </span>
                      <span className="flex items-center gap-1.5 text-amber-700">
                        <span className="size-2 rounded-full bg-amber-500" />
                        Matched Packaging Box
                      </span>
                    </div>
                  </div>

                  <div className="w-full overflow-hidden">
                    <table className="w-full text-left text-xs table-auto">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 uppercase tracking-wider text-[10px] text-muted-foreground">
                          <th className="py-3 px-4 w-[32%]">Product & Flacon</th>
                          <th className="py-3 px-4 w-[18%]">Liquid Volume (ml)</th>
                          <th className="py-3 px-4 w-[20%]">Matched Packaging</th>
                          <th className="py-3 px-4 w-[13%]">Stock in Vault</th>
                          <th className="py-3 px-4 w-[8%]">Status</th>
                          <th className="py-3 px-4 w-[9%] text-right">Quick Restock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {filteredItems.map((p) => {
                          const isWatch = isWatchProduct(p);
                          const mlPerUnit = extractVolumeInMl(p.volume);
                          const totalProductMl = (p.stock || 0) * mlPerUnit;
                          const matchedBox = getBoxMatch(p);

                          const isOut = (p.stock || 0) <= 0;
                          const isLow = (p.stock || 0) > 0 && (p.stock || 0) <= (isWatch ? 3 : 5);

                          return (
                            <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                              {/* Product Thumbnail, Name, Format & Category */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={p.image}
                                    alt={p.name}
                                    className="size-10 rounded-xl object-contain bg-pearl border border-gold/30 p-0.5 shrink-0 shadow-2xs"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-serif text-sm font-bold text-ink leading-tight">
                                        {p.name}
                                      </p>
                                      <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider bg-pearl border border-border text-ink">
                                        {p.category}
                                      </span>
                                    </div>
                                    <p className="text-[11px] font-semibold text-gold-deep mt-0.5">
                                      {p.volume}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground truncate max-w-[260px]">
                                      {p.notes || p.tagline}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Specific Liquid in Milliliters (ml) */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {isWatch ? (
                                  <div>
                                    <span className="text-[11px] font-semibold text-emerald-700 block whitespace-nowrap">
                                      Timepiece Asset
                                    </span>
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                      Sapphire Glass & Steel
                                    </span>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                                      <span className="font-serif font-bold text-sm text-sky-700">
                                        {totalProductMl.toLocaleString()} ml
                                      </span>
                                      <span className="text-[10px] text-muted-foreground font-mono">
                                        ({mlPerUnit} ml/btl)
                                      </span>
                                    </div>
                                    <div className="h-1.5 w-24 max-w-full rounded-full bg-muted mt-1.5 overflow-hidden">
                                      <div
                                        className="h-full bg-sky-500 rounded-full"
                                        style={{ width: `${Math.min(100, Math.max(10, (totalProductMl / 300) * 100))}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Matched Box Packaging */}
                              <td className="py-3.5 px-4">
                                {matchedBox ? (
                                  <div>
                                    <p className="font-semibold text-ink text-xs flex items-center gap-1.5">
                                      <Box className="size-3 text-gold-deep shrink-0" />
                                      <span className="truncate">{matchedBox.name}</span>
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
                                      {matchedBox.stock} boxes in stock
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs whitespace-nowrap">Standard Packaging</span>
                                )}
                              </td>

                              {/* Current Stock Input */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min={0}
                                    value={p.stock}
                                    onChange={(e) => updateStock(p.id, parseInt(e.target.value) || 0)}
                                    className="w-18 px-2.5 py-1.5 rounded-xl border border-border bg-background text-ink font-semibold focus:border-gold focus:outline-none text-xs text-center"
                                  />
                                  <span className="text-muted-foreground text-[11px] font-medium">
                                    {isWatch ? "watches" : "bottles"}
                                  </span>
                                </div>
                              </td>

                              {/* Health */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {isOut ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/15 text-destructive border border-destructive/30 whitespace-nowrap inline-block">
                                    Sold Out
                                  </span>
                                ) : isLow ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600 border border-amber-500/30 whitespace-nowrap inline-block">
                                    Low ({p.stock})
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 whitespace-nowrap inline-block">
                                    Healthy ({p.stock})
                                  </span>
                                )}
                              </td>

                              {/* Quick Restock Buttons */}
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1">
                                  {(isWatch ? [1, 5, 10] : [5, 10, 25]).map((qty) => (
                                    <button
                                      key={qty}
                                      onClick={() => {
                                        updateStock(p.id, (p.stock || 0) + qty);
                                        toast.success(`Added +${qty} to ${p.name}`);
                                      }}
                                      className="px-2 py-1 rounded-lg border border-border/80 bg-background hover:bg-gold hover:text-ink text-[10px] font-bold transition-colors cursor-pointer"
                                    >
                                      +{qty}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 5. Packaging & Presentation Boxes Management Grid */}
              {(inventoryCategoryFilter === "all" || inventoryCategoryFilter === "boxes") && (
                <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm space-y-6 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
                    <div>
                      <div className="flex items-center gap-2">
                        <Gift className="size-5 text-gold-deep" />
                        <h3 className="font-serif text-xl font-bold text-ink">
                          Luxury Presentation Boxes & Shipping Packaging
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Manage stocks of gold-embossed coffrets, flacon presentation boxes, and courier transit packaging.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-3 py-1 rounded-full bg-pearl border border-gold/30 font-bold text-gold-deep">
                        Total Packaging: {totalBoxes} Boxes
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredBoxes.map((box) => {
                      const isLowBox = box.stock <= box.minThreshold;

                      return (
                        <div
                          key={box.id}
                          className="p-5 rounded-2xl border border-border/80 bg-background flex flex-col justify-between gap-4 shadow-xs hover:border-gold/50 transition-colors"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-serif text-base font-bold text-ink leading-tight">
                                  {box.name}
                                </h4>
                                <span className="text-[10px] uppercase tracking-wider font-semibold text-gold-deep">
                                  {box.category.toUpperCase()} PACKAGING
                                </span>
                              </div>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  isLowBox
                                    ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                                    : "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                                }`}
                              >
                                {isLowBox ? "Low Supply" : "Adequate"}
                              </span>
                            </div>

                            <p className="text-xs text-ink font-medium">
                              Suitable For: <strong className="text-muted-foreground font-normal">{box.suitableFor}</strong>
                            </p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {box.material}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                value={box.stock}
                                onChange={(e) => updatePackagingStock(box.id, parseInt(e.target.value) || 0, true)}
                                className="w-20 px-3 py-1 rounded-lg border border-border bg-card text-ink font-bold text-xs focus:border-gold focus:outline-none"
                              />
                              <span className="text-xs text-muted-foreground font-medium">boxes</span>
                            </div>

                            <div className="flex items-center gap-1">
                              {[25, 50, 100].map((qty) => (
                                <button
                                  key={qty}
                                  onClick={() => {
                                    updatePackagingStock(box.id, qty);
                                    toast.success(`Restocked +${qty} boxes of ${box.name}`);
                                  }}
                                  className="px-2 py-1 rounded-md border border-border/80 text-[10px] font-bold hover:bg-gold hover:text-ink transition-colors cursor-pointer"
                                >
                                  +{qty}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 6. Specific Fragrance Liquid Milliliters (ml) Reserve Table */}
              <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <Droplets className="size-5 text-sky-600" />
                    <div>
                      <h3 className="font-serif text-lg text-ink font-bold">
                        Fragrance Liquid Juice Reserves (ml) Matrix
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Specific breakdown of pure liquid extrait and concentrated attar volume currently resting in the vault.
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-ink bg-pearl px-3 py-1 rounded-full border border-gold/30">
                    Grand Total: {totalLiquidMl.toLocaleString()} ml
                  </span>
                </div>

                <div className="w-full overflow-hidden">
                  <table className="w-full text-left text-xs table-auto">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 uppercase tracking-wider text-[10px] text-muted-foreground">
                        <th className="py-2.5 px-4 w-[32%]">Fragrance</th>
                        <th className="py-2.5 px-4 w-[12%]">Type</th>
                        <th className="py-2.5 px-4 w-[10%]">Flacon Size</th>
                        <th className="py-2.5 px-4 w-[14%]">Bottles in Stock</th>
                        <th className="py-2.5 px-4 w-[14%] font-bold text-sky-700">Liquid Juice in ml</th>
                        <th className="py-2.5 px-4 w-[12%]">Retail Value</th>
                        <th className="py-2.5 px-4 w-[6%] text-right">Vault Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {fragranceProducts
                        .map((p) => {
                          const ml = extractVolumeInMl(p.volume);
                          const totalMl = (p.stock || 0) * ml;
                          const retailVal = (p.stock || 0) * p.price;
                          const share = totalLiquidMl > 0 ? Math.round((totalMl / totalLiquidMl) * 100) : 0;

                          return { p, ml, totalMl, retailVal, share };
                        })
                        .sort((a, b) => b.totalMl - a.totalMl)
                        .map(({ p, ml, totalMl, retailVal, share }) => (
                          <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  className="size-8 rounded-lg object-contain bg-pearl border border-border shrink-0"
                                />
                                <span className="font-serif font-bold text-ink whitespace-nowrap">{p.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{p.category}</td>
                            <td className="py-3 px-4 font-semibold text-ink whitespace-nowrap">{ml} ml</td>
                            <td className="py-3 px-4 font-mono font-semibold text-ink whitespace-nowrap">{p.stock} bottles</td>
                            <td className="py-3 px-4 font-bold text-sky-700 font-mono text-sm whitespace-nowrap">
                              {totalMl.toLocaleString()} ml
                            </td>
                            <td className="py-3 px-4 font-serif font-semibold text-ink whitespace-nowrap">
                              {formatPKR(retailVal)}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <span className="font-mono text-xs text-muted-foreground">{share}%</span>
                                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full bg-sky-500 rounded-full" style={{ width: `${share}%` }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 2: Products & Dynamic Pricing */}
        {activeTab === "products" && (
          <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl text-ink">Products & Dynamic Pricing</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set prices in PKR, toggle featured showcases, edit sensory specifications, and batch upload items.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadCsvTemplate}
                  className="px-3.5 py-2 rounded-full border border-border/80 bg-pearl/60 text-ink font-semibold text-xs flex items-center gap-1.5 hover:bg-gold/20 cursor-pointer"
                  title="Download blank CSV template for Excel or Google Sheets"
                >
                  <FileSpreadsheet className="size-3.5 text-gold-deep" />
                  <span>CSV Template</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBulkModal(true)}
                  className="px-3.5 py-2 rounded-full border border-gold/40 bg-pearl text-gold-deep font-semibold text-xs flex items-center gap-1.5 hover:bg-gold hover:text-ink cursor-pointer"
                >
                  <UploadCloud className="size-3.5" />
                  <span>Bulk Upload</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="btn-gold btn-gold-hover px-4 py-2 rounded-full text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="size-4" />
                  Add Fragrance
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 uppercase tracking-wider text-[10px] text-muted-foreground">
                    <th className="py-3 px-6">Product</th>
                    <th className="py-3 px-6">Category</th>
                    <th className="py-3 px-6">Bottle Volume</th>
                    <th className="py-3 px-6">Price (PKR)</th>
                    <th className="py-3 px-6">Homepage Showcase</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-14 text-center text-muted-foreground">
                        <Package className="size-8 mx-auto text-gold-deep opacity-60 mb-2" />
                        <p className="font-serif text-base text-ink">No fragrances found in catalog</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Your Supabase catalog is currently empty. Use the "Add New Fragrance" button or upload a CSV template to add items.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-4 px-6 flex items-center gap-3">
                        <img src={p.image} alt={p.name} className="size-11 rounded-lg object-contain bg-pearl border border-border" />
                        <div>
                          <p className="font-serif text-sm font-semibold text-ink">{p.name}</p>
                          <p className="text-[10px] text-gold-deep font-semibold">{p.volume}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-muted-foreground">{p.category}</td>
                      {/* BOTTLE VOLUME EDITING */}
                      <td className="py-4 px-6">
                        {editingVolumeId === p.id ? (
                          <div className="flex flex-col gap-1.5 min-w-[200px]">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={tempVolume}
                                onChange={(e) => setTempVolume(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-gold bg-background text-ink font-semibold text-xs focus:outline-none"
                                placeholder="e.g. 12ml Pure Attar"
                                autoFocus
                              />
                              <button
                                onClick={() => {
                                  if (tempVolume.trim()) {
                                    updateProduct(p.id, { volume: tempVolume.trim() });
                                    setEditingVolumeId(null);
                                    toast.success(`Updated ${p.name} volume to "${tempVolume.trim()}"`);
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-gold text-ink font-bold text-[11px] hover:brightness-105"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingVolumeId(null)}
                                className="px-2 py-1.5 text-muted-foreground hover:text-ink text-[11px]"
                              >
                                Cancel
                              </button>
                            </div>
                            {/* Preset Pills */}
                            <div className="flex flex-wrap gap-1">
                              {["6ml Pure Attar", "12ml Pure Attar", "50ml Extrait", "100ml Extrait"].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => setTempVolume(preset)}
                                  className="text-[9px] px-2 py-0.5 rounded-full border border-border/80 hover:border-gold hover:text-gold-deep bg-pearl transition-colors"
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-pearl border border-gold/30 text-ink">
                              {p.volume}
                            </span>
                            <button
                              onClick={() => {
                                setEditingVolumeId(p.id);
                                setTempVolume(p.volume);
                              }}
                              className="p-1 text-muted-foreground hover:text-gold-deep rounded transition-colors"
                              title="Edit Bottle Volume"
                            >
                              <Edit3 className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {editingPriceId === p.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={tempPrice}
                              onChange={(e) => setTempPrice(Number(e.target.value))}
                              className="w-28 px-3 py-1.5 rounded-lg border border-gold bg-background text-ink font-semibold focus:outline-none"
                            />
                            <button
                              onClick={() => {
                                updateProduct(p.id, { price: tempPrice });
                                setEditingPriceId(null);
                                toast.success("Price updated!");
                              }}
                              className="px-3 py-1.5 rounded-lg bg-gold text-ink font-semibold text-[11px]"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingPriceId(null)}
                              className="px-2 py-1.5 text-muted-foreground hover:text-ink text-[11px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-serif text-base font-semibold text-ink">
                              {formatPKR(p.price)}
                            </span>
                            <button
                              onClick={() => {
                                setEditingPriceId(p.id);
                                setTempPrice(p.price);
                              }}
                              className="p-1 text-muted-foreground hover:text-gold-deep"
                              title="Edit Price"
                            >
                              <Edit3 className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => {
                            updateProduct(p.id, { isFeatured: !p.isFeatured });
                            toast.success(`Updated ${p.name} featured status.`);
                          }}
                          className={`px-3 py-1 rounded-full text-[10px] font-semibold border ${
                            p.isFeatured
                              ? "bg-gold/20 text-ink border-gold/40"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {p.isFeatured ? "Featured on Home" : "Catalog Only"}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingProduct({ 
                              ...p, 
                              images: (p.images && p.images.length > 0) ? [...p.images] : [p.image || "/product-box.jpg"],
                              availableSizes: p.availableSizes || (settings.flaconSizes ? settings.flaconSizes.filter(s => s.isEnabled).map(s => s.label) : ["3ml", "6ml", "12ml", "50ml"]),
                            })}
                            className="p-2 rounded-lg border border-gold/60 text-gold-deep hover:bg-gold hover:text-ink transition-colors"
                            title="Edit Full Fragrance & Volume Details"
                          >
                            <Edit3 className="size-3.5" />
                          </button>
                          <Link
                            to="/product/$id"
                            params={{ id: p.id }}
                            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-ink hover:bg-pearl"
                            title="View on Store"
                          >
                            <Eye className="size-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDuplicateProduct(p)}
                            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-gold-deep hover:bg-gold/10 transition-colors"
                            title="Duplicate Fragrance (Create New Edition)"
                          >
                            <Copy className="size-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${p.name}?`)) {
                                deleteProduct(p.id);
                                toast.success(`Deleted ${p.name}`);
                              }
                            }}
                            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete Item"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: SHIPPING RATES & COURIER MATRIX */}
        {activeTab === "shipping" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl text-ink font-bold flex items-center gap-2">
                  <Truck className="size-6 text-gold-deep" />
                  Shipping Rates & Delivery Matrix
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure nationwide courier fees, automated free delivery thresholds, express flight dispatch, and local city rates.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                className="btn-gold btn-gold-hover px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-bold flex items-center gap-2 shadow-md shrink-0 cursor-pointer self-start sm:self-auto"
              >
                <Check className="size-4" />
                Save Shipping Rates
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Courier Rates Configuration */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* Card 1: Standard Nationwide Courier */}
                  <div className="p-6 rounded-3xl border border-border/80 bg-card shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border/60">
                      <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-full bg-gold/15 border border-gold/40 grid place-items-center">
                          <Truck className="size-4 text-gold-deep" />
                        </div>
                        <div>
                          <h3 className="font-serif text-lg text-ink font-bold">Standard Nationwide Delivery</h3>
                          <p className="text-[11px] text-muted-foreground">Applies to all cities across Pakistan (Karachi, Islamabad, Peshawar, Quetta, etc.)</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-pearl border border-gold/40 text-ink">
                        Default Rate
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                          Courier Fee (PKR) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-serif">₨</span>
                          <input
                            type="number"
                            required
                            min={0}
                            value={settingsForm.standardShippingFee}
                            onChange={(e) => setSettingsForm({ ...settingsForm, standardShippingFee: Number(e.target.value) })}
                            className="w-full pl-8 pr-4 py-2 rounded-xl border border-border bg-background text-sm font-semibold text-ink focus:border-gold focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                          Delivery Timeline
                        </label>
                        <input
                          type="text"
                          value={settingsForm.shippingEstimateDays || "2-4 Business Days"}
                          onChange={(e) => setSettingsForm({ ...settingsForm, shippingEstimateDays: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs text-ink focus:border-gold focus:outline-none"
                          placeholder="e.g. 2-4 Business Days"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                          Courier Services
                        </label>
                        <input
                          type="text"
                          value={settingsForm.courierPartners || "TCS Express & Leopards"}
                          onChange={(e) => setSettingsForm({ ...settingsForm, courierPartners: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs text-ink focus:border-gold focus:outline-none"
                          placeholder="e.g. TCS & Leopards Courier"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Automated Free Shipping Promotion Threshold */}
                  <div className="p-6 rounded-3xl border border-gold/40 bg-pearl/40 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gold/20">
                      <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-full bg-emerald-500/15 border border-emerald-500/40 grid place-items-center text-emerald-600">
                          <CheckCircle2 className="size-4" />
                        </div>
                        <div>
                          <h3 className="font-serif text-lg text-ink font-bold">Automated Free Shipping Incentive</h3>
                          <p className="text-[11px] text-muted-foreground">Waive shipping fees automatically when cart subtotal meets your threshold.</p>
                        </div>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs font-semibold text-ink">Enable</span>
                        <input
                          type="checkbox"
                          checked={settingsForm.freeShippingEnabled !== false}
                          onChange={(e) => setSettingsForm({ ...settingsForm, freeShippingEnabled: e.target.checked })}
                          className="size-4 accent-gold cursor-pointer"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                          Free Shipping Minimum Cart Value (PKR) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-serif">₨</span>
                          <input
                            type="number"
                            required
                            min={500}
                            step={500}
                            value={settingsForm.freeShippingThreshold}
                            onChange={(e) => setSettingsForm({ ...settingsForm, freeShippingThreshold: Number(e.target.value) })}
                            className="w-full pl-8 pr-4 py-2 rounded-xl border border-gold bg-background text-sm font-serif font-bold text-ink focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-card border border-border/80 text-xs text-muted-foreground space-y-1">
                        <p className="font-semibold text-ink">💡 Active Live Promotion:</p>
                        <p>
                          Orders of <strong className="text-gold-deep">{formatPKR(settingsForm.freeShippingThreshold)}</strong> or more will automatically receive <strong className="text-emerald-600">₨ 0 (FREE)</strong> delivery at checkout.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Express VIP Flight Courier & Lahore Local Delivery */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Express VIP Air Dispatch */}
                    <div className="p-5 rounded-3xl border border-border/80 bg-card space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <div>
                          <h4 className="font-serif text-base text-ink font-bold">VIP Express Flight Dispatch</h4>
                          <p className="text-[10px] text-muted-foreground">Priority next-day courier for urgent orders</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settingsForm.expressShippingActive !== false}
                          onChange={(e) => setSettingsForm({ ...settingsForm, expressShippingActive: e.target.checked })}
                          className="size-4 accent-gold cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-ink font-bold mb-1">
                          Express Courier Fee (PKR)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs text-muted-foreground font-serif">₨</span>
                          <input
                            type="number"
                            min={0}
                            value={settingsForm.expressShippingFee || 450}
                            onChange={(e) => setSettingsForm({ ...settingsForm, expressShippingFee: Number(e.target.value) })}
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border bg-background text-xs font-semibold text-ink focus:border-gold focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Lahore Local Studio Delivery */}
                    <div className="p-5 rounded-3xl border border-border/80 bg-card space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <div>
                          <h4 className="font-serif text-base text-ink font-bold">Local City Rider Rate</h4>
                          <p className="text-[10px] text-muted-foreground">Same-day rider dispatch for local city deliveries</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settingsForm.lahoreLocalActive !== false}
                          onChange={(e) => setSettingsForm({ ...settingsForm, lahoreLocalActive: e.target.checked })}
                          className="size-4 accent-gold cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-ink font-bold mb-1">
                          Local Rider Fee (PKR)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs text-muted-foreground font-serif">₨</span>
                          <input
                            type="number"
                            min={0}
                            value={settingsForm.lahoreLocalFee || 150}
                            onChange={(e) => setSettingsForm({ ...settingsForm, lahoreLocalFee: Number(e.target.value) })}
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border bg-background text-xs font-semibold text-ink focus:border-gold focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Cash on Delivery Handling Fee */}
                  <div className="p-5 rounded-3xl border border-border/80 bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-serif text-base text-ink font-bold">Cash on Delivery (COD) Handling Surcharge</h4>
                        <p className="text-[11px] text-muted-foreground">Additional courier fee charged when paying cash at doorstep (Enter 0 for Free COD)</p>
                      </div>
                      <div className="w-36">
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs text-muted-foreground font-serif">₨</span>
                          <input
                            type="number"
                            min={0}
                            value={settingsForm.codFee || 0}
                            onChange={(e) => setSettingsForm({ ...settingsForm, codFee: Number(e.target.value) })}
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border bg-background text-xs font-semibold text-ink focus:border-gold focus:outline-none"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Column: Live Customer Experience Simulation */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="p-6 rounded-3xl border border-gold/50 bg-card shadow-md space-y-5 sticky top-24">
                    <div className="flex items-center gap-2 pb-3 border-b border-border">
                      <Truck className="size-4 text-gold-deep" />
                      <h3 className="font-serif text-lg text-ink font-bold">Checkout Rates Preview</h3>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Here is how shipping will automatically calculate for customers on your store:
                    </p>

                    <div className="space-y-3 text-xs">
                      <div className="p-3 rounded-2xl bg-pearl border border-border flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-ink">Standard Order (&lt; {formatPKR(settingsForm.freeShippingThreshold)})</p>
                          <p className="text-[10px] text-muted-foreground">{settingsForm.shippingEstimateDays || "2-4 Business Days"}</p>
                        </div>
                        <span className="font-serif font-bold text-ink">{formatPKR(settingsForm.standardShippingFee)}</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-emerald-800">Free Shipping Order (&ge; {formatPKR(settingsForm.freeShippingThreshold)})</p>
                          <p className="text-[10px] text-emerald-600">Automatic Nationwide Waiver</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">FREE (₨ 0)</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-pearl border border-border flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-ink">VIP Express Air Dispatch</p>
                          <p className="text-[10px] text-muted-foreground">Urgent 24-48 Hours</p>
                        </div>
                        <span className="font-serif font-bold text-gold-deep">{formatPKR(settingsForm.expressShippingFee || 450)}</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-pearl border border-border flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-ink">Local City Bike Dispatch</p>
                          <p className="text-[10px] text-muted-foreground">Same-Day Local Rider</p>
                        </div>
                        <span className="font-serif font-bold text-ink">{formatPKR(settingsForm.lahoreLocalFee || 150)}</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full btn-gold btn-gold-hover py-3 rounded-full text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      <Check className="size-4" />
                      Save Shipping Rates
                    </button>
                  </div>
                </div>

              </div>
            </form>
          </div>
        )}

        {/* TAB 3: SMART DISCOUNT & PROMO GENERATOR */}
        {activeTab === "coupons" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Form: Create New Discount Code */}
              <div className="lg:col-span-5 rounded-3xl border border-gold/40 bg-card p-6 sm:p-7 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Percent className="size-5 text-gold-deep" />
                    <h3 className="font-serif text-xl text-ink font-bold">Generate Promo Code</h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateVIPBatch}
                    className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-pearl border border-gold/40 text-gold-deep hover:bg-gold hover:text-ink font-bold transition-colors"
                    title="Generate 5 single-use random VIP coupons"
                  >
                    + Batch VIP Codes
                  </button>
                </div>

                <form onSubmit={handleCreateCoupon} className="space-y-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Coupon Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. RAMADAN20 or FLASH500"
                      value={newCoupon.code}
                      onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-mono font-bold text-ink focus:border-gold focus:outline-none uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                        Discount Type
                      </label>
                      <select
                        value={newCoupon.type}
                        onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value as any })}
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-xs text-ink focus:border-gold focus:outline-none"
                      >
                        <option value="percent">Percentage (% OFF)</option>
                        <option value="flat">Flat Amount (₨ OFF)</option>
                        <option value="shipping">Free Shipping</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                        {newCoupon.type === "percent" ? "Discount %" : newCoupon.type === "flat" ? "Discount ₨" : "Shipping Value"}
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={newCoupon.value}
                        onChange={(e) => setNewCoupon({ ...newCoupon, value: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink font-semibold focus:border-gold focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                        Min. Order (PKR)
                      </label>
                      <input
                        type="number"
                        min={0}
                        placeholder="0 for none"
                        value={newCoupon.minOrder}
                        onChange={(e) => setNewCoupon({ ...newCoupon, minOrder: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                        Max Redemptions
                      </label>
                      <input
                        type="number"
                        min={1}
                        placeholder="100"
                        value={newCoupon.maxUses}
                        onChange={(e) => setNewCoupon({ ...newCoupon, maxUses: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Campaign Description / Tagline
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Special Eid Festive 15% OFF"
                      value={newCoupon.description}
                      onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full btn-gold btn-gold-hover py-3.5 rounded-full text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Plus className="size-4" />
                    Activate Coupon Code
                  </button>
                </form>
              </div>

              {/* Right Table: Active Discounts & Usage Tracker */}
              <div className="lg:col-span-7 rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border flex justify-between items-center">
                  <div>
                    <h3 className="font-serif text-xl text-ink font-bold">Active Promo Codes ({coupons.length})</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Coupons work immediately on the checkout page.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 uppercase tracking-wider text-[10px] text-muted-foreground">
                        <th className="py-3 px-5">Code</th>
                        <th className="py-3 px-5">Discount</th>
                        <th className="py-3 px-5">Min Spend</th>
                        <th className="py-3 px-5">Redeemed</th>
                        <th className="py-3 px-5">Status</th>
                        <th className="py-3 px-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {coupons.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-muted-foreground">
                            <Tag className="size-8 mx-auto text-gold-deep opacity-60 mb-2" />
                            <p className="font-serif text-sm font-semibold text-ink">No promotional vouchers created yet</p>
                            <p className="text-xs text-muted-foreground mt-1">Use the form on the left to activate launch coupons and discount codes.</p>
                          </td>
                        </tr>
                      ) : (
                        coupons.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-4 px-5">
                            <span className="font-mono font-bold text-sm text-ink px-2 py-1 rounded bg-pearl border border-gold/40">
                              {c.code}
                            </span>
                            <p className="text-[10px] text-muted-foreground mt-1 truncate max-w-[140px]">{c.description}</p>
                          </td>
                          <td className="py-4 px-5 font-semibold text-emerald-600">
                            {c.type === "percent" ? `${c.value}% OFF` : c.type === "flat" ? formatPKR(c.value) : "Free Delivery"}
                          </td>
                          <td className="py-4 px-5 text-muted-foreground">
                            {c.minOrder > 0 ? formatPKR(c.minOrder) : "No min"}
                          </td>
                          <td className="py-4 px-5 font-mono">
                            {c.usedCount} {c.maxUses ? `/ ${c.maxUses}` : "uses"}
                          </td>
                          <td className="py-4 px-5">
                            <button
                              onClick={() => {
                                toggleCoupon(c.id);
                                toast.success(`Coupon ${c.code} status updated.`);
                              }}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                                c.isActive
                                  ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              {c.isActive ? "Active" : "Disabled"}
                            </button>
                          </td>
                          <td className="py-4 px-5 text-right">
                            <button
                              onClick={() => {
                                deleteCoupon(c.id);
                                toast.success(`Deleted coupon ${c.code}`);
                              }}
                              className="text-muted-foreground hover:text-destructive p-1"
                              title="Delete Coupon"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: ORDERS & COURIER DISPATCH */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm">
              <div className="p-6 border-b border-border flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <h2 className="font-serif text-2xl text-ink font-bold">Customer Orders & Dispatch Ledger</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Assign Pakistani couriers (TCS / Leopards / Trax) and send tracking numbers to customers via WhatsApp.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={handleExportCourierCSV}
                    className="px-4 py-2 rounded-full border border-gold/60 bg-gold/15 text-xs uppercase tracking-wider text-ink font-bold flex items-center gap-1.5 hover:bg-gold transition-colors shrink-0 shadow-xs"
                    title="Export in bulk booking format for TCS Connect and Leopards CMS"
                  >
                    <Truck className="size-3.5 text-gold-deep" />
                    TCS / Leopards Booking (CSV)
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="px-4 py-2 rounded-full border border-border bg-pearl text-xs uppercase tracking-wider text-ink font-semibold flex items-center gap-1.5 hover:bg-muted transition-colors shrink-0"
                  >
                    <Download className="size-3.5" />
                    Full Orders (CSV)
                  </button>
                </div>
              </div>

              {/* Order Search & Status Filter Bar */}
              <div className="p-4 sm:p-6 bg-muted/20 border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 sm:max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by Order ID, Customer Name, Phone, or City..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-xs text-ink placeholder:text-muted-foreground focus:border-gold focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {["All", "Confirmed", "Processing", "Dispatched", "Delivered"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setOrderStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors whitespace-nowrap ${
                        orderStatusFilter === status
                          ? "bg-gold text-ink font-bold shadow-xs"
                          : "bg-background border border-border text-muted-foreground hover:text-ink"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Receipt className="size-10 mx-auto text-gold-deep opacity-60 mb-2" />
                  <p className="font-serif text-lg text-ink">
                    {orders.length === 0 ? "No customer orders recorded yet" : "No matching customer orders found"}
                  </p>
                  <p className="text-xs mt-1">
                    {orders.length === 0
                      ? "Live invoices and dispatch records will appear here as orders are placed."
                      : "Try changing your search query or status filter."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 uppercase tracking-wider text-[10px] text-muted-foreground">
                        <th className="py-3 px-5">Invoice #</th>
                        <th className="py-3 px-5">Date</th>
                        <th className="py-3 px-5">Customer & Contact</th>
                        <th className="py-3 px-5">Destination</th>
                        <th className="py-3 px-5">Courier & Tracking</th>
                        <th className="py-3 px-5">Total (PKR)</th>
                        <th className="py-3 px-5">Status</th>
                        <th className="py-3 px-5 text-right">Dispatch & Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredOrders.map((o) => {
                        const isHighRiskCOD = o.paymentMethod === "cod" && o.total >= 15000;
                        const hasIncompletePhone = !o.phone || o.phone.replace(/\D/g, "").length < 10;
                        const hasGiftWrap = o.isGiftWrapped;

                        return (
                          <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-4 px-5">
                              <p className="font-mono font-bold text-ink">{o.id}</p>
                              <div className="flex flex-col gap-1 mt-1">
                                {isHighRiskCOD && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-destructive bg-destructive/10 border border-destructive/30 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                    <ShieldAlert className="size-2.5" />
                                    High-Value COD (&gt; ₨ 15k)
                                  </span>
                                )}
                                {hasIncompletePhone && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-600 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                    <AlertTriangle className="size-2.5" />
                                    Verify Phone
                                  </span>
                                )}
                                {hasGiftWrap && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-gold-deep bg-pearl border border-gold/40 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                    <Gift className="size-2.5" />
                                    Wax Gift Sealed
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-5 text-muted-foreground whitespace-nowrap">{o.date}</td>
                            <td className="py-4 px-5 font-medium text-ink">
                              <p className="font-semibold">{o.customerName}</p>
                              <p className="text-ink/80 font-mono text-[11px]">{o.phone}</p>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">{o.email}</p>
                            </td>
                          <td className="py-4 px-5 text-muted-foreground">
                            <span className="font-semibold text-ink">{o.city}</span>
                            <p className="text-[10px] truncate max-w-[160px]">{o.address}</p>
                          </td>
                          <td className="py-4 px-5">
                            {o.trackingNumber ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                  <Truck className="size-2.5" />
                                  {o.courierName || "Express"}
                                </span>
                                <p className="font-mono text-[10px] text-ink font-semibold">{o.trackingNumber}</p>
                              </div>
                            ) : (
                              <span className="text-[10px] text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                                Awaiting Tracking
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-5 whitespace-nowrap">
                            <span className="font-serif font-bold text-ink block">{formatPKR(o.total)}</span>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {o.paymentMethod === "jazzcash" ? (
                                <span className="inline-flex items-center text-[9px] font-bold text-red-700 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded uppercase">
                                  JazzCash
                                </span>
                              ) : o.paymentMethod === "easypaisa" ? (
                                <span className="inline-flex items-center text-[9px] font-bold text-emerald-700 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase">
                                  Easypaisa
                                </span>
                              ) : o.paymentMethod === "nayapay" ? (
                                <span className="inline-flex items-center text-[9px] font-bold text-orange-700 bg-orange-500/15 border border-orange-500/30 px-1.5 py-0.5 rounded uppercase">
                                  NayaPay
                                </span>
                              ) : o.paymentMethod === "card" ? (
                                <span className="inline-flex items-center text-[9px] font-bold text-blue-700 bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 rounded uppercase">
                                  Card
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[9px] font-bold text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded uppercase">
                                  COD
                                </span>
                              )}

                              {o.paymentStatus === "Paid" ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                                  <Check className="size-2.5" /> Paid
                                </span>
                              ) : o.paymentStatus === "Verification Required" ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 rounded">
                                  <Clock className="size-2.5 text-amber-600" /> Verify
                                </span>
                              ) : (
                                <span className="text-[9px] text-muted-foreground bg-pearl px-1.5 py-0.5 rounded">
                                  Pending COD
                                </span>
                              )}
                            </div>

                            {/* TID badge with 1-click copy */}
                            {o.transactionId && (
                              <div className="flex items-center gap-1 mt-1 text-[10px] font-mono text-ink bg-pearl/80 border border-border/80 px-1.5 py-0.5 rounded w-fit">
                                <span className="truncate max-w-[120px]">TID: {o.transactionId}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                                      navigator.clipboard.writeText(o.transactionId || "");
                                    }
                                    toast.success(`TID ${o.transactionId} copied!`);
                                  }}
                                  className="text-muted-foreground hover:text-gold-deep"
                                  title="Copy TID"
                                >
                                  <Copy className="size-2.5" />
                                </button>
                              </div>
                            )}

                            {/* 1-Click Verification Action Button */}
                            {o.paymentStatus === "Verification Required" && (
                              <button
                                type="button"
                                onClick={() => {
                                  updatePaymentStatus(o.id, "Paid");
                                  toast.success(`Order #${o.id} payment verified and marked as Paid!`);
                                }}
                                className="mt-1.5 px-2 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 transition-colors shadow-xs"
                              >
                                <Check className="size-2.5" />
                                Mark as Paid
                              </button>
                            )}
                          </td>
                          <td className="py-4 px-5">
                            <select
                              value={o.orderStatus}
                              onChange={(e) => {
                                updateOrderStatus(o.id, e.target.value as any);
                                toast.success(`Updated order ${o.id} status to ${e.target.value}`);
                              }}
                              className="px-2.5 py-1 rounded-full text-[10px] font-bold border border-border bg-background text-ink cursor-pointer focus:border-gold focus:outline-none"
                            >
                              <option value="Confirmed">Confirmed</option>
                              <option value="Processing">Processing</option>
                              <option value="Dispatched">Dispatched</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                          </td>
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setDispatchOrder(o);
                                  setCourierNameInput(o.courierName || "TCS Express");
                                  setTrackingNumberInput(o.trackingNumber || "");
                                }}
                                className="p-1.5 rounded-lg border border-gold/40 text-gold-deep hover:bg-gold hover:text-ink transition-colors"
                                title="Dispatch with Courier Tracking & WhatsApp Alert"
                              >
                                <Truck className="size-4" />
                              </button>
                              <button
                                onClick={() => handleSendWhatsAppNotification(o)}
                                className="p-1.5 rounded-lg border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                                title="Send WhatsApp Order Alert to Customer"
                              >
                                <MessageCircle className="size-4" />
                              </button>
                              <Link
                                to="/invoice/$orderId"
                                params={{ orderId: o.id }}
                                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-ink hover:bg-muted transition-colors"
                                title="View & Print Official Invoice"
                              >
                                <Receipt className="size-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Courier Dispatch & Tracking Modal */}
            {dispatchOrder && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
                <div className="max-w-md w-full rounded-2xl sm:rounded-3xl border border-gold/40 bg-card p-5 sm:p-7 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Truck className="size-5 text-gold-deep" />
                      <h3 className="font-serif text-xl text-ink font-bold">Dispatch Order #{dispatchOrder.id}</h3>
                    </div>
                    <button
                      onClick={() => setDispatchOrder(null)}
                      className="size-7 rounded-full hover:bg-muted grid place-items-center text-muted-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="p-3 rounded-2xl bg-pearl/60 border border-border/80 text-xs space-y-1">
                    <p><span className="font-semibold text-ink">Customer:</span> {dispatchOrder.customerName} ({dispatchOrder.phone})</p>
                    <p><span className="font-semibold text-ink">Destination:</span> {dispatchOrder.city}</p>
                    <p><span className="font-semibold text-ink">COD Amount:</span> {dispatchOrder.paymentMethod === "cod" ? formatPKR(dispatchOrder.total) : "Paid Online"}</p>
                  </div>

                  <form onSubmit={handleConfirmDispatch} className="space-y-4">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                        Select Courier Service *
                      </label>
                      <select
                        value={courierNameInput}
                        onChange={(e) => setCourierNameInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-semibold text-ink focus:border-gold focus:outline-none"
                      >
                        <option value="TCS Express">TCS Express (Nationwide Express)</option>
                        <option value="Leopards Courier">Leopards Courier</option>
                        <option value="Trax Logistics">Trax Logistics</option>
                        <option value="PostEx">PostEx Courier</option>
                        <option value="M&P Express">M&P Express Logistics</option>
                        <option value="Call Courier">Call Courier</option>
                        <option value="Rider Hand Delivery">Rider Hand Delivery (Local)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                        Consignment / Tracking Number *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 77291823901"
                        value={trackingNumberInput}
                        onChange={(e) => setTrackingNumberInput(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background font-mono text-sm font-bold text-ink focus:border-gold focus:outline-none"
                      />
                    </div>

                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setDispatchOrder(null)}
                        className="flex-1 py-2.5 rounded-full border border-border text-xs uppercase tracking-wider font-semibold text-muted-foreground hover:bg-muted"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 btn-gold btn-gold-hover py-2.5 rounded-full text-xs uppercase tracking-wider font-bold shadow-md flex items-center justify-center gap-1.5"
                      >
                        <MessageCircle className="size-3.5" />
                        Dispatch & Alert
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: VIP CLIENTS & CRM DIRECTORY */}
        {activeTab === "customers" && (
          <div className="space-y-6">
            {/* 1. CRM Top Executive Header */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-gold/15 text-gold-deep border border-gold/30">
                    <Users className="size-5" />
                  </span>
                  <div>
                    <h2 className="font-serif text-2xl text-ink font-bold">
                      Luxury Patron CRM & Client Intelligence
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Customer lifetime value analysis, tier segmentation, regional demand mapping, and concierge relations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <button
                  onClick={handleExportCrmCsv}
                  className="px-4 py-2 rounded-xl border border-gold/40 bg-pearl hover:bg-gold/10 text-xs font-bold text-ink flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                  title="Export complete patron database as CSV"
                >
                  <Download className="size-3.5 text-gold-deep" />
                  Export CRM CSV
                </button>
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search name, phone, city..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-xs text-ink placeholder:text-muted-foreground focus:border-gold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Top Metrics Cards Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Total Patron LTV</span>
                  <DollarSign className="size-4 text-gold-deep" />
                </div>
                <p className="font-serif text-2xl font-bold text-ink mt-2">{formatPKR(totalCustomerLTV)}</p>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <span className="text-emerald-600 font-semibold">{uniqueCustomers.length}</span> recorded patrons
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Average Spend / Patron</span>
                  <Award className="size-4 text-gold-deep" />
                </div>
                <p className="font-serif text-2xl font-bold text-gold-deep mt-2">{formatPKR(avgCustomerLTV)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Average lifetime value across clients</p>
              </div>

              <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Repeat Retention</span>
                  <TrendingUp className="size-4 text-emerald-600" />
                </div>
                <p className="font-serif text-2xl font-bold text-emerald-600 mt-2">{repeatRatePercent}%</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  <span className="font-semibold text-ink">{repeatCustomerCount}</span> multi-order collectors
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Top Luxury Hub</span>
                  <MapPin className="size-4 text-gold-deep" />
                </div>
                <p className="font-serif text-2xl font-bold text-ink mt-2 truncate">
                  {topCity ? topCity[0] : "Pakistan"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 truncate">
                  {topCity ? `${formatPKR(topCity[1].revenue)} · ${topCity[1].count} orders` : "Awaiting orders"}
                </p>
              </div>
            </div>

            {/* 3. Interactive CRM Graphs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
              {/* GRAPH 1: Client Loyalty Tier Breakdown & Share of Revenue */}
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-4 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                      <Award className="size-4 text-gold-deep" />
                      Client Tier & Loyalty Distribution
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Connoisseur segmentation by lifetime spending brackets
                    </p>
                  </div>
                </div>

                {crmTierChartData.length === 0 ? (
                  <div className="h-64 grid place-items-center text-xs text-muted-foreground">
                    No client tier data yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4 min-w-0">
                    <div className="h-60 w-full min-w-0 relative">
                      <ResponsiveContainer width="100%" height={240} debounce={50}>
                        <RechartsPieChart>
                          <Pie
                            data={crmTierChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={5}
                            dataKey="count"
                            isAnimationActive={false}
                          >
                            {crmTierChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value: any, _name: any, item: any) => [
                              `${value} Patrons (${formatPKR(item.payload.revenue)})`,
                              item.payload.name
                            ]}
                            contentStyle={{
                              backgroundColor: "rgba(20, 20, 22, 0.95)",
                              borderColor: "rgba(212, 175, 55, 0.4)",
                              borderRadius: "1rem",
                              fontSize: "12px",
                              color: "#fff",
                            }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2.5 min-w-0">
                      {crmTierChartData.map((tier) => (
                        <div key={tier.name} className="p-2.5 rounded-2xl bg-pearl/60 border border-border/60 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
                            <div className="min-w-0">
                              <p className="font-semibold text-ink truncate">{tier.name}</p>
                              <p className="text-[10px] text-muted-foreground">{tier.count} {tier.count === 1 ? "client" : "clients"}</p>
                            </div>
                          </div>
                          <span className="font-serif font-bold text-gold-deep text-xs shrink-0">
                            {formatPKR(tier.revenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* GRAPH 2: Regional Luxury Fragrance Demand (City Ranking) */}
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-4 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                      <MapPin className="size-4 text-gold-deep" />
                      Regional Demand by City (PKR Revenue)
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Top luxury markets in Pakistan ranked by customer sales
                    </p>
                  </div>
                </div>

                {crmCityChartData.length === 0 ? (
                  <div className="h-64 grid place-items-center text-xs text-muted-foreground">
                    No city data yet.
                  </div>
                ) : (
                  <div className="h-60 w-full min-w-0 relative">
                    <ResponsiveContainer width="100%" height={240} debounce={50}>
                      <BarChart data={crmCityChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                        <XAxis dataKey="city" tick={{ fontSize: 11, fill: "var(--color-muted-foreground, #888)" }} />
                        <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground, #888)" }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                        <RechartsTooltip
                          formatter={(value: any) => [formatPKR(Number(value)), "Revenue"]}
                          contentStyle={{
                            backgroundColor: "rgba(20, 20, 22, 0.95)",
                            borderColor: "rgba(212, 175, 55, 0.4)",
                            borderRadius: "1rem",
                            fontSize: "12px",
                            color: "#fff",
                          }}
                        />
                        <Bar dataKey="revenue" fill="#D4AF37" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* GRAPH 3: Purchase Frequency & Retention Funnel */}
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-4 min-w-0 overflow-hidden">
                <div>
                  <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                    <TrendingUp className="size-4 text-emerald-600" />
                    Customer Order Frequency Funnel
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Single-purchase vs repeat collector loyalty conversion
                  </p>
                </div>

                <div className="h-56 w-full min-w-0 relative">
                  <ResponsiveContainer width="100%" height={224} debounce={50}>
                    <BarChart data={crmFrequencyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                      <XAxis dataKey="tier" tick={{ fontSize: 11, fill: "var(--color-muted-foreground, #888)" }} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground, #888)" }} allowDecimals={false} />
                      <RechartsTooltip
                        formatter={(value: any) => [`${value} Patrons`, "Count"]}
                        contentStyle={{
                          backgroundColor: "rgba(20, 20, 22, 0.95)",
                          borderColor: "rgba(16, 185, 129, 0.4)",
                          borderRadius: "1rem",
                          fontSize: "12px",
                          color: "#fff",
                        }}
                      />
                      <Bar dataKey="patrons" fill="#10B981" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* GRAPH 4: Cumulative Customer LTV Growth Curve */}
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-4 min-w-0 overflow-hidden">
                <div>
                  <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                    <Sparkles className="size-4 text-gold-deep" />
                    Cumulative Lifetime Value Growth
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Historical progression of client order value
                  </p>
                </div>

                <div className="h-56 w-full min-w-0 relative">
                  <ResponsiveContainer width="100%" height={224} debounce={50}>
                    <AreaChart data={crmLtvCurveData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="crmGoldGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-muted-foreground, #888)" }} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground, #888)" }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <RechartsTooltip
                        formatter={(value: any) => [formatPKR(Number(value)), "Cumulative LTV"]}
                        contentStyle={{
                          backgroundColor: "rgba(20, 20, 22, 0.95)",
                          borderColor: "rgba(212, 175, 55, 0.4)",
                          borderRadius: "1rem",
                          fontSize: "12px",
                          color: "#fff",
                        }}
                      />
                      <Area type="monotone" dataKey="cumulativeLTV" stroke="#D4AF37" strokeWidth={2.5} fillOpacity={1} fill="url(#crmGoldGradient)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 4. CRM Patron Directory Table with Filter Chips */}
            <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs space-y-4">
              <div className="p-6 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-serif text-xl font-bold text-ink flex items-center gap-2">
                    <Users className="size-5 text-gold-deep" />
                    Patron Directory & Concierge Actions
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click any client row to inspect their dossier, order history, and private sommelier notes.
                  </p>
                </div>

                {/* Segmentation Filters Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full sm:w-auto">
                  {[
                    { id: "all", label: `All (${uniqueCustomers.length})` },
                    { id: "whales", label: `👑 VIP (₨ 15k+) (${uniqueCustomers.filter(c => c.totalSpent >= 15000).length})` },
                    { id: "repeat", label: `🔄 Repeat (${repeatCustomerCount})` },
                    { id: "new", label: `🌟 New (${uniqueCustomers.filter(c => c.orderCount === 1).length})` },
                  ].map((seg) => (
                    <button
                      key={seg.id}
                      onClick={() => setCustomerSegment(seg.id as any)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        customerSegment === seg.id
                          ? "bg-gold text-ink shadow-xs"
                          : "bg-background border border-border/80 text-muted-foreground hover:text-ink"
                      }`}
                    >
                      {seg.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Users className="size-10 mx-auto text-gold-deep opacity-60 mb-2" />
                  <p className="font-serif text-lg text-ink">
                    {uniqueCustomers.length === 0 ? "No customer profiles recorded yet" : "No customer profiles match your search"}
                  </p>
                  <p className="text-xs mt-1">
                    {uniqueCustomers.length === 0
                      ? "Customer records are automatically created as customers place orders."
                      : "Try clearing filters or search terms."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 uppercase tracking-wider text-[10px] text-muted-foreground">
                        <th className="py-3 px-6">Client Profile</th>
                        <th className="py-3 px-6">Contact & WhatsApp</th>
                        <th className="py-3 px-6">Primary City</th>
                        <th className="py-3 px-6">Orders</th>
                        <th className="py-3 px-6">Lifetime Value</th>
                        <th className="py-3 px-6">Loyalty Tier</th>
                        <th className="py-3 px-6 text-right">Concierge Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredCustomers.map((c) => {
                        const isRoyalVIP = c.totalSpent >= 30000;
                        const isGold = c.totalSpent >= 15000 && c.totalSpent < 30000;
                        const isSilver = c.totalSpent >= 7000 && c.totalSpent < 15000;
                        const cleanPhone = c.phone.replace(/[^0-9]/g, "");
                        const formattedPhone = cleanPhone.startsWith("0") ? "92" + cleanPhone.slice(1) : cleanPhone;
                        const hasNotes = !!customerNotes[c.key];

                        return (
                          <tr
                            key={c.key}
                            onClick={() => {
                              setSelectedCustomer(c);
                              setCrmNoteDraft(customerNotes[c.key] || "");
                            }}
                            className="hover:bg-muted/20 transition-colors cursor-pointer group"
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="size-10 rounded-full bg-pearl border border-gold/40 grid place-items-center font-serif text-sm font-bold text-gold-deep shrink-0">
                                  {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-serif text-sm font-bold text-ink group-hover:text-gold-deep transition-colors">
                                      {c.name}
                                    </p>
                                    {hasNotes && (
                                      <span className="size-1.5 rounded-full bg-gold inline-block" title="Has internal staff note" />
                                    )}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">{c.email || "No email"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                              <a
                                href={`https://wa.me/${formattedPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-ink font-semibold hover:text-emerald-600 flex items-center gap-1 transition-colors"
                              >
                                <MessageCircle className="size-3.5 text-emerald-600" />
                                {c.phone}
                              </a>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Last order: {c.lastOrderDate}</p>
                            </td>
                            <td className="py-4 px-6 text-ink font-medium">
                              <span className="flex items-center gap-1">
                                <MapPin className="size-3 text-gold-deep" />
                                {c.city}
                              </span>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{c.address}</p>
                            </td>
                            <td className="py-4 px-6 font-mono font-bold text-ink">
                              {c.orderCount} {c.orderCount === 1 ? "order" : "orders"}
                            </td>
                            <td className="py-4 px-6 font-serif text-sm font-bold text-ink">
                              {formatPKR(c.totalSpent)}
                            </td>
                            <td className="py-4 px-6">
                              {isRoyalVIP ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 border border-amber-500/40 inline-flex items-center gap-1">
                                  👑 Royal VIP
                                </span>
                              ) : isGold ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gold/20 text-ink border border-gold/40 inline-flex items-center gap-1">
                                  💎 Gold Tier
                                </span>
                              ) : isSilver ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 border border-emerald-500/40 inline-flex items-center gap-1">
                                  🌟 Silver Tier
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border inline-flex items-center gap-1">
                                  ⭐ Valued Client
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedCustomer(c);
                                    setCrmNoteDraft(customerNotes[c.key] || "");
                                  }}
                                  className="px-3 py-1.5 rounded-full border border-gold/40 bg-pearl hover:bg-gold/15 text-ink text-[11px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <FileSpreadsheet className="size-3 text-gold-deep" />
                                  Dossier
                                </button>
                                <button
                                  onClick={() => {
                                    const message = `Assalam-o-Alaikum ${c.name}!\n\nAs one of our most valued clients at *M.shaies Haute Parfumerie*, we would love to extend an exclusive privilege voucher code: *${settings.announcementCode || "VIP10"}* for your next signature attar order.\n\nExplore our latest creations: ${typeof window !== "undefined" ? window.location.origin : ""}/shop\n\nWarm regards,\nM.shaies Concierge`;
                                    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, "_blank");
                                  }}
                                  className="px-3 py-1.5 rounded-full border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Send VIP WhatsApp Privilege Message"
                                >
                                  <MessageCircle className="size-3.5" />
                                  VIP WhatsApp
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 5. Patron Dossier Modal */}
            {selectedCustomer && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-card border border-gold/40 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  {/* Modal Header */}
                  <div className="flex items-start justify-between border-b border-border/80 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="size-14 rounded-2xl bg-pearl border border-gold/40 grid place-items-center font-serif text-xl font-bold text-gold-deep shrink-0">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif text-2xl font-bold text-ink">{selectedCustomer.name}</h3>
                          {selectedCustomer.totalSpent >= 30000 ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 border border-amber-500/40">
                              👑 Royal VIP
                            </span>
                          ) : selectedCustomer.totalSpent >= 15000 ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gold/20 text-ink border border-gold/40">
                              💎 Gold Tier
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                              ⭐ Valued Patron
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="size-3 text-gold-deep" /> {selectedCustomer.city} · Registered Patron
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="size-8 rounded-full border border-border grid place-items-center text-muted-foreground hover:text-ink hover:border-gold transition-colors cursor-pointer"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* Patron Highlights Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-pearl/60 border border-border/60">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Spend</p>
                      <p className="font-serif text-lg font-bold text-gold-deep mt-0.5">{formatPKR(selectedCustomer.totalSpent)}</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-pearl/60 border border-border/60">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Orders</p>
                      <p className="font-serif text-lg font-bold text-ink mt-0.5">{selectedCustomer.orderCount} Flacons</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-pearl/60 border border-border/60">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Avg / Order</p>
                      <p className="font-serif text-lg font-bold text-ink mt-0.5">
                        {formatPKR(Math.round(selectedCustomer.totalSpent / Math.max(1, selectedCustomer.orderCount)))}
                      </p>
                    </div>
                  </div>

                  {/* Contact Info Card */}
                  <div className="p-4 rounded-2xl bg-background border border-border/70 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">WhatsApp / Phone:</span>
                      <a
                        href={`https://wa.me/${selectedCustomer.phone.replace(/[^0-9]/g, "").startsWith("0") ? "92" + selectedCustomer.phone.replace(/[^0-9]/g, "").slice(1) : selectedCustomer.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono font-bold text-emerald-600 hover:underline flex items-center gap-1"
                      >
                        <MessageCircle className="size-3.5" /> {selectedCustomer.phone}
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium text-ink">{selectedCustomer.email || "Not provided"}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-muted-foreground shrink-0">Delivery Address:</span>
                      <span className="font-medium text-ink text-right">{selectedCustomer.address}, {selectedCustomer.city}</span>
                    </div>
                  </div>

                  {/* Private Staff Note */}
                  <div className="space-y-2">
                    <label className="block text-xs uppercase tracking-wider font-bold text-ink flex items-center gap-1.5">
                      <Edit3 className="size-3 text-gold-deep" />
                      Staff Sommelier Notes & Client Preferences
                    </label>
                    <textarea
                      rows={2}
                      value={crmNoteDraft}
                      onChange={(e) => setCrmNoteDraft(e.target.value)}
                      placeholder="e.g. Client prefers aged Cambodian oud notes, Taif Rose lover, sends gifts to family in Islamabad..."
                      className="w-full p-3 rounded-2xl border border-border bg-background text-xs text-ink placeholder:text-muted-foreground focus:border-gold focus:outline-none"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          const updated = { ...customerNotes, [selectedCustomer.key]: crmNoteDraft };
                          setCustomerNotes(updated);
                          if (typeof window !== "undefined") {
                            localStorage.setItem("mshaies_crm_notes", JSON.stringify(updated));
                          }
                          toast.success("Updated staff note for " + selectedCustomer.name);
                        }}
                        className="px-4 py-1.5 rounded-full btn-gold text-xs font-bold shadow-xs cursor-pointer"
                      >
                        Save Note
                      </button>
                    </div>
                  </div>

                  {/* Order History Timeline */}
                  <div className="space-y-3">
                    <h4 className="font-serif text-sm font-bold text-ink flex items-center gap-2">
                      <Receipt className="size-4 text-gold-deep" />
                      Complete Order History ({selectedCustomer.orders.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedCustomer.orders.map((ord) => (
                        <div key={ord.id} className="p-3 rounded-2xl border border-border/60 bg-pearl/40 flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-ink">{ord.id}</span>
                              <span className="text-[10px] text-muted-foreground">· {ord.date}</span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gold/15 text-ink border border-gold/30">
                                {ord.orderStatus}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {ord.items.map((i) => `${i.name} (${i.volume || "12ml"}) ×${i.qty}`).join(", ")}
                            </p>
                          </div>
                          <span className="font-serif font-bold text-ink text-sm shrink-0">
                            {formatPKR(ord.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Concierge Triggers Footer */}
                  <div className="pt-2 border-t border-border/80 flex flex-wrap items-center justify-between gap-3">
                    <button
                      onClick={() => {
                        const cleanPhone = selectedCustomer.phone.replace(/[^0-9]/g, "");
                        const formattedPhone = cleanPhone.startsWith("0") ? "92" + cleanPhone.slice(1) : cleanPhone;
                        const msg = `Assalam-o-Alaikum ${selectedCustomer.name}!\n\nThis is the Private Concierge at *M.shaies Haute Parfumerie*. How can we assist you with your fragrance curation today?`;
                        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, "_blank");
                      }}
                      className="px-4 py-2 rounded-full border border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <MessageCircle className="size-3.5" />
                      Open WhatsApp Chat
                    </button>
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="px-5 py-2 rounded-full bg-muted text-ink text-xs font-semibold hover:bg-muted/80 transition-colors cursor-pointer"
                    >
                      Close Dossier
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: AUDIT TRAIL & ACTIVITY LOGS ("Admin ne kya change kiya") */}
        {activeTab === "audit" && (
          <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm space-y-6">
            <div className="p-6 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="font-serif text-2xl text-ink font-bold flex items-center gap-2">
                  <History className="size-6 text-gold-deep" />
                  Staff Audit & Activity Logs
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time accountability trail recording stock edits, product creations, order status updates, and settings changes.
                </p>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search logs by action or keyword..."
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-background text-ink placeholder-muted-foreground focus:outline-none focus:border-gold"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(auditLogs, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.setAttribute("download", `mshaies-audit-trail-${new Date().toISOString().slice(0, 10)}.json`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast.success("Exported audit activity logs!");
                  }}
                  className="px-3.5 py-2 rounded-xl border border-border text-xs font-semibold text-ink bg-pearl/60 hover:bg-gold/20 flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Download className="size-3.5 text-gold-deep" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="px-6 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                Category:
              </span>
              {["All", "Product", "Stock", "Order", "Discount", "Settings", "System"].map((cat) => {
                const count = cat === "All" ? auditLogs.length : auditLogs.filter((l) => l.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setAuditCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      auditCategoryFilter === cat
                        ? "bg-gold text-ink shadow-xs"
                        : "bg-background border border-border/80 text-muted-foreground hover:text-ink"
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Audit Logs Table */}
            {auditLogs.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <History className="size-10 mx-auto text-gold-deep opacity-60 mb-2" />
                <p className="font-serif text-lg text-ink">No activity records found</p>
                <p className="text-xs mt-1">Actions performed across the admin panel will be logged here in chronological order.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 uppercase tracking-wider text-[10px] text-muted-foreground">
                      <th className="py-3 px-6">Timestamp</th>
                      <th className="py-3 px-6">Staff Member</th>
                      <th className="py-3 px-6">Category</th>
                      <th className="py-3 px-6">Action</th>
                      <th className="py-3 px-6">Detailed Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {auditLogs
                      .filter((l) => {
                        const matchesCategory = auditCategoryFilter === "All" || l.category === auditCategoryFilter;
                        const matchesSearch =
                          l.action.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
                          l.details.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
                          (l.user && l.user.toLowerCase().includes(auditSearchQuery.toLowerCase()));
                        return matchesCategory && matchesSearch;
                      })
                      .map((log) => {
                        const badgeColor =
                          log.category === "Product"
                            ? "bg-purple-500/10 text-purple-700 border-purple-500/30"
                            : log.category === "Stock"
                            ? "bg-blue-500/10 text-blue-700 border-blue-500/30"
                            : log.category === "Order"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                            : log.category === "Discount"
                            ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
                            : log.category === "Settings"
                            ? "bg-gold/20 text-ink border-gold/40"
                            : "bg-muted text-muted-foreground border-border";

                        return (
                          <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-4 px-6 text-muted-foreground whitespace-nowrap font-mono text-[11px]">
                              {new Date(log.timestamp).toLocaleString("en-US", {
                                dateStyle: "short",
                                timeStyle: "medium",
                              })}
                            </td>
                            <td className="py-4 px-6 font-semibold text-ink whitespace-nowrap">
                              {log.user || "Staff Admin"}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-block ${badgeColor}`}>
                                {log.category}
                              </span>
                            </td>
                            <td className="py-4 px-6 font-bold text-ink">
                              {log.action}
                            </td>
                            <td className="py-4 px-6 text-muted-foreground">
                              {log.details}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: TOP DEALS & ANNOUNCEMENT BANNER */}
        {activeTab === "banner" && (
          <div className="space-y-8 max-w-4xl">
            {/* Section A: Storewide Promotional Long Banner */}
            <div className="rounded-3xl border border-gold/40 bg-card p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 text-gold-deep text-[11px] font-bold uppercase tracking-wider mb-2">
                    <Sparkles className="size-3.5" />
                    <span>Storewide Promotional Showcase</span>
                  </div>
                  <h2 className="font-serif text-2xl text-ink font-bold flex items-center gap-2">
                    <ImageIcon className="size-5 text-gold-deep" />
                    Promotional Long Banner (Home, Shop, Attars, Perfumes, Watches)
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Display an animated, high-impact promotional banner across the public store: directly below the 3D Hero on the Home page, and atop All Products, Attars, Perfumes, and Watches pages.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setBannerPreviewKey((k) => k + 1)}
                  className="px-4 py-2 rounded-full border border-gold/50 bg-pearl/80 hover:bg-gold hover:text-ink text-gold-deep text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Replay Animation</span>
                </button>
              </div>

              {/* Active Page Coverage Badges */}
              <div className="p-3.5 rounded-2xl bg-pearl border border-gold/30 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[11px] font-bold text-ink uppercase tracking-wider mr-1">Active On Pages:</span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 text-[10px] font-semibold">✓ Home (Below Hero)</span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 text-[10px] font-semibold">✓ All Products (/shop)</span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 text-[10px] font-semibold">✓ Pure Attars (/attars)</span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 text-[10px] font-semibold">✓ Perfumes (/perfumes)</span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 text-[10px] font-semibold">✓ Watches (/watches)</span>
              </div>

              {/* Quick 1-Click Campaign Templates */}
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wider text-ink font-bold">1-Click Campaign Presets:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsForm((prev) => ({
                        ...prev,
                        heroBannerTag: "Maison Exclusive · Limited Festive Release",
                        heroBannerTitle: "Free Express Nationwide Delivery With Every Order Over ₨ 5,000",
                        heroBannerSubtitle: "100% Alcohol-Free Pure Attar Oils & 35% Extrait Parfums. Use Code LUXE15 for Flat 15% OFF.",
                        heroBannerButtonText: "Claim Exclusive Offer →",
                        heroBannerLink: "/shop",
                        heroBannerTransitionEffect: "slide",
                        heroBannerAnimation: "slideLeft",
                      }));
                      setBannerPreviewKey((k) => k + 1);
                      toast.info("Applied 'Eid Festive Attars' campaign preset!");
                    }}
                    className="p-3 text-left rounded-xl border border-border bg-background hover:border-gold hover:bg-pearl/40 transition-all cursor-pointer text-xs"
                  >
                    <p className="font-bold text-ink">🌸 Festive Attars & Delivery</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Free express delivery with orders over ₨ 5k</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSettingsForm((prev) => ({
                        ...prev,
                        heroBannerTag: "Climate Formulation 2026",
                        heroBannerTitle: "Flat 15% OFF All Extrait De Parfum Sprays (35% Oil Concentration)",
                        heroBannerSubtitle: "Engineered specifically for Pakistan's heat with 16+ hours longevity. Code LUXE15.",
                        heroBannerButtonText: "Shop Perfumes →",
                        heroBannerLink: "/perfumes",
                        heroBannerTransitionEffect: "slide",
                        heroBannerAnimation: "slideLeft",
                      }));
                      setBannerPreviewKey((k) => k + 1);
                      toast.info("Applied 'Extrait Perfumes Launch' preset!");
                    }}
                    className="p-3 text-left rounded-xl border border-border bg-background hover:border-gold hover:bg-pearl/40 transition-all cursor-pointer text-xs"
                  >
                    <p className="font-bold text-ink">💎 Extrait Perfumes</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Flat 15% OFF 35% oil concentration perfumes</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSettingsForm((prev) => ({
                        ...prev,
                        heroBannerTag: "Horology & Fragrance Connoisseurs",
                        heroBannerTitle: "Complimentary Velvet Saffron EDP with Maison Chronograph Watches",
                        heroBannerSubtitle: "Automatic skeletons & 18K gold chronographs with sapphire crystal. Code MAISON1000.",
                        heroBannerButtonText: "View Watches →",
                        heroBannerLink: "/watches",
                        heroBannerTransitionEffect: "slide",
                        heroBannerAnimation: "slideLeft",
                      }));
                      setBannerPreviewKey((k) => k + 1);
                      toast.info("Applied 'Horology Luxury Coffret' preset!");
                    }}
                    className="p-3 text-left rounded-xl border border-border bg-background hover:border-gold hover:bg-pearl/40 transition-all cursor-pointer text-xs"
                  >
                    <p className="font-bold text-ink">⌚ Horology & Coffrets</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Free EDP with luxury timepieces</p>
                  </button>
                </div>
              </div>

              {/* Image Specifications & Guidance Box */}
              <div className="p-5 rounded-3xl bg-amber-500/5 border border-amber-500/30 space-y-4 text-xs shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold uppercase tracking-wider text-xs">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                    <span>Recommended Banner Image Specifications & Creative Standards</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 text-[10px] font-bold tracking-wide">
                    Optimal Ratio: 6:1 Panoramic
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Pillar 1: Resolution */}
                  <div className="p-3.5 rounded-2xl bg-background border border-amber-500/20 space-y-1">
                    <p className="font-bold text-ink text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-gold" />
                      Dimensions & Ratio
                    </p>
                    <p className="font-mono text-xs font-bold text-gold-deep">1600 × 260 px</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Standard: 1200 × 200 px (6:1 ratio). Keeps banner slim (max 140–190px height) so product catalog stays prominent.
                    </p>
                  </div>

                  {/* Pillar 2: Mobile Safe Zone */}
                  <div className="p-3.5 rounded-2xl bg-background border border-amber-500/20 space-y-1">
                    <p className="font-bold text-ink text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Mobile Safe Zone
                    </p>
                    <p className="font-mono text-xs font-bold text-emerald-800">Central 900 × 200 px</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Keep text, promo codes, and logos within the central 900px with 24px edge margins to avoid corner clipping.
                    </p>
                  </div>

                  {/* Pillar 3: Formats & Size */}
                  <div className="p-3.5 rounded-2xl bg-background border border-amber-500/20 space-y-1">
                    <p className="font-bold text-ink text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-blue-500" />
                      Format & File Size
                    </p>
                    <p className="font-mono text-xs font-bold text-blue-800">WebP / PNG / JPG</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Recommended: Under 500 KB (Max 1 MB). Built-in client compressor automatically optimizes uploads for 4G speeds.
                    </p>
                  </div>

                  {/* Pillar 4: Brand Aesthetic */}
                  <div className="p-3.5 rounded-2xl bg-background border border-amber-500/20 space-y-1">
                    <p className="font-bold text-ink text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-amber-500" />
                      Color & Contrast
                    </p>
                    <p className="font-mono text-xs font-bold text-amber-800">Espresso & Gold</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Dark obsidian/espresso backgrounds (#17130e) with metallic gold text (#C5A880) maintain high outdoor legibility.
                    </p>
                  </div>
                </div>
              </div>

              {/* Live Animation Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-wider text-gold-deep font-bold">
                    Live Animated Banner Preview ({settingsForm.heroBannerTransitionEffect || "slide"}):
                  </p>
                  <span className="text-[10px] text-muted-foreground">Preview below hero container</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#f3ece0] border border-gold/40 overflow-hidden shadow-inner">
                  <PromotionalBanner
                    key={bannerPreviewKey}
                    imageUrl={settingsForm.heroBannerImage}
                    alt={settingsForm.heroBannerAlt || "Maison Promotion"}
                    linkUrl={settingsForm.heroBannerLink || "/shop"}
                    animationType={(settingsForm.heroBannerTransitionEffect || settingsForm.heroBannerAnimation as any) || "slide"}
                    tag={settingsForm.heroBannerTag}
                    title={settingsForm.heroBannerTitle}
                    subtitle={settingsForm.heroBannerSubtitle}
                    buttonText={settingsForm.heroBannerButtonText}
                    autoPlayInterval={settingsForm.heroBannerTransitionSpeed || 4500}
                  />
                </div>
              </div>

              {/* Form Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Active Toggle */}
                <div className="sm:col-span-2 flex items-center justify-between p-4 rounded-2xl border border-border bg-background">
                  <div>
                    <p className="text-xs font-bold text-ink">Enable Promotional Banner Across Storefront</p>
                    <p className="text-[11px] text-muted-foreground">Renders banner on Home (below Hero), Shop, Attars, Perfumes, and Watches</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.heroBannerActive ?? true}
                    onChange={(e) => setSettingsForm({ ...settingsForm, heroBannerActive: e.target.checked })}
                    className="size-5 accent-gold cursor-pointer"
                  />
                </div>

                {/* Tagline */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                    Banner Top Pill / Tagline
                  </label>
                  <input
                    type="text"
                    value={settingsForm.heroBannerTag || ""}
                    onChange={(e) => {
                      setSettingsForm({ ...settingsForm, heroBannerTag: e.target.value });
                      setBannerPreviewKey((k) => k + 1);
                    }}
                    placeholder="e.g. Maison Exclusive · Limited Festive Release"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                  />
                </div>

                {/* Transition Effect Style Selector */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                    Animated Transition Effect
                  </label>
                  <select
                    value={settingsForm.heroBannerTransitionEffect || "slide"}
                    onChange={(e) => {
                      setSettingsForm({ ...settingsForm, heroBannerTransitionEffect: e.target.value as any });
                      setBannerPreviewKey((k) => k + 1);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none cursor-pointer"
                  >
                    <option value="slide">➡️ Smooth Horizontal Slide Track (Glides In & Out Simultaneously)</option>
                    <option value="marquee">♾️ Continuous Infinite Sliding Ribbon (Endless Gliding Ticker)</option>
                    <option value="fade">✨ Opulent Crossfade Dissolve (Subtle Luxury)</option>
                    <option value="zoom">🔍 Modern Scale Morph (Zoom Dynamics)</option>
                    <option value="flip">💎 3D Perspective Luxury Flip</option>
                  </select>
                </div>

                {/* Auto-Transition Speed */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                    Auto-Rotation Transition Speed
                  </label>
                  <select
                    value={settingsForm.heroBannerTransitionSpeed || 4500}
                    onChange={(e) => {
                      setSettingsForm({ ...settingsForm, heroBannerTransitionSpeed: parseInt(e.target.value, 10) });
                      setBannerPreviewKey((k) => k + 1);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none cursor-pointer font-mono text-xs"
                  >
                    <option value="2500">⚡ 2.5 Seconds (Rapid Slide)</option>
                    <option value="3500">🏎️ 3.5 Seconds (Fast Rotation)</option>
                    <option value="4500">✨ 4.5 Seconds (Standard Recommended)</option>
                    <option value="6000">⏳ 6.0 Seconds (Relaxed)</option>
                    <option value="8000">🌿 8.0 Seconds (Gentle)</option>
                    <option value="0">🛑 Paused (Manual Arrow/Dot Navigation Only)</option>
                  </select>
                </div>

                {/* Shimmer Light Beam Effect Toggle */}
                <div className="sm:col-span-2 flex items-center justify-between p-3.5 rounded-2xl border border-border bg-background">
                  <div>
                    <p className="text-xs font-bold text-ink flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-gold" />
                      Continuous Metallic Gold Shimmer Light Beam
                    </p>
                    <p className="text-[11px] text-muted-foreground">Sweeps an animated radiant light reflection diagonally across the banner</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.heroBannerShimmer ?? true}
                    onChange={(e) => {
                      setSettingsForm({ ...settingsForm, heroBannerShimmer: e.target.checked });
                      setBannerPreviewKey((k) => k + 1);
                    }}
                    className="size-5 accent-gold cursor-pointer"
                  />
                </div>

                {/* Headline */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                    Main Headline
                  </label>
                  <input
                    type="text"
                    value={settingsForm.heroBannerTitle || ""}
                    onChange={(e) => {
                      setSettingsForm({ ...settingsForm, heroBannerTitle: e.target.value });
                      setBannerPreviewKey((k) => k + 1);
                    }}
                    placeholder="e.g. Free Express Nationwide Delivery With Every Order Over ₨ 5,000"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none font-semibold"
                  />
                </div>

                {/* Subtitle */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                    Offer Description / Subtitle
                  </label>
                  <input
                    type="text"
                    value={settingsForm.heroBannerSubtitle || ""}
                    onChange={(e) => {
                      setSettingsForm({ ...settingsForm, heroBannerSubtitle: e.target.value });
                      setBannerPreviewKey((k) => k + 1);
                    }}
                    placeholder="e.g. 100% Alcohol-Free Pure Attar Oils & 35% Extrait Parfums. Use Code LUXE15 for Flat 15% OFF."
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                  />
                </div>

                {/* Button Text */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                    Action Button Label
                  </label>
                  <input
                    type="text"
                    value={settingsForm.heroBannerButtonText || ""}
                    onChange={(e) => {
                      setSettingsForm({ ...settingsForm, heroBannerButtonText: e.target.value });
                      setBannerPreviewKey((k) => k + 1);
                    }}
                    placeholder="e.g. Claim Offer →"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                  />
                </div>

                {/* Click Destination URL */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                    Click Destination Link
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. /shop, /attars, or /perfumes"
                    value={settingsForm.heroBannerLink || ""}
                    onChange={(e) => setSettingsForm({ ...settingsForm, heroBannerLink: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none font-mono"
                  />
                </div>

                {/* Image Upload & URL Input (Optional) */}
                <div className="sm:col-span-2 space-y-3 pt-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold">
                      Custom Graphic Banner Image (Optional · Replaces Text Slide)
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      Optimal size: <strong className="text-gold-deep">1600 × 260 px (6:1)</strong>
                    </span>
                  </div>

                  {/* Quick-Spec Badges */}
                  <div className="p-3 rounded-2xl bg-pearl/70 border border-gold/30 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="font-bold text-ink mr-1">Recommended Details:</span>
                      <span className="px-2 py-0.5 rounded-md bg-gold/20 text-gold-deep font-bold border border-gold/40">
                        📐 1600 × 260 px (6:1 Ratio)
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-800 font-semibold border border-emerald-500/30">
                        📱 Safe Center: 900 × 200 px
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-800 font-semibold border border-blue-500/30">
                        🖼️ WebP / PNG / JPG
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-800 font-semibold border border-purple-500/30">
                        ⚡ Under 500 KB (Max 1 MB)
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      💡 <em>Tip:</em> Keep text & logos centered within the 900px safe zone so mobile screens (375px–768px) don't clip your message. The client-side processor automatically compresses high-res files for optimal 4G page-load speeds.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="flex-1 px-4 py-3 rounded-xl border-2 border-dashed border-gold/50 bg-pearl/40 hover:bg-pearl/80 transition-colors flex items-center justify-center gap-2 text-xs font-semibold text-gold-deep cursor-pointer">
                      <Upload className="size-4" />
                      <span>Upload Banner File (Auto-Optimized to 1600px WebP)</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const dataUrl = await compressImageFile(file, 1600, 320, 0.88);
                            setSettingsForm((prev) => ({ ...prev, heroBannerImage: dataUrl }));
                            setBannerPreviewKey((k) => k + 1);
                            toast.success("Custom banner image uploaded and optimized successfully!");
                          } catch (err) {
                            toast.error("Failed to process banner image.");
                          }
                        }}
                      />
                    </label>

                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        placeholder="Or enter custom image URL"
                        value={settingsForm.heroBannerImage || ""}
                        onChange={(e) => {
                          setSettingsForm({ ...settingsForm, heroBannerImage: e.target.value });
                          setBannerPreviewKey((k) => k + 1);
                        }}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-xs font-mono text-ink focus:border-gold focus:outline-none"
                      />
                      {settingsForm.heroBannerImage && (
                        <button
                          type="button"
                          onClick={() => {
                            setSettingsForm({ ...settingsForm, heroBannerImage: "" });
                            setBannerPreviewKey((k) => k + 1);
                            toast.info("Switched to Luxury Dynamic Text Banner.");
                          }}
                          className="px-3 py-1 rounded-xl border border-destructive/40 text-destructive hover:bg-destructive/10 text-xs shrink-0 cursor-pointer"
                        >
                          Clear Image
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="btn-gold btn-gold-hover px-6 py-3 rounded-full text-xs uppercase tracking-widest font-bold flex items-center gap-2"
                >
                  <Check className="size-4" />
                  Save Promotional Banner Across All Pages
                </button>
              </div>
            </div>

            {/* Section B: Top Deals Announcement Bar */}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <h2 className="font-serif text-2xl text-ink font-bold flex items-center gap-2">
                  <Megaphone className="size-5 text-gold-deep" />
                  Top Ticker Announcement Bar
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Customize the scrolling announcement bar pinned at the very top of the navigation header.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-pearl border border-gold/40 space-y-2">
                <p className="text-[11px] uppercase tracking-wider text-gold-deep font-bold">Live Ticker Preview:</p>
                <div className="p-3 rounded-xl bg-[#1c160c] text-pearl text-xs flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold text-[10px] font-bold uppercase">Active Campaign</span>
                  <span className="truncate">{settingsForm.announcementText}</span>
                  <span className="font-mono bg-gold text-ink font-bold px-1.5 py-0.5 rounded text-[10px]">{settingsForm.announcementCode}</span>
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl border border-border bg-background">
                  <div>
                    <p className="text-xs font-bold text-ink">Enable Top Ticker Announcement</p>
                    <p className="text-[11px] text-muted-foreground">Show promotional banner to all site visitors</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.announcementActive}
                    onChange={(e) => setSettingsForm({ ...settingsForm, announcementActive: e.target.checked })}
                    className="size-5 accent-gold cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                    Announcement Text
                  </label>
                  <input
                    type="text"
                    value={settingsForm.announcementText}
                    onChange={(e) => setSettingsForm({ ...settingsForm, announcementText: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                    Featured Promo Code
                  </label>
                  <input
                    type="text"
                    value={settingsForm.announcementCode}
                    onChange={(e) => setSettingsForm({ ...settingsForm, announcementCode: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-mono font-bold text-ink focus:border-gold focus:outline-none uppercase"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-gold btn-gold-hover px-6 py-3 rounded-full text-xs uppercase tracking-widest font-bold flex items-center gap-2"
                >
                  <Check className="size-4" />
                  Save & Update Ticker
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 6: WHATSAPP MARKETING BROADCASTS */}
        {activeTab === "marketing" && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-2xl text-ink font-bold flex items-center gap-2">
                <MessageCircle className="size-5 text-emerald-600" />
                Pakistani Festival & VIP Marketing Broadcasts
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Copy ready-made luxury marketing messages for your WhatsApp Status, Broadcast lists, or Instagram Stories.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {MARKETING_TEMPLATES.map((tmpl, idx) => (
                <div key={idx} className="p-6 rounded-3xl border border-gold/30 bg-card flex flex-col justify-between space-y-4 shadow-sm">
                  <div>
                    <h3 className="font-serif text-lg text-ink font-bold">{tmpl.title}</h3>
                    <div className="p-3.5 mt-3 rounded-2xl bg-pearl text-xs text-muted-foreground font-mono whitespace-pre-line border border-border/80 max-h-56 overflow-y-auto leading-relaxed">
                      {tmpl.text}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(tmpl.text);
                      toast.success("Broadcast message copied to clipboard!");
                    }}
                    className="w-full py-2.5 rounded-full border border-gold/60 bg-pearl hover:bg-gold hover:text-ink text-xs uppercase tracking-wider font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Copy className="size-3.5" />
                    Copy Broadcast Text
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: SECURITY & STORE SETTINGS */}
        {activeTab === "settings" && (
          <div className="space-y-8">
            {/* Card: Flacon & Sample Sizes (ml Options & Display Rules) */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-gold/15 border border-gold/40 grid place-items-center shrink-0">
                    <Droplets className="size-5 text-gold-deep" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl sm:text-2xl text-ink font-bold flex items-center gap-2">
                      Flacon & Sample Sizes (ml Options)
                      <span className="text-xs font-mono font-normal bg-gold/20 text-gold-deep px-2.5 py-0.5 rounded-full border border-gold/30">
                        {flaconSizesList.filter((s) => s.isEnabled).length} Active on Storefront
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure volume options (3ml, 6ml, 12ml, 50ml, etc.), custom titles, and pricing multipliers. Unchecked sizes will be completely hidden from customers.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={handleResetFlaconSizes}
                    className="px-3.5 py-2 rounded-full border border-border bg-background text-xs text-muted-foreground hover:text-ink font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Reset to default 3ml, 6ml, 12ml, 50ml"
                  >
                    <RotateCcw className="size-3.5" />
                    Reset Defaults
                  </button>
                  <button
                    type="button"
                    onClick={handleAddFlaconSize}
                    className="px-4 py-2 rounded-full border border-gold/40 bg-gold/10 text-gold-deep hover:bg-gold/20 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    Add Size Option
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateSettings(settingsForm);
                      toast.success("Flacon sizes & options saved successfully!");
                    }}
                    className="btn-gold btn-gold-hover px-5 py-2 rounded-full text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Check className="size-3.5" />
                    Save Sizes
                  </button>
                </div>
              </div>

              {/* Sizes Editor Grid */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {flaconSizesList.map((size, index) => {
                    return (
                      <div
                        key={size.id || `size-${index}`}
                        className={`rounded-2xl border transition-all p-4 space-y-3 ${
                          size.isEnabled
                            ? "border-gold/40 bg-pearl/40 shadow-xs"
                            : "border-border/60 bg-muted/20 opacity-70"
                        }`}
                      >
                        {/* Header: Visibility switch & Delete */}
                        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={size.isEnabled}
                              onChange={(e) => handleUpdateFlaconSize(index, { isEnabled: e.target.checked })}
                              className="size-4 accent-gold rounded cursor-pointer"
                            />
                            <span className={`text-xs font-bold ${size.isEnabled ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
                              {size.isEnabled ? "Active & Visible" : "Hidden from Store"}
                            </span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleRemoveFlaconSize(index)}
                            className="text-muted-foreground hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer"
                            title="Remove this size option"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>

                        {/* Volume/Label & ML */}
                        <div className="space-y-1">
                          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                            Volume Label (e.g. 3ml, 6ml, 50ml)
                          </label>
                          <input
                            type="text"
                            value={size.label}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateFlaconSize(index, { label: val, ml: val });
                            }}
                            placeholder="e.g. 6ml"
                            className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-sm font-bold text-ink focus:border-gold focus:outline-none"
                          />
                        </div>

                        {/* Subtitle / Descriptive Tag */}
                        <div className="space-y-1">
                          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                            Subtitle / Type Badge
                          </label>
                          <input
                            type="text"
                            value={size.sub || ""}
                            onChange={(e) => handleUpdateFlaconSize(index, { sub: e.target.value })}
                            placeholder="e.g. Standard Attar"
                            className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-xs text-ink focus:border-gold focus:outline-none"
                          />
                        </div>

                        {/* Price Multiplier */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                              Price Multiplier
                            </label>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {size.multiplier ?? 1}x
                            </span>
                          </div>
                          <input
                            type="number"
                            step="0.05"
                            min="0.1"
                            value={size.multiplier ?? 1}
                            onChange={(e) => handleUpdateFlaconSize(index, { multiplier: parseFloat(e.target.value) || 1 })}
                            className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-mono text-ink focus:border-gold focus:outline-none"
                          />
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            e.g. 1.0 = base price, 0.55 = 55%, 1.9 = 1.9x
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Customer View Live Preview */}
              <div className="p-4 sm:p-5 rounded-2xl bg-pearl border border-gold/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Eye className="size-4 text-gold-deep" />
                    <span className="text-xs uppercase tracking-wider text-ink font-bold">
                      Live Customer Storefront Preview (Product Page)
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    This is exactly how the flacon selector will render to buyers:
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-background border border-border/80 space-y-2">
                  <div className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground">
                    SELECT FLACON & SAMPLE SIZE
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {flaconSizesList.map((size) => {
                      if (!size.isEnabled) {
                        return (
                          <div
                            key={size.id}
                            className="px-4 py-2 rounded-xl border border-dashed border-border bg-muted/20 text-muted-foreground/60 flex flex-col items-center justify-center opacity-60 text-center"
                            title="This size is currently hidden"
                          >
                            <span className="text-xs font-mono line-through">{size.label}</span>
                            <span className="text-[9px] uppercase tracking-wider text-red-500 font-bold">Hidden</span>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={size.id}
                          className="px-5 py-2.5 rounded-xl border border-gold/60 bg-pearl/80 text-ink shadow-xs flex flex-col items-center justify-center text-center"
                        >
                          <span className="text-sm font-bold font-mono tracking-tight text-ink">{size.label}</span>
                          {size.sub && (
                            <span className="text-[10px] uppercase tracking-wider font-serif text-gold-deep mt-0.5">
                              {size.sub}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-1 text-[11px] text-muted-foreground leading-relaxed">
                  <Sparkles className="size-3.5 text-gold-deep shrink-0 mt-0.5" />
                  <span>
                    <strong>Individual Product Customization:</strong> In the <strong>Products</strong> tab, you can select which specific sizes appear on individual fragrances (for example, enabling 3ml/6ml/12ml for Attars, 50ml for Sprays, or disabling all sizes for Watches/Accessories).
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Security Suite */}
            <div className="rounded-3xl border border-gold/40 bg-card p-6 sm:p-8 space-y-5 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <Shield className="size-5 text-gold-deep" />
                <h3 className="font-serif text-xl text-ink font-bold">Admin Security & Master PIN</h3>
              </div>

              <form onSubmit={handleChangePin} className="space-y-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                    Current Master PIN
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter current PIN"
                    value={currentPinInput}
                    onChange={(e) => setCurrentPinInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-mono text-ink focus:border-gold focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      New PIN
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="e.g. 9842"
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-mono text-ink focus:border-gold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Confirm New PIN
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Repeat PIN"
                      value={confirmPinInput}
                      onChange={(e) => setConfirmPinInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-mono text-ink focus:border-gold focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full btn-gold btn-gold-hover py-3 rounded-full text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 shadow-md"
                >
                  <KeyRound className="size-3.5" />
                  Update Master PIN
                </button>
              </form>

              {/* Supabase Auth Staff Management Quicklink */}
              <div className="p-3.5 rounded-2xl bg-pearl border border-gold/30 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-gold-deep" />
                    Supabase Staff Accounts
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Manage login users & permissions directly in your Supabase Auth dashboard.
                  </div>
                </div>
                <a
                  href="https://supabase.com/dashboard/project/jpabwkunidenjazbyugh/auth/users"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-full btn-gold text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1 shrink-0"
                >
                  Manage Users <ExternalLink className="size-3" />
                </a>
              </div>

              {/* Data Restore Section */}
              <div className="pt-4 border-t border-border space-y-3">
                <p className="text-xs font-bold text-ink">Restore Store Database Backup</p>
                <form onSubmit={handleRestoreBackup} className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Paste backup JSON data here to restore..."
                    value={backupJsonInput}
                    onChange={(e) => setBackupJsonInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background font-mono text-ink resize-none focus:outline-none focus:border-gold"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-full border border-border text-xs uppercase tracking-wider text-ink hover:bg-muted font-semibold flex items-center gap-1.5"
                  >
                    <Upload className="size-3.5" />
                    Restore Database
                  </button>
                </form>
              </div>
            </div>

            {/* Shipping & Store Rules */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 space-y-5 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <Truck className="size-5 text-gold-deep" />
                <h3 className="font-serif text-xl text-ink font-bold">Shipping & Contact Rules</h3>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Free Shipping Over (PKR)
                    </label>
                    <input
                      type="number"
                      value={settingsForm.freeShippingThreshold}
                      onChange={(e) => setSettingsForm({ ...settingsForm, freeShippingThreshold: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Standard Courier Fee (PKR)
                    </label>
                    <input
                      type="number"
                      value={settingsForm.standardShippingFee}
                      onChange={(e) => setSettingsForm({ ...settingsForm, standardShippingFee: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Cash on Delivery (COD) Fee (PKR)
                    </label>
                    <input
                      type="number"
                      value={settingsForm.codFee ?? 400}
                      onChange={(e) => setSettingsForm({ ...settingsForm, codFee: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none font-semibold text-amber-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                    Store WhatsApp Helpline
                  </label>
                  <input
                    type="text"
                    value={settingsForm.whatsappNumber}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    placeholder="+923390001829"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Instagram Profile URL
                    </label>
                    <input
                      type="url"
                      value={settingsForm.instagramUrl || ""}
                      onChange={(e) => setSettingsForm({ ...settingsForm, instagramUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs text-ink focus:border-gold focus:outline-none"
                      placeholder="https://www.instagram.com/m.shaiesfragrances"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Facebook Page URL
                    </label>
                    <input
                      type="url"
                      value={settingsForm.facebookUrl || ""}
                      onChange={(e) => setSettingsForm({ ...settingsForm, facebookUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs text-ink focus:border-gold focus:outline-none"
                      placeholder="https://www.facebook.com/profile.php?id=..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      TikTok Profile URL
                    </label>
                    <input
                      type="url"
                      value={settingsForm.tiktokUrl || ""}
                      onChange={(e) => setSettingsForm({ ...settingsForm, tiktokUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs text-ink focus:border-gold focus:outline-none"
                      placeholder="https://www.tiktok.com/@mshaiesfragrances"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                    Store Concierge Email
                  </label>
                  <input
                    type="email"
                    value={settingsForm.contactEmail}
                    onChange={(e) => setSettingsForm({ ...settingsForm, contactEmail: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    placeholder="info@mshaies.com"
                  />
                </div>

                {/* Direct Mobile Accounts Suite (No Corporate Merchant Account Required) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-pearl border border-gold/40 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-gold/30 pb-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="size-4 text-gold-deep" />
                      <span className="text-xs uppercase tracking-wider text-ink font-bold">
                        Direct Mobile Accounts (No Merchant API Needed)
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      JazzCash · Easypaisa · NayaPay
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Direct mobile transfers enable customers to pay directly to your personal mobile account without requiring corporate merchant gateway contracts or NTN integration. Customers enter their transaction TID and send proof to your WhatsApp.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-ink font-bold mb-1">
                        Recipient Account Title
                      </label>
                      <input
                        type="text"
                        value={settingsForm.paymentAccountTitle || "Muhammad Shees"}
                        onChange={(e) => setSettingsForm({ ...settingsForm, paymentAccountTitle: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs text-ink focus:border-gold focus:outline-none font-semibold"
                        placeholder="Muhammad Shees"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-ink font-bold mb-1">
                        Primary Mobile / Raast Number
                      </label>
                      <input
                        type="text"
                        value={settingsForm.paymentAccountNumber || "03325568922"}
                        onChange={(e) => setSettingsForm({ 
                          ...settingsForm, 
                          paymentAccountNumber: e.target.value,
                          paymentAccountFormatted: e.target.value.length === 11 ? `${e.target.value.slice(0, 4)} ${e.target.value.slice(4)}` : e.target.value,
                        })}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs text-ink focus:border-gold focus:outline-none font-mono"
                        placeholder="03325568922"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-ink font-bold mb-1">
                      WhatsApp Receipt Helpline (With Country Code)
                    </label>
                    <input
                      type="text"
                      value={settingsForm.paymentWhatsapp || "+923390001829"}
                      onChange={(e) => setSettingsForm({ ...settingsForm, paymentWhatsapp: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs text-ink focus:border-gold focus:outline-none font-mono"
                      placeholder="+923390001829"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-pearl/60 border border-border/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] uppercase tracking-wider text-ink font-bold">Google Gemini AI Engine</span>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">Server Environment Protected</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    The AI Scent Sommelier & Chatbot API keys are securely loaded on the backend via <code className="text-gold-deep font-mono font-semibold">GEMINI_API_KEY</code> to safeguard your credentials from browser exposure.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full btn-gold btn-gold-hover py-3.5 rounded-full text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 shadow-md"
                >
                  <Check className="size-4" />
                  Save Store Settings
                </button>
              </form>
            </div>

            </div>
          </div>
        )}

        {/* TAB 8: CATEGORIES */}
        {activeTab === "categories" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 rounded-3xl border border-border/80 bg-card p-6 space-y-4">
              <h2 className="font-serif text-xl text-ink">Add Category</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newCategoryName.trim()) {
                    addCategory(newCategoryName);
                    toast.success(`Category "${newCategoryName}" created!`);
                    setNewCategoryName("");
                  }
                }}
                className="space-y-3"
              >
                <input
                  type="text"
                  required
                  placeholder="e.g. Oud Attars"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full btn-gold btn-gold-hover py-3 rounded-full text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2"
                >
                  <Plus className="size-4" />
                  Create Category
                </button>
              </form>
            </div>

            <div className="md:col-span-2 rounded-3xl border border-border/80 bg-card p-6">
              <h2 className="font-serif text-xl text-ink mb-4">Active Categories</h2>
              <div className="divide-y divide-border/60">
                {categories.map((cat) => (
                  <div key={cat} className="py-3 flex items-center justify-between">
                    <span className="font-medium text-sm text-ink">{cat}</span>
                    {cat !== "All" && (
                      <button
                        onClick={() => {
                          deleteCategory(cat);
                          toast.success(`Deleted category ${cat}`);
                        }}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: CAREERS & JOB POSTINGS */}
        {activeTab === "jobs" && (
          <div className="space-y-6">
            {/* Header with KPI Cards & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl border border-border/80 bg-card shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <Briefcase className="size-5 text-gold-deep" />
                  <h2 className="font-serif text-2xl text-ink">Maison Careers & Job Vacancies</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Post artisanal opportunities, manage position requirements, and recruit team members. Live on <Link to="/careers" target="_blank" className="text-gold-deep underline font-medium">/careers</Link>.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to="/careers"
                  target="_blank"
                  className="px-4 py-2.5 rounded-full border border-border text-xs uppercase tracking-wider text-muted-foreground hover:text-ink hover:border-gold/40 transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="size-3.5" />
                  View Public Page
                </Link>
                <button
                  onClick={() => {
                    setEditingJob(null);
                    setJobForm({
                      title: "",
                      department: "Perfumery Studio",
                      location: "Pakistan Studio / Nationwide",
                      type: "Full-Time",
                      experience: "1-3 Years",
                      salaryRange: "PKR 85,000 - 140,000 / Month",
                      description: "",
                      requirementsText: "",
                      benefitsText: "",
                      status: "Open",
                    });
                    setShowAddJobModal(true);
                  }}
                  className="btn-gold btn-gold-hover px-5 py-2.5 rounded-full text-xs uppercase tracking-wider font-bold flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <UserPlus className="size-4" />
                  Post New Vacancy
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Total Postings</p>
                  <p className="font-serif text-2xl text-ink font-bold mt-0.5">{jobs.length}</p>
                </div>
                <div className="size-10 rounded-full bg-pearl border border-gold/30 grid place-items-center">
                  <Briefcase className="size-4 text-gold-deep" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Active Openings</p>
                  <p className="font-serif text-2xl text-emerald-600 font-bold mt-0.5">
                    {jobs.filter((j) => j.status === "Open").length}
                  </p>
                </div>
                <div className="size-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 grid place-items-center">
                  <Check className="size-4 text-emerald-600" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Total Inquiries</p>
                  <p className="font-serif text-2xl text-ink font-bold mt-0.5">
                    {jobs.reduce((acc, j) => acc + (j.applicantCount || 0), 0)}
                  </p>
                </div>
                <div className="size-10 rounded-full bg-amber-500/10 border border-amber-500/30 grid place-items-center">
                  <Users className="size-4 text-amber-600" />
                </div>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border/80 shadow-xs">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search job title, location..."
                  value={jobSearchQuery}
                  onChange={(e) => setJobSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-background text-xs text-ink focus:border-gold focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Department:</span>
                <select
                  value={jobDepartmentFilter}
                  onChange={(e) => setJobDepartmentFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-border bg-background text-xs text-ink focus:border-gold focus:outline-none cursor-pointer"
                >
                  <option value="All">All Departments</option>
                  <option value="Perfumery Studio">Perfumery Studio</option>
                  <option value="Maison Retail">Maison Retail</option>
                  <option value="Commerce & Growth">Commerce & Growth</option>
                  <option value="Logistics & Packaging">Logistics & Packaging</option>
                </select>
              </div>
            </div>

            {/* Jobs Listing */}
            {(() => {
              const filteredJobs = jobs.filter((j) => {
                const matchSearch =
                  j.title.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
                  j.location.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
                  j.department.toLowerCase().includes(jobSearchQuery.toLowerCase());
                const matchDept = jobDepartmentFilter === "All" || j.department === jobDepartmentFilter;
                return matchSearch && matchDept;
              });

              if (filteredJobs.length === 0) {
                return (
                  <div className="p-12 text-center rounded-3xl border border-border/80 bg-card space-y-3">
                    <Briefcase className="size-10 text-muted-foreground mx-auto opacity-50" />
                    <h3 className="font-serif text-lg text-ink font-semibold">No Job Vacancies Found</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Click &quot;Post New Vacancy&quot; above to create your first artisanal opening.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 gap-4">
                  {filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      className={`p-6 rounded-3xl border bg-card shadow-xs transition-all flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 ${
                        job.status === "Open" ? "border-gold/50" : "border-border/80 opacity-75"
                      }`}
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full ${
                              job.status === "Open"
                                ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            ● {job.status === "Open" ? "Actively Hiring" : "Closed / Archived"}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider font-bold text-gold-deep px-2.5 py-0.5 rounded-full bg-pearl border border-gold/30">
                            {job.department}
                          </span>
                          {job.salaryRange && (
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                              {job.salaryRange}
                            </span>
                          )}
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-2 py-0.5 rounded-full bg-muted/60">
                            {job.type}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-2 py-0.5 rounded-full bg-muted/60">
                            Exp: {job.experience}
                          </span>
                        </div>

                        <h3 className="font-serif text-xl text-ink font-bold">{job.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">{job.description}</p>

                        {job.requirements && job.requirements.length > 0 && (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-1">
                            {job.requirements.slice(0, 3).map((req, i) => (
                              <span key={i} className="flex items-center gap-1.5">
                                <Check className="size-3 text-gold-deep" />
                                <span>{req}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground pt-2">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3 text-gold-deep" /> {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3 text-gold-deep" /> Posted: {job.createdAt}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="size-3 text-gold-deep" /> {job.applicantCount || 0} Inquiries
                          </span>
                        </div>
                      </div>

                      {/* Job Actions */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 w-full lg:w-auto justify-end pt-3 lg:pt-0 border-t lg:border-t-0 border-border/60">
                        {/* Status Toggle */}
                        <button
                          onClick={() => toggleJobStatus(job.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider font-semibold border transition-all cursor-pointer ${
                            job.status === "Open"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
                              : "bg-muted text-muted-foreground border-border hover:text-ink"
                          }`}
                          title="Toggle Open/Closed status"
                        >
                          {job.status === "Open" ? "Close Role" : "Re-Open"}
                        </button>

                        <button
                          onClick={() => openEditJobModal(job)}
                          className="px-3.5 py-2 rounded-xl border border-border text-xs uppercase tracking-wider font-semibold text-ink bg-background hover:border-gold transition-colors cursor-pointer"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              navigator.clipboard.writeText(`${window.location.origin}/careers`);
                              toast.success("Careers portal link copied to clipboard!");
                            }
                          }}
                          className="p-2 rounded-xl border border-border text-muted-foreground hover:text-ink hover:border-gold/40 transition-colors cursor-pointer"
                          title="Copy Careers link"
                        >
                          <Copy className="size-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete the vacancy for "${job.title}"?`)) {
                              deleteJob(job.id);
                              toast.success("Vacancy removed.");
                            }
                          }}
                          className="p-2 rounded-xl border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors cursor-pointer"
                          title="Delete vacancy"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Modal: Post / Edit Job */}
        {showAddJobModal && (
          <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-card border border-gold/40 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <Briefcase className="size-5 text-gold-deep" />
                  <h3 className="font-serif text-2xl text-ink font-bold">
                    {editingJob ? "Edit Career Opportunity" : "Post New Career Opportunity"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddJobModal(false)}
                  className="text-muted-foreground hover:text-ink text-sm font-semibold p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveJob} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Job Position Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Master Attar Distiller & Nose"
                      value={jobForm.title}
                      onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Department
                    </label>
                    <select
                      value={jobForm.department}
                      onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none cursor-pointer"
                    >
                      <option value="Perfumery Studio">Perfumery Studio</option>
                      <option value="Maison Retail">Maison Retail / Concierge</option>
                      <option value="Commerce & Growth">Commerce & Growth</option>
                      <option value="Logistics & Packaging">Logistics & Packaging</option>
                      <option value="Executive Management">Executive Management</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Location / Studio
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Remote / Nationwide"
                      value={jobForm.location}
                      onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Employment Type
                    </label>
                    <select
                      value={jobForm.type}
                      onChange={(e) => setJobForm({ ...jobForm, type: e.target.value as any })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none cursor-pointer"
                    >
                      <option value="Full-Time">Full-Time</option>
                      <option value="Part-Time">Part-Time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Artisanal Apprenticeship / Internship</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Experience Required
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1-3 Years or Fresh / Entry"
                      value={jobForm.experience}
                      onChange={(e) => setJobForm({ ...jobForm, experience: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Salary / Compensation (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PKR 90,000 - 150,000 / Month"
                      value={jobForm.salaryRange}
                      onChange={(e) => setJobForm({ ...jobForm, salaryRange: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Status
                    </label>
                    <select
                      value={jobForm.status}
                      onChange={(e) => setJobForm({ ...jobForm, status: e.target.value as any })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none cursor-pointer"
                    >
                      <option value="Open">Open (Live on Careers Page)</option>
                      <option value="Closed">Closed / Internal Draft</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Job Description & Responsibilities *
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Describe the primary artisan craft responsibilities, day-to-day workflow, and maison standards..."
                      value={jobForm.description}
                      onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                      className="w-full p-3.5 rounded-xl border border-border bg-background text-xs text-ink focus:border-gold focus:outline-none leading-relaxed"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Key Qualifications & Requirements (One per line)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Deep olfactory appreciation for aged oud&#10;Meticulous laboratory precision&#10;Strong communication skills in Urdu & English"
                      value={jobForm.requirementsText}
                      onChange={(e) => setJobForm({ ...jobForm, requirementsText: e.target.value })}
                      className="w-full p-3.5 rounded-xl border border-border bg-background text-xs text-ink focus:border-gold focus:outline-none leading-relaxed"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Maison Perks & Benefits (One per line)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Monthly pure attars flacon allowance&#10;Health insurance & Eid festival bonus"
                      value={jobForm.benefitsText}
                      onChange={(e) => setJobForm({ ...jobForm, benefitsText: e.target.value })}
                      className="w-full p-3.5 rounded-xl border border-border bg-background text-xs text-ink focus:border-gold focus:outline-none leading-relaxed"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowAddJobModal(false)}
                    className="px-5 py-2.5 rounded-full border border-border text-xs uppercase tracking-wider text-muted-foreground hover:text-ink cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-gold btn-gold-hover px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="size-4" />
                    {editingJob ? "Update Vacancy" : "Publish Vacancy"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add New Product */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-card border border-gold/40 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <h3 className="font-serif text-2xl text-ink">Add New Luxury Item</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-muted-foreground hover:text-ink text-sm font-semibold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveNewProduct} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                      Product Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Imperial Rose Attar"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                      Price in PKR *
                    </label>
                    <input
                      type="number"
                      required
                      min={100}
                      placeholder="12500"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                      Category
                    </label>
                    <select
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    >
                      {categories.filter((c) => c !== "All").map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                      Volume / Format
                    </label>
                    <input
                      type="text"
                      placeholder="12ml Pure Attar"
                      value={newProduct.volume}
                      onChange={(e) => setNewProduct({ ...newProduct, volume: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {["6ml Pure Attar", "12ml Pure Attar", "50ml Extrait", "100ml Extrait"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setNewProduct({ ...newProduct, volume: preset })}
                          className="text-[10px] px-2 py-0.5 rounded-full border border-border/80 hover:border-gold hover:text-gold-deep bg-pearl transition-colors"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                      Initial Stock
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  {/* MULTI-IMAGE GALLERY MANAGER (Up to 5 Photos) */}
                  <ProductGalleryManager
                    images={newProduct.images || [newProduct.image || "/product-box.jpg"]}
                    onChange={(imgs) => setNewProduct({ ...newProduct, images: imgs, image: imgs[0] || "/product-box.jpg" })}
                    urlInput={newGalleryUrlInput}
                    setUrlInput={setNewGalleryUrlInput}
                  />

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                      Key Notes / Specs
                    </label>
                    <input
                      type="text"
                      placeholder="Smoked Oud · Rose Absolute · Leather"
                      value={newProduct.notes}
                      onChange={(e) => setNewProduct({ ...newProduct, notes: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  {/* SENSORY & INTELLIGENCE INPUTS */}
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                      Gender Target
                    </label>
                    <select
                      value={newProduct.gender}
                      onChange={(e) => setNewProduct({ ...newProduct, gender: e.target.value as any })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    >
                      <option value="Unisex">Unisex (Haute Parfumerie)</option>
                      <option value="Men">Men (Pour Homme)</option>
                      <option value="Women">Women (Pour Femme)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] uppercase tracking-wider text-ink font-medium">
                        Fragrance Family
                      </label>
                      <span className="text-[10px] text-muted-foreground">Editable Text</span>
                    </div>
                    <input
                      type="text"
                      list="fragrance-family-suggestions"
                      placeholder="e.g. Woody Oud, Floral Taif, Gourmand Vanilla..."
                      value={newProduct.fragranceFamily || ""}
                      onChange={(e) => setNewProduct({ ...newProduct, fragranceFamily: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    />
                    <datalist id="fragrance-family-suggestions">
                      <option value="Woody Oud" />
                      <option value="Floral Amber" />
                      <option value="Fresh Citrus" />
                      <option value="Oriental Spice" />
                      <option value="Leather Smoke" />
                      <option value="Gourmand Vanilla" />
                      <option value="Aquatic Fresh" />
                      <option value="Chypre Floral" />
                    </datalist>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {["Woody Oud", "Floral Amber", "Fresh Citrus", "Oriental Spice", "Leather Smoke", "Gourmand"].map((fam) => (
                        <button
                          key={fam}
                          type="button"
                          onClick={() => setNewProduct({ ...newProduct, fragranceFamily: fam })}
                          className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                            newProduct.fragranceFamily === fam
                              ? "bg-gold/20 border-gold text-gold-deep font-bold"
                              : "border-border bg-pearl/40 text-muted-foreground hover:text-ink"
                          }`}
                        >
                          {fam}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                      Longevity on Skin (Hours)
                    </label>
                    <input
                      type="number"
                      min={6}
                      max={48}
                      value={newProduct.longevityHours}
                      onChange={(e) => setNewProduct({ ...newProduct, longevityHours: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                      Sillage & Projection
                    </label>
                    <select
                      value={newProduct.sillageRating}
                      onChange={(e) => setNewProduct({ ...newProduct, sillageRating: e.target.value as any })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    >
                      <option value="Strong">Strong (Heavy Room Presence)</option>
                      <option value="Enormous">Enormous (Beast Mode Trail)</option>
                      <option value="Moderate">Moderate (Intimate Aura)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                      Batch / Lot Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MSH-2026-B1"
                      value={newProduct.batchNumber}
                      onChange={(e) => setNewProduct({ ...newProduct, batchNumber: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-mono text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                      Inspired-By / Dupe Kinship Note
                    </label>
                    <input
                      type="text"
                      placeholder='e.g. "Inspired by Roja Haute Luxe & Boadicea"'
                      value={newProduct.inspiredBy}
                      onChange={(e) => setNewProduct({ ...newProduct, inspiredBy: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  {/* Flacon Sizes Selector for This Product */}
                  <div className="sm:col-span-2 p-4 rounded-2xl bg-pearl border border-gold/30 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <label className="block text-xs uppercase tracking-wider text-ink font-bold">
                        Flacon Sizes for this Fragrance (Select which options to show)
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setNewProduct({
                              ...newProduct,
                              availableSizes: ["6ml", "12ml"],
                            });
                          }}
                          className="px-2 py-0.5 rounded-full border border-border bg-background text-[10px] text-muted-foreground hover:text-ink cursor-pointer"
                        >
                          Attars (6ml, 12ml)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewProduct({
                              ...newProduct,
                              availableSizes: ["50ml"],
                            });
                          }}
                          className="px-2 py-0.5 rounded-full border border-border bg-background text-[10px] text-muted-foreground hover:text-ink cursor-pointer"
                        >
                          Sprays (50ml)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewProduct({
                              ...newProduct,
                              availableSizes: flaconSizesList.filter(s => s.isEnabled).map(s => s.label),
                            });
                          }}
                          className="px-2 py-0.5 rounded-full border border-border bg-background text-[10px] text-muted-foreground hover:text-ink cursor-pointer"
                        >
                          All Active Sizes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewProduct({
                              ...newProduct,
                              availableSizes: [],
                            });
                          }}
                          className="px-2 py-0.5 rounded-full border border-border bg-background text-[10px] text-muted-foreground hover:text-ink cursor-pointer"
                        >
                          None (Single Size)
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Check each size option that customers can choose on this product's page. Unchecked sizes will be completely hidden.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {flaconSizesList.map((size) => {
                        const isChecked = newProduct.availableSizes 
                          ? newProduct.availableSizes.includes(size.label) || newProduct.availableSizes.includes(size.id)
                          : size.isEnabled;

                        return (
                          <label
                            key={size.id}
                            className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                              isChecked
                                ? "border-gold bg-card shadow-xs ring-1 ring-gold/40"
                                : "border-border bg-background/50 opacity-60"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const current = newProduct.availableSizes || flaconSizesList.filter(s => s.isEnabled).map(s => s.label);
                                const next = e.target.checked
                                  ? [...current, size.label]
                                  : current.filter((l) => l !== size.label && l !== size.id);
                                setNewProduct({ ...newProduct, availableSizes: next });
                              }}
                              className="size-4 accent-gold cursor-pointer"
                            />
                            <div className="min-w-0">
                              <p className="font-serif text-xs font-bold text-ink truncate">{size.label}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{size.sub}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-5 py-2.5 rounded-full border border-border text-xs uppercase tracking-wider text-muted-foreground hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-gold btn-gold-hover px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-semibold"
                  >
                    Publish Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Existing Product & Volume */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-card border border-gold/40 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-gold-deep font-semibold">Fragrance Specs & Volume</span>
                  <h3 className="font-serif text-2xl text-ink font-bold">Edit {editingProduct.name}</h3>
                </div>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="text-muted-foreground hover:text-ink text-sm font-semibold p-1"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateProduct(editingProduct.id, {
                    name: editingProduct.name,
                    price: Number(editingProduct.price),
                    category: editingProduct.category,
                    volume: editingProduct.volume,
                    stock: Number(editingProduct.stock),
                    notes: editingProduct.notes,
                    tagline: editingProduct.tagline,
                    description: editingProduct.description,
                    image: editingProduct.images?.[0] || editingProduct.image || "/product-box.jpg",
                    images: (editingProduct.images && editingProduct.images.length > 0)
                      ? editingProduct.images
                      : [editingProduct.image || "/product-box.jpg"],
                    isFeatured: editingProduct.isFeatured,
                    gender: editingProduct.gender || "Unisex",
                    longevityHours: Number(editingProduct.longevityHours || 18),
                    sillageRating: editingProduct.sillageRating || "Strong",
                    fragranceFamily: editingProduct.fragranceFamily || "Woody Oud",
                    inspiredBy: editingProduct.inspiredBy,
                    samplePrice: Number(editingProduct.samplePrice || 650),
                    batchNumber: editingProduct.batchNumber || "MSH-2026-B1",
                    availableSizes: editingProduct.availableSizes,
                  });
                  toast.success(`Updated ${editingProduct.name} specifications & volume!`);
                  setEditingProduct(null);
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Product Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Price in PKR *
                    </label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Category
                    </label>
                    <select
                      value={editingProduct.category}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none font-medium"
                    >
                      {categories.filter((c) => c !== "All").map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* BOTTLE VOLUME EDITING FIELD */}
                  <div className="bg-pearl/60 p-3.5 rounded-2xl border border-gold/40">
                    <label className="block text-[11px] uppercase tracking-wider text-gold-deep font-bold mb-1">
                      Bottle Volume & Format *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 12ml Pure Attar"
                      value={editingProduct.volume}
                      onChange={(e) => setEditingProduct({ ...editingProduct, volume: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gold bg-background text-sm font-semibold text-ink focus:outline-none"
                    />
                    {/* Quick Selection Presets */}
                    <p className="text-[10px] text-muted-foreground mt-1.5 mb-1">Quick Presets:</p>
                    <div className="flex flex-wrap gap-1">
                      {["6ml Pocket Attar", "12ml Pure Attar", "50ml Extrait De Parfum", "100ml Extrait", "30ml Concentrated Oil"].map((vol) => (
                        <button
                          key={vol}
                          type="button"
                          onClick={() => setEditingProduct({ ...editingProduct, volume: vol })}
                          className={`text-[10px] px-2.5 py-0.5 rounded-full border transition-all ${
                            editingProduct.volume === vol
                              ? "bg-gold text-ink font-bold border-gold"
                              : "border-border hover:border-gold text-muted-foreground bg-background"
                          }`}
                        >
                          {vol}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Stock In Hand
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editingProduct.stock}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  {/* MULTI-IMAGE GALLERY MANAGER (Up to 5 Photos) */}
                  <ProductGalleryManager
                    images={editingProduct.images || [editingProduct.image || "/product-box.jpg"]}
                    onChange={(imgs) => setEditingProduct({ ...editingProduct, images: imgs, image: imgs[0] || "/product-box.jpg" })}
                    urlInput={editGalleryUrlInput}
                    setUrlInput={setEditGalleryUrlInput}
                  />

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Olfactory Notes
                    </label>
                    <input
                      type="text"
                      value={editingProduct.notes}
                      onChange={(e) => setEditingProduct({ ...editingProduct, notes: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Tagline
                    </label>
                    <input
                      type="text"
                      value={editingProduct.tagline || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, tagline: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  {/* SENSORY & INTELLIGENCE INPUTS */}
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Gender Target
                    </label>
                    <select
                      value={editingProduct.gender || "Unisex"}
                      onChange={(e) => setEditingProduct({ ...editingProduct, gender: e.target.value as any })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    >
                      <option value="Unisex">Unisex (Haute Parfumerie)</option>
                      <option value="Men">Men (Pour Homme)</option>
                      <option value="Women">Women (Pour Femme)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] uppercase tracking-wider text-ink font-bold">
                        Fragrance Family
                      </label>
                      <span className="text-[10px] text-muted-foreground">Editable Text</span>
                    </div>
                    <input
                      type="text"
                      list="fragrance-family-suggestions-edit"
                      placeholder="e.g. Woody Oud, Floral Taif, Gourmand Vanilla..."
                      value={editingProduct.fragranceFamily || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, fragranceFamily: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    />
                    <datalist id="fragrance-family-suggestions-edit">
                      <option value="Woody Oud" />
                      <option value="Floral Amber" />
                      <option value="Fresh Citrus" />
                      <option value="Oriental Spice" />
                      <option value="Leather Smoke" />
                      <option value="Gourmand Vanilla" />
                      <option value="Aquatic Fresh" />
                      <option value="Chypre Floral" />
                    </datalist>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {["Woody Oud", "Floral Amber", "Fresh Citrus", "Oriental Spice", "Leather Smoke", "Gourmand"].map((fam) => (
                        <button
                          key={fam}
                          type="button"
                          onClick={() => setEditingProduct({ ...editingProduct, fragranceFamily: fam })}
                          className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                            editingProduct.fragranceFamily === fam
                              ? "bg-gold/20 border-gold text-gold-deep font-bold"
                              : "border-border bg-pearl/40 text-muted-foreground hover:text-ink"
                          }`}
                        >
                          {fam}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Longevity on Skin (Hours)
                    </label>
                    <input
                      type="number"
                      min={6}
                      max={48}
                      value={editingProduct.longevityHours || 18}
                      onChange={(e) => setEditingProduct({ ...editingProduct, longevityHours: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Sillage & Projection
                    </label>
                    <select
                      value={editingProduct.sillageRating || "Strong"}
                      onChange={(e) => setEditingProduct({ ...editingProduct, sillageRating: e.target.value as any })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    >
                      <option value="Strong">Strong (Heavy Room Presence)</option>
                      <option value="Enormous">Enormous (Beast Mode Trail)</option>
                      <option value="Moderate">Moderate (Intimate Aura)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Batch / Lot Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MSH-2026-B1"
                      value={editingProduct.batchNumber || "MSH-2026-B1"}
                      onChange={(e) => setEditingProduct({ ...editingProduct, batchNumber: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-mono text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                      Inspired-By / Dupe Kinship Note
                    </label>
                    <input
                      type="text"
                      placeholder='e.g. "Inspired by Roja Haute Luxe & Boadicea"'
                      value={editingProduct.inspiredBy || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, inspiredBy: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  {/* Flacon Sizes Selector for This Product */}
                  <div className="sm:col-span-2 p-4 rounded-2xl bg-pearl border border-gold/30 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <label className="block text-xs uppercase tracking-wider text-ink font-bold">
                        Flacon Sizes for this Fragrance (Select which options to show)
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct({
                              ...editingProduct,
                              availableSizes: ["6ml", "12ml"],
                            });
                          }}
                          className="px-2 py-0.5 rounded-full border border-border bg-background text-[10px] text-muted-foreground hover:text-ink cursor-pointer"
                        >
                          Attars (6ml, 12ml)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct({
                              ...editingProduct,
                              availableSizes: ["50ml"],
                            });
                          }}
                          className="px-2 py-0.5 rounded-full border border-border bg-background text-[10px] text-muted-foreground hover:text-ink cursor-pointer"
                        >
                          Sprays (50ml)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct({
                              ...editingProduct,
                              availableSizes: flaconSizesList.filter(s => s.isEnabled).map(s => s.label),
                            });
                          }}
                          className="px-2 py-0.5 rounded-full border border-border bg-background text-[10px] text-muted-foreground hover:text-ink cursor-pointer"
                        >
                          All Active Sizes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct({
                              ...editingProduct,
                              availableSizes: [],
                            });
                          }}
                          className="px-2 py-0.5 rounded-full border border-border bg-background text-[10px] text-muted-foreground hover:text-ink cursor-pointer"
                        >
                          None (Single Size)
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Check each size option that customers can choose on this product's page. Unchecked sizes will be completely hidden.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {flaconSizesList.map((size) => {
                        const isChecked = editingProduct.availableSizes 
                          ? editingProduct.availableSizes.includes(size.label) || editingProduct.availableSizes.includes(size.id)
                          : size.isEnabled;

                        return (
                          <label
                            key={size.id}
                            className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                              isChecked
                                ? "border-gold bg-card shadow-xs ring-1 ring-gold/40"
                                : "border-border bg-background/50 opacity-60"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const current = editingProduct.availableSizes || flaconSizesList.filter(s => s.isEnabled).map(s => s.label);
                                const next = e.target.checked
                                  ? [...current, size.label]
                                  : current.filter((l) => l !== size.label && l !== size.id);
                                setEditingProduct({ ...editingProduct, availableSizes: next });
                              }}
                              className="size-4 accent-gold cursor-pointer"
                            />
                            <div className="min-w-0">
                              <p className="font-serif text-xs font-bold text-ink truncate">{size.label}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{size.sub}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-border">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="edit-featured"
                      checked={editingProduct.isFeatured}
                      onChange={(e) => setEditingProduct({ ...editingProduct, isFeatured: e.target.checked })}
                      className="size-4 accent-gold cursor-pointer"
                    />
                    <label htmlFor="edit-featured" className="text-xs text-ink font-medium cursor-pointer">
                      Feature on Homepage Showcase
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="px-5 py-2.5 rounded-full border border-border text-xs uppercase tracking-wider text-muted-foreground hover:text-ink cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-gold btn-gold-hover px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-bold shadow-md cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Bulk CSV Product Upload */}
        {showBulkModal && (
          <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-card border border-gold/40 rounded-3xl p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <UploadCloud className="size-6 text-gold-deep" />
                  <div>
                    <h3 className="font-serif text-2xl text-ink font-bold">Bulk CSV Fragrance Upload</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Paste CSV rows or load a file to import multiple attars & perfumes instantly.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="text-muted-foreground hover:text-ink text-sm font-semibold p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-pearl/60 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-ink text-sm">Need the CSV format standard?</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Download the official template pre-formatted with sensory fields, pricing, and sample columns.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadCsvTemplate}
                    className="px-4 py-2 rounded-full bg-gold text-ink font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shrink-0 hover:scale-[1.02] transition-transform cursor-pointer"
                  >
                    <Download className="size-3.5" />
                    Download Template
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] uppercase tracking-wider text-ink font-bold">
                    Upload .CSV File directly:
                  </label>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setBulkCsvInput((event.target?.result as string) || "");
                          toast.success(`Loaded "${file.name}" into import buffer!`);
                        };
                        reader.readAsText(file);
                      }
                    }}
                    className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gold file:text-ink hover:file:bg-gold/80 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] uppercase tracking-wider text-ink font-bold">
                    Or Paste CSV Data Below:
                  </label>
                  <textarea
                    rows={8}
                    value={bulkCsvInput}
                    onChange={(e) => setBulkCsvInput(e.target.value)}
                    placeholder="Name,Price,Category,Volume,Stock,Tagline,Notes,TopNotes,HeartNotes,BaseNotes,Gender,LongevityHours,SillageRating,FragranceFamily,InspiredBy,SamplePrice&#10;Imperial Musk,15000,Attars,12ml Pure Attar,20,Royal musk,Musk · Amber,Bergamot,Taif Rose,Musk,Unisex,20,Strong,Woody Oud,,650"
                    className="w-full p-3.5 rounded-2xl border border-border bg-background text-xs font-mono text-ink focus:border-gold focus:outline-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-5 py-2.5 rounded-full border border-border text-xs uppercase tracking-wider text-muted-foreground hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProcessBulkCsv}
                  className="btn-gold btn-gold-hover px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <UploadCloud className="size-4" />
                  Parse & Import Products
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
