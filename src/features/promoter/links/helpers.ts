/* What an affiliate actually shares.
   The link points at the storefront, not the admin panel — the person clicking
   it is a shopper. */

const STOREFRONT =
  import.meta.env.VITE_STOREFRONT_URL?.replace(/\/$/, '') ?? 'https://buydesi.in';

/** The URL to hand out: /r/<code> records the click and forwards the shopper. */
export const shareUrl = (code: string): string => `${STOREFRONT}/r/${encodeURIComponent(code)}`;

export interface MessageTemplate {
  locale: string;
  label: string;
  template: string;
}

/**
 * Ready-made messages, because most sharing happens on WhatsApp in a language
 * that is not English. Variables: {{code}} and {{link}}.
 */
export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    locale: 'en',
    label: 'English',
    template:
      'Hey! I shop on Buy Desi for fresh produce straight from local farmers. Order through my link and you get a good deal: {{link}}',
  },
  {
    locale: 'hi',
    label: 'Hindi',
    template:
      'Buy Desi par kisano se taza saamaan seedha aata hai. Mere link se order karo: {{link}}',
  },
  {
    locale: 'ta',
    label: 'Tamil',
    template: 'Buy Desi-la farmers-kitte irundhu fresh saman varum. En link vazhiya order pannunga: {{link}}',
  },
  {
    locale: 'te',
    label: 'Telugu',
    template: 'Buy Desi lo raithula nunchi fresh saruku vastundi. Na link nunchi order cheyandi: {{link}}',
  },
  {
    locale: 'kn',
    label: 'Kannada',
    template: 'Buy Desi nalli raitharinda fresh saamanu barutte. Nanna link inda order maadi: {{link}}',
  },
  {
    locale: 'ml',
    label: 'Malayalam',
    template: 'Buy Desi-yil karshakaril ninnu fresh സാധനം kittum. Ente link vazhi order cheyyu: {{link}}',
  },
  {
    locale: 'mr',
    label: 'Marathi',
    template: 'Buy Desi var shetkaryankadun taaza maal yeto. Maza link vaparun order kara: {{link}}',
  },
  {
    locale: 'bn',
    label: 'Bengali',
    template: 'Buy Desi-te chashider theke taja jinis ashe. Amar link diye order korun: {{link}}',
  },
  {
    locale: 'gu',
    label: 'Gujarati',
    template: 'Buy Desi par khedut pasethi taaji vastu aave chhe. Mara link thi order karo: {{link}}',
  },
  {
    locale: 'pa',
    label: 'Punjabi',
    template: 'Buy Desi te kisana ton taaza saman aunda hai. Mere link ton order karo: {{link}}',
  },
];

export const renderTemplate = (template: string, code: string, link: string): string =>
  template.replaceAll('{{code}}', code).replaceAll('{{link}}', link);

export const whatsAppLink = (message: string): string =>
  `https://wa.me/?text=${encodeURIComponent(message)}`;
