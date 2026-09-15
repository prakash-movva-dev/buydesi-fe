import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Timeline from '@mui/lab/Timeline';
import TimelineDot from '@mui/lab/TimelineDot';
import CardHeader from '@mui/material/CardHeader';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineItem, { timelineItemClasses } from '@mui/lab/TimelineItem';
import Typography from '@mui/material/Typography';

import { Iconify } from '@/components/iconify';
import { fDateTime } from '@/utils/format-time';
import type { ActivityLogEntry } from '@/features/activity/types';

// ----------------------------------------------------------------------

/** The dot's colour says what kind of change it was, without reading the verb. */
const dotColour = (action: string): 'primary' | 'success' | 'warning' | 'error' | 'info' => {
  if (/delete|remove|reject|suspend|cancel/i.test(action)) return 'error';
  if (/approve|complete|activate|live|verify/i.test(action)) return 'success';
  if (/create|register|add/i.test(action)) return 'primary';
  if (/update|edit|adjust|change/i.test(action)) return 'warning';
  return 'info';
};

/** `admin.sellers.approve` reads better as "Sellers approve". */
const humanise = (action: string): string => {
  const parts = action.split(/[.:_/]/).filter(Boolean);
  const words = (parts.length > 1 ? parts.slice(1) : parts).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

type Props = {
  entries: ActivityLogEntry[];
  loading?: boolean;
  error?: string | null;
  onSeeAll: () => void;
};

export function RecentActivityCard({ entries, loading, error, onSeeAll }: Props) {
  return (
    <Card sx={{ height: 1 }}>
      <CardHeader
        title="Recent activity"
        subheader="The latest admin changes across the platform"
      />

      {loading && (
        <Box sx={{ p: 3, display: 'grid', gap: 1.5 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={32} />
          ))}
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ m: 3 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && entries.length === 0 && (
        <Typography
          variant="body2"
          sx={{ p: 5, textAlign: 'center', color: 'text.disabled' }}
        >
          No activity yet.
        </Typography>
      )}

      {!loading && !error && entries.length > 0 && (
        <Timeline
          sx={{
            m: 0,
            p: 3,
            [`& .${timelineItemClasses.root}:before`]: { flex: 0, padding: 0 },
          }}
        >
          {entries.map((entry, index) => {
            const path = typeof entry.metadata?.path === 'string' ? entry.metadata.path : null;

            return (
              <TimelineItem key={entry.id ?? entry._id}>
                <TimelineSeparator>
                  <TimelineDot color={dotColour(entry.action)} />
                  {index !== entries.length - 1 && <TimelineConnector />}
                </TimelineSeparator>

                <TimelineContent>
                  <Typography variant="subtitle2">{humanise(entry.action)}</Typography>
                  <Box sx={{ color: 'text.disabled', typography: 'caption' }}>
                    {entry.actorRole ? `${entry.actorRole} · ` : ''}
                    {fDateTime(entry.at)}
                  </Box>
                  {path && (
                    <Box
                      sx={{
                        color: 'text.disabled',
                        typography: 'caption',
                        fontFamily: 'monospace',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {path}
                    </Box>
                  )}
                </TimelineContent>
              </TimelineItem>
            );
          })}
        </Timeline>
      )}

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Box sx={{ p: 2, textAlign: 'right' }}>
        <Button
          size="small"
          color="inherit"
          onClick={onSeeAll}
          endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={18} sx={{ ml: -0.5 }} />}
        >
          See full log
        </Button>
      </Box>
    </Card>
  );
}
