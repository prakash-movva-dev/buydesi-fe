import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CartLimit, CartLimitWriteInput } from './types';

export const cartLimitKeys = {
  all: ['cart-limits'] as const,
};

export const useCartLimitsList = () =>
  useQuery({
    queryKey: cartLimitKeys.all,
    queryFn: () => api.get<CartLimit[]>('/admin/cart-limits'),
  });

export const useUpsertCartLimit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CartLimitWriteInput) => api.put<CartLimit>('/admin/cart-limits', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: cartLimitKeys.all }),
  });
};
