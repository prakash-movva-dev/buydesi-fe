import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Sprout } from 'lucide-react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/types/api';

const looksLikeEmail = (s: string): boolean => s.includes('@');

export const LoginPage = () => {
  const { isAuthenticated, loginWithPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 400, p: 4 }}>
        <Stack spacing={1} alignItems="center" sx={{ textAlign: 'center', mb: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Sprout className="h-6 w-6 text-primary" />
            <Typography variant="h6" component="span">
              Buy Desi
            </Typography>
          </Stack>
          <Typography variant="h5" sx={{ mt: 1 }}>
            Sign in to the back-office
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Use your registered email or mobile number with your password.
          </Typography>
        </Stack>

        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            <Stack spacing={0.75}>
              <Label htmlFor="identifier">Email or mobile</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com or +91 9xxxxxxxxx"
                autoComplete="username"
                required
              />
            </Stack>
            <Stack spacing={0.75}>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Stack>
            {error && (
              <Typography variant="body2" sx={{ color: 'error.main' }} role="alert">
                {error}
              </Typography>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </Stack>
        </form>

        <Box
          sx={{
            mt: 3,
            pt: 2,
            borderTop: 1,
            borderColor: 'divider',
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            New to Buy Desi?
          </Typography>
          <Link
            to="/register/seller"
            className="mt-1 inline-block font-medium text-primary hover:underline"
          >
            Register as a seller
          </Link>
        </Box>
      </Card>
    </Box>
  );
};
