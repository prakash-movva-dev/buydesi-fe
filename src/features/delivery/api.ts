import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DeliveryQuote, DeliveryQuoteInput, TrackingResult } from './types';

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
      });
      return api.get<DeliveryQuote>(`/delivery/rates?${params.toString()}`);
    },
  });

export const useCreateShipment = () =>
  useMutation({
    mutationFn: (orderId: string) =>
      api.post<{ shipmentId: string; trackingUrl: string | null; status: string }>(
        '/delivery/create-shipment',
        { orderId },
      ),
  });
