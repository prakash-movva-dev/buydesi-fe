import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import Grid from '@mui/material/Unstable_Grid2';

import { varAlpha } from '@/theme/styles';

import { Label } from '@/components/label';
import { toast } from '@/components/snackbar';
import { Iconify } from '@/components/iconify';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingScreen } from '@/components/loading-screen';
import { EmptyContent } from '@/components/empty-content';

import { fNumber } from '@/utils/format-number';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

import { useMyCoupons, useMyLinks, useUpdateLink } from '@/features/affiliates/api';
import { TARGET_ICON, TARGET_LABEL } from '@/features/affiliates/status-badge';
import type { AffiliateLink } from '@/features/affiliates/types';

import { LinkBuilderDialog } from './LinkBuilderDialog';
import { MESSAGE_TEMPLATES, renderTemplate, shareUrl, whatsAppLink } from './helpers';

// ----------------------------------------------------------------------

/**
 * The affiliate's own links, and the message to send with them.
 *
 * This is the page they open most, so the two things they came to do — copy a
 * link, send it on WhatsApp — are one tap each, in their own language.
 */
export const MyLinksPage = () => {
  const { data: links, isLoading, isError, error } = useMyLinks();
  const { data: coupons } = useMyCoupons();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [locale, setLocale] = useState('en');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const { copy } = useCopyToClipboard();
  const updateLink = useUpdateLink();

  const activeLinks = useMemo(() => (links ?? []).filter((l) => l.active), [links]);
  const code = selectedCode ?? activeLinks[0]?.code ?? null;
  const template = MESSAGE_TEMPLATES.find((t) => t.locale === locale) ?? MESSAGE_TEMPLATES[0];
  const message = code ? renderTemplate(template.template, code, shareUrl(code)) : '';

  const copyIt = async (value: string, what: string) => {
    await copy(value);
    toast.success(`${what} copied`);
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="Share links"
        description="Every sale made through one of your links earns you commission. Make as many as you like — one per group, one per market, one per product."
        action={
          <Button
            variant="contained"
            onClick={() => setBuilderOpen(true)}
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New link
          </Button>
        }
      />

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Could not load your links'}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid xs={12} md={7}>
          <Stack spacing={2}>
            {(links?.length ?? 0) === 0 ? (
              <Card>
                <EmptyContent
                  filled
                  sx={{ py: 8 }}
                  title="No links yet"
                  description="Make one with a code people can remember, then share it."
                />
              </Card>
            ) : (
              (links ?? []).map((link) => (
                <LinkCard
                  key={link._id}
                  link={link}
                  selected={link.code === code}
                  onSelect={() => setSelectedCode(link.code)}
                  onCopy={() => copyIt(shareUrl(link.code), 'Link')}
                  onToggle={() =>
                    updateLink.mutate(
                      { linkId: link._id, active: !link.active },
                      {
                        onSuccess: () =>
                          toast.success(link.active ? 'Link switched off' : 'Link switched on'),
                      },
                    )
                  }
                />
              ))
            )}

            {(coupons?.length ?? 0) > 0 && (
              <Card sx={{ p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Iconify icon="solar:ticket-bold" width={20} sx={{ color: 'warning.main' }} />
                  <Typography variant="subtitle1">Discount codes you can give out</Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  These take money off the buyer&apos;s order and still count the sale as yours —
                  handy when you are talking to someone in person.
                </Typography>
                <Stack spacing={1.5}>
                  {(coupons ?? []).map((coupon) => (
                    <Stack
                      key={coupon._id}
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: 'background.neutral',
                      }}
                    >
                      <Box sx={{ typography: 'subtitle2', fontFamily: 'monospace', flexGrow: 1 }}>
                        {coupon.code}
                      </Box>
                      <Label variant="soft" color="warning">
                        {coupon.discountType === 'percent'
                          ? `${coupon.discountValue}% off`
                          : `₹${coupon.discountValue} off`}
                      </Label>
                      <Tooltip title="Copy code">
                        <IconButton size="small" onClick={() => copyIt(coupon.code, 'Code')}>
                          <Iconify icon="solar:copy-bold" width={16} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  ))}
                </Stack>
              </Card>
            )}
          </Stack>
        </Grid>

        <Grid xs={12} md={5}>
          <Card sx={{ p: 3, position: { md: 'sticky' }, top: { md: 24 } }}>
            <Typography variant="subtitle1">Send it</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 2.5 }}>
              Pick a language and send. The link is already in the message.
            </Typography>

            {!code ? (
              <Alert severity="info" variant="outlined">
                Make a link first and the message will be ready here.
              </Alert>
            ) : (
              <Stack spacing={2}>
                <FormControl fullWidth>
                  <InputLabel htmlFor="share-language">Language</InputLabel>
                  <Select
                    value={locale}
                    onChange={(e) => setLocale(e.target.value)}
                    input={<OutlinedInput label="Language" />}
                    inputProps={{ id: 'share-language' }}
                    MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
                  >
                    {MESSAGE_TEMPLATES.map((t) => (
                      <MenuItem key={t.locale} value={t.locale}>
                        {t.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {activeLinks.length > 1 && (
                  <FormControl fullWidth>
                    <InputLabel htmlFor="share-code">Link</InputLabel>
                    <Select
                      value={code}
                      onChange={(e) => setSelectedCode(e.target.value)}
                      input={<OutlinedInput label="Link" />}
                      inputProps={{ id: 'share-code' }}
                    >
                      {activeLinks.map((l) => (
                        <MenuItem key={l._id} value={l.code}>
                          {l.code}
                          {l.label ? ` — ${l.label}` : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <TextField fullWidth multiline minRows={4} value={message} InputProps={{ readOnly: true }} />

                <Stack direction="row" spacing={1.5}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    href={whatsAppLink(message)}
                    target="_blank"
                    rel="noreferrer"
                    startIcon={<Iconify icon="ic:baseline-whatsapp" />}
                  >
                    WhatsApp
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => copyIt(message, 'Message')}
                    startIcon={<Iconify icon="solar:copy-bold" />}
                  >
                    Copy
                  </Button>
                </Stack>

                <Divider sx={{ borderStyle: 'dashed' }} />

                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{
                      flexGrow: 1,
                      typography: 'caption',
                      fontFamily: 'monospace',
                      color: 'text.secondary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {shareUrl(code)}
                  </Box>
                  <Tooltip title="Copy just the link">
                    <IconButton size="small" onClick={() => copyIt(shareUrl(code), 'Link')}>
                      <Iconify icon="solar:copy-bold" width={16} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            )}
          </Card>
        </Grid>
      </Grid>

      <LinkBuilderDialog open={builderOpen} onClose={() => setBuilderOpen(false)} />
    </>
  );
};

// ----------------------------------------------------------------------

function LinkCard({
  link,
  selected,
  onSelect,
  onCopy,
  onToggle,
}: {
  link: AffiliateLink;
  selected: boolean;
  onSelect: () => void;
  onCopy: () => void;
  onToggle: () => void;
}) {
  const conversion = link.clickCount === 0 ? 0 : (link.conversionCount / link.clickCount) * 100;

  return (
    <Card
      onClick={onSelect}
      sx={{
        p: 2.5,
        cursor: 'pointer',
        transition: (theme) => theme.transitions.create(['box-shadow', 'border-color']),
        border: (theme) =>
          `solid 1px ${
            selected
              ? theme.vars.palette.primary.main
              : varAlpha(theme.vars.palette.grey['500Channel'], 0.16)
          }`,
        ...(!link.active && { opacity: 0.64 }),
      }}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Stack spacing={0.5} sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle1" sx={{ fontFamily: 'monospace' }}>
              {link.code}
            </Typography>
            <Label
              variant="soft"
              startIcon={<Iconify icon={TARGET_ICON[link.targetType]} />}
            >
              {TARGET_LABEL[link.targetType]}
            </Label>
            {!link.active && (
              <Label variant="soft" color="default">
                Switched off
              </Label>
            )}
          </Stack>
          {link.label && (
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {link.label}
            </Typography>
          )}
          <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              <strong>{fNumber(link.clickCount)}</strong> click
              {link.clickCount === 1 ? '' : 's'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              <strong>{fNumber(link.conversionCount)}</strong> order
              {link.conversionCount === 1 ? '' : 's'}
            </Typography>
            {link.clickCount > 0 && (
              <Typography
                variant="caption"
                sx={{ color: conversion >= 5 ? 'success.dark' : 'text.disabled' }}
              >
                {conversion.toFixed(conversion >= 10 ? 0 : 1)}% buy
              </Typography>
            )}
          </Stack>
        </Stack>

        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          <Tooltip title="Copy link">
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
            >
              <Iconify icon="solar:copy-bold" />
            </IconButton>
          </Tooltip>
          <Tooltip title={link.active ? 'Switch off' : 'Switch on'}>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              <Iconify icon={link.active ? 'solar:pause-bold' : 'solar:play-bold'} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Card>
  );
}
