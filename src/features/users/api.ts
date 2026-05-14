import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import type {
  AdminCreateUserInput,
  SafeUser,
  UserStatus,
  UsersListMeta,
  UsersListQuery,
} from './types';

export const userKeys = {
  all: ['users'] as const,
  list: (q: UsersListQuery) => ['users', 'list', q] as const,
  detail: (id: string) => ['users', 'detail', id] as const,
};

interface ListResult {
  items: SafeUser[];
  meta: UsersListMeta;
}

const fetchList = async (q: UsersListQuery): Promise<ListResult> => {
  const params = new URLSearchParams();
  if (q.role) params.set('role', q.role);
  if (q.status) params.set('status', q.status);
  if (q.clusterId) params.set('clusterId', q.clusterId);
  if (q.q) params.set('q', q.q);
  params.set('page', String(q.page));
  params.set('limit', String(q.limit));
  const { data, meta } = await fetchEnvelope<SafeUser[]>(`/users?${params.toString()}`);
  return {
    items: data,
    meta:
      (meta as UsersListMeta | undefined) ?? {
        total: data.length,
        page: q.page,
        limit: q.limit,
      },
  };
};

export const useUsersList = (q: UsersListQuery) =>
  useQuery({ queryKey: userKeys.list(q), queryFn: () => fetchList(q) });

export const useUser = (id: string | undefined) =>
  useQuery({
    queryKey: id ? userKeys.detail(id) : ['users', 'detail', 'none'],
    queryFn: () => api.get<SafeUser>(`/users/${id}`),
    enabled: Boolean(id),
  });

export const useUpdateUserStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: UserStatus;
      reason?: string;
    }) => api.put<SafeUser>(`/users/${id}/status`, { status, reason }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: userKeys.all });
      qc.invalidateQueries({ queryKey: userKeys.detail(vars.id) });
    },
  });
};

export const useAdminCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminCreateUserInput) => api.post<SafeUser>('/users', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
};
