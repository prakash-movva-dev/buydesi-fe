import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { orderKeys } from '@/features/orders/api';
import type { OrderStatus, SafeOrder } from '@/features/orders/types';

interface TransitionInput {
  id: string;
  status: Exclude<OrderStatus, 'PLACED' | 'CANCELLED'>;
  notes?: string;
  delhiveryShipmentId?: string;
  trackingUrl?: string;
}

export const useTransitionOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes, delhiveryShipmentId, trackingUrl }: TransitionInput) =>
      api.put<SafeOrder>(`/orders/${id}/status`, {
        status,
        notes,
        delhiveryShipmentId,
        trackingUrl,
      }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: orderKeys.all });
      qc.invalidateQueries({ queryKey: orderKeys.detail(v.id) });
    },
  });
};
