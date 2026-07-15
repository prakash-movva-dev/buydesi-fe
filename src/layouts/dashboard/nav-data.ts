import { createElement } from 'react';

import type { NavSectionProps } from 'src/components/nav-section';

import { navSections, isItemVisible } from '@/components/layout/nav-config';
import type { UserRole } from '@/types/api';

// ----------------------------------------------------------------------

/**
 * Adapts the back-office role-based nav (`navSections`, lucide icons) into the
 * Minimal `nav-section` data shape, filtered to the current user's role.
 */
export function buildNavData(role: UserRole | undefined): NavSectionProps['data'] {
  if (!role) return [];

  return navSections
    .map((section) => ({
      subheader: section.label,
      items: section.items
        .filter((item) => isItemVisible(item, role))
        .map((item) => ({
          title: item.label,
          path: item.path,
          icon: createElement(item.icon, { size: 22, strokeWidth: 1.75 }),
        })),
    }))
    .filter((section) => section.items.length > 0);
}
