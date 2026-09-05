/**
 * Site-wide business details.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PRIVACY: DO NOT ADD A STREET ADDRESS TO THIS FILE.
 *
 *  The registered mailing address is also the owner's home address. It must not
 *  appear anywhere on the public site — not in the footer, not in schema.org
 *  markup, not in a contact form's confirmation copy. `serviceArea` below is
 *  what gets shown instead.
 *
 *  `npm run check:privacy` fails the build if the address leaks into src/ or
 *  public/. Keep it that way.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every phone number, email address and licence number on the site reads from
 * here, so changing one is a one-line edit rather than a find-and-replace.
 */
export const SITE = {
  name: 'R&M Roofing Solutions',
  motto: 'Under God’s protection, we cover your home.',

  /** Displayed form. `telHref` derives the dialable form automatically. */
  phone: '(707) 641-6198',
  email: 'roofingsolutionsrm@gmail.com',

  /** Shown wherever a location would normally go. Deliberately not an address. */
  serviceArea: 'Serving California',

  /** California State License Board number. Required on ads and contracts. */
  license: {
    authority: 'CSLB',
    number: '1160338',
    /** Rendered as "CSLB License #1160338". */
    get display(): string {
      return `${this.authority} License #${this.number}`;
    },
  },

  hours: 'Mon–Sat 7:00 am – 7:00 pm · Emergency line open 24/7',

  /** Where the "Get a free estimate" buttons point. */
  estimateUrl: '#contact',
  videoUrl: '#',
} as const;

/** `(707) 641-6198` → `tel:+17076416198` */
export function telHref(phone: string = SITE.phone): string {
  const digits = phone.replace(/[^0-9]/g, '');
  return `tel:${digits.length === 10 ? '+1' : '+'}${digits}`;
}

export function mailHref(email: string = SITE.email): string {
  return `mailto:${email}`;
}
