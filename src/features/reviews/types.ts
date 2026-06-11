export type ReviewTargetType = 'product' | 'seller';
export type ReviewStatus = 'pending' | 'approved' | 'hidden';

export interface Review {
  _id: string;
  id?: string;
  raterId: string;
  targetType: ReviewTargetType;
  targetId: string;
  /** Product name / seller farm name, resolved by the admin list endpoint. */
  targetName?: string | null;
  orderId: string;
  rating: number;
  text: string | null;
  status: ReviewStatus;
  moderatedBy: string | null;
  moderatedAt: string | null;
  moderationNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewsListQuery {
  status?: ReviewStatus;
  targetType?: ReviewTargetType;
  targetId?: string;
  categoryId?: string;
  minRating?: number;
  maxRating?: number;
  page: number;
  limit: number;
}

export interface ReviewsListMeta {
  total: number;
  page: number;
  limit: number;
}
