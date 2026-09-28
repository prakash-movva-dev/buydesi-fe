import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { useAuth } from '@/lib/auth';
import { ApiError } from '@/types/api';
import { Label } from '@/components/label';
import { toast } from '@/components/snackbar';
import { Iconify } from '@/components/iconify';
import { PhoneInput } from '@/components/phone-input';
import { validateEmail, validateMobile } from '@/lib/validation';
import { useConfirmContactChange, useRequestContactChange } from '@/features/account/api';

// ----------------------------------------------------------------------

type Channel = 'email' | 'mobile';

/**
 * Changing the email or mobile you sign in with.
 *
 * Two steps on purpose: the code goes to the address being moved *to*, so
 * nothing changes until you have proved you can read mail there. A mistyped
 * address costs you a retry rather than your account.
 *
 * One channel at a time, and neither can be cleared here — removing your only
 * way to sign in is an admin action, not a self-service one.
 */
export function AccountSignInDetails() {
  const { user, applyUser } = useAuth();
  const requestMut = useRequestContactChange();
  const confirmMut = useConfirmContactChange();

  const [channel, setChannel] = useState<Channel | null>(null);
  const [value, setValue] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const begin = (next: Channel) => {
    setChannel(next);
    setValue('');
    setCode('');
    setSent(false);
    setError(null);
  };

  const cancel = () => {
    setChannel(null);
    setError(null);
  };

  const payload = () =>
    channel === 'email'
      ? { channel: 'email' as const, email: value.trim().toLowerCase() }
      : { channel: 'mobile' as const, mobile: value.trim() };

  const sendCode = async () => {
    setError(null);
    const invalid =
      channel === 'email' ? validateEmail(value, true) : validateMobile(value, true);
    if (invalid) {
      setError(invalid);
      return;
    }
    try {
      await requestMut.mutateAsync(payload());
      setSent(true);
      toast.success(`Code sent to ${value.trim()}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send a code');
    }
  };

  const confirm = async () => {
    setError(null);
    try {
      const updated = await confirmMut.mutateAsync({ ...payload(), code: code.trim() });
      applyUser(updated);
      toast.success('Sign-in details updated');
      setChannel(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not confirm that code');
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        Sign-in details
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
        You sign in with either of these. Changing one sends a code to the new address first.
      </Typography>

      <Stack spacing={2} divider={<Divider sx={{ borderStyle: 'dashed' }} />}>
        <ChannelRow
          label="Email"
          current={user?.email ?? null}
          verified={Boolean(user?.emailVerifiedAt)}
          onChange={() => begin('email')}
          disabled={channel !== null}
        />
        <ChannelRow
          label="Mobile"
          current={user?.mobile ?? null}
          verified={Boolean(user?.mobileVerifiedAt)}
          onChange={() => begin('mobile')}
          disabled={channel !== null}
        />
      </Stack>

      {channel && (
        <Box sx={{ mt: 3, p: 2.5, borderRadius: 2, bgcolor: 'background.neutral' }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            {sent
              ? `Enter the code we sent to ${value.trim()}`
              : `New ${channel === 'email' ? 'email address' : 'mobile number'}`}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2}>
            {channel === 'email' ? (
              <TextField
                fullWidth
                label="New email"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={sent}
                InputLabelProps={{ shrink: true }}
              />
            ) : (
              <PhoneInput
                fullWidth
                country="IN"
                label="New mobile"
                value={value}
                onChange={(v) => setValue((v ?? '') as string)}
                disabled={sent}
              />
            )}

            {sent && (
              <TextField
                fullWidth
                autoFocus
                label="Code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                inputProps={{ inputMode: 'numeric', maxLength: 8 }}
                InputLabelProps={{ shrink: true }}
                helperText="Not arrived? Cancel and try again in a moment."
              />
            )}

            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
              <Button
                variant="outlined"
                color="inherit"
                onClick={cancel}
                disabled={requestMut.isPending || confirmMut.isPending}
              >
                Cancel
              </Button>
              {sent ? (
                <LoadingButton
                  variant="contained"
                  loading={confirmMut.isPending}
                  disabled={code.length < 4}
                  onClick={confirm}
                >
                  Confirm change
                </LoadingButton>
              ) : (
                <LoadingButton
                  variant="contained"
                  loading={requestMut.isPending}
                  disabled={!value.trim()}
                  onClick={sendCode}
                >
                  Send code
                </LoadingButton>
              )}
            </Stack>
          </Stack>
        </Box>
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------

function ChannelRow({
  label,
  current,
  verified,
  onChange,
  disabled,
}: {
  label: string;
  current: string | null;
  verified: boolean;
  onChange: () => void;
  disabled: boolean;
}) {
  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" noWrap>
            {current ?? 'Not set'}
          </Typography>
          {current && (
            <Label variant="soft" color={verified ? 'success' : 'warning'}>
              {verified ? 'Verified' : 'Unverified'}
            </Label>
          )}
        </Stack>
      </Box>
      <Button
        size="small"
        color="inherit"
        variant="outlined"
        disabled={disabled}
        onClick={onChange}
        startIcon={<Iconify width={16} icon="solar:pen-bold" />}
      >
        {current ? 'Change' : 'Add'}
      </Button>
    </Stack>
  );
}
