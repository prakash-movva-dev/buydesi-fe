// Mirrors backend `src/modules/products/products.types.ts`.

export type ProductStatus = 'PENDING' | 'LIVE' | 'SUSPENDED' | 'REJECTED';

export interface ProductPricing {
  standard?: number;
  organic?: number;
  premium?: number;
}

export interface ProductStock {
  quantity: number;
  threshold: number;
}

export interface SafeProduct {
  id: string;
  sellerId: string;
  categoryId: string;
  name: string;
  description: string;
  nameI18n?: Record<string, string>;
  descriptionI18n?: Record<string, string>;
  unit: string;
  weightGrams: number | null;
  images: string[];
  pricing: ProductPricing;
  stock: ProductStock;
  status: ProductStatus;
  approvalNotes: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsListQuery {
  status?: ProductStatus;
  category?: string;
  cluster?: string;
  sellerId?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  page: number;
  limit: number;
}

export interface ProductsListMeta {
  total: number;
  page: number;
  limit: number;
}
