export type ReviewTargetType = 'product' | 'seller';
export type ReviewStatus = 'pending' | 'approved' | 'hidden';

export interface Review {
  _id: string;
  id?: string;
  raterId: string;
  targetType: ReviewTargetType;
  targetId: string;
  /**
   * Product name / seller farm name, resolved by the admin list endpoint.
   * Always present on the admin list (falls back to "Deleted product" /
   * "Deleted seller" server-side) — never a raw ObjectId.
   */
  targetName?: string | null;
  /** Name of the buyer who wrote the review; "Anonymous" if unresolved. */
  raterName?: string | null;
  orderId: string;
  /** Human order number (BD-…) for the linked order, resolved server-side. */
  orderNumber?: string | null;
  rating: number;
  text: string | null;
  status: ReviewStatus;
  moderatedBy: string | null;
  moderatedAt: string | null;
  moderationNotes: string | null;
  /**
   * Quality-monitor triage, separate from moderation. Moderation decides
   * whether buyers see the review; this records that someone dealt with the
   * complaint behind it, so the low-rating queue drains.
   */
  handledAt: string | null;
  handledBy: string | null;
  handledNotes: string | null;
  handledTicketId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ReviewsSort = 'newest' | 'oldest' | 'rating_asc' | 'rating_desc';

export interface ReviewsListQuery {
  status?: ReviewStatus;
  targetType?: ReviewTargetType;
  targetId?: string;
  categoryId?: string;
  minRating?: number;
  maxRating?: number;
  /** Exactly this many stars — what the star tabs filter on. */
  rating?: number;
  /** Triage state. Omit for both. */
  handled?: boolean;
  /** Matches the review text. */
  q?: string;
  sort?: ReviewsSort;
  page: number;
  limit: number;
}

export interface ReviewsListMeta {
  total: number;
  page: number;
  limit: number;
  /**
   * Reviews per star rating for the current filter, ignoring the rating
   * filter — what the star tabs show. `all` is the sum.
   */
  counts?: Record<string, number>;
}
