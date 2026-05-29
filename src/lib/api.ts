import { ApiError, type ApiEnvelope, type AuthTokens } from '@/types/api';
import { tokenStore } from './token-store';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://buydesi-alb-1497579380.ap-south-1.elb.amazonaws.com/api/v1').replace(
  /\/+$/,
  '',
);

interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown;
  /** Headers passed straight through, merged with defaults. */
  headers?: Record<string, string>;
  /** Skip auto-attaching the Authorization header (used for login/refresh). */
  skipAuth?: boolean;
  /** Skip the 401 auto-refresh dance (used inside refresh itself). */
  skipRefresh?: boolean;
}

// Single-flight refresh: many concurrent 401s should produce one /auth/refresh.
let inflightRefresh: Promise<AuthTokens | null> | null = null;

const refreshTokens = async (): Promise<AuthTokens | null> => {
  if (inflightRefresh) return inflightRefresh;
  const refreshToken = tokenStore.refresh;
  if (!refreshToken) return null;
  inflightRefresh = (async () => {
    try {
      const fresh = await request<AuthTokens>('/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
        skipAuth: true,
        skipRefresh: true,
      });
      tokenStore.setTokens(fresh);
      return fresh;
    } catch {
      tokenStore.clear();
      return null;
    } finally {
      inflightRefresh = null;
    }
  })();
  return inflightRefresh;
};

const buildHeaders = (opts: RequestOptions): Headers => {
  const headers = new Headers(opts.headers ?? {});
  if (opts.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!opts.skipAuth) {
    const tok = tokenStore.access;
    if (tok) headers.set('Authorization', `Bearer ${tok}`);
  }
  return headers;
};

interface FetchResult<T> {
  data: T;
  meta?: Record<string, unknown>;
  requestId?: string;
}

/**
 * Returns the full envelope (data + meta + requestId). Use this for paginated
 * endpoints where you need `meta.total`. `request<T>` unwraps to data for
 * everything else.
 */
export const fetchEnvelope = async <T>(
  path: string,
  opts: RequestOptions = {},
): Promise<FetchResult<T>> => {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const init: RequestInit = {
    ...opts,
    headers: buildHeaders(opts),
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  };

  let res = await fetch(url, init);

  if (res.status === 401 && !opts.skipRefresh && !opts.skipAuth) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      const retryInit: RequestInit = {
        ...opts,
        headers: buildHeaders(opts),
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      };
      res = await fetch(url, retryInit);
    }
  }

  const text = await res.text();
  const payload = text ? (JSON.parse(text) as ApiEnvelope<T> | Partial<{ message: string; code: string; details: unknown; requestId: string }>) : null;

  if (!res.ok) {
    const body = (payload ?? {}) as Partial<{ message: string; code: string; details: unknown; requestId: string }>;
    throw new ApiError(res.status, {
      message: body.message ?? `Request failed (${res.status})`,
      code: body.code,
      details: body.details,
      requestId: body.requestId,
    });
  }

  const envelope = payload as ApiEnvelope<T>;
  return { data: envelope.data, meta: envelope.meta, requestId: envelope.requestId };
};

export const request = async <T>(path: string, opts: RequestOptions = {}): Promise<T> => {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const init: RequestInit = {
    ...opts,
    headers: buildHeaders(opts),
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  };

  let res = await fetch(url, init);

  if (res.status === 401 && !opts.skipRefresh && !opts.skipAuth) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      // Re-issue with the fresh access token. The headers were already built
      // before refresh, so rebuild them to pick up the new bearer.
      const retryInit: RequestInit = {
        ...opts,
        headers: buildHeaders(opts),
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      };
      res = await fetch(url, retryInit);
    }
  }

  // 204 / empty body.
  if (res.status === 204) return undefined as T;

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ApiError(res.status, {
        message: `Invalid JSON response (status ${res.status})`,
      });
    }
  }

  if (!res.ok) {
    const body = (payload ?? {}) as Partial<{
      message: string;
      code: string;
      details: unknown;
      requestId: string;
    }>;
    throw new ApiError(res.status, {
      message: body.message ?? `Request failed (${res.status})`,
      code: body.code,
      details: body.details,
      requestId: body.requestId,
    });
  }

  const envelope = payload as ApiEnvelope<T>;
  return envelope.data;
};

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};
