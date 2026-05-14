export type CartLimitScope = 'default' | 'cluster' | 'category' | 'cluster_category';
export type CartLimitKind = 'regular' | 'bulk';

export interface CartLimit {
  _id: string;
  id?: string;
  scope: CartLimitScope;
  kind: CartLimitKind;
  clusterId: string | null;
  categoryId: string | null;
  maxQtyPerProduct: number;
  maxDistinctItems: number;
  maxCartValueInr: number;
  maxTotalWeightGrams: number;
  maxCodValueInr: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartLimitWriteInput {
  kind: CartLimitKind;
  clusterId?: string | null;
  categoryId?: string | null;
  maxQtyPerProduct: number;
  maxDistinctItems: number;
  maxCartValueInr: number;
  maxTotalWeightGrams: number;
  maxCodValueInr: number;
}
