import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { INDIA_STATES } from '@/utils/india-geo';
import { ApiError } from '@/types/api';
import { useCreateRegion, useUpdateRegion } from './api';
import type { SafeRegion } from './types';

interface Props {
  open: boolean;
  editing: SafeRegion | null;
  onClose: () => void;
}

export const RegionFormDialog = ({ open, editing, onClose }: Props) => {
  const isEdit = Boolean(editing);
  const createMut = useCreateRegion();
  const updateMut = useUpdateRegion();

  const [name, setName] = useState('');
  const [state, setState] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setName(editing.name);
      setState(editing.state ?? '');
    } else {
      setName('');
      setState('');
    }
  }, [open, editing]);

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) {
      setError('Region name is required (at least 2 characters).');
      return;
    }
    try {
      const payload = {
        name: name.trim(),
        state: state.trim() || undefined,
      };
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, patch: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    }
  };

  const submitting = createMut.isPending || updateMut.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit region — ${editing!.name}` : 'New region'}
      description="A region groups multiple clusters for aggregated oversight and performance reporting. It does not change each cluster's operational scoping."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create region'}
          </Button>
        </>
      }
      className="max-w-2xl"
    >
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}

        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          }}
        >
          <TextField
            fullWidth
            label="Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            select
            label="State (optional)"
            value={state}
            onChange={(e) => setState(e.target.value)}
            InputLabelProps={{ shrink: true }}
          >
            <MenuItem value="">No specific state…</MenuItem>
            {INDIA_STATES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Clusters aren't attached here. Open a cluster and set its <b>Region</b> field — the
          cluster owns that link, and this region lists whichever clusters point to it.
        </Typography>
      </Stack>
    </Dialog>
  );
};
