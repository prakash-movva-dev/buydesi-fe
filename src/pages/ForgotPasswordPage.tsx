import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';

import { api } from '@/lib/api';
import { ApiError } from '@/types/api';
import { AuthSplitLayout } from '@/layouts/auth-split';

// ----------------------------------------------------------------------

/** Email or mobile — inferred, so the seller does not have to tell us which. */
const channelFor = (identifier: string): 'email' | 'mobile' =>
  identifier.includes('@') ? 'email' : 'mobile';

type Step = 'identify' | 'reset';

/**
 * Password reset for the back-office.
 *
 * The API and the buyer storefront have had this all along; the portal a
 * seller actually signs into did not, so a seller who forgot their password
 * had no way back in at all.
 *
 * Two steps on one page: ask for the code, then set the new password. Keeping
 * it on one page means the identifier does not have to survive a navigation,
 * and a seller who mistypes it can correct it without starting again.
 */
export const ForgotPasswordPage = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('identify');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const channel = channelFor(identifier.trim());

  const sendCode = async (resend = false) => {
    const id = identifier.trim();
    if (!id) {
      setError('Enter the email or mobile number you sign in with.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post(
        '/auth/otp/request',
        { channel: channelFor(id), identifier: id, purpose: 'password_reset' },
        { skipAuth: true },
      );
      setStep('reset');
      setNotice(
        resend
          ? 'A new code is on its way.'
          : `We have sent a code to your ${channelFor(id) === 'email' ? 'email' : 'mobile'}.`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send a code');
    } finally {
      setBusy(false);
    }
  };

  const onIdentify = (e: FormEvent) => {
    e.preventDefault();
    void sendCode();
  };

  const onReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Use at least 8 characters for the new password.');
      return;
    }

    setBusy(true);
    try {
      await api.post(
        '/auth/reset-password',
        {
          channel,
          identifier: identifier.trim(),
          code: code.trim(),
          newPassword: password,
        },
        { skipAuth: true },
      );
      // Straight to sign-in rather than logging them in behind their back —
      // the new password should be used once before they rely on it.
      navigate('/login?reset=1', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset the password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthSplitLayout>
      <Stack spacing={1.5} sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h5">
          {step === 'identify' ? 'Reset your password' : 'Choose a new password'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {step === 'identify'
            ? 'We will send a code to the email or mobile you sign in with.'
            : `Enter the code we sent to ${identifier.trim()} and pick a new password.`}
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {notice && !error && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      {step === 'identify' ? (
        <form onSubmit={onIdentify}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              autoFocus
              label="Email or mobile"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or +91 9xxxxxxxxx"
              InputLabelProps={{ shrink: true }}
              disabled={busy}
            />
            <LoadingButton fullWidth size="large" type="submit" variant="contained" loading={busy}>
              Send code
            </LoadingButton>
          </Stack>
        </form>
      ) : (
        <form onSubmit={onReset}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              autoFocus
              label="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
              InputLabelProps={{ shrink: true }}
              inputProps={{ inputMode: 'numeric', maxLength: 8 }}
              disabled={busy}
            />

            <TextField
              fullWidth
              label="New password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="At least 8 characters"
              disabled={busy}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((v) => !v)} edge="end">
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <LoadingButton fullWidth size="large" type="submit" variant="contained" loading={busy}>
              Set new password
            </LoadingButton>

            <Stack direction="row" spacing={0.5} justifyContent="center">
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Code not arrived?
              </Typography>
              <Link
                component="button"
                type="button"
                variant="subtitle2"
                onClick={() => void sendCode(true)}
                disabled={busy}
              >
                Send another
              </Link>
            </Stack>
          </Stack>
        </form>
      )}

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Link component={RouterLink} to="/login" variant="subtitle2">
          Back to sign in
        </Link>
      </Box>
    </AuthSplitLayout>
  );
};
