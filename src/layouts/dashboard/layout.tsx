import type { NavSectionProps } from 'src/components/nav-section';
import type { Theme, SxProps, Breakpoint } from '@mui/material/styles';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import { useBoolean } from 'src/hooks/use-boolean';

import { useSettingsContext } from 'src/components/settings';

import { Main } from './main';
import { NavMobile } from './nav-mobile';
import { layoutClasses } from '../classes';
import { NavVertical } from './nav-vertical';
import { MenuButton } from '../components/menu-button';
import { LayoutSection } from '../core/layout-section';
import { HeaderSection } from '../core/header-section';
import { useNavColorVars } from './styles';
import { AccountMenu } from '../components/account-menu';
import { SettingsButton } from '../components/settings-button';

// ----------------------------------------------------------------------

export type DashboardLayoutProps = {
  sx?: SxProps<Theme>;
  children: React.ReactNode;
  header?: {
    sx?: SxProps<Theme>;
  };
  data?: {
    nav?: NavSectionProps['data'];
  };
};

export function DashboardLayout({ sx, children, header, data }: DashboardLayoutProps) {
  const theme = useTheme();

  const mobileNavOpen = useBoolean();

  const settings = useSettingsContext();

  const navColorVars = useNavColorVars(theme, settings);

  const layoutQuery: Breakpoint = 'lg';

  const navData = data?.nav ?? [];

  const isNavMini = settings.navLayout === 'mini';

  return (
    <LayoutSection
      /** Header */
      headerSection={
        <HeaderSection
          layoutQuery={layoutQuery}
          slotProps={{
            container: {
              maxWidth: false,
              sx: { px: { [layoutQuery]: 5 } },
            },
          }}
          sx={header?.sx}
          slots={{
            leftArea: (
              <>
                <MenuButton
                  onClick={mobileNavOpen.onTrue}
                  sx={{
                    mr: 1,
                    ml: -1,
                    [theme.breakpoints.up(layoutQuery)]: { display: 'none' },
                  }}
                />
                <NavMobile
                  data={navData}
                  open={mobileNavOpen.value}
                  onClose={mobileNavOpen.onFalse}
                  cssVars={navColorVars.section}
                />
              </>
            ),
            rightArea: (
              <Box display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1 }}>
                <SettingsButton />
                <AccountMenu />
              </Box>
            ),
          }}
        />
      }
      /** Sidebar */
      sidebarSection={
        <NavVertical
          data={navData}
          isNavMini={isNavMini}
          layoutQuery={layoutQuery}
          cssVars={navColorVars.section}
          onToggleNav={() =>
            settings.onUpdateField(
              'navLayout',
              settings.navLayout === 'vertical' ? 'mini' : 'vertical',
            )
          }
        />
      }
      /** Footer */
      footerSection={null}
      /** Style */
      cssVars={{
        ...navColorVars.layout,
        '--layout-transition-easing': 'linear',
        '--layout-transition-duration': '120ms',
        '--layout-nav-mini-width': '88px',
        '--layout-nav-vertical-width': '300px',
        '--layout-nav-horizontal-height': '64px',
        '--layout-dashboard-content-pt': theme.spacing(1),
        '--layout-dashboard-content-pb': theme.spacing(8),
        '--layout-dashboard-content-px': theme.spacing(5),
      }}
      sx={{
        [`& .${layoutClasses.hasSidebar}`]: {
          [theme.breakpoints.up(layoutQuery)]: {
            transition: theme.transitions.create(['padding-left'], {
              easing: 'var(--layout-transition-easing)',
              duration: 'var(--layout-transition-duration)',
            }),
            pl: isNavMini ? 'var(--layout-nav-mini-width)' : 'var(--layout-nav-vertical-width)',
          },
        },
        ...sx,
      }}
    >
      <Main isNavHorizontal={false}>{children}</Main>
    </LayoutSection>
  );
}
