import { BRAND } from "@/lib/brand";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <p className={compact ? "brand compact" : "brand"} aria-label={BRAND.name}>
      <span className="brand-cut" aria-hidden />
      {BRAND.name}
    </p>
  );
}
