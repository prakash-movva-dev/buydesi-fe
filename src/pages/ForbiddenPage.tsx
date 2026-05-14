import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export const ForbiddenPage = () => {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-7xl font-bold tracking-tight text-muted-foreground">403</p>
      <h1 className="text-xl font-semibold">Not allowed</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Your role doesn’t have access to this page. If this looks wrong, contact a super admin.
      </p>
      <Button onClick={() => navigate('/')}>Back to dashboard</Button>
    </div>
  );
};
