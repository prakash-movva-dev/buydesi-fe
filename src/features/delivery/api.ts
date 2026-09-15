import { useMutation, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

import type {
  CreatedShipment,
  DeliveryProviderStatus,
  DeliveryQuote,
  DeliveryQuoteInput,
  PincodeServiceability,
  TrackingResult,
} from './types';

export const deliveryKeys = {
  provider: ['delivery', 'provider'] as const,
};

/**
 * What is wired up right now. Cached for the session — the answer only changes
 * when someone edits settings or redeploys.
 */
export const useProviderStatus = () =>
  useQuery({
    queryKey: deliveryKeys.provider,
    queryFn: () => api.get<DeliveryProviderStatus>('/delivery/provider'),
    staleTime: 5 * 60 * 1000,
  });

export const useTrackShipment = () =>
  useMutation({
    mutationFn: (shipmentId: string) =>
      api.get<TrackingResult>(`/delivery/track/${encodeURIComponent(shipmentId)}`),
  });

export const useQuoteRate = () =>
  useMutation({
    mutationFn: (input: DeliveryQuoteInput) => {
      const params = new URLSearchParams({
        pickupPincode: input.pickupPincode,
        dropPincode: input.dropPincode,
        weightGrams: String(input.weightGrams),
        paymentMode: input.paymentMode,
        declaredValueInr: String(input.declaredValueInr),
        serviceMode: input.serviceMode,
      });
      return api.get<DeliveryQuote>(`/delivery/rates?${params.toString()}`);
    },
  });

export const useCheckPincode = () =>
  useMutation({
    mutationFn: (pincode: string) =>
      api.get<PincodeServiceability>(
        `/delivery/serviceability/${encodeURIComponent(pincode)}`,
      ),
  });

export const useCreateShipment = () =>
  useMutation({
    mutationFn: (orderId: string) =>
      api.post<CreatedShipment>('/delivery/create-shipment', { orderId }),
  });
