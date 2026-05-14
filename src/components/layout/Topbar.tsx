import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  SUB_SUPER_ADMIN: 'Sub-Super Admin',
  REGIONAL_ADMIN: 'Regional Admin',
  CATEGORY_ADMIN: 'Category Admin',
  SUPPORT_ADMIN: 'Support Admin',
  SELLER: 'Seller',
  PROMOTER: 'Promoter',
  BUYER: 'Buyer',
};

export const Topbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div>
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="font-medium leading-tight">
          {user.name}
          <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {roleLabel[user.role] ?? user.role}
          </span>
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onLogout}>
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </header>
  );
};
