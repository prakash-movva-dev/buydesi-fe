import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { CustomBreadcrumbs } from '@/components/custom-breadcrumbs';

/** Segments whose Title Case guess would read badly. */
const SEGMENT_LABELS: Record<string, string> = {
  admin: 'Dashboard',
  seller: 'Dashboard',
  promoter: 'Dashboard',
  support: 'Support',
  kyc: 'KYC',
  sla: 'SLA',
  gst: 'GST',
  csv: 'CSV',
  cod: 'COD',
  faq: 'FAQ',
  sub: 'Sub',
  new: 'New',
};

/** Ids never make readable crumbs — the page title covers that spot. */
const isIdSegment = (s: string): boolean =>
  /^[0-9a-f]{24}$/i.test(s) || /^\d+$/.test(s) || /^[0-9a-f-]{36}$/i.test(s);

const humanise = (segment: string): string =>
  SEGMENT_LABELS[segment] ??
  segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned action area (buttons, etc.). */
  action?: ReactNode;
  /**
   * Override the derived trail when the URL does not describe the journey,
   * e.g. a detail page reached from somewhere other than its own list.
   */
  links?: { name: string; href?: string }[];
  /** Opt out for the few screens that are their own root (login, 404…). */
  hideBreadcrumbs?: boolean;
}

/**
 * Standard back-office page header: breadcrumbs derived from the route, the
 * page title, an optional description, and an action slot on the right.
 *
 * The trail comes from the URL so every page gets one without repeating it —
 * `/admin/support/:id` becomes Dashboard / Support / <title>. Id segments are
 * dropped because the page title already names the record.
 */
export const PageHeader = ({
  title,
  description,
  action,
  links,
  hideBreadcrumbs,
}: PageHeaderProps) => {
  const location = useLocation();

  const derived = (() => {
    if (links) return links;
    const segments = location.pathname.split('/').filter(Boolean);
    const crumbs: { name: string; href?: string }[] = [];
    let href = '';
    segments.forEach((segment, i) => {
      href += `/${segment}`;
      if (isIdSegment(segment)) return;
      // The final segment is the page itself — the title stands in for it.
      if (i === segments.length - 1) return;
      crumbs.push({ name: humanise(segment), href });
    });
    crumbs.push({ name: typeof title === 'string' ? title : 'Details' });
    return crumbs;
  })();

  return (
    <Box>
      {!hideBreadcrumbs && derived.length > 1 && (
        <CustomBreadcrumbs
          heading={typeof title === 'string' ? title : undefined}
          links={derived}
          action={action}
          sx={{ mb: description ? 1 : 0 }}
        />
      )}

      {/* Without breadcrumbs the header still needs its title and action row. */}
      {(hideBreadcrumbs || derived.length <= 1) && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 2,
            mb: description ? 1 : 0,
          }}
        >
          <Typography variant="h4" component="h1">
            {title}
          </Typography>
          {action && <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0 }}>{action}</Box>}
        </Box>
      )}

      {description && (
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 720 }}>
          {description}
        </Typography>
      )}
    </Box>
  );
};
