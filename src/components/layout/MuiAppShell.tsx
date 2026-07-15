import { Outlet } from 'react-router-dom';

import { DashboardLayout } from '@/layouts/dashboard';
import { buildNavData } from '@/layouts/dashboard/nav-data';
import { useAuth } from '@/lib/auth';

/**
 * Material (Minimal UI) dashboard shell. Wraps every authenticated route with
 * the MUI sidebar + header, feeding it role-filtered navigation.
 */
export const MuiAppShell = () => {
  const { user } = useAuth();
  const navData = buildNavData(user?.role);

  return (
    <DashboardLayout data={{ nav: navData }}>
      <Outlet />
    </DashboardLayout>
  );
};
