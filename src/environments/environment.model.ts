/**
 * The settings that differ between a development build and the live site.
 *
 * Both environment.ts (production) and environment.development.ts are typed
 * against this, so a key added to one and forgotten in the other fails the build
 * rather than shipping `undefined` to a visitor.
 */
export interface Environment {
  /** Which file this is. Shown in the development footer bar. */
  readonly mode: 'development' | 'production';

  /** True only for the live site. Guards dev-only things such as the footer bar. */
  readonly production: boolean;

  /** Phone number as displayed. The dialable `tel:` link is derived from it. */
  readonly phone: string;

  /** Public contact address, shown in the footer and used for `mailto:` links. */
  readonly email: string;

  /**
   * Where the estimate form delivers: the FormSubmit destination address, or the
   * random string FormSubmit emails you to stand in for it once activated.
   */
  readonly formToken: string;

  /**
   * tawk.to chat widget, as "propertyId/widgetId" or the whole link from
   * tawk.to > Administration > Channels > Chat Widget. A property ID on its own
   * is not enough. Empty turns the chat off.
   */
  readonly tawk: string;
}
