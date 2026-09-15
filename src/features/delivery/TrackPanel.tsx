import { useState, type FormEvent } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';
import Timeline from '@mui/lab/Timeline';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineItem, { timelineItemClasses } from '@mui/lab/TimelineItem';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { EmptyContent } from '@/components/empty-content';

import { fDateTime } from '@/utils/format-time';
import { ApiError } from '@/types/api';

import { useTrackShipment } from './api';
import {
  SHIPMENT_DOT_COLOR,
  SHIPMENT_ICON,
  SHIPMENT_LABEL,
  ShipmentStatusBadge,
} from './status-badge';

// ----------------------------------------------------------------------

/**
 * Where a parcel is, by waybill. The carrier's own scans are the record, so
 * they are shown as a timeline in the order they happened rather than a table.
 */
export function TrackPanel() {
  const [awb, setAwb] = useState('');
  const track = useTrackShipment();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!awb.trim()) return;
    track.mutate(awb.trim());
  };

  const result = track.data;
  const errorMsg =
    track.error instanceof ApiError
      ? track.error.message
      : track.isError
        ? 'Could not reach the carrier'
        : null;

  return (
    <Stack spacing={3} sx={{ p: 3 }}>
      <Stack
        component="form"
        onSubmit={onSubmit}
        spacing={2}
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
      >
        <TextField
          fullWidth
          label="Waybill / AWB number"
          value={awb}
          onChange={(e) => setAwb(e.target.value)}
          placeholder="The number the carrier gave for the parcel"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="solar:magnifer-bold" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
        <LoadingButton
          type="submit"
          variant="contained"
          size="large"
          loading={track.isPending}
          disabled={!awb.trim()}
          sx={{ flexShrink: 0 }}
        >
          Track
        </LoadingButton>
      </Stack>

      {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

      {!result && !errorMsg && !track.isPending && (
        <EmptyContent
          filled
          sx={{ py: 8 }}
          title="Nothing looked up yet"
          description="Enter a waybill to pull the carrier's scans for that parcel."
        />
      )}

      {result && !track.isPending && (
        <Stack spacing={2.5}>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
          >
            <ShipmentStatusBadge status={result.status} />
            <Box component="span" sx={{ typography: 'subtitle2', fontFamily: 'monospace' }}>
              {result.awbNumber ?? result.shipmentId}
            </Box>
            {result.rawStatus && (
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                carrier says “{result.rawStatus}”
              </Typography>
            )}
            {result.known === false && (
              <Label variant="soft" color="default">
                Not booked here
              </Label>
            )}
            {result.trackingUrl && (
              <Link
                href={result.trackingUrl}
                target="_blank"
                rel="noreferrer"
                variant="body2"
                sx={{ ml: 'auto', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
              >
                Carrier page
                <Iconify icon="eva:external-link-fill" width={16} />
              </Link>
            )}
          </Stack>

          <Divider sx={{ borderStyle: 'dashed' }} />

          {result.events.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              The carrier has the parcel on file but has not scanned it yet.
            </Typography>
          ) : (
            <Timeline
              sx={{ p: 0, m: 0, [`& .${timelineItemClasses.root}:before`]: { flex: 0, p: 0 } }}
            >
              {result.events.map((event, index) => (
                <TimelineItem key={index}>
                  <TimelineSeparator>
                    <TimelineDot color={SHIPMENT_DOT_COLOR[event.status] ?? 'grey'}>
                      <Iconify
                        icon={SHIPMENT_ICON[event.status] ?? 'solar:delivery-bold'}
                        width={16}
                      />
                    </TimelineDot>
                    {index !== result.events.length - 1 && <TimelineConnector />}
                  </TimelineSeparator>

                  <TimelineContent sx={{ pb: 3 }}>
                    <Typography variant="subtitle2">
                      {SHIPMENT_LABEL[event.status] ?? event.status}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      {fDateTime(event.at)}
                    </Typography>
                    {event.remarks && (
                      <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                        {event.remarks}
                      </Typography>
                    )}
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          )}
        </Stack>
      )}
    </Stack>
  );
}
