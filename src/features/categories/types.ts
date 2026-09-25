// Mirrors backend `src/modules/categories/categories.types.ts`.

export type CategoryStatus = 'active' | 'inactive';

export interface SafeCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  defaultCommissionRate: number;
  status: CategoryStatus;
  adminId: string | null;
  /** Who holds it — resolved by the API so the row can name them. */
  adminName?: string | null;
  iconUrl?: string;
  imageUrl?: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  parentId?: string | null;
  defaultCommissionRate: number;
  iconUrl?: string;
  imageUrl?: string;
  displayOrder?: number;
  status?: CategoryStatus;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  parentId?: string | null;
  defaultCommissionRate?: number;
  iconUrl?: string;
  imageUrl?: string;
  displayOrder?: number;
  status?: CategoryStatus;
  adminId?: string | null;
}
