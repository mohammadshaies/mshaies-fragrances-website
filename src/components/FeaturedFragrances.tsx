import { useState } from "react";
import { useProductsStore } from "@/lib/products-store";
import { ProductCard3D } from "./ProductCard3D";
import { Sparkles, SlidersHorizontal, Search, ArrowUpDown, X, Check } from "lucide-react";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// COMPONENT PROPS & TYPES
// ============================================================================
interface FeaturedFragrancesProps {
  showAll?: boolean;
  initialCategory?: string;
  title?: string;
  subtitle?: string;
}

type SortOption = "featured" | "price-asc" | "price-desc" | "name-asc" | "in-stock";

const SORT_OPTIONS: { label: string; shortLabel: string; value: SortOption }[] = [
  { label: "Featured", shortLabel: "Sort", value: "featured" },
  { label: "Price: Low to High", shortLabel: "Price: Low", value: "price-asc" },
  { label: "Price: High to Low", shortLabel: "Price: High", value: "price-desc" },
  { label: "Name: A to Z", shortLabel: "A-Z", value: "name-asc" },
  { label: "In Stock Only", shortLabel: "In Stock", value: "in-stock" },
];

// ============================================================================
// FEATURED FRAGRANCES & CATALOG COMPONENT
// ============================================================================
// Renders the product grid with dynamic search, category filtering, and sorting.
export function FeaturedFragrances({ 
  showAll = false, 
  initialCategory = "All",
  title = "The Maison Collection",
  subtitle = "Hand-Poured & Delivered All Across Pakistan"
}: FeaturedFragrancesProps) {
  // Access global product inventory and categories from store
  const { products, categories } = useProductsStore();
  
  // Local filter & search states
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedFamily, setSelectedFamily] = useState<string>("All");
  const [selectedGender, setSelectedGender] = useState<string>("All");
  const [selectedLongevity, setSelectedLongevity] = useState<number | "All">("All");
  const [selectedOccasion, setSelectedOccasion] = useState<string>("All");
  const [showSensoryFilters, setShowSensoryFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(80000);

  // ==========================================================================
  // 1. FILTERING LOGIC
  // ==========================================================================
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "All" || product.category === selectedCategory;
    const matchesFamily =
      selectedFamily === "All" || product.fragranceFamily === selectedFamily;
    const matchesGender =
      selectedGender === "All" || product.gender === selectedGender;
    const matchesLongevity =
      selectedLongevity === "All" || (product.longevityHours && product.longevityHours >= selectedLongevity);
    const matchesOccasion =
      selectedOccasion === "All" || product.occasionSuitability?.includes(selectedOccasion as any);
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.inspiredBy && product.inspiredBy.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStock = !inStockOnly || product.stock > 0;
    const matchesPrice = product.price <= maxPrice;

    return (
      matchesCategory &&
      matchesFamily &&
      matchesGender &&
      matchesLongevity &&
      matchesOccasion &&
      matchesSearch &&
      matchesStock &&
      matchesPrice
    );
  });

  // Active filter count
  const activeFilterCount = 
    (selectedFamily !== "All" ? 1 : 0) +
    (selectedGender !== "All" ? 1 : 0) +
    (selectedLongevity !== "All" ? 1 : 0) +
    (selectedOccasion !== "All" ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  // ==========================================================================
  // 2. SORTING LOGIC
  // ==========================================================================
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "name-asc") return a.name.localeCompare(b.name);
    if (sortBy === "in-stock") return b.stock - a.stock;
    // Default: Sort featured items first
    return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
  });

  // If showAll is false, only display products marked as featured
  const displayProducts = showAll
    ? sortedProducts
    : sortedProducts.filter((p) => p.isFeatured !== false);

  return (
    <section 
      id="shop" 
      className="py-6 sm:py-16 bg-background relative overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-3.5 sm:px-8">
        
        {/* =================================================================== */}
        {/* SECTION HEADER                                                      */}
        {/* =================================================================== */}
        <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-8 px-2">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-gold-deep mb-1.5 sm:mb-3 font-semibold leading-relaxed">
            {subtitle}
          </p>
          <h2 className="font-serif text-2xl sm:text-4xl lg:text-5xl tracking-tight text-ink">
            {title}
          </h2>
          <div className="hairline-gold w-16 sm:w-24 mx-auto mt-2 sm:mt-4 opacity-70" />
        </div>

        {/* =================================================================== */}
        {/* FILTER & TOOLBAR CONTROLS — Compact Smart Luxury Layout             */}
        {/* =================================================================== */}
        <div className="space-y-2.5 sm:space-y-4 mb-6 sm:mb-10 max-w-5xl mx-auto">
          {/* 1. Luxury Category Navigation (Edge-to-edge smooth scroll on mobile, centered on desktop) */}
          <div className="relative -mx-3.5 sm:mx-0 px-3.5 sm:px-0">
            <div className="flex items-center justify-start sm:justify-center gap-2 sm:gap-2.5 overflow-x-auto py-1.5 scroll-smooth no-scrollbar touch-pan-x overscroll-x-contain">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[10px] xs:text-[11px] sm:text-xs uppercase tracking-wider sm:tracking-[0.2em] px-3.5 xs:px-4 sm:px-6 py-1.5 sm:py-2 rounded-full transition-all duration-200 whitespace-nowrap cursor-pointer shrink-0 min-h-[32px] sm:min-h-[36px] border ${
                    selectedCategory === cat
                      ? "bg-ink text-gold border-gold/80 font-bold shadow-xs"
                      : "bg-card text-muted-foreground hover:text-ink hover:bg-pearl border-border/80"
                  }`}
                >
                  {cat === "All" ? (
                    <>
                      <span className="sm:hidden">All</span>
                      <span className="hidden sm:inline">All Collections</span>
                    </>
                  ) : (
                    cat
                  )}
                </button>
              ))}
              {/* Right edge spacer for smooth mobile scroll termination */}
              <div className="w-2 shrink-0 sm:hidden" aria-hidden="true" />
            </div>
          </div>

          {/* 2. Unified Smart Action Bar (Search + Sort + Filters in Harmonious Capsule) */}
          <div className="rounded-2xl sm:rounded-full bg-card/95 border border-gold/40 shadow-xs backdrop-blur-md p-1 sm:p-1.5">
            <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-0.5">
              {/* Search Input (Seamless, spacious, clean) */}
              <div className="relative flex-1 min-w-0 flex items-center">
                <Search className="size-3.5 sm:size-4 text-gold-deep shrink-0 mr-1.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search scents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-ink placeholder:text-muted-foreground/60 text-xs sm:text-sm focus:outline-none py-1"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-muted-foreground hover:text-ink p-1 mr-0.5 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="size-3 sm:size-3.5" />
                  </button>
                )}
              </div>

              {/* Elegant Golden Hairline Divider */}
              <div className="h-4 w-px bg-gold/30 shrink-0" />

              {/* Sleek Luxury Sort Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={`flex items-center gap-1 px-2 py-1 text-[11px] sm:text-xs font-semibold rounded-full transition-all cursor-pointer shrink-0 ${
                      sortBy !== "featured"
                        ? "bg-gold text-ink font-bold shadow-2xs"
                        : "text-ink hover:text-gold-deep"
                    }`}
                    style={{ fontSize: "11px" }}
                    title="Sort collection"
                  >
                    <ArrowUpDown className="size-3 text-gold-deep" />
                    <span className="hidden sm:inline">
                      {SORT_OPTIONS.find((o) => o.value === sortBy)?.shortLabel || "Sort"}
                    </span>
                    {sortBy !== "featured" && (
                      <span className="size-1.5 rounded-full bg-ink sm:hidden" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={6}
                  className="w-44 bg-card/95 backdrop-blur-md border border-gold/40 shadow-xl rounded-xl p-1 z-50"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => setSortBy(opt.value)}
                      className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg cursor-pointer transition-colors ${
                        sortBy === opt.value
                          ? "bg-gold/20 text-gold-deep font-bold"
                          : "text-ink hover:bg-gold/10 hover:text-gold-deep"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {sortBy === opt.value && <Check className="size-3.5 text-gold-deep shrink-0" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Elegant Golden Hairline Divider */}
              <div className="h-4 w-px bg-gold/30 shrink-0" />

              {/* Seamless Filter Button */}
              <button
                type="button"
                onClick={() => setShowSensoryFilters(!showSensoryFilters)}
                className={`flex items-center gap-1 px-2 py-1 text-[11px] sm:text-xs font-semibold rounded-full transition-all cursor-pointer shrink-0 ${
                  showSensoryFilters || activeFilterCount > 0
                    ? "bg-gold text-ink font-bold shadow-2xs"
                    : "text-ink hover:text-gold-deep"
                }`}
                style={{ fontSize: "11px" }}
                title="Filter collection"
              >
                <SlidersHorizontal className="size-3 text-gold-deep" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="size-3.5 rounded-full bg-ink text-gold text-[8px] grid place-items-center font-mono font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Mini Active Filter Chips Row (Only visible when active) */}
            {(activeFilterCount > 0 || searchQuery || selectedCategory !== "All") && (
              <div className="flex items-center gap-1.5 pt-1.5 px-1 overflow-x-auto no-scrollbar text-[10px] border-t border-border/40 mt-1.5">
                <span className="text-muted-foreground/80 font-medium shrink-0">Active:</span>
                {selectedCategory !== "All" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/15 text-gold-deep border border-gold/30 shrink-0">
                    {selectedCategory}
                    <button
                      onClick={() => setSelectedCategory("All")}
                      className="hover:text-destructive cursor-pointer ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                )}
                {selectedFamily !== "All" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/15 text-gold-deep border border-gold/30 shrink-0">
                    {selectedFamily}
                    <button
                      onClick={() => setSelectedFamily("All")}
                      className="hover:text-destructive cursor-pointer ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                )}
                {selectedGender !== "All" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/15 text-gold-deep border border-gold/30 shrink-0">
                    {selectedGender}
                    <button
                      onClick={() => setSelectedGender("All")}
                      className="hover:text-destructive cursor-pointer ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                )}
                {selectedLongevity !== "All" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/15 text-gold-deep border border-gold/30 shrink-0">
                    {selectedLongevity}+ hrs
                    <button
                      onClick={() => setSelectedLongevity("All")}
                      className="hover:text-destructive cursor-pointer ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                )}
                {inStockOnly && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/15 text-gold-deep border border-gold/30 shrink-0">
                    In Stock
                    <button
                      onClick={() => setInStockOnly(false)}
                      className="hover:text-destructive cursor-pointer ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/15 text-gold-deep border border-gold/30 shrink-0">
                    "{searchQuery}"
                    <button
                      onClick={() => setSearchQuery("")}
                      className="hover:text-destructive cursor-pointer ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSelectedCategory("All");
                    setSelectedFamily("All");
                    setSelectedGender("All");
                    setSelectedLongevity("All");
                    setSelectedOccasion("All");
                    setInStockOnly(false);
                    setSearchQuery("");
                  }}
                  className="text-[10px] text-muted-foreground hover:text-destructive underline ml-auto shrink-0 cursor-pointer"
                >
                  Reset all
                </button>
              </div>
            )}
          </div>

          {/* 3. Refined Expandable Sensory & Family Panel */}
          {showSensoryFilters && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gold/40 bg-card shadow-[var(--shadow-luxe)] space-y-3.5 sm:space-y-5"
            >
              {/* Fragrance Family Accords */}
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-2.5">
                  Fragrance Family Accord
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "All", label: "All Families" },
                    { id: "Woody Oud", label: "🪵 Woody Oud" },
                    { id: "Floral Amber", label: "🌹 Floral Amber" },
                    { id: "Fresh Citrus", label: "🍋 Fresh Citrus" },
                    { id: "Oriental Spice", label: "✨ Oriental Spice" },
                    { id: "Leather Smoke", label: "🔥 Leather Smoke" },
                  ].map((fam) => (
                    <button
                      key={fam.id}
                      onClick={() => setSelectedFamily(fam.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        selectedFamily === fam.id
                          ? "bg-ink text-gold font-bold shadow-xs"
                          : "bg-background text-muted-foreground hover:text-ink border border-border/60"
                      }`}
                    >
                      {fam.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3 Balanced Refinement Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/60 text-xs">
                {/* Gender Filter */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    Target Audience
                  </label>
                  <div className="flex gap-1.5">
                    {["All", "Unisex", "Men", "Women"].map((g) => (
                      <button
                        key={g}
                        onClick={() => setSelectedGender(g)}
                        className={`flex-1 py-1.5 rounded-xl border text-center text-[11px] font-medium transition-colors cursor-pointer ${
                          selectedGender === g
                            ? "border-gold bg-pearl text-ink font-bold"
                            : "border-border/60 bg-background text-muted-foreground hover:text-ink"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Longevity Strength */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    Longevity Strength
                  </label>
                  <div className="flex gap-1.5">
                    {[
                      { id: "All", label: "All" },
                      { id: 16, label: "16+ Hrs" },
                      { id: 20, label: "20+ Hrs" },
                    ].map((l) => (
                      <button
                        key={String(l.id)}
                        onClick={() => setSelectedLongevity(l.id as any)}
                        className={`flex-1 py-1.5 rounded-xl border text-center text-[11px] font-medium transition-colors cursor-pointer ${
                          selectedLongevity === l.id
                            ? "border-gold bg-pearl text-ink font-bold"
                            : "border-border/60 bg-background text-muted-foreground hover:text-ink"
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Occasion & In-Stock */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                      Occasion
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-[10px] uppercase tracking-wider font-semibold text-ink">
                      <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(e) => setInStockOnly(e.target.checked)}
                        className="rounded accent-gold size-3 cursor-pointer"
                      />
                      In Stock Only
                    </label>
                  </div>
                  <select
                    value={selectedOccasion}
                    onChange={(e) => setSelectedOccasion(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-border/80 bg-background text-ink focus:border-gold focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Occasions</option>
                    <option value="Wedding / Barat">Weddings & Barat</option>
                    <option value="Evening Gala">Evening Gala & Black Tie</option>
                    <option value="Daily Office">Daily Office & Executive</option>
                    <option value="Jummah / Spiritual">Jummah & Spiritual</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* =================================================================== */}
        {/* PRODUCT GRID                                                        */}
        {/* =================================================================== */}
        {products.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border border-dashed border-border/60 bg-pearl/20 max-w-xl mx-auto px-6">
            <Sparkles className="size-10 mx-auto text-gold-deep mb-3 opacity-70" />
            <p className="font-serif text-2xl text-ink">New Collection Unveiling Soon</p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Our master perfumers and horologists are currently formulating fresh artisanal flacons. New releases will be added directly to the catalog.
            </p>
          </div>
        ) : displayProducts.length === 0 ? (
          // Empty State if no products match the current filters
          <div className="text-center py-20 rounded-3xl border border-dashed border-border/60 bg-pearl/20">
            <SlidersHorizontal className="size-9 mx-auto text-gold-deep mb-3 opacity-60" />
            <p className="font-serif text-2xl text-ink">No items match your filters</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your category filter, in-stock toggle, or search keywords.
            </p>
            <button
              onClick={() => {
                setSelectedCategory("All");
                setSelectedFamily("All");
                setSelectedGender("All");
                setSelectedLongevity("All");
                setSelectedOccasion("All");
                setSearchQuery("");
                setInStockOnly(false);
                setSortBy("featured");
              }}
              className="mt-4 text-xs uppercase tracking-wider font-semibold text-gold-deep hover:underline cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          // Responsive Product Grid (2 columns on mobile, 3 on tablet/laptop, 4 on large screens)
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 xs:gap-3 sm:gap-6 lg:gap-8">
            {displayProducts.map((p, i) => (
              <ProductCard3D key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
