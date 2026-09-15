import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import { productKeys } from '@/features/products/api';
import type {
  ProductKind,
  ProductsListMeta,
  ProductsListQuery,
  SafeProduct,
} from '@/features/products/types';

/** Seller's own catalogue (all statuses) — the backend forces sellerId to self. */
export const useMyProducts = (q: ProductsListQuery) =>
  useQuery({
    queryKey: ['products', 'mine', q],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q.status) params.set('status', q.status);
      if (q.kind) params.set('kind', q.kind);
      if (q.category) params.set('category', q.category);
      if (q.stockState) params.set('stockState', q.stockState);
      if (q.q) params.set('q', q.q);
      if (q.sort) params.set('sort', q.sort);
      params.set('page', String(q.page));
      params.set('limit', String(q.limit));
      const { data, meta } = await fetchEnvelope<SafeProduct[]>(
        `/products/mine?${params.toString()}`,
      );
      return {
        items: data,
        meta:
          (meta as ProductsListMeta | undefined) ?? {
            total: data.length,
            page: q.page,
            limit: q.limit,
          },
      };
    },
  });



export interface ProductStock {
  quantity: number;
  threshold: number;
}

export interface CreateProductInput {
  name: string;
  description: string;
  categoryId: string;
  unit: string;
  weightGrams?: number;
  images: string[];
  kind: ProductKind;
  price: number;
  stock: ProductStock;
  // Extended listing attributes (all optional).
  highlights?: string[];
  brand?: string;
  sku?: string;
  tags?: string[];
  womenEntrepreneur?: boolean;
  youthEmpowerment?: boolean;
  organicCertified?: boolean;
  organicCertification?: string;
  minOrderQty?: number;
  maxOrderQty?: number;
  codAvailable?: boolean;
  returnEligible?: boolean;
  hsnCode?: string;
  harvestDate?: string;
  shelfLifeDays?: number;
  packagingType?: string;
  videoUrl?: string;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) => api.post<SafeProduct>('/products', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateProductInput }) =>
      api.put<SafeProduct>(`/products/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ success: true }>(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
};

export interface ProductImagePresign {
  url: string;
  s3Key?: string;
  key?: string;
  bucket?: string;
  expiresIn?: number;
  headers?: Record<string, string>;
  fields?: Record<string, string>;
  /** Public HTTPS URL to store + render (public-read uploads bucket). */
  publicUrl?: string;
}

export const useProductImageUploadUrl = () =>
  useMutation({
    mutationFn: (input: { contentType: string; ext?: string }) =>
      api.post<ProductImagePresign>('/products/image-upload-url', input),
  });

// ----------------------------------------------------------------------

export interface StockAdjustInput {
  /** Move the count by this much — the everyday restock. */
  delta?: number;
  /** Or set it outright, after a stock-take. */
  quantity?: number;
  threshold?: number;
  reason?: string;
}

export interface StockAdjustResult {
  product: SafeProduct;
  quantityBefore: number;
  quantityAfter: number;
}

export interface StockHistoryRow {
  id: string;
  variantId: string | null;
  quantityBefore: number;
  quantityAfter: number;
  delta: number;
  reason: string | null;
  actorName: string | null;
  createdAt: string;
}

/**
 * Restocking without opening the edit wizard. Sending a delta is race-safe
 * against a sale landing at the same moment, so it is the default path.
 */
export const useAdjustStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      variantId,
      ...body
    }: StockAdjustInput & { productId: string; variantId?: string }) =>
      api.patch<StockAdjustResult>(
        variantId
          ? `/products/${productId}/variants/${variantId}/stock`
          : `/products/${productId}/stock`,
        body,
      ),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: productKeys.detail(vars.productId) });
      qc.invalidateQueries({ queryKey: ['variants', vars.productId] });
      qc.invalidateQueries({ queryKey: ['stock-history', vars.productId] });
    },
  });
};

export const useStockHistory = (productId: string | undefined) =>
  useQuery({
    queryKey: ['stock-history', productId ?? 'none'],
    queryFn: () => api.get<StockHistoryRow[]>(`/products/${productId}/stock/history`),
    enabled: Boolean(productId),
  });
