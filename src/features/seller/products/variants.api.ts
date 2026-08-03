import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ProductVariant } from '@/features/products/types';

/** Payload accepted by the create / bulk-replace endpoints. */
export interface VariantInput {
  /** Present when editing an existing row (bulk replace matches on it). */
  id?: string;
  label: string;
  sku?: string | null;
  size?: string | null;
  colour?: string | null;
  pricing: { standard?: number; organic?: number; premium?: number };
  mrp?: number | null;
  costPrice?: number | null;
  stock: { quantity: number; threshold: number };
  weightGrams?: number | null;
  dimensions?: string | null;
  images?: string[];
  minOrderQty?: number | null;
  maxOrderQty?: number | null;
  hsnCode?: string | null;
  isDefault?: boolean;
  active?: boolean;
  displayOrder?: number;
}

export const variantKeys = {
  all: ['variants'] as const,
  list: (productId: string) => ['variants', productId] as const,
};

export const useVariants = (productId?: string) =>
  useQuery({
    queryKey: variantKeys.list(productId ?? ''),
    queryFn: () => api.get<ProductVariant[]>(`/products/${productId}/variants`),
    enabled: Boolean(productId),
  });

/**
 * Saves the whole variant table in one call — the product wizards submit every
 * row, and the backend creates, updates or retires each as needed.
 */
export const useReplaceVariants = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, variants }: { productId: string; variants: VariantInput[] }) =>
      api.put<ProductVariant[]>(`/products/${productId}/variants`, { variants }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: variantKeys.list(vars.productId) });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useDeleteVariant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, variantId }: { productId: string; variantId: string }) =>
      api.delete<{ deleted: boolean; deactivated: boolean }>(
        `/products/${productId}/variants/${variantId}`,
      ),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: variantKeys.list(vars.productId) });
    },
  });
};
