import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { AuthProvider } from '@/lib/auth';
import { AppRouter } from '@/routes/router';
import { ThemeProvider } from '@/theme/theme-provider';
import { MotionLazy } from '@/components/animate/motion-lazy';
import { Snackbar } from '@/components/snackbar';
import { SettingsDrawer, defaultSettings, SettingsProvider } from '@/components/settings';
import './global.css';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Lists are mostly cluster-scoped + paginated — short stale time avoids
      // showing yesterday's queue. We refetch on window focus by default.
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider settings={defaultSettings}>
          <ThemeProvider>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <MotionLazy>
                <Snackbar />
                <SettingsDrawer />
                <AppRouter />
              </MotionLazy>
            </LocalizationProvider>
          </ThemeProvider>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
