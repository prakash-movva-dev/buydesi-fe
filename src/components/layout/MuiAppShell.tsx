import { Outlet } from 'react-router-dom';

import { DashboardLayout, DashboardContent } from '@/layouts/dashboard';
import { buildNavData } from '@/layouts/dashboard/nav-data';
import { useAuth } from '@/lib/auth';

/**
 * Material (Minimal UI) dashboard shell. Wraps every authenticated route with
 * the MUI sidebar + header, feeding it role-filtered navigation. The
 * DashboardContent container supplies the Minimal page gutters + max-width.
 */
export const MuiAppShell = () => {
  const { user } = useAuth();
  const navData = buildNavData(user?.role);

  return (
    <DashboardLayout data={{ nav: navData }}>
      <DashboardContent maxWidth="xl">
        <Outlet />
      </DashboardContent>
    </DashboardLayout>
  );
};
