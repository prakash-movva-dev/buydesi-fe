import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AlertCircle, Hourglass, ShieldOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types/api';
import { useSellerMe } from './profile/api';

/**
 * Wraps every seller-facing route. Forces an onboarding redirect if the
 * seller has no profile yet, and shows persistent status banners for
 * PENDING / INFO_REQUESTED / REJECTED.
 */
export const SellerGate = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isSeller = user?.role === UserRole.SELLER;
  const { data: profile, isLoading } = useSellerMe(isSeller);

  if (!isSeller) {
    // Not a seller — let other route guards handle it. We're not the right wall.
    return <Outlet />;
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // No SellerProfile yet — force onboarding.
  if (!profile) {
    if (location.pathname !== '/seller/onboarding') {
      return <Navigate to="/seller/onboarding" replace />;
    }
    return <Outlet />;
  }

  return (
    <div className="space-y-4">
      {profile.status === 'PENDING' && (
        <Banner
          variant="warning"
          icon={Hourglass}
          title="KYC under review"
          body="An admin will approve or request more info shortly. Some features are disabled until then."
        />
      )}
      {profile.status === 'INFO_REQUESTED' && (
        <Banner
          variant="warning"
          icon={AlertCircle}
          title="Admin requested more information"
          body={
            profile.reviewNotes
              ? `"${profile.reviewNotes}" — head to onboarding to resubmit.`
              : 'Open the onboarding page to see what is needed and resubmit.'
          }
        />
      )}
      {profile.status === 'REJECTED' && (
        <Banner
          variant="destructive"
          icon={ShieldOff}
          title="Account rejected"
          body={profile.reviewNotes ?? 'Contact support if you think this is wrong.'}
        />
      )}
      <Outlet />
    </div>
  );
};

interface BannerProps {
  variant: 'warning' | 'destructive';
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}

const Banner = ({ variant, icon: Icon, title, body }: BannerProps) => {
  const cls =
    variant === 'destructive'
      ? 'border-destructive/40 bg-destructive/5 text-destructive'
      : 'border-amber-400/50 bg-amber-50 text-amber-900';
  return (
    <div className={`flex items-start gap-3 rounded-md border p-3 text-sm ${cls}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 whitespace-pre-wrap">{body}</p>
      </div>
    </div>
  );
};
