import type { SafeOrder, SubOrderView } from '@/features/orders/types';

// ----------------------------------------------------------------------

/**
 * A seller's own package on an order.
 *
 * The order's status is a rollup across every seller — it only reads PACKED
 * once all of them have packed. So a seller who has packed their own items
 * still sees an order at PLACED, which answers a question they were not
 * asking. Everything a seller sees should come from their package, not the
 * order.
 */
export const myPackage = (order: SafeOrder, sellerId: string): SubOrderView | undefined =>
  order.subOrders?.find((p: SubOrderView) => p.sellerId === sellerId);

/** How many other sellers share this order. */
export const otherSellerCount = (order: SafeOrder, sellerId: string): number =>
  new Set((order.subOrders ?? [])
      .filter((p: SubOrderView) => p.sellerId !== sellerId)
      .map((p: SubOrderView) => p.sellerId))
    .size;

/** True when this seller is done but the order is still held up elsewhere. */
export const waitingOnOtherSellers = (order: SafeOrder, sellerId: string): boolean => {
  const mine = myPackage(order, sellerId);
  if (!mine) return false;
  return mine.status !== order.status && mine.status === 'PACKED';
};

/** "2 of 3 packages delivered" — the progress line a split order needs. */
export const packageProgress = (
  order: SafeOrder,
): { done: number; total: number } | null => {
  const packages = order.subOrders ?? [];
  if (packages.length <= 1) return null;
  return {
    done: packages.filter((p: SubOrderView) => p.status === 'DELIVERED').length,
    total: packages.length,
  };
};
