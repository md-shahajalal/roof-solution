import { environment } from '../../environments/environment';

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

  /**
   * Contact details differ between development and the live site, so they live
   * in the environment files: src/environments/environment.ts for production and
   * environment.development.ts for development.
   */
  phone: environment.phone,
  email: environment.email,

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

  hours: 'Emergency line open 24/7',

  /**
   * Fallback target for "Get a free estimate".
   *
   * The buttons open the estimate dialog rather than navigating, so nothing
   * reads this during normal use. It stays as the no-JavaScript destination and
   * as the anchor the footer nav still points at.
   */
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

export const ESTIMATE_FORM = {
  /**
   * The destination address, or the random string FormSubmit issues to stand in
   * for it. Set per build as `formToken` in the environment files rather than
   * here, so development enquiries never reach the business.
   */
  endpointToken: environment.formToken,

  get endpoint(): string {
    return `https://formsubmit.co/${this.endpointToken}`;
  },

  /**
   * FormSubmit's reCAPTCHA adds an interstitial page in the middle of sending.
   * On a lead form that friction costs more than the spam it stops, so it is off
   * and a honeypot field carries the load instead. Flip this to true if junk
   * starts arriving.
   */
  captcha: false,

  /** Query flag FormSubmit sends the visitor back with. See `_next`. */
  returnParam: 'estimate',

  maxFiles: 6,

  /**
   * Rejected before compression is attempted. Well above any phone camera; this
   * only catches someone picking a RAW file or a video by mistake.
   */
  maxOriginalBytes: 30 * 1024 * 1024,

  /**
   * FormSubmit's documented ceiling is 10 MB for the sum of all attachments.
   * Staying under it leaves room for the text fields and the encoding overhead
   * multipart adds.
   */
  maxPayloadBytes: 9 * 1024 * 1024,

  /**
   * Photos are downscaled in the browser before sending. A phone shot runs
   * 3–8 MB, so six untouched files would blow the 10 MB cap on their own; at
   * 1600px they land around 300–500 KB each and still show a cracked shingle
   * perfectly well.
   */
  compress: {
    maxEdge: 1600,
    quality: 0.82,
  },
} as const;
