import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LoadingButton from '@mui/lab/LoadingButton';

import { Label } from '@/components/label';
import { toast } from '@/components/snackbar';
import { PhoneInput } from '@/components/phone-input';

import { ApiError } from '@/types/api';
import { validateEmail, validateMobile } from '@/lib/validation';

import { useUpdateUserContact } from './api';
import { ROLE_LABEL } from './user-table-row';
import type { SafeUser } from './types';

// ----------------------------------------------------------------------

type Props = {
  user: SafeUser | null;
  onClose: () => void;
};

/**
 * Corrects how someone signs in.
 *
 * Both fields are optional individually but not together — an account with
 * neither an email nor a mobile has no way in, so the dialog says that before
 * the API has to.
 */
export function EditContactDialog({ user, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const update = useUpdateUserContact();

  // Reload the form whenever a different account opens it.
  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? '');
    setMobile(user.mobile ?? '');
    setError(null);
    setShowErrors(false);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const emailError = validateEmail(email);
  const mobileError = validateMobile(mobile);
  const bothEmpty = !email.trim() && !mobile.trim();

  const emailChanged = (email.trim() || null) !== (user?.email ?? null);
  const mobileChanged = (mobile.trim() || null) !== (user?.mobile ?? null);
  const nothingChanged = !emailChanged && !mobileChanged;

  const submit = async () => {
    if (!user) return;
    setShowErrors(true);
    if (emailError || mobileError || bothEmpty) return;
    setError(null);
    try {
      await update.mutateAsync({
        id: user.id,
        // Only send what moved, so an untouched channel keeps its verified stamp.
        ...(emailChanged ? { email: email.trim() || null } : {}),
        ...(mobileChanged ? { mobile: mobile.trim() || null } : {}),
      });
      toast.success(`Updated ${user.name}'s sign-in details`);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the changes');
    }
  };

  return (
    <Dialog
      fullWidth
      maxWidth="xs"
      open={Boolean(user)}
      onClose={update.isPending ? undefined : onClose}
    >
      <DialogTitle sx={{ pb: 2 }}>Edit sign-in details</DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {user && (
            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: 'background.neutral' }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="subtitle2">{user.name}</Typography>
                <Label variant="soft">{ROLE_LABEL[user.role] ?? user.role}</Label>
              </Stack>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                These are what they sign in with.
              </Typography>
            </Box>
          )}

          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Leave empty if they sign in by mobile"
            error={showErrors && Boolean(emailError ?? (bothEmpty ? 'x' : null))}
            helperText={showErrors ? (emailError ?? undefined) : undefined}
          />

          <PhoneInput
            fullWidth
            label="Mobile"
            value={mobile}
            onChange={setMobile}
            country="IN"
            error={showErrors && Boolean(mobileError)}
            helperText={showErrors ? (mobileError ?? undefined) : undefined}
          />

          {showErrors && bothEmpty && (
            <Alert severity="warning">
              Keep one of the two — an account with no email and no mobile cannot sign in.
            </Alert>
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button color="inherit" variant="outlined" onClick={onClose} disabled={update.isPending}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          loading={update.isPending}
          disabled={nothingChanged}
          onClick={submit}
        >
          Save
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
