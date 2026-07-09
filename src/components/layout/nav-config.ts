import {
  AlertTriangle,
  BarChart3,
  Bell,
  Box,
  ClipboardList,
  CreditCard,
  FolderTree,
  Gift,
  Headset,
  LayoutDashboard,
  Map,
  Megaphone,
  PackageSearch,
  Receipt,
  ReceiptText,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sliders,
  Sparkles,
  Star,
  Store,
  Truck,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { UserRole } from '@/types/api';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Roles allowed to see this entry. Empty = visible to every authenticated user. */
  roles?: ReadonlyArray<UserRole>;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

const ALL_ADMINS = [
  UserRole.SUPER_ADMIN,
  UserRole.SUB_SUPER_ADMIN,
  UserRole.CLUSTER_ADMIN,
  UserRole.CATEGORY_ADMIN,
  UserRole.SUPPORT_ADMIN,
] as const;

const OPS_ADMINS = [
  UserRole.SUPER_ADMIN,
  UserRole.SUB_SUPER_ADMIN,
  UserRole.CLUSTER_ADMIN,
] as const;

const SUPPORT_TIER = [
  UserRole.SUPER_ADMIN,
  UserRole.SUB_SUPER_ADMIN,
  UserRole.CLUSTER_ADMIN,
  UserRole.SUPPORT_ADMIN,
] as const;

const CATALOG_ADMINS = [
  UserRole.SUPER_ADMIN,
  UserRole.SUB_SUPER_ADMIN,
  UserRole.CLUSTER_ADMIN,
  UserRole.CATEGORY_ADMIN,
] as const;

// Regional Admin = supply/ops oversight across a region (multiple clusters).
// Sees supply/ops pages but NOT money, promotions, or settings.
const SUPPLY_OPS_TIER = [
  UserRole.SUPER_ADMIN,
  UserRole.SUB_SUPER_ADMIN,
  UserRole.REGIONAL_ADMIN,
  UserRole.CLUSTER_ADMIN,
] as const;

const SUPPLY_OPS_WITH_SUPPORT = [
  UserRole.SUPER_ADMIN,
  UserRole.SUB_SUPER_ADMIN,
  UserRole.REGIONAL_ADMIN,
  UserRole.CLUSTER_ADMIN,
  UserRole.SUPPORT_ADMIN,
] as const;

const SUPPLY_OPS_CATALOG = [
  UserRole.SUPER_ADMIN,
  UserRole.SUB_SUPER_ADMIN,
  UserRole.REGIONAL_ADMIN,
  UserRole.CLUSTER_ADMIN,
  UserRole.CATEGORY_ADMIN,
] as const;

export const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'My business',
    items: [
      { label: 'Products', path: '/seller/products', icon: Box, roles: [UserRole.SELLER] },
      { label: 'Orders', path: '/seller/orders', icon: ShoppingBag, roles: [UserRole.SELLER] },
      { label: 'Storefront', path: '/seller/storefront', icon: Store, roles: [UserRole.SELLER] },
    ],
  },
  {
    label: 'Money',
    items: [
      { label: 'Wallet', path: '/seller/wallet', icon: Wallet, roles: [UserRole.SELLER] },
      { label: 'Payouts', path: '/seller/payouts', icon: CreditCard, roles: [UserRole.SELLER] },
      {
        label: 'Cash entries',
        path: '/seller/cash-entries',
        icon: Receipt,
        roles: [UserRole.SELLER],
      },
      {
        label: 'My commission',
        path: '/seller/commission',
        icon: ReceiptText,
        roles: [UserRole.SELLER],
      },
    ],
  },
  {
    label: 'Trade',
    items: [
      {
        label: 'My listings',
        path: '/seller/trade/listings',
        icon: Sparkles,
        roles: [UserRole.SELLER],
      },
      {
        label: 'Catalogue',
        path: '/seller/trade/catalogue',
        icon: ShoppingBag,
        roles: [UserRole.SELLER],
      },
      {
        label: 'Trade orders',
        path: '/seller/trade/orders',
        icon: ClipboardList,
        roles: [UserRole.SELLER],
      },
    ],
  },
  {
    label: 'Insights',
    items: [
      {
        label: 'Analytics',
        path: '/seller/analytics',
        icon: BarChart3,
        roles: [UserRole.SELLER],
      },
    ],
  },
  {
    label: 'Support',
    items: [
      {
        label: 'My tickets',
        path: '/seller/support',
        icon: Headset,
        roles: [UserRole.SELLER],
      },
    ],
  },
  {
    label: 'Account',
    items: [
      {
        label: 'Profile',
        path: '/seller/profile',
        icon: UserCheck,
        roles: [UserRole.SELLER],
      },
    ],
  },
  {
    label: 'Promote',
    items: [
      {
        label: 'Share kit',
        path: '/promoter/share',
        icon: Gift,
        roles: [UserRole.PROMOTER],
      },
    ],
  },
  {
    label: 'Support',
    items: [
      {
        label: 'My tickets',
        path: '/promoter/support',
        icon: Headset,
        roles: [UserRole.PROMOTER],
      },
    ],
  },
  {
    label: 'Account',
    items: [
      {
        label: 'Profile',
        path: '/promoter/profile',
        icon: UserCheck,
        roles: [UserRole.PROMOTER],
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        label: 'Sellers',
        path: '/admin/sellers',
        icon: UserCheck,
        roles: SUPPLY_OPS_WITH_SUPPORT,
      },
      {
        label: 'Seller performance',
        path: '/admin/sellers/performance',
        icon: TrendingUp,
        roles: SUPPLY_OPS_TIER,
      },
      {
        label: 'Products',
        path: '/admin/products',
        icon: Box,
        roles: SUPPLY_OPS_CATALOG,
      },
      {
        label: 'Stock monitor',
        path: '/admin/stock-monitor',
        icon: PackageSearch,
        roles: SUPPLY_OPS_CATALOG,
      },
      {
        label: 'Categories',
        path: '/admin/categories',
        icon: FolderTree,
        roles: [UserRole.SUPER_ADMIN, UserRole.SUB_SUPER_ADMIN, UserRole.CATEGORY_ADMIN],
      },
      {
        label: 'Orders',
        path: '/admin/orders',
        icon: ClipboardList,
        roles: SUPPLY_OPS_WITH_SUPPORT,
      },
      {
        label: 'Support tickets',
        path: '/admin/support',
        icon: Headset,
        roles: SUPPORT_TIER,
      },
      {
        label: 'Quality Monitor',
        path: '/admin/quality-monitor',
        icon: ShieldAlert,
        roles: SUPPORT_TIER,
      },
      {
        label: 'Delivery',
        path: '/admin/delivery',
        icon: Truck,
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.SUB_SUPER_ADMIN,
          UserRole.REGIONAL_ADMIN,
          UserRole.CLUSTER_ADMIN,
          UserRole.SUPPORT_ADMIN,
        ],
      },
      {
        label: 'Reviews',
        path: '/admin/reviews',
        icon: Star,
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.SUB_SUPER_ADMIN,
          UserRole.REGIONAL_ADMIN,
          UserRole.CLUSTER_ADMIN,
          UserRole.CATEGORY_ADMIN,
          UserRole.SUPPORT_ADMIN,
        ],
      },
    ],
  },
  {
    label: 'Money',
    items: [
      { label: 'Wallet', path: '/admin/wallet', icon: Wallet, roles: OPS_ADMINS },
      {
        label: 'Cash transactions',
        path: '/admin/cash-transactions',
        icon: Receipt,
        roles: OPS_ADMINS,
      },
      { label: 'Payouts', path: '/admin/payouts', icon: CreditCard, roles: OPS_ADMINS },
      { label: 'Commission', path: '/admin/commission', icon: Receipt, roles: CATALOG_ADMINS },
    ],
  },
  {
    label: 'Growth',
    items: [
      { label: 'Promoters', path: '/admin/promoters', icon: Gift, roles: OPS_ADMINS },
      { label: 'Promotions', path: '/admin/promotions', icon: Megaphone, roles: OPS_ADMINS },
      {
        label: 'Clusters',
        path: '/admin/clusters',
        icon: Map,
        roles: [...OPS_ADMINS, UserRole.REGIONAL_ADMIN],
      },
      {
        label: 'Regions',
        path: '/admin/regions',
        icon: Map,
        roles: [UserRole.SUPER_ADMIN, UserRole.SUB_SUPER_ADMIN, UserRole.REGIONAL_ADMIN],
      },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Reports', path: '/admin/reports', icon: BarChart3, roles: SUPPLY_OPS_TIER },
      {
        label: 'Activity log',
        path: '/admin/activity-log',
        icon: ScrollText,
        roles: [UserRole.SUPER_ADMIN, UserRole.SUB_SUPER_ADMIN],
      },
    ],
  },
  {
    label: 'Admin',
    items: [
      {
        label: 'Trade settings',
        path: '/admin/trade',
        icon: Sparkles,
        roles: [UserRole.SUPER_ADMIN, UserRole.SUB_SUPER_ADMIN],
      },
      {
        label: 'Escalation panel',
        path: '/admin/escalation',
        icon: AlertTriangle,
        roles: [UserRole.SUPER_ADMIN, UserRole.SUB_SUPER_ADMIN],
      },
      {
        label: 'Verified badge',
        path: '/admin/verified-badge',
        icon: ShieldCheck,
        roles: [UserRole.SUPER_ADMIN],
      },
      {
        label: 'Users',
        path: '/admin/users',
        icon: Users,
        roles: ALL_ADMINS,
      },
    ],
  },
  {
    label: 'Settings',
    items: [
      {
        label: 'Cart limits',
        path: '/admin/cart-limits',
        icon: ShoppingCart,
        roles: [UserRole.SUPER_ADMIN, UserRole.SUB_SUPER_ADMIN],
      },
      {
        label: 'Notification templates',
        path: '/admin/notification-templates',
        icon: Bell,
        roles: [UserRole.SUPER_ADMIN, UserRole.SUB_SUPER_ADMIN],
      },
      {
        label: 'Platform settings',
        path: '/admin/platform-settings',
        icon: Sliders,
        roles: [UserRole.SUPER_ADMIN, UserRole.SUB_SUPER_ADMIN],
      },
    ],
  },
];

export const isItemVisible = (item: NavItem, role: UserRole): boolean => {
  if (!item.roles || item.roles.length === 0) return true;
  return item.roles.includes(role);
};
