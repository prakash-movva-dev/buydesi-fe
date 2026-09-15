import { useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';

import { varAlpha } from '@/theme/styles';

import { Iconify } from '@/components/iconify';
import { PageHeader } from '@/components/ui/PageHeader';

import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';

import { useProviderStatus } from './api';
import { TrackPanel } from './TrackPanel';
import { RatePanel } from './RatePanel';
import { PincodePanel } from './PincodePanel';
import { CarrierStatusCard } from './CarrierStatusCard';
import { CreateShipmentPanel } from './CreateShipmentPanel';

// ----------------------------------------------------------------------

type TabValue = 'track' | 'pincode' | 'quote' | 'create';

const TABS: Array<{ value: TabValue; label: string; icon: string }> = [
  { value: 'track', label: 'Track a parcel', icon: 'solar:magnifer-bold' },
  { value: 'pincode', label: 'Pincode check', icon: 'solar:map-point-bold' },
  { value: 'quote', label: 'Rate quote', icon: 'solar:calculator-bold' },
  { value: 'create', label: 'Book a parcel', icon: 'solar:delivery-bold' },
];

// ----------------------------------------------------------------------

/**
 * The carrier desk.
 *
 * Delhivery is the courier that actually moves parcels; this is where staff ask
 * it four things — where a parcel is, whether it goes to a pincode at all, what
 * a lane costs, and please take this order. What the carrier can answer depends
 * on what is configured, so that is stated up front rather than discovered
 * through a failing form.
 */
export const DeliveryPage = () => {
  const [tab, setTab] = useState<TabValue>('track');

  const { data: status } = useProviderStatus();

  return (
    <>
      <PageHeader
        title="Delivery"
        description="Track a parcel, check whether a pincode is serviceable, price a lane, or hand a packed order to the carrier. Returns are collected from the support ticket that agreed them."
      />

      <Box sx={{ mt: 3 }}>
        <ScopedAdminBanner />
      </Box>

      <Box sx={{ mt: 3 }}>
        <CarrierStatusCard status={status} />
      </Box>

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={tab}
          onChange={(_e, value) => setTab(value as TabValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            px: 3,
            boxShadow: (theme) =>
              `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
          }}
        >
          {TABS.map((item) => (
            <Tab
              key={item.value}
              value={item.value}
              label={item.label}
              iconPosition="start"
              icon={<Iconify icon={item.icon} width={20} />}
            />
          ))}
        </Tabs>

        {tab === 'track' && <TrackPanel />}
        {tab === 'pincode' && <PincodePanel />}
        {tab === 'quote' && <RatePanel />}
        {tab === 'create' && <CreateShipmentPanel blocked={status?.blocked.shipments} />}
      </Card>
    </>
  );
};
