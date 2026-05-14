import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { productKeys } from '@/features/products/api';
import type { SafeProduct } from '@/features/products/types';

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

export const useProductImageUploadUrl = () =>
  useMutation({
    mutationFn: (input: { contentType: string; ext?: string }) =>
      api.post<{ url: string; fields?: Record<string, string>; key: string; expiresAt: string }>(
        '/products/image-upload-url',
        input,
      ),
  });
