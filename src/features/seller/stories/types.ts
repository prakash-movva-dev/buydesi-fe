// Mirrors backend `src/modules/farmer-stories/farmer-stories.types.ts`.

export type FarmerStoryStatus = 'published' | 'hidden';

export interface FarmerStoryAuthor {
  sellerId: string;
  name: string;
  farmName: string | null;
  sellerCode: string | null;
  verified: boolean;
  location: string | null;
  avatarUrl: string | null;
}

export interface FarmerStory {
  id: string;
  sellerId: string;
  title: string;
  body: string;
  images: string[];
  status: FarmerStoryStatus;
  publishedAt: string;
  likeCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  author: FarmerStoryAuthor | null;
  likedByMe: boolean;
}

export interface StoriesListQuery {
  page: number;
  limit: number;
  q?: string;
  status?: FarmerStoryStatus;
}

export interface StoriesListMeta {
  total: number;
  page: number;
  limit: number;
}

export interface CreateStoryInput {
  title: string;
  body: string;
  images?: string[];
}

export interface UpdateStoryInput {
  title?: string;
  body?: string;
  images?: string[];
  status?: FarmerStoryStatus;
}
