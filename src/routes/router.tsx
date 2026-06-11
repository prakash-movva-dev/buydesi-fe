import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ActivityLogPage } from '@/features/activity/ActivityLogPage';
import { CartLimitsPage } from '@/features/cartlimits/CartLimitsPage';
import { CategoriesPage } from '@/features/categories/CategoriesPage';
import { ClusterDetailPage } from '@/features/clusters/ClusterDetailPage';
import { ClustersPage } from '@/features/clusters/ClustersPage';
import { CommissionPage } from '@/features/commission/CommissionPage';
import { EscalationPanelPage } from '@/features/escalation/EscalationPanelPage';
import { DeliveryPage } from '@/features/delivery/DeliveryPage';
import { NotificationTemplatesPage } from '@/features/notification-templates/NotificationTemplatesPage';
import { PlatformSettingsPage } from '@/features/platform-settings/PlatformSettingsPage';
import { OrderDetailPage } from '@/features/orders/OrderDetailPage';
import { OrdersListPage } from '@/features/orders/OrdersListPage';
import { PayoutsPage } from '@/features/payouts/PayoutsPage';
import { ProductDetailPage } from '@/features/products/ProductDetailPage';
import { ProductsListPage } from '@/features/products/ProductsListPage';
import { StockMonitorPage } from '@/features/products/StockMonitorPage';
import { PromotersPage } from '@/features/promoters/PromotersPage';
import { PromotionsPage } from '@/features/promotions/PromotionsPage';
import { QualityMonitorPage } from '@/features/quality-monitor/QualityMonitorPage';
import { RegionsPage } from '@/features/regions/RegionsPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { PromoterDashboard } from '@/features/promoter/dashboard/PromoterDashboard';
import { PromoterProfilePage } from '@/features/promoter/profile/PromoterProfilePage';
import { PromoterSharePage } from '@/features/promoter/share/SharePage';
import { PromoterTicketsPage } from '@/features/promoter/support/PromoterTicketsPage';
import { ReviewsPage } from '@/features/reviews/ReviewsPage';
import { MyAnalyticsPage } from '@/features/seller/analytics/MyAnalyticsPage';
import { MyCashEntriesPage } from '@/features/seller/cash/MyCashEntriesPage';
import { SellerOnboardingPage } from '@/features/seller/onboarding/OnboardingPage';
import { MyOrdersPage } from '@/features/seller/orders/MyOrdersPage';
import { SellerOrderDetailPage } from '@/features/seller/orders/SellerOrderDetailPage';
import { MyPayoutsPage } from '@/features/seller/payouts/MyPayoutsPage';
import { MyProductsPage } from '@/features/seller/products/MyProductsPage';
import { SellerProductFormPage } from '@/features/seller/products/ProductFormPage';
import { MyCommissionPage } from '@/features/seller/profile/MyCommissionPage';
import { ProfilePage as SellerProfilePage } from '@/features/seller/profile/ProfilePage';
import { SellerGate } from '@/features/seller/SellerGate';
import { SellerStorefrontPage } from '@/features/seller/storefront/StorefrontPage';
import { MyTicketsPage } from '@/features/seller/support/MyTicketsPage';
import { MyTradeListingsPage } from '@/features/seller/trade/MyTradeListingsPage';
import { MyTradeOrdersPage } from '@/features/seller/trade/MyTradeOrdersPage';
import { TradeCataloguePage } from '@/features/seller/trade/TradeCataloguePage';
import { TradeOrderDetailPage as SellerTradeOrderDetailPage } from '@/features/seller/trade/TradeOrderDetailPage';
import { MyWalletPage } from '@/features/seller/wallet/MyWalletPage';
import { SellerDetailPage } from '@/features/sellers/SellerDetailPage';
import { SellerPerformancePage } from '@/features/sellers/SellerPerformancePage';
import { SellersListPage } from '@/features/sellers/SellersListPage';
import { VerifiedBadgePage } from '@/features/sellers/VerifiedBadgePage';
import { TicketDetailPage } from '@/features/support/TicketDetailPage';
import { TicketsListPage } from '@/features/support/TicketsListPage';
import { TradeSettingsPage } from '@/features/trade/TradeSettingsPage';
import { UsersPage } from '@/features/users/UsersPage';
import { CashTransactionsPage } from '@/features/wallet/CashTransactionsPage';
import { WalletPage } from '@/features/wallet/WalletPage';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { SellerRegisterPage } from '@/pages/SellerRegisterPage';
import { UserRole } from '@/types/api';
import { ProtectedRoute } from './ProtectedRoute';

const SELLER_REVIEW_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.SUB_SUPER_ADMIN,
  UserRole.REGIONAL_ADMIN,
  UserRole.SUPPORT_ADMIN,
] as const;

const CATALOG_ADMIN_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.SUB_SUPER_ADMIN,
  UserRole.REGIONAL_ADMIN,
  UserRole.CATEGORY_ADMIN,
] as const;

const CATEGORY_MGMT_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.SUB_SUPER_ADMIN,
  UserRole.CATEGORY_ADMIN,
] as const;

const SUPPORT_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.SUB_SUPER_ADMIN,
  UserRole.REGIONAL_ADMIN,
  UserRole.SUPPORT_ADMIN,
] as const;

const OPS_ADMIN_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.SUB_SUPER_ADMIN,
  UserRole.REGIONAL_ADMIN,
] as const;

const SUPER_TIER = [UserRole.SUPER_ADMIN, UserRole.SUB_SUPER_ADMIN] as const;

const SUPER_ONLY = [UserRole.SUPER_ADMIN] as const;

const ALL_ADMINS = [
  UserRole.SUPER_ADMIN,
  UserRole.SUB_SUPER_ADMIN,
  UserRole.REGIONAL_ADMIN,
  UserRole.CATEGORY_ADMIN,
  UserRole.SUPPORT_ADMIN,
] as const;

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register/seller',
    element: <SellerRegisterPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/forbidden', element: <ForbiddenPage /> },
          {
            element: <ProtectedRoute roles={SELLER_REVIEW_ROLES} />,
            children: [
              { path: '/admin/sellers', element: <SellersListPage /> },
              { path: '/admin/sellers/performance', element: <SellerPerformancePage /> },
              { path: '/admin/sellers/:id', element: <SellerDetailPage /> },
            ],
          },
          {
            element: <ProtectedRoute roles={CATALOG_ADMIN_ROLES} />,
            children: [
              { path: '/admin/products', element: <ProductsListPage /> },
              { path: '/admin/products/:id', element: <ProductDetailPage /> },
              { path: '/admin/stock-monitor', element: <StockMonitorPage /> },
              { path: '/admin/commission', element: <CommissionPage /> },
            ],
          },
          {
            element: <ProtectedRoute roles={CATEGORY_MGMT_ROLES} />,
            children: [{ path: '/admin/categories', element: <CategoriesPage /> }],
          },
          {
            element: <ProtectedRoute roles={SUPPORT_ROLES} />,
            children: [
              { path: '/admin/orders', element: <OrdersListPage /> },
              { path: '/admin/orders/:id', element: <OrderDetailPage /> },
              { path: '/admin/support', element: <TicketsListPage /> },
              { path: '/admin/support/:id', element: <TicketDetailPage /> },
              { path: '/admin/quality-monitor', element: <QualityMonitorPage /> },
              { path: '/admin/delivery', element: <DeliveryPage /> },
            ],
          },
          {
            element: <ProtectedRoute roles={OPS_ADMIN_ROLES} />,
            children: [
              { path: '/admin/wallet', element: <WalletPage /> },
              { path: '/admin/cash-transactions', element: <CashTransactionsPage /> },
              { path: '/admin/payouts', element: <PayoutsPage /> },
              { path: '/admin/promoters', element: <PromotersPage /> },
              { path: '/admin/promotions', element: <PromotionsPage /> },
              { path: '/admin/clusters', element: <ClustersPage /> },
              { path: '/admin/clusters/:id', element: <ClusterDetailPage /> },
              { path: '/admin/reports', element: <ReportsPage /> },
            ],
          },
          {
            element: <ProtectedRoute roles={SUPER_TIER} />,
            children: [
              { path: '/admin/activity-log', element: <ActivityLogPage /> },
              { path: '/admin/trade', element: <TradeSettingsPage /> },
              { path: '/admin/escalation', element: <EscalationPanelPage /> },
              { path: '/admin/regions', element: <RegionsPage /> },
            ],
          },
          {
            element: <ProtectedRoute roles={SUPER_ONLY} />,
            children: [{ path: '/admin/verified-badge', element: <VerifiedBadgePage /> }],
          },
          {
            element: <ProtectedRoute roles={ALL_ADMINS} />,
            children: [
              { path: '/admin/users', element: <UsersPage /> },
              { path: '/admin/reviews', element: <ReviewsPage /> },
            ],
          },
          {
            element: <ProtectedRoute roles={SUPER_TIER} />,
            children: [
              { path: '/admin/cart-limits', element: <CartLimitsPage /> },
              { path: '/admin/notification-templates', element: <NotificationTemplatesPage /> },
              { path: '/admin/platform-settings', element: <PlatformSettingsPage /> },
            ],
          },
          {
            element: <ProtectedRoute roles={[UserRole.PROMOTER]} />,
            children: [
              { path: '/promoter/dashboard', element: <PromoterDashboard /> },
              { path: '/promoter/share', element: <PromoterSharePage /> },
              { path: '/promoter/support', element: <PromoterTicketsPage /> },
              { path: '/promoter/support/:id', element: <TicketDetailPage /> },
              { path: '/promoter/profile', element: <PromoterProfilePage /> },
            ],
          },
          {
            element: <ProtectedRoute roles={[UserRole.SELLER]} />,
            children: [
              {
                element: <SellerGate />,
                children: [
                  { path: '/seller/onboarding', element: <SellerOnboardingPage /> },
                  { path: '/seller/products', element: <MyProductsPage /> },
                  { path: '/seller/products/new', element: <SellerProductFormPage /> },
                  { path: '/seller/products/:id/edit', element: <SellerProductFormPage /> },
                  { path: '/seller/products/:id', element: <SellerProductFormPage /> },
                  { path: '/seller/orders', element: <MyOrdersPage /> },
                  { path: '/seller/orders/:id', element: <SellerOrderDetailPage /> },
                  { path: '/seller/wallet', element: <MyWalletPage /> },
                  { path: '/seller/payouts', element: <MyPayoutsPage /> },
                  { path: '/seller/cash-entries', element: <MyCashEntriesPage /> },
                  { path: '/seller/commission', element: <MyCommissionPage /> },
                  { path: '/seller/storefront', element: <SellerStorefrontPage /> },
                  { path: '/seller/analytics', element: <MyAnalyticsPage /> },
                  { path: '/seller/trade/listings', element: <MyTradeListingsPage /> },
                  { path: '/seller/trade/catalogue', element: <TradeCataloguePage /> },
                  { path: '/seller/trade/orders', element: <MyTradeOrdersPage /> },
                  { path: '/seller/trade/orders/:id', element: <SellerTradeOrderDetailPage /> },
                  { path: '/seller/support', element: <MyTicketsPage /> },
                  { path: '/seller/support/:id', element: <TicketDetailPage /> },
                  { path: '/seller/profile', element: <SellerProfilePage /> },
                ],
              },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

export const AppRouter = () => <RouterProvider router={router} />;
