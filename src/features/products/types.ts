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
  duplicateOfId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type StockState = 'low' | 'out';
export type ProductsSort = 'stock_asc' | 'stock_desc' | 'price_asc' | 'price_desc';

export interface ProductsListQuery {
  status?: ProductStatus;
  category?: string;
  cluster?: string;
  sellerId?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  stockState?: StockState;
  sort?: ProductsSort;
  page: number;
  limit: number;
}

/** Candidate match returned by GET /products/:id/duplicates. */
export interface DuplicateCandidate {
  id: string;
  name: string;
  sellerId: string;
  status: ProductStatus;
  image: string | null;
  createdAt: string;
}

export interface ProductsListMeta {
  total: number;
  page: number;
  limit: number;
}

/** Result of GET /products/:id/quality-check. */
export interface ProductQualityCheck {
  restrictedTermsFound: string[];
  checklist: {
    hasImage: boolean;
    descriptionOk: boolean;
    pricingOk: boolean;
    nameOk: boolean;
    inStock: boolean;
  };
}
