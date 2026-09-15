import { Label } from '@/components/label';

import type { ShipmentStatus } from './types';

// ----------------------------------------------------------------------

export const SHIPMENT_COLOR: Record<
  ShipmentStatus,
  'info' | 'warning' | 'success' | 'error' | 'default'
> = {
  CREATED: 'info',
  PICKED_UP: 'info',
  IN_TRANSIT: 'warning',
  OUT_FOR_DELIVERY: 'warning',
  DELIVERED: 'success',
  RETURNED: 'error',
  FAILED: 'error',
};

export const SHIPMENT_LABEL: Record<ShipmentStatus, string> = {
  CREATED: 'Created',
  PICKED_UP: 'Picked up',
  IN_TRANSIT: 'In transit',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  RETURNED: 'Returned',
  FAILED: 'Failed',
};

/** Each stage gets its own glyph, so a column of scans scans by shape. */
export const SHIPMENT_ICON: Record<ShipmentStatus, string> = {
  CREATED: 'solar:file-text-bold',
  PICKED_UP: 'solar:box-bold',
  IN_TRANSIT: 'solar:delivery-bold',
  OUT_FOR_DELIVERY: 'solar:scooter-bold',
  DELIVERED: 'solar:check-circle-bold',
  RETURNED: 'solar:restart-bold',
  FAILED: 'solar:danger-triangle-bold',
};

/** The same mapping in TimelineDot's palette, which has no "default". */
export const SHIPMENT_DOT_COLOR: Record<
  ShipmentStatus,
  'info' | 'warning' | 'success' | 'error' | 'grey'
> = {
  CREATED: 'info',
  PICKED_UP: 'info',
  IN_TRANSIT: 'warning',
  OUT_FOR_DELIVERY: 'warning',
  DELIVERED: 'success',
  RETURNED: 'error',
  FAILED: 'error',
};

export const ShipmentStatusBadge = ({ status }: { status: ShipmentStatus }) => (
  <Label variant="soft" color={SHIPMENT_COLOR[status] ?? 'default'}>
    {SHIPMENT_LABEL[status] ?? status}
  </Label>
);
