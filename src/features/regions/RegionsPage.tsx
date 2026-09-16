import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Grid from '@mui/material/Unstable_Grid2';
import LoadingButton from '@mui/lab/LoadingButton';

import { varAlpha } from '@/theme/styles';

import { useAuth } from '@/lib/auth';
import { ApiError, UserRole } from '@/types/api';
import { Label } from '@/components/label';
import { toast } from '@/components/snackbar';
import { Iconify } from '@/components/iconify';
import { Scrollbar } from '@/components/scrollbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { DateField } from '@/components/ui/DateField';
import { LoadingScreen } from '@/components/loading-screen';
import { EmptyContent } from '@/components/empty-content';
import { TableHeadCustom } from '@/components/table';

import { fCurrency, fNumber } from '@/utils/format-number';
import { useClustersList } from '@/features/clusters/api';
import { useUsersList } from '@/features/users/api';

import {
  downloadRegionPerformanceCsv,
  useDeleteRegion,
  useRegionPerformance,
  useRegionsList,
} from './api';
import { RegionFormDialog } from './RegionFormDialog';
import type { SafeRegion } from './types';

// ----------------------------------------------------------------------

const REGION_HEAD = [
  { id: 'name', label: 'Region' },
  { id: 'admin', label: 'Regional admin', width: 200 },
  { id: 'clusters', label: 'Clusters', width: 260 },
  { id: 'count', label: 'How many', align: 'right' as const, width: 110 },
  { id: '', width: 100 },
];

const PERF_HEAD = [
  { id: 'cluster', label: 'Cluster' },
  { id: 'sellers', label: 'Sellers', align: 'right' as const, width: 100 },
  { id: 'listings', label: 'Live listings', align: 'right' as const, width: 130 },
  { id: 'orders', label: 'Orders', align: 'right' as const, width: 100 },
  { id: 'revenue', label: 'Revenue', align: 'right' as const, width: 140 },
  { id: 'tickets', label: 'Open tickets', align: 'right' as const, width: 130 },
];

/** The last thirty days — the window most oversight questions are about. */
const defaultRange = () => {
  const to = new Date();
  const from = new Date(to.getTime() - 29 * 86_400_000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
};

type TabValue = 'regions' | 'performance';

// ----------------------------------------------------------------------

/**
 * Regions group clusters for oversight.
 *
 * A region has no PIN codes and no sellers of its own — it exists so a regional
 * admin can watch several clusters at once, which is why the list leads with
 * who oversees it and which clusters roll up into it.
 */
export const RegionsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tab, setTab] = useState<TabValue>('regions');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SafeRegion | null>(null);
  const [deleting, setDeleting] = useState<SafeRegion | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [range, setRange] = useState(defaultRange);

  const isSuper =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;

  const { data: regions, isLoading, isError, error } = useRegionsList();
  const { data: clusters } = useClustersList({ page: 1, limit: 100 });
  const { data: regionalAdmins } = useUsersList({
    role: UserRole.REGIONAL_ADMIN,
    page: 1,
    limit: 100,
  });

  const regionId = selectedRegion || regions?.[0]?.id || '';
  const performance = useRegionPerformance(
    regionId,
    { from: `${range.from}T00:00:00.000Z`, to: `${range.to}T23:59:59.999Z` },
    tab === 'performance' && Boolean(regionId),
  );

  const adminByRegion = useMemo(
    () =>
      new Map(
        (regionalAdmins?.items ?? [])
          .filter((u) => u.regionId)
          .map((u) => [u.regionId as string, u.name]),
      ),
    [regionalAdmins],
  );

  if (isLoading) return <LoadingScreen />;

  const rows = regions ?? [];
  const totals = performance.data?.totals;

  return (
    <>
      <PageHeader
        title="Regions"
        description="Groups of clusters, so one regional admin can oversee several at once. A region holds no sellers of its own."
        action={
          isSuper ? (
            <Button
              variant="contained"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              New region
            </Button>
          ) : undefined
        }
      />

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Could not load regions'}
        </Alert>
      )}

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={tab}
          onChange={(_e, value) => setTab(value as TabValue)}
          sx={{
            px: 2.5,
            boxShadow: (theme) =>
              `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
          }}
        >
          <Tab
            value="regions"
            iconPosition="end"
            label="Regions"
            icon={<Label variant={tab === 'regions' ? 'filled' : 'soft'}>{rows.length}</Label>}
          />
          <Tab value="performance" label="How a region is doing" />
        </Tabs>

        {tab === 'regions' && (
          <Scrollbar>
            {rows.length === 0 ? (
              <EmptyContent
                filled
                sx={{ m: 3, py: 8 }}
                title="No regions yet"
                description="Create one and point clusters at it from each cluster's own page."
              />
            ) : (
              <Table sx={{ minWidth: 900 }}>
                <TableHeadCustom headLabel={REGION_HEAD} />
                <TableBody>
                  {rows.map((region) => {
                    const members = (clusters?.items ?? []).filter(
                      (c) => c.regionId === region.id,
                    );
                    const adminName = adminByRegion.get(region.id);
                    return (
                      <TableRow key={region.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar
                              variant="rounded"
                              sx={{
                                width: 44,
                                height: 44,
                                bgcolor: 'background.neutral',
                                color: 'text.secondary',
                              }}
                            >
                              <Iconify icon="solar:map-bold" width={22} />
                            </Avatar>
                            <Stack spacing={0.25}>
                              <Typography variant="subtitle2">{region.name}</Typography>
                              {region.state && (
                                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                  {region.state}
                                </Typography>
                              )}
                            </Stack>
                          </Stack>
                        </TableCell>

                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {adminName ?? (
                            <Label variant="soft" color="warning">
                              Nobody assigned
                            </Label>
                          )}
                        </TableCell>

                        <TableCell>
                          {members.length === 0 ? (
                            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                              No clusters point here yet
                            </Typography>
                          ) : (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {members.slice(0, 4).map((c) => (
                                <Label
                                  key={c.id}
                                  variant="soft"
                                  onClick={() => navigate(`/admin/clusters/${c.id}`)}
                                  sx={{ cursor: 'pointer' }}
                                >
                                  {c.name}
                                </Label>
                              ))}
                              {members.length > 4 && (
                                <Label variant="soft" color="default">
                                  +{members.length - 4}
                                </Label>
                              )}
                            </Box>
                          )}
                        </TableCell>

                        <TableCell align="right">{fNumber(members.length)}</TableCell>

                        <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
                          <Tooltip title="See how it is doing">
                            <IconButton
                              onClick={() => {
                                setSelectedRegion(region.id);
                                setTab('performance');
                              }}
                            >
                              <Iconify icon="solar:graph-up-bold" />
                            </IconButton>
                          </Tooltip>
                          {isSuper && (
                            <>
                              <Tooltip title="Rename">
                                <IconButton
                                  onClick={() => {
                                    setEditing(region);
                                    setDialogOpen(true);
                                  }}
                                >
                                  <Iconify icon="solar:pen-bold" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip
                                title={
                                  members.length > 0
                                    ? 'Move its clusters elsewhere first'
                                    : 'Delete'
                                }
                              >
                                <span>
                                  <IconButton
                                    color="error"
                                    disabled={members.length > 0}
                                    onClick={() => setDeleting(region)}
                                  >
                                    <Iconify icon="solar:trash-bin-trash-bold" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Scrollbar>
        )}

        {tab === 'performance' && (
          <Box sx={{ p: 3 }}>
            <Stack
              spacing={2}
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ sm: 'center' }}
              sx={{ mb: 3 }}
            >
              <Box sx={{ width: { xs: 1, sm: 220 } }}>
                <RegionSelect
                  regions={rows}
                  value={regionId}
                  onChange={setSelectedRegion}
                />
              </Box>
              <DateField
                label="From"
                value={range.from}
                onChange={(from) => setRange((r) => ({ ...r, from }))}
                sx={{ width: { xs: 1, sm: 180 } }}
              />
              <DateField
                label="To"
                value={range.to}
                onChange={(to) => setRange((r) => ({ ...r, to }))}
                sx={{ width: { xs: 1, sm: 180 } }}
              />
              <Box sx={{ flexGrow: 1 }} />
              <Button
                variant="outlined"
                disabled={!regionId}
                onClick={() =>
                  downloadRegionPerformanceCsv(regionId, {
                    from: `${range.from}T00:00:00.000Z`,
                    to: `${range.to}T23:59:59.999Z`,
                  })
                }
                startIcon={<Iconify icon="solar:download-bold" />}
              >
                Export CSV
              </Button>
            </Stack>

            {performance.isError && (
              <Alert severity="error">
                {performance.error instanceof Error
                  ? performance.error.message
                  : 'Could not load the report'}
              </Alert>
            )}

            {totals && (
              <Grid container spacing={2.5} sx={{ mb: 3 }}>
                {[
                  { label: 'Sellers', value: fNumber(totals.sellers), icon: 'solar:users-group-rounded-bold' },
                  { label: 'Live listings', value: fNumber(totals.liveListings), icon: 'solar:box-bold' },
                  { label: 'Orders', value: fNumber(totals.orders), icon: 'solar:bag-check-bold' },
                  { label: 'Revenue', value: fCurrency(totals.revenueInr), icon: 'solar:wallet-money-bold' },
                  { label: 'Open tickets', value: fNumber(totals.openTickets), icon: 'solar:chat-round-dots-bold' },
                ].map((item) => (
                  <Grid key={item.label} xs={6} sm={4} md={2.4}>
                    <Card sx={{ p: 2, boxShadow: 'none', bgcolor: 'background.neutral' }}>
                      <Stack spacing={0.25}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Iconify icon={item.icon} width={16} sx={{ color: 'text.disabled' }} />
                          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                            {item.label}
                          </Typography>
                        </Stack>
                        <Typography variant="h6">{item.value}</Typography>
                      </Stack>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            <Divider sx={{ borderStyle: 'dashed', mb: 2 }} />

            <Scrollbar>
              {(performance.data?.rows.length ?? 0) === 0 ? (
                <EmptyContent
                  filled
                  sx={{ py: 8 }}
                  title="Nothing in this window"
                  description="Pick another region or widen the dates."
                />
              ) : (
                <Table sx={{ minWidth: 800 }}>
                  <TableHeadCustom headLabel={PERF_HEAD} />
                  <TableBody>
                    {(performance.data?.rows ?? []).map((row) => (
                      <TableRow key={row.clusterId} hover>
                        <TableCell>
                          <Typography variant="subtitle2">{row.clusterName}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                            {row.state}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{fNumber(row.sellers)}</TableCell>
                        <TableCell align="right">{fNumber(row.liveListings)}</TableCell>
                        <TableCell align="right">{fNumber(row.orders)}</TableCell>
                        <TableCell align="right" sx={{ typography: 'subtitle2' }}>
                          {fCurrency(row.revenueInr)}
                        </TableCell>
                        <TableCell align="right">
                          {row.openTickets > 0 ? (
                            <Label variant="soft" color="warning">
                              {fNumber(row.openTickets)}
                            </Label>
                          ) : (
                            fNumber(0)
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Scrollbar>
          </Box>
        )}
      </Card>

      <RegionFormDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
      />

      <DeleteRegionDialog region={deleting} onClose={() => setDeleting(null)} />
    </>
  );
};

// ----------------------------------------------------------------------

function RegionSelect({
  regions,
  value,
  onChange,
}: {
  regions: SafeRegion[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
        Region
      </Typography>
      <Box
        component="select"
        value={value}
        onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
        sx={{
          width: 1,
          height: 40,
          px: 1.5,
          borderRadius: 1,
          typography: 'body2',
          color: 'text.primary',
          bgcolor: 'transparent',
          border: (theme) =>
            `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.2)}`,
        }}
      >
        {regions.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </Box>
    </Stack>
  );
}

// ----------------------------------------------------------------------

function DeleteRegionDialog({
  region,
  onClose,
}: {
  region: SafeRegion | null;
  onClose: () => void;
}) {
  const remove = useDeleteRegion();

  const submit = async () => {
    if (!region) return;
    try {
      await remove.mutateAsync(region.id);
      toast.success(`${region.name} deleted`);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete the region');
    }
  };

  return (
    <Dialog fullWidth maxWidth="xs" open={Boolean(region)} onClose={onClose}>
      <DialogTitle sx={{ pb: 2 }}>Delete {region?.name}?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          The region disappears from oversight. Its clusters and their sellers are untouched — a
          region is only a grouping.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" variant="outlined" onClick={onClose} disabled={remove.isPending}>
          Cancel
        </Button>
        <LoadingButton
          color="error"
          variant="contained"
          loading={remove.isPending}
          onClick={submit}
        >
          Delete
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
