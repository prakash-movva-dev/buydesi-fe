import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-7xl font-bold tracking-tight text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you tried to open doesn’t exist or you don’t have access to it.
      </p>
      <Button onClick={() => navigate('/')}>Back to dashboard</Button>
    </div>
  );
};
