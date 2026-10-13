export function BottlePoster({ isCompact = false }: { isCompact?: boolean }) {
  return (
    <div 
      className={`relative w-full h-full flex items-center justify-center select-none ${
        isCompact ? "p-4" : "p-6"
      }`}
    >
      <img
        src="/product-desert-gold.png"
        alt="M.shaies Luxury Flacon"
        fetchPriority="high"
        decoding="async"
        className={`w-auto object-contain drop-shadow-[0_20px_35px_rgba(212,175,55,0.25)] transition-opacity duration-500 ${
          isCompact ? "max-h-[190px] xs:max-h-[220px]" : "max-h-[420px] lg:max-h-[460px]"
        }`}
      />
    </div>
  );
}
