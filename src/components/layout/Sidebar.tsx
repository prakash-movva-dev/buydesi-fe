import { NavLink } from 'react-router-dom';
import { Sprout } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/lib/auth';
import { isItemVisible, navSections } from './nav-config';

export const Sidebar = () => {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center gap-2 px-6">
        <Sprout className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold tracking-tight">Buy Desi</span>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {navSections.map((section) => {
          const visibleItems = section.items.filter((item) => isItemVisible(item, user.role));
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.label}>
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.label}
              </p>
              <ul className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                          )
                        }
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
};
