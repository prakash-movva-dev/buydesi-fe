import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

// Viewport-locked shell: the outer flex container is fixed to viewport height
// and clips overflow, so the sidebar + topbar stay put and only <main> scrolls.
export const AppShell = () => (
  <div className="flex h-screen overflow-hidden bg-background">
    <Sidebar />
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <Topbar />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  </div>
);
