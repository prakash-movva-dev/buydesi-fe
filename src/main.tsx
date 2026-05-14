import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth';
import { AppRouter } from '@/routes/router';
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
        <AppRouter />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
