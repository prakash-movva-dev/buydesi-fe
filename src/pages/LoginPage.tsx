import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Sprout } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
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
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex items-center gap-2">
            <Sprout className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold tracking-tight">Buy Desi</span>
          </div>
          <CardTitle>Sign in to the back-office</CardTitle>
          <CardDescription>
            Use your registered email or mobile number with your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="identifier">Email or mobile</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com or +91 9xxxxxxxxx"
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 border-t border-border pt-4 text-center text-sm">
            <p className="text-muted-foreground">New to Buy Desi?</p>
            <Link
              to="/register/seller"
              className="mt-1 inline-block font-medium text-primary hover:underline"
            >
              Register as a seller
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
