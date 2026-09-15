import { formatInr } from '@/lib/format';
import type { ProductVariantSummary } from './types';

// ----------------------------------------------------------------------

type Priceable = {
  price: number;
  variantSummary?: ProductVariantSummary;
};

/**
 * What a buyer will pay, as one string.
 *
 * A product sold as a single item has one price. Once it sells in options,
 * each option carries its own, so the listing shows the range the buyer will
 * choose from — the rollup the backend keeps on the product.
 */
export const displayPrice = (p: Priceable): string => {
  const summary = p.variantSummary;
  if (summary?.hasVariants && summary.priceFrom != null) {
    return summary.priceTo != null && summary.priceTo !== summary.priceFrom
      ? `${formatInr(summary.priceFrom)} – ${formatInr(summary.priceTo)}`
      : formatInr(summary.priceFrom);
  }
  return typeof p.price === 'number' && p.price > 0 ? formatInr(p.price) : '—';
};

/** The single number to sort or compare on — the cheapest a buyer can pay. */
export const lowestPrice = (p: Priceable): number | null => {
  const summary = p.variantSummary;
  if (summary?.hasVariants && summary.priceFrom != null) return summary.priceFrom;
  return typeof p.price === 'number' && p.price > 0 ? p.price : null;
};

/** Stock a buyer can actually draw on — summed across options when they exist. */
export const availableStock = (p: {
  stock: { quantity: number };
  variantSummary?: ProductVariantSummary;
}): number =>
  p.variantSummary?.hasVariants ? p.variantSummary.totalStock : (p.stock?.quantity ?? 0);
