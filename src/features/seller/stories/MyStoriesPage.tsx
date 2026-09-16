import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import CardContent from '@mui/material/CardContent';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import TablePagination from '@mui/material/TablePagination';

import { varAlpha } from '@/theme/styles';
import { ApiError } from '@/types/api';

import { Label } from '@/components/label';
import { toast } from '@/components/snackbar';
import { Iconify } from '@/components/iconify';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyContent } from '@/components/empty-content';
import { ConfirmDialog } from '@/components/custom-dialog';

import { AnalyticsWidget } from '@/features/dashboard/AnalyticsWidget';

import { useDeleteStory, useMyStories, useUpdateStory } from './api';
import { StoryComposer } from './StoryComposer';
import type { FarmerStory, FarmerStoryStatus } from './types';

// ----------------------------------------------------------------------

type View = 'all' | FarmerStoryStatus;

const TAB_OPTIONS: Array<{ value: View; label: string; color: 'info' | 'success' | 'default' }> = [
  { value: 'all', label: 'Everything', color: 'info' },
  { value: 'published', label: 'Live', color: 'success' },
  { value: 'hidden', label: 'Hidden', color: 'default' },
];

const PAGE_SIZE = 9;

const fDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

// ----------------------------------------------------------------------

function StoryTile({
  story,
  busy,
  onEdit,
  onToggle,
  onDelete,
  onOpen,
}: {
  story: FarmerStory;
  busy: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const live = story.status === 'published';

  return (
    <Card sx={{ height: 1, display: 'flex', flexDirection: 'column', opacity: live ? 1 : 0.72 }}>
      <Box
        sx={{
          position: 'relative',
          aspectRatio: '16 / 9',
          bgcolor: 'background.neutral',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {story.images[0] ? (
          <Box
            component="img"
            src={story.images[0]}
            alt=""
            sx={{ width: 1, height: 1, objectFit: 'cover' }}
          />
        ) : (
          <Iconify width={36} icon="solar:document-text-bold-duotone" sx={{ opacity: 0.25 }} />
        )}

        <Label
          variant="filled"
          color={live ? 'success' : 'default'}
          sx={{ position: 'absolute', top: 10, left: 10 }}
        >
          {live ? 'Live' : 'Hidden'}
        </Label>

        {story.images.length > 1 && (
          <Label variant="filled" sx={{ position: 'absolute', bottom: 10, right: 10 }}>
            +{story.images.length - 1}
          </Label>
        )}
      </Box>

      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', pb: 1.5 }}>
        <Box sx={{ typography: 'caption', color: 'text.disabled' }}>
          {fDate(story.publishedAt)}
        </Box>

        <Box
          sx={{
            mt: 0.5,
            typography: 'subtitle1',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {story.title}
        </Box>

        <Box
          sx={{
            mt: 1,
            typography: 'body2',
            color: 'text.secondary',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {story.body}
        </Box>

        <Stack direction="row" spacing={2} sx={{ mt: 'auto', pt: 2 }}>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ typography: 'caption', color: 'text.secondary' }}>
            <Iconify width={15} icon="solar:eye-bold" />
            {story.viewCount}
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ typography: 'caption', color: 'text.secondary' }}>
            <Iconify width={15} icon="solar:heart-bold" />
            {story.likeCount}
          </Stack>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="See it on the storefront" placement="top" arrow>
            <span>
              <IconButton size="small" onClick={onOpen} disabled={!live}>
                <Iconify width={17} icon="solar:square-top-down-bold" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Edit" placement="top" arrow>
            <span>
              <IconButton size="small" onClick={onEdit} disabled={busy}>
                <Iconify width={17} icon="solar:pen-bold" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={live ? 'Hide from the storefront' : 'Put it back up'} placement="top" arrow>
            <span>
              <IconButton size="small" onClick={onToggle} disabled={busy}>
                <Iconify width={17} icon={live ? 'solar:eye-closed-bold' : 'solar:eye-bold'} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Delete" placement="top" arrow>
            <span>
              <IconButton size="small" color="error" onClick={onDelete} disabled={busy}>
                <Iconify width={17} icon="solar:trash-bin-trash-bold" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

export const MyStoriesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const view = (searchParams.get('view') as View | null) ?? 'all';
  const q = searchParams.get('q') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const setParams = useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      if (!('page' in next)) params.delete('page');
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const [search, setSearch] = useState(q);

  const query = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      q: q || undefined,
      status: view === 'all' ? undefined : (view as FarmerStoryStatus),
    }),
    [page, q, view],
  );

  const { data, isLoading, isFetching, isError, error } = useMyStories(query);
  const counts = useMyStories({ page: 1, limit: 1 });
  const liveCounts = useMyStories({ page: 1, limit: 1, status: 'published' });
  const hiddenCounts = useMyStories({ page: 1, limit: 1, status: 'hidden' });

  const update = useUpdateStory();
  const remove = useDeleteStory();

  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<FarmerStory | null>(null);
  const [deleting, setDeleting] = useState<FarmerStory | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = data?.items ?? [];
  const total = data?.meta.total ?? 0;

  const countFor = (v: View) =>
    ({ all: counts, published: liveCounts, hidden: hiddenCounts })[v].data?.meta.total ?? 0;

  const allTotal = countFor('all');
  const totalViews = rows.reduce((s, r) => s + r.viewCount, 0);
  const totalLikes = rows.reduce((s, r) => s + r.likeCount, 0);

  const onToggle = async (story: FarmerStory) => {
    setBusyId(story.id);
    try {
      await update.mutateAsync({
        id: story.id,
        patch: { status: story.status === 'published' ? 'hidden' : 'published' },
      });
      toast.success(story.status === 'published' ? 'Hidden from the storefront' : 'Back on the storefront');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not change that');
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await remove.mutateAsync(deleting.id);
      toast.success('Story deleted');
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete that');
    } finally {
      setBusyId(null);
    }
  };

  /** Where the public page lives. Set VITE_STOREFRONT_URL per environment;
   *  the dev default matches the storefront's own launch config. */
  const storefrontBase =
    import.meta.env.VITE_STOREFRONT_URL ?? 'http://localhost:3211';
  const storefrontUrl = (id: string) => `${storefrontBase}/farmer-stories/${id}`;

  return (
    <>
      <PageHeader
        title="My stories"
        description="Write about your work — a harvest, a hard season, how something is made. Posts appear on the storefront the moment you publish them; nobody reviews them first."
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:pen-new-square-bold" />}
            onClick={() => {
              setEditing(null);
              setComposerOpen(true);
            }}
          >
            Write a story
          </Button>
        }
      />

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Failed to load your stories'}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid xs={12} sm={4}>
          <AnalyticsWidget
            title="Stories published"
            total={counts.isLoading ? null : countFor('published')}
            color="success"
            icon={<Iconify width={48} icon="solar:document-text-bold-duotone" />}
          />
        </Grid>
        <Grid xs={12} sm={4}>
          <AnalyticsWidget
            title="Reads on this page"
            total={isLoading ? null : totalViews}
            color="info"
            icon={<Iconify width={48} icon="solar:eye-bold-duotone" />}
          />
        </Grid>
        <Grid xs={12} sm={4}>
          <AnalyticsWidget
            title="Likes on this page"
            total={isLoading ? null : totalLikes}
            color="warning"
            icon={<Iconify width={48} icon="solar:heart-bold-duotone" />}
          />
        </Grid>
      </Grid>

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={view}
          onChange={(_e, value) => setParams({ view: value })}
          sx={{
            px: 2.5,
            boxShadow: (theme) =>
              `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
          }}
        >
          {TAB_OPTIONS.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              iconPosition="end"
              icon={
                <Label variant={view === tab.value ? 'filled' : 'soft'} color={tab.color}>
                  {countFor(tab.value)}
                </Label>
              }
            />
          ))}
        </Tabs>

        <Box sx={{ p: 2.5 }}>
          <TextField
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setParams({ q: search });
            }}
            onBlur={() => setParams({ q: search })}
            placeholder="Search your stories…"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ position: 'relative', px: 2.5, pb: 2.5 }}>
          {isFetching && !isLoading && (
            <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9 }} />
          )}

          {isLoading ? (
            <Grid container spacing={3}>
              {Array.from({ length: 3 }, (_, i) => (
                <Grid key={i} xs={12} sm={6} md={4}>
                  <Skeleton variant="rounded" height={320} />
                </Grid>
              ))}
            </Grid>
          ) : rows.length === 0 ? (
            <EmptyContent
              filled
              title={
                allTotal === 0
                  ? 'You have not written anything yet'
                  : q
                    ? 'Nothing matches that'
                    : 'Nothing here'
              }
              description={
                allTotal === 0
                  ? 'Buyers trust a name and a face far more than a product page. Tell them who you are and how you work — it takes five minutes and goes live straight away.'
                  : 'Try a different word, or switch tabs.'
              }
              action={
                allTotal === 0 ? (
                  <Button
                    variant="contained"
                    sx={{ mt: 2 }}
                    startIcon={<Iconify icon="solar:pen-new-square-bold" />}
                    onClick={() => {
                      setEditing(null);
                      setComposerOpen(true);
                    }}
                  >
                    Write your first story
                  </Button>
                ) : undefined
              }
              sx={{ py: 8 }}
            />
          ) : (
            <Grid container spacing={3}>
              {rows.map((story) => (
                <Grid key={story.id} xs={12} sm={6} md={4}>
                  <StoryTile
                    story={story}
                    busy={busyId === story.id}
                    onEdit={() => {
                      setEditing(story);
                      setComposerOpen(true);
                    }}
                    onToggle={() => onToggle(story)}
                    onDelete={() => setDeleting(story)}
                    onOpen={() => window.open(storefrontUrl(story.id), '_blank', 'noopener')}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        {total > PAGE_SIZE && (
          <TablePagination
            component="div"
            count={total}
            page={page - 1}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
            onPageChange={(_e, next) => setParams({ page: String(next + 1) })}
          />
        )}
      </Card>

      <StoryComposer
        open={composerOpen}
        editing={editing}
        onClose={() => setComposerOpen(false)}
        onDone={(published) =>
          toast.success(published ? 'Published — it is live now' : 'Story updated')
        }
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this story?"
        content={
          <>
            <strong>{deleting?.title}</strong> is removed from the storefront for good, along
            with its {deleting?.likeCount ?? 0} like
            {deleting?.likeCount === 1 ? '' : 's'}. If you only want it off the page for now,
            hide it instead.
          </>
        }
        action={
          <Button variant="contained" color="error" onClick={onDelete} disabled={remove.isPending}>
            Delete
          </Button>
        }
      />
    </>
  );
};
