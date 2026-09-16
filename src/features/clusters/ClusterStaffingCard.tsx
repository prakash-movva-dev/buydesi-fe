import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LoadingButton from '@mui/lab/LoadingButton';

import { Label } from '@/components/label';
import { toast } from '@/components/snackbar';
import { Iconify } from '@/components/iconify';
import { UserPicker } from '@/components/pickers/UserPicker';

import { ApiError, UserRole } from '@/types/api';
import { useUsersList } from '@/features/users/api';

import { useAssignAdmin } from './api';

// ----------------------------------------------------------------------

type StaffRole = typeof UserRole.CLUSTER_ADMIN | typeof UserRole.SUPPORT_ADMIN;

type Slot = {
  role: StaffRole;
  title: string;
  icon: string;
  /** What this person is actually responsible for, in the reader's terms. */
  what: string;
};

const SLOTS: Slot[] = [
  {
    role: UserRole.CLUSTER_ADMIN,
    title: 'Cluster admin',
    icon: 'solar:user-check-rounded-bold',
    what: 'Runs the cluster — approves sellers, watches stock and orders, answers for the area.',
  },
  {
    role: UserRole.SUPPORT_ADMIN,
    title: 'Support admin',
    icon: 'solar:headphones-round-bold',
    what: 'Works the support queue for this cluster — tickets, returns and refunds.',
  },
];

type Props = {
  clusterId: string;
  clusterName: string;
  /** Only the super tier can move people between clusters. */
  canAssign: boolean;
};

/**
 * Who staffs this cluster.
 *
 * Exactly one of each role, which is why the card shows two slots rather than a
 * list: the question is never "how many admins are here" but "is each job
 * covered, and by whom".
 */
export function ClusterStaffingCard({ clusterId, clusterName, canAssign }: Props) {
  const [assigning, setAssigning] = useState<Slot | null>(null);

  const { data: clusterAdmins } = useUsersList({
    role: UserRole.CLUSTER_ADMIN,
    page: 1,
    limit: 100,
  });
  const { data: supportAdmins } = useUsersList({
    role: UserRole.SUPPORT_ADMIN,
    page: 1,
    limit: 100,
  });

  const assign = useAssignAdmin();

  const holderOf = (role: Slot['role']) => {
    const pool = role === UserRole.CLUSTER_ADMIN ? clusterAdmins : supportAdmins;
    return (pool?.items ?? []).find((u) => u.clusterId === clusterId);
  };

  const unassign = async (userId: string, name: string) => {
    try {
      await assign.mutateAsync({ userId, clusterId: null });
      toast.success(`${name} is no longer assigned to ${clusterName}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not unassign');
    }
  };

  return (
    <>
      <Card>
        <CardHeader
          title="Who staffs this cluster"
          subheader="One cluster admin, one support admin. Category admins cover their category across every cluster, so they are not assigned here."
        />

        <Stack
          spacing={0}
          divider={<Divider sx={{ borderStyle: 'dashed' }} />}
          sx={{ p: 3, pt: 2 }}
        >
          {SLOTS.map((slot) => {
            const holder = holderOf(slot.role);
            return (
              <Stack
                key={slot.role}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ sm: 'center' }}
                sx={{ py: 2 }}
              >
                <Avatar
                  variant="rounded"
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: holder ? 'success.lighter' : 'warning.lighter',
                    color: holder ? 'success.dark' : 'warning.dark',
                  }}
                >
                  <Iconify icon={slot.icon} width={24} />
                </Avatar>

                <Stack spacing={0.25} sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="subtitle2">{slot.title}</Typography>
                    {holder ? (
                      <Label variant="soft" color="success">
                        {holder.name}
                      </Label>
                    ) : (
                      <Label variant="soft" color="warning">
                        Vacant
                      </Label>
                    )}
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {holder
                      ? (holder.email ?? holder.mobile ?? slot.what)
                      : slot.what}
                  </Typography>
                </Stack>

                {canAssign && (
                  <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    {holder ? (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setAssigning(slot)}
                        >
                          Replace
                        </Button>
                        <Tooltip title="Unassign — frees the slot, keeps the account">
                          <IconButton
                            size="small"
                            disabled={assign.isPending}
                            onClick={() => unassign(holder.id, holder.name)}
                          >
                            <Iconify icon="solar:user-minus-rounded-bold" width={18} />
                          </IconButton>
                        </Tooltip>
                      </>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => setAssigning(slot)}
                        startIcon={<Iconify icon="mingcute:add-line" />}
                      >
                        Assign
                      </Button>
                    )}
                  </Stack>
                )}
              </Stack>
            );
          })}
        </Stack>
      </Card>

      <AssignDialog
        slot={assigning}
        clusterId={clusterId}
        clusterName={clusterName}
        currentHolderId={assigning ? holderOf(assigning.role)?.id : undefined}
        onClose={() => setAssigning(null)}
      />
    </>
  );
}

// ----------------------------------------------------------------------

/**
 * Picks the person for a slot.
 *
 * Only accounts that are free, or already this cluster's, are offered — someone
 * running another cluster has to be released from it first, and doing that here
 * would quietly leave that cluster unstaffed.
 */
function AssignDialog({
  slot,
  clusterId,
  clusterName,
  currentHolderId,
  onClose,
}: {
  slot: Slot | null;
  clusterId: string;
  clusterName: string;
  currentHolderId?: string;
  onClose: () => void;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assign = useAssignAdmin();
  const { data: pool } = useUsersList(
    slot ? { role: slot.role, page: 1, limit: 100 } : { page: 1, limit: 1 },
  );

  const free = (pool?.items ?? []).filter((u) => !u.clusterId || u.clusterId === clusterId);
  const elsewhere = (pool?.items ?? []).filter(
    (u) => u.clusterId && u.clusterId !== clusterId,
  );

  const submit = async () => {
    if (!userId) {
      setError('Pick who should hold this slot');
      return;
    }
    setError(null);
    try {
      // Replacing means the outgoing holder has to let go of the slot first —
      // the API refuses two people in one job, by design.
      if (currentHolderId && currentHolderId !== userId) {
        await assign.mutateAsync({ userId: currentHolderId, clusterId: null });
      }
      await assign.mutateAsync({ userId, clusterId });
      toast.success(`Assigned to ${clusterName}`);
      setUserId(null);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not assign');
    }
  };

  return (
    <Dialog fullWidth maxWidth="xs" open={Boolean(slot)} onClose={onClose}>
      <DialogTitle sx={{ pb: 2 }}>
        {currentHolderId ? `Replace the ${slot?.title.toLowerCase()}` : `Assign a ${slot?.title.toLowerCase()}`}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {slot?.what}
          </Typography>

          {slot && (
            <UserPicker
              label={slot.title}
              required
              role={slot.role}
              value={userId}
              onChange={setUserId}
              placeholder="Search accounts…"
            />
          )}

          {free.length === 0 && (
            <Alert severity="warning">
              Every {slot?.title.toLowerCase()} account is already assigned to a cluster. Create a
              new account, or free one from its current cluster first.
            </Alert>
          )}

          {elsewhere.length > 0 && (
            <Box>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Already running another cluster, so not available here:{' '}
                {elsewhere.map((u) => u.name).join(', ')}
              </Typography>
            </Box>
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button color="inherit" variant="outlined" onClick={onClose} disabled={assign.isPending}>
          Cancel
        </Button>
        <LoadingButton variant="contained" loading={assign.isPending} onClick={submit}>
          {currentHolderId ? 'Replace' : 'Assign'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
