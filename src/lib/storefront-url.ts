/**
 * Where the buyer storefront lives.
 *
 * One definition, because two files had drifted apart: the promoter's share
 * link pointed at the live site while a seller's "view my story" link pointed
 * at `localhost:3211`, so in production that link went nowhere.
 *
 * Set `VITE_STOREFRONT_URL` per environment; the default is the live site,
 * which is the safer thing to be wrong about.
 */
export const STOREFRONT_URL =
  import.meta.env.VITE_STOREFRONT_URL?.replace(/\/$/, '') ?? 'https://buydesionline.com';

/** Join a path onto the storefront origin. */
export const storefrontLink = (path: string): string =>
  `${STOREFRONT_URL}/${path.replace(/^\//, '')}`;
