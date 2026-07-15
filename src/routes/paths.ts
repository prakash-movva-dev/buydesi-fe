import { paramCase } from 'src/utils/change-case';

// ----------------------------------------------------------------------

const MOCK_ID = 'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b1';

const MOCK_TITLE = 'lorem-ipsum';

const ROOTS = {
  AUTH: '/auth',
  AUTH_DEMO: '/auth-demo',
  DASHBOARD: '/dashboard',
};

// ----------------------------------------------------------------------

export const paths = {
  comingSoon: '/coming-soon',
  maintenance: '/maintenance',
  pricing: '/pricing',
  payment: '/payment',
  about: '/about-us',
  contact: '/contact-us',
  faqs: '/faqs',
  page403: '/error/403',
  page404: '/error/404',
  page500: '/error/500',
  // Public verification (no auth required)
  verify: (token: string) => `/verify/${token}`,
  components: '/components',
  docs: 'https://docs.minimals.cc',
  changelog: 'https://docs.minimals.cc/changelog',
  zoneStore: 'https://mui.com/store/items/zone-landing-page/',
  minimalStore: 'https://mui.com/store/items/minimal-dashboard/',
  freeUI: 'https://mui.com/store/items/minimal-dashboard-free/',
  figmaUrl: 'https://www.figma.com/design/cAPz4pYPtQEXivqe11EcDE/%5BPreview%5D-Minimal-Web.v6.0.0',
  product: {
    root: `/product`,
    checkout: `/product/checkout`,
    details: (id: string) => `/product/${id}`,
    demo: { details: `/product/${MOCK_ID}` },
  },
  post: {
    root: `/post`,
    details: (title: string) => `/post/${paramCase(title)}`,
    demo: { details: `/post/${paramCase(MOCK_TITLE)}` },
  },
  // AUTH
  auth: {
    amplify: {
      signIn: `${ROOTS.AUTH}/amplify/sign-in`,
      verify: `${ROOTS.AUTH}/amplify/verify`,
      signUp: `${ROOTS.AUTH}/amplify/sign-up`,
      updatePassword: `${ROOTS.AUTH}/amplify/update-password`,
      resetPassword: `${ROOTS.AUTH}/amplify/reset-password`,
    },
    jwt: {
      signIn: `${ROOTS.AUTH}/jwt/sign-in`,
      signUp: `${ROOTS.AUTH}/jwt/sign-up`,
      entitySignup: `${ROOTS.AUTH}/jwt/entity-signup`,
    },
    firebase: {
      signIn: `${ROOTS.AUTH}/firebase/sign-in`,
      verify: `${ROOTS.AUTH}/firebase/verify`,
      signUp: `${ROOTS.AUTH}/firebase/sign-up`,
      resetPassword: `${ROOTS.AUTH}/firebase/reset-password`,
    },
    auth0: {
      signIn: `${ROOTS.AUTH}/auth0/sign-in`,
    },
    supabase: {
      signIn: `${ROOTS.AUTH}/supabase/sign-in`,
      verify: `${ROOTS.AUTH}/supabase/verify`,
      signUp: `${ROOTS.AUTH}/supabase/sign-up`,
      updatePassword: `${ROOTS.AUTH}/supabase/update-password`,
      resetPassword: `${ROOTS.AUTH}/supabase/reset-password`,
    },
  },
  authDemo: {
    split: {
      signIn: `${ROOTS.AUTH_DEMO}/split/sign-in`,
      signUp: `${ROOTS.AUTH_DEMO}/split/sign-up`,
      resetPassword: `${ROOTS.AUTH_DEMO}/split/reset-password`,
      updatePassword: `${ROOTS.AUTH_DEMO}/split/update-password`,
      verify: `${ROOTS.AUTH_DEMO}/split/verify`,
    },
    centered: {
      signIn: `${ROOTS.AUTH_DEMO}/centered/sign-in`,
      signUp: `${ROOTS.AUTH_DEMO}/centered/sign-up`,
      resetPassword: `${ROOTS.AUTH_DEMO}/centered/reset-password`,
      updatePassword: `${ROOTS.AUTH_DEMO}/centered/update-password`,
      verify: `${ROOTS.AUTH_DEMO}/centered/verify`,
    },
  },
  // DASHBOARD
  dashboard: {
    root: ROOTS.DASHBOARD,
    account: `${ROOTS.DASHBOARD}/account`,
    booking: `${ROOTS.DASHBOARD}/booking`,
    entity: {
      root: `${ROOTS.DASHBOARD}/entity`,
      new: `${ROOTS.DASHBOARD}/entity/new`,
      list: `${ROOTS.DASHBOARD}/entity/list`,
      profile: `${ROOTS.DASHBOARD}/entity/profile`,
      edit: (id: string) => `${ROOTS.DASHBOARD}/entity/${id}/edit`,
      demo: {
        edit: `${ROOTS.DASHBOARD}/entity/${MOCK_ID}/edit`,
      },
    },
    rwa: {
      root: `${ROOTS.DASHBOARD}/rwa`,
      new: `${ROOTS.DASHBOARD}/rwa/new`,
      list: `${ROOTS.DASHBOARD}/rwa/list`,
      details: (id: string) => `${ROOTS.DASHBOARD}/rwa/${id}`,
      edit: (id: string) => `${ROOTS.DASHBOARD}/rwa/${id}/edit`,
      demo: {
        details: `${ROOTS.DASHBOARD}/rwa/${MOCK_ID}`,
        edit: `${ROOTS.DASHBOARD}/rwa/${MOCK_ID}/edit`,
      },
    },
    guest: {
      root: `${ROOTS.DASHBOARD}/guest`,
      new: `${ROOTS.DASHBOARD}/guest/new`,
      list: `${ROOTS.DASHBOARD}/guest/list`,
      profile: `${ROOTS.DASHBOARD}/guest/profile`,
      details: (id: string) => `${ROOTS.DASHBOARD}/guest/${id}`,
      edit: (id: string) => `${ROOTS.DASHBOARD}/guest/${id}/edit`,
      demo: {
        details: `${ROOTS.DASHBOARD}/guest/${MOCK_ID}`,
        edit: `${ROOTS.DASHBOARD}/guest/${MOCK_ID}/edit`,
      },
    },
    systemuser: {
      root: `${ROOTS.DASHBOARD}/systemuser`,
      new: `${ROOTS.DASHBOARD}/systemuser/new`,
      list: `${ROOTS.DASHBOARD}/systemuser/list`,
      profile: `${ROOTS.DASHBOARD}/systemuser/profile`,
      edit: (id: string) => `${ROOTS.DASHBOARD}/systemuser/${id}/edit`,
      demo: {
        edit: `${ROOTS.DASHBOARD}/systemuser/${MOCK_ID}/edit`,
      },
    },
    user: {
      root: `${ROOTS.DASHBOARD}/user`,
      new: `${ROOTS.DASHBOARD}/user/new`,
      list: `${ROOTS.DASHBOARD}/user/list`,
      cards: `${ROOTS.DASHBOARD}/user/cards`,
      profile: `${ROOTS.DASHBOARD}/user/profile`,
      account: `${ROOTS.DASHBOARD}/user/account`,
      edit: (id: string) => `${ROOTS.DASHBOARD}/user/${id}/edit`,
      demo: {
        edit: `${ROOTS.DASHBOARD}/user/${MOCK_ID}/edit`,
      },
    },
    wallet: {
      root: `${ROOTS.DASHBOARD}/wallet`,
      overview: `${ROOTS.DASHBOARD}/wallet`,
      transactions: `${ROOTS.DASHBOARD}/wallet/transactions`,
      transactionDetails: (id: string) => `${ROOTS.DASHBOARD}/wallet/transactions/${id}`,
      invoices: `${ROOTS.DASHBOARD}/wallet/invoices`,
      invoiceDetails: (id: string) => `${ROOTS.DASHBOARD}/wallet/invoices/${id}`,
    },
    services: {
      root: `${ROOTS.DASHBOARD}/services`,
      list: `${ROOTS.DASHBOARD}/services`,
    },
    support: {
      root: `${ROOTS.DASHBOARD}/support`,
      list: `${ROOTS.DASHBOARD}/support`,
      new: `${ROOTS.DASHBOARD}/support/new`,
      details: (id: string) => `${ROOTS.DASHBOARD}/support/${id}`,
    },
    direct: {
      root: `${ROOTS.DASHBOARD}/direct-lookups`,
      list: `${ROOTS.DASHBOARD}/direct-lookups`,
      history: `${ROOTS.DASHBOARD}/direct-lookups/history`,
      run: (serviceCode: string) =>
        `${ROOTS.DASHBOARD}/direct-lookups/${serviceCode.toLowerCase()}`,
      details: (id: string) =>
        `${ROOTS.DASHBOARD}/direct-lookups/lookup/${id}`,
    },
  },
};
