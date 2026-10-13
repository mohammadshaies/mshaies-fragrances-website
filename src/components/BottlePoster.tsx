export function BottlePoster({ isCompact = false }: { isCompact?: boolean }) {
  return (
    <div 
      className={`relative w-full h-full flex items-center justify-center select-none ${
        isCompact
          ? "min-h-[220px] xs:min-h-[250px] sm:min-h-[280px]"
          : "min-h-[440px] lg:min-h-[500px]"
      }`}
    >
      <img
        src="/bottle-poster.webp"
        alt="M.shaies Luxury Flacon"
        fetchPriority="high"
        decoding="async"
        className={`absolute inset-0 w-full h-full object-contain pointer-events-none select-none ${
          isCompact ? "p-4" : "p-6"
        }`}
      />
    </div>
  );
}
