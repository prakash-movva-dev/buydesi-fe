// Mirrors backend `src/modules/users/users.types.ts`.

import type { UserRole } from '@/types/api';

export type UserStatus = 'active' | 'pending' | 'suspended';

export interface SafeUser {
  id: string;
  role: UserRole;
  name: string;
  email?: string;
  mobile?: string;
  preferredLanguage: string;
  status: UserStatus;
  clusterId?: string;
  zone?: string;
  category?: string;
  emailVerifiedAt: string | null;
  mobileVerifiedAt: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UsersListQuery {
  role?: UserRole;
  status?: UserStatus;
  clusterId?: string;
  q?: string;
  page: number;
  limit: number;
}

export interface AdminCreateUserInput {
  name: string;
  email?: string;
  mobile?: string;
  password: string;
  role: UserRole;
  clusterId?: string;
  category?: string;
  zone?: string;
  preferredLanguage?: string;
}

export interface UsersListMeta {
  total: number;
  page: number;
  limit: number;
}
