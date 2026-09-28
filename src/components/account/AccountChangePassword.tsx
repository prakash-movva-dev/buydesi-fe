import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';

import { useBoolean } from '@/hooks/use-boolean';

import { api } from '@/lib/api';
import { ApiError } from '@/types/api';
import { toast } from '@/components/snackbar';
import { Iconify } from '@/components/iconify';

// ----------------------------------------------------------------------

/** Mirrors the backend's password rule, so the error arrives before the request. */
const MIN_LENGTH = 8;

export function AccountChangePassword() {
  const show = useBoolean();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const change = useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api.post<{ changed: true }>('/auth/change-password', input),
  });

  const tooShort = next.length > 0 && next.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSubmit = Boolean(current) && next.length >= MIN_LENGTH && confirm === next;

  const submit = async () => {
    setError(null);
    try {
      await change.mutateAsync({ currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      setConfirm('');
      toast.success('Password changed — other devices have been signed out');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change the password');
    }
  };

  const reveal = (
    <InputAdornment position="end">
      <IconButton onClick={show.onToggle} edge="end">
        <Iconify icon={show.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
      </IconButton>
    </InputAdornment>
  );

  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={3} sx={{ maxWidth: 480 }}>
        <TextField
          name="currentPassword"
          label="Current password"
          type={show.value ? 'text' : 'password'}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          InputProps={{ endAdornment: reveal }}
          InputLabelProps={{ shrink: true }}
          autoComplete="current-password"
        />

        <TextField
          name="newPassword"
          label="New password"
          type={show.value ? 'text' : 'password'}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          error={tooShort}
          helperText={
            tooShort ? `Use at least ${MIN_LENGTH} characters` : `At least ${MIN_LENGTH} characters`
          }
          InputProps={{ endAdornment: reveal }}
          InputLabelProps={{ shrink: true }}
          autoComplete="new-password"
        />

        <TextField
          name="confirmNewPassword"
          label="Confirm new password"
          type={show.value ? 'text' : 'password'}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch}
          helperText={mismatch ? 'The two passwords do not match' : ' '}
          InputProps={{ endAdornment: reveal }}
          InputLabelProps={{ shrink: true }}
          autoComplete="new-password"
        />

        {error && <Alert severity="error">{error}</Alert>}

        <Alert severity="info">
          Changing your password signs you out everywhere else — anyone still holding the old one
          loses access.
        </Alert>

        <LoadingButton
          variant="contained"
          loading={change.isPending}
          disabled={!canSubmit}
          onClick={submit}
          sx={{ ml: 'auto' }}
        >
          Save changes
        </LoadingButton>
      </Stack>
    </Card>
  );
}
