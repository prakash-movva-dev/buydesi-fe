// Mirrors backend `src/utils/constants.ts`.
export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SUB_SUPER_ADMIN: 'SUB_SUPER_ADMIN',
  REGIONAL_ADMIN: 'REGIONAL_ADMIN',
  CATEGORY_ADMIN: 'CATEGORY_ADMIN',
  SUPPORT_ADMIN: 'SUPPORT_ADMIN',
  SELLER: 'SELLER',
  BUYER: 'BUYER',
  PROMOTER: 'PROMOTER',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ADMIN_ROLES: ReadonlySet<UserRole> = new Set([
  UserRole.SUPER_ADMIN,
  UserRole.SUB_SUPER_ADMIN,
  UserRole.REGIONAL_ADMIN,
  UserRole.CATEGORY_ADMIN,
  UserRole.SUPPORT_ADMIN,
]);

export type UserStatus = 'active' | 'pending' | 'suspended';

/** Matches the backend's `SafeUser` shape returned by `toSafeJSON()`. */
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
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

export interface AuthSession {
  user: SafeUser;
  tokens: AuthTokens;
}

/** Backend ApiResponse envelope. */
export interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
  requestId?: string;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  code?: string;
  details?: unknown;
  requestId?: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  requestId?: string;

  constructor(status: number, body: Partial<ApiErrorBody> & { message: string }) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
    this.requestId = body.requestId;
  }
}
