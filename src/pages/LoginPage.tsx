import { useState, type FormEvent } from 'react';
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';

import { AuthSplitLayout } from '@/layouts/auth-split';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/types/api';

const looksLikeEmail = (s: string): boolean => s.includes('@');

export const LoginPage = () => {
  const { isAuthenticated, loginWithPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    const target = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={target} replace />;
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await loginWithPassword({
        identifier: identifier.trim(),
        password,
        channel: looksLikeEmail(identifier) ? 'email' : 'mobile',
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      section={{
        title: 'Welcome back to Buy Desi',
        subtitle: 'Run the marketplace — sellers, orders, payouts and support, all in one place.',
      }}
    >
      <Stack spacing={1.5} sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h5">Sign in to the back-office</Typography>
        <Stack direction="row" spacing={0.5} justifyContent="center">
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            New to Buy Desi?
          </Typography>
          <Link component={RouterLink} to="/register/seller" variant="subtitle2">
            Register as a seller
          </Link>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={onSubmit}>
        <Stack spacing={3}>
          <TextField
            fullWidth
            label="Email or mobile"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="you@example.com or +91 9xxxxxxxxx"
            autoComplete="username"
            required
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            InputLabelProps={{ shrink: true }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword((s) => !s)} edge="end">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <LoadingButton
            fullWidth
            size="large"
            type="submit"
            variant="contained"
            loading={submitting}
          >
            Sign in
          </LoadingButton>
        </Stack>
      </form>

      <Typography variant="caption" sx={{ mt: 3, textAlign: 'center', color: 'text.disabled' }}>
        Use your registered email or mobile number with your password.
      </Typography>
    </AuthSplitLayout>
  );
};
