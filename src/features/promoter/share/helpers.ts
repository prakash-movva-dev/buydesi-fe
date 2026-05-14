/**
 * Public-facing share URL. Buyer storefront isn't built yet, but we wire the
 * route convention now: `/register?ref=DESI-…` will pre-fill the referral
 * code on sign-up forms.
 */
export const buildShareLink = (couponCode: string): string => {
  // Origin works for self-deployed; swap to a hard-coded domain when buyer
  // storefront lands on its own URL.
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://buydesi.in';
  return `${origin}/register?ref=${encodeURIComponent(couponCode)}`;
};

export interface MessageTemplate {
  locale: string;
  label: string;
  template: string;
}

/**
 * Pre-formatted promo messages per supported locale. Variables:
 *  - {{code}}        — promoter coupon code
 *  - {{link}}        — share link
 */
export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    locale: 'en',
    label: 'English',
    template:
      'Hey! I shop on Buy Desi for fresh produce from local farmers. Use my code {{code}} for a discount on your first order. Sign up here: {{link}}',
  },
  {
    locale: 'hi',
    label: 'Hindi',
    template:
      'Buy Desi par taza saamaan stat se kheton tak — meri code {{code}} use karke discount pao. Yahaan sign-up karein: {{link}}',
  },
  {
    locale: 'ta',
    label: 'Tamil',
    template:
      'Buy Desi-il enaku oru promo code irukku — {{code}} use pannina discount kidaikkum. Ingu sign-up pannunga: {{link}}',
  },
  {
    locale: 'te',
    label: 'Telugu',
    template:
      'Buy Desi lo na promo code {{code}} use cheste discount vasthundi. Sign-up cheyandi: {{link}}',
  },
  {
    locale: 'kn',
    label: 'Kannada',
    template:
      'Buy Desi nalli nanage discount sigutte — nange code {{code}} use madi. Sign-up: {{link}}',
  },
  {
    locale: 'ml',
    label: 'Malayalam',
    template:
      'Buy Desi-l enikkenkilum {{code}} code use cheythal discount kittum. Ivide sign-up cheyyu: {{link}}',
  },
  {
    locale: 'mr',
    label: 'Marathi',
    template:
      'Buy Desi var maaza promo code {{code}} vapra ani discount mila. Sign-up kara: {{link}}',
  },
  {
    locale: 'bn',
    label: 'Bengali',
    template:
      'Buy Desi-te amar code {{code}} byabohar korle discount paben. Sign-up korun: {{link}}',
  },
  {
    locale: 'gu',
    label: 'Gujarati',
    template:
      'Buy Desi par mara code {{code}} no upyog karine discount melvo. Sign-up karo: {{link}}',
  },
  {
    locale: 'pa',
    label: 'Punjabi',
    template:
      'Buy Desi te mera code {{code}} use kar ke discount lo. Sign-up karo: {{link}}',
  },
];

export const renderTemplate = (template: string, code: string, link: string): string =>
  template.replaceAll('{{code}}', code).replaceAll('{{link}}', link);

export const buildWhatsAppLink = (message: string): string =>
  `https://wa.me/?text=${encodeURIComponent(message)}`;
