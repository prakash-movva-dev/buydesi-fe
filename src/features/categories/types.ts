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
  iconUrl?: string;
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
  displayOrder?: number;
  status?: CategoryStatus;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  parentId?: string | null;
  defaultCommissionRate?: number;
  iconUrl?: string;
  displayOrder?: number;
  status?: CategoryStatus;
  adminId?: string | null;
}
