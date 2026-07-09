import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import { productKeys } from '@/features/products/api';
import type {
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
      if (q.category) params.set('category', q.category);
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

export interface ProductPricing {
  standard?: number;
  organic?: number;
  premium?: number;
}

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
  pricing: ProductPricing;
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
